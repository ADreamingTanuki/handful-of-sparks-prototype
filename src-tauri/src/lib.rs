use chrono::Local;
use image::imageops::FilterType;
use rusqlite::{params, params_from_iter, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

struct DbState(Mutex<Connection>);

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Tag {
    id: i64,
    name: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Image {
    id: i64,
    filepath: String,
    thumbnail_path: String,
    created_at: String,
    tags: Vec<Tag>,
}

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filepath TEXT NOT NULL,
            thumbnail_path TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS image_tags (
            image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (image_id, tag_id)
        );",
    )
}

fn fetch_tags_for_image(conn: &Connection, image_id: i64) -> rusqlite::Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name FROM tags t \
         JOIN image_tags it ON t.id = it.tag_id \
         WHERE it.image_id = ?1 ORDER BY t.name",
    )?;
    let tags = stmt
        .query_map([image_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

#[tauri::command]
fn import_image(
    path: String,
    app: AppHandle,
    db: State<'_, DbState>,
) -> Result<Image, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let images_dir = app_data_dir.join("images");
    let thumbs_dir = app_data_dir.join("thumbnails");
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&thumbs_dir).map_err(|e| e.to_string())?;

    let src = PathBuf::from(&path);
    let stem = src
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let ext = src
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    let now = Local::now();
    let ts = now.format("%Y%m%d_%H%M%S_%3f");
    let dest_filename = format!("{stem}_{ts}.{ext}");
    let thumb_filename = format!("{stem}_{ts}_thumb.jpg");

    let dest_path = images_dir.join(&dest_filename);
    let thumb_path = thumbs_dir.join(&thumb_filename);

    fs::copy(&src, &dest_path).map_err(|e| format!("Copy failed: {e}"))?;

    let img = image::open(&dest_path).map_err(|e| format!("Cannot open image: {e}"))?;
    let thumb = img.resize(300, 300, FilterType::Lanczos3);
    thumb
        .save(&thumb_path)
        .map_err(|e| format!("Thumbnail save failed: {e}"))?;

    let created_at = now.to_rfc3339();
    let filepath_str = dest_path.to_string_lossy().to_string();
    let thumb_str = thumb_path.to_string_lossy().to_string();

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO images (filepath, thumbnail_path, created_at) VALUES (?1, ?2, ?3)",
        params![filepath_str, thumb_str, created_at],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();

    Ok(Image {
        id,
        filepath: filepath_str,
        thumbnail_path: thumb_str,
        created_at,
        tags: vec![],
    })
}

#[tauri::command]
fn get_images(tag_ids: Vec<i64>, db: State<'_, DbState>) -> Result<Vec<Image>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let rows: Vec<Image> = if tag_ids.is_empty() {
        let mut stmt = conn
            .prepare(
                "SELECT id, filepath, thumbnail_path, created_at \
                 FROM images ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let r = stmt
            .query_map([], |row| {
                Ok(Image {
                    id: row.get(0)?,
                    filepath: row.get(1)?,
                    thumbnail_path: row.get(2)?,
                    created_at: row.get(3)?,
                    tags: vec![],
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect::<Vec<_>>();
        r
    } else {
        let placeholders: String = (0..tag_ids.len()).map(|_| "?").collect::<Vec<_>>().join(",");
        let count = tag_ids.len();
        let query = format!(
            "SELECT i.id, i.filepath, i.thumbnail_path, i.created_at \
             FROM images i \
             WHERE (SELECT COUNT(DISTINCT it.tag_id) FROM image_tags it \
                    WHERE it.image_id = i.id AND it.tag_id IN ({placeholders})) = {count} \
             ORDER BY i.created_at DESC"
        );
        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map(params_from_iter(tag_ids.iter()), |row| {
                Ok(Image {
                    id: row.get(0)?,
                    filepath: row.get(1)?,
                    thumbnail_path: row.get(2)?,
                    created_at: row.get(3)?,
                    tags: vec![],
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect::<Vec<_>>();
        r
    };

    let mut result = Vec::with_capacity(rows.len());
    for mut img in rows {
        img.tags = fetch_tags_for_image(&conn, img.id).map_err(|e| e.to_string())?;
        result.push(img);
    }
    Ok(result)
}

#[tauri::command]
fn get_tags(db: State<'_, DbState>) -> Result<Vec<Tag>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM tags ORDER BY name")
        .map_err(|e| e.to_string())?;
    let tags = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

#[tauri::command]
fn add_tag(image_id: i64, tag_name: String, db: State<'_, DbState>) -> Result<Tag, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
        params![tag_name],
    )
    .map_err(|e| e.to_string())?;
    let tag_id: i64 = conn
        .query_row(
            "SELECT id FROM tags WHERE name = ?1",
            params![tag_name],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?1, ?2)",
        params![image_id, tag_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(Tag { id: tag_id, name: tag_name })
}

#[tauri::command]
fn remove_tag(image_id: i64, tag_id: i64, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM image_tags WHERE image_id = ?1 AND tag_id = ?2",
        params![image_id, tag_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn rename_tag(tag_id: i64, new_name: String, db: State<'_, DbState>) -> Result<Tag, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let rows = conn
        .execute(
            "UPDATE tags SET name = ?1 WHERE id = ?2",
            params![new_name, tag_id],
        )
        .map_err(|e| e.to_string())?;
    if rows == 0 {
        return Err("Tag not found".into());
    }
    Ok(Tag { id: tag_id, name: new_name })
}

#[tauri::command]
fn delete_tag(tag_id: i64, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tags WHERE id = ?1", params![tag_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn remove_image(image_id: i64, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM images WHERE id = ?1", params![image_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("handful_of_sparks.db");
            let conn = Connection::open(&db_path)?;
            conn.pragma_update(None, "foreign_keys", "ON")?;
            init_db(&conn)?;
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_image,
            get_images,
            get_tags,
            add_tag,
            remove_tag,
            rename_tag,
            delete_tag,
            remove_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Image, Tag } from "./lib/types";
import { importImage, getImages, getTags } from "./lib/api";
import TagSidebar from "./components/TagSidebar";
import ImageGrid from "./components/ImageGrid";
import ImageDetail from "./components/ImageDetail";

interface DragDropPayload {
  paths: string[];
}

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif",
]);

export default function App() {
  const [images, setImages] = useState<Image[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);

  const selectedImage = images.find((img) => img.id === selectedId) ?? null;

  const refreshTags = useCallback(async () => {
    const tags = await getTags();
    setAllTags(tags);
  }, []);

  const refreshImages = useCallback(
    async (tagIds: number[]) => {
      const imgs = await getImages(tagIds);
      setImages(imgs);
    },
    []
  );

  useEffect(() => {
    refreshImages([]);
    refreshTags();
  }, []);

  useEffect(() => {
    refreshImages(activeTagIds);
  }, [activeTagIds]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    listen<DragDropPayload>("tauri://drag-drop", async (event) => {
      setIsDragOver(false);
      const paths = event.payload.paths.filter((p) => {
        const dot = p.lastIndexOf(".");
        return dot !== -1 && IMAGE_EXTENSIONS.has(p.slice(dot).toLowerCase());
      });
      if (paths.length === 0) return;

      setImporting(true);
      try {
        for (const path of paths) {
          const img = await importImage(path);
          setImages((prev) => [img, ...prev]);
        }
        await refreshTags();
      } catch (err) {
        console.error("Import failed:", err);
      } finally {
        setImporting(false);
      }
    }).then((fn) => cleanups.push(fn));

    listen("tauri://drag-enter", () => setIsDragOver(true)).then((fn) =>
      cleanups.push(fn)
    );

    listen("tauri://drag-leave", () => setIsDragOver(false)).then((fn) =>
      cleanups.push(fn)
    );

    return () => cleanups.forEach((fn) => fn());
  }, [refreshTags]);

  function toggleTag(tagId: number) {
    setActiveTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  function handleTagsChanged(imageId: number, tags: Tag[]) {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, tags } : img))
    );
    refreshTags();
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-200 overflow-hidden select-none">
      <TagSidebar
        tags={allTags}
        activeTagIds={activeTagIds}
        onToggle={toggleTag}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <span className="text-sm font-medium text-neutral-300">
            {images.length} {images.length === 1 ? "image" : "images"}
            {activeTagIds.length > 0 && (
              <span className="text-neutral-500"> · filtered</span>
            )}
          </span>
          {importing && (
            <span className="text-xs text-neutral-500 animate-pulse">
              Importing…
            </span>
          )}
        </header>

        <ImageGrid
          images={images}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
        />

        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/80 border-2 border-dashed border-accent rounded pointer-events-none z-10">
            <p className="text-accent text-lg font-medium">Drop to import</p>
          </div>
        )}
      </main>

      {selectedImage && (
        <ImageDetail image={selectedImage} onTagsChanged={handleTagsChanged} />
      )}
    </div>
  );
}

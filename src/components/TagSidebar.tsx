import { useState } from "react";
import type { Tag } from "../lib/types";
import { renameTag, deleteTag } from "../lib/api";

interface Props {
  tags: Tag[];
  activeTagIds: number[];
  onToggle: (tagId: number) => void;
  onTagsChanged: () => void;
}

export default function TagSidebar({ tags, activeTagIds, onToggle, onTagsChanged }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditValue(tag.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function commitRename(tag: Tag) {
    const name = editValue.trim().toLowerCase();
    if (!name || name === tag.name || busy) { cancelEdit(); return; }
    setBusy(true);
    try {
      await renameTag(tag.id, name);
      onTagsChanged();
    } finally {
      setBusy(false);
      setEditingId(null);
    }
  }

  async function handleDelete(tag: Tag) {
    if (busy) return;
    setBusy(true);
    try {
      await deleteTag(tag.id);
      onTagsChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col bg-neutral-900 border-r border-neutral-800">
      <div className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Tags
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {tags.length === 0 && (
          <p className="px-4 py-3 text-xs text-neutral-600">
            Tags will appear here after you add them to images.
          </p>
        )}
        {tags.map((tag) => {
          const active = activeTagIds.includes(tag.id);
          const isEditing = editingId === tag.id;

          if (isEditing) {
            return (
              <div key={tag.id} className="flex items-center px-2 py-1 gap-1">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(tag);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  onBlur={() => commitRename(tag)}
                  disabled={busy}
                  className="flex-1 min-w-0 bg-neutral-800 text-neutral-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                />
              </div>
            );
          }

          return (
            <div
              key={tag.id}
              className="group flex items-center pr-1"
            >
              <button
                onClick={() => onToggle(tag.id)}
                className={`flex-1 text-left px-4 py-2 text-sm transition-colors ${
                  active
                    ? "text-accent bg-accent/10 font-medium"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                {tag.name}
              </button>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(tag)}
                  title="Rename tag"
                  className="p-1 text-neutral-500 hover:text-neutral-200 rounded transition-colors text-xs"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(tag)}
                  title="Delete tag"
                  className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeTagIds.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-800">
          <button
            onClick={() => activeTagIds.forEach(onToggle)}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear filters ({activeTagIds.length})
          </button>
        </div>
      )}
    </aside>
  );
}

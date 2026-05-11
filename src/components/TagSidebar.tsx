import { useState, useRef, useEffect } from "react";
import type { Tag } from "../lib/types";

interface Props {
  tags: Tag[];
  activeTagIds: number[];
  onToggle: (tagId: number) => void;
  onRename: (tagId: number, newName: string) => Promise<void>;
  onDelete: (tagId: number) => Promise<void>;
}

export default function TagSidebar({
  tags,
  activeTagIds,
  onToggle,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) inputRef.current?.focus();
  }, [editingId]);

  function startEdit(tag: Tag, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(tag.id);
    setEditValue(tag.name);
  }

  async function confirmRename() {
    if (editingId === null) return;
    const name = editValue.trim().toLowerCase();
    const original = tags.find((t) => t.id === editingId)?.name;
    if (name && name !== original) {
      await onRename(editingId, name).catch(() => {});
    }
    setEditingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmRename();
    }
    if (e.key === "Escape") setEditingId(null);
  }

  async function handleDelete(tagId: number, e: React.MouseEvent) {
    e.stopPropagation();
    await onDelete(tagId).catch(() => {});
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

          if (editingId === tag.id) {
            return (
              <div key={tag.id} className="flex items-center gap-1 px-2 py-1">
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={confirmRename}
                  className="flex-1 min-w-0 bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    confirmRename();
                  }}
                  title="Confirm"
                  className="p-1 text-neutral-400 hover:text-neutral-200 text-xs leading-none"
                >
                  ✓
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditingId(null);
                  }}
                  title="Cancel"
                  className="p-1 text-neutral-500 hover:text-neutral-300 text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            );
          }

          return (
            <div
              key={tag.id}
              className={`group flex items-center pr-1 ${
                active ? "bg-accent/10" : "hover:bg-neutral-800"
              }`}
            >
              <button
                onClick={() => onToggle(tag.id)}
                className={`flex-1 text-left px-4 py-2 text-sm transition-colors ${
                  active
                    ? "text-accent font-medium"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {tag.name}
              </button>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => startEdit(tag, e)}
                  title="Rename tag"
                  className="p-1.5 text-neutral-500 hover:text-neutral-300 text-[11px] leading-none"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => handleDelete(tag.id, e)}
                  title="Delete tag"
                  className="p-1.5 text-neutral-500 hover:text-red-400 text-[11px] leading-none"
                >
                  ✕
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

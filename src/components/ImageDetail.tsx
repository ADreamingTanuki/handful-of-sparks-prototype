import { useState, useRef, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Image, Tag } from "../lib/types";
import { addTag, removeTag } from "../lib/api";

interface Props {
  image: Image;
  onTagsChanged: (imageId: number, tags: Tag[]) => void;
  onRemove: (imageId: number) => Promise<void>;
}

export default function ImageDetail({ image, onTagsChanged, onRemove }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput("");
    inputRef.current?.focus();
  }, [image.id]);

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const name = input.trim().toLowerCase();
    if (!name || busy) return;
    if (image.tags.some((t) => t.name === name)) {
      setInput("");
      return;
    }
    setBusy(true);
    try {
      const tag = await addTag(image.id, name);
      onTagsChanged(image.id, [...image.tags, tag]);
      setInput("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveTag(tag: Tag) {
    if (busy) return;
    setBusy(true);
    try {
      await removeTag(image.id, tag.id);
      onTagsChanged(
        image.id,
        image.tags.filter((t) => t.id !== tag.id)
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-neutral-900 border-l border-neutral-800 overflow-hidden">
      <div className="aspect-square w-full overflow-hidden bg-neutral-950 shrink-0">
        <img
          src={convertFileSrc(image.thumbnailPath)}
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto min-h-0">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5 min-h-[24px]">
            {image.tags.length === 0 && (
              <span className="text-xs text-neutral-600">No tags yet.</span>
            )}
            {image.tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleRemoveTag(tag)}
                title="Remove tag"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs hover:bg-red-500/20 hover:text-red-400 transition-colors"
              >
                {tag.name}
                <span className="text-[10px] opacity-60">×</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddTag} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add tag…"
            disabled={busy}
            className="flex-1 min-w-0 bg-neutral-800 text-neutral-200 text-xs rounded px-2 py-1.5 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="px-2.5 py-1.5 bg-accent/20 text-accent text-xs rounded hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </form>

        <div className="mt-auto pt-2 border-t border-neutral-800">
          <button
            onClick={() => onRemove(image.id)}
            disabled={busy}
            className="w-full py-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Remove from board
          </button>
        </div>
      </div>
    </aside>
  );
}

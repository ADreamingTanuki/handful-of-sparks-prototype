import type { Tag } from "../lib/types";

interface Props {
  tags: Tag[];
  activeTagIds: number[];
  onToggle: (tagId: number) => void;
}

export default function TagSidebar({ tags, activeTagIds, onToggle }: Props) {
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
          return (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                active
                  ? "text-accent bg-accent/10 font-medium"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              {tag.name}
            </button>
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

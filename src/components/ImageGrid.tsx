import { convertFileSrc } from "@tauri-apps/api/core";
import type { Image } from "../lib/types";

interface Props {
  images: Image[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function ImageGrid({ images, selectedId, onSelect }: Props) {
  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-600">
        <p className="text-sm">Drag images onto the window to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => onSelect(img.id)}
            className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus:outline-none ${
              selectedId === img.id
                ? "border-accent"
                : "border-transparent hover:border-neutral-600"
            }`}
          >
            <img
              src={convertFileSrc(img.thumbnailPath)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {img.tags.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 flex flex-wrap gap-1">
                {img.tags.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] text-neutral-300 leading-tight"
                  >
                    {t.name}
                  </span>
                ))}
                {img.tags.length > 3 && (
                  <span className="text-[10px] text-neutral-500">
                    +{img.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

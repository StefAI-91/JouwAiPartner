"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export interface PendingImage {
  file: File;
  previewUrl: string;
  width?: number;
  height?: number;
}

const ACCEPTED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file keeps upload snappy

/**
 * Read the natural dimensions of an image blob. Returns `undefined` on
 * failure (non-image or decode error) — callers treat size as optional.
 */
function readImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

interface Props {
  images: PendingImage[];
  onChange: (next: PendingImage[]) => void;
  disabled?: boolean;
}

export function ImageUpload({ images, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(incoming: FileList | File[]) {
    setError(null);
    const arr = Array.from(incoming);
    const rejected: string[] = [];
    const accepted: PendingImage[] = [];

    for (const file of arr) {
      if (!ACCEPTED_MIME.has(file.type)) {
        rejected.push(`${file.name} (type niet ondersteund)`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        rejected.push(`${file.name} (> 10 MB)`);
        continue;
      }
      const dims = await readImageDimensions(file);
      accepted.push({
        file,
        previewUrl: URL.createObjectURL(file),
        width: dims?.width,
        height: dims?.height,
      });
    }

    if (rejected.length > 0) {
      setError(`Geweigerd: ${rejected.join(", ")}`);
    }
    if (accepted.length > 0) {
      onChange([...images, ...accepted]);
    }
  }

  function remove(index: number) {
    const next = [...images];
    const [removed] = next.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">Afbeeldingen</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          if (e.dataTransfer.files.length > 0) {
            void addFiles(e.dataTransfer.files);
          }
        }}
        className="rounded-md border border-dashed border-input bg-background/40 p-4"
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="size-4" />
          Sleep afbeeldingen hierheen of klik om te kiezen (PNG, JPG, GIF, WebP, SVG — max 10 MB)
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img, idx) => (
            <li
              key={img.previewUrl}
              className="group relative overflow-hidden rounded-md border border-border bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={img.file.name} className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={disabled}
                aria-label={`Verwijder ${img.file.name}`}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground shadow-sm transition-opacity hover:bg-background disabled:opacity-60"
              >
                <X className="size-3.5" />
              </button>
              <div className="truncate border-t border-border px-2 py-1 text-[0.7rem] text-muted-foreground">
                {img.file.name}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

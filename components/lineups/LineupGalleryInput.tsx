"use client";
import { useEffect, useRef } from "react";
import type { LineupDraftImage } from "@/lib/lineups/commands";
import { MAX_LINEUP_IMAGES } from "@/lib/lineups/media";
import LineupImage from "./LineupImage";
function Preview({ image }: { image: LineupDraftImage }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!image.file || !ref.current) return;
    const url = URL.createObjectURL(image.file);
    ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [image.file]);
  return (
    <div className="relative aspect-video w-24 shrink-0">
      {image.file ? (
        // Local File previews use an object URL set directly on the image and revoked on cleanup.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          alt="Screenshot preview"
          className="h-full w-full object-contain"
        />
      ) : image.imageUrl ? (
        <LineupImage
          src={image.imageUrl}
          alt="Screenshot preview"
          fill
          sizes="96px"
          className="object-contain"
        />
      ) : null}
    </div>
  );
}
export default function LineupGalleryInput({
  images,
  onChange,
  coverIndex,
  onCoverChange,
  onError,
}: {
  images: LineupDraftImage[];
  onChange: (images: LineupDraftImage[]) => void;
  coverIndex: number;
  onCoverChange: (index: number) => void;
  onError: (error: string | null) => void;
}) {
  const move = (index: number, next: number) => {
    const copy = [...images];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
    if (coverIndex === index) onCoverChange(next);
    else if (coverIndex === next) onCoverChange(index);
  };
  return (
    <div className="space-y-3">
      <input
        aria-label="Add screenshots"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        disabled={images.length >= MAX_LINEUP_IMAGES}
        className="block max-w-full text-xs text-white/60"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (images.length + files.length > MAX_LINEUP_IMAGES)
            return onError("Use up to 10 images.");
          if (
            files.some(
              (file) =>
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                !file.size ||
                file.size > 10 * 1024 * 1024,
            )
          )
            return onError("Use PNG, JPEG or WebP up to 10 MB per image.");
          onChange([
            ...images,
            ...files.map((file) => ({ file, caption: "" })),
          ]);
          onError(null);
        }}
      />
      <ol className="space-y-3">
        {images.map((image, index) => (
          <li
            key={image.file?.name + ":" + index}
            className="border border-white/10 p-2 space-y-2"
          >
            <div className="flex gap-3 items-center">
              <Preview image={image} />
              <label className="flex-1 text-xs text-white/60">
                Step {index + 1}
                <textarea
                  aria-label={`Caption for image ${index + 1}`}
                  value={image.caption}
                  maxLength={1000}
                  rows={2}
                  onChange={(event) =>
                    onChange(
                      images.map((item, i) =>
                        i === index
                          ? { ...item, caption: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="mt-1 w-full bg-white/5 p-2 text-white"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              <button
                type="button"
                className="min-h-10 px-2 disabled:opacity-35"
                aria-pressed={coverIndex === index}
                onClick={() => onCoverChange(index)}
              >
                {coverIndex === index ? "Cover image" : "Set as cover"}
              </button>
              <button
                type="button"
                className="min-h-10 px-2 disabled:opacity-35"
                disabled={index === 0}
                aria-label={`Move image ${index + 1} up`}
                onClick={() => move(index, index - 1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="min-h-10 px-2 disabled:opacity-35"
                disabled={index === images.length - 1}
                aria-label={`Move image ${index + 1} down`}
                onClick={() => move(index, index + 1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="min-h-10 px-2 disabled:opacity-35"
                aria-label={`Remove image ${index + 1}`}
                onClick={() => {
                  onChange(images.filter((_, i) => i !== index));
                  onCoverChange(
                    coverIndex === index
                      ? 0
                      : coverIndex > index
                        ? coverIndex - 1
                        : coverIndex,
                  );
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

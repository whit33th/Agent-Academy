"use client";

import Image from "next/image";
import { Upload, X } from "lucide-react";

interface ImageDropAreaProps {
  preview: string | null;
  required?: boolean;
  onChange: (file: File) => void;
  onClear: () => void;
}

export default function ImageDropArea({
  preview,
  required,
  onChange,
  onClear,
}: ImageDropAreaProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
  };

  if (preview) {
    return (
      <div className="relative aspect-video w-full rounded-sm overflow-hidden border border-white/10 group bg-black/40">
        <Image
          src={preview}
          alt="Preview"
          fill
          sizes="(max-width: 480px) 100vw, 450px"
          className="object-contain"
        />
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove image"
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-val-red text-white transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-white/15 rounded-sm hover:border-val-red/40 hover:bg-white/1 cursor-pointer transition-[border-color,background-color]">
      <span className="flex flex-col items-center gap-1 text-white/40">
        <Upload className="size-8 mb-1" />
        <span className="text-sm font-medium">Click to upload screenshot</span>
        <span className="text-[10px] text-white/35">
          PNG, JPG, WebP up to 10MB
        </span>
      </span>
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        required={required}
      />
    </label>
  );
}

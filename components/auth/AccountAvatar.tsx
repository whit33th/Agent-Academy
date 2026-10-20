"use client";

import { useState } from "react";
import Image from "next/image";

export default function AccountAvatar({
  name,
  imageUrl,
  large = false,
}: {
  name: string;
  imageUrl: string;
  large?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/15 bg-val-red/10 font-oswald font-bold uppercase text-val-red ${large ? "size-20 text-3xl" : "size-7 text-xs"}`}
    >
      {imageUrl && failedUrl !== imageUrl ? (
        <Image
          unoptimized
          src={imageUrl}
          alt={`${name}'s avatar`}
          fill
          sizes={large ? "80px" : "28px"}
          className="object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <span aria-hidden>{name.trim().slice(0, 2) || "AA"}</span>
      )}
    </span>
  );
}

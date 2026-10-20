"use client";
import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { useAppSession } from "@/components/auth/SessionProvider";
import {
  LINEUP_IMAGE_QUALITY,
  isSanityImage,
  sanityImageLoader,
} from "@/lib/images/sanity-loader";

type LineupImageProps = Omit<ImageProps, "src" | "quality"> & {
  src: string;
  quality?: number;
};

export default function LineupImage({
  src,
  alt,
  quality = LINEUP_IMAGE_QUALITY,
  ...props
}: LineupImageProps) {
  const { signedIn, subject, cacheReady } = useAppSession();
  const imageRef = useRef<HTMLImageElement>(null);
  const [cached, setCached] = useState<{ key: string; data: string } | null>(
    null,
  );
  const key = `${signedIn ? subject : "public"}:${src}`;
  useEffect(() => {
    if (!src.startsWith("https:") || (signedIn && !cacheReady)) return;
    const cache = window.agentAcademy?.cache;
    const node = imageRef.current;
    if (!cache || !node) return;
    let active = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void cache
          .image(src, signedIn)
          .then((data) => {
            if (active && data) setCached({ key, data });
          })
          .catch(() => undefined);
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [src, signedIn, cacheReady, key]);
  const displaySource = cached?.key === key ? cached.data : src;
  const inline =
    displaySource.startsWith("data:") || displaySource.startsWith("blob:");
  const sanity = isSanityImage(displaySource);
  return (
    <Image
      {...props}
      alt={alt}
      ref={imageRef}
      src={displaySource}
      quality={inline ? undefined : quality}
      unoptimized={inline || props.unoptimized}
      loader={sanity ? sanityImageLoader : undefined}
    />
  );
}

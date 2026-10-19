import Image, { type ImageProps } from "next/image";
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
  quality = LINEUP_IMAGE_QUALITY,
  ...props
}: LineupImageProps) {
  const inline = src.startsWith("data:") || src.startsWith("blob:");
  const sanity = isSanityImage(src);
  return (
    <Image
      {...props}
      src={src}
      quality={inline ? undefined : quality}
      unoptimized={inline || props.unoptimized}
      loader={sanity ? sanityImageLoader : undefined}
    />
  );
}

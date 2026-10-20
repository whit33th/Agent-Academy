import Image, { type ImageProps } from "next/image";

/** Catalog assets are resized during sync; avoid per-install image optimization. */
export default function CatalogImage(props: ImageProps) {
  return <Image {...props} alt={props.alt} unoptimized />;
}

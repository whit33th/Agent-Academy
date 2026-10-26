"use client";

import { useEffect, useRef } from "react";
import { crosshairGeometry, type ValorantCrosshair } from "@/lib/aim/crosshair";

export function ImportedCrosshair({
  profile,
}: {
  profile: ValorantCrosshair | null;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const stage = ref.current?.parentElement;
    if (!stage || !profile) return;
    // Avoid the fractional raster origin of the letterboxed stage. Position the
    // overlay directly in window pixels so the compositor cannot blur its edges.
    const canvas = document.createElement("canvas");
    canvas.className = "aim-crosshair";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    let media: MediaQueryList;
    const draw = () => {
      const bounds = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const scale = profile.scaleToResolution
        ? (bounds.height * dpr) / 1080
        : 1;
      const layers = crosshairGeometry(profile, scale);
      const outline = profile.outline.visible
        ? Math.round(profile.outline.thickness * scale)
        : 0;
      const extent = Math.ceil(
        Math.max(
          0,
          ...layers.flatMap(({ rects }) =>
            rects.flatMap((rect) => [
              Math.abs(rect.x),
              Math.abs(rect.y),
              Math.abs(rect.x + rect.width),
              Math.abs(rect.y + rect.height),
            ]),
          ),
        ) +
          outline +
          1,
      );
      // Only a tiny static overlay; no screen-sized canvas or animation loop.
      canvas.width = canvas.height = extent * 2;
      Object.assign(canvas.style, {
        width: `${canvas.width}px`,
        height: `${canvas.height}px`,
        left: "0px",
        top: "0px",
        transformOrigin: "0 0",
        // Transform values retain fractions that layout rounds to 1/64 CSS px.
        transform: `translate(${(Math.round((bounds.left + bounds.width / 2) * dpr) - extent) / dpr}px, ${(Math.round((bounds.top + bounds.height / 2) * dpr) - extent) / dpr}px) scale(${1 / dpr})`,
      });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.translate(extent, extent);
      if (outline) {
        ctx.beginPath();
        for (const { rects } of layers)
          for (const { x, y, width, height } of rects) {
            // Draw only the border: translucent lines must not gain a black fill.
            ctx.rect(x - outline, y - outline, width + outline * 2, outline);
            ctx.rect(x - outline, y + height, width + outline * 2, outline);
            ctx.rect(x - outline, y, outline, height);
            ctx.rect(x + width, y, outline, height);
          }
        ctx.fillStyle = profile.outline.color;
        ctx.globalAlpha = profile.outline.opacity;
        ctx.fill();
      }
      ctx.fillStyle = profile.color;
      for (const { opacity, rects } of layers) {
        ctx.beginPath();
        for (const { x, y, width, height } of rects)
          ctx.rect(x, y, width, height);
        ctx.globalAlpha = opacity;
        ctx.fill();
      }
    };
    const watchDpi = () => {
      media?.removeEventListener("change", changedDpi);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      media.addEventListener("change", changedDpi);
    };
    const changedDpi = () => {
      draw();
      watchDpi();
    };
    const observer = new ResizeObserver(draw);
    observer.observe(stage);
    // Letterboxing can move the stage without changing its own dimensions.
    // Observe the viewport too, after the controller has fitted the stage.
    if (stage.parentElement) observer.observe(stage.parentElement);
    window.addEventListener("resize", draw);
    watchDpi();
    draw();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", changedDpi);
      window.removeEventListener("resize", draw);
      canvas.remove();
    };
  }, [profile]);
  return <span ref={ref} hidden aria-hidden />;
}

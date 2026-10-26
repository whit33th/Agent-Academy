"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppPreferences } from "@/components/settings/PreferencesProvider";

export default function AppBackground() {
  const { settings } = useAppPreferences();
  const pathname = usePathname();
  const backgroundVideo = settings.backgroundVideo && pathname !== "/aim";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setReady(true);
    }

    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
        return;
      }
      void video.play().catch(() => {});
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [backgroundVideo]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {backgroundVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${ready ? "opacity-10" : "opacity-0"}`}
          src="/videos/sage-menu.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
        />
      )}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-out ${ready && backgroundVideo ? "opacity-100" : "opacity-0"}`}
        style={{
          background: [
            "linear-gradient(180deg, rgba(10,10,10,0.99) 0%, rgba(10,10,10,0.38) 28%, rgba(10,10,10,0.9) 100%)",
            "radial-gradient(ellipse at center, transparent 0%, rgba(10,10,10,0.28) 48%, rgba(10,10,10,0.78) 100%)",
          ].join(", "),
        }}
      />
    </div>
  );
}

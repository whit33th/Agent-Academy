"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function SmoothScrollController() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/aim") return;
    const lenis = new Lenis({
      // The html element is viewport-sized; body grows with async route content.
      content: document.body,
      autoRaf: true,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      duration: 1.3,
    });

    return () => {
      lenis.destroy();
    };
  }, [pathname]);

  return null;
}

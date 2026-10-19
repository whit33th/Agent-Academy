"use client";

import { usePathname, useRouter } from "next/navigation";
import { audio as sfx } from "@/lib/audio";
import { restartOnboarding, shouldShowOnboarding } from "@/lib/onboarding/state";

export default function TourLink() {
  const router = useRouter();
  const pathname = usePathname();

  if (!shouldShowOnboarding(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => {
        sfx.playClick();
        restartOnboarding();
        if (pathname !== "/") router.push("/");
      }}
      className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 hover:text-val-red transition-colors cursor-pointer"
    >
      Tour
    </button>
  );
}

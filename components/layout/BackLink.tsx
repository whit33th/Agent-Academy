"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="group inline-flex items-center gap-2"
      aria-label="Go back"
    >
      <span className="flex size-9 items-center justify-center clip-angular-sm bg-white/6 text-white/60 transition-colors group-hover:bg-val-red/20 group-hover:text-val-red">
        <ArrowLeft size={16} />
      </span>

      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 transition-colors group-hover:text-white/50">
        Back
      </span>
    </button>
  );
}

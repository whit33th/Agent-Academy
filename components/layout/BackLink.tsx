"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BackLink() {
  const pathname = usePathname();

  return (
    <Link
      href={
        /^\/[^/]+\/[^/]+$/.test(pathname)
          ? pathname.replace(/\/[^/]+$/, "")
          : "/"
      }
      className="group inline-flex items-center gap-2"
      aria-label="Go back"
    >
      <span className="flex size-9 items-center justify-center clip-angular-sm bg-white/6 text-white/60 transition-colors group-hover:bg-val-red/20 group-hover:text-val-red">
        <ArrowLeft size={16} />
      </span>

      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 transition-colors group-hover:text-white/50">
        Back
      </span>
    </Link>
  );
}

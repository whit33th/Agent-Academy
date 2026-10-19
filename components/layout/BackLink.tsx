"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const squareClass = "flex size-9 shrink-0 items-center justify-center clip-angular-sm bg-white/6";

export default function BackLink({ chrome = false }: { chrome?: boolean }) {
  const pathname = usePathname();
  if (chrome && pathname === "/") return <span className={squareClass} aria-hidden />;
  const href = /^\/[^/]+\/[^/]+$/.test(pathname) ? pathname.replace(/\/[^/]+$/, "") : "/";

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2"
      aria-label="Go back"
    >
      <span className={`${squareClass} text-white/60 transition-colors group-hover:bg-val-red/20 group-hover:text-val-red`}>
        <ArrowLeft size={16} />
      </span>

      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 transition-colors group-hover:text-white/50">
        Back
      </span>
    </Link>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
}

export default function BackLink({ href }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2"
      aria-label="Back"
    >
      <span className="flex size-9 items-center justify-center clip-angular-sm bg-white/6 text-white/60 transition-colors group-hover:bg-val-red/20 group-hover:text-val-red">
        <ArrowLeft size={16} />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 group-hover:text-white/50 transition-colors">
        Back
      </span>
    </Link>
  );
}

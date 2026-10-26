"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, House, PanelsTopLeft } from "lucide-react";

export default function AppNavigation() {
  const pathname = usePathname();
  const feed = pathname === "/feed";
  const aim = pathname === "/aim";
  return (
    <nav
      aria-label="Main navigation"
      className="ml-3 flex items-center gap-1 rounded-sm border border-white/6 bg-white/3 p-1"
    >
      {[
        { href: "/", label: "Home", icon: House, active: !feed && !aim },
        { href: "/feed", label: "Feed", icon: PanelsTopLeft, active: feed },
        { href: "/aim", label: "Aim", icon: Crosshair, active: aim },
      ].map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex h-8 items-center gap-2 rounded-xs px-3 font-oswald text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-val-red ${active ? "bg-val-red/15 text-val-red shadow-[inset_0_-2px_0_#ff4655]" : "text-white/50 hover:bg-white/6 hover:text-white"}`}
        >
          <Icon size={14} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

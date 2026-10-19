"use client";
import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { audio as sfx } from "@/lib/audio";
import Modal from "@/components/ui/Modal";
import { useAppSession } from "./SessionProvider";
export default function AuthButton({ chrome = false }: { chrome?: boolean }) {
  const [open, setOpen] = useState(false);
  const session = useAppSession();
  const SignInView = session.SignInView;
  const label = session.signedIn ? session.name : "Sign in";
  return <>
    <button type="button" onClick={() => { sfx.playClick(); setOpen(true); }} onMouseEnter={() => sfx.playHover()} title={session.signedIn ? "Account" : "Sign in"} className={chrome ? "flex h-full max-w-36 items-center gap-1.5 px-2.5 font-oswald text-[11px] font-semibold uppercase tracking-[0.12em] text-val-cream/75 transition-colors hover:bg-white/8 hover:text-val-cream" : "flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"}>
      <User size={14} className="shrink-0" />
      <span className={chrome ? "titlebar-account-name truncate" : undefined}>{label}</span>
    </button>
    <Modal open={open} onClose={() => setOpen(false)} labelledBy="auth-title" className="w-full max-w-sm bg-val-surface border border-white/10 clip-angular overflow-hidden p-6 flex flex-col gap-4 cursor-default">
      <h3 id="auth-title" className="font-oswald text-lg font-bold uppercase tracking-wider text-white">{session.signedIn ? "Your account" : "Sign in"}</h3>
      {session.signedIn ? <>
        <p className="text-sm text-white/55">{session.name}</p>
        <button type="button" onClick={async () => { await session.signOut(); setOpen(false); }} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-2"><LogOut size={14} />Sign out</button>
      </> : SignInView ? <SignInView routing="hash" appearance={{ variables: { colorPrimary: "#ff4655", colorBackground: "#151719", colorForeground: "#f4eee2", borderRadius: "2px", fontFamily: "var(--font-inter)" }, elements: { rootBox: "w-full", cardBox: "w-full shadow-none", card: "bg-transparent shadow-none p-0", header: "hidden", footer: "bg-transparent" } }} /> : <p className="text-sm text-white/55">{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "Connecting to sign-in…" : "Sign-in is not configured for this build."}</p>}
    </Modal>
  </>;
}

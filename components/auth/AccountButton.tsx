"use client";
import { useState } from "react";
import { User, X } from "lucide-react";
import { audio as sfx } from "@/lib/audio";
import Modal from "@/components/ui/Modal";
import { useAppSession } from "./SessionProvider";
import AccountAvatar from "./AccountAvatar";
import AccountProfile from "./AccountProfile";
export default function AccountButton({
  chrome = false,
}: {
  chrome?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const session = useAppSession();
  const SignInView = session.SignInView;
  const label = session.signedIn ? session.name : "Sign in";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          sfx.playClick();
          setOpen(true);
        }}
        onMouseEnter={() => sfx.playHover()}
        title={session.signedIn ? "Account" : "Sign in"}
        className={
          chrome
            ? "flex h-full max-w-36 items-center gap-1.5 px-2.5 font-oswald text-[11px] font-semibold uppercase tracking-[0.12em] text-val-cream/75 transition-colors hover:bg-white/8 hover:text-val-cream"
            : "flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        }
      >
        {session.signedIn ? (
          <AccountAvatar name={session.name} imageUrl={session.imageUrl} />
        ) : (
          <User size={14} className="shrink-0" />
        )}
        <span className={chrome ? "titlebar-account-name truncate" : undefined}>
          {label}
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="auth-title"
        className="w-full max-w-md bg-val-surface border border-white/10 clip-angular p-6 flex flex-col gap-6 cursor-default shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4">
          <h3
            id="auth-title"
            className="font-oswald text-lg font-bold uppercase tracking-wider text-white"
          >
            {session.signedIn ? "Your account" : "Sign in"}
          </h3>
          <button
            type="button"
            aria-label="Close account"
            onClick={() => setOpen(false)}
            className="grid size-10 place-items-center rounded-sm text-white/45 hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>
        {session.signedIn ? (
          <AccountProfile
            key={session.subject}
            onSignOut={() => setOpen(false)}
          />
        ) : SignInView ? (
          <SignInView
            routing="hash"
            appearance={{
              variables: {
                colorPrimary: "#ff4655",
                colorBackground: "#151719",
                colorForeground: "#f4eee2",
                borderRadius: "2px",
                fontFamily: "var(--font-inter)",
              },
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "bg-transparent shadow-none p-0",
                header: "hidden",
                footer: "bg-transparent",
              },
            }}
          />
        ) : (
          <p className="text-sm text-white/55">
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              ? "Connecting to sign-in…"
              : "Sign-in is not configured for this build."}
          </p>
        )}
      </Modal>
    </>
  );
}

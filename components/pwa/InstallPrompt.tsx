"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { audio as sfx } from "@/lib/audio";

const DISMISS_KEY = "vp_install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallMode = "hidden" | "ios" | "prompt";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error — iOS Safari
    window.navigator.standalone === true
  );
}

const listeners = new Set<() => void>();

function subscribeInstall(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function readInstallMode(): InstallMode {
  if (isStandalone()) return "hidden";
  try {
    if (localStorage.getItem(DISMISS_KEY) === "1") return "hidden";
  } catch {
    /* ignore */
  }
  return isIos() ? "ios" : "prompt";
}

function notifyInstall() {
  for (const listener of listeners) listener();
}

export default function InstallPrompt() {
  const mode = useSyncExternalStore(subscribeInstall, readInstallMode, () => "hidden" as const);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (mode !== "prompt") return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [mode]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDeferred(null);
    notifyInstall();
  };

  const install = async () => {
    if (!deferred) return;
    sfx.playClick();
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (mode === "hidden" || (mode === "prompt" && !deferred)) return null;

  return (
    <div
      role="region"
      aria-label="Install app"
      className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-md md:left-auto md:right-6"
    >
      <div className="clip-angular border border-white/10 bg-val-surface/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center clip-angular-sm bg-val-red/15 text-val-red">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              Add to Home Screen
            </p>
            {mode === "ios" ? (
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                Tap{" "}
                <Share
                  size={12}
                  className="inline -mt-0.5 text-val-red"
                  aria-hidden
                />{" "}
                Share, then &quot;Add to Home Screen&quot; for a second-monitor
                lineup app.
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/50">
                Install Agent Academy for quick access between rounds.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 text-white/30 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {mode === "prompt" && deferred && (
          <button
            type="button"
            onClick={install}
            onMouseEnter={() => sfx.playHover()}
            className="mt-3 w-full clip-angular-sm bg-val-red py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-val-red/90 transition-colors cursor-pointer"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}

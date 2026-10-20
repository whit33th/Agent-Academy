"use client";
import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { UpdateState } from "@/lib/desktop/protocol";
import ConfirmAction from "@/components/ui/ConfirmAction";

export default function UpdatesPanel({ unsaved }: { unsaved: boolean }) {
  const [state, setState] = useState<UpdateState | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const bridge = window.agentAcademy?.updates;
    if (!bridge) return;
    let active = true;
    const stop = bridge.subscribe((value) => {
      if (active) setState(value);
    });
    void bridge
      .get()
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() =>
        setError("Updates are unavailable. Restart the app and try again."),
      );
    return () => {
      active = false;
      stop();
    };
  }, []);
  async function run(action: "check" | "download" | "install") {
    setError("");
    try {
      const bridge = window.agentAcademy?.updates;
      if (!bridge) throw new Error("Updates are available in the Windows app.");
      await bridge[action]();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Update failed. Try again.",
      );
    }
  }
  const busy =
    state?.status === "checking" ||
    state?.status === "downloading" ||
    state?.status === "installing";
  const messages: Record<UpdateState["status"], string> = {
    idle: "Check for a new Windows version.",
    checking: "Checking for updates…",
    available: `Version ${state?.availableVersion ?? ""} is available.`,
    current: "You're up to date.",
    unpublished: "No Windows release has been published yet.",
    downloading: "Downloading update…",
    downloaded: "The update is ready. Restart to install it.",
    installing: "Restarting to install…",
    error: state?.message ?? "Could not check for updates. Try again.",
  };
  return (
    <section
      className="rounded-sm border border-white/10 bg-white/2 p-4"
      aria-label="App updates"
    >
      {confirming ? (
        <ConfirmAction
          title="Restart to update?"
          description="The app will close, install the downloaded update and reopen. Your saved collection and settings will be kept."
          label="Restart and update"
          pending={state?.status === "installing"}
          error={error || null}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void run("install")}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white">
                App updates{" "}
                <span className="ml-2 font-mono text-xs font-normal text-white/35">
                  {state ? `v${state.currentVersion}` : ""}
                </span>
              </h4>
              <p
                role="status"
                className="mt-1 text-xs leading-relaxed text-white/45"
              >
                {state
                  ? messages[state.status]
                  : "Available in the Windows app."}
              </p>
            </div>
            <button
              type="button"
              disabled={
                !state || busy || (state.status === "downloaded" && unsaved)
              }
              onClick={() => {
                if (state?.status === "downloaded") setConfirming(true);
                else
                  void run(
                    state?.status === "available" ? "download" : "check",
                  );
              }}
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/80 transition-colors hover:border-val-red/40 hover:text-white disabled:cursor-default disabled:opacity-40"
            >
              {state?.status === "available" ? (
                <Download size={14} />
              ) : (
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              )}
              {state?.status === "downloaded"
                ? "Restart and update"
                : state?.status === "available"
                  ? "Download update"
                  : busy
                    ? "Please wait…"
                    : "Check for updates"}
            </button>
          </div>
          {state?.status === "downloading" && (
            <div
              role="progressbar"
              aria-label="Update download"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(state.percent)}
              className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full bg-val-red transition-[width]"
                style={{ width: `${state.percent}%` }}
              />
            </div>
          )}
          {state?.status === "downloaded" && unsaved && (
            <p className="mt-2 text-xs text-white/45">
              Save or discard your settings before restarting.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-val-red">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}

"use client";
import { useState, useTransition } from "react";
import { X, Check, Volume2, Monitor, Power } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmAction from "@/components/ui/ConfirmAction";
import { DEFAULT_PREFERENCES, type AppPreferences } from "@/lib/settings/model";
import { useAppPreferences } from "./PreferencesProvider";
import UpdatesPanel from "./UpdatesPanel";

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const preferences = useAppPreferences();
  const [patch, setPatch] = useState<Partial<AppPreferences>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [discard, setDiscard] = useState(false);
  const settings = { ...preferences.settings, ...patch };
  const dirty =
    JSON.stringify(settings) !== JSON.stringify(preferences.settings);
  function change(value: Partial<AppPreferences>) {
    setPatch((current) => ({ ...current, ...value }));
    setSaved(false);
    setError("");
  }
  function close() {
    if (pending) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  const syncLabels = {
    device: "Saved on this device. Sign in to sync settings.",
    loading: "Loading account settings…",
    synced: "Synced with your account.",
    offline: "Offline. Reconnect to save changes to your account.",
    error:
      "Account settings are unavailable. Your saved device copy is active.",
  };
  return (
    <Modal
      open
      onClose={close}
      labelledBy="settings-title"
      className="my-6 w-full max-w-3xl border border-white/10 bg-val-surface shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <h3
          id="settings-title"
          className="font-oswald text-xl font-semibold uppercase tracking-wider text-white"
        >
          Settings
        </h3>
        <button
          type="button"
          onClick={close}
          disabled={pending}
          aria-label="Close settings"
          className="grid size-10 place-items-center rounded-sm text-white/45 hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </header>
      {discard ? (
        <div className="p-5">
          <ConfirmAction
            title="Discard changes?"
            description="Your unsaved settings will be discarded."
            label="Discard changes"
            pending={false}
            error={null}
            onConfirm={onClose}
            onCancel={() => setDiscard(false)}
          />
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!dirty || pending) return;
            setError("");
            setSaved(false);
            startTransition(async () => {
              try {
                await preferences.save(patch);
                setPatch({});
                setSaved(true);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Settings could not be saved. Try again.",
                );
              }
            });
          }}
        >
          <fieldset
            disabled={pending}
            className="grid min-w-0 gap-6 border-0 p-5 md:grid-cols-2"
          >
            <section className="min-w-0">
              <h4 className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                <Volume2 size={14} />
                Audio
              </h4>
              <Switch
                label="Background music"
                checked={settings.musicEnabled}
                onChange={(musicEnabled) => change({ musicEnabled })}
              />
              <Range
                label="Music volume"
                value={settings.musicVolume}
                disabled={!settings.musicEnabled}
                onChange={(musicVolume) => change({ musicVolume })}
              />
              <Switch
                label="Interface sounds"
                checked={settings.effectsEnabled}
                onChange={(effectsEnabled) => change({ effectsEnabled })}
              />
              <Range
                label="Effects volume"
                value={settings.effectsVolume}
                disabled={!settings.effectsEnabled}
                onChange={(effectsVolume) => change({ effectsVolume })}
              />
              <Range
                label="Voice line volume"
                value={settings.voiceVolume}
                onChange={(voiceVolume) => change({ voiceVolume })}
              />
            </section>
            <div className="min-w-0 space-y-6">
              <section>
                <h4 className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  <Monitor size={14} />
                  Appearance
                </h4>
                <Switch
                  label="Background video"
                  description="Play the animated background."
                  checked={settings.backgroundVideo}
                  onChange={(backgroundVideo) => change({ backgroundVideo })}
                />
              </section>
              <section>
                <h4 className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
                  <Power size={14} />
                  Windows
                </h4>
                <Switch
                  label="Start with Windows"
                  checked={settings.autoStart}
                  onChange={(autoStart) => change({ autoStart })}
                />
                <Switch
                  label="Close to tray"
                  description="Keep the app running when its window closes."
                  checked={settings.closeToTray}
                  onChange={(closeToTray) => change({ closeToTray })}
                />
              </section>
            </div>
          </fieldset>
          <div className="px-5 pb-5">
            <UpdatesPanel unsaved={dirty} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p
                role="status"
                className="inline-flex items-center gap-1.5 text-xs text-white/40"
              >
                {saved && <Check size={13} className="text-val-teal" />}
                {saved ? "Settings saved." : syncLabels[preferences.syncState]}
              </p>
              {(preferences.syncState === "error" ||
                preferences.syncState === "offline") && (
                <button
                  type="button"
                  onClick={preferences.retrySync}
                  className="ml-2 text-xs text-val-red underline"
                >
                  Retry sync
                </button>
              )}
              <p className="mt-1 text-[10px] text-white/25">
                Changes take effect when saved.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => change({ ...DEFAULT_PREFERENCES })}
                className="h-10 px-2 text-xs text-white/40 hover:text-white disabled:opacity-40"
              >
                Restore defaults
              </button>
              <button
                type="submit"
                disabled={!dirty || pending}
                className="h-10 rounded-sm bg-val-red px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-val-red/85 disabled:cursor-default disabled:opacity-35"
              >
                {pending ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>
          {(error || preferences.nativeError) && (
            <p
              role="alert"
              className="mx-5 mb-5 rounded-sm border border-val-red/20 bg-val-red/10 p-3 text-xs text-val-red"
            >
              {error || preferences.nativeError}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}

function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mb-3 flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="text-sm font-medium text-white/80">{label}</span>
        {description && (
          <span className="mt-1 block text-xs leading-relaxed text-white/35">
            {description}
          </span>
        )}
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-10 rounded-full border border-white/15 bg-white/8 transition-colors peer-checked:border-val-red peer-checked:bg-val-red peer-focus-visible:ring-2 peer-focus-visible:ring-val-red/40 peer-disabled:opacity-35" />
        <span className="pointer-events-none absolute left-1 top-1 size-4 rounded-full bg-white/75 transition-transform peer-checked:translate-x-4 peer-checked:bg-white" />
      </span>
    </label>
  );
}
function Range({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`mb-5 block ${disabled ? "opacity-35" : ""}`}>
      <span className="mb-2 flex items-center justify-between gap-3 text-xs text-white/45">
        {label}
        <span className="font-mono tabular-nums text-white/60">
          {Math.round(value * 100)}%
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.valueAsNumber / 100)}
        className="settings-range block h-5 w-full cursor-pointer accent-val-red disabled:cursor-default"
      />
    </label>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import SettingsDialog from "./SettingsDialog";
import { useAppPreferences } from "./PreferencesProvider";
export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const { scope } = useAppPreferences();
  useEffect(
    () => window.agentAcademy?.preferences?.onOpen(() => setOpen(true)),
    [],
  );
  return (
    <>
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        onClick={() => setOpen(true)}
        className="flex h-full w-10 items-center justify-center text-val-cream/55 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-val-red"
      >
        <Settings size={17} />
      </button>
      {open && <SettingsDialog key={scope} onClose={() => setOpen(false)} />}
    </>
  );
}

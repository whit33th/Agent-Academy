"use client";
import { Activity, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { GameSnapshot } from "@/lib/desktop/protocol";
export default function SyncHelpDialog({ open, onClose, state }: { open: boolean; onClose: () => void; state: GameSnapshot | null }) {
  return <Modal open={open} onClose={onClose} labelledBy="sync-help-title" className="w-full max-w-md bg-val-surface border border-white/10 clip-angular overflow-hidden p-6 flex flex-col gap-5 cursor-default">
    <header className="flex items-center justify-between border-b border-white/5 pb-3"><h3 id="sync-help-title" className="font-oswald text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2"><Activity size={18} />VALORANT Live Sync</h3><button type="button" onClick={onClose} aria-label="Close help" className="text-white/60 hover:text-white transition-colors cursor-pointer"><X size={18} /></button></header>
    <div className="flex flex-col gap-4 text-sm text-white/70">
      <p>{state ? "Game detection is built into Agent Academy. Start VALORANT and leave the app open or in the system tray." : "Automatic game detection is available in the Agent Academy desktop app. You can select your map and agent manually in the browser."}</p>
      <p>When confirmed, the current map and your locked agent open automatically. Missing information stays unknown; you can always navigate manually.</p>
      {state && <p className="text-white/45">{state.reason ?? (state.gameRunning === false ? "VALORANT is not running." : "Watching for game changes.")}{state.observedAt ? ` Last game event: ${new Date(state.observedAt).toLocaleTimeString()}.` : ""}</p>}
      <p className="text-white/45">No separate sync installer is needed.</p>
    </div>
  </Modal>;
}

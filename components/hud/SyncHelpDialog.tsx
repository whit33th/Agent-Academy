"use client";

import { Activity, Download, X } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface SyncHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SyncHelpDialog({ open, onClose }: SyncHelpDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="sync-help-title"
      className="w-full max-w-md bg-val-surface border border-white/10 clip-angular overflow-hidden p-6 flex flex-col gap-5 cursor-default"
    >
      <header className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3
          id="sync-help-title"
          className="font-oswald text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2"
        >
          <Activity size={18} className="text-val-red animate-pulse" />
          VALORANT Live Sync
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex flex-col gap-4 text-sm text-white/70">
        <p className="leading-relaxed">
          To let Agent Academy detect your VALORANT map automatically, install
          the small local sync helper on your PC.
        </p>

        <div className="flex flex-col gap-3 bg-black/40 p-4 rounded-sm border border-white/5">
          <a
            href="/api/install-sync-ps"
            download="install-sync.bat"
            className="flex items-center justify-center gap-2 py-3 bg-val-red hover:bg-val-red/90 text-white font-bold uppercase tracking-wider text-xs rounded transition-[scale,background-color] active:scale-98 select-none text-center"
          >
            <Download size={14} />
            Download installer (.bat)
          </a>
          <p className="text-[10px] text-white/45 leading-normal">
            Uses built-in Windows PowerShell. No extra dependencies. Tiny script
            that auto-starts with Windows.
          </p>
        </div>

        <ol className="flex flex-col gap-1.5 text-xs text-white/55 leading-relaxed list-decimal pl-4">
          <li>
            Run the downloaded <strong>install-sync.bat</strong>.
          </li>
          <li>
            If Windows SmartScreen appears, click <strong>More info</strong>,
            then <strong>Run anyway</strong>.
          </li>
          <li>
            The installer fetches the helper script, registers a hidden
            auto-start, and verifies the service is listening.
          </li>
        </ol>

        <p className="text-[10px] text-white/40 italic mt-1 leading-normal">
          * The helper only reads your local VALORANT state and shares the
          detected map and agent with this site.
        </p>
      </div>

      <div className="flex border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-[scale,background-color] cursor-pointer font-bold uppercase tracking-wider text-xs text-center active:scale-95"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

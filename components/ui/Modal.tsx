"use client";

import { useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional aria-labelledby */
  labelledBy?: string;
  /** Container className for the inner box. */
  className?: string;
}

/**
 * Lightweight accessible modal: native dialog semantics via role="dialog",
 * focus trap on Tab, ESC to close, click-outside to close, body scroll lock.
 */
export default function Modal({ open, onClose, children, labelledBy, className }: ModalProps) {
  useBodyScrollLock(open);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    if (node) {
      const focusable = node.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && node) {
        const focusables = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm cursor-pointer overflow-y-auto"
      data-lenis-prevent
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {children}
      </div>
    </div>
  );
}

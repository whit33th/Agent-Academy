"use client";

import { useEffect, useEffectEvent, useRef } from "react";
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
 * Accessible modal on the native dialog top layer: focus trap, Escape,
 * backdrop dismiss, and body scroll lock.
 */
export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className,
}: ModalProps) {
  useBodyScrollLock(open);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    const node = dialogRef.current;
    if (!open || !node) return;
    if (!node.open) node.showModal();
    const onClick = (event: MouseEvent) => {
      if (event.target === node) close();
    };
    node.addEventListener("click", onClick);
    return () => {
      node.removeEventListener("click", onClick);
      if (node.open) node.close();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-[400] m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-4 backdrop:bg-black/85 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center"
    >
      <div className={className}>{children}</div>
    </dialog>
  );
}

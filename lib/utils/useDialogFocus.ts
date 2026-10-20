"use client";

import { useEffect, type RefObject } from "react";

const activeDialogs: HTMLElement[] = [];

export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const controls = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length > 0);
    activeDialogs.push(dialog);
    controls()[0]?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || activeDialogs.at(-1) !== dialog) return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (
        !dialog.contains(document.activeElement) ||
        (event.shiftKey
          ? document.activeElement === first
          : document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      activeDialogs.splice(activeDialogs.indexOf(dialog), 1);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, ref]);
}

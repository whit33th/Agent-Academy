"use client";

import { createPortal } from "react-dom";
import AuthButton from "@/components/auth/AuthButton";
import { useTitlebarSlot } from "@/lib/desktop/use-titlebar-slot";

export default function TitleBarAccount() {
  const target = useTitlebarSlot("titlebar-account");
  if (!target) return null;
  return createPortal(<AuthButton chrome />, target);
}

"use client";
import { useState } from "react";
import { useAppSession } from "@/components/auth/SessionProvider";
import { forkPublicLineup } from "@/app/_actions/lineups";
export default function CopyLineupButton({ id, mapSlug, agentSlug }: { id: string; mapSlug: string; agentSlug: string }) {
  const { getToken } = useAppSession();
  const [state, setState] = useState("Add");
  const [error, setError] = useState("");
  return <div><button type="button" disabled={state !== "Add"} onClick={async () => {
    setState("Adding…");
    const result = await forkPublicLineup(id, mapSlug, agentSlug, await getToken());
    setState(result.ok ? "Added" : "Add"); setError(result.ok ? "" : result.error);
  }} className="shrink-0 clip-angular-sm bg-val-red px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-val-red/90 transition-colors cursor-pointer">{state}</button>{error && <p role="alert" className="text-xs text-val-red mt-2">{error}</p>}</div>;
}

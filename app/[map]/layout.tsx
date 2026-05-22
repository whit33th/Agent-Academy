import { notFound } from "next/navigation";
import { findMap } from "@/lib/data/maps";
import { getAllApiAgents } from "@/lib/data/agents";
import BackLink from "@/components/layout/BackLink";
import MapTitle from "@/components/layout/MapTitle";
import LiveSyncStatus from "@/components/hud/LiveSyncStatus";
import AudioSettingsHUD from "@/components/AudioSettingsHUD";
import TacticalBoardButton from "@/components/hud/TacticalBoardButton";
import Image from "next/image";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ map: string }>;
}

export default async function MapLayout({ children, params }: LayoutProps) {
  const { map: mapSlug } = await params;
  const map = await findMap(mapSlug);
  if (!map) notFound();

  const allAgents = await getAllApiAgents();

  return (
    <main className="min-h-screen  p-4 md:p-6 relative lg:p-8">
      <header className="flex flex-row justify-between items-center w-full mb-4">
        <BackLink />
        <nav
          aria-label="Map controls"
          className="flex items-center gap-3 shrink-0"
        >
          <TacticalBoardButton map={map} allAgents={allAgents} />
          <div className="hidden sm:flex items-center">
            <LiveSyncStatus />
          </div>
          <AudioSettingsHUD />
        </nav>
      </header>

      <section className="mb-6">
        <MapTitle map={map} />
      </section>

      {children}
    </main>
  );
}

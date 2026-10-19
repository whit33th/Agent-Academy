import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findMap } from "@/lib/data/maps";
import { getAgentCount } from "@/lib/data/agents";
import { getMapLineupProgress } from "@/lib/data/screenshots";
import MapTitle from "@/components/layout/MapTitle";
import MapCollectionProgress from "@/components/layout/MapCollectionProgress";
import LiveSyncStatus from "@/components/hud/LiveSyncStatus";
import AudioSettingsHUD from "@/components/AudioSettingsHUD";
import AuthButton from "@/components/auth/AuthButton";
import PageChrome from "@/components/layout/PageChrome";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ map: string }>;
}

export default function MapLayout({ children, params }: LayoutProps) {
  return (
    <Suspense fallback={<MapShellFallback />}>
      <MapShell params={params}>{children}</MapShell>
    </Suspense>
  );
}

async function MapShell({ children, params }: LayoutProps) {
  const { map: mapSlug } = await params;
  const map = await findMap(mapSlug);
  if (!map) notFound();

  const [agentCount, progress] = await Promise.all([
    getAgentCount(),
    getMapLineupProgress(map._id),
  ]);

  return (
    <main className="min-h-screen  p-4 md:p-6 relative lg:p-8">
      <PageChrome map={map}>
        <AuthButton />
        <div className="hidden sm:flex items-center">
          <LiveSyncStatus />
        </div>
        <AudioSettingsHUD />
      </PageChrome>

      <section className="mb-6">
        <MapTitle map={map} />
        <MapCollectionProgress
          addedAgents={progress.agentsWithLineups}
          totalAgentsInGame={agentCount}
          mapName={map.name}
        />
      </section>

      <Suspense fallback={null}>{children}</Suspense>
    </main>
  );
}

function MapShellFallback() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="skeleton mb-6 h-14 max-w-sm clip-angular-sm" />
    </main>
  );
}

import { client } from "@/lib/sanity";
import {
  mapsQuery,
  agentsQuery,
  agentsByMapQuery,
  mapsByAgentQuery,
  screenshotsByMapAndAgentQuery,
} from "@/lib/queries";
import MainContent from "@/components/MainContent";
import BottomRail from "@/components/BottomRail";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

  if (!projectId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="font-oswald text-4xl font-bold uppercase text-white">
          Sanity Not Configured
        </h1>
        <p className="mt-4 max-w-md text-white/50">
          Add your Sanity project ID to{" "}
          <code className="rounded bg-white/10 px-2 py-1 text-sm">
            .env.local
          </code>
          .
        </p>
        <ol className="mt-6 space-y-2 text-left text-sm text-white/40">
          <li>1. Create a project at sanity.io/manage</li>
          <li>2. Copy the project ID</li>
          <li>
            3. Paste it into .env.local as NEXT_PUBLIC_SANITY_PROJECT_ID=your_id
          </li>
          <li>4. Restart the dev server</li>
        </ol>
      </div>
    );
  }

  try {
    const selectedMapSlug = typeof params.map === "string" ? params.map : null;
    const selectedAgentSlug =
      typeof params.agent === "string" ? params.agent : null;

    const [maps, agents] = await Promise.all([
      client.fetch(mapsQuery),
      client.fetch(agentsQuery),
    ]);

    const selectedMap = maps.find(
      (m: any) => m.slug?.current === selectedMapSlug,
    );
    const selectedAgent = agents.find(
      (a: any) => a.slug?.current === selectedAgentSlug,
    );
    const selectedMapId = selectedMap?._id ?? null;
    const selectedAgentId = selectedAgent?._id ?? null;

    let mapAgents: any[] = [];
    let agentMaps: any[] = [];
    let screenshots: any[] = [];

    if (selectedMapId && !selectedAgentId) {
      mapAgents = await client.fetch(agentsByMapQuery, {
        mapId: selectedMapId,
      });
    }
    if (selectedAgentId && !selectedMapId) {
      agentMaps = await client.fetch(mapsByAgentQuery, {
        agentId: selectedAgentId,
      });
    }
    if (selectedMapId && selectedAgentId) {
      screenshots = await client.fetch(screenshotsByMapAndAgentQuery, {
        mapId: selectedMapId,
        agentId: selectedAgentId,
      });
    }

    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <MainContent
          maps={maps}
          agents={agents}
          selectedMapSlug={selectedMapSlug}
          selectedAgentSlug={selectedAgentSlug}
          selectedMapId={selectedMapId}
          selectedAgentId={selectedAgentId}
          mapAgents={mapAgents}
          agentMaps={agentMaps}
          screenshots={screenshots}
        />
        <BottomRail
          maps={maps}
          agents={agents}
          railMode={railMode}
          selectedMapSlug={selectedMapSlug}
          selectedAgentSlug={selectedAgentSlug}
        />
      </div>
    );
  } catch (error) {
    console.error("Sanity fetch error:", error);
    return (
      <div className="flex h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="font-oswald text-4xl font-bold uppercase text-white">
          Connection Error
        </h1>
        <p className="mt-4 max-w-md text-white/50">
          Could not connect to Sanity. Make sure your project ID and dataset are
          correct.
        </p>
      </div>
    );
  }
}

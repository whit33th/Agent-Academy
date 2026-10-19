import type { ReactNode } from "react";
import PageChromeView from "@/components/layout/PageChromeView";
import { isDesktopRequest } from "@/lib/desktop/request";
import type { GameMap } from "@/lib/types";

export default async function PageChrome({ map, children }: { map?: GameMap; children: ReactNode }) {
  return <PageChromeView desktop={await isDesktopRequest()} map={map}>{children}</PageChromeView>;
}

import type { Metadata } from "next";
import AimRange from "@/components/aim/AimRange";
import { buildPageMetadata } from "@/lib/metadata";
import "@/components/aim/aim.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Aim",
  description:
    "Aim training: flicks, moving targets and tracking with your VALORANT sensitivity.",
});

export default function AimPage() {
  return (
    <main className="aim-screen overflow-hidden">
      <AimRange />
    </main>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agent Academy",
    short_name: "Agent Academy",
    description:
      "Valorant tactical lineups — maps, agents, and in-round setups.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#FF4655",
    categories: ["games", "utilities"],
    icons: [
      {
        src: "/valorant-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/valorant-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

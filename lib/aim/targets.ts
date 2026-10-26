export const AIM_TARGETS = [
  {
    id: "rift-4",
    label: "Reference",
    src: "/aim/targets/rift-v4-hd.webp",
    centerX: 0.48046,
    centerY: 0.50957,
    coreRadius: 0.23,
  },
  {
    id: "rift-2",
    label: "Ragged",
    src: "/aim/targets/rift-v2-hd.webp",
    centerX: 0.49841,
    centerY: 0.47329,
    coreRadius: 0.23,
  },
  {
    id: "rift-1",
    label: "Sharp",
    src: "/aim/targets/rift-v1-hd.webp",
    centerX: 0.49641,
    centerY: 0.48923,
    coreRadius: 0.23,
  },
  {
    id: "rift-3",
    label: "Round",
    src: "/aim/targets/rift-v3-hd.webp",
    centerX: 0.5008,
    centerY: 0.5012,
    coreRadius: 0.18,
  },
] as const;
export type AimTargetStyle = (typeof AIM_TARGETS)[number]["id"];

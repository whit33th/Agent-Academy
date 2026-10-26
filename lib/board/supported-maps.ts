// Kept small so the closed Board does not load ability geometry into the main UI.
export const BOARD_MAP_IDS = [
  "abyss",
  "ascent",
  "bind",
  "breeze",
  "corrode",
  "fracture",
  "haven",
  "icebox",
  "lotus",
  "pearl",
  "split",
  "summit",
  "sunset",
] as const;
export const supportsBoard = (mapId: string) =>
  BOARD_MAP_IDS.some((id) => id === mapId.toLowerCase());

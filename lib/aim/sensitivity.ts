export const VALORANT_YAW_PER_COUNT = 0.07;
export const VALORANT_HORIZONTAL_FOV = 103;
export const VIEW_ASPECT = 16 / 9;
export const DEG_TO_RAD = Math.PI / 180;
export function countsToDegrees(counts: number, sensitivity: number) {
  return counts * sensitivity * VALORANT_YAW_PER_COUNT;
}
export function normalizeYaw(degrees: number) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}
export function verticalFov(horizontalFov: number, aspect: number) {
  return (
    (2 * Math.atan(Math.tan((horizontalFov * DEG_TO_RAD) / 2) / aspect)) /
    DEG_TO_RAD
  );
}
export function fitAimView(width: number, height: number) {
  const fittedWidth = Math.max(1, Math.min(width, height * VIEW_ASPECT));
  const fittedHeight = fittedWidth / VIEW_ASPECT;
  return {
    width: fittedWidth,
    height: fittedHeight,
    left: (width - fittedWidth) / 2,
    top: (height - fittedHeight) / 2,
  };
}

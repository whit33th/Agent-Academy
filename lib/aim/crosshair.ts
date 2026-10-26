export interface CrosshairLines {
  visible: boolean;
  length: number;
  verticalLength: number;
  thickness: number;
  offset: number;
  opacity: number;
  movementError: boolean;
  firingError: boolean;
}

/** The selected primary (hipfire) profile, without weapon-dependent spread. */
export interface ValorantCrosshair {
  color: string;
  colorAlpha: number;
  hidden: boolean;
  scaleToResolution: boolean;
  outline: {
    visible: boolean;
    thickness: number;
    color: string;
    opacity: number;
  };
  dot: { visible: boolean; size: number; opacity: number };
  inner: CrosshairLines;
  outer: CrosshairLines;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid crosshair object");
  return value as Record<string, unknown>;
}
function number(value: unknown, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new Error("Invalid crosshair number");
  return value;
}
function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new Error("Invalid crosshair flag");
  return value;
}
function color(value: unknown) {
  const channels = object(value);
  const bytes = ["r", "g", "b", "a"].map((key) => {
    const byte = number(channels[key], 255);
    if (!Number.isInteger(byte)) throw new Error("Invalid color channel");
    return byte;
  });
  return {
    css: `#${bytes
      .slice(0, 3)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`,
    alpha: bytes[3] / 255,
  };
}
function lines(value: unknown): CrosshairLines {
  const data = object(value);
  return {
    visible: boolean(data.bShowLines),
    length: number(data.lineLength, 100),
    verticalLength: boolean(data.bAllowVertScaling)
      ? number(data.lineLengthVertical, 100)
      : number(data.lineLength, 100),
    thickness: number(data.lineThickness, 100),
    offset: number(data.lineOffset, 100),
    opacity: number(data.opacity, 1),
    movementError: boolean(data.bShowMovementError),
    firingError: boolean(data.bShowShootingError),
  };
}

/** Riot stores JSON inside an INI-quoted JSON string; never use loose/default keys. */
export function parseValorantCrosshair(ini: string): ValorantCrosshair | null {
  try {
    const values = [
      ...ini.matchAll(
        /^\s*EAresStringSettingName::SavedCrosshairProfileData\s*=\s*([^\r\n]+)\s*$/gm,
      ),
    ].map((match) => match[1].trim());
    if (
      !values.length ||
      values.some((value) => value !== values[0]) ||
      values[0].length > 1_000_000
    )
      return null;
    const decoded: unknown = JSON.parse(values[0]);
    const data = object(
      typeof decoded === "string" ? JSON.parse(decoded) : decoded,
    );
    if (!Number.isInteger(data.currentProfile) || !Array.isArray(data.profiles))
      return null;
    const index = data.currentProfile as number;
    if (index < 0 || index >= data.profiles.length) return null;
    const profile = object(data.profiles[index]);
    const primary = object(profile.primary);
    const selectedColor = color(
      boolean(primary.bUseCustomColor) ? primary.colorCustom : primary.color,
    );
    const outlineColor = color(primary.outlineColor);
    return {
      color: selectedColor.css,
      colorAlpha: selectedColor.alpha,
      hidden: boolean(primary.bHideCrosshair),
      scaleToResolution: boolean(profile.bScaleToResolution),
      outline: {
        visible: boolean(primary.bHasOutline),
        thickness: number(primary.outlineThickness, 100),
        color: outlineColor.css,
        opacity: number(primary.outlineOpacity, 1) * outlineColor.alpha,
      },
      dot: {
        visible: boolean(primary.bDisplayCenterDot),
        size: number(primary.centerDotSize, 100),
        opacity: number(primary.centerDotOpacity, 1),
      },
      inner: lines(primary.innerLines),
      outer: lines(primary.outerLines),
    };
  } catch {
    return null;
  }
}

export interface CrosshairRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface CrosshairLayer {
  opacity: number;
  rects: CrosshairRect[];
}

/** Geometry in output pixels, independent of Windows DPI and camera FOV. */
export function crosshairGeometry(
  profile: ValorantCrosshair,
  scale = 1,
): CrosshairLayer[] {
  if (profile.hidden || !Number.isFinite(scale) || scale <= 0) return [];
  const pixel = (value: number) => Math.round(value * scale);
  const layers: CrosshairLayer[] = [];
  for (const group of [profile.outer, profile.inner]) {
    if (!group.visible) continue;
    const length = pixel(group.length),
      vertical = pixel(group.verticalLength),
      thickness = pixel(group.thickness),
      gap = pixel(group.offset),
      half = Math.floor(thickness / 2);
    if (!thickness) continue;
    const rects: CrosshairRect[] = [];
    if (length)
      rects.push(
        { x: gap, y: -half, width: length, height: thickness },
        { x: -gap - length, y: -half, width: length, height: thickness },
      );
    if (vertical)
      rects.push(
        { x: -half, y: gap, width: thickness, height: vertical },
        { x: -half, y: -gap - vertical, width: thickness, height: vertical },
      );
    layers.push({ opacity: group.opacity * profile.colorAlpha, rects });
  }
  const size = pixel(profile.dot.size);
  if (profile.dot.visible && size)
    layers.push({
      opacity: profile.dot.opacity * profile.colorAlpha,
      rects: [
        {
          x: -Math.floor(size / 2),
          y: -Math.floor(size / 2),
          width: size,
          height: size,
        },
      ],
    });
  return layers;
}

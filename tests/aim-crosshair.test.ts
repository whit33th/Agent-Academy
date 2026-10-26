import { describe, expect, it } from "vitest";
import {
  crosshairGeometry,
  parseValorantCrosshair,
} from "../lib/aim/crosshair";
import {
  crosshairData,
  crosshairIni,
  importedCrosshair,
} from "./fixtures/aim-game";

describe("active VALORANT crosshair import", () => {
  it("uses the selected primary profile rather than the first profile or loose defaults", () => {
    const data = crosshairData();
    const active = structuredClone(data.profiles[0]);
    data.profiles[0].primary.color = { r: 255, g: 0, b: 0, a: 255 };
    data.profiles.push(active);
    data.currentProfile = 1;
    expect(
      parseValorantCrosshair(
        `${crosshairIni(data)}EAresStringSettingName::CrosshairColor=(R=255,G=255,B=255,A=255)`,
      ),
    ).toEqual(importedCrosshair);
    expect(importedCrosshair.inner.opacity).toBe(0.8000081181526184);
  });
  it("reads raw JSON as well as the current double-encoded INI value", () => {
    expect(
      parseValorantCrosshair(
        `EAresStringSettingName::SavedCrosshairProfileData=${JSON.stringify(crosshairData())}`,
      ),
    ).toEqual(importedCrosshair);
  });
  it("honors custom RGBA, separate vertical length, dot and outline", () => {
    const data = crosshairData(),
      primary = data.profiles[0].primary;
    primary.bUseCustomColor = true;
    primary.colorCustom = { r: 12, g: 34, b: 56, a: 128 };
    primary.innerLines.bAllowVertScaling = true;
    primary.innerLines.lineLengthVertical = 4;
    primary.bDisplayCenterDot = true;
    primary.bHasOutline = true;
    const profile = parseValorantCrosshair(crosshairIni(data))!;
    expect(profile).toMatchObject({
      color: "#0c2238",
      colorAlpha: 128 / 255,
      outline: { visible: true },
      dot: { visible: true },
    });
    const geometry = crosshairGeometry(profile);
    expect(geometry[0].rects[2]).toEqual({ x: -1, y: 3, width: 2, height: 4 });
    expect(geometry[1]).toEqual({
      opacity: 128 / 255,
      rects: [{ x: -1, y: -1, width: 2, height: 2 }],
    });
  });
  it("does not substitute a default for missing, ambiguous or corrupt saved profiles", () => {
    expect(parseValorantCrosshair("")).toBeNull();
    expect(
      parseValorantCrosshair(
        "EAresStringSettingName::SavedCrosshairProfileData=broken",
      ),
    ).toBeNull();
    const data = crosshairData();
    data.currentProfile = 8;
    expect(parseValorantCrosshair(crosshairIni(data))).toBeNull();
    expect(
      parseValorantCrosshair(crosshairIni() + crosshairIni(data)),
    ).toBeNull();
    data.currentProfile = -1;
    expect(parseValorantCrosshair(crosshairIni(data))).toBeNull();
    expect(
      parseValorantCrosshair(
        crosshairIni({ currentProfile: 0, profiles: [{}] }),
      ),
    ).toBeNull();
    data.currentProfile = 0;
    data.profiles[0].primary.innerLines.lineLength = 1e9;
    expect(parseValorantCrosshair(crosshairIni(data))).toBeNull();
  });
});

describe("crosshair output-pixel geometry", () => {
  it("reproduces the actual selected 6px/2px/3px static green profile", () => {
    expect(importedCrosshair.color).toBe("#00ff00");
    expect(crosshairGeometry(importedCrosshair)).toEqual([
      {
        opacity: 0.8000081181526184,
        rects: [
          { x: 3, y: -1, width: 6, height: 2 },
          { x: -9, y: -1, width: 6, height: 2 },
          { x: -1, y: 3, width: 2, height: 6 },
          { x: -1, y: -9, width: 2, height: 6 },
        ],
      },
    ]);
    expect(importedCrosshair.outline.visible).toBe(false);
    expect(importedCrosshair.dot.visible).toBe(false);
  });
  it("keeps odd widths aligned to output pixels and respects resolution scaling", () => {
    const profile = structuredClone(importedCrosshair);
    profile.inner.thickness = 1;
    const rect = crosshairGeometry(profile)[0].rects[0];
    expect(rect).toEqual({ x: 3, y: -0, width: 6, height: 1 });
    expect(crosshairGeometry(profile, 2)[0].rects[0]).toEqual({
      x: 6,
      y: -1,
      width: 12,
      height: 2,
    });
  });
  it("respects hide-crosshair and disabled layers without creating a fallback crosshair", () => {
    expect(crosshairGeometry({ ...importedCrosshair, hidden: true })).toEqual(
      [],
    );
    expect(
      crosshairGeometry({
        ...importedCrosshair,
        inner: { ...importedCrosshair.inner, visible: false },
      }),
    ).toEqual([]);
    expect(crosshairGeometry(importedCrosshair, NaN)).toEqual([]);
  });
});

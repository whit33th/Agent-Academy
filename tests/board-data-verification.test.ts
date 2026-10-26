import { describe, expect, it } from "vitest";
import data from "../lib/generated/board-data.json";
// Authoring code is JavaScript and deliberately independent of the application runtime.
import { verifyRelease } from "../scripts/board-data/verification.mjs";

function receipt() {
  return {
    dataVersion: data.dataVersion,
    gameBuild: data.gameBuild,
    manifestId: data.manifestId,
    unresolved: [] as string[],
    abilities: data.abilities.map((ability) => ({
      id: ability.id,
      parameters: "verified",
      interactions: "passed",
      evidence: ["fixture reference"],
      terrain: {
        implementationHash: "a".repeat(64),
        liveGameCases: ["fixture case"],
      },
    })),
    maps: data.maps.map((map) => ({
      mapId: map.mapId,
      radarSha256: "a".repeat(64),
      controlPoints: Array.from({ length: 3 }, () => ({
        independent: true,
        errorMeters: 0.1,
        toleranceMeters: 0.2,
      })),
      browser: "passed",
      electron: "passed",
    })),
  };
}

describe("complete dataset release gate", () => {
  it("rejects a missing or foreign receipt and unresolved gameplay issues", () => {
    expect(verifyRelease(data, null)).not.toEqual([]);
    expect(
      verifyRelease(data, { ...receipt(), dataVersion: "other" }),
    ).not.toEqual([]);
    const evidence = receipt();
    evidence.unresolved.push("Dash integration is not confirmed");
    expect(verifyRelease(data, evidence)).toContain(
      "Unresolved gameplay/calibration issues remain.",
    );
  });
  it("requires unique full coverage, terrain cases and bounded independent calibration", () => {
    expect(verifyRelease(data, receipt())).toEqual([]);
    const evidence = receipt();
    evidence.abilities[0] = evidence.abilities[1];
    evidence.maps[0].controlPoints[0].toleranceMeters = Infinity;
    const pit = evidence.abilities.find((check) =>
      data.abilities
        .find((ability) => ability.id === check.id)!
        .modes.some((mode) => mode.geometry.kind === "ground-volume"),
    )!;
    pit.terrain.liveGameCases = [];
    const failures = verifyRelease(data, evidence);
    expect(
      failures.some((failure: string) => failure.includes("coverage")),
    ).toBe(true);
    expect(
      failures.some((failure: string) => failure.includes("terrain")),
    ).toBe(true);
    expect(failures.some((failure: string) => failure.includes("radar"))).toBe(
      true,
    );
  });
});

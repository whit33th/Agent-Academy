/** Publishing requires evidence for the exact candidate, not merely 116 named rows. */
export function verifyRelease(candidate, evidence) {
  const failures = [];
  if (
    !evidence ||
    evidence.dataVersion !== candidate.dataVersion ||
    evidence.gameBuild !== candidate.gameBuild ||
    evidence.manifestId !== candidate.manifestId
  )
    return [
      "Verification does not identify this exact candidate/build/manifest.",
    ];
  if (!Array.isArray(evidence.unresolved) || evidence.unresolved.length)
    failures.push("Unresolved gameplay/calibration issues remain.");
  const abilityChecks = Array.isArray(evidence.abilities)
    ? evidence.abilities
    : [];
  const mapChecks = Array.isArray(evidence.maps) ? evidence.maps : [];
  if (
    candidate.abilities.length !== 116 ||
    candidate.maps.length !== 13 ||
    abilityChecks.length !== 116 ||
    mapChecks.length !== 13 ||
    new Set(abilityChecks.map((check) => check.id)).size !== 116 ||
    new Set(mapChecks.map((check) => check.mapId)).size !== 13
  )
    failures.push("Verification coverage is incomplete or duplicated.");
  for (const ability of candidate.abilities) {
    const check = abilityChecks.find((check) => check.id === ability.id);
    if (
      check?.parameters !== "verified" ||
      check?.interactions !== "passed" ||
      !Array.isArray(check.evidence) ||
      !check.evidence.length
    )
      failures.push(
        `Missing gameplay/interactions evidence: ${ability.agentSlug}:${ability.slot}`,
      );
    if (
      ability.modes.some((mode) => mode.geometry.kind === "ground-volume") &&
      (!/^[a-f0-9]{64}$/i.test(check?.terrain?.implementationHash ?? "") ||
        !Array.isArray(check?.terrain?.liveGameCases) ||
        !check.terrain.liveGameCases.length)
    )
      failures.push(
        `Missing terrain algorithm/live-game validation: ${ability.id}`,
      );
  }
  for (const map of candidate.maps) {
    const check = mapChecks.find((check) => check.mapId === map.mapId);
    if (
      !/^[a-f0-9]{64}$/i.test(check?.radarSha256 ?? "") ||
      !Array.isArray(check?.controlPoints) ||
      check.controlPoints.length < 3 ||
      !check.controlPoints.every(
        (point) =>
          point.independent === true &&
          Number.isFinite(point.errorMeters) &&
          point.errorMeters >= 0 &&
          Number.isFinite(point.toleranceMeters) &&
          point.toleranceMeters > 0 &&
          point.toleranceMeters <= 0.5 &&
          point.errorMeters <= point.toleranceMeters,
      ) ||
      check.browser !== "passed" ||
      check.electron !== "passed"
    )
      failures.push(
        `Missing independent radar/calibration/runtime checks: ${map.mapId}`,
      );
  }
  return failures;
}

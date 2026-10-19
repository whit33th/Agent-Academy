import { describe, expect, it } from "vitest";
import { initialSnapshot } from "../lib/desktop/protocol";
import { syncStatusLabel } from "../lib/desktop/status-label";

describe("sync status label", () => {
  it("names the map and locked agent without a phase sentence", () => {
    const state = { ...initialSnapshot(), gameRunning: true, sourceStatus: "ready" as const, phase: "match" as const, mapSlug: "lotus", agentSlug: "killjoy", agentLocked: true };
    expect(syncStatusLabel(state)).toBe("Lotus · Killjoy");
  });
  it("does not invent a map name when only the agent is known", () => {
    const state = { ...initialSnapshot(), gameRunning: true, sourceStatus: "ready" as const, phase: "match" as const, agentSlug: "kayo", agentLocked: true };
    expect(syncStatusLabel(state)).toBe("KAY/O");
  });
  it("adds the queue only when the snapshot has one", () => {
    const playing = { ...initialSnapshot(), gameRunning: true, sourceStatus: "ready" as const, phase: "match" as const, mapSlug: "corrode", agentSlug: "killjoy", agentLocked: true, mode: "custom" };
    expect(syncStatusLabel(playing)).toBe("Corrode · Killjoy · Custom");
    const queued = { ...initialSnapshot(), gameRunning: true, sourceStatus: "ready" as const, phase: "queue" as const, mode: "competitive" };
    expect(syncStatusLabel(queued)).toBe("Ranked");
  });
  it("keeps idle phases to one word", () => {
    expect(syncStatusLabel(null)).toBe("Offline");
    expect(syncStatusLabel({ ...initialSnapshot(), gameRunning: true, sourceStatus: "ready", phase: "menu" })).toBe("Lobby");
    expect(syncStatusLabel({ ...initialSnapshot(), gameRunning: true, sourceStatus: "ready", phase: "queue" })).toBe("Queue");
  });
});

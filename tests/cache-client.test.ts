import { expect, it, vi } from "vitest";
import {
  cacheSubjectSnapshot,
  clearCollectionCache,
  synchronizeCache,
} from "../lib/collection/cache-client";

it("locks private cache access when a restored session can no longer supply a token", async () => {
  const authorize = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("window", { agentAcademy: { cache: { authorize } } });
  try {
    await synchronizeCache("alice", async () => "signed-token");
    expect(cacheSubjectSnapshot()).toBe("alice");
    await synchronizeCache("alice", async () => null);
    expect(cacheSubjectSnapshot()).toBe("");
    expect(authorize).toHaveBeenLastCalledWith("");
    await clearCollectionCache();
    expect(authorize).toHaveBeenLastCalledWith(null);
  } finally {
    vi.unstubAllGlobals();
  }
});

import { describe, expect, it } from "vitest";
import { gzipSync } from "fflate";
import { randomUUID } from "node:crypto";
import { abilityDefinitions, emptyBoard } from "../lib/board/data";
import { getAgents } from "../lib/catalog/catalog";
import {
  encodeBoardDocument,
  loadBoardDocument,
} from "../lib/board/serialization";
import type { AbilityInstance, AgentInstance } from "../lib/board/types";
const encodeBytes = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64");
describe("compressed BoardDocumentV2 links", () => {
  it("round-trips 200 abilities and 200 agents without reducing coordinate precision", () => {
    const document = emptyBoard("ascent");
    const agents = getAgents();
    const abilities: AbilityInstance[] = Array.from(
      { length: 200 },
      (_, index) => {
        const definition =
          abilityDefinitions[index % abilityDefinitions.length];
        return {
          id: randomUUID(),
          kind: "ability",
          definitionId: definition.id,
          mode: definition.modes[0].id,
          rotation: index % 360,
          points: [],
          position: {
            x: Math.sin(index) * 40 + 70,
            y: Math.cos(index) * 40 + 70,
          },
        };
      },
    );
    const tokens: AgentInstance[] = Array.from({ length: 200 }, (_, index) => ({
      id: randomUUID(),
      kind: "agent",
      agentId: agents[index % agents.length]._id,
      position: { x: index / 3, y: index / 7 },
    }));
    const full = { ...document, objects: [...abilities, ...tokens] };
    const encoded = encodeBoardDocument(full);
    expect(encoded.length).toBeLessThan(24000);
    expect(loadBoardDocument(encoded, "ascent")).toEqual(full);
  });
  it("still reads plain V2 JSON and legacy JSON links", () => {
    const document = emptyBoard("ascent");
    expect(loadBoardDocument(btoa(JSON.stringify(document)), "ascent")).toEqual(
      document,
    );
    expect(
      loadBoardDocument(
        btoa(
          JSON.stringify({
            strokes: [],
            placedAgents: [],
            placedAbilities: [],
          }),
        ),
        "ascent",
      ),
    ).toEqual(document);
  });
  it("rejects a corrupt payload or checksum and bounds inflation with a forged footer", () => {
    const bytes = gzipSync(
      new TextEncoder().encode(JSON.stringify(emptyBoard("ascent"))),
      { mtime: 0 },
    );
    const corrupt = new Uint8Array(bytes);
    corrupt[corrupt.length - 8] ^= 1;
    expect(() => loadBoardDocument(encodeBytes(corrupt), "ascent")).toThrow(
      "Corrupt",
    );
    expect(() =>
      loadBoardDocument(
        encodeBytes(bytes.subarray(0, bytes.length - 10)),
        "ascent",
      ),
    ).toThrow();
    const expanded = gzipSync(new Uint8Array(5 * 1024 * 1024), {
      level: 9,
      mtime: 0,
    });
    new DataView(expanded.buffer).setUint32(expanded.length - 4, 1, true);
    expect(() => loadBoardDocument(encodeBytes(expanded), "ascent")).toThrow(
      "too large",
    );
  });
});

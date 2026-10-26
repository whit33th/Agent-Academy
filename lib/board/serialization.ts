import { findAgent, getAgents } from "@/lib/catalog/catalog";
import { Gunzip, gzipSync } from "fflate";
import {
  abilityDefinitions,
  emptyBoard,
  getAbilityDefinition,
  getMapCalibration,
} from "./data";
import {
  add,
  angle,
  constrainPath,
  distance,
  modeGeometry,
  pathLength,
  rotate,
} from "./geometry";
import { radarToMap } from "./projection";
import {
  BOARD_LIMITS,
  type AbilityInstance,
  type BoardDocumentV2,
  type BoardObject,
  type Point,
  type Stroke,
} from "./types";

const MAX_INPUT = 256 * 1024;
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
  let value = byte;
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function decompress(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 18) throw new Error("Invalid compressed board.");
  const footer = new DataView(
    bytes.buffer,
    bytes.byteOffset + bytes.length - 8,
    8,
  );
  const size = footer.getUint32(4, true);
  if (size > MAX_DOCUMENT_BYTES) throw new Error("Board is too large.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  const stream = new Gunzip((chunk) => {
    length += chunk.length;
    if (length > MAX_DOCUMENT_BYTES) throw new Error("Board is too large.");
    chunks.push(chunk);
  });
  stream.onmember = () => {
    throw new Error("Invalid compressed board.");
  };
  // Bound each inflation step as well as the total, including a forged gzip footer.
  for (let offset = 0; offset < bytes.length; offset += 256)
    stream.push(
      bytes.subarray(offset, offset + 256),
      offset + 256 >= bytes.length,
    );
  if (length !== size) throw new Error("Incomplete compressed board.");
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  if (crc32(result) !== footer.getUint32(0, true))
    throw new Error("Corrupt compressed board.");
  return result;
}
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 100;
const color = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const point = (value: unknown): value is Point & Record<string, unknown> =>
  record(value) &&
  finite(value.x) &&
  finite(value.y) &&
  Math.abs(value.x) <= 10000 &&
  Math.abs(value.y) <= 10000;
const normalizedPoint = (
  value: unknown,
): value is Point & Record<string, unknown> =>
  point(value) && value.x >= 0 && value.y >= 0 && value.x <= 1 && value.y <= 1;
const type = (value: unknown): value is Stroke["type"] =>
  ["pen", "line", "arrow", "eraser"].includes(String(value));

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function compactId(id: string): string {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  ) {
    const hex = id.replaceAll("-", "");
    return (
      "@u:" +
      base64(
        Uint8Array.from({ length: 16 }, (_, index) =>
          parseInt(hex.slice(index * 2, index * 2 + 2), 16),
        ),
      ).slice(0, -2)
    );
  }
  return id.startsWith("@") ? "@s:" + id : id;
}
function expandId(id: unknown): unknown {
  if (typeof id !== "string") return id;
  if (id.startsWith("@s:")) return id.slice(3);
  if (!id.startsWith("@u:")) return id;
  if (!/^@u:[A-Za-z0-9+/]{22}$/.test(id))
    throw new Error("Invalid compact identifier.");
  const hex = Array.from(atob(id.slice(3) + "=="), (char) =>
    char.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function wireDocument(
  document: BoardDocumentV2,
  objects: readonly BoardObject[],
) {
  const agents: string[] = [],
    definitions: string[] = [],
    coordinates: number[] = [];
  const index = (table: string[], value: string) => {
    const existing = table.indexOf(value);
    return existing === -1 ? table.push(value) - 1 : existing;
  };
  const xy = (point: Point) => {
    const index = coordinates.length / 2;
    coordinates.push(point.x, point.y);
    return index;
  };
  const range = (points: readonly Point[]) => {
    const start = coordinates.length / 2;
    for (const point of points) xy(point);
    return [start, points.length];
  };
  const rows = objects.map((object) => {
    if (object.kind === "stroke")
      return [
        0,
        compactId(object.id),
        object.type,
        object.color,
        object.width,
        range(object.points),
      ];
    if (object.kind === "agent")
      return [
        1,
        compactId(object.id),
        index(agents, object.agentId),
        xy(object.position),
      ];
    return [
      2,
      compactId(object.id),
      index(definitions, object.definitionId),
      object.mode,
      xy(object.position),
      object.rotation,
      range(object.points),
      object.source ? xy(object.source) : null,
      object.showOwnerRange ? 1 : 0,
      object.routes?.map(range) ?? [],
    ];
  });
  const buffer = new ArrayBuffer(coordinates.length * 8),
    view = new DataView(buffer);
  coordinates.forEach((coordinate, index) =>
    view.setFloat64(index * 8, coordinate, true),
  );
  return {
    header: {
      codec: "b2p",
      version: 2,
      mapId: document.mapId,
      gameBuild: document.gameBuild,
      dataVersion: document.dataVersion,
      agents,
      definitions,
      rows,
    },
    coordinates: new Uint8Array(buffer),
  };
}

function expandWire(input: unknown, bytes?: Uint8Array): unknown {
  if (!record(input) || input.codec !== "b2p") return input;
  if (
    input.version !== 2 ||
    !Array.isArray(input.rows) ||
    input.rows.length >
      BOARD_LIMITS.strokes + BOARD_LIMITS.agents + BOARD_LIMITS.abilities ||
    !Array.isArray(input.agents) ||
    input.agents.length > getAgents().length ||
    !input.agents.every(identifier) ||
    !Array.isArray(input.definitions) ||
    input.definitions.length > abilityDefinitions.length ||
    !input.definitions.every(identifier) ||
    !bytes ||
    bytes.length > MAX_DOCUMENT_BYTES
  )
    throw new Error("Invalid board document.");
  if (bytes.length % 16) throw new Error("Invalid board coordinates.");
  const coordinates = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ),
    pointCount = bytes.length / 16;
  const xy = (value: unknown) => {
    if (
      !Number.isSafeInteger(value) ||
      Number(value) < 0 ||
      Number(value) >= pointCount
    )
      throw new Error("Invalid board coordinate reference.");
    return {
      x: coordinates.getFloat64(Number(value) * 16, true),
      y: coordinates.getFloat64(Number(value) * 16 + 8, true),
    };
  };
  let strokePoints = 0,
    strokes = 0,
    agentsCount = 0,
    abilities = 0;
  const points = (value: unknown, stroke: boolean) => {
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      !value.every(Number.isSafeInteger) ||
      value[0] < 0 ||
      value[1] < 0 ||
      value[0] + value[1] > pointCount ||
      value[1] > (stroke ? BOARD_LIMITS.points : BOARD_LIMITS.routePoints)
    )
      throw new Error("Invalid board path.");
    if (stroke && (strokePoints += value[1]) > BOARD_LIMITS.points)
      throw new Error("Board is too large.");
    return Array.from({ length: value[1] }, (_, index) => xy(value[0] + index));
  };
  const tableEntry = (table: unknown[], value: unknown) => {
    if (
      !Number.isSafeInteger(value) ||
      Number(value) < 0 ||
      Number(value) >= table.length
    )
      throw new Error("Invalid board reference.");
    return table[Number(value)];
  };
  const agentTable = input.agents,
    definitions = input.definitions;
  const objects = input.rows.map((row: unknown) => {
    if (!Array.isArray(row)) throw new Error("Invalid board object.");
    if (row[0] === 0 && row.length === 6 && ++strokes <= BOARD_LIMITS.strokes)
      return {
        id: expandId(row[1]),
        kind: "stroke",
        type: row[2],
        color: row[3],
        width: row[4],
        points: points(row[5], true),
      };
    if (
      row[0] === 1 &&
      row.length === 4 &&
      ++agentsCount <= BOARD_LIMITS.agents
    )
      return {
        id: expandId(row[1]),
        kind: "agent",
        agentId: tableEntry(agentTable, row[2]),
        position: xy(row[3]),
      };
    if (
      row[0] === 2 &&
      (row.length === 9 ||
        (row.length === 10 &&
          Array.isArray(row[9]) &&
          row[9].length < BOARD_LIMITS.routes)) &&
      ++abilities <= BOARD_LIMITS.abilities &&
      (row[8] === 0 || row[8] === 1)
    )
      return {
        id: expandId(row[1]),
        kind: "ability",
        definitionId: tableEntry(definitions, row[2]),
        mode: row[3],
        position: xy(row[4]),
        rotation: row[5],
        points: points(row[6], false),
        ...(row[7] === null ? {} : { source: xy(row[7]) }),
        ...(row[8] === 1 ? { showOwnerRange: true } : {}),
        ...(row.length === 10 && row[9].length
          ? { routes: row[9].map((route: unknown) => points(route, false)) }
          : {}),
      };
    throw new Error("Invalid board object or object limit exceeded.");
  });
  return {
    version: 2,
    mapId: input.mapId,
    gameBuild: input.gameBuild,
    dataVersion: input.dataVersion,
    objects,
  };
}

function decode(encoded: string): unknown {
  if (encoded.length > MAX_INPUT || !/^[A-Za-z0-9+/=]+$/.test(encoded))
    throw new Error("Invalid board link.");
  let bytes: Uint8Array = Uint8Array.from(atob(encoded), (character) =>
    character.charCodeAt(0),
  );
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = decompress(bytes);
  if (bytes[0] === 0x42 && bytes[1] === 0x32) {
    if (bytes.length < 6) throw new Error("Invalid binary board.");
    const headerSize = new DataView(
      bytes.buffer,
      bytes.byteOffset + 2,
      4,
    ).getUint32(0, true);
    if (headerSize > bytes.length - 6)
      throw new Error("Invalid binary board header.");
    const header = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(6, 6 + headerSize),
      ),
    );
    return expandWire(header, bytes.subarray(6 + headerSize));
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

const canonical = (name: string) =>
  name.toLowerCase().replace(/\s+/g, " ").trim();
const aliases: Record<string, string> = {
  nebula: "nebula / dissipate",
  "cosmic divide": "astral form / cosmic divide",
  tripwire: "trapwire",
};

/** Legacy pixels/percentages are converted once. Supplied radii, shapes and image URLs are ignored. */
function legacy(
  parsed: Record<string, unknown>,
  mapId: string,
): readonly BoardObject[] {
  const map = getMapCalibration(mapId)!;
  if (
    ![parsed.strokes, parsed.placedAbilities, parsed.placedAgents].every(
      Array.isArray,
    )
  )
    throw new Error("Invalid legacy board.");
  const strokes = parsed.strokes as unknown[];
  const abilities = parsed.placedAbilities as unknown[];
  const agents = parsed.placedAgents as unknown[];
  if (
    strokes.length > BOARD_LIMITS.strokes ||
    abilities.length > BOARD_LIMITS.abilities ||
    agents.length > BOARD_LIMITS.agents
  )
    throw new Error("Board is too large.");
  const objects: BoardObject[] = [];
  for (const row of strokes) {
    if (
      !record(row) ||
      !identifier(row.id) ||
      !type(row.type) ||
      !color(row.color) ||
      !finite(row.width) ||
      row.width <= 0 ||
      row.width > 32 ||
      !Array.isArray(row.points) ||
      !row.points.every(normalizedPoint)
    )
      throw new Error("Invalid drawing.");
    objects.push({
      id: row.id,
      kind: "stroke",
      type: row.type,
      color: row.color,
      width: row.width,
      points: row.points.map((point) => radarToMap(point, map)),
    });
  }
  for (const row of agents) {
    if (
      !record(row) ||
      !identifier(row.id) ||
      !normalizedPoint(row) ||
      typeof row.agentName !== "string"
    )
      throw new Error("Invalid agent marker.");
    const agent = getAgents().find(
      (agent) => canonical(agent.name) === canonical(row.agentName as string),
    );
    if (agent)
      objects.push({
        id: row.id,
        kind: "agent",
        agentId: agent._id,
        position: radarToMap(row, map),
      });
  }
  for (const row of abilities) {
    if (
      !record(row) ||
      !identifier(row.id) ||
      !normalizedPoint(row) ||
      typeof row.agentName !== "string" ||
      typeof row.abilityName !== "string" ||
      !finite(row.rotation)
    )
      throw new Error("Invalid ability marker.");
    const name =
      aliases[canonical(row.abilityName)] ?? canonical(row.abilityName);
    const agent = getAgents().find(
      (agent) => canonical(agent.name) === canonical(row.agentName as string),
    );
    const definition =
      agent &&
      abilityDefinitions.find(
        (definition) =>
          definition.agentId === agent._id &&
          canonical(definition.name) === name,
      );
    // Removed game abilities are not silently reinterpreted as their replacements.
    if (!definition) continue;
    const instance: AbilityInstance = {
      id: row.id,
      kind: "ability",
      definitionId: definition.id,
      position: radarToMap(row, map),
      rotation: row.rotation % 360,
      mode: definition.modes[0].id,
      points: [],
    };
    const geometry = modeGeometry(definition, instance);
    if (
      (geometry.kind === "path" || geometry.kind === "segment") &&
      normalizedPoint({ x: row.endX, y: row.endY })
    ) {
      instance.points = constrainPath(
        [
          instance.position,
          radarToMap({ x: row.endX as number, y: row.endY as number }, map),
        ],
        geometry.maxLength,
      ).slice(1);
    }
    if (geometry.kind === "segment") {
      const endpoint = instance.points[0];
      if (
        !endpoint ||
        distance(instance.position, endpoint) < (geometry.minLength ?? 0)
      ) {
        const facing =
          endpoint && distance(instance.position, endpoint) > 0
            ? angle(instance.position, endpoint)
            : instance.rotation;
        instance.points = [
          add(
            instance.position,
            rotate(
              {
                x: endpoint ? (geometry.minLength ?? 0) : geometry.maxLength,
                y: 0,
              },
              facing,
            ),
          ),
        ];
      }
    }
    objects.push(instance);
  }
  return objects;
}

function validateObjects(input: unknown): readonly BoardObject[] {
  if (
    !Array.isArray(input) ||
    input.length >
      BOARD_LIMITS.strokes + BOARD_LIMITS.abilities + BOARD_LIMITS.agents
  )
    throw new Error("Board is too large.");
  const objects: BoardObject[] = [];
  let pointCount = 0,
    strokes = 0,
    agents = 0,
    abilities = 0;
  const ids = new Set<string>();
  for (const row of input) {
    if (!record(row) || !identifier(row.id) || ids.has(row.id))
      throw new Error("Invalid object identifier.");
    ids.add(row.id);
    if (row.kind === "stroke") {
      if (
        !type(row.type) ||
        !color(row.color) ||
        !finite(row.width) ||
        row.width <= 0 ||
        row.width > 32 ||
        !Array.isArray(row.points) ||
        !row.points.every(point)
      )
        throw new Error("Invalid drawing.");
      pointCount += row.points.length;
      strokes++;
      objects.push({
        id: row.id,
        kind: "stroke",
        type: row.type,
        color: row.color,
        width: row.width,
        points: row.points.map((point) => ({ x: point.x, y: point.y })),
      });
    } else if (row.kind === "agent") {
      if (
        !identifier(row.agentId) ||
        !point(row.position) ||
        !findAgent(row.agentId)
      )
        throw new Error("Invalid agent.");
      agents++;
      objects.push({
        id: row.id,
        kind: "agent",
        agentId: row.agentId,
        position: { x: row.position.x, y: row.position.y },
      });
    } else if (row.kind === "ability") {
      if (
        !identifier(row.definitionId) ||
        !identifier(row.mode) ||
        !point(row.position) ||
        !finite(row.rotation) ||
        !Array.isArray(row.points) ||
        row.points.length > BOARD_LIMITS.routePoints ||
        !row.points.every(point) ||
        (row.source !== undefined && !point(row.source)) ||
        (row.routes !== undefined &&
          (!Array.isArray(row.routes) ||
            row.routes.length >= BOARD_LIMITS.routes ||
            !row.routes.every(
              (route) =>
                Array.isArray(route) &&
                route.length > 0 &&
                route.length <= BOARD_LIMITS.routePoints &&
                route.every(point),
            ))) ||
        (row.showOwnerRange !== undefined &&
          typeof row.showOwnerRange !== "boolean")
      )
        throw new Error("Invalid ability.");
      const definition = getAbilityDefinition(row.definitionId);
      const object: AbilityInstance = {
        id: row.id,
        kind: "ability",
        definitionId: definition.id,
        mode: row.mode,
        position: { x: row.position.x, y: row.position.y },
        rotation: row.rotation % 360,
        points: row.points.map((point) => ({ x: point.x, y: point.y })),
        ...(point(row.source)
          ? { source: { x: row.source.x, y: row.source.y } }
          : {}),
        ...(row.showOwnerRange === true ? { showOwnerRange: true } : {}),
        ...(Array.isArray(row.routes) && row.routes.length
          ? {
              routes: row.routes.map((route: Point[]) =>
                route.map((point) => ({ x: point.x, y: point.y })),
              ),
            }
          : {}),
      };
      const geometry = modeGeometry(definition, object);
      if (
        object.routes?.length &&
        (geometry.kind !== "path" ||
          object.routes.length >= (geometry.maxRoutes ?? 1))
      )
        throw new Error("This ability cannot have this many routes.");
      const targets =
        definition.modes.find((mode) => mode.id === object.mode)!.targets ?? 1;
      if (
        geometry.kind === "segment" &&
        (object.points.length !== 1 ||
          pathLength([object.position, ...object.points]) <
            (geometry.minLength ?? 0) - 0.00001 ||
          pathLength([object.position, ...object.points]) >
            geometry.maxLength + 0.00001)
      )
        throw new Error("Invalid wire length or endpoints.");
      if (
        geometry.kind !== "path" &&
        geometry.kind !== "segment" &&
        object.points.length > targets - 1
      )
        throw new Error("Invalid number of targets.");
      if (
        geometry.kind === "path" &&
        geometry.maxLength !== undefined &&
        [object.points, ...(object.routes ?? [])].some(
          (route) =>
            pathLength([object.position, ...route]) >
            geometry.maxLength! + 0.00001,
        )
      )
        throw new Error("Ability path exceeds its reach.");
      if (object.source && geometry.kind !== "teleport")
        throw new Error("This ability has no teleport source.");
      if (
        geometry.kind === "teleport" &&
        geometry.maxDistance !== undefined &&
        object.source &&
        Math.hypot(
          object.source.x - object.position.x,
          object.source.y - object.position.y,
        ) >
          geometry.maxDistance + 0.00001
      )
        throw new Error("Teleport exceeds its reach.");
      abilities++;
      objects.push(object);
    } else throw new Error("Unknown board object.");
    if (
      pointCount > BOARD_LIMITS.points ||
      strokes > BOARD_LIMITS.strokes ||
      agents > BOARD_LIMITS.agents ||
      abilities > BOARD_LIMITS.abilities
    )
      throw new Error("Board is too large.");
  }
  return objects;
}

export function loadBoardDocument(
  encoded: string | undefined,
  mapId: string,
): BoardDocumentV2 {
  const empty = emptyBoard(mapId);
  if (!encoded) return empty;
  const parsed = decode(encoded);
  if (!record(parsed)) throw new Error("Invalid board link.");
  if (parsed.version === 2) {
    if (
      parsed.mapId !== mapId ||
      typeof parsed.dataVersion !== "string" ||
      typeof parsed.gameBuild !== "string"
    )
      throw new Error(
        "This board belongs to another map or uses an unsupported format.",
      );
    // Active definitions are authoritative: a saved link never supplies geometry.
    return { ...empty, objects: validateObjects(parsed.objects) };
  }
  return { ...empty, objects: validateObjects(legacy(parsed, mapId)) };
}

export function encodeBoardDocument(document: BoardDocumentV2): string {
  const objects = validateObjects(document.objects);
  const wire = wireDocument(document, objects);
  const header = new TextEncoder().encode(JSON.stringify(wire.header));
  const documentBytes = new Uint8Array(
    6 + header.length + wire.coordinates.length,
  );
  documentBytes.set([0x42, 0x32]);
  new DataView(documentBytes.buffer).setUint32(2, header.length, true);
  documentBytes.set(header, 6);
  documentBytes.set(wire.coordinates, 6 + header.length);
  if (documentBytes.length > MAX_DOCUMENT_BYTES)
    throw new Error("Board is too large.");
  const bytes = gzipSync(documentBytes, { level: 6, mtime: 0 });
  const encoded = base64(bytes);
  if (encoded.length > 24000)
    throw new Error("This drawing is too large to share as a link.");
  return encoded;
}

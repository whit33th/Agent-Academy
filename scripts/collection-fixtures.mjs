// Exercise the renderer against explicit fixtures. Real OAuth and the deployed
// backend are separate acceptance items; these fixtures never grant a session.
export function installCollectionFixtures(context, catalog) {
  let hold = true;
  let emptyFeed = false;
  const queries = new Set();
  const sockets = new Set();
  const rows = Array.from({ length: 120 }, (_, index) => ({
    _id: `qa-lineup-${index}`,
    _creationTime: 120 - index,
    ownerTokenIdentifier: "qa|fixture-owner",
    canEdit: false,
    mapSlug: "ascent",
    agentSlug: "sova",
    title: `${index % 2 ? "DEF" : "ATK"} Setup ${index + 1}`,
    description: "Desktop QA fixture",
    abilityType: "recon",
    metadata: {
      side: index % 2 ? "def" : "atk",
      site: index % 4 < 2 ? "A" : "B",
      abilitySlot: index % 2 ? "Ability1" : "Ability2",
    },
    imageUrl: catalog.maps.ascent.splash,
    isPublic: true,
    createdAt: 120 - index,
    updatedAt: 120 - index,
  }));
  function value(query) {
    if (query.udfPath.endsWith("listPublicFeedPage") && emptyFeed)
      return { page: [], isDone: true, continueCursor: "" };
    if (query.udfPath.endsWith("collectionProgress")) return ["sova"];
    if (query.udfPath.endsWith("listOwnedByMapAgentPage"))
      return { page: [], isDone: true, continueCursor: "" };
    if (query.udfPath.includes("Page")) {
      const sourceRows =
        query.args[0].agentSlug === "chamber"
          ? []
          : query.args[0].agentSlug === "viper"
            ? rows.slice(0, 2).map(({ metadata, ...legacy }) => {
                void metadata;
                return legacy;
              })
            : rows;
      const { cursor, numItems } = query.args[0].paginationOpts;
      const offset = Number(cursor || 0);
      const end = Math.min(sourceRows.length, offset + numItems);
      return {
        page: sourceRows.slice(offset, end),
        isDone: end === sourceRows.length,
        continueCursor: String(end),
      };
    }
    if (query.udfPath.endsWith("current")) return null;
    return [];
  }
  const ready = context.routeWebSocket(
    /wss:\/\/[^/]+\.convex\.cloud\//,
    (socket) => {
      let version = { querySet: 0, identity: 0, ts: "AAAAAAAAAAA=" };
      let tick = 0;
      const subscriptions = new Map();
      const update = (modifications, next = {}) => {
        const bytes = Buffer.alloc(8);
        bytes.writeBigUInt64LE(BigInt(++tick));
        const endVersion = {
          ...version,
          ...next,
          ts: bytes.toString("base64"),
        };
        socket.send(
          JSON.stringify({
            type: "Transition",
            startVersion: version,
            endVersion,
            modifications,
          }),
        );
        version = endVersion;
      };
      const updated = (query) => ({
        type: "QueryUpdated",
        queryId: query.queryId,
        value: value(query),
        logLines: [],
        journal: null,
      });
      const connection = {
        release() {
          update([...subscriptions.values()].map(updated));
        },
      };
      sockets.add(connection);
      socket.onClose(() => sockets.delete(connection));
      socket.onMessage((raw) => {
        const message = JSON.parse(String(raw));
        if (message.type === "Authenticate")
          update([], { identity: message.baseVersion + 1 });
        if (message.type === "ModifyQuerySet") {
          const changes = [];
          for (const query of message.modifications) {
            if (query.type === "Remove") {
              subscriptions.delete(query.queryId);
              changes.push({ type: "QueryRemoved", queryId: query.queryId });
            } else {
              queries.add(query.udfPath);
              subscriptions.set(query.queryId, query);
              if (!hold || !query.udfPath.includes("Page"))
                changes.push(updated(query));
            }
          }
          update(changes, { querySet: message.newVersion });
        }
      });
    },
  );
  return {
    ready,
    queries,
    hold() {
      hold = true;
    },
    setEmptyFeed(value) {
      emptyFeed = value;
      for (const socket of sockets) socket.release();
    },
    release() {
      hold = false;
      for (const socket of sockets) socket.release();
    },
  };
}

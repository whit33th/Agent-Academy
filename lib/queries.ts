export const mapsQuery = `*[_type == "map"] | order(name asc) {
  _id,
  name,
  slug,
  image,
  accentColor
}`;

export const agentsQuery = `*[_type == "agent"] | order(name asc) {
  _id,
  name,
  slug,
  role,
  image,
  accentColor
}`;

export const agentsByMapQuery = `*[_type == "mapAgentMeta" && map._ref == $mapId] | order(viability asc) {
  _id,
  viability,
  notes,
  "agent": agent->{
    _id,
    name,
    slug,
    role,
    image,
    accentColor
  }
}`;

export const screenshotsByMapAndAgentQuery = `*[_type == "screenshot" && map._ref == $mapId && agent._ref == $agentId] | order(abilityType asc, title asc) {
  _id,
  title,
  image,
  abilityType,
  description,
  "map": map->{name},
  "agent": agent->{name}
}`;

/** Returns unique agent refs that have screenshots on a given map. */
export const agentRefsByMapQuery = `*[_type == "screenshot" && map._ref == $mapId].agent._ref`;

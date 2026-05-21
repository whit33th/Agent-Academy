# VALORANT Wiki Ability Sync

`bun run sync:wiki-abilities` fetches selected ability pages from Valorant Wiki through Fandom's MediaWiki API and generates:

- `lib/generated/valorant-wiki-abilities.json`
- `lib/generated/valorant-wiki-abilities.ts`

The script reads the page wikitext and prioritizes rows from tables with the `wikitable` class because Valorant Wiki stores ability stats there.

## Why shape overrides still exist

Wiki tables provide strong numeric data, often with `Game files` confirmation. They do not, however, encode tactical-board geometry (a wall vs. a circle, a cross vs. a single line, etc.).

To keep the data layer simple and avoid duplicate metrics, we split responsibilities:

- `ABILITY_SHAPE_OVERRIDES` only declares `shape` (and optional `coneAngleDeg` for cones), nothing else.
- `VALORANT_WIKI_ABILITY_STATS` is the single source of truth for `radiusM`, `lengthM`, `coneRangeM`, `durationSec`.
- `ABILITY_STATS` is kept only as a last-resort fallback when the Wiki sync has no entry for an ability.

Examples:

- `Aftershock` is a `wall` via shape override; the 35 m max deploy distance comes from the Wiki row.
- `Barrier Mesh` is a `cross` via shape override; the 30 s duration and arm length come from the Wiki row.
- `Boom Bot` is a `cone`; the 25 m frontal cone and 5 s duration come from the Wiki row.

## Updating data

Run:

```bash
bun run sync:wiki-abilities
bun run build
```

The generated JSON includes `rawMatches` so suspicious values can be inspected without opening the Wiki manually.

## Future improvements

- Add all remaining ability pages to the seed list.
- Parse multi-value rows into `innerRadiusM`, `outerRadiusM`, `clusterRadiusM`.
- Preserve confirmed source labels such as `Game files`.
- Add per-ability shape overrides in a separate JSON instead of TypeScript.
- Add CI scheduled job to run the sync weekly and open a PR if generated data changes.

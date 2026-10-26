# Public lineup library

The public library uses the existing Convex deployment and image storage. A lineup can contain up to ten ordered images with captions and a selected cover, a YouTube embed, or both. Other public HTTPS video URLs open at the source; a video-only entry requires YouTube. Videos are never downloaded or hosted. The privacy-enhanced YouTube player loads when lineup details open, with no extra load button. Offline access applies to cached records and viewed images, not external video.

Legacy one-image records remain readable and editable. The old cover fields remain populated for older clients. `lineupImages` stores ordered child records; storage is shared when copying a public lineup. Cleanup checks both legacy cover references and gallery references. Copies retain source attribution but lose all importer identifiers. Updating an import never updates personal copies.

## Review and import

The checked patch and Competitive pool live in `lib/lineups/competitive-pool.ts`; the import policy consumes this shared baseline. Recheck Riot's latest notes and rotation before changing it. Publication requires explicit map, agent, ability, side/site, author, source, compatibility evidence and media usage basis. The administrative review is an operator responsibility: nonempty evidence is not an automated proof that a throw works. Source review and actual gameplay testing are separate fields. Restrictive sources and unlicensed screenshot copies are excluded.

Reviewed manifests contain a stable `batchId` and `records`. Each record supplies `sourceKey`, metadata, instructions, source evidence and media. The CLI calculates the SHA-256 content hash. At most 500 entries per manifest, submitted in bounded groups of twenty. Preview is read-only; publishing is resumable and skips existing source/content keys. There is no recurring paid scrape or automatic publication of scraped/AI-generated data.

```powershell
node scripts/import-public-lineups.mjs data/lineup-import/public-lineups-13.08.json
node scripts/import-public-lineups.mjs data/lineup-import/public-lineups-13.08.json --publish
```

The script is restricted to `dev:scrupulous-barracuda-795`, and rejects deploy-key overrides. It writes review/publish reports to `outputs/lineup-import/`. It never deploys code. Stop and inspect errors instead of retrying credit, credential, source-block or schema failures.

For a strengthened source review, append `--refresh-review` to a publish command. This updates provenance only when both the managed source key and content hash still match; personal copies, instructions, visibility and feed order remain unchanged. Argument batches also respect Windows command-line size limits.

The internal `lineupScrape:start` and `lineupScrape:read` functions expose the existing Firecrawl component to the operator for allowlisted discovery. Returned job IDs can be resumed; errors never trigger an unbounded retry. Ordinary clients cannot start paid scrapes or import content. Rendered browser inspection is also necessary for sources whose static extraction omits details.

`lineupImport:withdrawBatch` sets only managed originals in a named batch private. It does not delete images, personal copies, or user-authored lineups. Re-running import does not automatically republish withdrawn records.

## Acceptance

Backend tests cover gallery ownership, shared-file lifetime, legacy single-image clients, bounded galleries, provenance, private copies, idempotent import/withdrawal, invalid content, and pagination over 505 records. Renderer tests distinguish live public-feed reads from authenticated write fixtures. Check browser and development Electron, narrow windows, keyboard image navigation, captions/cover/order, failed saves, cached images and video embed URLs/CSP. Do not describe fixture writes as a verified real OAuth session.

Content sources and collection limits are documented in `docs/research/public-lineup-sources-2026-10-24.md`; the final publication/QA record is `docs/validation/public-lineup-library.md`.

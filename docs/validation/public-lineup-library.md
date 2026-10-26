# Public lineup library acceptance — 2026-10-26

## Published content

Deployment: **dev:scrupulous-barracuda-795**. No production deployment, installer release, commit or push was performed.

Batch: `public-lineups-13-08-2026-10-24`.

| Map       | Agent     | Published |
| --------- | --------- | --------: |
| Corrode   | Fade      |        26 |
| Corrode   | Brimstone |        17 |
| Corrode   | Killjoy   |         3 |
| **Total** |           |    **46** |

Additional batches published to the same dev feed:

| Map | Agent | Added |
| --- | --- | ---: |
| Bind | Killjoy | 2 |
| Lotus | Killjoy | 3 |
| Summit | Killjoy | 2 |
| Summit | Vyse | 2 |
| Sunset | Vyse | 2 |
| Haven | Vyse | 2 |
| Abyss | Vyse | 1 |
| **Total added** | | **14** |

**Current published total: 60**, covering all seven maps in the reviewed 13.08 Competitive pool. The Killjoy import was safely rerun after adding Summit's missing A/B site catalog entries: five existing records were reported as `exists`, and exactly two Summit records were newly published. Two additional Vyse Summit setups passed preview and were published as a separate batch. Import reports are in `outputs/lineup-import/`.

These are distinct timestamped demonstrations across multiple creator videos. All use external YouTube embeds. **Zero external screenshots or video files were copied to our storage. Zero entries claim independent gameplay testing.** Multiple photos are supported for user uploads, but this imported batch has no licensed photo instructions.

Current pool review: Abyss, Bind, Corrode, Haven, Lotus, Sunset and Summit; Riot patch 13.08. The collection falls short of 500. All maps now have published entries; Neon does not yet have a source-verified record. Other leads remain in `data/lineup-import/pending-review.json`, with reasons. Do not count pending sources as published lineups.

Fade and Brimstone footage was visually spot-checked: both show client version **13.08.00.5627607**, and Fade's Mid landmarks match Riot's updated map images. This corroborates footage version; it does not independently test each cast. Three Killjoy B-side throws were reviewed against actual source stance/aim/landing frames and Riot's changed regions; compatibility is an inference from the relevant unchanged surfaces. The Killjoy A-side throws were withheld because the changed plant zone could not be resolved. Exact alignment for the video-backed records remains demonstrated in the linked original video; descriptions do not invent missing pixel coordinates.

Sources and selection details: `docs/research/public-lineup-sources-2026-10-24.md`. Repeating the first 43-record import produced zero additional records; extending the same manifest added exactly three Killjoy entries. The CLI retains source/content deduplication, bounded batches and resumption after errors. Publication report: `outputs/lineup-import/public-lineups-13-08-2026-10-24-publish.json`.

## Backend and build

- Convex schema/functions deployed successfully to the named dev deployment. New gallery and import indexes confirmed.
- Existing Firecrawl integration exercised against Riot's 13.08 notes: job `j574qq0xm8cn7xzwaxc3aackx18gw2z2` completed; 13,221 Markdown characters, 21 links and 36 image references returned. This discovery job did not publish content or copy those images.
- Full Vitest suite: **33 files, 290 tests passed**. Includes gallery ownership, shared-file deletion, old clients, video-only entries, cache validation, importer rejection/idempotency/withdrawal, and pagination over 505 records. Summit A/B options have a regression check.
- Project and desktop TypeScript checks, full ESLint, desktop compilation and production Next.js build passed. Formatting checked on files changed for this feature.

## Renderer checks

The feed now exposes map and agent filters plus an agent-dependent ability filter. The detail view removes user/compatibility audit copy and the separate video-load button; YouTube loads with the detail, while Close and lineup/image navigation use the application's icon buttons. Summit's two planting sites are covered in the shared feed metadata and regression-tested.

Reproducible command: `node scripts/lineup-gallery-qa.mjs` with the local application running at `http://127.0.0.1:3000`. Uses an isolated temporary Electron profile.

Browser at 1440 and 390 pixels and development Electron passed: real guest reads from the dev public feed, map-art video covers, source metadata, guest write refusal, detailed viewing, YouTube player rendering and Escape. Electron's actual response policy permits the privacy-enhanced YouTube frame origin.

Explicit SDK/action fixtures exercise the actual components for create/copy/edit/delete, photo captions, cover selection, ordering, keyboard image navigation independent of lineup navigation, invalid-file rejection, locally supplied images while offline, and retained form state after a simulated save failure. Eighteen screenshots were captured; wide, narrow and Electron filtered views and the Summit detail were visually reviewed. Assertions passed, including both Summit/Vyse/Shear records in all three runtimes. The external YouTube player rendered but emitted provider-side `writeEmbed is not defined` and network errors during this run, so playback is not claimed.

Evidence: `outputs/lineup-gallery-qa/report.json` and adjacent PNGs. These checks do **not** establish a real signed-in OAuth upload session, installed-client upgrade, physical gameplay correctness, actual video playback, or a full desktop-cache replay after restart. The embedded player was visually rendered with its native Play control; source links remain available if the provider later blocks an embed.

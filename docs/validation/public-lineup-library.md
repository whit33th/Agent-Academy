# Public lineup library acceptance — 2026-10-26

## Published content

Content deployment: **dev:scrupulous-barracuda-795**. The original content acceptance stage did not include a client release. The subsequently requested Windows update is documented in `docs/releases/0.7.4.md`.

Batch: `public-lineups-13-08-2026-10-24`.

| Map       | Agent     | Published |
| --------- | --------- | --------: |
| Corrode   | Fade      |        26 |
| Corrode   | Brimstone |        17 |
| Corrode   | Killjoy   |         3 |
| **Total** |           |    **46** |

Additional batches published to the same dev feed:

| Map             | Agent   |  Added |
| --------------- | ------- | -----: |
| Bind            | Killjoy |      2 |
| Lotus           | Killjoy |      3 |
| Summit          | Killjoy |      2 |
| Summit          | Vyse    |      2 |
| Sunset          | Vyse    |      2 |
| Haven           | Vyse    |      2 |
| Abyss           | Vyse    |      1 |
| **Total added** |         | **14** |

**Initial acceptance snapshot: 60 published records.** The Killjoy import was safely rerun after adding Summit's missing A/B site catalog entries: five existing records were reported as `exists`, and exactly two Summit records were newly published. Two additional Vyse Summit setups passed preview and were published as a separate batch. Import reports are in `outputs/lineup-import/`.

These are distinct timestamped demonstrations across multiple creator videos. All use external YouTube embeds. **Zero external screenshots or video files were copied to our storage. Zero entries claim independent gameplay testing.** Multiple photos are supported for user uploads, but this imported batch has no licensed photo instructions.

Current pool review: Abyss, Bind, Corrode, Haven, Lotus, Sunset and Summit; Riot patch 13.08. The following live dev-feed snapshot supersedes the initial 60-record total and the older Neon coverage note. Pending sources remain in `data/lineup-import/pending-review.json` and are not counted as published lineups.

### Live dev-feed snapshot — 2026-10-26

The current deployment contains **279 public records**: **278** on the seven-map Competitive pool and one older record on Split. Map totals on the active pool are Abyss 34, Bind 35, Corrode 53, Haven 54, Lotus 45, Summit 31 and Sunset 26. The total is below the 500-record goal.

| Map     | Killjoy | Neon | Vyse |
| ------- | ------: | ---: | ---: |
| Abyss   |       6 |    0 |    3 |
| Bind    |      11 |    6 |    2 |
| Corrode |       4 |    0 |    1 |
| Haven   |      15 |   13 |    8 |
| Lotus   |      11 |   10 |    3 |
| Summit  |       4 |    0 |    5 |
| Sunset  |       7 |    0 |    4 |

The live snapshot was queried from `dev:scrupulous-barracuda-795` after the October 26 imports. Recent additions include Killjoy A Backside and Bridge post-plant Nanoswarms on Abyss, an A Long-to-A Site rat-cubby Nanoswarm on Haven, an Abyss B Site Spike-corner Nanoswarm, and a Summit B Main-to-B Site throw. Each links to its original Tracker guide and was visually checked in the source clip; patch compatibility is inferred from unchanged local geometry and none is marked as tested in game. Reports: `outputs/lineup-import/public-lineups-killjoy-abyss-a-bridge-mollys-tracker-2026-10-26-publish.json`, `outputs/lineup-import/public-lineups-killjoy-haven-a-rat-cubby-tracker-2026-10-26-publish.json`, `outputs/lineup-import/public-lineups-killjoy-abyss-b-postplant-tracker-2026-10-26-publish.json`, and `outputs/lineup-import/public-lineups-killjoy-summit-b-main-tracker-2026-10-26-publish.json`. The earlier Corrode B Box entry remains documented in `outputs/lineup-import/public-lineups-killjoy-corrode-b-box-tracker-2026-10-26-publish.json`.

Four additional Fade Haunt entries on Abyss were published from Sk1p#666's October 4 Tracker clips: A Main to A Site, B Nest to B Site (explicitly excluding Lane), a B Site counterscan from wooden cover, and a B Main scan from the two-height cover notch. Each original clip was inspected at its stance, release and scan/result frames. Source footage shows client 13.06; applicability to 13.08 is inferred from the unchanged relevant Abyss surfaces and Haunt trajectory. None is independently game-tested. All four passed preview, publication and actual playback checks in Chrome and Electron. Publication report: `outputs/lineup-import/public-lineups-fade-abyss-tracker-2026-10-26-publish.json`.

Fade and Brimstone footage was visually spot-checked: both show client version **13.08.00.5627607**, and Fade's Mid landmarks match Riot's updated map images. This corroborates footage version; it does not independently test each cast. Three Killjoy B-side throws were reviewed against actual source stance/aim/landing frames and Riot's changed regions; compatibility is an inference from the relevant unchanged surfaces. The Killjoy A-side throws were withheld because the changed plant zone could not be resolved. Exact alignment for the video-backed records remains demonstrated in the linked original video; descriptions do not invent missing pixel coordinates.

Sources and selection details: `docs/research/public-lineup-sources-2026-10-24.md`. Repeating the first 43-record import produced zero additional records; extending the same manifest added exactly three Killjoy entries. The CLI retains source/content deduplication, bounded batches and resumption after errors. Publication report: `outputs/lineup-import/public-lineups-13-08-2026-10-24-publish.json`.

## Backend and build

- Convex schema/functions deployed successfully to the named dev deployment. New gallery and import indexes confirmed.
- Existing Firecrawl integration exercised against Riot's 13.08 notes: job `j574qq0xm8cn7xzwaxc3aackx18gw2z2` completed; 13,221 Markdown characters, 21 links and 36 image references returned. This discovery job did not publish content or copy those images.
- Full Vitest suite: **34 files, 294 tests passed**. Includes gallery ownership, shared-file deletion, old clients, video-only entries, cache validation, importer rejection/idempotency/withdrawal, Tracker player repair/legacy-copy lookup, desktop player permissions, and pagination over 505 records. Summit A/B options have a regression check.
- Project and desktop TypeScript checks, full ESLint, desktop compilation and production Next.js build passed. Formatting checked on files changed for this feature.

## Renderer checks

The feed now exposes map and agent filters plus an agent-dependent ability filter. The detail view removes user/compatibility audit copy and the separate video-load button; YouTube loads with the detail, while Close and lineup/image navigation use the application's icon buttons. The detail header shows the same map splash artwork used by the home map cards alongside the agent portrait. Summit's two planting sites are covered in the shared feed metadata and regression-tested.

### Tracker playback correction — October 26

The empty Tracker modal was caused by the renderer only creating YouTube frames. The original Stream iframe was inspected on each of the 18 distinct source pages for the existing 19 Tracker entries. Its URL is now stored in optional source metadata, validated against the original Tracker clip and an exact Stream-host allowlist. An internal bounded repair updated all 19 managed originals without changing descriptions, order or personal copies. A bounded public lookup lets older copies resolve a published original's player; new copies preserve the player metadata. Source/content deduplication remains in place.

The current feed has **23 Tracker entries with verified player URLs** after the four Fade additions. All 23 were opened through the real public feed in Chrome and development Electron: each video decoded, advanced in time and began muted. A YouTube chapter also played at its requested timestamp in both runtimes. Pause/resume, sound controls, next-lineup reset, close/reopen, Electron fullscreen and native Escape, Chrome at 390 pixels, Electron at 800 pixels, and offline/reconnect passed. Unknown external guide pages now have a visible original link and an `External guide` cover label. Video appears above the description.

The corrected map artwork was asserted against the home catalog splash URL in both runtimes and visually reviewed in narrow Chrome and Electron screenshots. No clipping or overlap was found in the player/header; smaller Electron windows scroll to the description/navigation.

Evidence: `outputs/lineup-video-qa/report.json` (40 playback cases) and `outputs/lineup-video-qa/fade-abyss/report.json` (10 additional cases), with adjacent screenshots. The two reports cover repeated runtime cases, not 50 distinct videos. `node scripts/lineup-video-qa.mjs` reproduces the initial 19-entry check; `QA_TRACKER_MANIFEST` and `QA_OUTPUT_DIR` select another reviewed batch. The checks use a separate guest profile and native keyboard input for the Electron shell's Escape handler. Installed-client upgrade and gameplay correctness remain outside these playback checks. The older YouTube playback limitation below describes the earlier acceptance run and is superseded by these successful playback cases.

Reproducible command: `node scripts/lineup-gallery-qa.mjs` with the local application running at `http://127.0.0.1:3000`. Uses an isolated temporary Electron profile.

Browser at 1440 and 390 pixels and development Electron passed: real guest reads from the dev public feed, map-art video covers, source metadata, guest write refusal, detailed viewing, YouTube player rendering and Escape. Electron's actual response policy permits the privacy-enhanced YouTube frame origin.

Explicit SDK/action fixtures exercise the actual components for create/copy/edit/delete, photo captions, cover selection, ordering, keyboard image navigation independent of lineup navigation, invalid-file rejection, locally supplied images while offline, and retained form state after a simulated save failure. Eighteen screenshots were captured; wide, narrow and Electron filtered views and the Summit detail were visually reviewed. Assertions passed, including both Summit/Vyse/Shear records in all three runtimes. The external YouTube player rendered but emitted provider-side `writeEmbed is not defined` and network errors during this run, so playback is not claimed.

Evidence: `outputs/lineup-gallery-qa/report.json` and adjacent PNGs. These checks do **not** establish a real signed-in OAuth upload session, installed-client upgrade, physical gameplay correctness, actual video playback, or a full desktop-cache replay after restart. The embedded player was visually rendered with its native Play control; source links remain available if the provider later blocks an embed.

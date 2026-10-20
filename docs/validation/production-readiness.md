# Desktop release acceptance

Target: Windows x64, Electron with bundled Next.js. The desktop installer is the release artifact. Web deployment is not part of this work.

This is the 0.4.0 architecture baseline. See the [0.5.0 acceptance record](type-safety-0.5.md) for subsequent classification changes, current test counts and the newer preview artifact.

## Required evidence

| Area          | Functional check                                     | Visual or failure check                                          |
| ------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Catalog       | Home → map → agent; direct route; Back               | Cold offline start, local images, no catalog skeleton            |
| Collection    | Hide/restore map and agent, change viability         | No duplicates, rollback on failure, account isolation            |
| Lineups       | Create/edit/delete, publish/unpublish, copy public   | Validation, upload failure, pagination, live updates             |
| Offline cache | Reopen previously read rows and images               | Offline marker, bounded eviction, logout purge                   |
| Auth          | Google → callback → Convex → restart → logout        | Cancel, timeout, expired session, different account              |
| Board         | Draw, undo, erase, place agents/abilities, share     | Invalid shared state, keyboard and pointer interactions          |
| UI            | Filters, favorites, lightbox, shortcuts, tour, audio | 800×640, 900×900, 1440×900, maximized; 100/125/150% DPI          |
| Runtime       | Tray, restore, window buttons, explicit quit         | Occupied port, server failure, corrupt cache                     |
| Game          | Queue, cancel, pregame, lock, match, menu, restart   | Late attach, unknown map, missing/replaced log, stale events     |
| Distribution  | Build, unpacked app, installer, upgrade              | No credentials, isolated renderer, signing and production config |

Capture loaded and loading screenshots separately. Compare card bounds and reserved text/control regions. Record cold/warm startup and route/board timings on the same machine. A successful build does not establish real OAuth, live-game behavior, signed distribution, or visual parity.

## Initial baseline

- Next.js production build: passed before changes.
- Unit/backend tests: 13 passed before changes.
- App and desktop typechecks: passed before changes.
- Lint: one error in auth provider composition and four warnings before changes.
- Real OAuth, live match, signed installer: not yet verified.

## Dependency policy

Use stable releases with compatible peers and a single npm lockfile. `electron-store` stays on 8.2.0 because the current `@clerk/electron` storage adapter explicitly requires `^8.2.0`; upgrading it to 12 would violate that contract. ESLint stays on the latest 9.x release because Next's import plugin does not support ESLint 10. TypeScript stays on 6.0.3 because the current typescript-eslint peer range excludes 7. Build-time Node uses the supported Node 24 line and its corresponding types.

## Implementation and automated evidence

- Next.js 16.4.2, React/React DOM 19.3.1 and Electron 44.9.0; compatible related packages are locked in `package-lock.json`. No forced peer resolution or prerelease packages were used. `npm ci --dry-run --ignore-scripts --strict-peer-deps` passes; this checks lockfile consistency, not a clean-machine installation.
- App/desktop typechecks, zero-warning lint, formatting and Knip pass. The unit/backend suite has 27 passing tests in 10 files, including ownership, pagination beyond 200 rows, duplicate-copy prevention, roster visibility, catalog resources, malformed board payloads, server failures and offline cache/session contracts.
- The desktop build generates 596 route variants, including map/agent shells. Packaging scans the staged runtime for environment files, private keys and known server credentials.
- The bundled snapshot contains 19 maps, 29 agents and 246 prepared images. Catalog routes, fonts, voices and board resources are local. Catalog fetching runs only through the maintenance command. Unused alternative portraits and map artwork were removed from the snapshot and package.
- Native startup reads the installed Next.js runtime directly. Runtime ISR/image disk writes are disabled; build-time prerendering and the bounded Next.js memory cache remain enabled. No first-run server copy is needed.
- Collection reads use paginated Convex subscriptions. Writes check connection/authentication, server-side ownership remains authoritative, failed forms retain their inputs, and uploads use authenticated Convex storage. Existing Sanity image URLs remain supported without packaging a server token.
- The 512 MiB native cache stores records and viewed images with LRU eviction. Private entries use Windows-backed encryption, verified account scopes and logout purging. Expired/unverifiable sessions lock private reads. Failed network requests are not saved as empty successful responses.

The changes in `convex/` were tested locally and have **not** been deployed. A preview using an older backend is not evidence that the new production contracts are deployed.

## Packaged renderer checks

The full fixture run passed at content sizes 800×640, 900×900 and 1440×900, plus maximized windows, with Electron device scale factors 1, 1.25 and 1.5. This exercises Electron's renderer scaling; Windows display settings were not changed globally. Screenshots were inspected for clipping and overflow. Skeleton and loaded card bounds match within one CSS pixel. Next.js Activity preserves hidden route DOM, so assertions target the visible page.

Verified flows include catalog navigation, board drawing/resize/undo/Escape, native share clipboard and callback routing, side filtering, lightbox arrows, favorites, shortcut focus, rejected guest writes with preserved form inputs, pagination to 120 rows, Feed pagination, persistent public cache, ambient settings, maximizing and close-to-tray. The renderer has context isolation and sandboxing enabled, no Node access, and the OS encryption probe succeeds. The fixture run recorded no uncaught page errors.

External-network fault injection passed for a fresh-profile catalog/board and a restarted profile with 96 saved Feed records. These Feed records use fixtures and local images; remote image persistence, failed-download retry and account/session isolation are covered by separate cache tests. This does not establish private offline access with a real restored Clerk session.

Evidence: `outputs/desktop-qa/results.json`, PNGs and runtime logs under `outputs/desktop-qa/`. The smoke test also explicitly attempts exit during initial page loading; startup cancellation is ignored during shutdown rather than opening a blocking error dialog. Success is written only after clean process termination.

## Startup measurements

Before the architecture change, the idle fresh-profile sample took 10.79 s to show the home heading/link; the warm sample took 3.89 s. The first baseline overlapped a build and is excluded. After removing the first-run runtime copy, two fresh-profile samples took 3.72–4.17 s. Warm samples varied between 3.76 and 5.05 s, so no consistent warm-start speedup is claimed. Map navigation in the same procedure changed from 5.01 s cold / 2.72 s warm to 2.01–2.18 s.

These are small samples on this machine using Playwright's hidden Electron window, not a startup SLA. Real-game load and OS caching can affect the numbers. Visible-window board opening in the final renderer matrix took 0.52–0.61 s; hidden-window board numbers are throttled and are not compared with those values. Raw measurements are in `outputs/performance-before.json` and `outputs/performance-after.json`.

## Preview artifact

The final unsigned preview is `release/preview-0.4.0-final/Agent-Academy-Setup-0.4.0.exe` (197,497,554 bytes). Authenticode reports `NotSigned`. SHA-256: `3D87A4846C7BB34A8AA98BCD684494FE63B6AA3E5ED967129F29787D7A3FEC11`.

The installer was extracted into an isolated QA directory. Its application archive hash and Next.js build ID match the final unpacked build. That extracted application passed the packaged-app smoke check, including renderer isolation, close-to-tray and clean early exit. The final full renderer matrix also passed against `release/preview-0.4.0-final/win-unpacked/Agent Academy.exe`. Evidence is stored in `outputs/release-evidence.json`, `outputs/desktop-smoke.json` and `outputs/smoke-runtime.log`.

Extraction and smoke testing do not register the installer with Windows. Actual NSIS installation, upgrades, registered protocol callbacks and production Google authentication remain the manual gates below. Build instructions are in the root README; publishing is disabled in all packaging commands.

## Dependency audit

`npm audit --omit=dev` reports zero vulnerabilities. The full development-tool audit reports 13 affected package entries (five high, eight moderate), rooted in `braces` and `sprintf-js` through the Next.js lint tools and Electron packaging tools. The available audit suggestions downgrade Next's lint configuration to 14.x or replace the builder; they were not forced into this application. Review upstream fixes before the signed release. The full local report is `outputs/dependency-audit.json`.

## Remaining release gates

1. Configure production Clerk and Convex, including native Google callback/origins and the Convex JWT issuer; deploy the matching schema/functions through an explicitly approved release process.
2. Supply the Windows signing certificate, build the production channel and verify Authenticode signatures. The release command currently fails closed at the development-service configuration check; no production release was produced.
3. Complete real Google sign-in/cancel/timeout, restart, token expiry, logout and account-switch tests from the installed production application. Fixture queries and locally signed unit-test tokens do not satisfy these checks.
4. Complete live VALORANT queue/pregame/agent-lock/match/menu/restart transitions. Recorded-log detector tests pass, but a live match was not controlled during this run.
5. Complete signed installation/upgrade testing, including preservation of existing user data and Windows autostart registration. A passing unpacked-app test does not establish these installation flows.

No backend deployment, publication, commit or push is included in this delivery.

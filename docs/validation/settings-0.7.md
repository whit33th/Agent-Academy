# Settings and updates — 0.7.0 preview

This record extends [0.6.0 UI acceptance](ui-0.6.md). The earlier production readiness record remains a historical baseline; the development backend status below supersedes its statement that no backend has been deployed.

## Changes

- Home preserves an empty grey Back square, so navigation does not shift between routes.
- The gear opens Settings for music, interface sounds, voice volume, background video, Windows startup, close-to-tray and updates. Explicit Save applies changes; closing a dirty draft uses a custom discard confirmation. Music and video default on. Disabling video releases playback.
- Settings use Convex account preferences with separate validated local account snapshots and guest settings. Identity and avatar remain in Clerk. Unavailable account synchronization shows an error/retry state without breaking the catalog or board.
- Map hiding, agent hiding and lineup deletion use application dialogs with pending/error states. No browser confirm/alert remains in application components.
- Empty Public Feed fills and centers within the remaining page area, with a neutral illustration and collection link. The redundant page Back action is removed.
- Full NSIS packaging includes the GitHub update source, updater metadata and blockmap. Checks, downloads and confirmed installation are separate actions. No release is treated differently from an up-to-date result.

## Backend

On 2026-10-20 the user explicitly approved deploying all current backend changes to personal development deployment `dev:scrupulous-barracuda-795`. `convex dev --once` completed successfully and a fresh function specification confirms `users:getPreferences` and `users:setPreferences`. Production was not deployed. No existing collection was seeded, deleted or re-imported. Account sync with a real restored Clerk session still requires authenticated manual acceptance.

The deployment exposed a Next-specific type dependency in the shared viability module. Sorting now accepts its minimal structural fields, allowing the Convex TypeScript project to validate independently.

## Verification

The suite passes 37 tests across 16 files, including authenticated preferences isolation and partial updates, invalid volume rejection, corrupted/separate local settings, native flag rollback, explicit update state transitions, retry and missing-release behavior. Application, desktop and Convex typechecks, lint, unused-code and formatting checks pass. A strict-peer lockfile install dry run passes.

The packaged renderer harness exercises real switches, keyboard volume changes, Save/reload persistence, discard/cancel, restoring defaults, native hide confirmations, stable header geometry and centered empty Feed. Cloud collection responses are explicit fixtures; they do not authenticate a real user. The existing account profile test uses the production components with an explicit Clerk substitute. Windows startup flags are preserved during UI QA; OS registration changes are covered with a mock adapter.

The complete packaged renderer matrix passed at 800×640, 900×900, 1440×900 and maximized with Electron device scales 1, 1.25 and 1.5. Fresh offline catalog/board use and reopening 96 saved public Feed fixtures passed. The real GitHub check reported no published Windows release. Native smoke checks passed for sandbox/isolation, default close-to-tray, clean early quit and actual window destruction/process exit when close-to-tray is disabled. The harness uses Playwright's supported close method to detach its Node inspector; leaving that inspector attached can hold an otherwise quitting process open.

The installer archive, updater configuration and Next.js build ID were extracted and compared with the tested unpacked payload; all match. The `latest.yml` SHA-512 matches the installer. Evidence is under ignored `outputs/settings-0.7.0-qa/` and `outputs/settings-0.7.0-release-evidence.json`. See [update and settings operations](../desktop-updates.md) for the release process and differential download limitations.

## Artifact

The NSIS preview is `release/settings-0.7.0-preview/Agent-Academy-Setup-0.7.0.exe`, 198,011,891 bytes. An identical copy is on the user's resolved Windows Desktop. SHA-256: `4541D23ECD3BDE9E1930223D73D5471B15DC63EA0F416A44D3E489A4856CC0E6`. Authenticode reports `NotSigned`. Its `.exe.blockmap` and `latest.yml` remain alongside the project installer for future release publishing. No NSIS installation was registered by these checks.

## Remaining client release conditions

Production service configuration, a Windows signing certificate, real Clerk Google sign-in/profile/account-switch checks, live-game transitions and actual signed installation/upgrade acceptance remain open. The GitHub repository currently has no release assets. No release, commit or push was created. The delivered installer is a development preview using the approved development backend.

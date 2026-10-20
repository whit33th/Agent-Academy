# Agent Academy Desktop

Windows x64 application for VALORANT maps, agent setups and a tactical board. Electron runs a bundled local Next.js server; no Node.js, Bun or helper installation is required on the user's computer. A hosted website is not a release target.

## Development

Use Node.js 24 and npm. Install the locked dependencies with `npm ci`.

Create `.env.local` with the public configuration:

```dotenv
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-publishable-key
```

`NEXT_PUBLIC_SANITY_PROJECT_ID` may be retained for validation of existing Sanity image references. New images are stored in Convex. Never put a server credential into a `NEXT_PUBLIC_` variable or into the desktop package.

Run `npm run desktop:dev`. The development server uses `127.0.0.1:3000`; the packaged application uses `127.0.0.1:37491`. Configure the native Clerk integration, the corresponding allowed origins, the `agent-academy` callback scheme, and the Convex JWT issuer separately for each environment. See [Clerk's Electron documentation](https://clerk.com/docs/electron/getting-started/quickstart).

## Architecture

- `app`: thin Next.js route shells and metadata; known map and agent routes are prerendered.
- `lib/catalog`: synchronous access to the versioned, bundled catalog. Opening a route does not request Valorant API data.
- `lib/collection` and `components/collection`: reactive collection access, persistence, operation results and cloud-specific loading/error states.
- `components/tactical-board`: board state, geometry, bounded shared-link decoding and presentation.
- `convex`: authenticated collections, pagination, upload ownership and image storage. Existing public endpoints and legacy image fields remain for compatibility with earlier installed versions.
- `desktop/src`: window/tray lifecycle, restricted IPC, local server, confirmed game-log events and the encrypted disk cache.

The cache holds up to 512 MiB of saved collection records and viewed images. Private entries are encrypted with Windows-backed Electron `safeStorage`, partitioned by a verified Clerk subject and cleared on logout. Private disk reads require a currently valid, signed Convex JWT. If a session cannot be safely restored offline, private data stays locked. Offline changes are not queued.

## Catalog maintenance

`npm run sync:catalog` downloads and validates the Valorant catalog, prepares local WebP images and replaces the snapshot after successful completion. The application uses that snapshot until its next installed release. A normal build works from the committed snapshot without contacting Valorant API.

`npm run sync:maps` refreshes board coordinate metadata. `npm run sync:wiki-abilities` refreshes the attributed ability measurements. `npm run sync:wallpapers` maintains the optional locally sourced wallpaper collection. Review and test generated changes before releasing; generated files are not edited by hand.

## Validation

```sh
npm run typecheck
npm run desktop:typecheck
npm run lint
npm test
npm run check:unused
npm run format:check
npm run desktop:build
npm run desktop:package:dir
npm run desktop:smoke
npm run desktop:qa
```

The Electron QA script uses an isolated profile and an explicit fixture backend to verify renderer behavior, pagination, failure states and geometry at three window sizes and three device scales. Its results do not establish real Google sign-in, deployed backend compatibility or live-game detection. Screenshots and measurements are saved under ignored `outputs/`. See the [0.5.0 metadata acceptance](docs/validation/type-safety-0.5.md) and [0.6.0 collection/UI acceptance](docs/validation/ui-0.6.md).

## Packaging and release

`npm run desktop:build` stages a preview runtime and checks it for environment files, private keys and known server credentials. `npm run desktop:package:win` creates the Windows installer under `release/`.

`npm run desktop:release` requires a live Clerk key, a matching `CONVEX_DEPLOYMENT=prod:…` and public Convex URL, and a signing certificate configured through `CSC_LINK` or `WIN_CSC_LINK`. It does not deploy the backend or publish the installer. Confirm the resulting Authenticode signature before client distribution.

Before distributing this client, deploy the matching Convex schema/functions through your approved release process. The paginated queries, upload cleanup, optional roster visibility and explicit lineup metadata fields must exist. Existing data does not need to be deleted or re-imported; records without metadata stay unclassified until their owner edits them. See [the lineup metadata contract](docs/lineup-metadata.md). Google OAuth, live-match transitions, signed installation and upgrade preservation remain mandatory manual release checks; see [the acceptance record](docs/validation/production-readiness.md).

Supported compatibility exceptions are documented there. Historical detection research remains under `docs/research`; it is evidence, not the active detector specification.

Settings, account synchronization and in-app Windows updates are described in [desktop updates](docs/desktop-updates.md), with the current development deployment and verification scope in [0.7.0 acceptance](docs/validation/settings-0.7.md). Full NSIS packaging is required to include updater configuration; the directory-only package is intended for development checks.

The packaged wheel-scroll regression and its reproduction are documented in [0.7.1 scroll acceptance](docs/validation/scroll-0.7.1.md). Run `npm run desktop:qa:scroll -- "path/to/Agent Academy.exe"` after changing page sizing, smooth scrolling or scroll locks.

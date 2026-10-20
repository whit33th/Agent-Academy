# Type safety acceptance — 0.5.0 preview

This record supplements the [0.4 architecture acceptance](production-readiness.md). It covers explicit lineup classification and the packaged 0.5.0 client. No backend deployment or cloud data migration was performed.

## Behavior

Side, map site and exact agent ability are separate typed properties shared by forms, filters, cache validation and Convex validators. Titles and notes remain free text and never determine classification. The server rejects sites absent from the selected map and ability slots absent from the selected agent. See [the metadata contract](../lineup-metadata.md).

New setups require explicit choices. Existing setups without metadata stay unclassified, remain visible through dedicated filters and can be edited without inventing missing details. Edits and public copies preserve explicit metadata. Side, site, ability and favorites combine, and Clear filters resets them together. Filters cover loaded pages; the UI explains this when further pages are available.

## Verification

- 29 tests in 11 files pass, including backend ownership, metadata validation, legacy compatibility, contradictory titles, copy/edit preservation, combined filters and malformed cached records.
- Application and desktop typechecks, zero-warning lint, formatting and Knip pass. The strict-peer lockfile dry run passes.
- The standalone desktop build passes and generates 596 route variants. Packaging completes with a credential scan of the staged runtime.
- The packaged Electron fixture run passes at 800×640, 900×900, 1440×900 and maximized, using device scale factors 1, 1.25 and 1.5. Global Windows display settings were not changed. Screenshots of the new editor and loaded/legacy cards were inspected.
- Form choices, absence of C Site on Ascent, combined filters, reset, legacy filters, retained inputs after a rejected guest write and skeleton geometry pass in the renderer. Existing board, pagination, Feed, favorites, shortcuts, audio, tray and isolated-renderer checks also pass. No uncaught page errors were recorded.
- Fresh-profile offline catalog/board and reopened saved public Feed checks pass. Real private-session restoration remains a separate release check.
- Packaged startup, sandboxing, renderer isolation, close-to-tray and clean exit during initial loading pass.

Versioned screenshots, runtime logs and results are in `outputs/type-safety-0.5.0-qa/`. Installer evidence is in `outputs/type-safety-release-evidence.json`. These are local ignored artifacts.

## Preview artifact and release conditions

Installer: `release/type-safety-0.5.0-preview/Agent-Academy-Setup-0.5.0.exe`, 197,657,957 bytes. Authenticode: `NotSigned`. SHA-256: `5625B2A34840001F0082F0FCB6120E56C079443951B56FEA6DFB920C13D80FD8`.

Deploy the matching Convex schema/functions through the approved release process before distributing this client. The additive metadata field does not require deleting or re-importing existing rows. The native renderer checks use fixtures and do not prove deployed-backend compatibility or successful authenticated uploads.

Production configuration, signing, real Google sign-in, authenticated create/edit flows, live-match transitions, actual Windows installation and upgrade preservation remain release conditions. The executable was checked from the unpacked package; no NSIS installation or user-registry modification was performed in this pass. No production-readiness claim is made from fixture checks alone.

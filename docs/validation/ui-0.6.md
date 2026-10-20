# Collection and desktop UI — 0.6.0 preview

This record supplements the [0.5.0 metadata acceptance](type-safety-0.5.md). Changes in this pass are local client/UI changes; no backend deployment or account data modification is part of the implementation.

## Behavior

- Missing map preferences and roster rows mean no selection. Only explicitly added maps/agents appear in the collection. Existing explicit selections and legacy hidden-agent flags remain supported; existing setups are not deleted.
- Guests can add/hide maps and agents without an account or network connection. Their selection is stored as versioned, validated local preferences. Signed-in users use their separate Convex collection; guest preferences are not automatically imported into an account or queued for upload.
- Add Map and Add Agent disappear when every relevant catalog entry is selected. The Add Map card, normal map cards and map-picker cards share frame and artwork components.
- Empty setups use neutral text, with the existing Add Setup action above the content. The repeated portrait, Voice Line button and central add action are removed. The redundant Showing N of N setups text is removed.
- All application-owned select fields use a shared styled Radix Select with typed options, keyboard navigation, scrolling, collision handling and focus return. Its portal stays inside the native dialog top layer when used in a modal; Escape closes the menu first.
- Home and Feed are distinct navigation tabs with icons and active backgrounds. Back is an icon with an accessible label. The tactical board occupies the content below the native title bar so window controls remain available.
- Account details and photos come from Clerk. Name changes use the current user's `update`, and image changes/removal use `setProfileImage`. The UI validates image format/size, disables overlapping saves, retains failed edits and displays errors and saved status. No separate profile image store is introduced.
- Onboarding now describes explicit side and ability selection rather than title keywords.

## Verification scope

The unit/backend suite has 32 passing tests in 13 files. Added coverage verifies empty defaults, explicit preferences, account isolation, hide/restore compatibility, guest persistence/deduplication/map scoping, damaged preference recovery and binding profile changes to the current Clerk user. Application and desktop typechecks, lint, formatting and unused-code checks are run alongside the standalone desktop build.

`scripts/desktop-qa.mjs` exercises the packaged renderer at 800×640, 900×900, 1440×900 and maximized, with device scale factors 1, 1.25 and 1.5. It includes actual picker interactions, exhausted-picker states, reload persistence, custom select mouse/keyboard interaction, a neutral Chamber empty state, the visible native title bar during board use and the existing collection/board/cache flows. Windows global display settings are not changed.

`scripts/account-profile-qa.mjs` renders the production account components with an explicit SDK substitute and the application's CSS/fonts. It tests display, failed/retained edits, successful saves, invalid and valid image choices, image removal and logout. It does not grant a session or change a real Clerk account. The separate session test verifies the real SDK method bindings. Successful real Clerk profile uploads and Google sign-in remain manual authenticated acceptance items.

The complete packaged renderer matrix passed, including a fresh offline selection/catalog/board and reopening 96 saved public Feed fixtures offline. Packaged startup, isolated renderer, close-to-tray and clean exit during loading also passed. Versioned screenshots, runtime logs, results and smoke evidence are in `outputs/ui-0.6.0-qa/`; installer evidence is in `outputs/ui-0.6.0-release-evidence.json`. These are local ignored artifacts.

The production configuration, signed distribution, real OAuth/live match and installation/upgrade conditions in the earlier acceptance records remain applicable.

## Preview artifact

Installer: `release/ui-0.6.0-preview/Agent-Academy-Setup-0.6.0.exe`, 197,882,817 bytes. Authenticode: `NotSigned`. SHA-256: `0E0BAC0AA3D44A97CB8C42685B96E244030C5A4770ACC00C071ED0DE95071581`.

Packaging used the standalone runtime from the successful 596-route desktop build. The executable is tested from the unpacked package; this pass does not register an NSIS installation or modify a real Clerk profile.

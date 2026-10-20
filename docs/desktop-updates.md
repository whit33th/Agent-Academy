# Windows updates and settings

The title bar opens a single Settings dialog. Music and video default to enabled; music/effects volume defaults to 40% and voice lines to 10%. Windows startup defaults to disabled and closing the window defaults to the tray. Existing explicit device audio preferences are retained.

Preferences belong to Convex users, not Clerk metadata. Clerk owns identity and profile images. Authenticated reads derive the user from the verified session; updates merge only the supplied fields and validate volume bounds. Device snapshots are versioned, validated and separated by account. Guests have their own local settings. Account changes require a connected, loaded session and an explicit Save; there is no offline mutation queue. Failed saves retain the draft and attempt to restore changed Windows flags. Remote settings are applied to the current Windows device; OS failures are shown in Settings.

The installer uses NSIS and `electron-updater`. Its public update source is [whit33th/Agent-Academy](https://github.com/whit33th/Agent-Academy). No repository token is bundled. Checks, downloads and installation are explicit user actions. A downloaded update is installed only after confirmation; quitting normally does not install it. Missing releases, network errors and an up-to-date application have distinct states.

## Building and publishing a future version

1. Update both root and desktop package versions and the lockfile. Prepare matching backend changes through the approved deployment process.
2. Configure production Clerk/Convex and a Windows signing certificate. Run the checks in README, then `npm run desktop:release`. This creates a full NSIS installer, updater metadata and blockmap without publishing anything.
3. Verify Authenticode and test installation over the previous installed version with retained settings, collections, callbacks and startup behavior.
4. Through a separately authorized publication, attach `Agent-Academy-Setup-VERSION.exe`, its `.exe.blockmap`, and `latest.yml` from the same build to a public, non-prerelease GitHub release tagged `vVERSION`. Do not edit their hashes or mix assets from different builds. Retain older release assets for differential updates.
5. From the older installed app, check, download, confirm restart and verify the installed version and saved data.

Full NSIS packaging writes `resources/app-update.yml`; a directory-only development package does not establish updater packaging. Use the unpacked payload of the full NSIS build for updater QA.

Differential downloads are enabled. The updater can fall back to a complete installer when a differential download cannot be performed, so reduced download size is not guaranteed. The process and platform constraints follow [electron-builder's version 26 updater documentation](https://www.electron.build/v26/docs/features/auto-update/).

An unsigned development preview is not a signed client release. Real installation-to-installation updating requires published assets and signed release acceptance; a state-machine test does not establish that complete flow.

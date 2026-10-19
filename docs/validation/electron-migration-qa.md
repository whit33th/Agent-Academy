# Electron migration acceptance inventory

Baseline: current working tree, before migration. Screenshots use a device scale factor of 1 and content viewports 1440×900 and 900×900. Existing onboarding is dismissed identically for comparison. Source changes made before this task are backed up under ignored `outputs/migration-baseline`.

## Coverage

- Home → map → agent → lineup viewer; Feed; image viewer; upload/edit dialogs; keyboard shortcuts and manual map/agent navigation. Capture matching web/Electron screenshots after fonts and images load.
- Game process absent/running/unknown independently of quiet logs. Queue join/cancel, pregame, successful/failed own-agent lock, loading, match, replay, return to menu, exit and restart. Verify navigation once per session without foregrounding the application.
- Late attachment, log truncation/replacement, incomplete UTF-8 lines, missing/unreadable log, unsupported map, stale previous agent, process-query failure, suspend/resume.
- Clerk Google: actual installed app → system browser → deep link → authenticated Convex query → relaunch persistence → logout. Test callback timeout/cancel and second-instance handling. Simulated tokens are not real sign-in evidence.
- Cloud collections: guest/public visibility, private ownership, publish/unpublish, copy, create/edit/delete, image upload validation and cross-user denial.
- Packaging: only public configuration; no environment files, server credentials, game credentials, absolute developer junctions, Overwolf or legacy helper dependencies.
- Installer: startup without development tools, close to tray, reopen, explicit quit, autostart disabled by default, install over previous version preserves user data; occupied local port is reported without killing another process.

## Evidence and completion

Automated checks, recorded-log replay, live process observation, real Google sign-in and live match transitions are recorded separately. No complete migration or visual parity claim is made until its corresponding checks pass. Missing external credentials or a user-operated game flow remain explicit outstanding acceptance items.

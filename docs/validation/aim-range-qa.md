# Aim verification — 2026-10-22

Implemented in C:/Projects/valorant-picker. This report supersedes the earlier hero/sidebar/fullscreen UI. Latest direction: opening Aim immediately shows a plain target field under the existing application header, with a single compact toolbar and no descriptive copy.

## Current behavior

- The app header and navigation remain visible. Aim never changes the current window bounds or fullscreen state. Users move/maximize the app using its normal controls.
- All Aim-owned text is English: controls, tooltips, accessible names, route metadata, target variant labels and errors from both the renderer and Electron settings reader. QA scans the visible range text and its title/ARIA/placeholder attributes for Cyrillic characters; controller/settings error expectations and UI selectors use the English copy.
- The app's remaining Russian tray entries were also translated to Open, Settings and Quit; their actions are unchanged.
- Clicking the field or the play icon explicitly acquires raw Pointer Lock. Esc releases it for navigation. The acquisition click does not fire a shot.
- The toolbar contains mode, difficulty, size, speed, optional duration, play/pause and reset. Difficulty uses three separate square buttons with one/two/three red bars. Duration uses three square buttons: ×, 30S, 60S. No dropdowns remain. Size/speed sliders have custom red tracks and rectangular thumbs without native white outlines; their values are shown as percentages of the configured maximum, while the stored angular size/speed values and sensitivity math are unchanged. No hero, headings, onboarding text, sensitivity readout, target appearance selector, hitmarker or results overlay remains.
- The background defaults to neutral medium gray `#737373`. One 40px palette control in the toolbar opens the native color picker; its small swatch previews the current color, and keyboard focus uses the existing red accent. The chosen color fills both the fitted field and letterbox area and persists separately from exercise settings. Changing it only updates a CSS color variable: no session reset, target respawn, additional image/texture or render loop is involved.
- Flicks show one target at a time; each hit spawns a different artwork variant. Moving mode has three distinct variants. Tracking has one target and illuminates its hittable core while the center ray intersects it; feedback clears on pause or loss of aim.
- Aim automatically imports the selected primary crosshair from the current local VALORANT profile. No crosshair editor, selector, fixed green fallback, added shadow or pause dimming remains. The unlocked field uses a pointer cursor to distinguish it from camera control. Target artwork keeps its existing appearance and uses lossless 1024×1024 assets from the generated originals. All four are decoded before training is enabled and each retains a permanently sourced native-size image node; respawns never change an image URL.
- The plain field uses CSS; targets are separate native-resolution image layers. No room, WebGL renderer, 3D engine or screen-sized canvas is allocated. The former stretched 1080p field bitmap and 384px sprites were removed.
- Free training causes no per-frame React toolbar updates. The optional countdown updates once per second. The controller caps active updates at 120 Hz. Paused/minimized states stop the loop, and unchanged flick target layers are not mutated. Navigation removes all image layers.

## Appearance/respawn fixes

### Background choice

Aimlabs' official [first-session guide](https://aimlabs.com/articles/aimlabs/getting-started-in-aimlabs-four-steps-for-your-first-session/) recommends choosing contrasting target/background/crosshair colors. Its developer also confirms [Graybox customization in Settings → Visuals](https://steamcommunity.com/app/714010/discussions/0/3768986615583047545/). These sources establish customization and contrast as useful conventions; they do not identify a statistically most-used hex color. `#737373` is our neutral middle-gray design choice for the existing dark-core/cyan/pink targets, replacing the pale blue-gray field. No texture, gradient or additional scene was introduced.

KovaaK's official [wiki overview](https://wiki.kovaaks.com/en/home/KovaaK%27s/home) also documents visual themes and customizable floor/wall textures. Its documentation does not establish a universal default gray or a most-used shade either.

QA changes the color through the actual toolbar input, verifies both field surfaces, verifies target styles and size settings are unchanged, reloads the page to verify persistence, and restores gray before the usual viewport/capture checks. Evidence includes `custom-background.png` and the default-gray screenshots at all three resolutions. The OS picker is used directly; automated color selection uses the input's value/change path rather than driving the OS dialog.

### Target respawn and projection

The reproducible renderer check is `node scripts/aim-render-qa.mjs`. It bundles the actual renderer/range modules, uses the real Aim CSS in Chromium at 150% pixel scaling and delays image requests by 120ms. The baseline before.json recorded 29 of 40 immediate swaps exposing an incomplete image, and an edge X/Y scale ratio of approximately 1.495 at 48 degrees. The final check records zero incomplete swaps, exactly four asset requests, an edge ratio of 1.0 and zero changed pixels between the captured static image and a capture after five more frames. This pixel comparison is a controlled static capture, not proof about every hardware/frame-presentation path.

The renderer now waits for all decode promises and switches between four permanently sourced images. Images use their native 1024px size rather than an intermediate 256px layer. Decode errors block capture and remain visible when settings change. Prepared images are disposed when leaving Aim, including when decoding completes after disposal.

Perspective centers/FOV and raw-count sensitivity are preserved. Artwork uses an isotropically scaled camera-facing disc (`radius = focal × worldRadius / depth`), so its shape does not turn into an ellipse at the edge. Uniform perspective enlargement is retained. The original center-ray hit test is unchanged; regression checks verify the projected disc contains the center crosshair exactly when the ray hits. This is a deliberate flat-target rendering choice, not a claim that VALORANT uses this sprite projection.

A separate regression reproduced a respawn outside the current view: aim at yaw -29 degrees, then generate the next target near +29 degrees. Respawn placement now validates the entire artwork against the current fitted 16:9 viewport. The renderer check also verifies one visible prepared target after every immediate flick hit.

Epic documents edge distortion from conventional wide-FOV perspective: [Panini Projection](https://dev.epicgames.com/documentation/unreal-engine/panini-projection-in-unreal-engine?lang=en-US). Riot's [11.02 patch notes](https://playvalorant.com/en-gb/news/game-updates/valorant-patch-notes-11-02/) confirm its Unreal Engine update, but do not document any per-character projection correction. No frame-for-frame comparison against a running VALORANT session was performed. It would be unsupported to assert either zero edge distortion or an exact match to our previous sphere-warped sprite.

Renderer reproduction and comparison evidence is in outputs/aim-render-qa/. No temporary debug logging or input fallback was added.

## Imported crosshair

Electron reads `SavedCrosshairProfileData` from the same `RiotUserSettings.ini` used for sensitivity. The importer decodes the quoted JSON string and selects `profiles[currentProfile].primary`; loose INI crosshair values and the first saved profile are not used as defaults. It validates RGB/custom RGB, alpha, inner/outer line visibility, horizontal/vertical lengths, thickness, offsets, dot, outline, hidden state and the resolution-scaling flag. Missing, conflicting or damaged data produces an actionable error through the existing issue icon and blocks capture. Game files are never modified.

The actual selected local profile has green #00ff00 inner lines: length 6, thickness 2, gap 3, opacity 0.8000081181526184. Dot, outline, outer lines and resolution scaling are disabled. Its visible lines do not use movement/firing error, so this is a static primary crosshair. Profiles reread on opening, focus, before capture and every two seconds while running. A changed crosshair pauses capture and clears held fire; identical rereads keep the same renderer model and do not repaint the overlay.

The crosshair uses a small static canvas (20×20 output pixels for this profile), without an animation loop. Windows scaling does not multiply its dimensions when resolution scaling is off. Its window-relative overlay avoids the fractional raster origin of the letterboxed stage, and a transform preserves fractions discarded by CSS layout. Both the stage and its viewport are observed so a letterbox position change also realigns it. Navigation disposes the overlay and all listeners.

The Chromium QA compares actual composited screenshot pixels with imported geometry/RGB/opacity at 125%, 150% and 200% DPI, not just canvas source pixels. Resolution/DPI changes are emulated with viewport changes; native Electron also transfers the window between 150% and 125% displays. Before correction, a parent-origin offset introduced edge blending even when the canvas source pixels were sharp. The final composited check permits only two RGB levels of rounding error and verifies no added blur pixels.

Limit: no screenshot from a running VALORANT session was compared pixel for pixel. Weapon-dependent firing/movement expansion, ADS and sniper crosshairs are not simulated because this Aim iteration has no weapon or movement model. Resolution scaling, when enabled, uses fitted physical viewport height / 1080; parity with Riot's rendering for that flag has not been independently verified. The current local profile has it disabled. Imported values and tested output geometry should not be presented as proof of every in-game crosshair behavior.

## Verification

- 29 test files / 279 tests passed.
- Application and desktop TypeScript checks passed.
- Repository ESLint passed; changed Aim sources, tests, documentation and QA scripts pass Prettier.
- Next.js production build and Electron directory packaging passed.
- Chromium visual fixtures: 11 checks passed, no renderer errors.
- Development Electron: 16 checks passed for the previous crosshair revision, no renderer errors.
- Final packaged Electron: 18 checks passed, no renderer errors:

- neutral gray default; saved custom color fills the field and letterbox without resetting targets or exercise settings
- English UI, tooltips and accessible labels
- square difficulty and duration controls; presets and manual values stay consistent; no degrees
- direct field, app header visible; no hero, descriptions, sensitivity display, appearance selector or hitmarker
- selected VALORANT crosshair: imported RGB, alpha, geometry and physical-pixel DPI sizing
- field and toolbar fit 1280x720
- field and toolbar fit 1920x1080
- field and toolbar fit 3840x2160
- three different HD targets; flick mode shows one target
- window can be moved to second display
- field click acquires real raw lock, keeps window bounds and header
- long one-direction input remains nonzero beyond window bounds; inverse input returns every target to view
- raw lock survives 25 large movements and click near window close control
- pause produces zero target layer mutations
- minimize freezes targets; focus never reacquires automatically
- tracking lights the aimed target without extra text and clears feedback on interruption
- 30 active seconds stop training, clear feedback and release mouse without an overlay
- header navigation disposes target and crosshair layers

Screenshots cover 1280×720, 1920×1080 and 3840×2160, larger targets for quality inspection, active training, paused training, tracking feedback and timer completion. Native display scaling was 150% on the primary monitor and 125% on the second monitor. The test moved the ordinary window between these displays.

The raw-capture checks use actual Electron Pointer Lock requests and Playwright mouse input. The precise tracking-feedback check injects calculated relative counts at the real controller boundary after actual raw capture; its screen-to-angle calculation does not access the session state. It is an automated geometry/feedback check, not a physical mouse-distance comparison against VALORANT.

## Performance evidence

- Median display callback interval: 16.70 ms.
- P95 display callback interval: 33.30 ms.
- Display callback rate: 55.6 FPS.
- Target-layer update rate in this sample: 52.4 FPS.
- Paused and minimized targets produced zero additional layer mutations during the observation windows.
- A unit test drives the real controller at 1000 callbacks/second and verifies the 120 Hz cap.
- Another controller test proves free training does not rerender the React toolbar as frames advance.
- Renderer unit tests verify unchanged targets need no style updates, HD source usage, tracking-outline removal, resource cleanup and absence of a screen-sized canvas allocation at 4K.

These measurements came from the automated desktop session after multiple 4K screenshots and a monitor/DPI change. They do not establish 120 FPS presentation, isolated game FPS impact or an Aim-only CPU/GPU budget. Electron process CPU/memory snapshots are preserved in the report; the first CPU sample reports zero and cannot be interpreted as zero CPU usage. The snapshots include the full application and screenshot workload. The background video is disabled on /aim.

## Packaging and evidence

The installed app was already using port 37491 and was left running. The normal local build is release/win-unpacked/Agent Academy.exe and retains that port. An isolated test package at outputs/aim-package/win-unpacked uses port 37492 and a temporary user profile. Only its compiled server port differs; the main compiled artifact is restored after packaging.

```text
node scripts/aim-qa-package.mjs
node scripts/aim-qa.mjs --packaged --origin=http://127.0.0.1:37492 "--executable=outputs/aim-package/win-unpacked/Agent Academy.exe"
```

Latest machine-readable reports and screenshots: outputs/aim-qa/packaged/, outputs/aim-qa/electron/ and outputs/aim-qa/web/. Read report.json for the current screenshot list; older images in those folders predate the UI revision. Artwork details: docs/aim-target-variants.md.

## Remaining limits

The newly reported intermittent camera-boundary/stuck-target issue was not reproduced, including by the user on retry. A controller regression test covers 100 successive easy-difficulty targets after large rotations, verifying each remains hittable using relative counts. The packaged test verifies nonzero input through 30 long moves in one direction beyond the window dimensions and that inverse input brings all three targets back into view. This increases coverage but does not establish a fix for the intermittent physical-input symptom. No speculative movement clamp, sensitivity change or input fallback was introduced.

The original spontaneous cursor escape/window-close report was not deterministically reproduced. Current regression checks verify raw-only capture, large relative movements, clicks near the close control while captured, safe interruptions and explicit reacquisition. There is no accelerated/CSS fallback or parallel native mouse interception.

Imported sensitivity retains full precision and uses 0.07 degrees/count with a 103-degree horizontal FOV in a fitted 16:9 view. A physical mouse-distance comparison against VALORANT has not been performed. Artwork remains a reconstruction of the low-resolution reference; pixel-identical 1:1 fidelity is not claimed.

No commit, push, deployment or installed-app replacement was performed. To open the normal local build, fully exit the older installed instance through its tray menu first; closing its window alone may leave it running.

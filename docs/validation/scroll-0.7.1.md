# Scroll recovery — 0.7.1 preview

## Reproduction and cause

On the packaged 0.7.0 application, start with an empty guest collection at 800×640, let the initial resize debounce finish, then deliver the seven previously selected maps. This reproduces an account response arriving after the initial layout. The document grows from 642 to 1202 pixels but repeated real mouse-wheel events leave `scrollY` at zero. Resizing the window restores scrolling. The recorded before/after measurements are in ignored `outputs/scroll-regression-before.json`; the retained regression also fails against the original 0.7.0 package.

The global Lenis controller observed `document.documentElement`, whose `h-full` size stays fixed to the viewport. Its ResizeObserver therefore missed changes to document scroll height. A probe changing only the observed root's height restored scrolling without a window resize, ruling out the map-card handlers and leftover modal locks for this reproduction.

The controller now observes `document.body`, which grows with asynchronous maps, agents and lineup results. It also enables `stopInertiaOnNavigate`: without that option, switching routes during a smooth scroll could carry the old animation into the new page and fight its scroll restoration. These settings use the installed Lenis 1.3.27 API; see [the upstream options](https://github.com/darkroomengineering/lenis/blob/main/README.md#settings).

## Regression coverage

`npm run desktop:qa:scroll -- "path/to/Agent Academy.exe"` drives the packaged application with an isolated guest profile and explicit collection fixtures. It tests delayed map/agent population before a native resize, empty-to-populated Feed, pagination from 48 to 96 cards, delayed lineup subscriptions, reaching the actual page bottom, returning to a preserved Home route and resizing to 900×900 and 1440×900. Each run starts at 800×640. The full command repeats at Electron scale factors 1, 1.25 and 1.5. Windows global display settings are not changed.

The Settings dialog is independently scrolled while the background stays fixed, then closing it must release the body lock and restore wheel movement. Tests use a visible inactive native window so hidden-window frame throttling does not masquerade as an unreachable final few pixels. They send real wheel events instead of substituting programmatic scroll positions. The shared fixture backend is reused by the existing desktop QA suite.

Evidence is stored under ignored `outputs/scroll-qa/`. These fixture checks do not modify account data. The earlier account-specific collection restoration and existing production release conditions remain unchanged. No backend deployment is needed for this renderer fix.

## Verified result

The final unmodified packaged application passed the complete wheel regression at all three scales. Lower cards and pagination actions are reachable, the background remains stationary while scrolling Settings, and wheel movement resumes after closing it. The same retained test was rerun against 0.7.0 in a visible window and failed at the first delayed map-population check with zero scroll movement. That failure is saved in `outputs/scroll-regression-old-version.log`.

Both TypeScript projects, all 37 unit/backend tests, lint, unused-code, formatting and the 596-route standalone build pass. The NSIS preview is `release/scroll-0.7.1-preview/Agent-Academy-Setup-0.7.1.exe`, 198,012,457 bytes, SHA-256 `61797A6791C7EEF8A9B740F9534D7E67FA9449925D4D307B1ABBA8785AE5E108`. Its SHA-512 matches `latest.yml`. Authenticode remains `NotSigned`; this is a development-service preview.

The general desktop QA quick pass and native smoke checks also passed on the final package. Versioned evidence is in `outputs/scroll-0.7.1-qa/` and `outputs/scroll-0.7.1-release-evidence.json`. The installer was copied to the resolved Windows Desktop and a local per-user NSIS installation completed successfully. Windows reports version 0.7.1.0; the installed application archive, updater configuration and Next.js build ID match the tested payload. Installation details are in `outputs/scroll-0.7.1-installation.json`. This local preview installation does not establish signed release-to-release upgrade or production OAuth acceptance.

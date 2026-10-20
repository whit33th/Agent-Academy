# Map meta statistics

The map header and its nested lineup routes share a 440px overlay drawer.
It reads public snapshots from Convex, never scrapes from a user's machine.
Win rate uses Tracker's `nonMirroredWlPercentage`; pick rate uses `pickRate`,
not the different `playedPct` column. Both original win-rate fields and the
Played % share are retained for verification. Source tiers are not recomputed.

## Operations

The app mounts `convex-firecrawl-scrape@0.1.3`. Set `FIRECRAWL_API_KEY` in the
chosen **Convex deployment**, never a `NEXT_PUBLIC_` variable or a desktop config.
The key is not needed by the Next.js build or installed launcher.

Capacity: 130 source pages each day means about 3,900 successful scrapes per
30 days, plus bounded retries. Ensure the Firecrawl account has enough credits;
the current account's free monthly allowance does not cover that cadence.
On insufficient credits the collector stops and retains its good snapshots.

The daily cron at **03:00 UTC** queues 13 standard maps × 10 rank groups.
The minute cron reconciles one component job at a time. Progress lives in
`agentStatTargets`, independent of the launcher or any open page. It normally
takes several hours to walk all targets at this conservative cadence.

The component gets `rawHtml`, `proxy: auto`, `onlyMainContent: false`, a 24-hour
TTL and `force: true`. Only a validated JSON initial state for the exact
Competitive/EU/map/rank combination can be published. Raw content may be inline
or in component storage; ingestion supports both. No page scripts are executed.

The pinned component does not expose Firecrawl's `maxAge` option (whose default
is 48 hours). Each scrape therefore gets an `aa_stats_refresh` timestamp query
parameter to prevent reuse of a previous provider-cached page. Tracker ignores
this parameter; this was checked against the page's exact filter attributes.
The app's source link stays canonical, without the refresh parameter.

Zero-observation agents may be omitted, especially in Radiant. Completeness is
checked against the total Played % share, with tolerance for source rounding,
alongside unique known agents, valid tiers, finite percentages and matching
filters. An explicit empty source result is `no_data`; missing state or failed
validation is an error, not an empty snapshot.

Retries: 2, 10 and 60 minutes, then the target waits for the next daily cycle.
Three consecutive blocks pause collection for six hours. Key/credit failures
disable paid work until an operator fixes the problem and resumes. A component
job that stays pending/running beyond 15 minutes holds its slot and pauses the
collector; it is never silently abandoned to start overlapping requests.

Current and previous good snapshots are stored atomically. Failed refreshes
leave them intact. Public query responses contain no job IDs, keys or internal
error details. Error records expire after 30 days.

Inspect health using the current CLI deployment selection:

```powershell
npx convex run agentStatsSync:health
```

After fixing the deployment's key or replenishing credits:

```powershell
npx convex run agentStatsSync:resume
```

To initialize a new deployment and exercise a full cycle:

```powershell
npx convex run agentStatsSync:enqueueDaily
node scripts/verify-agent-stats.mjs
```

The verifier invokes the same idempotent reconciler more frequently for initial
QA; it does not increase the single-scrape concurrency. It stops on disabled or
paused collection and leaves the normal Convex cron to continue after exit.
Do not repeatedly reset or requeue failed targets to bypass retry limits.
Verify the CLI's target before running these commands; dev and production are
separate databases and schedules.

## UI verification inventory

- Browser and Electron: open/close, unchanged background width, 100ms transform
  and opacity transitions, no horizontal overflow, independent panel scrolling.
- Keyboard: initial focus, native modal focus containment, Escape and return to
  the trigger. Rank dropdown stays in the dialog's top layer.
- Rank change: exact source link and metrics, persistent guest/account-scoped
  selection, no cross-rank cached flash and no paid request triggered by the UI.
- Map navigation: map-scoped query/cache keys and availability on lineup routes;
  selecting an agent closes the panel and opens their lineups.
- Desktop disk cache: reload with the Convex connection unavailable; previously
  loaded map/rank snapshots remain visible. Uncached scopes show an empty state.
- Stale data: notice after 48 hours, with source timestamp retained.
- Small viewport (360px), desktop (1280px+), reduced motion and repeated opening.
- Backend: parser fixtures, partial/invalid/blocked responses, idempotency,
  duplicate completion, retries/circuit break, lease recovery and credit errors.

Screenshots from manual/interactive QA are written to `outputs/agent-stats/`.

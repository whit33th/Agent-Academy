# Explicit lineup metadata

Side, site and ability are stored in `lineups.metadata`, independently of the title and notes. `lib/lineups/metadata.ts` defines the allowed values; Convex validators are built from those values. Labels use exhaustive records, and the UI, filters, form commands and server share the same types.

- Side: Attack, Defense, Both sides, Not specified. Attack/Defense filters include Both sides.
- Site: A/B/C when present in the selected map's bundled callouts, General / no site, Not specified. The server rejects a site that does not exist on the map.
- Ability: the exact Valorant ability slot for that agent. The server checks membership in the bundled roster. A generic category such as `recon` cannot identify an exact ability.

New forms require explicit side, site/general and ability selection. Older records can be edited gradually without being forced to invent missing classifications. Missing metadata is treated as Not specified; it is never recovered from words in the title, descriptions or the old `abilityType` field. The old field remains in storage for compatibility with older installed clients and is not used by the new UI's filters. Copying a public setup copies its explicit metadata.

Filters operate on loaded pages and state that scope when more pages are available. They combine side, site, exact ability and favorites; Clear filters resets them together. There are dedicated filters for unspecified side/site/ability, so old records remain discoverable. Filtering is not a count of all rows in the cloud.

Titles, notes, ability descriptions and external display names stay strings. Route parameters and HTTP/cache JSON are untrusted inputs and are checked at their boundaries. Internal form commands are typed objects rather than stringly typed FormData. Collection IDs use the generated Convex table ID types; the upload response has one documented conversion for the opaque ID after checking the HTTP shape. Agent viability choices use the existing S/A/B/C/D union, with normalization of older strings at the UI boundary.

The schema change is additive: metadata is optional in stored rows and legacy mutations, so existing rows do not require a destructive migration. Deploy the updated Convex schema/functions before distributing the new client. No cloud data was backfilled, classified automatically or deployed as part of this implementation.

Regression coverage includes shared type equality, allowed map sites, invalid wire values, contradictory titles, legacy records, combined filters, metadata preservation on edits/copies, foreign-user denial and invalid cached data. Electron QA additionally covers the form choices and the absence of C Site on Ascent.

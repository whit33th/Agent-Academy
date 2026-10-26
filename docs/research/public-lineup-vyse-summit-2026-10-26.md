# Vyse on Summit — source review, 2026-10-26

Published two distinct defense setups from Chef's primary guide: [The ULTIMATE Summit Vyse Guide // Lineups and Setups](https://www.youtube.com/watch?v=1bZaw2Pj4I4), published August 9, 2026. The actual YouTube Share > Embed flow returned an iframe. No screenshots, thumbnail, video, or audio were copied. Neither entry claims an in-game test.

| Site | Source interval | Included source evidence |
| --- | --- | --- |
| A | 0:04–0:20 | Shear across the A Main/A Garden approach, followed by a site-side Razorvine placement. The written instruction limits placement to the open approach and clears moving wall tracks. |
| B | 3:36–4:10 | Shear across the B Main choke with a site-side Razorvine; the segment also demonstrates a raised crate alternative and uses the door handle as an aim landmark. The entry links at 3:36 and does not invent pixel coordinates. |

Summit was released in13.00 and its local layout is not changed by13.08. Earlier Summit fixes address utility interacting with moving doorways; therefore these entries are explicitly limited to the demonstrated open state and placements outside moving tracks. Compatibility is an inference from the source and patch/map history, not an independent gameplay test. Full recorded evidence and test flags are retained with each public record in `data/lineup-import/public-lineups-vyse-summit-13.08.json`.

The two records passed preview, were published to `dev:scrupulous-barracuda-795`, and a repeated publish returned `exists` for both source keys. This confirms idempotent import; it does not prove live-match performance.

# Other-map public utility review — 2026-10-26

Prepared seven Killjoy entries: two Bind, three Lotus (including the previously reviewed A Tree record), and two Summit. Manifest: `data/lineup-import/public-lineups-other-maps-13.08.json`. Batch ID uses October26; newly reviewed records use the actual system timestamp. The existing A Tree check timestamp is preserved.

These are source-reviewed setups, not independently gameplay-tested lineups. All records retain `testedInGame:false`. Older source footage is accepted only on a stated relevant-geometry inference. No custom match was run. No screenshots, thumbnails or video/audio files were copied. Each record links the original creator and exact demonstration time; descriptions paraphrase visible placement rather than copying captions.

## Primary sources and observed frames

All three watch pages identify Briiest as the creator. Original publication timestamps and `playableInEmbed:true` were already verified in the prior source-review dataset. These pages were opened again for the actual-frame review below. Summit Share > Embed was also opened this session: YouTube supplied its external iframe and loaded the creator preview. Embed availability is not a grant to republish downloaded media.

| Map | Original source | Accepted distinct setup | Actual frames inspected |
| --- | --- | --- | --- |
| Bind | [Briiest Bind guide](https://www.youtube.com/watch?v=jxejX5_VGFc), February26 | A Short teleporter approach | Around2:06 wooden box placement,2:21 wall-side marker,2:31 overhead,2:36 Alarmbot radius. Source HUD12.02. |
| Bind | [Briiest B Hookah segment](https://www.youtube.com/watch?v=jxejX5_VGFc&t=241s) | Hookah entrance trap |4:15 room landmarks,4:25 Alarmbot at arch and wall-side marker,4:30 activated overlapping coverage at doorway. |
| Lotus | [Briiest Lotus guide](https://www.youtube.com/watch?v=liSWxxXao-I), April30 | Existing A Tree trap retained | Prior review2:08/2:23, not rechecked or re-timestamped here. |
| Lotus | [Briiest B segment](https://www.youtube.com/watch?v=liSWxxXao-I&t=242s) | B Main stair approach |4:13 two markers on site floor,4:23 overhead with Alarmbot and stairs below narrow blue windows. Source HUD12.06. |
| Lotus | [Briiest C segment](https://www.youtube.com/watch?v=liSWxxXao-I&t=304s) | C Main shallow-water passage |5:22/5:27 two Nanoswarm markers and central Alarmbot beside stacked boxes/raised site ramp. Visible caption identifies C Main push. |
| Summit | [Briiest Summit guide](https://www.youtube.com/watch?v=Qoq6I433E-c), July2 | A Garden in front of Main |3:01 floor placement,3:11 overhead with two Nanoswarms and Alarmbot between square rock and curved pavilion wall. Open approach shown. |
| Summit | [Briiest actual B segment](https://www.youtube.com/watch?v=Qoq6I433E-c&t=278s) | B Site central boxes |4:40 placement,4:50 floor marker,5:00 and5:05 overhead activated damage zones around teal/gray boxes. Use278seconds because the242 chapter marker still includes an A variation before B. |

No superficial placement variants are split into extra records. These seven are useful whole setups, not a claim that each device alone is a separate lineup.

## Current compatibility reasoning

The latest official notes remain [13.08](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-08/). The actual current pool was independently rechecked by the coordinating task; these three maps are in it. Pool membership does not establish utility compatibility.

Reviewed the relevant official release-to-current patch sequence:

- Bind source predates [12.04](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-04/), which adjusts Turret rotation and mentions nonspecific geometry-gap corrections on several maps. That wording prevents a categorical claim of unchanged geometry. The accepted setups use exposed floor placements in ordinary A Short/Hookah spaces; they do not exploit gaps or depend on an old turret cast direction. Their compatibility remains an inference and is labelled accordingly in record evidence.
- Lotus source is after [12.05](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-05/), whose map changes concern A Vines/Lobby/stairs and plant geometry. The added B and C placements use separate local floor corridors. Existing A Tree record already records its own specific reasoning.
- [13.00](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-00/) increases Nanoswarm duration, Turret fire rate and Alarmbot speed, and releases Summit. No previous duration, guaranteed damage or fixed trigger timing is copied into instructions.
- Summit [13.01](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-01/) corrects Iso/Waylay exploits. [13.02](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-02/) corrects utility being crushed by an already-closed door.13.08 adjusts destruction feedback when moving doorways destroy Alarmbot. Summit instructions explicitly require the demonstrated open approach and devices clear of moving tracks; no claim is made that a setup survives moving walls or works through every wall state.
- Also inspected [12.03](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-03/), [12.06](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-06/), [12.07](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-07/), [12.08](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-08/), [12.09](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-09/), [12.10](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-10/), [12.11](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-12-11/), [13.04](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-04/), [13.05](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-05/) and [13.06](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-06/). No later change to the accepted local floor surfaces or Nanoswarm trajectory was identified.12.06 starts with explicit April Fools fiction; only the real changes below that disclaimer were used.

## Validation and remaining scope

The bundled catalog confirms Killjoy Nanoswarm=`Grenade`, Alarmbot=`Ability1`, Turret=`Ability2`. Entries describe Nanoswarm setups and therefore use `Grenade`, `abilityType:other`, defense side and their actual site. JSON structure, unique keys, attribution, external-video timestamps and test flags checked locally. No database import, deployment or media upload performed by this research task.

Neon and Vyse were not added here: existing leads did not establish a reproducible, current-compatible primary-source utility demonstration with clear footage ownership. Strats.gg remains excluded because its terms restrict systematic extraction/competing-database use. Additional postplant/clearance chapters in the three guides remain research leads rather than automatically approved content.

# Aim target artwork

Four transparent sprite variants were created with the built-in `imagegen` tool from the user's supplied screenshot. No animated textures, shaders, external asset services, or 3D scene are used at runtime.

| Variant    | File                                 | Direction                                                                   |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------- |
| По образцу | `public/aim/targets/rift-v4-hd.webp` | Softer screenshot-like edge, dark core, pink cross, cyan lower-right streak |
| Рваный     | `public/aim/targets/rift-v2-hd.webp` | Irregular diamond outline and downward streak                               |
| Острый     | `public/aim/targets/rift-v1-hd.webp` | Sharper energy spikes                                                       |
| Круглый    | `public/aim/targets/rift-v3-hd.webp` | Compact round outline and short effects                                     |

Generation prompts, condensed:

1. Reconstruct the larger right-hand target: navy-black opaque core, torn purple outline, sparse cyan streaks, small magenta four-arm cross with center gap, transparent padding; no background or 3D ball.
2. Match the smaller left-hand target: compact ragged diamond outline, near-black wisps, cyan downward/right streaks, tiny black fragments; preserve small-scale legibility and transparency.
3. Correct variant 2 toward a rounder silhouette: shorten spikes, remove the upper sail and long lower spear, keep a flat smoky center and restrained cyan fringe.
4. Extract/reconstruct the larger screenshot target while retaining its soft, low-detail in-game appearance rather than adding intricate illustration detail. Remove the screenshot background and second target; retain the pink cross and asymmetrical silhouette.

Generated PNG originals are retained under `outputs/aim-targets/originals/`. Runtime assets are now lossless 1024 × 1024 WebP files with alpha, totaling 1,419,914 bytes (about 1.35 MiB). They are converted directly from the generated originals; the former 384px delivery assets have been removed. This conversion is asset delivery optimization; the artwork was generated and revised through `imagegen`.

The pink centers were measured in the image data and used to align each sprite to the hittable dark core. Decorative wisps are outside that core. Appearance is assigned automatically. Flicks show one target at a time; a hit replaces it with a different variant. Moving mode uses three distinct variants at once. There is no appearance selector. Sensitivity still comes from the VALORANT profile and is not displayed in the toolbar.

The variants approximate the low-resolution reference; pixel-identical reproduction has not been established. Compare the actual in-app sprites at their intended size, not only the enlarged generated originals.

Targets are individual native-resolution image layers over a plain CSS field. The field is never rasterized into a 1080p bitmap and stretched over a 4K window. Centers retain the perspective camera projection and 103-degree FOV. Artwork is rendered as a camera-facing circular disc with uniform scale instead of stretching a flat image over a sphere silhouette. The existing center-ray sphere hit test is unchanged: both the circular disc under the crosshair and the sphere hit condition require the same perpendicular distance to the camera ray. Tracking adds a thin illuminated circle around the hittable core and increases target brightness while the center ray intersects it. The fixed crosshair is green and does not flash a hitmarker.

All four variants have permanent image nodes at their native 1024px size. `AimScene.ready` resolves after every image has decoded; training is unavailable until then. Respawns only switch the visibility and transform of prepared nodes, never their source URLs. This avoids painting stale or undecoded content during a hit. New placements also test the entire artwork against the current fitted 16:9 viewport.

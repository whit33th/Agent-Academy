# Board model and data readiness

The editor uses `lib/board/types.ts`. Positions, paths and gameplay geometry are map-oriented metres; `projection.ts` supplies the only world/radar/screen transformation. Ink widths and control sizes are CSS pixels. Geometry may extend outside the radar and is clipped when displayed.

`BoardStore` owns committed documents and a shared command history. `BoardController` owns unfinished gestures and pointer capture; it sends animation-frame previews without publishing document changes. `BoardScene` draws committed/live ink on separate canvases, ability geometry in SVG and accessible tokens/controls in HTML. Routes keep endpoints and significant bends within the documented control-point limit. Cypher wires use a distinct straight segment.

Definitions are keyed by agent UUID and one of four active slots. Alternative modes and related targets belong to the same definition. Effect size, cast reach, route length and owner activation radius have separate meanings. There is no name-substring lookup or generic fallback radius. Old links migrate positions and existing endpoints; their saved shapes, dimensions and image URLs are ignored. New links use a bounded, compressed versioned document and lossless binary coordinates.

The former approximate tables and Wiki regex importer have been removed. Authoring commands, source requirements and release checks are described in [board-data-workflow.md](board-data-workflow.md).

## Current verification boundary

The bundled dataset is a development candidate, not a certified complete release. Merely extracting 116 profiles and 13 cameras does not prove parameter semantics or independent calibration. The audit has already found and corrected candidate selectors for Cypher wire length, Sage wall width and Harbor wave width. Jett's dash still requires its actual force-module integration. These corrections remain in the normalization candidate until the complete dataset passes release verification.

Terrain-dependent effects require the actual collision scene, correct query settings, selected floor and the native growth algorithm. No fixed-radius approximation is accepted for Viper's Pit. See [board-data-terrain.md](board-data-terrain.md), [board-collision-decoder.md](board-collision-decoder.md) and [board-ability-profile-audit.md](board-ability-profile-audit.md). The current ground-volume renderer is unfinished; UI coverage tests do not certify its gameplay area.

The current Corrode radar in the catalog also predates the installed game's RookUpdate_2026 layout. The current game's texture has been extracted for alignment checks; the release needs a matching radar and independent world landmarks on every map.

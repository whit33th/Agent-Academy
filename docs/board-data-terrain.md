# Viper’s Pit: native growth and map terrain

Verified 2026-10-21 against local VALORANT **13.08.00.5715960**, manifest **7A64CDDDEC7CDB4C**. Shipping EXE SHA256: `e2033a02fb1b536efc29f9bcebf47bf47380594fe684a7c58df613bab6c10fce` was rechecked unchanged on October21. The game installation was read only; native instructions were executed in an isolated offline CPU emulator, without attaching to the game.

**Status:** the authored dependency export for 13 standard maps is complete. Original V2 initialization and its complete tick loop now run to termination on six explicit analytic fixtures, including boundary dispatcher, point registration, priorities and native cleanup. Geometry queries are explicit fixture hooks, not engine physics. Nonzero ramp-angle math, complete runtime configuration, real-map collision/filter semantics and current-game contour parity remain unverified. A clipped circle, area-derived radius or ordinary flood fill would not meet the requested exactness.

## Exact authored inputs

Package: `/Game/Characters/Pandemic/S0/Ability_X/Patch_Pandemic_X_Circular`. Export indices are zero based. The complete selectors are in `outputs/board-data-research/viper-pit-native.json`.

| Export/component | Property | Value |
| --- | --- | --- |
| Default__Patch_Pandemic_X_Circular_C (70) | CellSize / MaxNumberOfCells | 200 / 65 |
| same | StepUp / StepDown | 200 / 350 |
| same | InitialFloorSearchRadius | 42 |
| same | CollisionChannel | ECC_GameTraceChannel7 |
| same | IgnoreObjectsWithTag | PorousToPandemicUlt |
| same | OverlapHeight | 350 |
| GroundVolume_GEN_VARIABLE (66) | VolumeResolution | 200 |
| same | BuilderTimeLimitPerTick | 0.0003 |
| same | ShapeConstraintBuildType | BuildConstraint |
| GroundVolumeBuilderLineMethod_0 (65) | ImplClass | /Script/DynamicVolume.GroundVolumeBuilderLineMethodV2 |
| same | bUseMaximumVolumeConstraint / MaximumVolumeConstraint | true / 2049600.0 |
| same | TravelDistanceConstraintScale / bUseGoalPosition | 0.8 / true |
| same | bDilateHeights / WallPadding | true / −25 |
| same | RaycastMaxNodesPerWalk / WalkHeight | 2 / 240 |
| same | ExtendFloorBelowWalkHeight | 15, enabled |
| same | ExtendCeilingAboveWalkHeight | 110, enabled |
| same | MaximumFallHeight / PopUpHeight | 370 / 350 |
| same | MaximumPopUpEnergy | 0 |
| same | ZLayerHeightTolerance / RampAngleTolerance | 500 / 25 |
| same | FloorPushDownTolerance | 10 |
| same | IgnoreObjectsWithTag | PorousToPatches, CanPlaceThrough, PorousToPandemicUlt |

VolumeMaxExtentShape points to BoxComponent_0 (5), authored BoxExtent=(1,1,1), without a larger authored scale. The runtime builds/configures this constraint; it is not evidence of a one-centimeter Pit or a fixed maximum radius.

Raw source: `outputs/board-data-research/raw/ShooterGame/Content/Characters/Pandemic/S0/Ability_X/Patch_Pandemic_X_Circular.uasset.json`. Parsed Blueprint instructions are under `scripts-raw/`; readable listings under `scripts-pseudo/`.

## Runtime selection and 65

The Blueprint checks `IsGameFeatureToggleEnabled(self,153)` at bytecode offset6565. True selects PatchType=3, assigns full FVector PatchCenter to builder GoalPosition and activates GroundVolume. False selects PatchType=0 and disables GroundVolume. The asset alone does not establish the current server value.

GetMaxVolumeDistance dispatches PatchType0/1 to CellularPatch.GetMaxNodeDistance and PatchType2/3 to GroundVolume.GetBuildSpreadDistance. Native getters return cached state at CellularPatch+0x650 and GroundVolumeComponent+0x610, not independent authored radius constants.

**65 is the authored MaxNumberOfCells property of the legacy CellularPatch path.** Its native offset0x490 and constructor default25 are confirmed. Its full consumption/termination semantics are not recovered. Neither 65 final cells, a 65×65 grid, a radius, nor a live V2 node cap is proven. Do not convert it into any of those or use it as the V2 budget.

## Verified native area budget

Config+0x48 is the constraint-enable flag; config+0x50 is the double MaximumVolumeConstraint. Builder+0x2A4 accumulates signed polygon area in XY. Function0x145C3E0E0 reads X/Y from three-double vertices; Z and height are not multiplied into this budget.

Partial verified pseudocode:

```text
spacing = float(max(initializationTransform.scale.x,
                    initializationTransform.scale.y))       // 0x145C3CF30
spacingSquared = float(spacing * spacing)

polygonXYArea(vertices):                                   // 0x145C3E0E0
    sum = float(0)
    for i in polygon order:
        j = (i + 1) mod vertexCount
        sum = float(double(sum) + (y[i]+y[j])*(x[i]-x[j]))
    return float(sum * 0.5)

// Accepted generated/clipped polygons:
accumulatedArea = float(accumulatedArea + polygonXYArea(polygon))
                                                           // 0x145C41567..579
remainingBudget():                                        // 0x145C42B00
    if not useMaximumVolumeConstraint: return float(3.4e38)
    return float((double(maximumVolumeConstraint)
                  - double(accumulatedArea)) / double(spacingSquared))
```

Original instructions were executed offline: square200×200→40000; same XY/different Z→40000; reversed winding→−40000; triangle→20000. With constraint2049600, spacingSquared40000, accumulated0→51.2400016785 and accumulated40000→50.2400016785. See `native-budget-emulation.json` and `native_budget_emulate.py`. The polygon routine used no service stubs; the budget routine stubbed only weak-object lookup.

This is an **XY projected-area budget**, not cubic volume or a radius. With centimeter-space vertices, 2049600 is204.96m² of accumulated projected polygon area. The normalized budget51.24 does not prove51.24 final cells: partial polygons, clipping, winding, overlapping Z layers and acceptance order matter.

Setup0x145C3E630 also computes `1.5*sqrt(MaximumVolumeConstraint*0.31830987732601135)`. Its use in allocation/setup is observed, but it is not established as the final boundary radius. TravelDistanceConstraintScale0.8 is a priority-score multiplier, as verified below; multiplying an inferred radius by it would be unsupported.

## Verified next stage: readiness, queues and boundary assembly

Main loop0x145C3F570 compares min-heaps: edge records at builder+0x258 (score+0x10), ready fragments at+0x268 (score+0). A ready fragment runs only when nonempty and the edge heap is empty or edgeMinScore>fragmentMinScore. **Equal scores process an edge first.** `native-frontier-emulation.json` executes unequal, equal and empty-queue cases. Do not assume stable FIFO order inside equal-score heaps; preserve native comparison/swap rules too.

After an accepted fragment exhausts the enabled area budget, native clears edge, ready and deferred(+0x278) heaps, sets stop flag+0x2A0 and calls cleanup0x145C3F210. **Cleanup can repopulate the ready heap** and produce more boundary fragments before final termination. The full native fixture below demonstrates this. These stages are executed by the reference harness; they have not been ported to production JavaScript.

Readiness0x145C3E290:

```text
low = flags & 0xF
if low == 0: return false
missing = (~low) & 0xF
required = low
for i in 0..3:
    if low & (1<<i): required |= missing << (4*(i+1))
if (flags & required) != required: return false
for link in record.links[0..3]:
    if link != null and link.processedDirectionsMask != 0xFF:
        return false
return true
```

Native cases: flags0x1→false, flags0xE1→true, flags0xF→true; a nonnull link with mask0 makes0xE1 false, mask255 makes it true. The sample eight-direction mask is at+0x68. Four surrounding-grid offsets are `(0,0),(-1,0),(-1,-1),(0,-1)`; these are not four compass movement directions.

Function0x145C3DFA0 maps eight direction indices to link-index pairs, verified by original instruction execution with only TArray reserve stubbed:

| Direction | Link-index pairs |
| --- | --- |
| 0 | (0,2) |
| 1 | (0,3), (1,2) |
| 2 | (1,3) |
| 3 | (1,0), (2,3) |
| 4 | (2,0) |
| 5 | (2,1), (3,0) |
| 6 | (3,1) |
| 7 | (3,2), (0,1) |

See `native-adjacency-emulation.json`. World compass labels and production of each directional record are not inferred.

Ordered boundary assembly0x145C40560 receives already selected boundary records. It appends a nonnull first point, visits interior points in order, then appends a nonnull last point. For interior B, A=most recently appended polygon vertex and C=last supplied boundary point:

```text
v = float((B.y-A.y)*(C.x-A.x) - (B.x-A.x)*(C.y-A.y))
if abs(v)>9.99999993922529e-9 and v>0: skip B
else: append B
```

Collinear points are preserved. Height bounds are initialized from the previous fragment floor/ceiling and sample floor/ceiling: dilated fields+0x60/+0x64 when enabled, otherwise+0x8/+0x4. Each accepted point clamps boundaryZ and boundaryZ+WalkHeight into those bounds. Append0x145C402B0 then subtracts the enabled floor extension, adds the enabled ceiling extension, stores ceiling/travel arrays, updates3D bounds and records emitted vertex spans.

`native-ordered-boundary-emulation.json` executes both complete original functions with preallocated arrays and only weak-object lookup stubbed. Convex boundary plus existing start→4 vertices; reflex middle point→rejected/3 vertices; collinear middle point→retained/4 vertices. At floor100/ceiling340 with Pit settings, new vertices have floor85, ceiling450. These are controlled inputs, not end-to-end map fixtures.

Boundary endpoint registration0x145C3FD80 is traced statically: set a direction-mask bit, store boundary record, propagate through the pair table. It computes `d=float(inputT*spacing)`; chooses WallPadding when d>WallPadding, otherwise float(d−1.0); then XY=anchorXY+chosenDistance*directionXY. The caller's generation/meaning of inputT/anchor/direction must be recovered before using this for live geometry. WallPadding−25 is not an unsigned drawn wall thickness.

The previously unresolved boundary dispatcher0x145C40930 and per-sample work now execute in the full native fixture described next. The raw disassemblies remain `native-polygon-helpers.json`, `native-node-acceptance.json`, `native-polygon-build.json`, `native-pit-v2-methods.json`. Role names here are descriptive, not recovered original C++ symbols.

## Original native reference prototype, October21

Run from the repository root, using the installed executable with the exact hash above:

```powershell
C:\Python314\python.exe outputs/board-data-research/native-v2-prototype.py
C:\Python314\python.exe outputs/board-data-research/native-v2-full-prototype.py plane
C:\Python314\python.exe outputs/board-data-research/native-v2-full-prototype.py wall
C:\Python314\python.exe outputs/board-data-research/native-v2-full-prototype.py step200
C:\Python314\python.exe outputs/board-data-research/native-v2-full-prototype.py step500
C:\Python314\python.exe outputs/board-data-research/native-v2-full-prototype.py gap
C:\Python314\python.exe outputs/board-data-research/native-v2-full-prototype.py ceiling
C:\Python314\python.exe outputs/board-data-research/native-score-emulate.py
```

`native-harness/harness.py` lazily maps original PE bytes into Unicorn. Original code performs initialization0x145C3E630, all ticks0x145C3F570, sample preparation0x145C46AF0, work initialization0x145C47040, walker0x145C48240, floor/wall handling, native callbacks, sparse-map insertion, heap ordering, boundary dispatcher0x145C40930, ordered pruning0x145C40560, fragment emission0x145C41000 and cleanup0x145C3F210. No native geometry stage in those successful executions is replaced by a Python flood fill or custom polygon builder.

Explicit hooks provide weak-object fixture pointers, deterministic heap storage, memory-copy/set operations, diagnostic sinks and analytic line/surface intersections. The allocator supports legal identity size quantization; allocator capacity may differ from the live engine allocator. Unknown imports/services and unmapped access fail loudly. The fixture chooses an unbounded shape constraint via private config byte+0x100 and **RampAngleTolerance0**, and uses spacing200, authored volume budget2049600, authored bUseGoalPosition=true, goal=(0,0,0), root floor0/ceiling240. The nonzero-angle import is not silently approximated.

| Analytic fixture | Original tick calls to status2 | Fragments emitted | Final accumulated XY area, cm² | Query calls |
| --- | ---: | ---: | ---: | ---: |
| Unlimited floor z0 | 153 | 88 | 2288800 | 184 |
| Floor plus wall x300 | 161 | 81 | 2236900 | 204 |
| Floor left of x300, raised floor z200 right | 153 | 88 | 2288800 | 198 |
| Floor left of x300, raised floor z500 right | 161 | 81 | 2236900 | 204 |
| Floor ends at x300 | 152 | 76 | 2256350 | 227 |
| Low ceiling z180 begins at x300 | 161 | 81 | 2236900 | 204 |

These are deliberately controlled, idealized surfaces. They do not establish engine collision behavior for real meshes or game default settings. Outputs `native-v2-full-prototype.json` and `native-v2-full-prototype-{wall,step200,step500,gap,ceiling}.json` contain every native polygon's full XYZ vertices, per-vertex ceilings/travel distances, exterior segments, floor/ceiling, priorities, query endpoints, phase coverage and per-tick queue state. The serialized fragment Area field remains zero in this pipeline and must not replace the separately accumulated native area.

On the floor fixture, native emits52 full fragments before area reaches2080000 and stops expansion. Cleanup then creates36 boundary fragments, ending at88 fragments and2288800cm². Thus **2049600 is not a hard cap on final emitted polygon area**. A hard area clip would disagree with the original code even in an empty room. The wall fixture reaches all dispatcher gap states0/1/2/3 and executes47500/48730/3FFC0/3FD80; the original dispatcher runs329 times and ordered boundary assembly36 times. Its state is a count of missing consecutive corner nodes, not an arbitrary terrain type.

The per-walk fixture demonstrates the native query sequence for two samples: horizontal segment(0,0,240)→(400,0,240), followed by downward segments at x200 and x400 from z240 to−80. The native code chooses these endpoints, channel and subsequent registration; the fixture supplies only intersection results. Preparation converts a grid direction into world step/unit direction and extends the work segment according to maximum nodes per walk;0x145C47040 is a constructor, while the actual walk is0x145C48240. `native-walk-stage.json` and `native-query-core.json` preserve those complete instruction listings.

### Verified priorities and line-query interface

Original helper0x145C40200 produces:

```text
targetGrid = sourceGrid + direction
weightedTravel = float32(sourceTravel * float32(TravelDistanceConstraintScale))
goalDistance = goalIsSet ? length2D(targetGrid-goalGrid) : 0.0   // double
edgePriority = float32(double(weightedTravel) + goalDistance)
```

`native-score-emulation.json` executes six independent original-code fixtures, all matching the formula at float32 output: travel5/no goal→4; source(3,4), direction(1,0), travel5, goal0→9.656854629516602; source0/cardinal→1; source0/diagonal→1.4142135381698608. The ready-fragment priority near0x145C42633..6AF similarly combines weighted source travel and distance from the fragment's half-cell center to the goal. Preserve float32 multiplication before double addition, and native heap tie behavior.

V2 query wrapper0x145C49030 builds a 3D segment:

```text
start = (startXY.x, startXY.y, startZ)
endXY = startXY + distance * unitDirectionXY
endZ = float32(startZ + float32(slope * distance))
```

It calls0x144363540 with World, OutHit, start/end vectors, channel, query parameters and response parameters. The other interface0x144363430 takes World, start/end vectors, channel, query/response parameters and returns a boolean without OutHit. No sweep shape, radius or quaternion is passed by these V2 call sites; describing these calls as sphere/capsule sweeps is unsupported. The latter boolean line test occurs in pop-up checks and is supported by the explicit analytic fixture hook, but the six current fixtures do not reach that branch.

The exact native GroundVolumeBuilderLineMethod constructor0x145C3C8C0 writes word2 at+0xE0: reflected RaycastCollisionChannel byte+0xE0 is2(Pawn), PreciseRaycastCollisionChannel byte+0xE1 is0(WorldStatic). They have no override serialized in the Pit asset. `native-config-constructor.json`, `native-ground-config-property-offsets.json` and `native-ground-class-mappings.json` preserve evidence. These constructor defaults are **not independent proof of final live config/profile responses**.

`RaycastObjectFilterWithinChannel` config+0xE8 is also initialized by that constructor: count2, bytes(0,1), meaning WorldStatic and WorldDynamic. Common initialization0x145C3CF30 first sets all32 query-side response entries to Ignore0, then turns only the configured object-type entries into Block2. The scene compiler must combine this query-side mask with each shape's own response to the chosen query channel; using BlockAll for the GroundVolume query would be wrong.

The query-context constructor0x145C2AFA0 initializes FCollisionQueryParams byte+0x18 to0. Native scene-query0x14439008B reads that exact byte as the third argument (R8) of0x144B0E250, whose ABI and channel/filter bit construction match [Epic's CreateQueryFilterData signature](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/Physics/CreateQueryFilterData?application_version=5.5), where that argument is bTraceComplex. This supports **simple collision query selection** in the recovered native setup; each mesh's CollisionTraceFlag can still redirect simple queries to complex collision. Other flags are preserved as raw offsets until their names are independently identified. Initializer writes params+0x19/+0x1A/+0x1B=0 and params+0x1D=1; it does not alter+0x18.

The ignored tag array is **copied directly into custom query parameters**, rather than necessarily expanded into ignored actor IDs:0x144358EA0 copies each12-byte FName from config+0xD0 into the inline tag array at queryParams+0x78(count+0x98). The actual native constructor and three-tag copy were executed in `native-query-config-emulate.py`/`native-query-config-emulation.json`. The exact prefilter decision between Actor.Tags and ComponentTags is still unresolved. A separate0x144359120 adds the owning object's ID to the ignored-object list for selected roles. Scene-query0x14438FF90 forwards both collections to its prefilter.

### Explicit unresolved native/runtime boundary

At0x1498228B0 the original preparation calls an external math thunk on the configured ramp-angle conversion. Its IAT slot0x149D5CBD8 contains a non-address placeholder in the on-disk protected executable. The native preparation result is later used as a slope. Tangent is a plausible interpretation, **not independently established**, and the reference fixture therefore permits only input0/output0. The parsed PE imports expose only stub.dll plus unrelated delay imports, not a recoverable named math import at this slot. Do not replace this dependency with a guessed formula and label the result exact.

The reference harness currently receives already prepared initial floor/ceiling, query channels and fixture config; it does not emulate the owning component's full setup, shape-constraint construction, real World, runtime tag-to-ignore-actor collection or Chaos scene-query implementation. Arbitrary mesh intersections also require initial-overlap, backface, complex/simple collision selection, material/face and hit tie semantics. Full native execution on idealized fixtures proves the executed algorithm for those inputs; it does not prove current-game geometry, runtime flag153 or all slope/pop-up/drop branches. Native machine code is build/hash-specific and is research evidence, not a portable production implementation.

## Completed authored terrain acquisition

Run the bounded exporter:

```powershell
C:\Python314\python.exe outputs/board-data-research/terrain_scene_export.py
C:\Python314\python.exe outputs/board-data-research/terrain_summarize.py
```

It follows the13 roots, streaming worlds, BombMode sublevels, actor/component Blueprint classes, Super/Template inheritance, static meshes and explicit child-actor/component-class references. The13 roots have544 streaming references, preserved with load/visibility/mode properties in `terrain-streaming-manifest.json`. No LevelTransform override was serialized on those544 refs; actor/component attachments still require composition. Alternative-mode/training/engage-distance caches are separately recorded.

**Final closure:11,492 packages,0 failures,0 missing package references,0 corrupt JSON;226,504 actor/component records;14,793 BodySetups;10,765 static meshes;7,127 convex elements;14,569 cooked PhysXPC-labeled payloads/442,292,887bytes;30 nav chunks/5,257tiles.** There are42 excluded alternative-mode/training/cache levels. This is completed authored acquisition, not completed collision reconstruction/Pit parity.

Per-package `terrain/<asset>.json` preserves properties, ObjectPath/Outer/Class/Template, relative transforms, AttachParent, body-instance response/profile overrides and authored tags. It contains AggGeom boxes/spheres/capsules/convex VertexData, original cooked collision `.bin` payloads with hashes, separately identified LOD0 render positions/indices, and decoded Recast tiles with their raw coordinate frame. Never relabel render LOD or navmesh as actual projectile/fluid collision.

`terrain-summary.json` is the coverage ledger. `terrain-pit-ignore-tags.json` records19 authored actor/component matches, including Bind container pieces marked PorousToPandemicUlt, with owners/properties. Inherited/runtime tags still require resolution. `terrain-component-transforms-check.json` confirms actual PerInstanceSMData for InstancedStaticMesh/HierarchicalInstancedStaticMesh components; keep those transforms in addition to attachment/actor/component transforms.

A real Ascent sample has613 BVPawn mesh components, Greybox383 explicit mesh instances, Art_A207 explicit instances, and257 nav tiles/8924 vertices. There are also inherited mesh refs. Conditional sublevels, native/default collision profiles, trace-complex choice, double-sidedness, no-collision/query-only flags and movable/destructible state must be resolved before queries can reproduce the game. Do not merge all alternative state geometry into one scene.

## Remaining release gates

1. The original V2 init/tick pipeline runs to termination on controlled zero-angle fixtures, including priorities, partial boundaries and cleanup. Nonzero ramp math, initial component/constraint setup, rare pop-up/ramp/drop branches, complete layer handling and expansion-time activation still require validation and a faithful portable implementation. The fixture harness is not real-map parity.
2. CUE4Parse UBodySetup preserves CookedFormatData but its Chaos factory lacks TriangleMesh/HeightField decoding. PhysXPC is a format label, not proof of encoding. Parallel decoder research has independently recovered sample collision vertices/indices, but full scene query parity still needs validation. Render LOD/AggGeom must not silently replace the cooked collider selected by the query.
3. Runtime flag153, native defaults absent from assets, collision profiles/channels, construction scripts and map/door states must be resolved. No engine.ini appeared in333504 mounted entries;20 legacy containers remain unmounted. This does not invalidate successful referenced asset exports, but cannot prove missing configuration unnecessary.
4. No current-build custom-game comparison of actual Pit contours/height transitions has been performed. Offline helper emulation verifies those helpers only.

**Starting Z or an explicitly chosen floor/surface is required.** PatchCenter is a full FVector. Floor search,3.7m fall,3.5m pop-up and layer tolerances make the same XY on two floors different inputs. Automatically choosing the top floor changes the ability. Resolve the clicked surface, including stacked floors/overhangs, before projecting the resulting3D fragment union to2D.

One height per XY or a 2D walkable outline is insufficient. Exact queries need authored/cooked primitives in world space, a3D ray/sweep spatial index, multiple surfaces at the same XY and native filters. A sparse surface graph can accelerate traversal only after proving it retains every query needed by V2.

The remaining path is a validated current-build cooked collider decoder, faithful V2 reconstruction/reference harness and custom-game fixtures on all13 maps: open ground, wall/door, corner, slope, step, drop, low ceiling and stacked floors. Visual recordings can reveal disagreement; finite pixel measurements cannot prove exact arbitrary-position equivalence. Exact reference fragment vertices/runtime flags require an authorized game/engine diagnostic source; the public catalog API exposes no such runtime geometry. Keep this as a release gate, without substituting a fabricated contour.

## Parser sources

CUE4Parse inspected at commit6f7b06eefa22f3cc259d03bb9901a384cb4fb538:

- [UBodySetup/cooked format blobs](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Objects/PhysicsEngine/UBodySetup.cs)
- [Chaos factory: unimplemented TriangleMesh/HeightField](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Objects/Chaos/FImplicitObject.cs)
- [Recast tile payloads](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Assets/Exports/NavigationSystem/URecastNavMeshDataChunk.cs)
- [Epic: Unreal units](https://dev.epicgames.com/documentation/unreal-engine/units-of-measurement-in-unreal-engine)

No primary public implementation of Riot’s GroundVolumeBuilderLineMethodV2 was located. Parser sources do not contain that algorithm. Native addresses above apply only to the recorded EXE hash.

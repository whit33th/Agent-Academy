# Updating Board game data

The application loads prepared data only. Game archives, mappings, native disassembly and authoring tools are not shipped in the runtime bundle.

## Extract from the installed build

`tools/board-data-extractor` is a separate .NET 10 / CUE4Parse tool. It pins CUE4Parse `1.2.2.202610`, AssetRipper.TextureDecoder `2.6.2` and the required support packages. Supply local matching mappings and an Oodle library. The tool checks the installed Riot manifest against the requested identity and records mapping/installation hashes; it rejects reusing an export directory for another build. The numeric build argument still needs independent confirmation; matching a manifest alone does not establish gameplay correctness.

For the installation currently being audited:

```powershell
$extract = @(
  '--output=outputs/board-data-13.08',
  '--build=13.08.00.5715960',
  '--manifest=7A64CDDDEC7CDB4C',
  '--mappings=outputs/board-data-research/release-13.08_br.usmap',
  '--oodle=outputs/board-data-research/oodle-data-shared.dll'
)
dotnet run --project tools/board-data-extractor -- @extract --mode=abilities --bindings=scripts/board-data/ability-bindings.json
```

The explicit binding file contains 116 agent UUID / active-slot entries. The extractor follows class inheritance, component templates, tuning tables, curves and gameplay dependencies. Missing bound packages and parse failures produce a nonzero exit status. Unmounted containers are recorded; package closure is a scoped completeness check, not proof that every runtime value has been found.

Other modes:

- `inventory`: mounted archive inventory.
- `assets`: explicitly supplied asset paths plus inheritance dependencies.
- `scripts`: the same exports with Blueprint script data enabled.
- `terrain-probe`: exact BodySetup cooked bytes, AggGeom, render geometry for independent comparison, Recast tiles and scene records.
- `terrain-scene`: recursively follows referenced scene packages, mesh/template dependencies and BombMode sublevels. Runtime inclusion/query flags still need verification.
- `textures`: explicitly supplied Texture2D paths, decoding BC7 or DXT5 into RGBA8 with source/output hashes. Other codecs fail explicitly. Raw RGBA is an authoring artifact; encode approved assets separately.

Use `--paks=...` and `--metadata=...` for another installation. All options use `--name=value`; positional arguments are archive asset paths. Mapping, DLL and raw archives remain local and are not committed.

## Normalize, compare and verify

The normalizer currently reads the export directory's `raw`, `allpublic-report.json`, catalog/version/map snapshots and local radar images. Historical snapshot filenames retain `public`; ability geometry is resolved from local exports, not from Wiki parsing. Capture the matching metadata alongside a fresh extraction; do not mix builds.

```powershell
npm run board:data:build -- --input=outputs/board-data-research
npm run board:data:verify -- --input=outputs/board-data-research --verification=path/to/release-evidence.json
```

`normalization/board-data.json` is a candidate. `failures.json`, `changes.json` and `verification-failures.json` expose missing sources, before/after changes and unmet release requirements. Package-name ambiguity is an error: use a full package path. Every numeric source includes property/component/package, build, units, conversion and source hash; derived values retain their inputs.

Publishing replaces the entire bundle atomically and requires evidence for the exact candidate/build/manifest:

```powershell
npm run board:data:build -- --input=outputs/board-data-research --write --verification=path/to/release-evidence.json
```

An absent or incomplete receipt preserves the existing bundle. Required evidence covers all 116 gameplay profiles and interactions, 13 independent map calibrations in browser and Electron, terrain implementation/live-game cases and an empty unresolved-issues list. Never generate a passing receipt from object counts or UI tests alone.

## Editor checks

```powershell
npm run typecheck
npm run test
npm run board:qa
npm run board:qa:electron
npm run board:performance
npm run build
npm run desktop:typecheck
```

Browser/desktop QA uses the local development app at `http://127.0.0.1:3000`. Electron QA launches isolated profiles and closes its own windows. `--smoke` checks three critical abilities and one map; it is not full coverage. Full mode exercises 116 active abilities including actual link re-opening and 13 maps at two pixel densities. Reports/screenshots are under `outputs/board-qa*`.

The performance fixture compares the original committed renderer against the current implementation on 200 abilities, 200 agents and 50,000 ink points. It copies the original tables only into ignored fixture output; those tables are not available to the application. The fixture identifies handler time, React commits and frame intervals. A fast handler alone is not proof of 60 Hz rendering.

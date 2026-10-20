# VALORANT Ability Map Model

This document is the working catalog for how the strat board should render abilities on the tactical map. Distances are approximate in-game meters converted to radar fraction by `metersToFraction()` in `lib/data/ability-stats.ts`.

## Visual primitives

- **point**: icon only; no meaningful persistent area.
- **circle**: AoE radius, smoke radius, sensor trigger radius, ultimate radius.
- **wall**: directional long rectangular/line effect; rotate on map.
- **cone**: directional field-of-view / projectile line / scan cone; rotate on map.
- **cross**: compound four-arm object, currently used for Deadlock Barrier Mesh.

## Agent catalog

### Brimstone

- **Stim Beacon**: `circle`, radius ~8m. Buff radius.
- **Incendiary**: `circle`, radius ~4m. Molly ground AoE.
- **Sky Smoke**: `circle`, radius ~5m. Smoke coverage.
- **Orbital Strike**: `circle`, radius ~9m. Ultimate damage zone.

### Viper

- **Snake Bite**: `circle`, radius ~3.5m. Acid AoE.
- **Poison Cloud**: `circle`, radius ~4.5m. Smoke sphere footprint.
- **Toxic Screen**: `wall`, length ~35m. Long rotatable wall.
- **Viper's Pit**: `circle`, radius ~15m. Large persistent ult zone.

### Omen

- **Shrouded Step**: `point`. Teleport destination marker only.
- **Paranoia**: `cone`, ~25° x 35m. Directional blind projectile.
- **Dark Cover**: `circle`, radius ~4m. Smoke.
- **From the Shadows**: `point`. Global teleport marker.

### Killjoy

- **Alarmbot**: `circle`, radius ~7m. Trigger area.
- **Nanoswarm**: `circle`, radius ~5m. Molly AoE.
- **Turret**: `cone`, ~100° x 40m. Detection cone.
- **Lockdown**: `circle`, radius ~19m. Detain radius.

### Cypher

- **Trapwire / Tripwire**: `wall`, length ~15m. Rotatable wire segment.
- **Cyber Cage**: `circle`, radius ~4m. Cage footprint.
- **Spycam**: `cone`, ~60° x 20m. Camera view cone.
- **Neural Theft**: `circle`, global/large. Tactical marker rather than precise radius.

### Sova

- **Shock Bolt**: `circle`, radius ~5m. Damage radius.
- **Recon Bolt**: `circle`, radius ~12m. Recon scan radius.
- **Owl Drone**: `cone`, ~80° x 25m. Drone vision.
- **Hunter's Fury**: `wall`, length ~60m. Directional beam line.

### Sage

- **Barrier Orb**: `wall`, length ~10m. Rotatable wall segment.
- **Slow Orb**: `circle`, radius ~5m. Slow field.
- **Healing Orb**: `point`. Target/position only.
- **Resurrection**: `point`. Target marker.

### Phoenix

- **Blaze**: `wall`, length ~12m. Curved in-game, approximated as rotatable wall.
- **Curveball**: `cone`, short directional flash arc.
- **Hot Hands**: `circle`, radius ~3m. Molly zone.
- **Run It Back**: `point`. Return marker.

### Raze

- **Boom Bot**: `cone`, ~55° x 25m. Bot path/search cone.
- **Blast Pack**: `circle`, radius ~4.5m. Explosion/displacement radius.
- **Paint Shells**: `circle`, radius ~6.5m. Primary grenade + cluster footprint approximation.
- **Showstopper**: `circle`, radius ~7.5m. Explosion radius.

### Jett

- **Cloudburst**: `circle`, radius ~4m. Smoke.
- **Updraft**: `circle`, small ~3m self-position marker.
- **Tailwind**: `wall`, length ~15m. Dash direction marker.
- **Blade Storm**: `cone`, narrow line-of-fire marker.

### Reyna

- **Leer**: `circle`, radius ~8m. Nearsight area approximation.
- **Devour / Dismiss / Empress**: `point`. Self/target state, no map AoE.

### Breach

- **Aftershock**: `wall`, length ~12m. Directional through-wall blast.
- **Flashpoint**: `cone`, ~60° x 20m. Directional flash.
- **Fault Line**: `wall`, length ~30m. Linear stun path.
- **Rolling Thunder**: `wall`, length ~60m. Large directional ult strip.

### Skye

- **Regrowth**: `circle`, radius ~18m. Heal radius approximation.
- **Trailblazer**: `cone`, ~80° x 25m. Vision/path.
- **Guiding Light**: `wall`, length ~35m. Bird path; currently line approximation.
- **Seekers**: `circle`, global/large. Tactical marker only.

### Yoru

- **Fakeout**: `wall`, path line.
- **Blindside**: `cone`, directional flash bounce.
- **Gatecrash**: `wall`, tether path.
- **Dimensional Drift**: `point`. Self marker.

### Astra

- **Gravity Well**: `circle`, radius ~5m.
- **Nova Pulse**: `circle`, radius ~7m.
- **Nebula**: `circle`, radius ~4m.
- **Cosmic Divide**: `wall`, length ~100m. Map-crossing wall.

### KAY/O

- **Frag/ment**: `circle`, radius ~4m.
- **Flash/drive**: `cone`, ~65° x 25m.
- **Zero/point**: `circle`, radius ~12m.
- **Null/cmd**: `circle`, radius ~16m.

### Chamber

- **Trademark**: `circle`, radius ~6m.
- **Headhunter**: `cone`, narrow line-of-fire marker.
- **Rendezvous**: `circle`, radius ~13m.
- **Tour De Force**: `cone`, narrow long line-of-fire marker.

### Neon

- **Relay Bolt**: `circle`, radius ~4m. Stun radius.
- **High Gear**: `point`. Movement state.
- **Fast Lane**: `wall`, length ~25m. Twin wall approximated as thick wall.
- **Overdrive**: `cone`, narrow line-of-fire marker.

### Fade

- **Prowler**: `cone`, ~70° x 30m.
- **Seize**: `circle`, radius ~5m.
- **Haunt**: `circle`, radius ~12m.
- **Nightfall**: `wall`, length ~50m. Wide directional ult path.

### Harbor

- **Cascade**: `wall`, length ~20m.
- **Cove**: `circle`, radius ~4.5m.
- **High Tide**: `wall`, length ~24m.
- **Reckoning**: `circle`, radius ~20m.

### Gekko

- **Wingman**: `cone`, ~70° x 25m.
- **Dizzy**: `cone`, ~90° x 30m.
- **Mosh Pit**: `circle`, radius ~6m.
- **Thrash**: `cone`, ~70° x 30m.

### Deadlock

- **GravNet**: `circle`, radius ~6m.
- **Sonic Sensor**: `circle`, trigger radius ~7m.
- **Barrier Mesh**: `cross`, arm length ~13m, node radius ~2.5m.
- **Annihilation**: `cone`, narrow capture cone ~18° x 30m.

### Iso

- **Double Tap**: `point`. Self buff.
- **Undercut**: `wall`, length ~25m. Directional projectile.
- **Contingency**: `wall`, length ~12m. Moving wall.
- **Kill Contract**: `circle`, radius ~25m. Target arena marker approximation.

### Clove

- **Meddle**: `circle`, radius ~4m.
- **Pick-me-up**: `circle`, radius ~4m.
- **Ruse**: `circle`, radius ~4m. Smoke.
- **Not Dead Yet**: `point`.

### Vyse

- **Shear**: `wall`, length ~15m.
- **Arc Rose**: `circle`, radius ~6m.
- **Razorvine**: `circle`, radius ~4m.
- **Steel Garden**: `circle`, radius ~25m.

### Tejo

- **Stealth Drone**: `cone`, ~60° x 30m.
- **Guided Salvo**: `circle`, radius ~6m.
- **Special Delivery**: `circle`, radius ~4m.
- **Armageddon**: `wall`, length ~40m.

### Waylay

- **Lightspeed**: `circle`, radius ~6m.
- **Saturate**: `wall`, length ~15m.
- **Convergent Paths**: `circle`, radius ~30m.

## Known limitations

- Plant zones/site label coordinates are approximate and should be calibrated per map image.
- Curved abilities (Phoenix Blaze, Harbor High Tide, Skye bird path) are approximated as lines until we add editable Bezier paths.
- Multi-stage abilities (Paint Shells clusters, Gekko creatures, Raze bot pathing) are shown as practical tactical zones, not physical simulation.
- Valoplant-level precision requires a map calibration dataset: map image bounds, world-to-radar transform, site polygons, object names, and per-ability exact geometry.

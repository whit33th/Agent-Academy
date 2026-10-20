# Tracker fixtures

Captured from the public Tracker.gg agent insights pages on 2026-10-20.
Only the `insights-v2` statistics payload is retained, with each row reduced to
its source attributes, name/tier and the four numeric statistics we consume.
These are test fixtures; the app never displays them as live data.

- `abyss-diamond.json`: Competitive, Abyss, Diamond, Europe.
- `abyss-all.json`: Competitive, Abyss, All Divisions, Europe (`division: null`).
- `ascent-diamond.json`: Competitive, Ascent, Diamond, Europe.
- `abyss-radiant.json`: Competitive, Abyss, Radiant, Europe. Tracker returns 27
  agents with observations; Breach and Gekko are absent. The Played % values
  still total 100% within source rounding tolerance.

Source URL pattern:
`https://tracker.gg/valorant/insights/agents?playlist=competitive&map=abyss&division=diamond&region=eu`.
For All Divisions, omit `division` entirely.

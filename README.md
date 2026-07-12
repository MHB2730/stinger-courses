# stinger-courses

Public course data for the **Stinger** golf-GPS app, authored in **Course Studio**.
This repo is the delivery seam between the two: Course Studio publishes a course's
enriched GeoJSON here, and the Stinger app pulls it over a CDN.

**This repo is public on purpose** — it holds only golf-course map geometry (holes,
fairways, greens, hazards, scorecard pars). No app source, keys, or personal data.
The Stinger app source stays in its own private repo.

## Layout

```
manifest.json            index the app reads first (courses + sha256 for change detection)
courses/<id>.geojson     one enriched GeoJSON per course (Course Studio "Export for Stinger")
scripts/build-manifest.mjs   regenerates manifest.json from courses/
```

## How the app reads it (via jsDelivr CDN — not raw.githubusercontent)

- Manifest: `https://cdn.jsdelivr.net/gh/MHB2730/stinger-courses@main/manifest.json`
- A course: `https://cdn.jsdelivr.net/gh/MHB2730/stinger-courses@main/courses/cotswold-downs.geojson`

The app fetches the manifest, compares each course's `sha256` to its cached copy,
downloads only what changed, caches locally, and falls back to the APK's bundled
asset when offline. Read `raw.githubusercontent.com` is rate-limited and not a CDN —
always go through jsDelivr (or GitHub Pages).

## How a course gets updated (publish)

1. Edit the course in Course Studio → **Export for Stinger (GeoJSON)**.
2. The file is written to `courses/<id>.geojson` and committed here (Course Studio's
   Publish does this via the GitHub Contents API with a fine-grained token).
3. `node scripts/build-manifest.mjs` refreshes `manifest.json`.
4. jsDelivr's cache is purged for the changed paths so the update is live in seconds:
   - `https://purge.jsdelivr.net/gh/MHB2730/stinger-courses@main/manifest.json`
   - `https://purge.jsdelivr.net/gh/MHB2730/stinger-courses@main/courses/<id>.geojson`

## manifest.json schema

```jsonc
{
  "schema": 1,
  "generated": "<ISO timestamp>",
  "cdnBase": "https://cdn.jsdelivr.net/gh/MHB2730/stinger-courses@main",
  "courses": [
    { "id": "cotswold-downs", "name": "Cotswold Downs", "region": "…",
      "par": 72, "holeCount": 18, "file": "courses/cotswold-downs.geojson",
      "bytes": 512414, "sha256": "…" }
  ]
}
```

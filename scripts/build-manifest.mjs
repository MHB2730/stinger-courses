// Regenerates manifest.json from whatever course files are in courses/.
// The manifest is the single index the Stinger app reads first: it lists every
// course, its scorecard metadata, and a sha256 so the app can tell what changed
// without downloading every file. Run after adding/updating a course:
//   node scripts/build-manifest.mjs
//
// Course metadata (name/region/par/holeCount) is lifted from each GeoJSON's
// root `course` foreign member (written by Course Studio's Stinger export), so
// the manifest never drifts from the files it indexes.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COURSES_DIR = path.join(ROOT, 'courses');
const OWNER_REPO = 'MHB2730/stinger-courses';
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${OWNER_REPO}@main`;

const files = fs.readdirSync(COURSES_DIR).filter((f) => f.endsWith('.geojson')).sort();
const courses = files.map((fname) => {
  const buf = fs.readFileSync(path.join(COURSES_DIR, fname));
  const gj = JSON.parse(buf.toString('utf8'));
  const c = gj.course || {};
  return {
    id: c.id || fname.replace(/\.geojson$/, ''),
    name: c.name || null,
    region: c.region || null,
    par: c.par ?? null,
    holeCount: c.holeCount ?? null,
    file: `courses/${fname}`,
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
  };
});

// Deterministic on purpose: no build timestamp, so the CI job only commits a new
// manifest when a course's content (sha256/bytes) actually changed — not on every run.
// The app detects changes from each course's sha256, not from the manifest itself.
const manifest = {
  schema: 1,
  cdnBase: CDN_BASE,
  courses,
};

fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json: ${courses.length} course(s)`);
for (const c of courses) console.log(`  ${c.id.padEnd(22)} par ${c.par} · ${c.holeCount} holes · ${c.bytes} B · ${c.sha256.slice(0, 12)}…`);

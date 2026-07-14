// Regenerates manifest.json — the single catalog both clients read:
//   • the Stinger APP reads each course's `file` (geojson) + `sha256` for change detection.
//   • Course Studio (the BUILDER) reads `model` (the editable *-model json) + `modelSha256`,
//     plus name/location/holeCount/intendedPar to list courses without downloading them.
// Course metadata is lifted from the files themselves (geojson `course` member + model
// metadata), so the catalog never drifts from what it indexes. Deterministic (no timestamp):
// CI only commits when a course's content actually changed.
//   node scripts/build-manifest.mjs
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER_REPO = 'MHB2730/stinger-courses';
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${OWNER_REPO}@main`;

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const readDir = (d) => { try { return fs.readdirSync(path.join(ROOT, d)); } catch { return []; } };

// One entry per course id, merged from both formats.
const byId = new Map();
const entry = (id) => { if (!byId.has(id)) byId.set(id, { id }); return byId.get(id); };

// courses/<id>.geojson — app-facing export. Keep `file`+`sha256` (the shipped app reads these).
for (const fname of readDir('courses').filter((f) => f.endsWith('.geojson')).sort()) {
  const buf = fs.readFileSync(path.join(ROOT, 'courses', fname));
  const gj = JSON.parse(buf.toString('utf8'));
  const c = gj.course || {};
  const id = c.id || fname.replace(/\.geojson$/, '');
  Object.assign(entry(id), {
    name: c.name ?? undefined,
    region: c.region ?? undefined,
    par: c.par ?? undefined,
    holeCount: c.holeCount ?? undefined,
    file: `courses/${fname}`,
    bytes: buf.length,
    sha256: sha256(buf),
  });
}

// models/<id>.json — the editable Course Studio model (the builder opens this to edit).
for (const fname of readDir('models').filter((f) => f.endsWith('.json')).sort()) {
  const buf = fs.readFileSync(path.join(ROOT, 'models', fname));
  const m = JSON.parse(buf.toString('utf8'));
  const md = m.metadata || {};
  const id = m.courseId || fname.replace(/\.json$/, '');
  const e = entry(id);
  Object.assign(e, {
    name: m.name ?? e.name,
    location: m.location ?? undefined,
    holeCount: md.holeCount ?? e.holeCount,
    intendedPar: md.intendedPar ?? undefined,
    model: `models/${fname}`,
    modelSha256: sha256(buf),
    modelBytes: buf.length,
  });
}

// logos/<id>.<ext> — the club's brand logo, CDN-served so it travels to every client (fresh
// installs and the phone app), not just the machine that set it. Only attached to known courses.
for (const fname of readDir('logos').filter((f) => /\.(png|svg|jpe?g|webp)$/i.test(f)).sort()) {
  const id = fname.replace(/\.[^.]+$/, '');
  if (byId.has(id)) entry(id).logo = `${CDN_BASE}/logos/${fname}`;
}

// Drop undefined fields, stable id order.
const courses = [...byId.values()]
  .map((e) => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined)))
  .sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify({ schema: 2, cdnBase: CDN_BASE, courses }, null, 2) + '\n');
console.log(`manifest.json: ${courses.length} course(s)`);
for (const c of courses) {
  console.log(`  ${c.id.padEnd(30)} geojson:${c.file ? 'y' : '-'} model:${c.model ? 'y' : '-'} par:${c.par ?? c.intendedPar ?? '?'} holes:${c.holeCount ?? '?'}`);
}

#!/usr/bin/env node
/**
 * Record which file extension each team logo actually has.
 *
 * The logo directory is a mix of SVG and PNG. Without this map TeamLogo has to
 * guess, and guessing wrong costs a 404 per team on every page load — twenty of
 * them on a standings board. The manifest is generated from the directory
 * itself so it cannot drift from the files on disk.
 *
 * Run via `npm run build` / `npm run webpack-watch`, or on its own:
 *   node scripts/generate_team_logo_manifest.js
 */

const fs = require('fs');
const path = require('path');

const TEAM_DIR = path.resolve(__dirname, '..', 'frontend', 'static', 'img', 'teams');
const OUTPUT = path.resolve(__dirname, '..', 'frontend', 'src', 'generated', 'teamLogos.json');
// SVG scales, so it wins when a team has both.
const PREFERRED = ['svg', 'png'];

function build() {
  if (!fs.existsSync(TEAM_DIR)) {
    console.warn(`[team-logos] ${TEAM_DIR} not found; writing an empty manifest.`);
    return {};
  }

  const extensionsBySlug = new Map();
  for (const file of fs.readdirSync(TEAM_DIR)) {
    const extension = path.extname(file).slice(1).toLowerCase();
    if (!PREFERRED.includes(extension)) continue;
    const slug = path.basename(file, path.extname(file));
    if (slug === 'unknown') continue;
    if (!extensionsBySlug.has(slug)) extensionsBySlug.set(slug, new Set());
    extensionsBySlug.get(slug).add(extension);
  }

  const manifest = {};
  for (const slug of [...extensionsBySlug.keys()].sort()) {
    const available = extensionsBySlug.get(slug);
    manifest[slug] = PREFERRED.find((extension) => available.has(extension));
  }
  return manifest;
}

const manifest = build();
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[team-logos] ${Object.keys(manifest).length} logos -> ${path.relative(process.cwd(), OUTPUT)}`);

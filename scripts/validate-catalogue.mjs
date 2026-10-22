// Checks data/catalogue.json: unique ids, known groups, Uniformat-shaped codes, and that every
// published component is in the catalogue with the same Uniformat code.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadComponents } from './data.mjs';

const GROUPS = ['hvac', 'controls', 'plumbing', 'electrical', 'fire', 'envelope', 'conveying', 'recreation', 'water', 'wastewater', 'stormwater', 'roads', 'bridges'];
const catalogue = JSON.parse(readFileSync(join(ROOT, 'data/catalogue.json'), 'utf8'));
const errors = [];
const seen = new Set();

for (const c of catalogue) {
  if (seen.has(c.id)) errors.push(`duplicate id ${c.id}`);
  seen.add(c.id);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) errors.push(`${c.id}: id is not a slug`);
  if (!GROUPS.includes(c.group)) errors.push(`${c.id}: unknown group ${c.group}`);
  if (!/^[A-G]\d{4}$/.test(c.uniformat)) errors.push(`${c.id}: Uniformat ${c.uniformat} is not a level-3 code`);
  if (!c.name || !Array.isArray(c.aliases)) errors.push(`${c.id}: needs name and aliases`);
}
for (const { latest: e } of loadComponents()) {
  const c = catalogue.find((x) => x.id === e.id);
  if (!c) errors.push(`published entry ${e.id} is missing from the catalogue`);
  else if (c.uniformat !== e.classification.uniformat) errors.push(`${e.id}: catalogue says ${c.uniformat}, entry says ${e.classification.uniformat}`);
}

if (errors.length) {
  console.error(`✗ data/catalogue.json\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ data/catalogue.json (${catalogue.length} components)`);

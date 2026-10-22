// Writes build/components.json (the latest version of every entry, with citations),
// build/catalogue.json and build/municipal-lives.json for the MCP server to bundle.
// The site reads data/ directly at build time.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LICENCE, ROOT, SITE, loadComponents } from './data.mjs';
import { livesBySystem } from './life-rows.mjs';
import { policyCoverage } from './policy-systems.mjs';
import { systemName } from '../site/src/lib/uniformat.ts';

const components = loadComponents().map((c) => c.latest);
mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build', 'components.json'), JSON.stringify(components));
copyFileSync(join(ROOT, 'data', 'catalogue.json'), join(ROOT, 'build', 'catalogue.json'));

// Per Uniformat system: approved municipal lives (if any) and policy rows typed so far.
const reviewed = livesBySystem();
const pending = policyCoverage();
const lives = [...new Set([...reviewed.keys(), ...pending.keys()])].sort().map((code) => {
  const r = reviewed.get(code);
  const p = pending.get(code);
  return {
    system: code,
    system_name: systemName(code),
    typed: p ? { policies: p.municipalities.size, rows: p.rows } : null,
    reviewed: r ? {
      municipalities: r.municipalities,
      distinct_tables: r.sources,
      checked: r.checked,
      life_types: r.life_types,
      low: r.low, q1: r.q1, median: r.median, q3: r.q3, high: r.high,
      lives: r.entries.map((e) => ({
        min: e.min,
        max: e.max,
        stated_by: e.rows.map((row) => ({ municipality: row.municipality, label: row.label, life_type: row.life_type, document_type: row.document.document_type, review_method: row.review_method, document: row.document.title, year: row.document.year, page: row.page, url: `${row.document.url}#page=${row.page}` })),
      })),
    } : null,
  };
});
writeFileSync(join(ROOT, 'build', 'municipal-lives.json'), JSON.stringify({ overview_url: `${SITE}/plans#lives`, licence: LICENCE, systems: lives }));
console.log(`bundled ${components.length} components, the catalogue and ${lives.length} systems of municipal lives`);

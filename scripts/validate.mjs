// Validates every component file against the schema and checks folder/id/version agree,
// then validates the Municipal Plan Index files in data/municipalities/.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './data.mjs';

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const schema = (name) => ajv.compile(JSON.parse(readFileSync(join(ROOT, 'data/schema', name), 'utf8')));
const validate = schema('component.schema.json');
const validateMunicipality = schema('municipality.schema.json');
const validatePlan = schema('plan-document.schema.json');
const messages = (v) => v.errors.map((e) => `${e.instancePath || '/'} ${e.message}`);

let failed = 0;
const report = (path, errors) => {
  if (errors.length) {
    failed++;
    console.error(`✗ ${path}\n  ${errors.join('\n  ')}`);
  } else console.log(`✓ ${path}`);
};

const dir = join(ROOT, 'data', 'components');
for (const id of readdirSync(dir)) {
  for (const file of readdirSync(join(dir, id)).filter((f) => f.endsWith('.json'))) {
    const path = `data/components/${id}/${file}`;
    const entry = JSON.parse(readFileSync(join(dir, id, file), 'utf8'));
    const errors = [];
    if (!validate(entry)) errors.push(...messages(validate));
    if (entry.id !== id) errors.push(`id "${entry.id}" does not match folder "${id}"`);
    if (`${entry.version}.json` !== file) errors.push(`version "${entry.version}" does not match file name`);
    const [lo, hi] = entry.service_life?.range_years ?? [];
    if (lo > entry.service_life?.median_years || hi < entry.service_life?.median_years) errors.push('median is outside range_years');
    report(path, errors);
  }
}

// Municipal Plan Index: <province>.json holds municipalities; <province>-*-plans.json and
// <province>-*-policies.json hold documents (asset management plans, capital asset policies).
const mdir = join(ROOT, 'data', 'municipalities');
const files = existsSync(mdir) ? readdirSync(mdir).filter((f) => f.endsWith('.json')) : [];
const isDocs = (f) => f.endsWith('-plans.json') || f.endsWith('-policies.json');
const ids = new Set();
for (const file of files.filter((f) => !isDocs(f))) {
  const records = JSON.parse(readFileSync(join(mdir, file), 'utf8'));
  const errors = [];
  for (const r of records) {
    if (!validateMunicipality(r)) errors.push(...messages(validateMunicipality).map((m) => `${r.id}: ${m}`));
    if (ids.has(r.id)) errors.push(`${r.id}: duplicate id`);
    ids.add(r.id);
  }
  // Lower tiers must point at an upper tier in the same file; others must not.
  const tiers = new Map(records.map((r) => [r.id, r.tier]));
  for (const r of records) {
    if (r.tier === 'lower' && tiers.get(r.upper_tier) !== 'upper') errors.push(`${r.id}: upper_tier "${r.upper_tier}" is not an upper-tier municipality`);
    if (r.tier !== 'lower' && r.upper_tier !== null) errors.push(`${r.id}: only lower-tier municipalities have an upper_tier`);
  }
  report(`data/municipalities/${file} (${records.length} municipalities)`, errors);
}
for (const file of files.filter(isDocs)) {
  const docs = JSON.parse(readFileSync(join(mdir, file), 'utf8'));
  const errors = [];
  for (const d of docs) {
    if (!validatePlan(d)) errors.push(...messages(validatePlan).map((m) => `${d.municipality}: ${m}`));
    if (!ids.has(d.municipality)) errors.push(`${d.municipality}: unknown municipality`);
  }
  report(`data/municipalities/${file} (${docs.length} documents)`, errors);
}

// Hand-transcribed rows: [page, label, years or [min, max]] per document, keyed by municipality
// or, for one of several documents, "<municipality>/<part>".
const tdir = join(ROOT, 'pipeline', 'transcribed');
for (const file of existsSync(tdir) ? readdirSync(tdir).filter((f) => f.endsWith('.json') && existsSync(join(mdir, f))) : []) {
  const docs = JSON.parse(readFileSync(join(mdir, file), 'utf8'));
  const { documents } = JSON.parse(readFileSync(join(tdir, file), 'utf8'));
  const errors = [];
  let n = 0;
  for (const [m, t] of Object.entries(documents)) {
    if (!docs.some((d) => (d.part ? `${d.municipality}/${d.part}` : d.municipality) === m && d.url)) errors.push(`${m}: no document with a URL in data/municipalities/${file}`);
    for (const row of t.rows) {
      n++;
      const [page, label, life, assetClass] = row;
      const years = Array.isArray(life) ? life : [life];
      const ok = (row.length === 3 || (row.length === 4 && ['water', 'wastewater', 'stormwater', 'roads', 'bridges', 'other'].includes(assetClass))) && Number.isInteger(page) && page > 0 && typeof label === 'string' && label.length > 0 &&
        years.length <= 2 && years.every((y) => typeof y === 'number' && y > 0 && y <= 200) && (years.length === 1 || years[0] < years[1]);
      if (!ok) errors.push(`${m}: bad row ${JSON.stringify(row)}`);
    }
  }
  report(`pipeline/transcribed/${file} (${n} rows)`, errors);
}

// The HUD CNA table: [page, code, label, family years, elderly years], codes unique.
const hudPath = join(tdir, 'hud-cna-eul.json');
if (existsSync(hudPath)) {
  const { rows } = JSON.parse(readFileSync(hudPath, 'utf8'));
  const errors = [];
  const codes = new Set();
  for (const r of rows) {
    const [page, code, label, family, elderly] = r;
    if (r.length !== 5 || !Number.isInteger(page) || !/^\d+(\.\d+)+$/.test(code) || !label || !(family > 0) || !(elderly > 0)) errors.push(`bad row ${JSON.stringify(r)}`);
    if (codes.has(code)) errors.push(`duplicate code ${code}`);
    codes.add(code);
  }
  report(`pipeline/transcribed/hud-cna-eul.json (${rows.length} rows)`, errors);
}

// Transcribed maintenance tasks and other life sources: every row cites a page and real catalogue ids.
const catalogueIds = new Set(JSON.parse(readFileSync(join(ROOT, 'data', 'catalogue.json'), 'utf8')).map((c) => c.id));
for (const [dir, key] of [['tasks', 'tasks'], ['sources', 'rows']]) {
  const tdir2 = join(tdir, dir);
  for (const file of existsSync(tdir2) ? readdirSync(tdir2).filter((f) => f.endsWith('.json')) : []) {
    const data = JSON.parse(readFileSync(join(tdir2, file), 'utf8'));
    const errors = [];
    if (!data.document?.title || !data.document?.url) errors.push('document needs a title and url');
    for (const [i, r] of (data[key] ?? []).entries()) {
      const where = `${key}[${i}]`;
      const webPage = r.page === null && !/\.pdf($|[?#])/i.test(data.document?.url ?? '');
      if (!webPage && (!Number.isInteger(r.page) || r.page < 1)) errors.push(`${where}: page must be a positive integer (null only for a web page)`);
      if (!r.component_ids?.length || r.component_ids.some((id) => !catalogueIds.has(id))) errors.push(`${where}: component_ids must be catalogue ids`);
      if (dir === 'tasks') {
        if (!r.task) errors.push(`${where}: task is empty`);
        if (!/^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?$/.test(r.frequency ?? '') || r.frequency === 'P') errors.push(`${where}: frequency must be an ISO 8601 duration`);
        if (r.source_wording && r.source_wording.split(/\s+/).length > 15) errors.push(`${where}: source_wording is over 15 words`);
      } else {
        const [lo, hi] = Array.isArray(r.years) ? r.years : [r.years, r.years];
        if (!r.label || !(lo > 0) || !(hi >= lo)) errors.push(`${where}: needs a label and a positive life`);
        if (r.lives_from && !/^https?:\/\//.test(r.lives_from)) errors.push(`${where}: lives_from must be the url of the document the life repeats`);
      }
    }
    if (data.document?.lives_from && !/^https?:\/\//.test(data.document.lives_from)) errors.push('document.lives_from must be the url of the document the lives repeat');
    report(`pipeline/transcribed/${dir}/${file} (${data[key]?.length ?? 0} ${key})`, errors);
  }
}

// Reviewed rows exported by pipeline/review.mjs: each must point at a known document and state a life.
const ldir = join(ROOT, 'data', 'municipalities', 'life-rows');
const knownUrls = new Set(files.filter(isDocs).flatMap((f) => JSON.parse(readFileSync(join(mdir, f), 'utf8')).map((d) => d.url)));
for (const file of existsSync(ldir) ? readdirSync(ldir).filter((f) => f.endsWith('.json')) : []) {
  const { document, rows } = JSON.parse(readFileSync(join(ldir, file), 'utf8'));
  const errors = [];
  if (!knownUrls.has(document?.url)) errors.push(`document url is not in any data/municipalities file: ${document?.url}`);
  if (!ids.has(document?.municipality)) errors.push(`unknown municipality: ${document?.municipality}`);
  for (const r of rows ?? []) {
    const lo = r.life_years_value ?? r.life_years_min, hi = r.life_years_value ?? r.life_years_max;
    if (!Number.isInteger(r.page) || !(r.label_as_written || r.label) || !(lo > 0) || !(hi >= lo) || !r.reviewed_on || !['page', 'image_check', 'text_check'].includes(r.review_method)) errors.push(`${r.id}: needs page, label, a positive life, reviewed_on and review_method`);
  }
  report(`data/municipalities/life-rows/${file} (${rows?.length ?? 0} rows)`, errors);
}
process.exit(failed ? 1 : 0);

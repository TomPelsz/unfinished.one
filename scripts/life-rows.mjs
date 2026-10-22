// Reviewed life rows (data/municipalities/life-rows/, written by `node pipeline/review.mjs export`),
// joined to their documents and grouped by Uniformat system for publishing.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './data.mjs';
import { systemsFor } from './policy-systems.mjs';
import { systemName } from '../site/src/lib/uniformat.ts';

// LIFE_ROWS_DIR points elsewhere for previews; published pages always read the committed folder.
const DIR = process.env.LIFE_ROWS_DIR ?? join(ROOT, 'data', 'municipalities', 'life-rows');

// Every document file in data/municipalities/ that can carry a lineage, keyed by URL.
function documentsByUrl() {
  const mdir = join(ROOT, 'data', 'municipalities');
  const out = new Map();
  for (const f of readdirSync(mdir).filter((f) => f.endsWith('-plans.json') || f.endsWith('-policies.json'))) {
    for (const d of JSON.parse(readFileSync(join(mdir, f), 'utf8'))) if (d.url) out.set(d.url, d);
  }
  return out;
}

// The independent table a document's lives belong to: a shared lineage whose lives are copied
// ("values"), the document a plan takes its lives from, or else the document itself.
export function sourceKey(url, docs = documentsByUrl()) {
  const d = docs.get(url);
  if (d?.lives_from && d.lives_from !== url) return sourceKey(d.lives_from, docs);
  return d?.lineage?.shared === 'values' ? `lineage:${d.lineage.id}` : url;
}

// Municipal documents are cited for their values, not their wording: a published row carries our own
// label, never the document's. The wording as printed stays in source_label, for matching rows to
// components and checking them against their page; public outputs drop it.
const CLASS_LABEL = {
  water: 'Water asset (type not stated)', wastewater: 'Wastewater asset (type not stated)', stormwater: 'Stormwater asset (type not stated)',
  roads: 'Road asset (type not stated)', bridges: 'Bridge or culvert (type not stated)', facilities: 'Building (whole or not broken down)', other: 'Other asset',
};
// Generic material names, added when a row names exactly one, so a pipe or culvert row keeps its material.
const MATERIALS = [
  [/\bpvc\b|polyvinyl/i, 'PVC'], [/\bhdpe\b|polyethylene/i, 'polyethylene'], [/ductile|\bdi\b/i, 'ductile iron'], [/cast iron|\bci\b/i, 'cast iron'],
  [/asbestos|\bac\b/i, 'asbestos cement'], [/vitrified|\bclay\b|\bvc\b/i, 'clay'], [/concrete|\bcpp\b|\brcp\b/i, 'concrete'],
  [/corrugated|\bcsp\b|\bsteel\b/i, 'steel'], [/asphalt|\bhcb\b/i, 'asphalt'], [/gravel/i, 'gravel'], [/\bwood|timber/i, 'wood'],
];
let componentsByRow;
function mappedComponents(municipality, label, type) {
  if (!componentsByRow) {
    componentsByRow = new Map();
    const names = new Map(JSON.parse(readFileSync(join(ROOT, 'data', 'catalogue.json'), 'utf8')).map((c) => [c.id, c.name]));
    const dir = join(ROOT, 'pipeline', 'entries');
    for (const f of existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []) {
      for (const [id, e] of Object.entries(JSON.parse(readFileSync(join(dir, f), 'utf8')).entries ?? {})) {
        for (const [m, l, t] of e.municipal ?? []) {
          const key = `${m}|${l}|${t ?? ''}`;
          componentsByRow.set(key, [...new Set([...(componentsByRow.get(key) ?? []), names.get(id) ?? id])]);
        }
      }
    }
  }
  return componentsByRow.get(`${municipality}|${label}|${type}`) ?? componentsByRow.get(`${municipality}|${label}|`) ?? [];
}
export function publicLabel(municipality, label, type, systems, assetClass) {
  const components = mappedComponents(municipality, label, type);
  if (components.length) return components.join('; ');
  const material = MATERIALS.filter(([re]) => re.test(label)).map(([, name]) => name);
  const suffix = material.length === 1 ? `, ${material[0]}` : '';
  if (systems.length) return systems.map((c) => systemName(c)).join(', ') + suffix;
  return (CLASS_LABEL[assetClass] ?? 'Other asset') + suffix;
}

// One flat list of approved rows, each with its document and the systems its label maps to. Rows in the
// public repository carry our label and systems already, without the document's wording (see
// scripts/export-public.mjs); rows here are matched from their wording.
export function loadLifeRows() {
  if (!existsSync(DIR)) return [];
  const docs = documentsByUrl();
  const out = [];
  for (const f of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
    const { document, rows } = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    const lineage = docs.get(document.url)?.lineage ?? null;
    const source = sourceKey(document.url, docs);
    for (const r of rows) {
      const systems = r.systems ?? systemsFor(r.label_as_written, r.asset_class);
      const min = r.life_years_value ?? r.life_years_min;
      const max = r.life_years_value ?? r.life_years_max;
      if (min == null || max == null) continue;
      out.push({
        id: r.id,
        municipality: document.municipality,
        document: { title: document.title, year: document.year, url: document.url, document_type: document.document_type },
        page: r.page,
        label: r.label ?? publicLabel(document.municipality, r.label_as_written, document.document_type, systems, r.asset_class ?? 'facilities'),
        source_label: r.label_as_written ?? null,
        min,
        max,
        life_type: r.life_type,
        reviewed_on: r.reviewed_on,
        review_method: r.review_method ?? 'page',
        lineage,
        source,
        asset_class: r.asset_class ?? 'facilities',
        systems,
      });
    }
  }
  return out;
}

// Rows from documents that share a table outright count once: same source, same system, same lives.
// "source" is a distinct table (see sourceKey). Policies that share only a form ("layout") set their
// own numbers, so each counts.
export function livesBySystem(rows = loadLifeRows()) {
  const systems = new Map();
  for (const r of rows) {
    const source = r.source ?? (r.lineage?.shared === 'values' ? `lineage:${r.lineage.id}` : r.document.url);
    const shared = source !== r.document.url;
    for (const code of r.systems) {
      if (!systems.has(code)) systems.set(code, { entries: new Map(), municipalities: new Set(), sources: new Set(), byPage: 0, byImage: 0, byText: 0, lifeTypes: {} });
      const s = systems.get(code);
      s.lifeTypes[r.life_type] = (s.lifeTypes[r.life_type] ?? 0) + 1;
      if (r.review_method === 'text_check') s.byText++;
      else if (r.review_method === 'image_check') s.byImage++;
      else s.byPage++;
      s.municipalities.add(r.municipality);
      s.sources.add(source);
      const key = shared ? `${source}|${r.min}-${r.max}` : r.id;
      if (!s.entries.has(key)) s.entries.set(key, { min: r.min, max: r.max, source, rows: [] });
      s.entries.get(key).rows.push(r);
    }
  }
  return new Map(
    [...systems].sort(([a], [b]) => a.localeCompare(b)).map(([code, s]) => {
      const entries = [...s.entries.values()].sort((a, b) => a.min - b.min || a.max - b.max);
      // A range counts at its midpoint for the quartiles and median.
      const mids = entries.map((e) => (e.min + e.max) / 2).sort((a, b) => a - b);
      const quantile = (q) => {
        const i = (mids.length - 1) * q, lo = Math.floor(i);
        return Math.round((mids[lo] + (mids[Math.ceil(i)] - mids[lo]) * (i - lo)) * 10) / 10;
      };
      return [code, {
        code,
        entries,
        municipalities: s.municipalities.size,
        sources: s.sources.size,
        checked: { page: s.byPage, image_check: s.byImage, text_check: s.byText },
        life_types: s.lifeTypes,
        low: Math.min(...entries.map((e) => e.min)),
        high: Math.max(...entries.map((e) => e.max)),
        q1: quantile(0.25),
        median: quantile(0.5),
        q3: quantile(0.75),
      }];
    }),
  );
}

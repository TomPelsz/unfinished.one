// Loads every component version from data/components/<id>/<version>.json.
// Version files are immutable: a change means a new file with a higher version.
import { readdirSync, readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Found by walking up from the working directory, so it still works once a bundler
// (Astro, wrangler) has moved this module somewhere else.
function findRoot(dir = process.cwd()) {
  if (existsSync(join(dir, 'data', 'components'))) return dir;
  const parent = dirname(dir);
  if (parent === dir) throw new Error('data/components not found above ' + process.cwd());
  return findRoot(parent);
}

export const ROOT = findRoot();
export const SITE = 'https://unfinished.one';
export const LICENCE = 'CC-BY-4.0';

const semver = (v) => v.split('.').map(Number);
const compare = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

export function withCitation(entry) {
  const name = entry.names[0];
  const year = entry.last_reviewed.slice(0, 4);
  const versioned_url = `${SITE}/c/${entry.id}/v/${entry.version}`;
  return {
    ...entry,
    canonical_url: `${SITE}/c/${entry.id}`,
    versioned_url,
    licence: LICENCE,
    citation: `unfinished.one (${year}). ${name}, v${entry.version}. ${versioned_url}`,
  };
}

// Every component with all its versions, including any whose latest version withdraws the entry.
// Permanent version pages use this; everything that serves "the library" uses loadComponents.
export function loadAllComponents() {
  const dir = join(ROOT, 'data', 'components');
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const versions = readdirSync(join(dir, d.name))
        .filter((f) => f.endsWith('.json'))
        .map((f) => withCitation(JSON.parse(readFileSync(join(dir, d.name, f), 'utf8'))))
        .sort((a, b) => compare(b.version, a.version));
      return { id: d.name, latest: versions[0], versions };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Components whose latest version is a live entry (not withdrawn).
export const loadComponents = () => loadAllComponents().filter((c) => c.latest.status !== 'withdrawn');

// Components whose latest version withdraws the entry, with the versions that came before.
export const loadWithdrawn = () =>
  loadAllComponents()
    .filter((c) => c.latest.status === 'withdrawn')
    .map((c) => ({ ...c, history: c.versions.filter((v) => v.status !== 'withdrawn') }));

const readJson = (...path) => JSON.parse(readFileSync(join(ROOT, ...path), 'utf8'));

// The ~100 components v1 covers, each with its published entry (latest version) when one exists.
export function loadCatalogue() {
  const published = new Map(loadComponents().map((c) => [c.id, c.latest]));
  return readJson('data', 'catalogue.json').map((item) => ({ ...item, entry: published.get(item.id) ?? null }));
}

// data/municipalities/ holds one file per province: <province>.json (municipalities),
// <province>-tca-policies.json (capital asset policies) and, for Ontario, <province>-*-plans.json (asset management plans).
const municipalFiles = (test) =>
  readdirSync(join(ROOT, 'data', 'municipalities')).filter((f) => f.endsWith('.json') && test(f)).sort();
export const loadMunicipalities = () =>
  municipalFiles((f) => !f.endsWith('-plans.json') && !f.endsWith('-policies.json')).flatMap((f) => readJson('data', 'municipalities', f));
export const loadPilotPlans = () => readJson('data', 'municipalities', 'ontario-pilot-plans.json');
// Every asset management plan on file: the pilot plans and the ones collected after them.
export const loadPlans = () => municipalFiles((f) => f.endsWith('-plans.json')).flatMap((f) => readJson('data', 'municipalities', f));
export const loadTcaPolicies = () => municipalFiles((f) => f.endsWith('-tca-policies.json')).flatMap((f) => readJson('data', 'municipalities', f));

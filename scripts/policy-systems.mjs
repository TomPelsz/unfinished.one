// Maps capital asset policy rows to Uniformat level 2 systems. Policies set lives per system
// ("HVAC 20 years"), not per catalogue component, so this is the level at which they can be joined.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './data.mjs';

// A label can match several rules ("Mechanical/Electrical" -> D30 and D50).
const RULES = [
  ['A10', /substructure|foundation/],
  ['B10', /superstructure|framing|\bstructure\b|building frame/],
  ['B20', /exterior|envelope|cladding|siding|window|\bdoors?\b|\bshell - other\b/],
  ['B30', /roof|soffit|shingle|storage domes/],
  ['C10', /interior|gypsum|panelling|partition/],
  ['C30', /flooring|carpet/],
  ['D10', /elevator|conveying/],
  ['D20', /plumbing|piping|cistern|septic|water treatment|\bfixtures\b/],
  ['D30', /hvac|heating|air condition|furnace|boiler|condenser|chiller|compressor|refrigeration|air distribution|mechanical/],
  ['D40', /sprinkler|fire system|fire protection|fire safety|fire suppression|fire alarm|alarm panel|fire panel|plumbing\/fire/],
  ['D50', /electrical|lighting|wiring/],
];

// Prefixes that group rows without naming a system; the part after them is what is mapped.
const WRAPPERS = /^(compound buildings|buildings and improvements|building improvements|building components|buildings|mechanical systems) - /;

const match = (text) => RULES.filter(([, re]) => re.test(text)).map(([code]) => code);

// Infrastructure rows carry an asset class; the class sets the Uniformat site code, refined by label.
const INFRA = {
  water: () => ['G3010'],
  wastewater: () => ['G3020'],
  stormwater: () => ['G3030'],
  bridges: (l) => (/\bculverts?\b/.test(l) && !/\bbridges?\b/.test(l) ? ['G3030'] : ['G2010']),
  roads: (l) =>
    /\bsidewalks?\b|\bwalkways?\b/.test(l) ? ['G2030']
    : /\bparking\b/.test(l) ? ['G2020']
    : /\bstreet ?light|\blight poles?\b|\blighting\b|\blamps?\b|\bluminaires?\b/.test(l) ? ['G4020']
    : /\bsignals?\b|\btraffic\b/.test(l) ? ['G4090']
    : ['G2010'],
  other: () => [],
};

export function systemsFor(label, assetClass = 'facilities') {
  if (INFRA[assetClass]) return INFRA[assetClass](label.toLowerCase());
  if (/no foundation/i.test(label)) return []; // "No foundation (eg: greenhouse)" is a building type
  let l = label.toLowerCase();
  while (WRAPPERS.test(l)) l = l.replace(WRAPPERS, '');
  if (/sprinkler/.test(l) && !/fire/.test(l)) return ['D40']; // filed under plumbing by some policies
  // A group heading ("Interior Construction - Doors", "Plumbing - Boiler") decides for its rows, as the policy grouped them.
  const [head] = l.split(' - ');
  const byHead = head !== l ? match(head) : [];
  if (byHead.length) return byHead;
  let codes = match(l);
  if (/lighting/.test(l)) codes = codes.filter((c) => c !== 'B20' && c !== 'C10'); // "Exterior Lighting" is electrical
  if (/elevator/.test(l)) codes = codes.filter((c) => c !== 'D30'); // "Mechanical Elevator" is conveying
  return codes;
}

// For each system code: the municipalities whose policy sets a life for it, and how many rows do.
// Transcribed policy files: pipeline/transcribed/<province>-tca-policies.json.
const policyDocuments = () => {
  const dir = join(ROOT, 'pipeline', 'transcribed');
  return existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('-tca-policies.json')).sort().flatMap((f) => Object.entries(JSON.parse(readFileSync(join(dir, f), 'utf8')).documents))
    : [];
};

// The public repository has no transcribed rows, only their counts (written by scripts/export-public.mjs).
const COUNTS = join(ROOT, 'data', 'policy-coverage.json');
const counts = () => (existsSync(join(ROOT, 'pipeline', 'transcribed')) || !existsSync(COUNTS) ? null : JSON.parse(readFileSync(COUNTS, 'utf8')));

export function policyCoverage() {
  const c = counts();
  if (c) return new Map(Object.entries(c.systems).map(([code, s]) => [code, { municipalities: new Set(s.municipalities), rows: s.rows }]));
  const coverage = new Map();
  for (const [municipality, { rows }] of policyDocuments()) {
    for (const [, label, , assetClass] of rows) {
      for (const code of systemsFor(label, assetClass)) {
        if (!coverage.has(code)) coverage.set(code, { municipalities: new Set(), rows: 0 });
        const c = coverage.get(code);
        c.municipalities.add(municipality);
        c.rows++;
      }
    }
  }
  return coverage;
}

// Transcribed rows per municipality.
export function transcribedRows() {
  const c = counts();
  if (c) return new Map(Object.entries(c.transcribed_rows));
  return new Map(policyDocuments().map(([m, d]) => [m, d.rows.length]));
}

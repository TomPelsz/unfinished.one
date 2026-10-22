import { test } from 'node:test';
import assert from 'node:assert/strict';
import { livesBySystem, sourceKey } from '../life-rows.mjs';
import { systemsFor } from '../policy-systems.mjs';

test('policy labels map to Uniformat systems as the policy grouped them', () => {
  for (const [label, codes] of [
    ['HVAC Systems', ['D30']],
    ['Interior Construction - Doors', ['C10']],
    ['Exterior Closure - Standard Doors', ['B20']],
    ['Plumbing - Sprinkler System', ['D40']],
    ['Elevator - Mechanical Elevator', ['D10']],
    ['Exterior Lighting', ['D50']],
    ['Mechanical/Electrical', ['D30', 'D50']],
    ['Building Components - Services (HVAC, lighting, communication, plumbing etc.)', ['D20', 'D30', 'D50']],
    ['Main Building', []],
    ['Electrical/Plumbing/Fire', ['D20', 'D40', 'D50']],
    ['Permanent buildings - Brick, stone or cement', []],
    ['No foundation (eg: greenhouse)', []],
    ['Exterior Shell - Brick / Masonry/Steel', ['B20']],
  ]) assert.deepEqual(systemsFor(label), codes, label);
});

const row = (id, municipality, label, min, max, lineage = null) => ({
  id, municipality, label, min, max, lineage, page: 1, life_type: 'accounting',
  document: { title: 't', year: 2020, url: `https://example.org/${municipality}.pdf` },
  systems: systemsFor(label),
});

test('a copied table counts once; a shared form with its own numbers does not', () => {
  const copied = { id: 'hastings', shared: 'values' };
  const form = { id: 'grey', shared: 'layout' };
  const s = livesBySystem([
    row('a1', 'on-a', 'HVAC Systems', 20, 25, copied),
    row('b1', 'on-b', 'HVAC Systems', 20, 25, copied),
    row('c1', 'on-c', 'HVAC', 15, 15, form),
    row('d1', 'on-d', 'HVAC', 20, 20, form),
    row('e1', 'on-e', 'Furnace', 25, 25),
  ]).get('D30');
  assert.equal(s.municipalities, 5);
  assert.equal(s.sources, 4);
  assert.equal(s.entries.length, 4);
  assert.deepEqual(s.entries.find((e) => e.min === 20 && e.max === 25).rows.map((r) => r.municipality), ['on-a', 'on-b']);
  assert.deepEqual([s.low, s.high], [15, 25]);
  // Midpoints 15, 20, 22.5, 25.
  assert.deepEqual([s.q1, s.median, s.q3], [18.8, 21.3, 23.1]);
});

test('a plan that takes its lives from a policy counts with the policy', () => {
  const docs = new Map([
    ['https://x.org/policy.pdf', { url: 'https://x.org/policy.pdf', lineage: { id: 'grey', shared: 'layout' } }],
    ['https://x.org/plan.pdf', { url: 'https://x.org/plan.pdf', lives_from: 'https://x.org/policy.pdf' }],
    ['https://x.org/copy.pdf', { url: 'https://x.org/copy.pdf', lineage: { id: 'hastings', shared: 'values' } }],
    ['https://x.org/plan2.pdf', { url: 'https://x.org/plan2.pdf', lives_from: 'https://x.org/copy.pdf' }],
  ]);
  assert.equal(sourceKey('https://x.org/plan.pdf', docs), 'https://x.org/policy.pdf');
  assert.equal(sourceKey('https://x.org/plan2.pdf', docs), 'lineage:hastings');
  assert.equal(sourceKey('https://x.org/other.pdf', docs), 'https://x.org/other.pdf');
});

test('no reviewed rows means no systems', () => {
  assert.equal(livesBySystem([]).size, 0);
});

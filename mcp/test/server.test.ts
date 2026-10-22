import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyModifiers, handle } from '../src/server.ts';
import { addMonths, calendar, workOrders } from '../src/schedule.ts';

let nextId = 1;
const call = (name: string, args: Record<string, unknown>) => {
  const reply = handle({ jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name, arguments: args } }) as any;
  return reply.result;
};
const data = (name: string, args: Record<string, unknown>) => call(name, args).structuredContent;

test('initialize echoes a supported protocol version and falls back otherwise', () => {
  const ok = handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }) as any;
  assert.equal(ok.result.protocolVersion, '2025-06-18');
  const old = handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }) as any;
  assert.equal(old.result.protocolVersion, '2025-11-25');
});

test('notifications get no reply and unknown methods get -32601', () => {
  assert.equal(handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal((handle({ jsonrpc: '2.0', id: 3, method: 'nope' }) as any).error.code, -32601);
});

test('every tool is listed as read-only with an input schema', () => {
  const { tools } = (handle({ jsonrpc: '2.0', id: 4, method: 'tools/list' }) as any).result;
  assert.ok(tools.length >= 7);
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.inputSchema.type, 'object');
    assert.equal('run' in t, false);
  }
});

test('results carry citation fields', () => {
  const e = data('get_component', { id: 'rtu-gas-electric' });
  for (const key of ['canonical_url', 'citation', 'licence', 'version', 'confidence']) assert.ok(e[key], key);
});

test('unknown ids are tool errors, not protocol errors', () => {
  const r = call('get_component', { id: 'nope' });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /search_components/);
});

test('modifiers shift median and range; unlisted names are reported, not applied', () => {
  const life = { median_years: 15, range_years: [12, 20], modifiers: [{ factor: 'coastal salt exposure', effect_years: -3 }] };
  const r = applyModifiers(life, ['coastal salt exposure', 'bogus']);
  assert.equal(r.median_years, 12);
  assert.deepEqual(r.range_years, [9, 17]);
  assert.deepEqual(r.ignored_modifiers, ['bogus']);
});

test('get_service_life says what its range means', () => {
  const r = data('get_service_life', { id: 'roof-metal', modifiers: ['bogus'] });
  assert.equal(r.range_basis, 'source_spread');
  assert.ok(r.source_documents > 1);
  assert.equal(data('get_service_life', { id: 'fan-coil' }).source_documents, 1);
  assert.ok(r.range_years[0] <= r.median_years && r.median_years <= r.range_years[1]);
  assert.deepEqual(r.ignored_modifiers, ['bogus']);
});

test('estimate_remaining_life never goes below zero', () => {
  const r = data('estimate_remaining_life', { id: 'rtu-gas-electric', install_year: 1990, as_of_year: 2026 });
  assert.equal(r.remaining_years_median, 0);
  assert.equal(r.past_median, true);
});

test('get_pm_tasks returns only the requested criticality, and an empty list when none are sourced', () => {
  const r = data('get_pm_tasks', { id: 'rtu-gas-electric', criticality: 'medium' });
  assert.ok(Array.isArray(r.pm_tasks));
  assert.ok(r.pm_tasks.every((t: any) => t.criticality === 'medium'));
});

for (const [text, id] of [
  ['RTU-3 Lennox 2009', 'rtu-gas-electric'],
  ['AHU1 penthouse', 'ahu-indoor'],
  ['HWT basement', 'water-heater-gas-tank'],
  ['Gas fired unit heater - garage', 'unit-heater-gas'],
  ['hot water boilers', 'boiler-hw-noncondensing'],
  ['FACP main lobby', 'fire-alarm-panel'],
  ['Zamboni', 'ice-resurfacer'],
  ['EPDM roof section B', 'roof-epdm'],
  ['Exhaust fan EF-2', 'exhaust-fan'],
] as const) {
  test(`map_classification: "${text}" -> ${id}`, () => {
    assert.equal(data('map_classification', { text }).best.id, id);
  });
}

test('map_classification flags published entries and handles codes and misses', () => {
  const rtu = data('map_classification', { text: 'RTU' }).best;
  assert.equal(rtu.entry_published, true);
  assert.ok(rtu.canonical_url);
  assert.equal(data('map_classification', { text: 'VAV box' }).best.entry_published, false);
  assert.ok(data('map_classification', { text: 'D3020' }).best.uniformat.startsWith('D3020'));
  assert.equal(data('map_classification', { text: 'xyzzy' }).best, null);
  // Generic words alone must not match: "systems" once mapped HVAC to a sprinkler alias.
  assert.notEqual(data('map_classification', { text: 'HVAC Systems' }).best?.id, 'sprinkler-wet');
});

test('get_municipal_lives resolves a planned component to its Uniformat system', () => {
  const r = data('get_municipal_lives', { id: 'roof-epdm' });
  assert.equal(r.system, 'B30');
  assert.equal(r.system_name, 'Roofing');
  assert.ok(r.reviewed.lives.every((l: any) => l.stated_by.every((x: any) => ['accounting', 'planning'].includes(x.life_type))));
  assert.ok(r.typed.policies > 0);
  assert.ok(r.reviewed === null || r.reviewed.distinct_tables > 0);
  assert.equal(data('get_municipal_lives', { uniformat: 'D3050' }).system, 'D30');
});

test('get_municipal_lives rejects unknown ids and missing codes as tool errors', () => {
  for (const args of [{ id: 'not-a-component' }, {}, { uniformat: 'HVAC' }]) {
    const res = call('get_municipal_lives', args);
    assert.equal(res.isError, true);
  }
});

test('addMonths keeps the day where it exists and clamps month ends', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
});

test('coinciding intervals become one visit named after the longest', () => {
  const tasks = [
    { task: 'm', frequency: 'P1M' },
    { task: 'q', frequency: 'P3M' },
    { task: 's', frequency: 'P6M' },
    { task: 'a', frequency: 'P1Y' },
    { task: 'd', frequency: 'P1D' },
  ];
  assert.deepEqual(workOrders(tasks).map((w) => w.name), ['Daily', 'Monthly', 'Quarterly', 'Semi-annual', 'Annual']);
  const visits = calendar(tasks, '2026-01-15', 12);
  assert.equal(visits.length, 12);
  assert.equal(visits[2].work_order, 'Quarterly');
  assert.deepEqual(visits[5].tasks.map((t) => t.task), ['m', 'q', 's']);
  assert.equal(visits[11].date, '2027-01-15');
  assert.equal(visits[11].work_order, 'Annual');
  assert.deepEqual(visits[11].tasks.map((t) => t.task), ['m', 'q', 's', 'a']);
});

test('get_pm_schedule explains when no tasks are sourced', () => {
  const r = data('get_pm_schedule', { id: 'curb-gutter' });
  assert.deepEqual(r.work_orders, []);
  assert.match(r.note, /No preventive maintenance/);
  assert.equal(call('get_pm_schedule', { id: 'curb-gutter', start_date: '21/10/2026' }).isError, true);
});

test('get_municipal_lives groups infrastructure at Uniformat level 3', () => {
  const r = data('get_municipal_lives', { id: 'watermain-pvc' });
  assert.equal(r.system, 'G3010');
  assert.equal(r.system_name, 'Water supply');
  assert.ok(r.reviewed.distinct_tables > 0);
});

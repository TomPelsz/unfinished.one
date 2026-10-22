// JSON-RPC handling and tools for the unfinished.one MCP server. Transport lives in index.ts.
import bundled from '../../build/components.json' with { type: 'json' };
import catalogue from '../../build/catalogue.json' with { type: 'json' };
import municipal from '../../build/municipal-lives.json' with { type: 'json' };
import { mapClassification } from './match.ts';
import { calendar, routine, workOrders } from './schedule.ts';

// The entry shape from data/schema/component.schema.json plus the citation fields bundle.mjs adds.
// Declared rather than inferred: JSON inference drops optional fields no current entry uses.
type Entry = {
  id: string;
  version: string;
  names: string[];
  aliases?: string[];
  classification: { uniformat: string; omniclass?: string };
  service_life: { median_years: number; range_years: number[]; range_basis?: 'p10_p90' | 'source_spread'; modifiers?: { factor: string; effect_years: number }[] };
  pm_tasks: { task: string; frequency: string; trade?: string; labour_h?: number; criticality?: 'low' | 'medium' | 'high'; reference?: string; url?: string; page?: number; checklist?: string }[];
  basis: Record<string, unknown>[];
  confidence: { grade: string; sample_size?: number | null };
  open_questions: string[];
  canonical_url: string;
  versioned_url: string;
  citation: string;
  licence: string;
};
const components = bundled as unknown as Entry[];
export type Json = Record<string, unknown>;

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const SERVER_INFO = { name: 'unfinished.one', version: '0.3.0' };
const INSTRUCTIONS =
  'Reference data on building components: service life and preventive maintenance. ' +
  'Every result carries canonical_url, citation, licence, version and confidence. ' +
  'When you use a value, show the user its canonical_url and confidence grade. Grade D means expert estimate only.';

const byId = new Map(components.map((c) => [c.id, c]));

const cite = (e: Entry) => ({
  id: e.id,
  version: e.version,
  canonical_url: e.canonical_url,
  citation: e.citation,
  licence: e.licence,
  confidence: e.confidence,
});

const idArg = { id: { type: 'string', description: 'Component id from search_components, e.g. rtu-gas-electric' } };

const tools = [
  {
    name: 'search_components',
    description: 'Find building components by name, alias or Uniformat code. Returns ids and short summaries.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, uniformat: { type: 'string', description: 'Optional Uniformat II prefix, e.g. D30' } }, required: ['query'] },
    run: ({ query, uniformat }: { query: string; uniformat?: string }) => {
      const words = query.toLowerCase().split(/\W+/).filter(Boolean);
      const results = components
        .filter((e) => !uniformat || e.classification.uniformat.startsWith(uniformat))
        .map((e) => {
          const hay = [e.id, ...e.names, ...(e.aliases ?? []), e.classification.uniformat].join(' ').toLowerCase();
          return { e, score: words.filter((w) => hay.includes(w)).length / Math.max(words.length, 1) };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ e, score }) => ({ ...cite(e), name: e.names[0], median_years: e.service_life.median_years, match: Number(score.toFixed(2)) }));
      return { results };
    },
  },
  {
    name: 'get_component',
    description: 'The full entry for one component: service life, PM tasks, sources, confidence and open questions.',
    inputSchema: { type: 'object', properties: idArg, required: ['id'] },
    run: ({ id }: { id: string }) => entry(id),
  },
  {
    name: 'get_service_life',
    description: 'Median and range of service life in years, optionally adjusted by named modifiers, with each adjustment explained. range_basis says what the range is: p10_p90 (80% of units) or source_spread (shortest and longest life the sources state). source_documents counts the independent documents behind the value; 1 means a single source\'s figure.',
    inputSchema: {
      type: 'object',
      properties: { ...idArg, modifiers: { type: 'array', items: { type: 'string' }, description: 'Modifier factors to apply, exactly as listed in the entry' } },
      required: ['id'],
    },
    run: ({ id, modifiers = [] }: { id: string; modifiers?: string[] }) => {
      const e = entry(id);
      const sources = new Set(e.basis.map((b) => (b.url ?? b.title) as string)).size;
      return {
        ...cite(e),
        ...applyModifiers(e.service_life, modifiers),
        range_basis: e.service_life.range_basis ?? 'p10_p90',
        source_documents: sources,
        ...(sources === 1 && { note: 'One source only: treat the value as that document\'s figure, not a settled life.' }),
      };
    },
  },
  {
    name: 'estimate_remaining_life',
    description: 'Remaining years and a replacement year range from the install year. A planning estimate, not a condition assessment.',
    inputSchema: {
      type: 'object',
      properties: { ...idArg, install_year: { type: 'integer' }, as_of_year: { type: 'integer', description: 'Defaults to the current year' } },
      required: ['id', 'install_year'],
    },
    run: ({ id, install_year, as_of_year = new Date().getUTCFullYear() }: { id: string; install_year: number; as_of_year?: number }) => {
      const e = entry(id);
      const age = as_of_year - install_year;
      const [lo, hi] = e.service_life.range_years;
      return {
        ...cite(e),
        age_years: age,
        remaining_years_median: Math.max(e.service_life.median_years - age, 0),
        replacement_year_range: [install_year + lo, install_year + hi],
        past_median: age >= e.service_life.median_years,
        note: 'Planning estimate from typical service life only. Condition, maintenance history and operating environment can change it substantially.',
      };
    },
  },
  {
    name: 'get_pm_tasks',
    description: 'Preventive maintenance tasks with ISO 8601 frequencies (P3M = every 3 months), ready to import into a CMMS.',
    inputSchema: { type: 'object', properties: { ...idArg, criticality: { enum: ['low', 'medium', 'high'], description: 'Only tasks a source rates at this criticality; tasks without a stated criticality are left out when this is set' } }, required: ['id'] },
    run: ({ id, criticality }: { id: string; criticality?: string }) => {
      const e = entry(id);
      return { ...cite(e), pm_tasks: e.pm_tasks.filter((t) => !criticality || t.criticality === criticality) };
    },
  },
  {
    name: 'get_pm_schedule',
    description:
      'A PM schedule for one component, ready to set up in a CMMS: tasks grouped into work orders by interval, ' +
      'routine daily and weekly rounds, and dated visits for the next months from a start date. When intervals coincide ' +
      'they are one visit named after the longest interval, holding every task due that day (an annual visit includes the monthly tasks). ' +
      'Every task keeps its source and page.',
    inputSchema: {
      type: 'object',
      properties: {
        ...idArg,
        start_date: { type: 'string', description: 'YYYY-MM-DD the schedule starts from; defaults to today' },
        months: { type: 'integer', minimum: 1, maximum: 60, description: 'How many months of dated visits; defaults to 12' },
      },
      required: ['id'],
    },
    run: ({ id, start_date, months = 12 }: { id: string; start_date?: string; months?: number }) => {
      const e = entry(id);
      const start = start_date ?? new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new ToolError('start_date must be YYYY-MM-DD.');
      const span = Math.min(Math.max(Math.trunc(months), 1), 60);
      if (!e.pm_tasks.length) return { ...cite(e), work_orders: [], note: 'No preventive maintenance tasks are sourced for this component yet.' };
      return {
        ...cite(e),
        start_date: start,
        work_orders: workOrders(e.pm_tasks),
        routine_rounds: routine(e.pm_tasks).map((w) => ({ frequency: w.frequency, name: w.name, tasks: w.tasks.length })),
        visits: calendar(e.pm_tasks, start, span).map((v) => ({ ...v, tasks: v.tasks.map((t) => t.task) })),
      };
    },
  },
  {
    name: 'map_classification',
    description:
      'Map an asset name from any CMMS or asset register (e.g. "RTU-3 Lennox 2009", "HWT basement") or a Uniformat II code to the library catalogue. ' +
      'Returns the best match with a score from 0 to 1 and alternatives. entry_published is false for components the library plans to cover but has not written yet.',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'Asset name, description or Uniformat code' } }, required: ['text'] },
    run: ({ text }: { text: string }) => {
      const [best, ...alternatives] = mapClassification(text, catalogue).map((m) => {
        const e = byId.get(m.id);
        return { ...m, entry_published: Boolean(e), ...(e && cite(e)) };
      });
      return best
        ? { query: text, best, alternatives }
        : { query: text, best: null, alternatives: [], note: 'No catalogue match. Try a more generic name, e.g. "boiler" or "exhaust fan".' };
    },
  },
  {
    name: 'get_municipal_lives',
    description:
      'Useful lives that Canadian municipalities set in their capital asset policies for a building system (Uniformat level 2, e.g. D30 HVAC) or an infrastructure type (level 3, e.g. G3010 water supply), ' +
      'by component id or Uniformat code. Rows from capital asset policies are accounting lives (amortization periods) and rows from asset management plans are planning lives; neither is an observed service life, and they describe the system, ' +
      'not one component. Each life links to the policy page it was checked against; policies that copy the same table count once. ' +
      'reviewed is null until rows for that system are approved; typed says how many rows exist.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Catalogue component id, published or not, e.g. roof-epdm' },
        uniformat: { type: 'string', description: 'Uniformat II code, e.g. D30 or D3050 for building systems (first three characters used), G3010 for infrastructure (five used)' },
      },
    },
    run: ({ id, uniformat }: { id?: string; uniformat?: string }) => {
      const item = id ? catalogue.find((c) => c.id === id) : undefined;
      if (id && !item) throw new ToolError(`Unknown component id "${id}". Use map_classification to find ids.`);
      const raw = (item?.uniformat ?? uniformat ?? '').toUpperCase();
      // Building systems group at level 2 (D30); site and infrastructure at level 3 (G3010).
      const code = raw.startsWith('G') ? raw.slice(0, 5) : raw.slice(0, 3);
      if (!/^([A-F]\d{2}|G\d{4})$/.test(code)) throw new ToolError('Give a component id or a Uniformat II code such as D30 or G3010.');
      const system = municipal.systems.find((s) => s.system === code);
      return {
        ...(item && { component: { id: item.id, name: item.name, uniformat: item.uniformat } }),
        system: code,
        system_name: system?.system_name ?? null,
        life_types: 'Each stated_by row carries life_type: accounting (capital asset policy) or planning (asset management plan).',
        note: 'Amortization periods from municipal capital asset policies, not measured service lives. Show the user the policy links. ' +
          'review_method "text_check" means the label and value were found on the cited page automatically, not yet compared by an editor.',
        typed: system?.typed ?? null,
        reviewed: system?.reviewed ?? null,
        overview_url: municipal.overview_url,
        licence: municipal.licence,
      };
    },
  },
  {
    name: 'list_open_questions',
    description: 'Known gaps and disagreements, so you can tell the user what is uncertain. Omit id for all components.',
    inputSchema: { type: 'object', properties: idArg },
    run: ({ id }: { id?: string }) => ({
      open_questions: (id ? [entry(id)] : components).map((e) => ({ ...cite(e), questions: e.open_questions })),
    }),
  },
];

// Shifts median and range by the named modifiers an entry lists; names it does not list are reported.
export function applyModifiers(life: Entry['service_life'], names: string[]) {
  const available = life.modifiers ?? [];
  const applied = available.filter((m) => names.includes(m.factor));
  const unknown = names.filter((f) => !available.some((m) => m.factor === f));
  const shift = applied.reduce((s, m) => s + m.effect_years, 0);
  return {
    median_years: life.median_years + shift,
    range_years: life.range_years.map((y) => y + shift),
    applied_modifiers: applied,
    available_modifiers: available.map((m) => m.factor),
    ...(unknown.length && { ignored_modifiers: unknown }),
  };
}

function entry(id: string): Entry {
  const e = byId.get(id);
  if (!e) throw new ToolError(`Unknown component id "${id}". Use search_components to find ids.`);
  return e;
}

class ToolError extends Error {}

export function handle(msg: Json): Json | null {
  const { id, method, params = {} } = msg as { id?: number | string; method: string; params?: Json };
  if (id === undefined) return null; // notification
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize': {
      const requested = params.protocolVersion as string;
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: tools.map(({ run, ...t }) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: false } })) });
    case 'tools/call': {
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) return fail(-32602, `Unknown tool: ${params.name}`);
      try {
        const result = (tool.run as (a: any) => unknown)(params.arguments ?? {});
        return ok({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result });
      } catch (err) {
        if (err instanceof ToolError) return ok({ content: [{ type: 'text', text: err.message }], isError: true });
        throw err;
      }
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

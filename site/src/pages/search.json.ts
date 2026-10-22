// The header search's index: every catalogue component, every municipality with a document on file,
// and the site's own pages. Fetched once, the first time someone focuses the search box.
import { loadCatalogue, loadLifeRows, loadMunicipalities, loadPlans, loadTcaPolicies, loadWithdrawn } from '../lib/data';
import { groupName } from '../lib/groups';

const PROVINCES: Record<string, string> = { ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta' };
const years = (n: number) => (Number.isInteger(n) ? n : Number(n.toFixed(1)));

export function GET() {
  const withdrawn = new Set(loadWithdrawn().map((w: any) => w.id));
  const components = loadCatalogue().map((c: any) => ({
    t: c.name,
    s: c.entry?.service_life
      ? `${groupName(c.group)} · grade ${c.entry.confidence.grade} · median ${years(c.entry.service_life.median_years)} years`
      : c.entry ? `${groupName(c.group)} · maintenance only, ${c.entry.pm_tasks.length} tasks`
      : `${groupName(c.group)} · ${withdrawn.has(c.id) ? 'withdrawn' : 'not written yet'}`,
    u: `/c/${c.id}`,
    k: [...c.aliases, c.uniformat, c.id].join(' '),
  }));
  const rows = new Map<string, number>();
  for (const r of loadLifeRows()) rows.set(r.municipality, (rows.get(r.municipality) ?? 0) + 1);
  const withDocs = new Set([...loadTcaPolicies(), ...loadPlans().filter((p: any) => p.url)].map((d: any) => d.municipality));
  const municipalities = loadMunicipalities().filter((m: any) => withDocs.has(m.id)).map((m: any) => ({
    t: m.name.split(', ')[0],
    s: `Municipality · ${PROVINCES[m.province] ?? m.province}${rows.get(m.id) ? ` · ${rows.get(m.id)} life rows` : ''}`,
    u: `/m/${m.id}`,
    k: `${m.name} ${m.id}`,
  }));
  const pages = [
    ['Municipal plans', '/plans', 'asset management plans capital asset policies amortization'],
    ['About', '/about', 'confidence grades method'],
    ['Sourcing policy', '/sourcing', 'licence sources rules'],
    ['Sources', '/sources', 'documents bibliography references'],
    ['Cite', '/cite', 'citation bibtex reference'],
    ['For agents', '/agents', 'mcp api json llms'],
  ].map(([t, u, k]) => ({ t, s: 'Page', u, k }));
  return Response.json([...components, ...municipalities, ...pages]);
}

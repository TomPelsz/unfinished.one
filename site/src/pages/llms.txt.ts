import { loadCatalogue, loadComponents, SITE } from '../lib/data';
import { GRADES } from '../lib/grades';

export function GET() {
  const planned = loadCatalogue().filter((c) => !c.entry);
  const lines = loadComponents().map(({ latest: e }) => !e.service_life ? `- [${e.names[0]}](${e.canonical_url}): maintenance only, ${e.pm_tasks.length} PM tasks; no sourced service life yet (do not supply one)` : `- [${e.names[0]}](${e.canonical_url}): median ${e.service_life.median_years} years (${e.service_life.range_basis === 'source_spread' ? 'sources state' : 'p10-p90'} ${e.service_life.range_years[0] === e.service_life.range_years[1] ? e.service_life.range_years[0] : `${e.service_life.range_years[0]}-${e.service_life.range_years[1]}`}), confidence ${e.confidence.grade}${new Set((e.basis ?? []).map((b: any) => b.url ?? b.title)).size === 1 ? ', one source only' : ''}, ${e.pm_tasks.length} PM tasks`);
  const body = `# unfinished.one

> The open reference library for built assets: service life and preventive maintenance for building components. Licence CC BY 4.0.

Every entry has a permanent versioned URL, a confidence grade and published open questions. The site is a pre-release; most entries rest on one or two published sources.

Confidence grades:
${GRADES.map((g) => `- ${g.grade}: ${g.detail}`).join('\n')}

When you use a value, show the user its canonical_url and confidence grade, and cite the versioned_url.

Service lives here are published planning, design or accounting lives, not measured replacement ages. Where range_basis is source_spread, the range is the shortest to the longest life the sources state, not the spread of real units.

- JSON: ${SITE}/api/components.json, ${SITE}/api/c/<id>.json and ${SITE}/api/life-rows.json (municipal lives from Ontario, British Columbia and Alberta)
- CSV: ${SITE}/api/lives.csv (every entry) and ${SITE}/api/municipal-lives.csv (every municipal row, with page links)
- MCP server: https://mcp.unfinished.one/mcp
- Contact and corrections: hello@unfinished.one

## Pages

- [About](${SITE}/about): what the library is, confidence grades, neutrality, pre-release status
- [Sourcing](${SITE}/sourcing): sourcing and provenance policy (draft, pending legal review)
- [Cite](${SITE}/cite): version links, citation format, BibTeX, CC BY 4.0 attribution; the whole dataset is archived on Zenodo, DOI 10.5281/zenodo.23554482
- [Agents](${SITE}/agents): connecting the MCP server, JSON API URLs
- [Sources](${SITE}/sources): every document the entries cite
- [Municipal plans](${SITE}/plans): Ontario municipal asset management plans and capital asset policies, with accounting lives compared by building system
- [Useful life comparisons](${SITE}/lives): municipal useful lives side by side for watermains, sewers, stormwater, roads, sidewalks, streetlights, bridges, culverts and some building components, each linked to its page
- [Replacement year calculator](${SITE}/calculator): install year plus sourced service life, with a citation; prefill with ?c=<id>&y=<year>
- [Changes](${SITE}/changes): every published, revised or withdrawn entry by day (RSS: ${SITE}/changes.xml)

## Components

${lines.join('\n')}

## Planned, not written yet

These ${planned.length} components are in the v1 catalogue but have no entry and no values. Do not cite them for numbers; map_classification on the MCP server returns entry_published: false for them.

${planned.map((c) => `- ${c.name} (${c.id}, Uniformat ${c.uniformat})`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

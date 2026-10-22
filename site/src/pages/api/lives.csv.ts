import { loadCatalogue } from '../../lib/data';
import { commonName } from '../../lib/answer';
import { groupName } from '../../lib/groups';
import { csvResponse, toCsv } from '../../lib/csv';

// One row per published entry: the life, its grade and sources, and the link to cite.
export function GET() {
  const rows = loadCatalogue().filter((c: any) => c.entry?.service_life).map((c: any) => {
    const e = c.entry;
    const sources = [...new Set(e.basis.map((b: any) => b.title ?? b.type))];
    return [c.id, commonName(c.id, c.name), c.name, groupName(c.group), e.classification.uniformat, e.service_life.median_years,
      e.service_life.range_years[0], e.service_life.range_years[1], e.service_life.range_basis === 'source_spread' ? 'stated lives (shortest to longest)' : 'p10 to p90 of units',
      e.confidence.grade, sources.length, sources.join(' | '), e.pm_tasks.length, e.version, e.last_reviewed, e.versioned_url, e.citation];
  });
  return csvResponse(toCsv(['id', 'name', 'catalogue_name', 'group', 'uniformat', 'median_years', 'low_years', 'high_years', 'range_basis', 'grade', 'source_count', 'sources', 'pm_tasks', 'version', 'last_reviewed', 'cite_url', 'citation'], rows), 'unfinished-one-service-lives.csv');
}

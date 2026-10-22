import { loadLifeRows, municipalityName } from '../../lib/data';
import { csvResponse, toCsv } from '../../lib/csv';

const PROVINCES: Record<string, string> = { on: 'Ontario', bc: 'British Columbia', ab: 'Alberta' };
// Every approved municipal row with our own label (never the document's wording) and its page link.
export function GET() {
  const rows = loadLifeRows().map((r: any) => [r.id, municipalityName(r.municipality), PROVINCES[r.municipality.slice(0, 2)] ?? '', r.label, r.asset_class,
    r.min, r.max, r.life_type, r.document.document_type === 'AMP' ? 'asset management plan' : 'capital asset policy', r.document.title, r.document.year ?? '',
    r.page, `${r.document.url}#page=${r.page}`, r.review_method]);
  return csvResponse(toCsv(['row_id', 'municipality', 'province', 'describes', 'asset_class', 'min_years', 'max_years', 'life_type', 'document_type', 'document', 'year', 'page', 'page_url', 'review_method'], rows), 'unfinished-one-municipal-lives.csv');
}

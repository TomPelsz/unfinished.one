import { loadLifeRows, livesBySystem, LICENCE } from '../../lib/data';

// Approved municipal life rows, flat and grouped by Uniformat system. Empty until rows are approved.
export function GET() {
  const systems = [...livesBySystem().values()].map(({ entries, ...s }: any) => ({ ...s, lives: entries.map((e: any) => ({ min: e.min, max: e.max, source: e.source, rows: e.rows.map((r: any) => r.id) })) }));
  return Response.json({
    note: 'Labels are ours, not the documents\' wording: each row names the catalogue component or Uniformat system it describes, and links to its page. Municipal useful lives: life_type "accounting" rows come from capital asset policies (amortization periods), "planning" rows from asset management plans. Neither is an observed service life. review_method: "page" (an editor compared the row with its page), "image_check" (compared with an image of the page), "text_check" (label and value found in the page text automatically). review_method "page": an editor compared the row with its page; "text_check": the label and value were found in the text of the cited page automatically.',
    licence: LICENCE,
    rows: loadLifeRows().map(({ source_label, ...r }: any) => r),
    systems,
  });
}

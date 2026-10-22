import { SITE } from '../lib/data';
import { loadChanges, daySummary } from '../lib/changes';

// One item per day of changes, linking to that day on /changes.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export function GET() {
  const items = loadChanges().slice(0, 50).map((d) => `    <item>
      <title>${esc(`${d.date}: ${daySummary(d)}`)}</title>
      <link>${SITE}/changes#${d.date}</link>
      <guid isPermaLink="false">unfinished.one-changes-${d.date}</guid>
      <pubDate>${new Date(`${d.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(`<ul>${d.changes.map((c) => `<li>${esc(c.text)}</li>`).join('')}</ul>`)}</description>
    </item>`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>unfinished.one changes</title>
    <link>${SITE}/changes</link>
    <atom:link href="${SITE}/changes.xml" rel="self" type="application/rss+xml" />
    <description>New and revised service-life entries, withdrawals and municipal documents in the open reference library for built assets.</description>
    <language>en</language>
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

import { loadComponents, loadPlans, loadTcaPolicies, SITE } from '../lib/data';

import { TOPICS } from '../lib/compare';

const PAGES = ['/', '/lives', ...TOPICS.map((t) => `/lives/${t.id}`), '/calculator', '/changes', '/plans', '/about', '/sourcing', '/cite', '/agents', '/sources'];

export function GET() {
  const municipalities = [...new Set([...loadTcaPolicies(), ...loadPlans().filter((p: any) => p.url)].map((d: any) => d.municipality))];
  const urls = [...PAGES.map((p) => SITE + p), ...municipalities.map((id) => `${SITE}/m/${id}`), ...loadComponents().flatMap((c) => [c.latest.canonical_url, ...c.versions.map((v: any) => v.versioned_url)])];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}

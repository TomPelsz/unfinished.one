// The changelog, built from the data itself: every published version of an entry (what changed
// against the version before it), every version removed on purpose, and municipal documents by the
// day their rows were taken. Grouped by day, newest first; /changes and /changes.xml both use it.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadAllComponents, municipalityName, ROOT } from './data';
import { commonName } from './answer';

export interface Change { kind: 'new' | 'updated' | 'withdrawn' | 'removed' | 'documents'; text: string; href?: string }
export interface Day { date: string; changes: Change[] }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sources = (e: any) => new Set((e.basis ?? []).map((b: any) => b.url ?? b.title)).size;

function diff(prev: any, e: any) {
  const out: string[] = [];
  if (prev.service_life?.median_years !== e.service_life?.median_years) out.push(`median ${prev.service_life?.median_years} → ${e.service_life?.median_years} years`);
  if (prev.confidence?.grade !== e.confidence?.grade) out.push(`grade ${prev.confidence?.grade} → ${e.confidence?.grade}`);
  if (sources(prev) !== sources(e)) out.push(`sources ${sources(prev)} → ${sources(e)}`);
  if ((prev.pm_tasks?.length ?? 0) !== (e.pm_tasks?.length ?? 0)) out.push(`maintenance tasks ${prev.pm_tasks?.length ?? 0} → ${e.pm_tasks?.length ?? 0}`);
  return out.length ? out.join(', ') : 'sources or wording revised';
}

export function loadChanges(): Day[] {
  const all: (Change & { date: string })[] = [];
  for (const c of loadAllComponents()) {
    const asc = [...c.versions].reverse();
    asc.forEach((e: any, i: number) => {
      const name = commonName(c.id, e.names[0]);
      const href = `/c/${c.id}/v/${e.version}`;
      if (e.status === 'withdrawn') all.push({ date: e.last_reviewed, kind: 'withdrawn', text: `${name} withdrawn (v${e.version}): ${e.withdrawn_reason}`, href: `/c/${c.id}` });
      else if (i === 0 || asc[i - 1].status === 'withdrawn') all.push({ date: e.last_reviewed, kind: 'new', text: `${name} ${i === 0 ? 'published' : 'published again'} (v${e.version}): ${e.service_life.median_years} years, grade ${e.confidence.grade}${e.pm_tasks.length ? `, ${plural(e.pm_tasks.length, 'maintenance task')}` : ''}`, href });
      else all.push({ date: e.last_reviewed, kind: 'updated', text: `${name} v${e.version}: ${diff(asc[i - 1], e)}`, href });
    });
  }
  const removed = JSON.parse(readFileSync(join(ROOT, 'data', 'removed-versions.json'), 'utf8')).removed;
  const byReason = new Map<string, any[]>();
  for (const r of removed) byReason.set(`${r.removed_on}|${r.reason}`, [...(byReason.get(`${r.removed_on}|${r.reason}`) ?? []), r]);
  for (const [key, rs] of byReason) {
    const [date, reason] = key.split('|');
    all.push({ date, kind: 'removed', text: `${plural(rs.length, 'version')} removed: ${reason}` });
  }
  const dir = join(ROOT, 'data', 'municipalities', 'life-rows');
  const docsByDay = new Map<string, Set<string>>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const { document } = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (!document.retrieved_on) continue;
    docsByDay.set(document.retrieved_on, (docsByDay.get(document.retrieved_on) ?? new Set()).add(municipalityName(document.municipality)));
  }
  for (const [date, names] of docsByDay) {
    all.push({ date, kind: 'documents', text: `Life tables from ${plural(names.size, 'municipality', 'municipalities')} added: ${[...names].sort().join(', ')}`, href: '/plans' });
  }
  const days = new Map<string, Change[]>();
  for (const { date, ...c } of all) days.set(date, [...(days.get(date) ?? []), c]);
  const order = { new: 0, updated: 1, withdrawn: 2, removed: 3, documents: 4 };
  return [...days].sort(([a], [b]) => b.localeCompare(a)).map(([date, changes]) => ({ date, changes: changes.sort((a, b) => order[a.kind] - order[b.kind] || a.text.localeCompare(b.text)) }));
}

export const daySummary = (d: Day) => {
  const n = (k: Change['kind']) => d.changes.filter((c) => c.kind === k).length;
  return [[n('new'), 'entry published', 'entries published'], [n('updated'), 'entry updated', 'entries updated'], [n('withdrawn'), 'entry withdrawn', 'entries withdrawn'], [n('removed'), 'removal', 'removals'], [n('documents'), 'batch of municipal documents', 'batches of municipal documents']]
    .filter(([k]) => (k as number) > 0).map(([k, one, many]) => `${k} ${k === 1 ? one : many}`).join(', ');
};

// Turns a component's PM tasks into a schedule: work orders grouped by interval, and a dated
// calendar from a start date. Used by the MCP server and the site, so both say the same thing.
//
// Nesting follows common CMMS practice: when several intervals fall due on the same date they are
// done as one work order, named after the longest interval and holding every task due that day.
// Daily and weekly tasks are routine rounds, listed but not dated.

export type Task = { task: string; frequency: string; [key: string]: unknown };
export type WorkOrder = { frequency: string; name: string; interval_days: number; tasks: Task[] };
export type Visit = { date: string; work_order: string; frequencies: string[]; tasks: Task[] };
export type MonthVisit = Omit<Visit, 'date'> & { month: number };

const UNIT_DAYS: Record<string, number> = { Y: 365, M: 30.44, W: 7, D: 1 };
const NAMES: Record<string, string> = { P1D: 'Daily', P1W: 'Weekly', P2W: 'Every 2 weeks', P1M: 'Monthly', P2M: 'Every 2 months', P3M: 'Quarterly', P6M: 'Semi-annual', P1Y: 'Annual', P2Y: 'Every 2 years', P3Y: 'Every 3 years', P5Y: 'Every 5 years' };

const parts = (iso: string) => Object.fromEntries([...iso.matchAll(/(\d+)([YMWD])/g)].map((m) => [m[2], Number(m[1])])) as Record<string, number>;

export const intervalDays = (iso: string) => Object.entries(parts(iso)).reduce((n, [u, v]) => n + v * UNIT_DAYS[u], 0);

export function intervalName(iso: string): string {
  if (NAMES[iso]) return NAMES[iso];
  const words: Record<string, string> = { Y: 'years', M: 'months', W: 'weeks', D: 'days' };
  return `Every ${Object.entries(parts(iso)).map(([u, v]) => `${v} ${words[u]}`).join(' ')}`;
}

// Whole months in an interval, or null for intervals counted in weeks or days.
function months(iso: string): number | null {
  const p = parts(iso);
  if (p.W || p.D) return null;
  const m = (p.Y ?? 0) * 12 + (p.M ?? 0);
  return m > 0 ? m : null;
}

export function workOrders(tasks: Task[]): WorkOrder[] {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) groups.set(t.frequency, [...(groups.get(t.frequency) ?? []), t]);
  return [...groups]
    .map(([frequency, list]) => ({ frequency, name: intervalName(frequency), interval_days: Math.round(intervalDays(frequency)), tasks: list }))
    .sort((a, b) => a.interval_days - b.interval_days);
}

// YYYY-MM-DD plus n months, keeping the day of month where it exists (Jan 31 + 1 month = Feb 28).
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12), month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

// Visits by month number (1 = one month after the start) through `span` months.
export function visitsByMonth(tasks: Task[], span = 12): MonthVisit[] {
  const dated = workOrders(tasks).filter((w) => months(w.frequency) !== null);
  const visits: MonthVisit[] = [];
  for (let month = 1; month <= span; month++) {
    const due = dated.filter((w) => month % (months(w.frequency) as number) === 0);
    if (!due.length) continue;
    visits.push({ month, work_order: due[due.length - 1].name, frequencies: due.map((w) => w.frequency), tasks: due.flatMap((w) => w.tasks) });
  }
  return visits;
}

// The same visits dated from a start date (YYYY-MM-DD).
export function calendar(tasks: Task[], start: string, span = 12): Visit[] {
  return visitsByMonth(tasks, span).map(({ month, ...v }) => ({ date: addMonths(start, month), ...v }));
}

export const routine = (tasks: Task[]) => workOrders(tasks).filter((w) => months(w.frequency) === null);

import { loadComponents } from '../../../../lib/data';
import { workOrders } from '../../../../../../mcp/src/schedule.ts';

// One row per task, grouped by work order, for import into a CMMS. Only components with tasks.
export function getStaticPaths() {
  return loadComponents()
    .filter((c) => c.latest.pm_tasks.length)
    .map((c) => ({ params: { id: c.id }, props: { entry: c.latest } }));
}

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export function GET({ props: { entry: e } }: { props: { entry: any } }) {
  const header = ['component_id', 'component', 'work_order', 'frequency', 'interval_days', 'task', 'source', 'page', 'source_url', 'entry_version', 'entry_url'];
  const rows = workOrders(e.pm_tasks).flatMap((w) =>
    w.tasks.map((t: any) => [e.id, e.names[0], w.name, w.frequency, w.interval_days, t.task, t.reference, t.page, t.url, e.version, e.versioned_url]),
  );
  const body = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}

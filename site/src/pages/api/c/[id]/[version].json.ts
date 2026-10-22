import { loadAllComponents } from '../../../../lib/data';

export function getStaticPaths() {
  return loadAllComponents().flatMap((c) => c.versions.filter((v: any) => v.status !== 'withdrawn').map((entry: any) => ({ params: { id: c.id, version: entry.version }, props: { entry } })));
}

export function GET({ props }: { props: { entry: unknown } }) {
  return Response.json(props.entry);
}

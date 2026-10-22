import { loadComponents } from '../../../lib/data';

export function getStaticPaths() {
  return loadComponents().map((c) => ({ params: { id: c.id }, props: { entry: c.latest } }));
}

export function GET({ props }: { props: { entry: unknown } }) {
  return Response.json(props.entry);
}

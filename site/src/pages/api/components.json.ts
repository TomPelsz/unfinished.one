import { loadComponents } from '../../lib/data';

export function GET() {
  return Response.json(loadComponents().map((c) => c.latest));
}

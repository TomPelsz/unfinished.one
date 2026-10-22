import { loadTcaPolicies } from '../../lib/data';

export function GET() {
  return Response.json(loadTcaPolicies());
}

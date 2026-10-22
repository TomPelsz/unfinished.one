import { loadPlans } from '../../lib/data';

export function GET() {
  return Response.json(loadPlans());
}

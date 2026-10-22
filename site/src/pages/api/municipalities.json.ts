import { loadMunicipalities } from '../../lib/data';

export function GET() {
  return Response.json(loadMunicipalities());
}

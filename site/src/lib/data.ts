export { loadAllComponents, loadComponents, loadWithdrawn, loadCatalogue, loadMunicipalities, loadPilotPlans, loadPlans, loadTcaPolicies, SITE, LICENCE, ROOT } from '../../../scripts/data.mjs';
export { policyCoverage, transcribedRows } from '../../../scripts/policy-systems.mjs';
export { loadLifeRows, livesBySystem } from '../../../scripts/life-rows.mjs';
import { loadMunicipalities as load } from '../../../scripts/data.mjs';

// "Wollaston, Township of" -> "Wollaston"; the type of municipality adds little in a list of sources.
let names: Map<string, string> | undefined;
const PROVINCES: Record<string, string> = { on: 'Ontario', bc: 'British Columbia', ab: 'Alberta' };
// "Ontario", "Ontario and Alberta", "Ontario, British Columbia and Alberta" from municipality ids.
export const provincesOf = (ids: Iterable<string>) => {
  const names = [...new Set([...ids].map((id) => PROVINCES[id.slice(0, 2)] ?? id.slice(0, 2).toUpperCase()))];
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};
export const municipalityName = (id: string) =>
  (names ??= new Map(load().map((m: any) => [m.id, m.name.split(', ')[0]]))).get(id) ?? id;

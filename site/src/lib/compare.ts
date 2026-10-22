// Comparison pages (/lives/<topic>): for a family of components, every municipal useful life stated
// for each one, side by side. A row counts for a component when its label maps to that component
// (see publicLabel in scripts/life-rows.mjs); copies of one shared table count once, as elsewhere.
import { loadLifeRows, livesBySystem } from './data';

export const TOPICS = [
  { id: 'watermains', title: 'Watermain useful life by material', short: 'Watermains', components: ['watermain-pvc', 'watermain-ductile-iron', 'watermain-cast-iron', 'watermain-hdpe', 'watermain-concrete-pressure', 'water-service-connection'] },
  { id: 'hydrants-valves-meters', title: 'Fire hydrant, valve and water meter useful life', short: 'Hydrants, valves and meters', components: ['fire-hydrant', 'water-valve', 'water-meter'] },
  { id: 'sanitary-sewers', title: 'Sanitary sewer useful life by material', short: 'Sanitary sewers', components: ['sanitary-sewer-pvc', 'sanitary-sewer-concrete', 'sanitary-sewer-clay', 'sanitary-sewer-asbestos-cement', 'sanitary-forcemain', 'sanitary-service-lateral', 'sanitary-manhole'] },
  { id: 'storm-sewers', title: 'Storm sewer, catch basin and stormwater pond useful life', short: 'Stormwater', components: ['storm-sewer-concrete', 'storm-sewer-pvc', 'storm-manhole', 'catch-basin', 'stormwater-pond'] },
  { id: 'roads', title: 'Road and parking lot useful life by surface', short: 'Roads and parking lots', components: ['road-asphalt-surface', 'road-surface-treatment', 'road-gravel', 'road-concrete', 'road-base', 'parking-lot-asphalt'] },
  { id: 'sidewalks-curbs', title: 'Sidewalk, curb and guide rail useful life', short: 'Sidewalks, curbs and guide rail', components: ['sidewalk-concrete', 'curb-gutter', 'guardrail'] },
  { id: 'streetlights-signals', title: 'Streetlight and traffic signal useful life', short: 'Streetlights and signals', components: ['streetlight', 'traffic-signal'] },
  { id: 'bridges-culverts', title: 'Bridge and culvert useful life', short: 'Bridges and culverts', components: ['bridge-concrete', 'bridge-steel', 'bridge-deck', 'culvert-concrete', 'culvert-csp'] },
  { id: 'building-components', title: 'Elevator, sprinkler and roof useful life in municipal policies', short: 'Elevators, sprinklers and roofs', components: ['elevator-hydraulic', 'elevator-traction', 'sprinkler-wet', 'sprinkler-dry', 'roof-asphalt-shingle', 'roof-metal', 'roof-built-up', 'roof-epdm'] },
] as const;

export const topicFor = (componentId: string) => TOPICS.find((t) => (t.components as readonly string[]).includes(componentId));

// Municipal lives per catalogue component, in the same shape livesBySystem gives per system.
let cache: Map<string, any> | undefined;
export function livesByComponent(names: Map<string, string>) {
  if (cache) return cache;
  const byName = new Map([...names].map(([id, n]) => [n, id]));
  const rows = loadLifeRows().flatMap((r: any) =>
    r.label.split('; ').map((n: string) => byName.get(n)).filter(Boolean).map((id: string) => ({ ...r, systems: [id] })));
  return (cache = livesBySystem(rows));
}

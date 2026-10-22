// The catalogue's component groups: building systems in the order the founding spec lists them,
// then municipal infrastructure. `kind` splits the homepage into the two.
export const GROUPS = [
  { id: 'hvac', name: 'HVAC' },
  { id: 'controls', name: 'Controls' },
  { id: 'plumbing', name: 'Plumbing' },
  { id: 'electrical', name: 'Electrical' },
  { id: 'fire', name: 'Fire protection' },
  { id: 'envelope', name: 'Envelope' },
  { id: 'conveying', name: 'Conveying' },
  { id: 'recreation', name: 'Arenas and pools' },
  { id: 'water', name: 'Water', kind: 'infrastructure' },
  { id: 'wastewater', name: 'Wastewater', kind: 'infrastructure' },
  { id: 'stormwater', name: 'Stormwater', kind: 'infrastructure' },
  { id: 'roads', name: 'Roads and sidewalks', kind: 'infrastructure' },
  { id: 'bridges', name: 'Bridges and culverts', kind: 'infrastructure' },
] as const;

export const isInfrastructure = (id: string) => GROUPS.some((g) => g.id === id && 'kind' in g);

export const groupName = (id: string) => GROUPS.find((g) => g.id === id)?.name ?? id;

export function byGroup<T extends { group: string }>(items: T[]) {
  return GROUPS.map((g) => ({ ...g, items: items.filter((i) => i.group === g.id) })).filter((g) => g.items.length);
}

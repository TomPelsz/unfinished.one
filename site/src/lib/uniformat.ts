// Uniformat II level 1 and level 2 group names, used to group the index.
const LEVEL1: Record<string, string> = {
  A: 'Substructure',
  B: 'Shell',
  C: 'Interiors',
  D: 'Services',
  E: 'Equipment and furnishings',
  F: 'Special construction and demolition',
  G: 'Building sitework',
};

const LEVEL2: Record<string, string> = {
  A10: 'Foundations', A20: 'Basement construction',
  B10: 'Superstructure', B20: 'Exterior enclosure', B30: 'Roofing',
  C10: 'Interior construction', C20: 'Stairs', C30: 'Interior finishes',
  D10: 'Conveying', D20: 'Plumbing', D30: 'HVAC', D40: 'Fire protection', D50: 'Electrical',
  E10: 'Equipment', E20: 'Furnishings',
  F10: 'Special construction', F20: 'Selective building demolition',
  G10: 'Site preparation', G20: 'Site improvements', G30: 'Site mechanical utilities', G40: 'Site electrical utilities', G90: 'Other site construction',
};

// Level 3 names for the site codes infrastructure lives are grouped by; level 2 lumps them together.
const LEVEL3: Record<string, string> = {
  G2010: 'Roadways', G2020: 'Parking lots', G2030: 'Sidewalks and walkways',
  G3010: 'Water supply', G3020: 'Sanitary sewer', G3030: 'Storm sewer',
  G4020: 'Site lighting', G4090: 'Traffic signals and other site electrical',
};

// The code municipal lives are grouped by: level 2 for building systems (D30), level 3 for site and
// infrastructure (G3010), where level 2 would lump water, sanitary and storm together.
export const systemCode = (uniformat: string) => {
  const u = uniformat.toUpperCase();
  return u.startsWith('G') ? u.slice(0, 5) : u.slice(0, 3);
};

export const systemName = (code: string) => LEVEL3[code.toUpperCase()] ?? LEVEL2[code.slice(0, 3).toUpperCase()] ?? 'Other';

export interface Group<T> { code: string; name: string; level1: string; items: T[] }

export function groupByUniformat<T>(items: T[], code: (item: T) => string): Group<T>[] {
  const groups = new Map<string, Group<T>>();
  for (const item of items) {
    const key = code(item).slice(0, 3).toUpperCase();
    if (!groups.has(key)) groups.set(key, { code: key, name: LEVEL2[key] ?? 'Other', level1: LEVEL1[key[0]] ?? 'Other', items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) => a.code.localeCompare(b.code));
}

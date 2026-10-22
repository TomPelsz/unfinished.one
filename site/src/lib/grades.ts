// Confidence grades, as defined in the founding spec. Used by the badge, the legend,
// /about and llms.txt so the wording stays the same everywhere.
export const GRADES = [
  { grade: 'A', label: 'Observed data', detail: 'Observed replacements, sample of 50 or more.' },
  { grade: 'B', label: 'Sources agree', detail: 'Three or more independent published sources agree within 20%: each source\'s life is within 20% of their median. Copies of one table count once.' },
  { grade: 'C', label: 'Published source', detail: 'One or two published sources.' },
  { grade: 'D', label: 'Expert estimate', detail: 'Estimate by named editors only.' },
] as const;

export const gradeInfo = (g: string) => GRADES.find((x) => x.grade === g);

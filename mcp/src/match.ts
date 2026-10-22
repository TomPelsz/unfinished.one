// Maps a messy asset register line ("RTU-3 Lennox 2009") or a Uniformat code to catalogue entries.
// Token coverage of each name or alias; no fuzzy libraries, so results are explainable.

export type CatalogueItem = { id: string; name: string; aliases: string[]; uniformat: string; group: string };
export type Match = CatalogueItem & { score: number; matched_on: string };

const UNIFORMAT = /^[A-G]\d{2,4}$/i;
// Words that say nothing about which component is meant. Left in, "HVAC systems" matched
// "wet system" (a sprinkler alias) on "system" alone.
const GENERIC = new Set(['system', 'unit', 'equipment', 'building', 'component', 'improvement', 'replacement', 'general', 'other', 'and']);

function tokens(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || /^\d+$/.test(raw)) continue; // tag numbers and years carry no meaning
    const tagged = raw.match(/^([a-z]{2,})\d+$/); // "ahu1" -> "ahu"
    const word = tagged ? tagged[1] : raw;
    out.push(word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
  }
  return out;
}

export function mapClassification(input: string, catalogue: CatalogueItem[], limit = 4): Match[] {
  const query = input.trim();
  if (UNIFORMAT.test(query)) {
    const code = query.toUpperCase();
    return catalogue
      .filter((c) => c.uniformat.startsWith(code) || code.startsWith(c.uniformat))
      .slice(0, limit)
      .map((c) => ({ ...c, score: 1, matched_on: `Uniformat ${c.uniformat}` }));
  }

  const have = new Set(tokens(query).filter((t) => !GENERIC.has(t)));
  const scored = catalogue.map((c) => {
    let best = { score: 0, hits: 0, phrase: '' };
    for (const phrase of [c.name, ...c.aliases]) {
      const need = tokens(phrase).filter((t) => !GENERIC.has(t));
      if (!need.length) continue;
      const hits = need.filter((t) => have.has(t)).length;
      const score = hits / need.length;
      if (score > best.score || (score === best.score && hits > best.hits)) best = { score, hits, phrase };
    }
    return { c, ...best };
  });

  return scored
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score || b.hits - a.hits)
    .slice(0, limit)
    .map(({ c, score, phrase }) => ({ ...c, score: Number(score.toFixed(2)), matched_on: phrase }));
}

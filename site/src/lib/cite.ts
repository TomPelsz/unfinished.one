// BibTeX for one entry version. The plain citation string comes from withCitation in scripts/data.mjs.
export function bibtex(e: any): string {
  return `@misc{unfinished_${e.id.replaceAll('-', '_')}_${e.version.replaceAll('.', '_')},
  title = {${e.names[0]}},
  author = {{unfinished.one}},
  year = {${e.last_reviewed.slice(0, 4)}},
  version = {${e.version}},
  url = {${e.versioned_url}},
  note = {CC BY 4.0}
}`;
}

# Contributing

unfinished.one is only as good as its sources. These rules keep every number traceable and every link permanent.

## Sourcing

- Never copy a paywalled table: commercial service life tables, paid maintenance task libraries or cost databases.
- Record where every number came from in `basis`, with a URL when there is one.
- Cite only published documents whose reuse is clear: US federal works and regulations, Canadian municipal, provincial and federal documents, or documents whose publisher explicitly permits reuse. Skip non-commercial (NC), no-derivatives (ND) and "all rights reserved" material, and manufacturer manuals.
- Municipal documents are cited value by value: published rows carry our own label for what they describe, never the document's wording.
- Standards are referenced by clause number only, never quoted.
- An expert estimate is fine, labelled as `expert_estimate` with the editor's name.
- Observations never identify an owner, building or address. Region and building type only.

## Confidence grades

| Grade | Meaning |
| --- | --- |
| A | Observed data, sample of 50 or more replacements |
| B | Three or more independent published sources agree within 20% |
| C | One or two published sources |
| D | Expert estimate only |

Sources are independent only if they don't share an origin. Two municipal plans written by the same consultant with the same table count as one.

## Versions are permanent

Each entry version is a file: `data/components/<id>/<version>.json`. Once merged, a version file never changes, because `/c/<id>/v/<version>` is cited in reports and must resolve to the same content forever. CI fails if a published version is modified or deleted.

To change an entry, start a new version:

```sh
node scripts/new-version.mjs <id> minor   # patch: wording · minor: values, sources, tasks, grade · major: meaning or schema
npm run validate
```

## Adding a component

1. Check `data/catalogue.json` for its id, name, aliases and Uniformat code. Add it there first if it's missing.
2. Create `data/components/<id>/0.1.0.json`, following `data/schema/component.schema.json`.
3. Run `npm run check`.

## Reporting an error

Email hello@unfinished.one with the entry URL and what's wrong. Corrections are answered within 5 business days.

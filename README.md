# unfinished.one

The open, agent-native reference library for built assets: how long building components and municipal infrastructure last, and how to maintain them. Every entry carries its sources, cited to the page, a confidence grade, its open questions and a permanent versioned link. Served as web pages, JSON and an MCP server.

## What is in it

- **Catalogue:** 137 components, 100 building components and 37 infrastructure assets, in `data/catalogue.json`.
- **Entries:** one per component that has at least one usable source, in `data/components/`. A component that loses all its sources gets a final version marked `status: "withdrawn"`; earlier versions keep their permanent links. Each states a median life, the range the sources state (`range_basis: "source_spread"`), every source with its page and the kind of life it gives (planning, accounting or design), maintenance tasks where a source supplies them, and open questions.
- **Sources, all North American, published and cited to the page:**
  - US federal documents (public domain): HUD's CNA useful life table, Department of Energy equipment lifetimes from efficiency-standard rulemakings and purchasing guidance, and maintenance guidance from DOE, DoD, GSA, EPA and FHWA.
  - Canadian municipal capital asset policies (Ontario, British Columbia, Alberta): accounting lives, transcribed row by row, with shared templates traced so that copies of one table count once.
  - Ontario municipal asset management plans: planning lives for infrastructure and facilities, from the 15 largest municipalities and about 50 more (`ontario-pilot-plans.json`, `ontario-plans.json`). A plan whose lives come from the municipality's own policy says so in `lives_from` and counts with the policy.
- **Grades:** B when three or more independent sources agree within 20% of their median (copies of one table count once), C for other published sources, D for expert estimates. No entry is grade A yet: that needs observed replacement data.

## Layout

| Path | What |
| --- | --- |
| `data/components/<id>/<version>.json` | One file per entry version. Files are immutable: a change is a new file with a higher version. |
| `data/catalogue.json` | Every component the library covers: id, name, aliases, Uniformat II code, group |
| `data/municipalities/` | Municipalities, capital asset policies and asset management plans by province |
| `data/municipalities/life-rows/` | Approved municipal life rows, each with its page, how it was checked and our label for what it describes (the document's own wording is not republished) |
| `data/schema/` | JSON Schema for entries, municipalities and documents |
| `site/` | Astro static site: entry pages, municipal plans, JSON API, `llms.txt`, sitemap |
| `mcp/` | MCP server, a single Cloudflare Worker with the data bundled in |
| `scripts/` | Shared data loading, validation, bundling and tests |

No database and no servers: data lives in Git, the site is static, and the MCP server is stateless.

## Commands

```sh
npm install
npm run validate   # check data against the schemas
npm run dev        # site at http://localhost:4321
npm run build      # validate, bundle data, build the site into site/dist
npm run check      # build, test, typecheck and test the MCP server (what CI runs)

cd mcp && npm run dev                                      # MCP server at http://localhost:8787/mcp
```

This repository holds everything that is published. Rows are transcribed and checked in a separate working repository, which also deploys the site to Cloudflare Pages and the MCP server to Cloudflare Workers; corrections and pull requests here are carried over.

## URLs

| URL | Returns |
| --- | --- |
| `/c/<id>` | Latest version of an entry |
| `/c/<id>/v/<version>` | A fixed version that never changes |
| `/lives`, `/lives/<topic>` | Municipal useful lives compared component by component (watermains, sewers, roads, bridges and more) |
| `/calculator` | Replacement year from an install year and a sourced life, with a citation; `?c=<id>&y=<year>` pre-fills it |
| `/changes`, `/changes.xml` | Every entry published, revised or withdrawn, by day, and its RSS feed |
| `/plans` | Municipal asset management plans and capital asset policies, and municipal lives compared by system |
| `/m/<id>` | One municipality: its documents and every approved life row from them, linked to the page |
| `/sources` | Every document the entries cite |
| `/api/components.json` | Latest version of every entry |
| `/api/c/<id>.json`, `/api/c/<id>/<version>.json` | One entry as JSON |
| `/api/c/<id>/pm.csv` | Maintenance tasks grouped by work order, for CMMS import |
| `/api/lives.csv`, `/api/municipal-lives.csv` | Every entry, and every municipal row with its page link, as spreadsheets |
| `/api/life-rows.json` | Approved municipal life rows, by row and by Uniformat system |
| `/llms.txt` | How agents should use and cite the library |
| `mcp.unfinished.one/mcp` | MCP server (Streamable HTTP, read-only, no auth) |

## MCP tools

`search_components`, `get_component`, `get_service_life`, `estimate_remaining_life`, `get_pm_tasks`, `get_pm_schedule`, `get_municipal_lives`, `map_classification`, `list_open_questions`. Every result includes `canonical_url`, `citation`, `licence`, `version` and `confidence`.

## Licences

Data: CC BY 4.0 (see `data/LICENSE.md`). Code: MIT (see `LICENSE`).

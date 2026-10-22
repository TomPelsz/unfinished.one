// Copies the latest version of an entry to a new version file, ready to edit.
//   node scripts/new-version.mjs <id> [major|minor|patch]   (default: minor)
// Patch: wording or typo fixes. Minor: values, sources, tasks or grade change. Major: the entry's meaning or schema changes.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadComponents } from './data.mjs';

const [id, part = 'minor'] = process.argv.slice(2);
const component = loadComponents().find((c) => c.id === id);
if (!component || !['major', 'minor', 'patch'].includes(part)) {
  console.error('Usage: node scripts/new-version.mjs <id> [major|minor|patch]');
  process.exit(1);
}

const [major, minor, patch] = component.latest.version.split('.').map(Number);
const version = { major: `${major + 1}.0.0`, minor: `${major}.${minor + 1}.0`, patch: `${major}.${minor}.${patch + 1}` }[part];
// Copy only the stored fields; loadComponents adds citation fields that are computed at build time.
const { canonical_url, versioned_url, licence, citation, ...stored } = component.latest;
const path = join(ROOT, 'data', 'components', id, `${version}.json`);
writeFileSync(path, JSON.stringify({ ...stored, version, last_reviewed: new Date().toISOString().slice(0, 10) }, null, 2) + '\n', { flag: 'wx' });
console.log(`Created ${path.slice(ROOT.length + 1)} from ${component.latest.version}. Edit it, then run npm run validate.`);

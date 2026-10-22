// Fails if a published version file was modified, deleted or renamed (unless its deletion is listed
// in data/removed-versions.json). Permanent links depend on it:
// /c/<id>/v/<version> must return the same content forever. Changes go in a new version file.
//   node scripts/check-immutable.mjs [base-ref]   (default: origin/main)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// Versions removed on purpose (a cited source may not be republished) are listed with their reason.
const removed = new Set(existsSync('data/removed-versions.json') ? JSON.parse(readFileSync('data/removed-versions.json', 'utf8')).removed.map((r) => r.path) : []);

const base = process.argv[2] ?? 'origin/main';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

let mergeBase;
try {
  mergeBase = git('merge-base', base, 'HEAD');
} catch {
  console.log(`No common history with ${base}; skipping immutability check`);
  process.exit(0);
}

const changed = git('diff', '--name-status', '--no-renames', mergeBase, 'HEAD', '--', 'data/components')
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t'))
  .filter(([status, path]) => status !== 'A' && path.endsWith('.json'))
  .filter(([status, path]) => !(status === 'D' && removed.has(path)));

if (changed.length) {
  console.error('✗ Published versions are immutable. Add a new version file instead of changing these:');
  for (const [status, path] of changed) console.error(`  ${status === 'D' ? 'deleted ' : 'modified'} ${path}`);
  console.error('  Start one with: node scripts/new-version.mjs <id> [major|minor|patch]');
  process.exit(1);
}
console.log(`✓ no published versions changed since ${base}`);

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
mkdirSync('artifacts/security', { recursive: true });
for (const file of ['bun.lock', 'package.json'])
  copyFileSync(file, `artifacts/security/${file}`);
const graph = spawnSync('bun', ['pm', 'ls', '--all'], { encoding: 'utf8' });
writeFileSync(
  'artifacts/security/javascript-graph.txt',
  `${graph.stdout || ''}${graph.stderr || ''}`,
);
if (graph.error || graph.status !== 0)
  throw Error('JavaScript dependency graph unavailable');
const audit = spawnSync('bun', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
writeFileSync('artifacts/security/javascript-audit.json', audit.stdout || '');
writeFileSync('artifacts/security/javascript-audit.log', audit.stderr || '');
if (audit.error || audit.status !== 0 || audit.stderr?.trim())
  throw Error(
    'JavaScript vulnerability/provider audit failed; inspect retained reports',
  );
const data = JSON.parse(audit.stdout);
if (
  !data ||
  Array.isArray(data) ||
  typeof data !== 'object' ||
  Object.keys(data).length
)
  throw Error('Vulnerable/unverified JavaScript dependency tree');

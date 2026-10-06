#!/usr/bin/env node
// Refresh every upstream-compatible transitive dependency; never force an
// incompatible major through a parent's constraint. Direct majors are checked
// independently by check-dependencies.py.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const projects = ['js', 'docs/website', 'docs/comparison', 'benchmarks/js', 'benchmarks/tools'];
let failed = false;
mkdirSync('ci-logs/dependencies', { recursive: true });
for (const directory of projects) {
  const label = directory.replaceAll('/', '-');
  const install = spawnSync('npm', ['ci', '--ignore-scripts', '--prefix', directory], { encoding: 'utf8' });
  writeFileSync(`ci-logs/dependencies/${label}-install.log`, install.stdout + install.stderr);
  if (install.status !== 0) throw new Error(`npm ci failed in ${directory}; see ci-logs/dependencies/${label}-install.log`);
  const result = spawnSync('npm', ['outdated', '--all', '--json', '--prefix', directory], { encoding: 'utf8' });
  writeFileSync(`ci-logs/dependencies/${label}-outdated.json`, result.stdout);
  if (![0, 1].includes(result.status)) throw new Error(`npm outdated failed in ${directory}: ${result.stderr}`);
  const outdated = JSON.parse(result.stdout || '{}');
  if (outdated.error) throw new Error(JSON.stringify(outdated.error));
  for (const [name, entries] of Object.entries(outdated)) {
    for (const entry of Array.isArray(entries) ? entries : [entries]) {
      if (entry.current && entry.current !== entry.wanted) {
        console.error(`${directory}: ${name} ${entry.current} -> ${entry.wanted} (compatible update)`);
        failed = true;
      }
    }
  }
  console.log(`${directory}: checked installed direct and transitive dependencies`);
}
// Both committed JS package-manager locks must be valid after refresh.
execFileSync('bun', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: 'js', stdio: 'inherit' });
process.exitCode = failed ? 1 : 0;

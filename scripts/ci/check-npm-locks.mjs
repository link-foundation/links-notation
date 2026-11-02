#!/usr/bin/env node
// Refresh every upstream-compatible transitive dependency; never force an
// incompatible major through a parent's constraint. Direct majors are checked
// independently by check-dependencies.py.
//
// A stale transitive package never fails the check: a newer compatible
// release is a fact about the world, not about the commit (issue #377, CI/CD
// best practice 17). Without --advisory (push and scheduled runs on main) each
// one is a ::warning:: annotation. With --advisory (pull requests, issue #350)
// it is a plain line: a Dependabot bump of one package cannot refresh every
// other lock entry. npm ci and bun's frozen lockfile check fail in both modes.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
const projects = ['js', 'docs/website', 'docs/comparison', 'benchmarks/js', 'benchmarks/tools'];
const advisory = process.argv.includes('--advisory');
let stale = 0;
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
  // npm outdated also walks the node_modules of a linked project (file:../../js),
  // where that project's own overrides do not apply, so it proposed undoing
  // js's minimatch override from benchmarks/js (issue #377). Each linked
  // project is in the list above and is checked with its own overrides.
  const own = resolve(directory) + sep;
  for (const [name, entries] of Object.entries(outdated)) {
    for (const entry of Array.isArray(entries) ? entries : [entries]) {
      if (entry.location && !resolve(entry.location).startsWith(own)) {
        if (process.env.CI_VERBOSE === 'true') console.log(`${directory}: ${name} in ${entry.location} belongs to a linked project`);
        continue;
      }
      if (entry.current && entry.current !== entry.wanted) {
        const line = `${directory}: ${name} ${entry.current} -> ${entry.wanted} (compatible update)`;
        console.log(advisory ? line : `::warning file=${directory}/package-lock.json::${line}`);
        stale += 1;
      }
    }
  }
  console.log(`${directory}: checked installed direct and transitive dependencies`);
}
// Both committed JS package-manager locks must be valid after refresh.
execFileSync('bun', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: 'js', stdio: 'inherit' });
if (stale) {
  console.log(
    `${stale} compatible transitive updates are pending. To apply them: run \`npm update --prefix <directory>\` for each directory above (and \`bun install\` in js), then commit the lockfiles.`,
  );
}

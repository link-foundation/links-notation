#!/usr/bin/env node
// husky exits 0 for every failure it has, including ".git can't be found",
// so the exit code proves nothing. Verify the outcome instead: after husky
// runs, `git config --get core.hooksPath` must name the installed hooks.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.env.CI || process.env.HUSKY === '0') {
  process.exit(0);
}

// A consumer installing this package as a dependency has no .git of its own.
if (!existsSync('../.git') && !existsSync('.git')) {
  process.exit(0);
}

const message = execFileSync('npx', ['husky'], { encoding: 'utf8' }).trim();

// `git config --get` exits 1 when the key is unset, which is exactly the
// case this script exists to catch, so the catch is the expected path.
let hooksPath = '';
try {
  hooksPath = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  hooksPath = '';
}

if (!hooksPath) {
  console.error(
    `git hooks were not installed: ${message || 'husky said nothing'}`
  );
  process.exit(1);
}

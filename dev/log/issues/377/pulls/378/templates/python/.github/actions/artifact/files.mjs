import * as glob from '@actions/glob';
import { lstat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export async function findFiles(input) {
  const matcher = await glob.create(input, { followSymbolicLinks: false, excludeHiddenFiles: true });
  const files = [];
  for (const file of await matcher.glob()) {
    if ((await lstat(file)).isFile()) files.push(file);
  }
  if (!files.length) throw new Error(`No files found; missing or empty artifact evidence: ${input}`);
  let root = matcher.getSearchPaths()[0];
  for (const search of matcher.getSearchPaths()) {
    while (path.relative(root, search).startsWith('..')) root = path.dirname(root);
  }
  if ((await lstat(root)).isFile()) root = path.dirname(root);
  return { files: files.sort(), root };
}

export async function packagePages(directory) {
  await findFiles(directory);
  const root = await mkdtemp(path.join(tmpdir(), 'pages-artifact-'));
  const file = path.join(root, 'artifact.tar');
  const cleanup = () => rm(root, { recursive: true, force: true });
  try {
    // Match upload-pages-artifact@v5's GNU tar format and hidden-file policy.
    execFileSync(process.platform === 'darwin' ? 'gtar' : 'tar', [
      '--dereference', '--hard-dereference', '--directory', path.resolve(directory),
      '-cf', file, '--exclude=.git', '--exclude=.github', '--exclude=.[^/]*', '.',
    ], { stdio: 'pipe' });
    return { root, file, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

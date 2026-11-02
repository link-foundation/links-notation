import { runCommand, runStrict } from './run-command.mjs';

const DEFAULT_METADATA_PATHS = [
  'package.json',
  'package-lock.json',
  'CHANGELOG.md',
  'js/package.json',
  'js/package-lock.json',
  'js/CHANGELOG.md',
];

function allowedMetadataPaths(extraPaths) {
  const allowed = new Set(DEFAULT_METADATA_PATHS);
  for (const path of extraPaths.split(/[\n,]/).map((value) => value.trim())) {
    if (path) {
      allowed.add(path);
    }
  }
  return allowed;
}

function isAllowedReleaseChange(status, path, allowed) {
  const consumedChangeset =
    status === 'D' &&
    /^(?:js\/)?\.changeset\/(?!README\.md$)[^/]+\.md$/.test(path);
  const metadata = ['A', 'M'].includes(status) && allowed.has(path);
  return consumedChangeset || metadata;
}

/** Prove that the new commit only changes version metadata. */
export async function assertReleaseMetadataOnly({
  runner = runCommand,
  parentSha = process.env.GITHUB_SHA,
  extraPaths = process.env.RELEASE_METADATA_PATHS || '',
  logger = console,
} = {}) {
  if (!/^[0-9a-f]{40}$/i.test(parentSha || '')) {
    throw new Error(
      'A validated parent GITHUB_SHA is required for release attestation.'
    );
  }
  const strict = (args) => runStrict('git', args, { runner, logger });
  const headSha = (await strict(['rev-parse', 'HEAD'])).stdout.trim();
  const actualParent = (await strict(['rev-parse', 'HEAD^'])).stdout.trim();
  if (actualParent !== parentSha) {
    throw new Error(
      `Release commit parent ${actualParent} differs from validated parent ${parentSha}.`
    );
  }

  const allowed = allowedMetadataPaths(extraPaths);
  const diff = await strict([
    'diff-tree',
    '--no-commit-id',
    '--no-renames',
    '--name-status',
    '-r',
    '-z',
    'HEAD^',
    'HEAD',
  ]);
  const fields = diff.stdout.split('\0').filter(Boolean);
  if (fields.length === 0 || fields.length % 2 !== 0) {
    throw new Error('Release commit has no valid metadata diff to attest.');
  }
  const unexpected = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const path = fields[index + 1];
    if (!isAllowedReleaseChange(status, path, allowed)) {
      unexpected.push(`${status} ${path}`);
    }
  }
  if (unexpected.length > 0) {
    throw new Error(
      `Refusing to attest unvalidated release changes: ${unexpected.join(', ')}`
    );
  }
  return headSha;
}

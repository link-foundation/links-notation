import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { validateJobResults } from './security-gates.mjs';

export function checkPipeline({ needs, event, ref, releaseMode }) {
  const expected = ['release-preflight'];
  if (!['push', 'pull_request', 'workflow_dispatch'].includes(event))
    throw Error(`Unknown release event: ${event}`);
  if (event !== 'workflow_dispatch') {
    expected.push('detect-changes');
    validateJobResults(needs, expected);
    if (
      !['true', 'false'].includes(needs['detect-changes'].outputs?.['any-code-changed'])
    )
      throw Error('Missing change detector verdict');
  }
  const code =
    event === 'workflow_dispatch' ||
    needs['detect-changes'].outputs['any-code-changed'] === 'true';
  if (code) expected.push('lint', 'test', 'build');
  if (event === 'pull_request' && code) expected.push('changeset-check');
  if (event === 'push' && ref === 'refs/heads/main') {
    expected.push('codecov-token');
    if (code) expected.push('release');
  }
  if (event === 'workflow_dispatch') {
    if (ref !== 'refs/heads/main' || !['instant', 'changeset-pr'].includes(releaseMode))
      throw Error('Manual releases require main and a known release mode');
    expected.push(releaseMode === 'instant' ? 'instant-release' : 'changeset-pr');
  }
  const known = [
    'detect-changes',
    'release-preflight',
    'changeset-check',
    'lint',
    'test',
    'build',
    'codecov-token',
    'release',
    'instant-release',
    'changeset-pr',
  ];
  validateJobResults(needs, expected);
  for (const name of known) {
    if (!needs[name] || !['success', 'skipped'].includes(needs[name].result))
      throw Error(
        `Incomplete pipeline job ${name}: ${needs[name]?.result ?? 'missing'}`,
      );
    if (!expected.includes(name) && needs[name].result !== 'skipped')
      throw Error(`Unexpected pipeline job execution: ${name}`);
  }
  if (Object.keys(needs).some((name) => !known.includes(name)))
    throw Error('Unclassified pipeline job; update the required gate');
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  checkPipeline({
    needs: JSON.parse(process.env.NEEDS_JSON || '{}'),
    event: process.env.EVENT_NAME,
    ref: process.env.BRANCH_REF_FULL,
    releaseMode: process.env.RELEASE_MODE,
  });
}

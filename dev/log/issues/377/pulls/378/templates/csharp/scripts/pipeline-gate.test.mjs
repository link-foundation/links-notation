import { test, expect } from 'bun:test';
import { checkPipeline } from './pipeline-gate.mjs';
function fixture({
  event = 'pull_request',
  code = true,
  releaseMode = 'instant',
} = {}) {
  const needs = Object.fromEntries(
    [
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
    ].map((name) => [name, { result: 'skipped', outputs: {} }]),
  );
  needs['release-preflight'].result = 'success';
  if (event !== 'workflow_dispatch') {
    needs['detect-changes'].result = 'success';
    needs['detect-changes'].outputs['any-code-changed'] = String(code);
  }
  if (code || event === 'workflow_dispatch')
    for (const job of ['lint', 'test', 'build']) needs[job].result = 'success';
  if (event === 'pull_request' && code) needs['changeset-check'].result = 'success';
  if (event === 'push') {
    needs['codecov-token'].result = 'success';
    if (code) needs.release.result = 'success';
  }
  if (event === 'workflow_dispatch')
    needs[releaseMode === 'instant' ? 'instant-release' : 'changeset-pr'].result =
      'success';
  return { needs, event, ref: 'refs/heads/main', releaseMode };
}
for (const event of ['push', 'pull_request', 'workflow_dispatch'])
  for (const code of [true, false])
    test(`${event} distinguishes expected work from inapplicable jobs (code=${code})`, () =>
      expect(() => checkPipeline(fixture({ event, code }))).not.toThrow());
for (const result of ['skipped', 'failure', 'cancelled', undefined])
  test(`required pipeline work cannot pass as ${result}`, () => {
    const data = fixture();
    data.needs.test.result = result;
    expect(() => checkPipeline(data)).toThrow();
  });
test('unknown, missing or malformed detector/job result cannot pass', () => {
  for (const mutate of [
    (d) => delete d.needs.build,
    (d) => (d.needs.extra = { result: 'skipped' }),
    (d) => delete d.needs['detect-changes'].outputs['any-code-changed'],
  ]) {
    const data = fixture();
    mutate(data);
    expect(() => checkPipeline(data)).toThrow();
  }
});
test('failed publication cannot produce a green main gate; deliberate changeset dispatch passes', () => {
  const data = fixture({ event: 'push' });
  data.needs.release.result = 'failure';
  expect(() => checkPipeline(data)).toThrow();
  expect(() =>
    checkPipeline(fixture({ event: 'workflow_dispatch', releaseMode: 'changeset-pr' })),
  ).not.toThrow();
});

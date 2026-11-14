import { describe, it, expect } from 'test-anywhere';
import { checkWorkflowPolicy } from '../scripts/check-ci-workflows.mjs';

describe('workflow policy regression protection', () => {
  for (const spec of [
    'secretlint',
    '@secretlint/preset',
    'secretlint@latest',
    'secretlint@^13.0.7',
  ]) {
    for (const option of ['-p ', '--package=']) {
      it(`rejects unpinned package ${option}${spec}`, () => {
        expect(
          checkWorkflowPolicy(`run: npx --yes ${option}${spec} scan`).length
        ).toBeGreaterThan(0);
      });
    }
  }
  it('checks every package option and a continued shell command', () => {
    expect(
      checkWorkflowPolicy('run: npx -p good@1.2.3 -p bad scan').length
    ).toBe(1);
    expect(
      checkWorkflowPolicy('run: npx -p good@1.2.3 \\\n  --package bad scan')
        .length
    ).toBe(1);
    expect(
      checkWorkflowPolicy(
        'run: npx -p secretlint@13.0.7 -p @secretlint/preset@13.0.7 scan'
      )
    ).toEqual([]);
  });
  it('rejects floating matrix and direct runner labels but ignores comments', () => {
    expect(
      checkWorkflowPolicy('os: [ubuntu-24.04, macos-latest, windows-latest]')
        .length
    ).toBe(1);
    expect(checkWorkflowPolicy('runs-on: ubuntu-latest').length).toBe(1);
    expect(
      checkWorkflowPolicy('# runs-on: ubuntu-latest\nruns-on: macos-15')
    ).toEqual([]);
  });
  it('rejects zizmor version drift and versions unsupported by the pinned action', () => {
    const workflow =
      'uses: zizmorcore/zizmor-action@v0.8.1\nwith:\n  version: 1.32.0\nrun: pipx run zizmor==1.32.0\n# pipx run zizmor==1.32.0';
    expect(checkWorkflowPolicy(workflow)).toEqual([]);
    expect(
      checkWorkflowPolicy(workflow.replace('zizmor==1.32.0', 'zizmor==1.29.0'))
        .length
    ).toBeGreaterThan(0);
    expect(
      checkWorkflowPolicy(workflow.replaceAll('1.32.0', '9.0.0')).length
    ).toBeGreaterThan(0);
  });
});

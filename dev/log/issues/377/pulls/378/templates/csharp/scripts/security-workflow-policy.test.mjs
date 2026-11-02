import { describe, expect, test } from 'bun:test';
import { isShaPinned } from './action-pins.mjs';
import { readFileSync } from 'node:fs';

const SECURITY_WORKFLOW = '.github/workflows/security.yml';

function readWorkflow() {
  return readFileSync(SECURITY_WORKFLOW, 'utf-8').replaceAll('\r\n', '\n');
}

describe('security workflow policy', () => {
  test('scans pushes, pull requests, and the weekly schedule', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain("cron: '0 6 * * 1'");
  });

  test('analyzes C# and GitHub Actions with CodeQL', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('language: [csharp, actions, javascript-typescript]');
    expect(isShaPinned(workflow, 'github/codeql-action/init')).toBe(true);
    expect(workflow).not.toContain('codeql-action/autobuild@');
    expect(workflow).toContain('build-mode: none');
    expect(isShaPinned(workflow, 'github/codeql-action/analyze')).toBe(true);
    expect(workflow).toContain('security-events: write');
  });

  test('rejects high-severity dependency changes on pull requests', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("if: github.event_name == 'pull_request'");
    expect(isShaPinned(workflow, 'actions/dependency-review-action')).toBe(true);
    expect(workflow).toContain('fail-on-severity: high');
    expect(workflow).toContain('comment-summary-in-pr: on-failure');
    expect(workflow).toContain('pull-requests: write');
  });

  test('uses current checkout and bounded jobs', () => {
    const workflow = readWorkflow();

    expect(isShaPinned(workflow, 'actions/checkout')).toBe(true);
    expect(workflow).toContain('timeout-minutes: 30');
    expect(workflow).toContain('timeout-minutes: 10');
    expect(workflow).toContain('cancel-in-progress: true');
  });

  test('downloads the actual filename registered by an unarchived upload', () => {
    const workflow = readWorkflow();
    const upload = workflow
      .split('  artifact-upload:')[1]
      .split('  artifact-download:')[0];
    const download = workflow
      .split('  artifact-download:')[1]
      .split('  security-status:')[0];
    // upload-artifact v7 ignores name when archive:false and registers the basename.
    const uploadedFile = upload.match(/path: (\S+)\s+archive: false/)[1];
    const downloadedName = download.match(/with:\s+name: (\S+)/)[1];
    expect(downloadedName).toBe(uploadedFile.split('/').at(-1));
    expect(download).toContain('skip-decompress: true');
    expect(download).toContain('digest-mismatch: error');
    expect(download).toContain('sha256sum --check');
    expect(download).toContain('node --throw-deprecation scripts/zip-archive.mjs');
  });
});

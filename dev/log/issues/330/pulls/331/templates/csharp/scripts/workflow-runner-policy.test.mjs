import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_DIR = '.github/workflows';
const RELEASE_WORKFLOW = join(WORKFLOW_DIR, 'release.yml');

function readWorkflow(filePath) {
  return readFileSync(filePath, 'utf-8').replaceAll('\r\n', '\n');
}

function listWorkflows() {
  return readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => join(WORKFLOW_DIR, name));
}

describe('workflow runner policy', () => {
  test('pins every Ubuntu runner instead of following ubuntu-latest', () => {
    const findings = [];

    for (const filePath of listWorkflows()) {
      readWorkflow(filePath)
        .split('\n')
        .forEach((line, index) => {
          if (/\bubuntu-latest\b/.test(line)) {
            findings.push(`${filePath}:${index + 1}: ${line.trim()}`);
          }
        });
    }

    expect(
      findings,
      `Pin these runner references to ubuntu-24.04:\n${findings.join('\n')}`
    ).toEqual([]);
  });

  test('keeps Linux, macOS, and Windows in the release test matrix', () => {
    const workflow = readWorkflow(RELEASE_WORKFLOW);

    expect(workflow).toContain('os: [ubuntu-24.04, macos-latest, windows-latest]');
  });
});

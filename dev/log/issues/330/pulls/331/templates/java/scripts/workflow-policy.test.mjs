#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const workflowPath = resolve(import.meta.dirname, '..', '.github', 'workflows', 'release.yml');
const workflow = readFileSync(workflowPath, 'utf8');

function runBlocks(yaml) {
  const lines = yaml.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index++) {
    const inline = lines[index].match(/^(\s*)run:\s+([^|>].*)$/);
    if (inline) {
      blocks.push(inline[2]);
      continue;
    }
    const scalar = lines[index].match(/^(\s*)run:\s*[|>][-+]?\s*$/);
    if (!scalar) continue;
    const indentation = scalar[1].length;
    const body = [];
    while (++index < lines.length) {
      const line = lines[index];
      if (line.trim() && line.length - line.trimStart().length <= indentation) {
        index--;
        break;
      }
      body.push(line);
    }
    blocks.push(body.join('\n'));
  }
  return blocks;
}

test('dispatch inputs are never interpolated directly into run scripts', () => {
  for (const block of runBlocks(workflow)) {
    assert.doesNotMatch(block, /\$\{\{\s*(?:inputs|github\.event\.inputs)\./);
  }
});

test('release workflow has the required cancellation and writer serialization policy', () => {
  assert.doesNotMatch(workflow, /^concurrency:/m, 'workflow-level concurrency can cancel writers');
  assert.equal((workflow.match(/!cancelled\(\)/g) || []).length, 2);
  assert.equal((workflow.match(/group: main-writer-\$\{\{ github\.repository \}\}-main/g) || []).length, 4);
  assert.equal((workflow.match(/queue: max/g) || []).length, 4);
  assert.equal((workflow.match(/cancel-in-progress: true/g) || []).length, 5);
});

test('Codecov upload is explicit, current, gated, and fail-closed', () => {
  assert.match(workflow, /uses: codecov\/codecov-action@v7/);
  assert.match(workflow, /files: target\/site\/jacoco\/jacoco\.xml/);
  assert.match(workflow, /disable_search: true/);
  assert.match(workflow, /fail_ci_if_error: true/);
  assert.match(workflow, /env\.CODECOV_TOKEN != ''/);
});

test('every release path verifies uploaded artifacts', () => {
  assert.equal((workflow.match(/name: Verify published release artifacts/g) || []).length, 3);
  assert.doesNotMatch(workflow, /gh release upload[^\n]*\|\| true/);
});

test('GitHub output-file redirections are quoted', () => {
  assert.doesNotMatch(workflow, />>\s+\$GITHUB_OUTPUT/);
});

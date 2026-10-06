import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { describe, test } from "node:test";

const WORKFLOW_DIRECTORY = ".github/workflows";
const RELEASE_WORKFLOW = `${WORKFLOW_DIRECTORY}/release.yml`;

function readWorkflow(path = RELEASE_WORKFLOW) {
  return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

function workflowPaths() {
  return readdirSync(WORKFLOW_DIRECTORY)
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => `${WORKFLOW_DIRECTORY}/${file}`);
}

function jobBlock(workflow, name) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert.notEqual(start, -1, `missing job ${name}`);
  const relativeEnd = lines
    .slice(start + 1)
    .findIndex((line) => /^  [a-zA-Z0-9_-]+:\s*$/.test(line));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;
  return lines.slice(start, end).join("\n");
}

function runScripts(workflow) {
  const lines = workflow.split("\n");
  const scripts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const block = line.match(/^(\s*)run:\s*[|>][-+]?\s*$/);
    if (block) {
      const keyIndent = block[1].length;
      const body = [];
      for (index += 1; index < lines.length; index += 1) {
        const bodyLine = lines[index];
        if (bodyLine.trim() && bodyLine.match(/^\s*/)[0].length <= keyIndent) {
          index -= 1;
          break;
        }
        body.push(bodyLine);
      }
      scripts.push(body.join("\n"));
      continue;
    }

    const inline = line.match(/^\s*run:\s+(.+)$/);
    if (inline) scripts.push(inline[1]);
  }

  return scripts;
}

describe("release workflow policy", () => {
  const workflow = readWorkflow();

  test("keeps cancellation away from release writers", () => {
    assert.doesNotMatch(workflow, /^concurrency:/m);
    for (const name of ["auto-release", "instant-release", "changeset-release"]) {
      const job = jobBlock(workflow, name);
      assert.match(job, /group: main-writer-\$\{\{ github\.repository \}\}-main/);
      assert.match(job, /cancel-in-progress: false/);
      assert.match(job, /queue: max/);
    }
  });

  test("propagates cancellation through the test dependency graph", () => {
    const testJob = jobBlock(workflow, "test");
    assert.match(testJob, /!cancelled\(\)/);
    assert.doesNotMatch(testJob, /always\(\)/);
  });

  test("grants write permission only to release writers", () => {
    const beforeJobs = workflow.slice(0, workflow.indexOf("\njobs:"));
    assert.match(beforeJobs, /permissions:\n  contents: read/);
    assert.doesNotMatch(beforeJobs, /contents: write|pull-requests: write/);

    for (const name of ["auto-release", "instant-release", "changeset-release"]) {
      const job = jobBlock(workflow, name);
      assert.match(job, /permissions:\n      contents: write/);
    }
  });

  test("makes Codecov behavior explicit and deterministic", () => {
    const testJob = jobBlock(workflow, "test");
    assert.match(testJob, /CODECOV_TOKEN: \$\{\{ secrets\.CODECOV_TOKEN \}\}/);
    assert.match(testJob, /codecov\/codecov-action@[0-9a-f]{40} # v7/);
    assert.match(testJob, /token: \$\{\{ env\.CODECOV_TOKEN \}\}/);
    assert.match(testJob, /disable_search: true/);
    assert.match(testJob, /fail_ci_if_error: true/);
    assert.doesNotMatch(testJob, /continue-on-error:/);
    assert.match(testJob, /CODECOV_TOKEN is not configured/);
  });

  test("passes every expression to shell scripts through the environment", () => {
    for (const path of workflowPaths()) {
      for (const script of runScripts(readWorkflow(path))) {
        assert.doesNotMatch(
          script,
          /\$\{\{/,
          `${path} interpolates an expression directly into a run block`
        );
      }
    }
  });

  test("quotes every GITHUB_OUTPUT redirection", () => {
    for (const script of runScripts(workflow)) {
      assert.doesNotMatch(script, />>\s+\$GITHUB_OUTPUT\b/);
    }
  });

  test("verifies every published version before creating its release", () => {
    for (const name of ["auto-release", "instant-release", "changeset-release"]) {
      const job = jobBlock(workflow, name);
      const verify = job.indexOf("name: Verify module availability");
      const announce = job.indexOf("name: Create GitHub Release");
      assert.ok(verify >= 0, `${name} does not verify module availability`);
      assert.ok(announce > verify, `${name} announces before verification`);
    }
  });
});

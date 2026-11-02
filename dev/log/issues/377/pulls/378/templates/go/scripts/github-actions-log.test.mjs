import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { printUntrusted } from "./github-actions-log.mjs";

function capturePrint(value, options = {}) {
  let output = "";
  printUntrusted(value, {
    stream: { write: (chunk) => (output += chunk) },
    ...options,
  });
  return output;
}

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "go-template-log-test-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, ".changeset"));
  copyFileSync(
    "scripts/github-actions-log.mjs",
    join(root, "scripts/github-actions-log.mjs")
  );
  return root;
}

function writeChangeset(root, name, description, type = "patch") {
  writeFileSync(
    join(root, ".changeset", name),
    `---\n'go-ai-driven-development-pipeline-template': ${type}\n---\n\n${description}\n`
  );
}

function runFixture(root, script) {
  return spawnSync(process.execPath, [join(root, "scripts", script)], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GITHUB_ACTIONS: "true" },
  });
}

function assertGuarded(output, payload) {
  const payloadIndex = output.indexOf(payload);
  assert.ok(payloadIndex >= 0, `missing payload in output:\n${output}`);
  const prefix = output.slice(0, payloadIndex);
  const token = [...prefix.matchAll(/::stop-commands::([0-9a-f]{32})\n/g)].at(
    -1
  )?.[1];
  assert.ok(token, `payload was not preceded by a stop marker:\n${output}`);
  assert.ok(
    output.indexOf(`::${token}::`, payloadIndex + payload.length) >= 0,
    `payload was not followed by its resume marker:\n${output}`
  );
}

describe("printing contributor-authored CI log text", () => {
  test("prints ordinary local output without workflow markers", () => {
    assert.equal(
      capturePrint("quoted ##[error] text", { githubActions: false }),
      "quoted ##[error] text\n"
    );
  });

  test("brackets the complete value while GitHub interprets commands", () => {
    const token = "0123456789abcdef0123456789abcdef";
    const payload = [
      "##[error]not a real annotation",
      "##[stop-commands]attacker-token",
      "##[add-mask]arbitrary text",
    ].join("\n");

    assert.equal(
      capturePrint(payload, {
        githubActions: true,
        tokenFactory: () => token,
      }),
      `::stop-commands::${token}\n${payload}\n::${token}::\n`
    );
  });

  test("uses a fresh 128-bit hexadecimal token for every print", () => {
    const first = capturePrint("first", { githubActions: true });
    const second = capturePrint("second", { githubActions: true });
    const tokenPattern = /^::stop-commands::([0-9a-f]{32})$/m;
    const firstToken = first.match(tokenPattern)?.[1];
    const secondToken = second.match(tokenPattern)?.[1];

    assert.ok(firstToken);
    assert.ok(secondToken);
    assert.notEqual(firstToken, secondToken);
    assert.match(first, new RegExp(`::${firstToken}::`));
    assert.match(second, new RegExp(`::${secondToken}::`));
  });

  test("guards changeset descriptions and filenames on validation", () => {
    const root = fixtureRoot();
    const fileName = "injected-##[error]filename.md";
    const payload = "##[stop-commands]attacker-token";
    copyFileSync(
      "scripts/validate-changeset.mjs",
      join(root, "scripts/validate-changeset.mjs")
    );
    writeChangeset(root, fileName, payload);

    const result = runFixture(root, "validate-changeset.mjs");
    assert.equal(result.status, 0, result.stderr);
    assertGuarded(result.stdout, fileName);
    assertGuarded(result.stdout, payload);
  });

  test("guards merged changeset content and contributor filenames", () => {
    const root = fixtureRoot();
    const fileName = "injected-##[add-mask]filename.md";
    const payload = "##[error]not a real annotation";
    copyFileSync(
      "scripts/merge-changesets.mjs",
      join(root, "scripts/merge-changesets.mjs")
    );
    writeChangeset(root, fileName, payload);
    writeChangeset(root, "second.md", "ordinary description", "minor");

    const result = runFixture(root, "merge-changesets.mjs");
    assert.equal(result.status, 0, result.stderr);
    assertGuarded(result.stdout, fileName);
    assertGuarded(result.stdout, payload);
  });

  test("routes every contributor-controlled printer through the guard", () => {
    for (const file of [
      "scripts/check-file-size.mjs",
      "scripts/detect-code-changes.mjs",
      "scripts/merge-changesets.mjs",
      "scripts/validate-changeset.mjs",
      "scripts/version-and-commit.mjs",
    ]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /from "\.\/github-actions-log\.mjs"/);
      assert.match(source, /printUntrusted\(/);
    }
  });
});

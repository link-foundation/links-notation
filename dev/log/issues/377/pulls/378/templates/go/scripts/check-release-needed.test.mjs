import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { checkReleaseNeeded } from "./check-release-needed.mjs";

describe("missing GitHub release recovery", () => {
  test("skips existing releases without probing Git", () => {
    const calls = [];
    assert.equal(
      checkReleaseNeeded({
        version: "1.2.3",
        probe: (...args) => {
          calls.push(args);
          return { status: 0 };
        },
      }),
      false
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0][1], ["release", "view", "v1.2.3"]);
  });

  test("warns on unknown API failures without attempting recovery", () => {
    for (const response of [
      { status: 1, stderr: "HTTP 401: Bad credentials" },
      { status: 1, stderr: "HTTP 403: API rate limit exceeded" },
      { status: 1, stderr: "HTTP 404: repository not found" },
      { status: 1, stderr: "connection refused" },
      { status: 2, stderr: "release not found" },
      { status: null, stderr: "", error: new Error("gh not installed") },
    ]) {
      const warnings = [];
      let calls = 0;
      assert.equal(
        checkReleaseNeeded({
          version: "1.2.3",
          probe: () => {
            calls += 1;
            return response;
          },
          warn: (warning) => warnings.push(warning),
        }),
        false
      );
      assert.equal(calls, 1);
      assert.equal(warnings.length, 1);
    }
  });

  test("does not publish an untagged template version", () => {
    const warnings = [];
    assert.equal(
      checkReleaseNeeded({
        version: "1.2.3",
        probe: (command) =>
          command === "gh"
            ? { status: 1, stderr: "release not found\n" }
            : { status: 1 },
        warn: (warning) => warnings.push(warning),
      }),
      false
    );
    assert.equal(warnings.length, 1);
  });

  test("rejects invalid source versions before running commands", () => {
    assert.throws(
      () => checkReleaseNeeded({ version: undefined }),
      /Invalid current version/
    );
    assert.throws(
      () => checkReleaseNeeded({ version: '1.2.3"; echo injected' }),
      /Invalid current version/
    );
  });

  test("retries the current tagged version without changing source or changesets", () => {
    const root = mkdtempSync(join(tmpdir(), "go-release-recovery-"));
    try {
      mkdirSync(join(root, "pkg/mypackage"), { recursive: true });
      mkdirSync(join(root, ".changeset"));
      mkdirSync(join(root, "bin"));
      const source = 'package mypackage\nconst Version = "1.2.3"\n';
      const notes = "First change\n\n### Fixed\n- Second change";
      writeFileSync(join(root, "pkg/mypackage/mypackage.go"), source);
      writeFileSync(
        join(root, "CHANGELOG.md"),
        `# Changelog\n\n## [1.2.3] - today\n\n${notes}\n\n## [1.2.2] - yesterday\n\nOlder change\n`
      );
      // Mock GitHub only; preserve a real local release commit and tag.
      const git = (...args) => {
        const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
        assert.equal(result.status, 0, result.stderr);
        return result.stdout.trim();
      };
      git("init", "--quiet");
      git("add", "pkg", "CHANGELOG.md");
      git(
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "--quiet",
        "-m",
        "Release"
      );
      git("tag", "v1.2.3");
      const originalTag = git("rev-parse", "v1.2.3");
      writeFileSync(
        join(root, "bin/gh"),
        '#!/bin/sh\ncase "$2" in\nview)\n  if [ -f release.created ]; then exit 0; fi\n  echo "release not found" >&2\n  exit 1\n  ;;\ncreate)\n  cat > release.notes\n  touch release.created\n  ;;\n*) exit 2 ;;\nesac\n',
        { mode: 0o755 }
      );
      const run = (script, ...args) =>
        spawnSync(process.execPath, [resolve(`scripts/${script}`), ...args], {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${join(root, "bin")}:${process.env.PATH}`,
            GITHUB_OUTPUT: join(root, "output"),
          },
        });
      const result = run("check-release-needed.mjs");
      assert.equal(result.status, 0, result.stderr);
      const output = readFileSync(join(root, "output"), "utf8");
      assert.match(output, /^release_needed=true$/m);
      assert.match(output, /^version=1\.2\.3$/m);
      assert.match(output, /^tag=v1\.2\.3$/m);
      assert.equal(
        readFileSync(join(root, "pkg/mypackage/mypackage.go"), "utf8"),
        source
      );
      assert.match(result.stdout, /Recovering/);
      const create = run("create-github-release.mjs", "--version", "1.2.3");
      assert.equal(create.status, 0, create.stderr);
      assert.equal(readFileSync(join(root, "release.notes"), "utf8"), notes);
      writeFileSync(join(root, "output"), "");
      const retry = run("check-release-needed.mjs");
      assert.equal(retry.status, 0, retry.stderr);
      assert.match(
        readFileSync(join(root, "output"), "utf8"),
        /^release_needed=false$/m
      );
      assert.deepEqual(readdirSync(join(root, ".changeset")), []);
      assert.equal(git("rev-parse", "v1.2.3"), originalTag);
      git("diff", "--exit-code");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

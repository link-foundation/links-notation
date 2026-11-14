import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(path.join(root, "kotlin/build/js/package.json"));
const cli = require.resolve("mocha/bin/mocha.js");
const reporter =
  require.resolve("kotlin-web-helpers/dist/mocha-kotlin-reporter.js");
const fixture = fileURLToPath(new URL("./mocha-fixture.cjs", import.meta.url));
const hook = path.join(root, "kotlin/mocha-base.mjs");

test(
  "Mocha 12 reporter migration preserves discovery, skips and failure status",
  { timeout: 10000 },
  () => {
    const run = (imports, fail = false) =>
      spawnSync(
        process.execPath,
        [...imports, cli, "--reporter", reporter, fixture],
        {
          encoding: "utf8",
          env: { ...process.env, REPORTER_FAIL: fail ? "fail" : "" },
        },
      );
    const before = run([]);
    assert.notEqual(before.status, 0);
    assert.match(
      before.stderr,
      /Class constructor Base cannot be invoked without 'new'/,
    );
    const after = run(["--import", hook]);
    assert.equal(after.status, 0, after.stderr);
    assert.match(after.stdout, /testStarted name='passes'/);
    assert.match(after.stdout, /testIgnored name='skips'/);
    assert.doesNotMatch(
      after.stderr,
      /deprecated|DeprecationWarning|Exception during run/,
    );
    const failed = run(["--import", hook], true);
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /testFailed name='preserves failures'/);
  },
);

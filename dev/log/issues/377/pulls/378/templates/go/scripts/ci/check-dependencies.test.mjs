import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { findDependencies, checkDependencies } from "./check-dependencies.mjs";

const sha = "1".repeat(40);
const digest = "2".repeat(64);
const workflow = `
      - uses: actions/checkout@${sha} # v7.0.1
      - uses: docker://rhysd/actionlint@sha256:${digest} # v1.7.12
        bun-version: '1.4.2'
        go-version: '1.27.1'
        run: go install honnef.co/go/tools/cmd/staticcheck@2026.2.1
`;

describe("CI dependency freshness", () => {
  test("discovers action, container, Bun, Go and staticcheck pins", () => {
    const dependencies = findDependencies([
      { path: "test.yml", source: workflow },
    ]);
    assert.deepEqual(
      dependencies.map((dependency) => dependency.name),
      [
        "actions/checkout",
        "rhysd/actionlint",
        "oven-sh/bun",
        "go",
        "dominikh/go-tools",
      ]
    );
    assert.equal(dependencies[0].ref, sha);
    assert.equal(dependencies[1].ref, `sha256:${digest}`);
    assert.equal(dependencies[2].version, "1.4.2");
  });

  test("rejects mutable actions, missing version comments and floating tools", () => {
    for (const source of [
      "- uses: actions/checkout@v7",
      `- uses: actions/checkout@${sha}`,
      "bun-version: latest",
      "go-version: '1.27'",
      "run: go install honnef.co/go/tools/cmd/staticcheck@latest",
      "- uses: docker://rhysd/actionlint:1.7.12",
    ])
      assert.throws(
        () => findDependencies([{ path: "test.yml", source }]),
        /pin/i
      );
  });

  test("fails on an outdated tool and verifies action and image integrity", async () => {
    const dependencies = findDependencies([
      { path: "test.yml", source: workflow },
    ]);
    const checked = [];
    const versions = {
      "actions/checkout": "7.0.1",
      "rhysd/actionlint": "1.7.12",
      "oven-sh/bun": "1.4.3",
      go: "1.27.1",
      "dominikh/go-tools": "2026.2.1",
    };
    const errors = await checkDependencies(dependencies, {
      latest: async (dependency) => versions[dependency.name],
      verifyPin: async (dependency) => checked.push(dependency.name),
    });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /oven-sh\/bun.*1\.4\.2.*1\.4\.3/);
    assert.deepEqual(checked, ["actions/checkout", "rhysd/actionlint"]);
  });

  test("registry and integrity failures cannot silently pass", async () => {
    const dependencies = findDependencies([
      { path: "test.yml", source: workflow },
    ]).slice(0, 1);
    for (const failure of [
      "registry unavailable",
      "SHA does not match the release",
    ])
      assert.match(
        (
          await checkDependencies(dependencies, {
            latest: async () => {
              if (failure === "registry unavailable") throw new Error(failure);
              return "7.0.1";
            },
            verifyPin: async () => {
              throw new Error(failure);
            },
          })
        )[0],
        new RegExp(failure)
      );
  });
});

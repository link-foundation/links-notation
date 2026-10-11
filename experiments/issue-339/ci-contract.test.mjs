import { expect, test } from "bun:test";
import { checkGate, readWorkflows } from "../../scripts/ci/check-js-gate.mjs";

const mutate = (change) => {
  const workflows = structuredClone(readWorkflows());
  change(workflows);
  return checkGate(workflows);
};
test("the repository satisfies the JS gate", () =>
  expect(checkGate(readWorkflows())).toEqual([]));
test("independent Rust trigger is rejected", () =>
  expect(
    mutate((w) => {
      w["rust.yml"].on.push = {};
    }),
  ).not.toEqual([]));
test("a removed language dependency is rejected", () =>
  expect(
    mutate((w) => {
      delete w["js.yml"].jobs.rust.needs;
    }),
  ).not.toEqual([]));
test("a cancelled JS run cannot be bypassed", () =>
  expect(
    mutate((w) => {
      w["js.yml"].jobs.rust.if = "${{ always() }}";
    }),
  ).not.toEqual([]));
test("a JS-only path filter is rejected", () =>
  expect(
    mutate((w) => {
      w["js.yml"].on.pull_request = { paths: ["js/**"] };
    }),
  ).not.toEqual([]));
test("skipped JS parity is rejected", () =>
  expect(
    mutate((w) => {
      w["javascript.yml"].jobs.parity.if = "false";
    }),
  ).not.toEqual([]));
test("a hidden Cargo job in another workflow is rejected", () =>
  expect(
    mutate((w) => {
      w["escape.yml"] = {
        on: { push: {} },
        jobs: { probe: { steps: [{ run: "cargo test" }] } },
      };
    }),
  ).not.toEqual([]));
test("an ungated reusable caller is rejected", () =>
  expect(
    mutate((w) => {
      w["escape.yml"] = {
        on: { push: {} },
        jobs: { probe: { uses: "./.github/workflows/rust.yml" } },
      };
    }),
  ).not.toEqual([]));
test("checking out main after gating a PR is rejected", () =>
  expect(
    mutate((w) => {
      w["rust.yml"].jobs.lint.steps[0].with.ref = "main";
    }),
  ).not.toEqual([]));
test("gated stages cannot cancel each other", () =>
  expect(
    mutate((w) => {
      w["rust.yml"].jobs.lint.concurrency["cancel-in-progress"] = true;
    }),
  ).not.toEqual([]));
test("a reusable side workflow cannot also trigger independently", () =>
  expect(
    mutate((w) => {
      w["security.yml"].on.push = {};
    }),
  ).not.toEqual([]));
test("mentioning JS success in an unsafe OR does not establish a gate", () =>
  expect(
    mutate((w) => {
      w["js.yml"].jobs.rust.if =
        "${{ always() && (needs.js.result == 'success' || true) }}";
    }),
  ).not.toEqual([]));
test("explicit success OR true cannot bypass the default success condition", () =>
  expect(
    mutate((w) => {
      w["js.yml"].jobs.rust.if = "${{ success() || true }}";
    }),
  ).not.toEqual([]));

test("a YAML boolean false cannot silently skip JS parity", () =>
  expect(
    mutate((w) => {
      w["javascript.yml"].jobs.parity.if = false;
    }),
  ).not.toEqual([]));
test("a conditional ancestor cannot silently skip the JS stage", () =>
  expect(
    mutate((w) => {
      w["js.yml"].jobs.js.needs = ["docs"];
    }),
  ).not.toEqual([]));
test("one failed JS check cannot skip another mandatory check", () =>
  expect(
    mutate((w) => {
      w["javascript.yml"].jobs.test.needs = ["lint"];
    }),
  ).not.toEqual([]));

test("Python test commands in another workflow require JS", () => {
  for (const run of ["pytest", "python3 -m pytest", "python -m pytest"]) {
    expect(
      mutate((w) => {
        w["escape.yml"] = {
          on: { push: {} },
          jobs: { probe: { steps: [{ run }] } },
        };
      }),
    ).not.toEqual([]);
  }
});
test("a native working directory cannot hide a language job", () =>
  expect(
    mutate((w) => {
      w["escape.yml"] = {
        on: { push: {} },
        jobs: {
          probe: {
            defaults: { run: { "working-directory": "python" } },
            steps: [{ run: "python3 run_tests.py" }],
          },
        },
      };
    }),
  ).not.toEqual([]));

test("publication waits for all seven native stages", () => {
  const workflows = readWorkflows();
  expect(workflows["js.yml"].jobs.release?.needs?.toSorted()).toEqual(
    ["js", "rust", "python", "java", "go", "csharp", "php"].toSorted(),
  );
  for (const language of [
    "javascript",
    "rust",
    "python",
    "java",
    "go",
    "csharp",
    "php",
  ]) {
    expect(
      Object.keys(workflows[`${language}.yml`].jobs).some((name) =>
        /publish|pushToNuget/i.test(name),
      ),
    ).toBe(false);
  }
  expect(workflows["js.yml"].jobs.release_audit.needs).toContain("release");
});

test("a missing native release prerequisite is rejected", () =>
  expect(
    mutate((w) => {
      w["js.yml"].jobs.release.needs = ["js"];
    }),
  ).not.toEqual([]));
test("a publisher inside a native stage is rejected", () =>
  expect(
    mutate((w) => {
      w["csharp.yml"].jobs.pushToNuget =
        w["publish-csharp.yml"].jobs.pushToNuget;
    }),
  ).not.toEqual([]));
test("provider failures cannot skip the final release audit", () =>
  expect(
    mutate((w) => {
      delete w["js.yml"].jobs.release_audit.if;
    }),
  ).not.toEqual([]));

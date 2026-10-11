import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkParity } from "../../scripts/ci/check-parity.mjs";

const manifest = JSON.parse(
  readFileSync(new URL("../../parity/language-features.json", import.meta.url)),
);
const options = { checkSources: false, checkVectors: false };
const mutate = (change) => {
  const copy = structuredClone(manifest);
  change(copy);
  return checkParity(copy, undefined, options);
};
test("current manifest covers every fixture and language", () =>
  assert.deepEqual(checkParity(manifest), []));
test("a new JS-only feature fails the gate", () =>
  assert.notEqual(
    mutate((m) => {
      m.features.push({
        id: "new-feature",
        description: "new",
        implementations: { js: m.features[0].implementations.js },
      });
    }).length,
    0,
  ));
test("removing a binding fails the gate", () =>
  assert.notEqual(
    mutate((m) => {
      delete m.features[0].implementations.php;
    }).length,
    0,
  ));
test("an undocumented exception fails the gate", () =>
  assert.notEqual(
    mutate((m) => {
      m.features[0].implementations.java = { status: "exception" };
    }).length,
    0,
  ));
test("a shared feature without golden cases fails the gate", () =>
  assert.notEqual(
    mutate((m) => {
      m.features[0].id = "uncovered";
    }).length,
    0,
  ));
test("stale source evidence fails the gate", () => {
  const m = structuredClone(manifest);
  m.sources.rust.sha256 = "stale";
  assert.ok(checkParity(m).some((error) => error.startsWith("rust:")));
});
test("missing evidence is rejected", () =>
  assert.notEqual(
    mutate((m) => {
      m.features[0].implementations.rust.evidence = ["rust/missing-test.rs"];
    }).length,
    0,
  ));
test("a feature without a C++ row fails the gate", () =>
  assert.ok(
    mutate((m) => {
      delete m.features[0].implementations.cpp;
    }).some((error) => error.endsWith("missing cpp")),
  ));

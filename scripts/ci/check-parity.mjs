#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  fixtures,
  nestedFixtures,
  renderNestedVectors,
  renderSyntaxVectors,
  renderVectors,
  syntaxFixtures,
} from "./text-fixtures.mjs";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const languages = [
  "js",
  "rust",
  "python",
  "java",
  "go",
  "csharp",
  "php",
  "cpp",
  "swift",
  "kotlin",
];
const sourceRoots = {
  js: ["js/src"],
  rust: ["rust/links-notation/src", "rust/links-notation-macro/src"],
  python: ["python/links_notation"],
  java: ["java/src/main"],
  go: ["go"],
  csharp: ["csharp/Link.Foundation.Links.Notation"],
  php: ["php/src"],
  cpp: ["cpp/include", "cpp/src"],
  swift: ["swift/Sources"],
  kotlin: ["kotlin/src/commonMain"],
};

export function sourceInventory(language) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        ["bin", "obj", "__pycache__", "examples", "target"].includes(entry.name)
      )
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        /\.(?:js|ts|rs|py|java|go|cs|peg|pegjs|php|cpp|hpp|hpp\.in|swift|kt)$/.test(
          path,
        ) &&
        !/_test\.go$/.test(path)
      )
        files.push(relative(root, path));
    }
  }
  for (const directory of sourceRoots[language]) visit(join(root, directory));
  files.sort();
  const hash = createHash("sha256");
  for (const file of files)
    hash
      .update(file)
      .update("\0")
      .update(readFileSync(join(root, file)))
      .update("\0");
  return { files, sha256: hash.digest("hex") };
}

export function checkParity(
  manifest,
  cases = fixtures,
  options = {},
  syntaxCases = syntaxFixtures,
) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (manifest.schemaVersion !== 1) fail("unknown parity schemaVersion");
  if (JSON.stringify(manifest.languages) !== JSON.stringify(languages))
    fail("all ten languages must be listed");
  if (!Array.isArray(manifest.features) || !manifest.features.length)
    return [...errors, "features must not be empty"];
  if (
    !nestedFixtures.length ||
    nestedFixtures.some(
      (f) =>
        !f.id || typeof f.input !== "string" || typeof f.nested !== "string",
    )
  )
    fail("nested fixtures require id, input and nested text");
  if (
    options.checkVectors !== false &&
    readFileSync(join(root, "parity/nested-vectors.tsv"), "utf8") !==
      renderNestedVectors()
  )
    fail(
      "nested-vectors.tsv is stale; regenerate it from the reviewed JSON fixtures",
    );
  if (new Set(nestedFixtures.map((f) => f.id)).size !== nestedFixtures.length)
    fail("nested fixture IDs must be unique");
  for (const fixture of cases) {
    if (
      !nestedFixtures.some(
        (n) => n.id === fixture.id && n.input === fixture.input,
      )
    )
      fail(
        `${fixture.id}: shared text fixture missing from nested writer coverage`,
      );
  }
  const featureIds = new Set();
  const fixtureIds = new Set();
  for (const fixture of cases) {
    if (!fixture.id || fixtureIds.has(fixture.id))
      fail(`duplicate or missing fixture id: ${fixture.id}`);
    fixtureIds.add(fixture.id);
    if (
      typeof fixture.input !== "string" ||
      typeof fixture.format !== "string" ||
      typeof fixture.lessParentheses !== "string" ||
      !Array.isArray(fixture.expected)
    )
      fail(
        `${fixture.id}: input, expected tree, format and lessParentheses are required`,
      );
    function node(links) {
      for (const link of links) {
        if (
          !link ||
          !Object.hasOwn(link, "id") ||
          (link.id !== null && typeof link.id !== "string") ||
          !Array.isArray(link.values)
        ) {
          fail(`${fixture.id}: invalid expected node`);
          continue;
        }
        node(link.values);
      }
    }
    if (Array.isArray(fixture.expected)) node(fixture.expected);
  }
  const syntaxIds = new Set();
  for (const fixture of syntaxCases) {
    if (!fixture.id || syntaxIds.has(fixture.id))
      fail(`duplicate or missing syntax fixture id: ${fixture.id}`);
    syntaxIds.add(fixture.id);
    if (
      typeof fixture.input !== "string" ||
      typeof fixture.cst !== "string" ||
      !Array.isArray(fixture.links)
    )
      fail(`${fixture.id}: input, links and cst are required`);
    function syntaxNode(links) {
      for (const link of links) {
        const nullableText = (key) =>
          link && (link[key] === null || typeof link[key] === "string");
        if (
          !nullableText("id") ||
          !nullableText("raw") ||
          !nullableText("quote") ||
          !Array.isArray(link.values) ||
          (link.id === null && link.raw !== null) ||
          (link.raw === null && link.quote !== null)
        ) {
          fail(`${fixture.id}: invalid syntax node`);
          continue;
        }
        syntaxNode(link.values);
      }
    }
    if (Array.isArray(fixture.links)) syntaxNode(fixture.links);
  }
  for (const feature of manifest.features) {
    if (!feature.id || featureIds.has(feature.id))
      fail(`duplicate or missing feature id: ${feature.id}`);
    featureIds.add(feature.id);
    if (!feature.description) fail(`${feature.id}: describe the contract`);
    for (const language of languages) {
      const implementation = feature.implementations?.[language];
      if (!implementation) {
        fail(`${feature.id}: missing ${language}`);
        continue;
      }
      if (implementation.status === "exception") {
        if (
          !implementation.reason ||
          !implementation.documentation ||
          !existsSync(resolve(root, implementation.documentation))
        )
          fail(
            `${feature.id}/${language}: exception needs a reason and existing documentation`,
          );
      } else if (implementation.status !== "implemented")
        fail(`${feature.id}/${language}: unknown or unfinished implementation`);
      else {
        for (const key of ["implementation", "evidence"]) {
          if (
            !Array.isArray(implementation[key]) ||
            !implementation[key].length
          )
            fail(`${feature.id}/${language}: ${key} is required`);
          for (const file of implementation[key] ?? []) {
            if (
              !file.startsWith(`${language}/`) ||
              !existsSync(resolve(root, file))
            )
              fail(
                `${feature.id}/${language}: missing or foreign ${key} file ${file}`,
              );
          }
        }
      }
    }
    if (
      feature.contract === "shared-text" &&
      !cases.some((fixture) => fixture.feature === feature.id)
    )
      fail(`${feature.id}: shared text feature needs a golden fixture`);
    if (
      feature.contract === "shared-syntax" &&
      !syntaxCases.some((fixture) => fixture.feature === feature.id)
    )
      fail(`${feature.id}: shared syntax feature needs a golden fixture`);
  }
  for (const fixture of [...cases, ...syntaxCases])
    if (!featureIds.has(fixture.feature))
      fail(`${fixture.id}: untracked feature ${fixture.feature}`);
  // A source change requires reviewing the manifest, even if it adds no export.
  // Hashes cannot prove semantics; the ten native suites prove fixture parity.
  if (options.checkSources !== false)
    for (const language of languages) {
      if (
        JSON.stringify(manifest.sources?.[language]) !==
        JSON.stringify(sourceInventory(language))
      )
        fail(
          `${language}: source inventory changed; review feature coverage then run --refresh-inventory`,
        );
    }
  if (
    options.checkVectors !== false &&
    readFileSync(join(root, "parity/text-vectors.tsv"), "utf8") !==
      renderVectors(cases)
  )
    fail(
      "text-vectors.tsv is stale; regenerate it from the reviewed JSON fixtures",
    );
  if (
    options.checkVectors !== false &&
    readFileSync(join(root, "parity/syntax-vectors.tsv"), "utf8") !==
      renderSyntaxVectors(syntaxCases)
  )
    fail(
      "syntax-vectors.tsv is stale; regenerate it from the reviewed JSON fixtures",
    );
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = join(root, "parity/language-features.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (process.argv.includes("--refresh-inventory")) {
    const errors = checkParity(manifest, fixtures, {
      checkSources: false,
      checkVectors: false,
    });
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exitCode = 1;
    } else {
      manifest.sources = Object.fromEntries(
        languages.map((language) => [language, sourceInventory(language)]),
      );
      writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
      writeFileSync(join(root, "parity/text-vectors.tsv"), renderVectors());
      writeFileSync(
        join(root, "parity/nested-vectors.tsv"),
        renderNestedVectors(),
      );
      writeFileSync(
        join(root, "parity/syntax-vectors.tsv"),
        renderSyntaxVectors(),
      );
      console.log(
        "Refreshed reviewed source inventory, text vectors and syntax vectors.",
      );
    }
  } else {
    const errors = checkParity(manifest);
    for (const error of errors) console.error(`::error::${error}`);
    console.log(
      `${manifest.features.length} features, ${fixtures.length} shared text cases, ${syntaxFixtures.length} shared syntax cases, ${languages.length} languages; ${errors.length} violations.`,
    );
    process.exitCode = errors.length ? 1 : 0;
  }
}

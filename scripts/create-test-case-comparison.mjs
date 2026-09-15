#!/usr/bin/env node
/**
 * Build TEST_CASE_COMPARISON.md: which test exists in which of the seven
 * supported languages, with a link to each one.
 *
 * The document is generated, never edited. Run it with `--check` to fail when
 * the committed copy no longer matches the tests on disk, which is what CI and
 * the pre-commit hook do.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Normalize a test name for comparison by:
 * 1. Converting to lowercase
 * 2. Removing all non-alphanumeric characters (spaces, underscores, hyphens, parentheses, slashes, etc.)
 * 3. Removing "test" from anywhere in the name
 * 4. Removing common issue references like "issue21", "issue105"
 * 5. Removing "parser" suffix variations
 *
 * This allows matching tests with different naming conventions:
 * - test_bug1, BugTest1, bug_test_1 all → "bug1"
 * - test_link_tostring_with_id_only, LinkToStringWithIdOnly → "linktostringwithidonly"
 * - "sequence/list context" vs "sequence context" → "sequencecontext" (after removing "list")
 */
function normalizeTestName(testName) {
  return testName
    .toLowerCase()                             // Lowercase everything
    .replace(/^test[_\s-]*/g, '')             // Remove "test" prefix with separators
    .replace(/[_\s-]*test[_\s-]*$/g, '')      // Remove "test" suffix with leading/trailing separators
    .replace(/[_\s\-()'":#/\\]/g, '')         // Remove ALL separators and special chars
    .trim();
}

/** Turn any of the naming conventions in use into the snake_case one. */
function toSnakeCase(name) {
  return name
    .replace(/([A-Z])/g, (match, letter, offset) => (offset > 0 ? '_' : '') + letter.toLowerCase())
    .replace(/[ -]/g, '_')
    .toLowerCase();
}

/** Every test name is stored with a `test_` prefix, whatever the language writes. */
function withTestPrefix(name) {
  return name.startsWith('test_') ? name : `test_${name}`;
}

/**
 * Collect the tests of one language.
 *
 * `pattern` must capture the test name in group 1; the link points at the line
 * the name is on, not at the line the attribute above it is on.
 */
function scan({ baseDir, directory, isTestFile, categoryOf, pattern, nameOf }) {
  const tests = {};

  for (const file of readdirSync(join(baseDir, directory)).filter(isTestFile).sort()) {
    const content = readFileSync(join(baseDir, directory, file), 'utf8');
    const category = categoryOf(file);
    const collected = tests[category] ?? (tests[category] = []);

    for (const match of content.matchAll(pattern)) {
      const original = withTestPrefix(nameOf(match[1]));
      const nameOffset = match.index + match[0].lastIndexOf(match[1]);
      collected.push({
        original,
        originalName: match[1],
        normalized: normalizeTestName(original),
        file: `${directory}/${file}`,
        line: content.slice(0, nameOffset).split('\n').length
      });
    }
  }

  return tests;
}

/**
 * The seven supported languages, in the order the columns appear.
 *
 * `flat` marks a language that does not keep one test file per category; see
 * `placeFlatTests` for how its tests find a category.
 */
const LANGUAGES = [
  {
    key: 'python',
    label: 'Python',
    extract: (baseDir) => scan({
      baseDir,
      directory: 'python/tests',
      isTestFile: (file) => file.startsWith('test_') && file.endsWith('.py'),
      categoryOf: (file) => file.replace('test_', '').replace('.py', ''),
      // Python tests are written both as module-level functions and as methods
      // of a `Test...` class; matching only the first kind hid whole files,
      // such as the comment suite, from the comparison.
      pattern: /^[ \t]*def (test_\w+)/gm,
      nameOf: (name) => name
    })
  },
  {
    key: 'javascript',
    label: 'JavaScript',
    extract: (baseDir) => scan({
      baseDir,
      directory: 'js/tests',
      isTestFile: (file) => file.endsWith('.test.js'),
      categoryOf: (file) => toSnakeCase(file.replace('.test.js', '').replace('Tests', '')),
      pattern: /(?:test|it)\(['"]([^'"]+)['"]/g,
      nameOf: toSnakeCase
    })
  },
  {
    key: 'rust',
    label: 'Rust',
    // The Rust code lives in a Cargo workspace: the integration tests are in
    // rust/links-notation/tests, not rust/tests. Pointing at the old path made
    // this script crash with ENOENT, and the pre-commit hook that runs it fails
    // the commit when regeneration fails.
    extract: (baseDir) => scan({
      baseDir,
      directory: 'rust/links-notation/tests',
      isTestFile: (file) => file.endsWith('_tests.rs'),
      categoryOf: (file) => file.replace('_tests.rs', ''),
      pattern: /#\[test\]\s*fn\s+(\w+)/g,
      nameOf: (name) => name
    })
  },
  {
    key: 'csharp',
    label: 'C#',
    extract: (baseDir) => scan({
      baseDir,
      directory: 'csharp/Link.Foundation.Links.Notation.Tests',
      isTestFile: (file) => file.endsWith('Tests.cs'),
      categoryOf: (file) => toSnakeCase(file.replace('Tests.cs', '')),
      pattern: /\[(?:Fact|Theory)\]\s*public\s+(?:static\s+)?(?:void|async\s+Task)\s+(\w+)/g,
      nameOf: toSnakeCase
    })
  },
  {
    key: 'go',
    label: 'Go',
    // Go puts most of its tests in one file, so its column is filled in by
    // matching test names rather than by file name.
    flat: true,
    extract: (baseDir) => scan({
      baseDir,
      directory: 'go',
      isTestFile: (file) => file.endsWith('_test.go'),
      categoryOf: (file) => file.replace('_test.go', ''),
      pattern: /^func (Test\w+)\(/gm,
      nameOf: toSnakeCase
    })
  },
  {
    key: 'java',
    label: 'Java',
    extract: (baseDir) => scan({
      baseDir,
      directory: 'java/src/test/java/io/github/linkfoundation/linksnotation',
      isTestFile: (file) => file.endsWith('Test.java'),
      categoryOf: (file) => toSnakeCase(file.replace('Test.java', '')),
      pattern: /@Test\s+(?:public\s+|private\s+|protected\s+)?(?:void|[\w<>,\s]+)\s+(\w+)\s*\(/g,
      nameOf: toSnakeCase
    })
  },
  {
    key: 'php',
    label: 'PHP',
    extract: (baseDir) => scan({
      baseDir,
      directory: 'php/tests',
      isTestFile: (file) => file.endsWith('Test.php'),
      categoryOf: (file) => toSnakeCase(file.replace('Test.php', '')),
      pattern: /public function (test\w+)\s*\(/g,
      nameOf: toSnakeCase
    })
  }
];

/**
 * File a flat language's tests under categories.
 *
 * A test is filed under every category that already knows a test by that name,
 * because one Go function can be the counterpart of same-named tests in two
 * categories. When no other language has the name, the file it lives in decides
 * the category, so a test unique to that language is still listed.
 */
function placeFlatTests(tests, categoriesByName) {
  const placed = {};

  for (const [fileCategory, collected] of Object.entries(tests)) {
    for (const test of collected) {
      const categories = categoriesByName.get(test.normalized) ?? new Set([fileCategory]);
      for (const category of categories) {
        (placed[category] ?? (placed[category] = [])).push(test);
      }
    }
  }

  return placed;
}

/** Count the tests a language has, without counting one test twice. */
function countTests(tests) {
  const seen = new Set();
  for (const collected of Object.values(tests)) {
    for (const test of collected) {
      seen.add(`${test.file}#${test.line}`);
    }
  }
  return seen.size;
}

function buildDocument(baseDir) {
  const extracted = LANGUAGES.map((language) => ({ ...language, tests: language.extract(baseDir) }));
  const structured = extracted.filter((language) => !language.flat);

  // Which categories know a test by each name, decided by the languages that
  // keep one test file per category.
  const categoriesByName = new Map();
  for (const language of structured) {
    for (const [category, collected] of Object.entries(language.tests)) {
      for (const test of collected) {
        const categories = categoriesByName.get(test.normalized) ?? new Set();
        categories.add(category);
        categoriesByName.set(test.normalized, categories);
      }
    }
  }

  for (const language of extracted) {
    if (language.flat) {
      language.tests = placeFlatTests(language.tests, categoriesByName);
    }
  }

  const allCategories = [
    ...new Set(extracted.flatMap((language) => Object.keys(language.tests)))
  ].sort();

  const allTestsByCategory = {};
  const testDisplayNames = {};

  for (const category of allCategories) {
    allTestsByCategory[category] = new Set();
    testDisplayNames[category] = {};

    for (const language of extracted) {
      for (const test of language.tests[category] ?? []) {
        allTestsByCategory[category].add(test.normalized);
        // The first language in column order that has the test names it.
        if (!testDisplayNames[category][test.normalized]) {
          testDisplayNames[category][test.normalized] = test.original;
        }
      }
    }
  }

  const labels = extracted.map((language) => language.label);

  let content = "# Comprehensive Test Case Comparison Across All Languages\n\n";
  content += `This document provides a detailed comparison of test cases across ${
    labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}.\n\n`;
  content += "> This file is generated by `scripts/create-test-case-comparison.mjs`. "
    + "Run that script after adding or renaming a test; do not edit this file by hand.\n\n";
  content += "## Legend\n\n";
  content += "- ✅ Test exists in the language\n";
  content += "- ❌ Test is missing in the language\n";
  content += "- ⚠️ Test adapted/modified for language-specific behavior\n\n";
  content += "Go keeps most of its tests in a single file rather than one file per category, "
    + "so its tests are matched to the categories below by name.\n\n";
  content += "---\n\n";

  content += "## Summary Statistics\n\n";
  content += "| Language | Total Tests | Test Categories |\n";
  content += "|----------|-------------|----------------|\n";
  for (const language of extracted) {
    const categories = Object.values(language.tests).filter((collected) => collected.length > 0).length;
    content += `| ${language.label} | ${countTests(language.tests)} | ${categories} |\n`;
  }
  content += "\n---\n\n";

  for (const category of allCategories) {
    const categoryDisplay = category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    content += `## ${categoryDisplay}\n\n`;

    const byLanguage = extracted.map((language) => ({
      label: language.label,
      map: new Map((language.tests[category] ?? []).map((test) => [test.normalized, test]))
    }));

    const allTests = Array.from(allTestsByCategory[category]).sort();

    if (allTests.length === 0) {
      content += "*No tests found in this category*\n\n";
      continue;
    }

    content += `| Test Name | ${labels.join(' | ')} |\n`;
    content += `|-----------|${labels.map(() => '---').join('|')}|\n`;

    for (const normalized of allTests) {
      const displayName = (testDisplayNames[category][normalized] || normalized)
        .replace(/^test_/, '')
        .replace(/_/g, ' ')
        .trim();

      // `#L<line>` is the anchor GitHub understands; a bare `file:line`
      // suffix is part of the path there, so every link 404s.
      const cells = byLanguage.map(({ map }) => {
        const test = map.get(normalized);
        return test ? `[✅](${test.file}#L${test.line})` : '❌';
      });

      content += `| ${displayName} | ${cells.join(' | ')} |\n`;
    }

    content += "\n**Category totals:** "
      + byLanguage.map(({ label, map }) => `${label}: ${map.size}`).join(', ')
      + "\n\n";
  }

  content += "---\n\n";
  content += "## Missing Tests Summary\n\n";

  for (const language of extracted) {
    content += `### ${language.label} Missing Tests\n\n`;

    let missingCount = 0;
    for (const category of allCategories) {
      const known = new Set((language.tests[category] ?? []).map((test) => test.normalized));
      const missing = Array.from(allTestsByCategory[category]).filter((name) => !known.has(name));

      if (missing.length > 0) {
        missingCount += missing.length;
        const categoryDisplay = category.replace('test_', '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
        content += `**${categoryDisplay}** (${missing.length} missing):\n`;
        for (const test of missing.sort()) {
          const formattedTest = test
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([a-z])(\d)/g, '$1 $2')
            .replace(/(\d)([a-z])/g, '$1 $2')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          content += `- ${formattedTest}\n`;
        }
        content += "\n";
      }
    }

    if (missingCount === 0) {
      content += "✅ No missing tests!\n\n";
    } else {
      content += `**Total missing: ${missingCount} tests**\n\n`;
    }
  }

  return { content, extracted };
}

/**
 * Replace the region between two markers in a file.
 *
 * The READMEs quote the test counts, and a quoted number is a number that goes
 * stale: the English one had said six languages and six wrong counts for
 * several releases. Now the counts live between markers and are written from
 * the same reading of the test files as the comparison document.
 */
function replaceMarkedRegion(text, marker, replacement, file) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`${file} has no ${start} ... ${end} region`);
  }
  return text.slice(0, from + start.length) + '\n' + replacement + text.slice(to);
}

/** The counts table each README shows, with that README's own headings. */
function countsTable(extracted, headings) {
  let table = `| ${headings.join(' | ')} |\n`;
  table += `|${headings.map(() => ' --- ').join('|')}|\n`;
  for (const language of extracted) {
    const categories = Object.values(language.tests).filter((collected) => collected.length > 0).length;
    table += `| ${language.label} | ${countTests(language.tests)} | ${categories} |\n`;
  }
  return table;
}

const baseDir = join(__dirname, '..');
const outputFile = join(baseDir, 'TEST_CASE_COMPARISON.md');
const check = process.argv.includes('--check');

const { content, extracted } = buildDocument(baseDir);

const generated = [
  { file: outputFile, content },
  ...[
    { name: 'README.md', headings: ['Language', 'Tests', 'Test categories'] },
    { name: 'README.ru.md', headings: ['Язык', 'Тестов', 'Категорий тестов'] }
  ].map(({ name, headings }) => {
    const path = join(baseDir, name);
    return {
      file: path,
      content: replaceMarkedRegion(
        readFileSync(path, 'utf8'),
        'test-counts',
        countsTable(extracted, headings),
        name
      )
    };
  })
];

const stale = generated.filter(({ file, content: expected }) => readFileSync(file, 'utf8') !== expected);

if (check) {
  if (stale.length > 0) {
    const names = stale.map(({ file }) => file.slice(baseDir.length + 1)).join(', ');
    console.error(`Out of date, run node scripts/create-test-case-comparison.mjs: ${names}`);
    process.exit(1);
  }
  console.log('The generated test documents are up to date.');
} else {
  for (const { file, content: written } of generated) {
    writeFileSync(file, written, 'utf8');
  }
  console.log(`Comparison document created: ${outputFile}`);
}

console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
for (const language of extracted) {
  const categories = Object.values(language.tests).filter((collected) => collected.length > 0).length;
  console.log(
    `${(language.label + ':').padEnd(12)} ${countTests(language.tests).toString().padStart(3)} tests across ${categories.toString().padStart(2)} categories`
  );
}
console.log("=".repeat(80));

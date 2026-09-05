#!/usr/bin/env node
/**
 * JavaScript side of the Links Notation token efficiency benchmarks.
 *
 * The Rust benchmark is the one that writes the documents and the report. Every
 * other language answers the two questions that make those numbers portable
 * rather than a property of one implementation:
 *
 * 1. does this language's own `links-notation` parser accept the generated
 *    Links Notation documents;
 * 2. does this language's own tokenizer count them the same way.
 *
 * It writes `benchmarks/results/js.json` and fails when a count differs from
 * `benchmarks/results/rust.json`.
 *
 * Usage: `node benchmarks/js/benchmark.mjs [--check] [--verbose]`
 * With `--check` the results file is compared instead of written, which is what
 * CI runs to catch a stale commit.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Parser } from 'links-notation';
import { encode as encodeO200k } from 'gpt-tokenizer/encoding/o200k_base';
import { encode as encodeCl100k } from 'gpt-tokenizer/encoding/cl100k_base';

const LANGUAGE = 'js';
const BENCHMARKS = join(dirname(fileURLToPath(import.meta.url)), '..');

const readText = (path) => readFileSync(join(BENCHMARKS, path), 'utf8');
const readJson = (path) => JSON.parse(readText(path));

/**
 * The four measurements taken of every document.
 *
 * `chars` counts Unicode scalar values rather than UTF-16 code units, so a
 * character outside the basic plane counts once here and once in every other
 * language.
 */
function measure(text) {
  return {
    tokens_o200k: encodeO200k(text).length,
    tokens_cl100k: encodeCl100k(text).length,
    chars: [...text].length,
    bytes: Buffer.byteLength(text, 'utf8'),
  };
}

function main() {
  const verbose = process.argv.includes('--verbose') || process.env.CI_VERBOSE === 'true';
  const check = process.argv.includes('--check');

  const index = readJson('generated/index.json');
  const parser = new Parser();
  const datasets = [];
  const totals = {};

  for (const entry of index.representations) {
    const formats = {};
    for (const [format, path] of Object.entries(entry.files)) {
      const text = readText(path);
      if (format.startsWith('lino')) {
        // Parsing with this language's own implementation is the point: a
        // document only counts if the notation is portable.
        parser.parse(text);
      }
      const metrics = measure(text);
      formats[format] = metrics;
      totals[format] = totals[format] ?? { tokens_o200k: 0, tokens_cl100k: 0, chars: 0, bytes: 0 };
      for (const key of Object.keys(metrics)) totals[format][key] += metrics[key];
    }
    if (verbose) console.error(`${entry.dataset}: measured ${Object.keys(formats).length} formats`);
    datasets.push({
      name: entry.dataset,
      structure: entry.structure,
      profile: entry.profile,
      formats: sortKeys(formats),
    });
  }

  const results = {
    schema: index.schema ?? 1,
    generator: LANGUAGE,
    tokenizers: { primary: 'o200k_base', secondary: 'cl100k_base' },
    datasets,
    totals: sortKeys(totals),
  };

  const differences = compare(results, readJson('results/rust.json'));
  if (differences.length > 0) {
    console.error(`${LANGUAGE}: ${differences.length} measurement(s) differ from the Rust results:`);
    for (const difference of differences.slice(0, 20)) console.error(`  - ${difference}`);
    process.exit(1);
  }

  const text = `${JSON.stringify(results, null, 2)}\n`;
  const path = `results/${LANGUAGE}.json`;
  if (check) {
    if (readText(path) !== text) {
      console.error(`${path} is out of date; run node benchmarks/js/benchmark.mjs`);
      process.exit(1);
    }
    console.log(`${LANGUAGE}: ${path} is up to date and agrees with the Rust results.`);
    return;
  }
  writeFileSync(join(BENCHMARKS, path), text);
  console.log(`${LANGUAGE}: wrote ${path}; every measurement agrees with the Rust results.`);
}

/** Object keys in a fixed order, so the results file does not churn. */
function sortKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Every measurement that differs from the reference results. */
function compare(results, reference) {
  const differences = [];
  const byName = new Map(reference.datasets.map((dataset) => [dataset.name, dataset]));
  for (const dataset of results.datasets) {
    const expected = byName.get(dataset.name);
    if (!expected) {
      differences.push(`${dataset.name}: missing from the Rust results`);
      continue;
    }
    for (const [format, metrics] of Object.entries(dataset.formats)) {
      for (const [key, value] of Object.entries(metrics)) {
        const other = expected.formats[format]?.[key];
        if (other !== value) {
          differences.push(`${dataset.name}/${format}/${key}: ${value} here, ${other} in Rust`);
        }
      }
    }
  }
  return differences;
}

main();

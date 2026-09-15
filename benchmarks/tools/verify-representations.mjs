#!/usr/bin/env node
/**
 * Check the generated benchmark documents with third-party parsers.
 *
 * The Rust benchmark writes every representation and validates the Links
 * Notation ones with the `links-notation` crate. That is a check of the
 * benchmark against itself. This tool is the independent one: it reads the
 * committed documents back with the libraries the rest of the world uses -
 * `lino-objects-codec`, `yaml`, `fast-xml-parser` and `csv-parse` - and
 * compares the result with the source dataset.
 *
 * A format cannot look cheap here by carrying less than the others: a document
 * that does not come back as its own dataset fails the run.
 *
 * Usage: `node benchmarks/tools/verify-representations.mjs`
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepStrictEqual } from 'node:assert';

import { decode } from 'lino-objects-codec';
import { parse as parseYaml } from 'yaml';
import { XMLParser } from 'fast-xml-parser';
import { parse as parseCsv } from 'csv-parse/sync';

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCHMARKS = join(HERE, '..');

const readJson = (path) => JSON.parse(readFileSync(join(BENCHMARKS, path), 'utf8'));
const readText = (path) => readFileSync(join(BENCHMARKS, path), 'utf8');

/**
 * The value the Links Notation reader gives back for a document.
 *
 * A document holding one link per line is a list of links, and the codec reads
 * it as such; the benchmark writes tuple datasets that way because it is the
 * form the notation exists for.
 */
function readLino(text) {
  return decode({ notation: text });
}

function readYaml(text) {
  return parseYaml(text);
}

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  // Every element becomes an array, so a list of one is not mistaken for a
  // single value and the comparison does not depend on how many items a
  // dataset happens to hold.
  isArray: () => true,
});

/**
 * What the XML parser is expected to return for a value, following the mapping
 * documented in `rust/links-notation-benchmark/src/xml.rs`.
 *
 * XML carries no types, so every scalar is compared as its text. It also has no
 * way to tell an absent value from an empty one: `null`, `{}`, `[]` and `''`
 * all reach the parser as an empty element. That is a property of the format
 * being measured, not of this check.
 */
function xmlShapeOf(value) {
  if (value === null) return '';
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return { item: value.map(xmlShapeOf) };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '';
    const shape = {};
    for (const [key, child] of entries) {
      shape[key] =
        Array.isArray(child) && child.length > 0
          ? child.map(xmlShapeOf)
          : [xmlShapeOf(child)];
    }
    return shape;
  }
  return String(value);
}

/** The rows CSV is expected to hold, or null when the value is not tabular. */
function csvRowsOf(value) {
  const text = (cell) => (cell === null ? '' : String(cell));
  const inner =
    value !== null && !Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === 1
      ? Object.values(value)[0]
      : value;
  if (!Array.isArray(inner) || inner.length === 0) return null;
  if (inner.every((item) => Array.isArray(item))) {
    return inner.map((row) => row.map(text));
  }
  const header = Object.keys(inner[0]);
  return [header, ...inner.map((row) => header.map((key) => text(row[key])))];
}

const CHECKS = {
  lino: (text, dataset) => [readLino(text), dataset],
  'lino-min': (text, dataset) => [readLino(text), dataset],
  'lino-line': (text, dataset) => [readLino(text), dataset],
  json: (text, dataset) => [JSON.parse(text), dataset],
  'json-compact': (text, dataset) => [JSON.parse(text), dataset],
  yaml: (text, dataset) => [readYaml(text), dataset],
  xml: (text, dataset) => [xmlParser.parse(text).root, [xmlShapeOf(dataset)]],
  csv: (text, dataset) => [parseCsv(text), csvRowsOf(dataset)],
};

function main() {
  const generated = readJson('generated/index.json');
  const failures = [];
  let checked = 0;

  for (const entry of generated.representations) {
    const dataset = readJson(entry.files.json);
    for (const [format, path] of Object.entries(entry.files)) {
      const check = CHECKS[format];
      if (!check) {
        failures.push(`${entry.dataset}: no third-party check is defined for ${format}`);
        continue;
      }
      try {
        const [actual, expected] = check(readText(path), dataset);
        deepStrictEqual(actual, expected);
        checked += 1;
      } catch (error) {
        failures.push(`${entry.dataset} (${format}, ${path}): ${error.message.split('\n')[0]}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`${failures.length} representation(s) did not read back as their dataset:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log(`${checked} generated documents read back as their dataset.`);
}

main();

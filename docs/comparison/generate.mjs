/**
 * Writes the four documents the format comparison shows from one source.
 *
 * `comparison.json` is that source. The Links Notation next to it is whatever
 * `lino-objects-codec` serialises this object to today, so the picture in the
 * README always shows the notation the codec actually writes, not a form
 * someone typed once. The YAML and XML are derived from the same object, which
 * is how the YAML stopped agreeing with everything else: it carried three `id`
 * fields no other document had.
 *
 * Usage: `node docs/comparison/generate.mjs [--check]`. With `--check` the
 * committed files are compared instead of written, which is what CI runs.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decode, encode } from 'lino-objects-codec';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, 'comparison.json');

/**
 * XML has no notion of a list, so every writer invents one. Naming the item
 * after the singular of its container is the convention this example follows;
 * there is no rule to derive it from, so it is stated.
 */
const ARRAY_ITEM_NAMES = { employees: 'employee' };

function escapeXmlText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Render one JSON value as indented XML under the given element name. */
function toXml(name, value, depth = 0) {
  const padding = '  '.repeat(depth);
  if (Array.isArray(value)) {
    const itemName = ARRAY_ITEM_NAMES[name] ?? 'item';
    const items = value.map((item) => toXml(itemName, item, depth + 1)).join('');
    return `${padding}<${name}>\n${items}${padding}</${name}>\n`;
  }
  if (value !== null && typeof value === 'object') {
    const children = Object.entries(value)
      .map(([key, child]) => toXml(key, child, depth + 1))
      .join('');
    return `${padding}<${name}>\n${children}${padding}</${name}>\n`;
  }
  return `${padding}<${name}>${escapeXmlText(value)}</${name}>\n`;
}

function xmlDocument(source) {
  const entries = Object.entries(source);
  if (entries.length !== 1) {
    throw new Error('XML has exactly one root element, so the source needs exactly one top-level key');
  }
  const [name, value] = entries[0];
  return toXml(name, value);
}

/**
 * Refuse to write a document that says something different from the source.
 * The notation and the YAML are read back with the same libraries a consumer
 * would use, so a document that loses a field fails here rather than in the
 * picture.
 */
function assertRoundTrips(source, notation, yaml) {
  const expected = JSON.stringify(source);
  const fromNotation = JSON.stringify(decode({ notation }));
  if (fromNotation !== expected) {
    throw new Error(`the notation does not decode back to the source: ${fromNotation}`);
  }
  const fromYaml = JSON.stringify(YAML.parse(yaml));
  if (fromYaml !== expected) {
    throw new Error(`the YAML does not parse back to the source: ${fromYaml}`);
  }
}

function main() {
  const check = process.argv.includes('--check');
  const source = JSON.parse(readFileSync(SOURCE, 'utf8'));

  const documents = {
    'comparison.lino': `${encode({ obj: source }).trimEnd()}\n`,
    'comparison.yaml': YAML.stringify(source, { indent: 2 }),
    'comparison.xml': xmlDocument(source),
  };

  assertRoundTrips(source, documents['comparison.lino'], documents['comparison.yaml']);

  let stale = 0;
  for (const [name, contents] of Object.entries(documents)) {
    const path = join(HERE, name);
    if (check) {
      const committed = readFileSync(path, 'utf8');
      if (committed === contents) {
        console.log(`${name}: up to date`);
      } else {
        console.error(`${name}: stale, run 'node docs/comparison/generate.mjs'`);
        stale += 1;
      }
      continue;
    }
    writeFileSync(path, contents);
    console.log(`wrote ${name}`);
  }

  if (stale > 0) {
    process.exitCode = 1;
  }
}

main();

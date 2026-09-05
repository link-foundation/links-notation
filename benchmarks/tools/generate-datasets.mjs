#!/usr/bin/env node
// Regenerates the benchmark source datasets in `benchmarks/datasets/`.
//
// The datasets are the single source of truth of the benchmark: every other
// representation (lino, YAML, XML, compact JSON) is derived from them by the
// Rust benchmark, so no two formats can drift apart and describe different
// data. Generation is deterministic - the pseudo-random number generator is
// seeded with a constant - so re-running this script on any machine produces
// byte-identical files.
//
// Usage:
//   node benchmarks/tools/generate-datasets.mjs [--check]
//
// `--check` regenerates into memory and exits non-zero if the files on disk
// differ, which is how CI notices a hand-edited dataset.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = join(HERE, '..', 'datasets');

/**
 * mulberry32: a small, fast, fully specified 32-bit PRNG.
 *
 * The exact algorithm matters more than its statistical quality here: the
 * datasets have to be reproducible, and a hand-written generator is easier to
 * port than a dependency.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRandom(seed) {
  const next = mulberry32(seed);
  return {
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    bool(trueProbability = 0.5) {
      return next() < trueProbability;
    },
    float(min, max, decimals) {
      const value = min + next() * (max - min);
      return Number(value.toFixed(decimals));
    },
  };
}

const FIRST_NAMES = [
  'Ada', 'Alan', 'Grace', 'Linus', 'Barbara', 'Ken', 'Margaret', 'Dennis',
  'Radia', 'Edsger', 'Frances', 'Donald', 'Katherine', 'Bjarne', 'Anita',
  'Guido', 'Sophie', 'Hedy', 'Tim', 'Jean',
];
const LAST_NAMES = [
  'Lovelace', 'Turing', 'Hopper', 'Torvalds', 'Liskov', 'Thompson', 'Hamilton',
  'Ritchie', 'Perlman', 'Dijkstra', 'Allen', 'Knuth', 'Johnson', 'Stroustrup',
  'Borg', 'Rossum', 'Wilson', 'Lamarr', 'Berners-Lee', 'Bartik',
];
const DEPARTMENTS = ['engineering', 'research', 'design', 'support', 'operations'];
const ROLES = ['engineer', 'senior engineer', 'staff engineer', 'manager', 'analyst'];
const LANGUAGES = ['Rust', 'TypeScript', 'Python', 'Go', 'Java', 'C#', 'PHP'];
const LICENSES = ['MIT', 'Apache-2.0', 'Unlicense', 'BSD-3-Clause', 'MPL-2.0'];
const CITIES = ['Berlin', 'Lisbon', 'Osaka', 'Toronto', 'Nairobi', 'Bogota'];
const COUNTRIES = ['DE', 'PT', 'JP', 'CA', 'KE', 'CO'];
const PRODUCTS = [
  'mechanical keyboard', 'usb-c hub', 'noise cancelling headset', 'laptop stand',
  'ultrawide monitor', 'ergonomic mouse', 'webcam', 'desk lamp',
];
const LEVELS = ['debug', 'info', 'warn', 'error'];
const SERVICES = ['gateway', 'parser', 'indexer', 'scheduler', 'notifier'];

function isoDate(dayOffset) {
  const base = Date.UTC(2026, 0, 1);
  return new Date(base + dayOffset * 86400000).toISOString().slice(0, 10);
}

function isoTimestamp(secondsOffset) {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  return new Date(base + secondsOffset * 1000).toISOString().replace('.000Z', 'Z');
}

// Every dataset declares the structural pattern it exercises and the encoding
// profile that applies to it, so the report can say where each number comes
// from instead of presenting one undifferentiated average.
const DATASETS = [
  {
    name: 'employees',
    description: 'Uniform employee records',
    structure: 'uniform',
    profile: 'records',
    build(random) {
      const employees = [];
      for (let i = 0; i < 25; i += 1) {
        const first = random.pick(FIRST_NAMES);
        const last = random.pick(LAST_NAMES);
        employees.push({
          id: 1000 + i,
          name: `${first} ${last}`,
          email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
          department: random.pick(DEPARTMENTS),
          role: random.pick(ROLES),
          salary: random.int(60, 190) * 1000,
          active: random.bool(0.8),
          hiredOn: isoDate(-random.int(30, 3000)),
        });
      }
      return { employees };
    },
  },
  {
    name: 'analytics',
    description: 'Time-series analytics data',
    structure: 'uniform',
    profile: 'records',
    build(random) {
      const series = [];
      for (let i = 0; i < 30; i += 1) {
        series.push({
          date: isoDate(i),
          visitors: random.int(400, 9000),
          pageViews: random.int(900, 30000),
          bounceRate: random.float(0.18, 0.72, 3),
          avgSessionSeconds: random.int(35, 480),
        });
      }
      return { site: 'links-notation.org', series };
    },
  },
  {
    name: 'repositories',
    description: 'Repository listing with uniform fields',
    structure: 'uniform',
    profile: 'records',
    build(random) {
      const repositories = [];
      for (let i = 0; i < 20; i += 1) {
        repositories.push({
          rank: i + 1,
          name: `${random.pick(['links', 'lino', 'deep', 'graph', 'net'])}-${random.pick(['notation', 'codec', 'store', 'engine', 'kit'])}-${i}`,
          owner: random.pick(['link-foundation', 'linksplatform', 'deep-foundation']),
          stars: random.int(120, 48000),
          forks: random.int(5, 4200),
          language: random.pick(LANGUAGES),
          license: random.pick(LICENSES),
          archived: random.bool(0.15),
        });
      }
      return { repositories };
    },
  },
  {
    name: 'orders',
    description: 'E-commerce orders with nested items and addresses',
    structure: 'nested',
    profile: 'records',
    build(random) {
      const orders = [];
      for (let i = 0; i < 10; i += 1) {
        const itemCount = random.int(1, 4);
        const items = [];
        for (let j = 0; j < itemCount; j += 1) {
          items.push({
            sku: `SKU-${random.int(10000, 99999)}`,
            title: random.pick(PRODUCTS),
            quantity: random.int(1, 5),
            unitPrice: random.float(9.5, 499.9, 2),
          });
        }
        const cityIndex = random.int(0, CITIES.length - 1);
        orders.push({
          id: `ORD-2026-${String(1000 + i)}`,
          placedAt: isoTimestamp(i * 7331),
          status: random.pick(['pending', 'paid', 'shipped', 'delivered']),
          customer: {
            id: random.int(100, 999),
            name: `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`,
            email: `customer${random.int(100, 999)}@example.com`,
          },
          shipping: {
            street: `${random.int(1, 240)} ${random.pick(['Maple', 'Cedar', 'Union', 'Harbour'])} Street`,
            city: CITIES[cityIndex],
            country: COUNTRIES[cityIndex],
            postalCode: String(random.int(10000, 99999)),
          },
          items,
          total: Number(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)),
        });
      }
      return { orders };
    },
  },
  {
    name: 'event_logs',
    description: 'Semi-uniform event log records',
    structure: 'semi-uniform',
    profile: 'records',
    build(random) {
      const events = [];
      for (let i = 0; i < 20; i += 1) {
        const level = random.pick(LEVELS);
        const event = {
          at: isoTimestamp(i * 43),
          level,
          service: random.pick(SERVICES),
          message: random.pick([
            'request accepted',
            'parse completed',
            'cache miss',
            'retry scheduled',
            'connection reset by peer',
          ]),
        };
        // Only some records carry the optional fields, which is what makes the
        // dataset semi-uniform: a tabular encoding cannot use one header for it.
        if (random.bool(0.55)) {
          event.durationMs = random.int(1, 4200);
        }
        if (level === 'error' || random.bool(0.2)) {
          event.error = {
            kind: random.pick(['timeout', 'parse', 'io', 'conflict']),
            retryable: random.bool(0.6),
          };
        }
        if (random.bool(0.35)) {
          event.tags = [random.pick(['ci', 'prod', 'canary']), random.pick(['eu', 'us', 'apac'])];
        }
        events.push(event);
      }
      return { events };
    },
  },
  {
    name: 'feature_flags',
    description: 'Feature flags keyed by name',
    structure: 'keyed',
    profile: 'records',
    build(random) {
      const flags = {};
      for (let i = 0; i < 15; i += 1) {
        const name = `${random.pick(['new', 'fast', 'safe', 'beta', 'alt'])}_${random.pick(['parser', 'render', 'upload', 'search', 'export'])}_${i}`;
        flags[name] = {
          enabled: random.bool(0.5),
          rollout: {
            percentage: random.int(0, 100),
            cohort: random.pick(['internal', 'early-access', 'everyone']),
          },
          owner: random.pick(DEPARTMENTS),
          updatedOn: isoDate(-random.int(1, 400)),
        };
      }
      return { flags };
    },
  },
  {
    name: 'deep_config',
    description: 'Deeply nested application configuration',
    structure: 'deeply-nested',
    profile: 'records',
    build(random) {
      return {
        service: {
          name: 'links-notation-gateway',
          version: '0.17.0',
          runtime: {
            workers: random.int(2, 16),
            limits: {
              memoryMb: random.int(256, 4096),
              cpuMillis: random.int(200, 4000),
              requests: {
                perMinute: random.int(60, 12000),
                burst: random.int(10, 400),
                shed: {
                  enabled: true,
                  strategy: 'oldest-first',
                  thresholds: {
                    queueDepth: random.int(50, 900),
                    latencyMs: random.int(80, 1500),
                  },
                },
              },
            },
          },
          storage: {
            driver: 'postgres',
            endpoint: {
              host: 'db.internal.example.com',
              port: 5432,
              tls: {
                enabled: true,
                minVersion: '1.3',
                verify: {
                  hostname: true,
                  chain: true,
                },
              },
            },
            pool: {
              min: random.int(1, 8),
              max: random.int(9, 64),
              idleSeconds: random.int(10, 600),
            },
          },
          telemetry: {
            logs: { level: 'info', format: 'json', sampleRate: random.float(0.01, 1, 2) },
            traces: { enabled: true, sampleRate: random.float(0.01, 1, 2) },
            metrics: { enabled: true, intervalSeconds: random.int(5, 120) },
          },
        },
      };
    },
  },
  {
    name: 'sparse_records',
    description: 'Uniform records with missing values, empty containers and text that looks typed',
    structure: 'sparse',
    profile: 'records',
    build(random) {
      // Real payloads are not made of tidy values. This dataset is where the
      // formats are asked what they do with an absent value, an empty
      // container, an empty string, text outside ASCII, and text whose content
      // reads as a number or a boolean - the cases where a writer that quotes
      // too little silently changes the data.
      const responses = [];
      for (let i = 0; i < 18; i += 1) {
        responses.push({
          id: `resp-${1000 + i}`,
          respondent: random.bool(0.75)
            ? `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`
            : null,
          locale: random.pick(['de-DE', 'pt-PT', 'ja-JP', 'en-CA', 'sw-KE', 'es-CO']),
          comment: random.pick([
            'sehr gut, aber die Latenz stört',
            'a citação ficou perfeita',
            '設定がわかりやすい',
            '',
            'works, though the docs are thin',
          ]),
          score: random.bool(0.8) ? random.int(1, 10) : null,
          // Answers arrive as text even when they look like something else, so
          // a format that resolves bare scalars has to quote all four of these.
          answers: {
            version: random.pick(['1.0', '2.10', '3.0.1']),
            agreed: random.pick(['true', 'false', 'yes']),
            postalCode: String(random.int(10000, 99999)),
            reference: random.pick(['0012', '00.5', '1e3']),
          },
          tags: random.bool(0.4) ? [random.pick(['beta', 'survey', 'nps'])] : [],
          followUp: random.bool(0.3) ? { at: isoTimestamp(i * 3600), owner: 'support' } : {},
        });
      }
      return { responses };
    },
  },
  {
    name: 'doublets',
    description: 'Doublet links (2-tuples)',
    structure: 'tuples',
    profile: 'tuples',
    build(random) {
      const subjects = ['papa', 'mama', 'son', 'daughter', 'grandpa', 'grandma', 'uncle', 'aunt'];
      const objects = ['lovesMama', 'lovesPapa', 'hasCar', 'hasHouse', 'readsBooks', 'writesCode'];
      const rows = [];
      for (let i = 0; i < 20; i += 1) {
        rows.push([random.pick(subjects), random.pick(objects)]);
      }
      return rows;
    },
  },
  {
    name: 'triplets',
    description: 'Triplet relations (3-tuples)',
    structure: 'tuples',
    profile: 'tuples',
    build(random) {
      const subjects = ['papa', 'mama', 'son', 'daughter', 'team', 'parser', 'formatter'];
      const predicates = ['has', 'loves', 'owns', 'reads', 'writes', 'reviews'];
      const objects = ['car', 'house', 'book', 'garden', 'notation', 'benchmark', 'report'];
      const rows = [];
      for (let i = 0; i < 20; i += 1) {
        rows.push([random.pick(subjects), random.pick(predicates), random.pick(objects)]);
      }
      return rows;
    },
  },
  {
    name: 'sequences',
    description: 'Sequences of unlimited length (N-tuples)',
    structure: 'tuples',
    profile: 'tuples',
    build(random) {
      const words = [
        'links', 'notation', 'supports', 'any', 'number', 'of', 'references',
        'in', 'each', 'link', 'without', 'a', 'declared', 'schema',
      ];
      const rows = [];
      for (let i = 0; i < 15; i += 1) {
        const length = random.int(2, 7);
        const row = [];
        for (let j = 0; j < length; j += 1) {
          row.push(random.pick(words));
        }
        rows.push(row);
      }
      return rows;
    },
  },
];

// One seed per dataset, so adding or reordering a dataset never reshuffles the
// contents of the others.
function seedFor(name) {
  let hash = 2166136261;
  for (const character of name) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildAll() {
  const manifest = [];
  const files = new Map();

  for (const dataset of DATASETS) {
    const data = dataset.build(makeRandom(seedFor(dataset.name)));
    files.set(`${dataset.name}.json`, `${JSON.stringify(data, null, 2)}\n`);
    manifest.push({
      name: dataset.name,
      description: dataset.description,
      structure: dataset.structure,
      profile: dataset.profile,
      file: `${dataset.name}.json`,
    });
  }

  files.set('index.json', `${JSON.stringify({ datasets: manifest }, null, 2)}\n`);
  return files;
}

function main() {
  const check = process.argv.includes('--check');
  const files = buildAll();

  if (check) {
    const differences = [];
    for (const [name, content] of files) {
      const path = join(DATASETS_DIR, name);
      const onDisk = existsSync(path) ? readFileSync(path, 'utf8') : null;
      if (onDisk !== content) {
        differences.push(name);
      }
    }
    if (differences.length > 0) {
      console.error('Datasets on disk differ from the generator output:');
      for (const name of differences) {
        console.error(`  - datasets/${name}`);
      }
      console.error('Run: node benchmarks/tools/generate-datasets.mjs');
      process.exit(1);
    }
    console.log(`All ${files.size} dataset files match the generator output.`);
    return;
  }

  mkdirSync(DATASETS_DIR, { recursive: true });
  for (const [name, content] of files) {
    writeFileSync(join(DATASETS_DIR, name), content);
  }
  console.log(`Wrote ${files.size} files to benchmarks/datasets/`);
}

main();

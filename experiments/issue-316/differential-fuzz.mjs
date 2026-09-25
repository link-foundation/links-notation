// Differential fuzz for issue #316: the linear quote scanners must read every
// document exactly as the character-by-character ones did.
//
// Compares, on random quote-heavy documents,
//   - the generated parser before the change (git show <base>:js/src/parser-generated.js)
//     with the one in the working tree, and
//   - quotedReferenceEnd / stripComments before and DelimitedReferences /
//     stripComments after.
// Usage: node experiments/issue-316/differential-fuzz.mjs [iterations] [base]
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as current from '../../js/src/parser-generated.js';
import * as currentComments from '../../js/src/comments.js';
import { DelimitedReferences } from '../../js/src/quotes.js';

const iterations = Number(process.argv[2] ?? 20000);
const base = process.argv[3] ?? 'main';
const dir = mkdtempSync(join(tmpdir(), 'issue-316-'));
for (const file of ['parser-generated.js', 'comments.js']) {
  writeFileSync(join(dir, file), execSync(`git show ${base}:js/src/${file}`));
}
const before = await import(pathToFileURL(join(dir, 'parser-generated.js')));
const beforeComments = await import(pathToFileURL(join(dir, 'comments.js')));

const alphabets = [
  ["'", "'", "'", 'a', ' '],
  ["'", '"', '`', 'a', ' ', '(', ')', ':', '\n', '#'],
  ['"', '"', 'x', ' ', '\n', '  '],
  ['`', '`', '`', "'", 'b', '(', ')', ' '],
];

let seed = 316;
const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);

function outcome(parse, text) {
  try {
    return JSON.stringify(parse(text));
  } catch (error) {
    return `error at ${JSON.stringify(error.location?.start)}`;
  }
}

let mismatches = 0;
for (let i = 0; i < iterations; i++) {
  const alphabet = alphabets[i % alphabets.length];
  const length = 1 + Math.floor(random() * 24);
  let text = '';
  let parentheses = 0;
  for (let j = 0; j < length; j++) {
    const symbol = alphabet[Math.floor(random() * alphabet.length)];
    // Unbalanced groups take exponential time in the parser (issue #314),
    // which is not what this compares, so only a few are written.
    if (symbol === '(' || symbol === ')') {
      if (++parentheses > 3) continue;
      text += symbol;
      continue;
    }
    // Runs of one delimiter, so wide openings and escapes are common.
    text += random() < 0.3 ? symbol.repeat(1 + Math.floor(random() * 6)) : symbol;
  }

  const a = outcome(before.parse, text);
  const b = outcome(current.parse, text);
  if (a !== b) {
    mismatches++;
    console.log('parse mismatch', JSON.stringify(text), a, b);
  }
  if (beforeComments.stripComments(text) !== currentComments.stripComments(text)) {
    mismatches++;
    console.log('stripComments mismatch', JSON.stringify(text));
  }
  const references = new DelimitedReferences(text);
  for (let start = 0; start < text.length; start++) {
    if (beforeComments.quotedReferenceEnd(text, start) !== references.endAt(start)) {
      mismatches++;
      console.log('quotedReferenceEnd mismatch', JSON.stringify(text), start);
    }
  }
  if (mismatches > 20) break;
}
console.log(`${iterations} documents, ${mismatches} mismatches`);
process.exit(mismatches ? 1 : 0);

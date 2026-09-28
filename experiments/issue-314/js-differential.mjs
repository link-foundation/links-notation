// Parses every document read from a file (one per line, line breaks written as
// \n, as printed by random-documents.mjs) with the JS parser at the given path
// and prints one line per document: the formatted links or the error message.
// Comparing the output of two versions shows any change in behaviour.
// Usage: node js-differential.mjs <path to js/dist/index.js> <documents file>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [modulePath, documentsPath] = process.argv.slice(2);
const { Parser, formatLinks } = await import(pathToFileURL(resolve(modulePath)).href);
const parser = new Parser();
const lines = readFileSync(documentsPath, 'utf8').split('\n').filter((line) => line.length > 0);
for (const line of lines) {
  const document = line.replace(/\\(\\|n)/g, (_, c) => (c === 'n' ? '\n' : '\\'));
  let output;
  try {
    const links = parser.parse(document);
    output = `ok ${JSON.stringify(formatLinks(links))} ${JSON.stringify(links)}`;
  } catch (error) {
    output = `${error.name} ${JSON.stringify(error.message)}`;
  }
  console.log(output);
}

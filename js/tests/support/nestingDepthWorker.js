// Parses the documents it is sent on its own thread, so a test can stop a
// parse that takes too long instead of hanging.
import { parentPort } from 'node:worker_threads';
import { Parser } from '../../src/Parser.js';
import { formatLinks } from '../../src/Link.js';

const parser = new Parser();

parentPort.on('message', (source) => {
  try {
    parentPort.postMessage({ formatted: formatLinks(parser.parse(source)) });
  } catch (error) {
    parentPort.postMessage({ error: error.name });
  }
});

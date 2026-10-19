// Browser check for issue #351. Bundle with
// `npx esbuild browser-entry.js --bundle --platform=browser --outfile=bundle.js`,
// load bundle.js from an HTML page in Chromium, and read the page text.
import { Parser, StreamParser } from 'links-notation';
const links = new Parser().parse('(law: text)').map(String);
const seen = [];
const stream = new StreamParser();
stream.on('link', (link) => seen.push(String(link)));
stream.end('first value\nsecond value');
document.body.textContent = JSON.stringify({ links, seen });

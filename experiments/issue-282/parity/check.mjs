// Parse the document with the JavaScript implementation and print the formatted
// result, so run.sh can compare it with what the other six produce.
import { readFileSync } from 'node:fs';

import { Parser, formatLinks } from '../../../js/src/index.js';

const document = readFileSync(new URL('./document.lino', import.meta.url), 'utf8');
console.log(formatLinks(new Parser().parse(document)));

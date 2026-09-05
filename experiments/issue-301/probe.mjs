// What the JavaScript parser does with prose written after a "#".
import { Parser } from '../../js/src/index.js';
import { docs } from './docs.mjs';

for (const doc of docs) {
  try {
    const links = new Parser().parse(doc);
    console.log(`${JSON.stringify(doc)} -> PARSED [${links.map(String).join(' ')}]`);
  } catch (error) {
    console.log(`${JSON.stringify(doc)} -> ${error.constructor.name}: ${error.message.split('\n')[0]}`);
  }
}

// What the JavaScript parser says about documents that do not parse.
import { Parser } from '../../js/src/index.js';

const docs = ['# ok line\n# break: two\nci_gate x\n', 'a: b: c', 'a (b\n', 'a b)\n', ':'];
for (const doc of docs) {
  try {
    const links = new Parser().parse(doc);
    console.log(`${JSON.stringify(doc)} -> PARSED ${links.length} links`);
  } catch (error) {
    console.log(`${JSON.stringify(doc)} -> offset ${error.offset}`);
    console.log(error.message);
  }
}

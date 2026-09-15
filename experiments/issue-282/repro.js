import { Parser } from '../../js/src/index.js';
const p = new Parser();
const cases = [
  "a\n  b\nc\n  d",
  "array (\n  a\n    b\n  c\n    d\n)",
  "value (\n  id \"1\"\n  label \"one\"\n)",
  "value (\n  (id \"1\" label \"one\")\n  (id \"2\" label \"two\")\n)",
  "(a b c)",
  "(1: 2 3)",
];
for (const c of cases) {
  console.log("--- INPUT ---\n" + c);
  try {
    const links = p.parse(c);
    console.log("--- OUTPUT ---");
    for (const l of links) console.log("  " + l.toString());
  } catch (e) { console.log("ERROR " + e.message); }
}

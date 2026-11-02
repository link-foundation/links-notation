// Ports the single-reference cases of js/tests/MultiQuoteParser.test.js to
// Kotlin test functions; the other cases are written by hand.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/tests/MultiQuoteParser.test.js', import.meta.url), 'utf8');
const kotlin = (text) =>
  '"' + [...text].map((c) => ({ '\\': '\\\\', '"': '\\"', $: '\\$', '\n': '\\n' })[c] ?? c).join('') + '"';
const pattern =
  /test\('Test(\w+)', \(\) => \{\n(?:\s*\/\/[^\n]*\n)*\s*const input = ((?:'[^\n]*'|"[^\n]*"));\n\s*const result = parser\.parse\(input\);\n\n\s*expect\(result\.length\)\.toBe\(1\);\n\s*expect\(getSingleRefId\(result\)\)\.toBe\(\s*((?:'[^\n]*'|"[^\n]*"))\s*\);\n\}\);/g;
for (const [, name, input, expected] of source.matchAll(pattern)) {
  const value = (literal) => new Function(`return ${literal}`)();
  console.log(`    @Test\n    fun test${name}() = assertSingleReference(${kotlin(value(expected))}, ${kotlin(value(input))})\n`);
}

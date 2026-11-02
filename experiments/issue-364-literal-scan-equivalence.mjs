// Checks that the hand-written literal scanner in js/src/Cst.js matches the
// regular expression it replaced (CodeQL js/polynomial-redos), on random input.
const LITERAL = /~[0-9]+\{[^} \t\r\n()]*\}/y;
const PAYLOAD_END = new Set(["}", " ", "\t", "\r", "\n", "(", ")"]);
function literalEnd(text, start) {
  if (text[start] !== "~") return -1;
  let index = start + 1;
  while (index < text.length && text[index] >= "0" && text[index] <= "9")
    index++;
  if (index === start + 1 || text[index] !== "{") return -1;
  index++;
  while (index < text.length && !PAYLOAD_END.has(text[index])) index++;
  return text[index] === "}" ? index + 1 : -1;
}
const alphabet = ["~", "0", "9", "{", "}", " ", "\t", "\n", "(", ")", "a", ":"];
let checked = 0;
for (let round = 0; round < 200000; round++) {
  const length = 1 + Math.floor(Math.random() * 10);
  let text = "";
  for (let i = 0; i < length; i++)
    text += alphabet[Math.floor(Math.random() * alphabet.length)];
  for (let start = 0; start < text.length; start++) {
    LITERAL.lastIndex = start;
    const expected = LITERAL.test(text) ? LITERAL.lastIndex : -1;
    const actual = literalEnd(text, start);
    if (expected !== actual)
      throw new Error(
        `${JSON.stringify(text)}@${start}: ${expected} vs ${actual}`,
      );
    checked++;
  }
}
console.log(`equivalent on ${checked} positions`);

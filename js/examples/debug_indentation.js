import { parse } from "../src/parser-generated.js";

const withLeading = `  A: a
  B: b`;

console.log("Parsing with leading spaces:");
console.log(withLeading);
console.log("---");

try {
  const result = parse(withLeading);
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  console.log(e);
}

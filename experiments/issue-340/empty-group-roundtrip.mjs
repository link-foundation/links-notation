// The JavaScript reference formats an empty group `()` as nothing, so
// `(tags ())` reads back as `(tags)`: why the C++ benchmark-document test
// only parses. Run: node experiments/issue-340/empty-group-roundtrip.mjs
import { Parser, formatLinks } from "../../js/src/index.js";
const parser = new Parser();
for (const text of ["(tags ())", "(followUp ())", "tags ()", "(a ())"]) {
  const links = parser.parse(text);
  const again = parser.parse(formatLinks(links));
  console.log(JSON.stringify(text), "->", JSON.stringify(formatLinks(links)), "values:", JSON.stringify(links[0].values), "round trip equal:", JSON.stringify(links) === JSON.stringify(again));
}

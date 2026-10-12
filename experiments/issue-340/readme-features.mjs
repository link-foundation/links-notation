// The JavaScript reference's output for the formatting and indented-document
// snippets of cpp/README.md, which cpp/examples/features.cpp checks in C++.
// Run: node experiments/issue-340/readme-features.mjs
import { Parser, FormatConfig, formatLinks, formatIndentedDocument, parseIndentedDocument } from "../../js/src/index.js";
const links = new Parser().parse("(record: first second third fourth)");
const config = new FormatConfig({ indentLongLines: true, maxLineLength: 20, preferInline: false });
console.log(JSON.stringify(formatLinks(links, config)));
console.log(JSON.stringify(formatIndentedDocument(parseIndentedDocument("colors\n  red\n  'light blue'\nempty\n"))));

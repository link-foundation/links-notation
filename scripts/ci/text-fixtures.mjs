import { readFileSync } from "node:fs";

export const fixtures = JSON.parse(
  readFileSync(
    new URL("../../parity/text-fixtures.json", import.meta.url),
    "utf8",
  ),
);
export function renderTree(links) {
  return links
    .map(({ id, values }) => {
      const reference = id === null ? "~" : Buffer.from(id).toString("hex");
      return `(${reference}${values.length ? ` ${renderTree(values)}` : ""})`;
    })
    .join(" ");
}
export function renderVectors(cases = fixtures) {
  const hex = (value) => Buffer.from(value).toString("hex");
  return (
    "# id\tinput UTF-8 hex\texpected tree (null=~, refs=UTF-8 hex)\tformatted UTF-8 hex\n" +
    cases
      .map((f) =>
        [f.id, hex(f.input), renderTree(f.expected), hex(f.format)].join("\t"),
      )
      .join("\n") +
    "\n"
  );
}

// Syntax fixtures pin what parsing keeps beyond the links themselves: the raw
// text of every parsed reference and the lossless concrete syntax tree.
export const syntaxFixtures = JSON.parse(
  readFileSync(
    new URL("../../parity/syntax-fixtures.json", import.meta.url),
    "utf8",
  ),
);
// A link is `(id|raw|quote values...)`: each slot is UTF-8 hex, or `~` for null.
export function renderSyntaxTree(links) {
  const slot = (value) =>
    value === null ? "~" : Buffer.from(value).toString("hex");
  return links
    .map(({ id, raw, quote, values }) => {
      const head = [slot(id), slot(raw), slot(quote)].join("|");
      return `(${head}${values.length ? ` ${renderSyntaxTree(values)}` : ""})`;
    })
    .join(" ");
}
export function renderSyntaxVectors(cases = syntaxFixtures) {
  const hex = (value) => Buffer.from(value).toString("hex");
  return (
    "# id\tinput UTF-8 hex\tlinks (id|raw|quote, each UTF-8 hex or ~ for null)\tCST S-expression UTF-8 hex\n" +
    cases
      .map((f) =>
        [f.id, hex(f.input), renderSyntaxTree(f.links), hex(f.cst)].join("\t"),
      )
      .join("\n") +
    "\n"
  );
}

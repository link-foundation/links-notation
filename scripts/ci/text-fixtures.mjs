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

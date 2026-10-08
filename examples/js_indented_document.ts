import {
  Parser,
  Link,
  IndentedGroup,
  IndentedDocumentOptions,
  EscapeReferenceOptions,
  escapeReference,
  unescapeReference,
  parseIndentedDocument,
  formatIndentedDocument,
} from "../js";

const entries = new Map<string, string | string[]>([
  ["Question", "Answer"],
  ["Skills", ["JavaScript", "Python"]],
]);
const document: string = formatIndentedDocument(entries);
const options: IndentedDocumentOptions = {
  multipleValues: "join",
  maxDepth: 2,
};
const parsed: Map<string, string | string[]> = parseIndentedDocument(
  document,
  options,
);
const groups: IndentedGroup[] = new Parser().parseGroups(document);
const element: Link = groups[0].children[0].element;
const escaping: EscapeReferenceOptions = { minimal: true };
const escaped: string = escapeReference(element.getValuesString(), escaping);
const unescaped: string = unescapeReference(escaped);
const staticEscaped: string = Link.escapeReference(unescaped, escaping);
console.log(parsed, Link.unescapeReference(staticEscaped));

// @ts-expect-error only the two documented multiple-value policies are allowed
parseIndentedDocument(document, { multipleValues: "guess" });
// @ts-expect-error document values are text or arrays of text
formatIndentedDocument(new Map([["Question", 42]]));

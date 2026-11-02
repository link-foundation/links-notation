// Parses a document, prints its links, and formats them back: the first steps
// of swift/README.md, run against the package as a dependency.
import LinksNotation

let document = """
    papa (lovesMama: loves mama)
    son lovesMama
    daughter lovesMama
    all (love mama)
    """

let links = try Parser().parse(document)
for link in links {
    print(link.id ?? "(anonymous)", link.values.map { $0.id ?? "(...)" })
}
let formatted = formatLinks(links)
print(formatted)
guard try Parser().parse(formatted) == links else {
    fatalError("the formatted document does not read back as the same links")
}

do {
    _ = try Parser().parse("(unclosed")
    fatalError("an unclosed group must be refused")
} catch let error as ParseError {
    print("refused as expected: \(error)")
}

// The snippets of swift/README.md, each checked against what the README says
// it prints.
func expect(_ actual: String, _ expected: String, _ what: String) {
    guard actual == expected else {
        fatalError("\(what): expected \(expected.debugDescription), got \(actual.debugDescription)")
    }
}

expect(formatLinks(try Parser().parse("papa (lovesMama: loves mama)")), "(papa (lovesMama: loves mama))", "quick start")

let metadata = try Parser().parse("(t 1 '1')")[0]
guard metadata.values[1].rawId == "1", metadata.values[1].quote == nil,
    metadata.values[2].rawId == "'1'", metadata.values[2].quote == "'",
    metadata.values[1] == metadata.values[2]
else { fatalError("syntax metadata") }
expect(metadata.format(), "(t 1 1)", "syntax metadata")

let cst = try Parser().parseCst("a '1' # note\n")
expect(cst.description, "a '1' # note\n", "concrete syntax tree")
expect(
    cst.toSExpression(),
    ##"(document (line reference:"a" whitespace:" " reference:"'1'" whitespace:" " comment:"# note" newline:"\n"))"##,
    "concrete syntax tree")

let formatOptions = FormatOptions(maxLineLength: 20, indentLongLines: true, preferInline: false)
expect(
    formatLinks(try Parser().parse("(record: first second third fourth)"), options: formatOptions),
    "record:\n  first\n  second\n  third\n  fourth", "format options")

var streamed: [String] = []
let stream = StreamParser()
_ = stream.onLink { streamed.append($0.description) }
for chunk in ["papa (lov", "esMama: loves mama)\nson lo", "vesMama\n"] {
    _ = try stream.write(chunk)
}
_ = try stream.end()
expect(streamed.joined(separator: "\n"), "(papa (lovesMama: loves mama))\n(son lovesMama)", "stream parser")
expect(
    try StreamParser.parse(["a b\nc", " d\n"]).map(\.description).joined(separator: "\n"), "(a b)\n(c d)",
    "chunked parsing")

let indentedDocument = try parseIndentedDocument("colors\n  red\n  'light blue'\nempty\n")
guard indentedDocument == ["colors": .list(["red", "light blue"]), "empty": .list([])] else {
    fatalError("indented document")
}
expect(formatIndentedDocument(indentedDocument), "colors\n  red\n  light blue\nempty\n", "indented document")

let codec = BinaryLinoCodec()
expect(
    try codec.decodeText(try codec.encodeText("papa (lovesMama: loves mama)")), "papa (lovesMama: loves mama)",
    "binary links notation")
let v2 = BinaryLinoCodec(
    options: BinaryLinoOptions(externalReferences: true, arity: try ArityRange.parse("2..3"), packedWidths: true))
expect(try v2.decodeText(try v2.encodeText("a b c")), "a b c", "binary links notation version 2")

guard try Parser().parse("id:\n  value1\n  value2") == Parser().parse("(id: value1 value2)") else {
    fatalError("indented syntax")
}
expect(
    Link(id: "id", values: [Link(id: "value1"), Link(id: "value2")]).format(lessParentheses: true),
    "id: value1 value2", "custom formatting")
expect(
    formatLinks(try Parser().parse("value (\n  id \"1\"\n  label \"one\"\n)")), "(value ((id 1) (label one)))",
    "multi-line groups")
expect(
    formatLinks(try Parser().parse("# the machines this deploys to\ndeploy: staging # only staging, for now\n")),
    "(deploy: staging)", "comments")
expect(formatLinks(try Parser(options: ParserOptions(comments: false)).parse("# a b\n")), "('#' a b)", "comments off")

do {
    _ = try Parser(options: ParserOptions(maxDepth: 3)).parseLocated("((((a))))")
    fatalError("nesting depth")
} catch let error as LocatedParseError {
    guard error.line == 1, error.column == 4 else { fatalError("nesting depth position") }
    expect(
        error.message,
        "Nesting too deep at line 1, column 4: nesting depth exceeds the maximum of 3\n1 | ((((a))))\n  |    ^",
        "nesting depth")
}
print("all README examples hold")

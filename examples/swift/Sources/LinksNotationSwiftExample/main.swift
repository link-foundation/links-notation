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

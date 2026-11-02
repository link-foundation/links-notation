// Encodes and decodes the same corpus as examples/binary/csharp/Program.cs,
// printing each packet's bytes and its decoded text for
// examples/binary/run-interop.sh:
//
//     swift run -c release binary-lino examples/binary/corpus.txt

import Foundation
import LinksNotation

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
    FileHandle.standardError.write("usage: binary-lino examples/binary/corpus.txt\n".data(using: .utf8)!)
    exit(EXIT_FAILURE)
}
guard let data = FileManager.default.contents(atPath: arguments[1]), let corpus = String(data: data, encoding: .utf8)
else {
    FileHandle.standardError.write("cannot read \(arguments[1])\n".data(using: .utf8)!)
    exit(EXIT_FAILURE)
}

do {
    var lines = corpus.components(separatedBy: "\n")
    if lines.last == "" { lines.removeLast() }
    var output = ""
    for source in lines {
        let document = try BinaryLinoCodec().parseDocument(source.replacingOccurrences(of: "\\n", with: "\n"))
        for externalReferences in [false, true] {
            for arity in ["2", "2..3", "1.."] {
                for packedWidths in [false, true] {
                    let codec = BinaryLinoCodec(
                        options: BinaryLinoOptions(
                            externalReferences: externalReferences, arity: try ArityRange.parse(arity),
                            packedWidths: packedWidths))
                    let bytes = try codec.encode(document)
                    let decoded = try codec.decode(bytes)
                    guard decoded == document else { throw BinaryError("document changed: \(source)") }
                    let formatted = codec.formatDocument(decoded)
                    guard try codec.parseDocument(formatted) == document else {
                        throw BinaryError("text model changed: \(source)")
                    }
                    let hex = bytes.map {
                        String($0, radix: 16).count == 1 ? "0" + String($0, radix: 16) : String($0, radix: 16)
                    }
                    output +=
                        hex.joined(separator: " ") + "\t" + formatted.replacingOccurrences(of: "\n", with: "\\n") + "\n"
                }
            }
        }
    }
    FileHandle.standardOutput.write(output.data(using: .utf8)!)
} catch {
    FileHandle.standardError.write("\(error)\n".data(using: .utf8)!)
    exit(EXIT_FAILURE)
}

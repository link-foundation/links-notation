// Encodes and decodes the same corpus as examples/binary/csharp/Program.cs,
// printing each packet's bytes and its decoded text for run-interop.sh.

#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

#include "links_notation.hpp"

namespace {

std::string replace_all(std::string text, const std::string& from, const std::string& to) {
  for (std::size_t at = text.find(from); at != std::string::npos; at = text.find(from, at + to.size()))
    text.replace(at, from.size(), to);
  return text;
}

}  // namespace

int main(int argc, char** argv) {
  if (argc != 2) {
    std::cerr << "usage: binary_lino examples/binary/corpus.txt\n";
    return EXIT_FAILURE;
  }
  std::ifstream corpus(argv[1], std::ios::binary);
  if (!corpus) {
    std::cerr << "cannot read " << argv[1] << '\n';
    return EXIT_FAILURE;
  }
  using namespace links_notation;
  const BinaryLinoCodec text_codec;
  std::string source;
  try {
    while (std::getline(corpus, source)) {
      const std::vector<Link> document = text_codec.parse_document(replace_all(source, "\\n", "\n"));
      for (const bool external_references : {false, true}) {
        for (const char* arity : {"2", "2..3", "1.."}) {
          for (const bool packed_widths : {false, true}) {
            const BinaryLinoCodec codec(
                BinaryLinoOptions{external_references, ArityRange::parse(arity), packed_widths});
            const std::vector<std::uint8_t> bytes = codec.encode(document);
            if (codec.decode(bytes) != document) throw BinaryError("document changed: " + source);
            const std::string formatted = format_binary_document(codec.decode(bytes));
            if (codec.parse_document(formatted) != document) throw BinaryError("text model changed: " + source);
            std::string hex;
            for (const std::uint8_t byte : bytes) {
              char digits[4];
              std::snprintf(digits, sizeof digits, "%s%02x", hex.empty() ? "" : " ", byte);
              hex += digits;
            }
            std::cout << hex << '\t' << replace_all(formatted, "\n", "\\n") << '\n';
          }
        }
      }
    }
  } catch (const std::exception& error) {
    std::cerr << error.what() << '\n';
    return EXIT_FAILURE;
  }
  return corpus.bad() ? EXIT_FAILURE : EXIT_SUCCESS;
}

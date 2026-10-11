// The Links Notation documents the token benchmarks generate (benchmarks/
// generated) are portable: the C++ parser reads every one. The other languages
// check this in their benchmark programs; C++ has no offline tokenizer to count
// tokens with, so only this half of the benchmark applies to it. Like those
// programs, the test does not format the links back: no binding's formatter,
// the JavaScript reference included, keeps the empty groups of
// sparse_records (`tags ()` formats as `(tags )`).

#include <gtest/gtest.h>

#include <regex>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

namespace {

/// The Links Notation files listed in benchmarks/generated/index.json.
std::vector<std::string> generated_documents() {
  const std::string index = read_repository_file("benchmarks/generated/index.json");
  const std::regex file("\"(generated/[^\"]+\\.lino)\"");
  std::vector<std::string> paths;
  for (auto match = std::sregex_iterator(index.begin(), index.end(), file); match != std::sregex_iterator(); ++match)
    paths.push_back("benchmarks/" + (*match)[1].str());
  return paths;
}

}  // namespace

TEST(BenchmarkDocumentsTests, EveryGeneratedDocumentParses) {
  const std::vector<std::string> paths = generated_documents();
  // Three Links Notation forms of each of the eleven datasets.
  ASSERT_EQ(paths.size(), 33u);
  for (const std::string& path : paths) {
    SCOPED_TRACE(path);
    const std::string text = read_repository_file(path);
    std::vector<Link> links;
    ASSERT_NO_THROW(links = parse(text));
    EXPECT_FALSE(links.empty());
  }
}

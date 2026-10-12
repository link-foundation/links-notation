// Self-referenced links nested inside other links keep their ids.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;

namespace {

const std::optional<std::string> no_id;

std::optional<std::string> id_of(const char* id) { return std::string(id); }

}  // namespace

TEST(NestedSelfReferenceTests, TestNestedSelfReferencedObjectInPairValue) {
  // Test case from PARSER_BUG.md
  // This should parse a dict with two pairs, where the second pair's value
  // is itself a self-referenced dict definition (obj_1: dict ...)
  const std::string notation =
      "(obj_0: dict ((str bmFtZQ==) (str ZGljdDE=)) ((str b3RoZXI=) (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) "
      "((str b3RoZXI=) obj_0))))";

  const std::vector<Link> links = parse(notation);

  // Should parse exactly one top-level link
  ASSERT_EQ(links.size(), 1u);
  ASSERT_FALSE(links[0].values.empty()) << "Expected Link for top-level";

  // Top-level link should have ID "obj_0"
  EXPECT_EQ(links[0].id, id_of("obj_0"));

  // Should have: type marker + 2 pairs = 3 values
  const std::vector<Link>& values = links[0].values;
  ASSERT_EQ(values.size(), 3u);

  // First value is the type marker "dict"
  ASSERT_TRUE(values[0].is_reference() && values[0].id) << "Expected Ref for type marker";
  EXPECT_EQ(*values[0].id, "dict");

  // Second and third values are the two pairs
  const Link& pair1 = values[1];
  const Link& pair2 = values[2];

  // Pair 1: ((str bmFtZQ==) (str ZGljdDE=))
  ASSERT_FALSE(pair1.values.empty()) << "Expected Link for pair1";
  EXPECT_EQ(pair1.id, no_id);
  ASSERT_EQ(pair1.values.size(), 2u);

  // First element of pair1: (str bmFtZQ==)
  const Link& elem1 = pair1.values[0];
  ASSERT_FALSE(elem1.values.empty()) << "Expected Link for pair1 element 0";
  EXPECT_EQ(elem1.id, no_id);
  ASSERT_EQ(elem1.values.size(), 2u);
  EXPECT_EQ(elem1.values[0], Link("str"));
  EXPECT_EQ(elem1.values[1], Link("bmFtZQ=="));

  // Second element of pair1: (str ZGljdDE=)
  const Link& elem2 = pair1.values[1];
  ASSERT_FALSE(elem2.values.empty()) << "Expected Link for pair1 element 1";
  EXPECT_EQ(elem2.id, no_id);
  ASSERT_EQ(elem2.values.size(), 2u);
  EXPECT_EQ(elem2.values[0], Link("str"));
  EXPECT_EQ(elem2.values[1], Link("ZGljdDE="));

  // Pair 2: ((str b3RoZXI=) (obj_1: dict ...))
  // This is the critical test - the second element should be a self-referenced dict
  ASSERT_FALSE(pair2.values.empty()) << "Expected Link for pair2";
  EXPECT_EQ(pair2.id, no_id);
  ASSERT_EQ(pair2.values.size(), 2u);

  // First element of pair2: (str b3RoZXI=)
  const Link& key = pair2.values[0];
  ASSERT_FALSE(key.values.empty()) << "Expected Link for pair2 key";
  EXPECT_EQ(key.id, no_id);
  ASSERT_EQ(key.values.size(), 2u);
  EXPECT_EQ(key.values[0], Link("str"));
  EXPECT_EQ(key.values[1], Link("b3RoZXI="));

  // Second element of pair2: (obj_1: dict ((str bmFtZQ==) (str ZGljdDI=)) ((str b3RoZXI=) obj_0))
  // THIS IS THE KEY TEST - obj_1 should have its ID preserved
  const Link& obj1 = pair2.values[1];
  ASSERT_FALSE(obj1.values.empty()) << "Expected Link for obj_1";
  EXPECT_EQ(obj1.id, id_of("obj_1")) << "obj_1 should have its ID preserved";
  ASSERT_EQ(obj1.values.size(), 3u) << "obj_1 should have 3 values (type marker + 2 pairs)";

  // obj_1's type marker
  EXPECT_EQ(obj1.values[0], Link("dict"));

  // obj_1's first pair: ((str bmFtZQ==) (str ZGljdDI=))
  const Link& obj1_pair1 = obj1.values[1];
  if (!obj1_pair1.values.empty()) {
    ASSERT_EQ(obj1_pair1.values.size(), 2u);

    const Link& k1 = obj1_pair1.values[0];
    if (!k1.values.empty()) {
      ASSERT_GE(k1.values.size(), 2u);
      EXPECT_EQ(k1.values[0], Link("str"));
      EXPECT_EQ(k1.values[1], Link("bmFtZQ=="));
    }

    const Link& v1 = obj1_pair1.values[1];
    if (!v1.values.empty()) {
      ASSERT_GE(v1.values.size(), 2u);
      EXPECT_EQ(v1.values[0], Link("str"));
      EXPECT_EQ(v1.values[1], Link("ZGljdDI="));
    }
  }

  // obj_1's second pair: ((str b3RoZXI=) obj_0) - reference back to obj_0
  const Link& obj1_pair2 = obj1.values[2];
  if (!obj1_pair2.values.empty()) {
    ASSERT_EQ(obj1_pair2.values.size(), 2u);

    const Link& k2 = obj1_pair2.values[0];
    if (!k2.values.empty()) {
      ASSERT_GE(k2.values.size(), 2u);
      EXPECT_EQ(k2.values[0], Link("str"));
      EXPECT_EQ(k2.values[1], Link("b3RoZXI="));
    }

    // Should be a reference back to obj_0
    EXPECT_EQ(obj1_pair2.values[1], Link("obj_0"));
  }
}

TEST(NestedSelfReferenceTests, TestSelfReferenceAsDirectChildWorksCorrectly) {
  // This pattern should work (and did work before)
  const std::vector<Link> links = parse("(obj_0: list (int 1) (int 2) (obj_1: list (int 3) (int 4) obj_0))");

  ASSERT_EQ(links.size(), 1u);
  ASSERT_FALSE(links[0].values.empty()) << "Expected Link for top-level";
  EXPECT_EQ(links[0].id, id_of("obj_0"));
  const std::vector<Link>& values = links[0].values;
  ASSERT_EQ(values.size(), 4u);  // list + 1 + 2 + obj_1

  // The fourth value should be obj_1 with a self-reference
  const Link& obj1 = values[3];
  ASSERT_FALSE(obj1.values.empty()) << "Expected Link for obj_1";
  EXPECT_EQ(obj1.id, id_of("obj_1"));
  ASSERT_EQ(obj1.values.size(), 4u);  // list + 3 + 4 + obj_0
  EXPECT_EQ(obj1.values[3], Link("obj_0"));
}

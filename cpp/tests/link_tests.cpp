// The Link class: construction, writing, equality, combining and escaping.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

TEST(LinkTests, LinkConstructorWithIdOnlyTest) {
  const Link link(std::string("test"), {});
  EXPECT_EQ(link.id, std::optional<std::string>("test"));
  EXPECT_TRUE(link.values.empty());
}

TEST(LinkTests, LinkConstructorWithIdAndValuesTest) {
  const std::vector<Link> values = {Link("value1"), Link("value2")};
  const Link link(std::string("parent"), values);
  EXPECT_EQ(link.id, std::optional<std::string>("parent"));
  EXPECT_EQ(link.values.size(), 2u);
}

TEST(LinkTests, LinkToStringWithIdOnlyTest) {
  // As in JS, Python and C#: a link with only an id is the reference "test".
  // Rust alone keeps it apart and writes "(test: )".
  const Link link(std::string("test"), {});
  EXPECT_EQ(link.to_string(), "(test)");
}

TEST(LinkTests, LinkToStringWithValuesOnlyTest) {
  const Link link(std::nullopt, {Link("value1"), Link("value2")});
  EXPECT_EQ(link.to_string(), "(value1 value2)");
}

TEST(LinkTests, LinkToStringWithIdAndValuesTest) {
  const Link link(std::string("parent"), {Link("child1"), Link("child2")});
  EXPECT_EQ(link.to_string(), "(parent: child1 child2)");
}

TEST(LinkTests, LinkEqualsTest) {
  const Link link1(std::string("test"), {});
  const Link link2(std::string("test"), {});
  const Link link3(std::string("other"), {});
  EXPECT_EQ(link1, link2);
  EXPECT_NE(link1, link3);
}

TEST(LinkTests, LinkCombineTest) {
  const Link link1("first");
  const Link link2("second");
  const Link combined(std::nullopt, {link1, link2});
  EXPECT_EQ(combined.id, std::nullopt);
  EXPECT_EQ(combined.values.size(), 2u);
  // C++ has the combine method Rust lacks; it builds the same link.
  EXPECT_EQ(link1.combine(link2), combined);
}

TEST(LinkTests, LinkEscapeReferenceSimpleTest) {
  // Rust writes a reference as its escaped id.
  EXPECT_EQ(Link("test").to_link_or_id_string(), "test");
  EXPECT_EQ(Link("test123").to_link_or_id_string(), "test123");
}

TEST(LinkTests, LinkEscapeReferenceWithSpecialCharactersTest) {
  // A written reference must be quoted when it holds grammar characters.
  EXPECT_EQ(Link("has space").to_link_or_id_string(), "'has space'");
  EXPECT_EQ(Link("has:colon").to_link_or_id_string(), "'has:colon'");
}

TEST(LinkTests, LinkSimplifyTest) {
  // A link with an id and no values.
  const Link link1(std::string("test"), {});
  EXPECT_EQ(link1.id, std::optional<std::string>("test"));
  EXPECT_TRUE(link1.values.empty());

  // A link holding a single value.
  const Link single_ref("single");
  const Link link2(std::nullopt, {single_ref});
  EXPECT_EQ(link2.id, std::nullopt);
  ASSERT_EQ(link2.values.size(), 1u);
  EXPECT_EQ(link2.values[0], single_ref);
}

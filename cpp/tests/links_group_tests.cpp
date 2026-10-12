// Groups of links: an element and its children, flattened and written.

#include <gtest/gtest.h>

#include "test_support.hpp"

using namespace links_notation;
using namespace links_notation_test;

TEST(LinksGroupTests, LinksGroupConstructorTest) {
  const Link element("root");
  const std::vector<Link> children = {Link("child1"), Link("child2")};

  EXPECT_EQ(element, Link("root"));
  ASSERT_EQ(children.size(), 2u);
  EXPECT_EQ(children[0], Link("child1"));
  EXPECT_EQ(children[1], Link("child2"));

  // The LinksGroup C++ offers holds the same element and children.
  const LinksGroup group(element, {LinksGroup(children[0]), LinksGroup(children[1])});
  EXPECT_EQ(group.element, element);
  ASSERT_EQ(group.children.size(), 2u);
  EXPECT_EQ(group.children[0].element, children[0]);
  EXPECT_EQ(group.children[1].element, children[1]);
}

TEST(LinksGroupTests, LinksGroupConstructorEquivalentTest) {
  const Link root("root");
  const std::vector<Link> children = {Link("child1"), Link("child2")};
  std::vector<Link> values = {root};
  values.insert(values.end(), children.begin(), children.end());
  const Link group(std::string("group"), values);

  EXPECT_EQ(group.id, std::optional<std::string>("group"));
  ASSERT_EQ(group.values.size(), 3u);  // root and two children
  EXPECT_EQ(group.values[0], root);
}

TEST(LinksGroupTests, LinksGroupToListFlattensStructureTest) {
  const Link root("root");
  const Link child1("child1");
  const Link child2("child2");
  const Link grandchild("grandchild");

  // root with child1 and (child2 grandchild)
  const Link nested_child(std::nullopt, {child2, grandchild});
  const Link group(std::nullopt, {root, child1, nested_child});

  EXPECT_EQ(group.id, std::nullopt);
  ASSERT_EQ(group.values.size(), 3u);
  EXPECT_EQ(group.values[0], root);
  EXPECT_EQ(group.values[1], child1);
  EXPECT_EQ(group.values[2].id, std::nullopt);
  ASSERT_EQ(group.values[2].values.size(), 2u);
  EXPECT_EQ(group.values[2].values[0], child2);
  EXPECT_EQ(group.values[2].values[1], grandchild);

  // LinksGroup::to_list flattens the same tree depth first.
  const LinksGroup tree(root, {LinksGroup(child1), LinksGroup(child2, {LinksGroup(grandchild)})});
  EXPECT_EQ(tree.to_list(), (std::vector<Link>{root, child1, child2, grandchild}));
}

TEST(LinksGroupTests, LinksGroupToStringTest) {
  const Link group(std::nullopt, {Link("root"), Link("child1"), Link("child2")});
  const std::string output = group.to_string();
  EXPECT_NE(output.find("root"), std::string::npos) << output;
  EXPECT_NE(output.find("child1"), std::string::npos) << output;
  EXPECT_NE(output.find("child2"), std::string::npos) << output;
  // Wrapped in parentheses.
  EXPECT_NE(output.find('('), std::string::npos) << output;
  EXPECT_NE(output.find(')'), std::string::npos) << output;
}

TEST(LinksGroupTests, LinksGroupAppendToLinksListTest) {
  const Link element("root");
  const std::vector<Link> children = {Link("child1"), Link("child2")};
  std::vector<Link> values = {element};
  values.insert(values.end(), children.begin(), children.end());
  const Link group(std::nullopt, values);

  // Appending the group and then its values, as AppendToLinksList does.
  std::vector<Link> list;
  list.push_back(group);
  for (const Link& value : group.values) list.push_back(value);

  EXPECT_EQ(list.size(), 4u);  // the group, the element and two children
}

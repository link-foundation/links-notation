// Parses a document, inspects its links, and formats them back.

#include <cstdlib>
#include <iostream>

#include "links_notation.hpp"

int main() {
  const std::vector<links_notation::Link> links = links_notation::parse("papa (lovesMama: loves mama)\nson lovesMama");
  for (const links_notation::Link& link : links) std::cout << link.format() << '\n';

  const std::string formatted = links_notation::format_links(links);
  std::cout << formatted << '\n';
  // Formatting and parsing again gives the same links.
  return links_notation::parse(formatted) == links ? EXIT_SUCCESS : EXIT_FAILURE;
}

// Uses the installed headers and library, including the generated version.

#include <cstdlib>
#include <iostream>
#include <string>

#include "links_notation.hpp"
#include "links_notation/version.hpp"

int main() {
  const std::string source = "(papa: loves mama)";
  const std::string formatted = links_notation::format_links(links_notation::parse(source));
  std::cout << "links_notation " << LINKS_NOTATION_VERSION_STRING << ": " << formatted << '\n';
  return formatted == source ? EXIT_SUCCESS : EXIT_FAILURE;
}

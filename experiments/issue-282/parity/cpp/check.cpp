// Print what the C++ implementation makes of the document.

#include <fstream>
#include <iostream>
#include <sstream>

#include "links_notation.hpp"

int main(int argc, char **argv) {
  if (argc != 2) {
    std::cerr << "usage: check document.lino\n";
    return 1;
  }
  std::ifstream file(argv[1], std::ios::binary);
  std::ostringstream document;
  document << file.rdbuf();
  std::cout << links_notation::format_links(
                   links_notation::parse(document.str()))
            << '\n';
  return 0;
}

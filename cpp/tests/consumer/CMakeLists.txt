# Builds against links_notation the way a downstream project does: through
# find_package on an installed copy, or, when LINKS_NOTATION_SOURCE_DIR is
# set, by adding its sources as FetchContent_MakeAvailable would.
cmake_minimum_required(VERSION 3.16)
project(links_notation_consumer LANGUAGES CXX)

set(LINKS_NOTATION_SOURCE_DIR "" CACHE PATH "Build links_notation from this source tree")
if(LINKS_NOTATION_SOURCE_DIR)
  add_subdirectory("${LINKS_NOTATION_SOURCE_DIR}" links_notation)
else()
  find_package(links_notation REQUIRED CONFIG)
endif()

add_executable(links_notation_consumer main.cpp)
target_link_libraries(links_notation_consumer PRIVATE links_notation::links_notation)

enable_testing()
add_test(NAME links_notation_consumer COMMAND links_notation_consumer)

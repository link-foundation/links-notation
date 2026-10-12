# Kept out of the library's own build on purpose: this is an experiment, not
# something the published package should build or depend on.
cmake_minimum_required(VERSION 3.16)
project(issue_282_parity LANGUAGES CXX)

set(LINKS_NOTATION_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LINKS_NOTATION_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
add_subdirectory(../../../../cpp links_notation)

add_executable(check check.cpp)
target_link_libraries(check PRIVATE links_notation::links_notation)

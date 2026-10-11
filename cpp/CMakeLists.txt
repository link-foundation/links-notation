cmake_minimum_required(VERSION 3.16)

# The version lives in VERSION so release tooling reads one plain file, the
# same way go/VERSION works for the Go module.
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/VERSION" LINKS_NOTATION_VERSION)
string(STRIP "${LINKS_NOTATION_VERSION}" LINKS_NOTATION_VERSION)

project(links_notation
  VERSION ${LINKS_NOTATION_VERSION}
  DESCRIPTION "Links Notation (LiNo) parser and formatter"
  HOMEPAGE_URL "https://github.com/link-foundation/links-notation"
  LANGUAGES CXX)

if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
  set(LINKS_NOTATION_IS_TOP_LEVEL ON)
else()
  set(LINKS_NOTATION_IS_TOP_LEVEL OFF)
endif()

# The suites read the shared fixtures in the repository's parity/ and docs/
# folders, which a release archive of cpp/ alone does not contain.
if(LINKS_NOTATION_IS_TOP_LEVEL AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../parity/language-features.json")
  set(LINKS_NOTATION_TESTS_DEFAULT ON)
else()
  set(LINKS_NOTATION_TESTS_DEFAULT OFF)
endif()
option(LINKS_NOTATION_BUILD_TESTS "Build the GoogleTest suites" ${LINKS_NOTATION_TESTS_DEFAULT})
option(LINKS_NOTATION_BUILD_EXAMPLES "Build the examples" ${LINKS_NOTATION_IS_TOP_LEVEL})
option(LINKS_NOTATION_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)

configure_file(
  "${CMAKE_CURRENT_SOURCE_DIR}/include/links_notation/version.hpp.in"
  "${CMAKE_CURRENT_BINARY_DIR}/generated/links_notation/version.hpp"
  @ONLY)

# Included before the target is declared: its INSTALL_INTERFACE include
# directory reads CMAKE_INSTALL_INCLUDEDIR, which is empty until then.
include(GNUInstallDirs)

add_library(links_notation
  src/binary.cpp
  src/comments.cpp
  src/indented_document.cpp
  src/link.cpp
  src/links_group.cpp
  src/parse_error.cpp
  src/parser.cpp
  src/quotes.cpp
  src/reference_literal.cpp
  src/references.cpp
  src/stream_parser.cpp
  src/unicode.cpp)
add_library(links_notation::links_notation ALIAS links_notation)

target_compile_features(links_notation PUBLIC cxx_std_17)
set_target_properties(links_notation PROPERTIES
  CXX_EXTENSIONS OFF
  VERSION ${PROJECT_VERSION}
  SOVERSION ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR})
target_include_directories(links_notation
  PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/generated>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src)

if(MSVC)
  target_compile_options(links_notation PRIVATE /W4 /utf-8)
  if(LINKS_NOTATION_WARNINGS_AS_ERRORS)
    target_compile_options(links_notation PRIVATE /WX)
  endif()
else()
  target_compile_options(links_notation PRIVATE -Wall -Wextra -Wpedantic -Wconversion -Wsign-conversion)
  if(LINKS_NOTATION_WARNINGS_AS_ERRORS)
    target_compile_options(links_notation PRIVATE -Werror)
  endif()
endif()

include(CMakePackageConfigHelpers)

install(TARGETS links_notation
  EXPORT links_notation_targets
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
  FILES_MATCHING PATTERN "*.hpp")
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/generated/links_notation/version.hpp"
  DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/links_notation)
install(EXPORT links_notation_targets
  NAMESPACE links_notation::
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/links_notation)
configure_package_config_file(
  cmake/links_notationConfig.cmake.in
  "${CMAKE_CURRENT_BINARY_DIR}/links_notationConfig.cmake"
  INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/links_notation)
write_basic_package_version_file(
  "${CMAKE_CURRENT_BINARY_DIR}/links_notationConfigVersion.cmake"
  COMPATIBILITY SameMinorVersion)
install(FILES
  "${CMAKE_CURRENT_BINARY_DIR}/links_notationConfig.cmake"
  "${CMAKE_CURRENT_BINARY_DIR}/links_notationConfigVersion.cmake"
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/links_notation)

if(LINKS_NOTATION_BUILD_EXAMPLES)
  add_subdirectory(examples)
endif()

if(LINKS_NOTATION_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

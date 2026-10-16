# GoogleTest is taken from the system when CMake can find it, and otherwise
# downloaded once at a pinned release whose archive hash is checked. The
# policy range in ../CMakeLists.txt sets CMP0135 on CMake 3.24+, so extracted
# files get fresh timestamps without DOWNLOAD_EXTRACT_TIMESTAMP, a keyword
# CMake 3.16 rejects.
find_package(GTest 1.11 QUIET)
if(NOT GTest_FOUND)
  include(FetchContent)
  FetchContent_Declare(googletest
    URL https://github.com/google/googletest/releases/download/v1.18.0/googletest-1.18.0.tar.gz
    URL_HASH SHA256=6e3191c1455468b3fc35a417fb565c1c5071aee1b7e7f85e30cf48a98d37d8b5)
  set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
  set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
  set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)
  FetchContent_MakeAvailable(googletest)
endif()

include(GoogleTest)
find_package(Threads REQUIRED)

# Every suite is one file named after the Rust suite it mirrors, so the test
# case comparison in TEST_CASE_COMPARISON.md lines them up by name.
file(GLOB LINKS_NOTATION_TEST_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/*_tests.cpp")

add_executable(links_notation_tests ${LINKS_NOTATION_TEST_SOURCES})
target_link_libraries(links_notation_tests PRIVATE links_notation::links_notation GTest::gtest_main Threads::Threads)
# The shared fixtures (parity/, docs/protocol/, docs/test-corpora/) are read
# from the repository rather than copied, so every language checks one corpus.
get_filename_component(LINKS_NOTATION_REPOSITORY_ROOT "${PROJECT_SOURCE_DIR}/.." ABSOLUTE)
target_compile_definitions(links_notation_tests PRIVATE
  LINKS_NOTATION_REPOSITORY_ROOT="${LINKS_NOTATION_REPOSITORY_ROOT}")
if(MSVC)
  target_compile_options(links_notation_tests PRIVATE /utf-8 /bigobj)
endif()

gtest_discover_tests(links_notation_tests DISCOVERY_TIMEOUT 60 PROPERTIES TIMEOUT 60)

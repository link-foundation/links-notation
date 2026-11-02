cmake_minimum_required(VERSION 3.21)

# The version below is the single source of truth for every distribution
# channel (CMake package config, pkg-config, Conan, vcpkg, NuGet, GitHub
# Releases). Do not edit it by hand: the release pipeline bumps it from the
# changelog fragments in changelog.d/ (see CONTRIBUTING.md).
project(
    my_package
    VERSION 0.2.2
    DESCRIPTION "Example header-only C++ library of the AI-driven development pipeline template"
    HOMEPAGE_URL "https://github.com/link-foundation/cpp-ai-driven-development-pipeline-template"
    LANGUAGES CXX
)

include(GNUInstallDirs)
include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/ProjectOptions.cmake")

# ---------------------------------------------------------------------------
# Options. Tests, examples and developer tooling are only enabled by default
# when this is the top-level project, so consumers that pull the repository in
# through add_subdirectory, FetchContent, CPM or a git submodule only get the
# library target.
# ---------------------------------------------------------------------------
option(MY_PACKAGE_BUILD_TESTS "Build the unit tests" ${PROJECT_IS_TOP_LEVEL})
option(MY_PACKAGE_BUILD_EXAMPLES "Build the examples" ${PROJECT_IS_TOP_LEVEL})
option(MY_PACKAGE_BUILD_BENCHMARKS "Build the benchmarks (needs Google Benchmark)" OFF)
option(MY_PACKAGE_INSTALL "Generate the install and package-config rules" ${PROJECT_IS_TOP_LEVEL})
option(MY_PACKAGE_FETCH_DEPENDENCIES "Download missing test dependencies with FetchContent" ON)
option(MY_PACKAGE_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)
option(MY_PACKAGE_ENABLE_COVERAGE "Instrument tests for code coverage (GCC/Clang)" OFF)
option(MY_PACKAGE_BUILD_DOCS "Add the my_package_docs target (needs Doxygen)" ${PROJECT_IS_TOP_LEVEL})
option(MY_PACKAGE_NATIVE_ARCH "Tune tests and benchmarks for the host CPU (-march=native)" OFF)
set(MY_PACKAGE_SANITIZERS "" CACHE STRING "Semicolon-separated sanitizers for tests, e.g. address;undefined")

if(MY_PACKAGE_BUILD_TESTS OR MY_PACKAGE_BUILD_BENCHMARKS)
    include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/Dependencies.cmake")
endif()

# ---------------------------------------------------------------------------
# Library target. Header-only libraries are an INTERFACE target; see
# docs/distribution.md for switching to a compiled library.
# ---------------------------------------------------------------------------
add_library(${PROJECT_NAME} INTERFACE)
add_library(${PROJECT_NAME}::${PROJECT_NAME} ALIAS ${PROJECT_NAME})
target_include_directories(
    ${PROJECT_NAME}
    INTERFACE "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>"
              "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)
target_compile_features(${PROJECT_NAME} INTERFACE cxx_std_20)

if(MY_PACKAGE_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

if(MY_PACKAGE_BUILD_EXAMPLES)
    add_subdirectory(examples)
endif()

if(MY_PACKAGE_BUILD_BENCHMARKS)
    add_subdirectory(benchmarks)
endif()

if(MY_PACKAGE_BUILD_DOCS)
    include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/Documentation.cmake")
endif()

if(MY_PACKAGE_INSTALL)
    include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/PackageInstall.cmake")
endif()

#!/bin/sh
# Builds and runs some C++ test suites against the already built library,
# without the other suites, so suites can be ported independently.
# Usage: experiments/cpp_build_suite.sh <output binary> <suite.cpp>...
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUILD=${LINKS_NOTATION_CPP_BUILD:-/tmp/links-notation-cpp-build}
OUT=$1
shift
g++ -std=c++17 -g -Wall -Wextra -Wpedantic \
  -I "$ROOT/cpp/include" -I "$BUILD/generated" -I "$ROOT/cpp/tests" \
  -I "$BUILD/_deps/googletest-src/googletest/include" \
  -DLINKS_NOTATION_REPOSITORY_ROOT="\"$ROOT\"" \
  "$@" "$BUILD/liblinks_notation.a" "$BUILD/lib/libgtest_main.a" "$BUILD/lib/libgtest.a" -pthread -o "$OUT"
ulimit -v 4000000
timeout 300 "$OUT"

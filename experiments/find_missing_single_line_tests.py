#!/usr/bin/env python3
"""Find missing tests in Python single_line_parser compared to JS."""

import json

# Load test data
with open('/tmp/gh-issue-solver-1762060803665/experiments/test_coverage_data.json') as f:
    test_data = json.load(f)

python_tests = set(test_data['python']['single_line_parser'])
js_tests_names = test_data['javascript']['SingleLineParser']
rust_tests_names = test_data['rust']['single_line_parser']

print("Python single_line_parser tests:")
for test in sorted(python_tests):
    print(f"  - {test}")

print(f"\nTotal Python tests: {len(python_tests)}")
print(f"Total JS tests: {len(js_tests_names)}")
print(f"Total Rust tests: {len(rust_tests_names)}")

# Normalize test names for comparison
def normalize_test_name(name):
    """Normalize test name for comparison."""
    name = name.lower()
    name = name.replace(' ', '_')
    name = name.replace('-', '_')
    name = name.replace('(', '').replace(')', '')
    name = name.replace('__', '_')
    return name

# Create normalized sets
python_normalized = {normalize_test_name(t): t for t in python_tests}
js_normalized = {normalize_test_name(t): t for t in js_tests_names}
rust_normalized = {normalize_test_name(t): t for t in rust_tests_names}

# Find tests in JS but not in Python
missing_in_python = set(js_normalized.keys()) - set(python_normalized.keys())

print("\n\nTests in JS but NOT in Python:")
for test_key in sorted(missing_in_python):
    original_name = js_normalized[test_key]
    print(f"  - {original_name} (normalized: {test_key})")

# Find tests in Rust but not in Python
missing_in_python_from_rust = set(rust_normalized.keys()) - set(python_normalized.keys())

print("\n\nTests in Rust but NOT in Python:")
for test_key in sorted(missing_in_python_from_rust):
    original_name = rust_normalized[test_key]
    print(f"  - {original_name} (normalized: {test_key})")

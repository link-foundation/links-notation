#!/usr/bin/env python3
"""
Create a comprehensive test case comparison document across all 4 languages.
This script extracts test names from Python, JavaScript, Rust, and C# and creates
a markdown document showing which tests exist in each language.
"""

import re
import os
from pathlib import Path
from collections import defaultdict

def extract_python_tests(base_dir):
    """Extract test names from Python test files."""
    tests = defaultdict(list)
    test_dir = Path(base_dir) / "python" / "tests"

    for test_file in sorted(test_dir.glob("test_*.py")):
        # e.g., "test_api.py" -> "api"
        category = test_file.stem.replace('test_', '')
        with open(test_file, 'r') as f:
            content = f.read()
            # Find all test functions
            for match in re.finditer(r'^def (test_\w+)', content, re.MULTILINE):
                test_name = match.group(1)
                tests[category].append(test_name)

    return tests

def extract_javascript_tests(base_dir):
    """Extract test names from JavaScript test files."""
    tests = defaultdict(list)
    test_dir = Path(base_dir) / "js" / "tests"

    for test_file in sorted(test_dir.glob("*.test.js")):
        # Convert filename to category, e.g., "ApiTests.test.js" -> "api"
        category_name = test_file.stem.replace('.test', '').replace('Tests', '')
        # Convert to snake_case to match Python naming
        category = ''.join(['_' + c.lower() if c.isupper() and i > 0 else c.lower()
                           for i, c in enumerate(category_name)]).lstrip('_')

        with open(test_file, 'r') as f:
            content = f.read()
            # Find all test cases: test('test_name', ...) or it('test_name', ...)
            for match in re.finditer(r'(?:test|it)\([\'"]([^\'"]+)[\'"]', content):
                test_name = match.group(1)
                # Convert to Python-style test name
                test_name = test_name.replace(' ', '_').replace('-', '_').lower()
                if not test_name.startswith('test_'):
                    test_name = 'test_' + test_name
                tests[category].append(test_name)

    return tests

def extract_rust_tests(base_dir):
    """Extract test names from Rust test files."""
    tests = defaultdict(list)
    test_dir = Path(base_dir) / "rust" / "tests"

    for test_file in sorted(test_dir.glob("*_tests.rs")):
        # e.g., "api_tests.rs" -> "api"
        category = test_file.stem.replace('_tests', '')

        with open(test_file, 'r') as f:
            content = f.read()
            # Find all test functions marked with #[test]
            for match in re.finditer(r'#\[test\]\s*fn\s+(\w+)', content):
                test_name = match.group(1)
                # Ensure it starts with test_
                if not test_name.startswith('test_'):
                    test_name = 'test_' + test_name
                tests[category].append(test_name)

    return tests

def extract_csharp_tests(base_dir):
    """Extract test names from C# test files."""
    tests = defaultdict(list)
    test_dir = Path(base_dir) / "csharp" / "Link.Foundation.Links.Notation.Tests"

    for test_file in sorted(test_dir.glob("*Tests.cs")):
        # e.g., "ApiTests.cs" -> "api"
        category_name = test_file.stem.replace('Tests', '')
        category = ''.join(['_' + c.lower() if c.isupper() and i > 0 else c.lower()
                           for i, c in enumerate(category_name)]).lstrip('_')

        with open(test_file, 'r') as f:
            content = f.read()
            # Find all test methods marked with [Fact] or [Theory]
            for match in re.finditer(r'\[(?:Fact|Theory)\]\s*public\s+(?:void|async\s+Task)\s+(\w+)', content):
                test_name = match.group(1)
                # Convert to snake_case
                test_name = ''.join(['_' + c.lower() if c.isupper() and i > 0 else c.lower()
                                     for i, c in enumerate(test_name)])
                if not test_name.startswith('test_'):
                    test_name = 'test_' + test_name
                tests[category].append(test_name)

    return tests

def create_comparison_document(base_dir, output_file):
    """Create a comprehensive markdown document comparing tests across languages."""

    print("Extracting tests from all languages...")
    python_tests = extract_python_tests(base_dir)
    js_tests = extract_javascript_tests(base_dir)
    rust_tests = extract_rust_tests(base_dir)
    csharp_tests = extract_csharp_tests(base_dir)

    # Get all unique categories
    all_categories = sorted(set(
        list(python_tests.keys()) +
        list(js_tests.keys()) +
        list(rust_tests.keys()) +
        list(csharp_tests.keys())
    ))

    # Get all unique test names across all categories
    all_tests_by_category = defaultdict(set)
    for category in all_categories:
        all_tests_by_category[category].update(python_tests.get(category, []))
        all_tests_by_category[category].update(js_tests.get(category, []))
        all_tests_by_category[category].update(rust_tests.get(category, []))
        all_tests_by_category[category].update(csharp_tests.get(category, []))

    # Create markdown document
    with open(output_file, 'w') as f:
        f.write("# Comprehensive Test Case Comparison Across All Languages\n\n")
        f.write("This document provides a detailed comparison of test cases across Python, JavaScript, Rust, and C#.\n\n")
        f.write("## Legend\n\n")
        f.write("- ✅ Test exists in the language\n")
        f.write("- ❌ Test is missing in the language\n")
        f.write("- ⚠️ Test adapted/modified for language-specific behavior\n\n")
        f.write("---\n\n")

        # Summary statistics
        f.write("## Summary Statistics\n\n")
        f.write("| Language   | Total Tests | Test Categories |\n")
        f.write("|------------|-------------|----------------|\n")
        f.write(f"| Python     | {sum(len(tests) for tests in python_tests.values())} | {len([c for c in python_tests if python_tests[c]])} |\n")
        f.write(f"| JavaScript | {sum(len(tests) for tests in js_tests.values())} | {len([c for c in js_tests if js_tests[c]])} |\n")
        f.write(f"| Rust       | {sum(len(tests) for tests in rust_tests.values())} | {len([c for c in rust_tests if rust_tests[c]])} |\n")
        f.write(f"| C#         | {sum(len(tests) for tests in csharp_tests.values())} | {len([c for c in csharp_tests if csharp_tests[c]])} |\n\n")

        f.write("---\n\n")

        # Detailed comparison by category
        for category in all_categories:
            category_display = category.replace('_', ' ').title()
            f.write(f"## {category_display}\n\n")

            py_tests = set(python_tests.get(category, []))
            js_tests_set = set(js_tests.get(category, []))
            rust_tests_set = set(rust_tests.get(category, []))
            cs_tests = set(csharp_tests.get(category, []))

            all_tests = sorted(all_tests_by_category[category])

            if not all_tests:
                f.write("*No tests found in this category*\n\n")
                continue

            # Create a table
            f.write("| Test Name | Python | JavaScript | Rust | C# |\n")
            f.write("|-----------|--------|------------|------|----|\n")

            for test_name in all_tests:
                # Clean up test name for display
                display_name = test_name.replace('test_', '').replace('_', ' ')

                py_status = "✅" if test_name in py_tests else "❌"
                js_status = "✅" if test_name in js_tests_set else "❌"
                rust_status = "✅" if test_name in rust_tests_set else "❌"
                cs_status = "✅" if test_name in cs_tests else "❌"

                f.write(f"| {display_name} | {py_status} | {js_status} | {rust_status} | {cs_status} |\n")

            # Category statistics
            f.write("\n")
            f.write(f"**Category totals:** Python: {len(py_tests)}, JavaScript: {len(js_tests_set)}, Rust: {len(rust_tests_set)}, C#: {len(cs_tests)}\n\n")

        # Missing tests summary
        f.write("---\n\n")
        f.write("## Missing Tests Summary\n\n")

        for lang_name, lang_tests in [
            ("Python", python_tests),
            ("JavaScript", js_tests),
            ("Rust", rust_tests),
            ("C#", csharp_tests)
        ]:
            f.write(f"### {lang_name} Missing Tests\n\n")

            missing_count = 0
            for category in all_categories:
                all_tests = all_tests_by_category[category]
                lang_category_tests = set(lang_tests.get(category, []))
                missing = all_tests - lang_category_tests

                if missing:
                    missing_count += len(missing)
                    category_display = category.replace('test_', '').replace('_', ' ').title()
                    f.write(f"**{category_display}** ({len(missing)} missing):\n")
                    for test in sorted(missing):
                        f.write(f"- {test.replace('test_', '').replace('_', ' ')}\n")
                    f.write("\n")

            if missing_count == 0:
                f.write("✅ No missing tests!\n\n")
            else:
                f.write(f"**Total missing: {missing_count} tests**\n\n")

    print(f"Comparison document created: {output_file}")

    # Print summary to console
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Python:     {sum(len(tests) for tests in python_tests.values()):3d} tests across {len([c for c in python_tests if python_tests[c]]):2d} categories")
    print(f"JavaScript: {sum(len(tests) for tests in js_tests.values()):3d} tests across {len([c for c in js_tests if js_tests[c]]):2d} categories")
    print(f"Rust:       {sum(len(tests) for tests in rust_tests.values()):3d} tests across {len([c for c in rust_tests if rust_tests[c]]):2d} categories")
    print(f"C#:         {sum(len(tests) for tests in csharp_tests.values()):3d} tests across {len([c for c in csharp_tests if csharp_tests[c]]):2d} categories")
    print("="*80)

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_file = os.path.join(base_dir, "TEST_CASE_COMPARISON.md")
    create_comparison_document(base_dir, output_file)

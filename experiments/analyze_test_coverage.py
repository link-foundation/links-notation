#!/usr/bin/env python3
"""
Analyze test coverage across all language implementations.
This script extracts test names from Python, JavaScript, C#, and Rust test files
and creates a comparison matrix.
"""

import re
import os
from pathlib import Path
from collections import defaultdict
import json

def extract_python_tests(file_path):
    """Extract test function names from Python test files."""
    tests = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find all test functions (def test_...)
        matches = re.findall(r'def (test_\w+)\(', content)
        tests.extend(matches)
    return tests

def extract_js_tests(file_path):
    """Extract test names from JavaScript test files."""
    tests = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find all test/it blocks
        matches = re.findall(r'(?:test|it)\([\'"]([^\'"]+)[\'"]', content)
        tests.extend(matches)
    return tests

def extract_csharp_tests(file_path):
    """Extract test method names from C# test files."""
    tests = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find methods with [Fact] or [Theory] attributes
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if '[Fact]' in line or '[Theory]' in line:
                # Look for the method name in the next few lines
                for j in range(i+1, min(i+5, len(lines))):
                    method_match = re.search(r'public\s+(?:async\s+)?(?:Task\s+|void\s+)(\w+)\(', lines[j])
                    if method_match:
                        tests.append(method_match.group(1))
                        break
    return tests

def extract_rust_tests(file_path):
    """Extract test function names from Rust test files."""
    tests = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find functions with #[test] attribute
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if '#[test]' in line:
                # Look for fn name in the next few lines
                for j in range(i+1, min(i+5, len(lines))):
                    fn_match = re.search(r'fn\s+(\w+)\(', lines[j])
                    if fn_match:
                        tests.append(fn_match.group(1))
                        break
    return tests

def get_test_file_category(file_path):
    """Determine the test category from the file name."""
    filename = os.path.basename(file_path)
    # Normalize the filename to a common category name
    # Remove language-specific prefixes/suffixes
    filename = filename.replace('Tests.cs', '').replace('.test.js', '').replace('test_', '').replace('_tests.rs', '').replace('.py', '')
    return filename

def main():
    base_path = Path('/tmp/gh-issue-solver-1762060803665')

    # Dictionary to hold test info: {language: {category: [test_names]}}
    test_data = {
        'python': defaultdict(list),
        'javascript': defaultdict(list),
        'csharp': defaultdict(list),
        'rust': defaultdict(list)
    }

    # Python tests
    python_test_dir = base_path / 'python' / 'tests'
    if python_test_dir.exists():
        for test_file in python_test_dir.glob('test_*.py'):
            if test_file.name == '__init__.py':
                continue
            category = get_test_file_category(str(test_file))
            tests = extract_python_tests(test_file)
            test_data['python'][category].extend(tests)

    # JavaScript tests
    js_test_dir = base_path / 'js' / 'tests'
    if js_test_dir.exists():
        for test_file in js_test_dir.glob('*.test.js'):
            category = get_test_file_category(str(test_file))
            tests = extract_js_tests(test_file)
            test_data['javascript'][category].extend(tests)

    # C# tests
    csharp_test_dir = base_path / 'csharp' / 'Link.Foundation.Links.Notation.Tests'
    if csharp_test_dir.exists():
        for test_file in csharp_test_dir.glob('*Tests.cs'):
            category = get_test_file_category(str(test_file))
            tests = extract_csharp_tests(test_file)
            test_data['csharp'][category].extend(tests)

    # Rust tests
    rust_test_dir = base_path / 'rust' / 'tests'
    if rust_test_dir.exists():
        for test_file in rust_test_dir.glob('*_tests.rs'):
            category = get_test_file_category(str(test_file))
            tests = extract_rust_tests(test_file)
            test_data['rust'][category].extend(tests)

    # Print summary
    print("=" * 80)
    print("TEST COVERAGE ANALYSIS")
    print("=" * 80)
    print()

    # Get all unique categories
    all_categories = set()
    for lang_tests in test_data.values():
        all_categories.update(lang_tests.keys())

    # Print by category
    for category in sorted(all_categories):
        print(f"\n{'='*80}")
        print(f"Category: {category}")
        print('='*80)

        for lang in ['python', 'javascript', 'csharp', 'rust']:
            tests = test_data[lang].get(category, [])
            print(f"\n{lang.upper()} ({len(tests)} tests):")
            if tests:
                for test in sorted(tests):
                    print(f"  - {test}")
            else:
                print("  (no tests found)")

    # Create summary statistics
    print("\n\n" + "=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)

    for lang in ['python', 'javascript', 'csharp', 'rust']:
        total_tests = sum(len(tests) for tests in test_data[lang].values())
        total_categories = len(test_data[lang])
        print(f"{lang.upper()}: {total_tests} tests across {total_categories} categories")

    # Save to JSON for further processing
    output_file = base_path / 'experiments' / 'test_coverage_data.json'
    with open(output_file, 'w') as f:
        # Convert defaultdict to regular dict for JSON serialization
        json_data = {lang: dict(categories) for lang, categories in test_data.items()}
        json.dump(json_data, f, indent=2)

    print(f"\nDetailed data saved to: {output_file}")

if __name__ == '__main__':
    main()

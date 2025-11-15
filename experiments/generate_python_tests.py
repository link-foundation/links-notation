#!/usr/bin/env python3
"""
Generate Python test files from JavaScript test files.
This script converts JavaScript test files to Python pytest format.
"""

import re
import os
from pathlib import Path


def convert_js_to_python_test(js_content, test_name):
    """Convert JavaScript test content to Python pytest format."""

    # Extract test functions
    tests = []

    # Find all test blocks with proper handling of nested structures
    test_pattern = r'test\([\'"]([^\'"]+)[\'"]\s*,\s*\(\)\s*=>\s*\{(.*?)\n\}\);'
    matches = re.finditer(test_pattern, js_content, re.DOTALL)

    python_tests = []

    for match in matches:
        test_title = match.group(1)
        test_body = match.group(2)

        # Convert test name to Python format
        test_func_name = test_title.lower()
        test_func_name = re.sub(r'[^\w\s-]', '', test_func_name)
        test_func_name = re.sub(r'[-\s]+', '_', test_func_name)
        test_func_name = 'test_' + test_func_name

        # Convert test body
        python_body = convert_test_body(test_body)

        python_test = f'''def {test_func_name}():
    """Test: {test_title}."""
{python_body}
'''
        python_tests.append(python_test)

    if not python_tests:
        return None

    # Create header
    header = f'''"""{test_name} tests - ported from JS/Rust implementations."""

import pytest
from links_notation import Parser, format_links


parser = Parser()

'''

    return header + '\n\n'.join(python_tests)


def convert_test_body(js_body):
    """Convert JavaScript test body to Python."""
    lines = js_body.split('\n')
    python_lines = []
    indent_level = 1

    for line in lines:
        line = line.strip()
        if not line or line.startswith('//'):
            continue

        # Convert variable declarations
        line = re.sub(r'const\s+(\w+)\s*=\s*', r'\1 = ', line)
        line = re.sub(r'let\s+(\w+)\s*=\s*', r'\1 = ', line)

        # Convert template literals to Python triple quotes
        line = re.sub(r'`([^`]*)`', lambda m: '"""' + m.group(1) + '"""', line)

        # Convert expect().toThrow()
        if 'expect(' in line and ').toThrow()' in line:
            # Extract the expression
            expr_match = re.search(r'expect\(\(\)\s*=>\s*\{?\s*(.+?)\s*\}?\)\.toThrow\(\)', line)
            if expr_match:
                expr = expr_match.group(1).rstrip(';')
                python_lines.append('    ' * indent_level + 'with pytest.raises(Exception):')
                python_lines.append('    ' * (indent_level + 1) + expr)
                continue

        # Convert expect().toBe()
        line = re.sub(r'expect\((.+?)\)\.toBe\((.+?)\);?', r'assert \1 == \2', line)

        # Convert expect().toEqual()
        line = re.sub(r'expect\((.+?)\)\.toEqual\((.+?)\);?', r'assert \1 == \2', line)

        # Convert expect().toContain()
        line = re.sub(r'expect\((.+?)\)\.toContain\((.+?)\);?', r'assert \2 in \1', line)

        # Convert expect().toBeGreaterThan()
        line = re.sub(r'expect\((.+?)\)\.toBeGreaterThan\((.+?)\);?', r'assert \1 > \2', line)

        # Convert expect().length
        line = re.sub(r'\.length', '', line)
        line = re.sub(r'assert ([^=]+) ==', r'assert len(\1) ==', line)

        # Convert null to None
        line = re.sub(r'\bnull\b', 'None', line)

        # Convert true/false to True/False
        line = re.sub(r'\btrue\b', 'True', line)
        line = re.sub(r'\bfalse\b', 'False', line)

        # Convert JavaScript method calls to Python
        line = re.sub(r'formatLinks', 'format_links', line)

        # Remove semicolons
        line = line.rstrip(';')

        if line:
            python_lines.append('    ' * indent_level + line)

    return '\n'.join(python_lines)


def main():
    js_test_dir = Path('/tmp/gh-issue-solver-1762060803665/js/tests')
    python_test_dir = Path('/tmp/gh-issue-solver-1762060803665/python/tests')

    # Test files to convert
    test_files_to_convert = [
        'MixedIndentationModes.test.js',
        'MultilineParser.test.js',
        'MultilineQuotedString.test.js',
        'NestedParser.test.js',
    ]

    for js_file_name in test_files_to_convert:
        js_file_path = js_test_dir / js_file_name
        if not js_file_path.exists():
            print(f"Skipping {js_file_name} - file not found")
            continue

        print(f"Converting {js_file_name}...")

        with open(js_file_path, 'r', encoding='utf-8') as f:
            js_content = f.read()

        # Generate test name
        test_name = js_file_name.replace('.test.js', '').replace('.js', '')

        python_content = convert_js_to_python_test(js_content, test_name)

        if python_content:
            # Create Python test file name
            python_file_name = 'test_' + re.sub(r'([A-Z])', r'_\1', test_name).lower().lstrip('_') + '.py'
            python_file_path = python_test_dir / python_file_name

            with open(python_file_path, 'w', encoding='utf-8') as f:
                f.write(python_content)

            print(f"  Created {python_file_name}")
        else:
            print(f"  Failed to convert {js_file_name}")


if __name__ == '__main__':
    main()

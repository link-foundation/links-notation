#!/usr/bin/env python3
"""
Script to standardize test names across all language implementations.

This script renames test functions to use consistent naming conventions:
- Base name is in Pascal Case (e.g., BugTest1, EmptyLinkTest)
- Python/Rust convert to snake_case (e.g., bug_test_1, empty_link_test)
- JavaScript/C# use PascalCase directly
"""

import re
import os
from pathlib import Path

# Mapping of old test names to new standardized names (in snake_case for Python)
# Format: {old_name: new_name}
PYTHON_RENAMES = {
    # single_line_parser
    "test_bug1": "test_bug_test_1",
    "test_simple_ref": "test_simple_reference",
    "test_simple_reference_parser": "test_simple_reference_parser",  # already good
    "test_singlet_link": "test_singlet_link",  # already good
    "test_singlet_link_parser": "test_singlet_link_parser",  # already good

    # edge_case_parser
    "test_all_features": "test_all_features",  # already good
    "test_empty_document": "test_empty_document",  # already good
    "test_whitespace_only": "test_whitespace_only",  # already good
    "test_singlet_links": "test_singlet_links",  # already good
    "test_empty_links": "test_empty_links",  # already good

    # nested_parser
    "test_indentation_based_children": "test_indentation_based_children",  # already good
    "test_indentation": "test_indentation_parser",  # clarify it's parser-specific
    "test_nested_indentation": "test_nested_indentation_parser",  # clarify it's parser-specific

    # indented_id_syntax
    "test_equivalence_comprehensive": "test_equivalence_test_comprehensive",

    # multiline_parser
    "test_complex_structure": "test_complex_structure",  # already good
    "test_mixed_formats": "test_mixed_formats",  # already good
    "test_multiline_with_id": "test_multiline_with_id",  # already good
    "test_multiple_top_level_elements": "test_multiple_top_level_elements",  # already good

    # api
    "test_is_ref_equivalent": "test_is_ref_equivalent",  # already good
    "test_is_link_equivalent": "test_is_link_equivalent",  # already good
}


def rename_python_tests(test_file_path, renames):
    """Rename test functions in a Python test file."""
    with open(test_file_path, 'r') as f:
        content = f.read()

    original_content = content
    renamed_count = 0

    for old_name, new_name in renames.items():
        if old_name == new_name:
            continue  # Skip if already correct

        # Match function definition
        pattern = rf'(def {re.escape(old_name)}\()'
        if re.search(pattern, content):
            content = re.sub(pattern, f'def {new_name}(', content)
            renamed_count += 1
            print(f"  Renamed: {old_name} -> {new_name}")

    if content != original_content:
        with open(test_file_path, 'w') as f:
            f.write(content)
        print(f"  Updated file: {test_file_path}")
        print(f"  Total renames: {renamed_count}")
    else:
        print(f"  No changes needed in {test_file_path}")

    return renamed_count


def main():
    """Main function to rename tests across Python test files."""
    base_dir = Path(__file__).parent.parent
    python_test_dir = base_dir / "python" / "tests"

    print("Standardizing Python test names...")
    print("=" * 80)

    total_renames = 0

    # Process each test file
    test_files = [
        "test_single_line_parser.py",
        "test_edge_case_parser.py",
        "test_nested_parser.py",
        "test_indented_id_syntax.py",
        "test_multiline_parser.py",
        "test_api.py",
    ]

    for test_file in test_files:
        test_path = python_test_dir / test_file
        if test_path.exists():
            print(f"\nProcessing: {test_file}")
            count = rename_python_tests(test_path, PYTHON_RENAMES)
            total_renames += count
        else:
            print(f"  Warning: {test_file} not found")

    print("\n" + "=" * 80)
    print(f"Total renames across all files: {total_renames}")
    print("\nNext steps:")
    print("1. Run pytest to ensure all tests still pass")
    print("2. Update other languages (JavaScript, Rust, C#)")
    print("3. Regenerate TEST_CASE_COMPARISON.md")


if __name__ == "__main__":
    main()

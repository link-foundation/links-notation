#!/usr/bin/env python3
"""
Create a detailed comparison matrix showing test coverage discrepancies.
"""

import json
from collections import defaultdict

# Test category mappings (normalize names across languages)
CATEGORY_MAPPINGS = {
    'api': ['api', 'ApiTests', 'Api'],
    'edge_case_parser': ['edge_case_parser', 'EdgeCaseParser'],
    'indentation_consistency': ['indentation_consistency', 'IndentationConsistency'],
    'indented_id_syntax': ['indented_id_syntax', 'IndentedIdSyntax'],
    'link': ['link', 'Link'],
    'links_group': ['links_group', 'LinksGroup'],
    'mixed_indentation_modes': ['mixed_indentation_modes', 'MixedIndentationModes'],
    'multiline_parser': ['multiline_parser', 'MultilineParser'],
    'multiline_quoted_string': ['multiline_quoted_string', 'MultilineQuotedString'],
    'nested_parser': ['nested_parser', 'NestedParser'],
    'single_line_parser': ['single_line_parser', 'SingleLineParser'],
    'tuple': ['Tuple'],  # C# specific
}

def normalize_category(category):
    """Map a category name to its normalized form."""
    for normalized, variants in CATEGORY_MAPPINGS.items():
        if category in variants:
            return normalized
    return category.lower()

def main():
    # Load test data
    with open('/tmp/gh-issue-solver-1762060803665/experiments/test_coverage_data.json') as f:
        test_data = json.load(f)

    # Reorganize by normalized category
    normalized_data = {
        'python': defaultdict(list),
        'javascript': defaultdict(list),
        'csharp': defaultdict(list),
        'rust': defaultdict(list)
    }

    for lang, categories in test_data.items():
        for category, tests in categories.items():
            norm_cat = normalize_category(category)
            normalized_data[lang][norm_cat].extend(tests)

    # Get all unique normalized categories
    all_categories = set()
    for lang_tests in normalized_data.values():
        all_categories.update(lang_tests.keys())

    print("=" * 100)
    print("DETAILED TEST COVERAGE COMPARISON MATRIX")
    print("=" * 100)
    print()

    # Summary table
    print("SUMMARY BY CATEGORY:")
    print("-" * 100)
    print(f"{'Category':<35} {'Python':<12} {'JavaScript':<12} {'C#':<12} {'Rust':<12}")
    print("-" * 100)

    for category in sorted(all_categories):
        py_count = len(normalized_data['python'].get(category, []))
        js_count = len(normalized_data['javascript'].get(category, []))
        cs_count = len(normalized_data['csharp'].get(category, []))
        rs_count = len(normalized_data['rust'].get(category, []))

        # Mark missing implementations with '*'
        py_str = f"{py_count:>3}" if py_count > 0 else "  -"
        js_str = f"{js_count:>3}" if js_count > 0 else "  -"
        cs_str = f"{cs_count:>3}" if cs_count > 0 else "  -"
        rs_str = f"{rs_count:>3}" if rs_count > 0 else "  -"

        print(f"{category:<35} {py_str:<12} {js_str:<12} {cs_str:<12} {rs_str:<12}")

    print("-" * 100)

    # Overall totals
    py_total = sum(len(tests) for tests in normalized_data['python'].values())
    js_total = sum(len(tests) for tests in normalized_data['javascript'].values())
    cs_total = sum(len(tests) for tests in normalized_data['csharp'].values())
    rs_total = sum(len(tests) for tests in normalized_data['rust'].values())

    print(f"{'TOTAL':<35} {py_total:<12} {js_total:<12} {cs_total:<12} {rs_total:<12}")
    print()

    # Find missing tests
    print("\n" + "=" * 100)
    print("MISSING TESTS BY LANGUAGE")
    print("=" * 100)

    for lang in ['python', 'javascript', 'csharp', 'rust']:
        print(f"\n{lang.upper()}:")
        print("-" * 100)

        missing_categories = []
        for category in sorted(all_categories):
            if category not in normalized_data[lang] or len(normalized_data[lang][category]) == 0:
                # Check if any other language has tests for this category
                has_tests_elsewhere = any(
                    len(normalized_data[other_lang].get(category, [])) > 0
                    for other_lang in ['python', 'javascript', 'csharp', 'rust']
                    if other_lang != lang
                )
                if has_tests_elsewhere:
                    missing_categories.append(category)

        if missing_categories:
            for category in missing_categories:
                # Show which languages have tests for this category
                available_in = [
                    l.upper() for l in ['python', 'javascript', 'csharp', 'rust']
                    if l != lang and len(normalized_data[l].get(category, [])) > 0
                ]
                print(f"  - {category:<35} (available in: {', '.join(available_in)})")
        else:
            print("  No missing categories!")

    # Identify test count discrepancies within same categories
    print("\n" + "=" * 100)
    print("TEST COUNT DISCREPANCIES (Same category, different test counts)")
    print("=" * 100)

    for category in sorted(all_categories):
        counts = {}
        for lang in ['python', 'javascript', 'csharp', 'rust']:
            count = len(normalized_data[lang].get(category, []))
            if count > 0:
                counts[lang] = count

        if len(counts) > 1 and len(set(counts.values())) > 1:
            print(f"\n{category}:")
            for lang, count in sorted(counts.items()):
                print(f"  {lang:>12}: {count:>3} tests")

    # Save detailed report
    output_file = '/tmp/gh-issue-solver-1762060803665/experiments/missing_tests_report.json'
    missing_report = {}

    for lang in ['python', 'javascript', 'csharp', 'rust']:
        missing_report[lang] = {}
        for category in sorted(all_categories):
            if category not in normalized_data[lang] or len(normalized_data[lang][category]) == 0:
                # Find which language has tests to copy from
                reference_langs = []
                for other_lang in ['python', 'javascript', 'csharp', 'rust']:
                    if other_lang != lang and len(normalized_data[other_lang].get(category, [])) > 0:
                        reference_langs.append({
                            'language': other_lang,
                            'test_count': len(normalized_data[other_lang][category]),
                            'tests': normalized_data[other_lang][category]
                        })

                if reference_langs:
                    missing_report[lang][category] = reference_langs

    with open(output_file, 'w') as f:
        json.dump(missing_report, f, indent=2)

    print(f"\n\nDetailed missing tests report saved to: {output_file}")

if __name__ == '__main__':
    main()

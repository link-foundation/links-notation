#!/usr/bin/env python3
"""
Multi-Reference Feature Experiment (Issue #184)

This script tests the concept of multi-references where
multiple space-separated words before a colon form a single reference.
"""

import sys
sys.path.insert(0, 'python')

from links_notation import Parser, format_links

parser = Parser()

print("=== Multi-Reference Feature Tests (Issue #184) - Python ===\n")

# Test 1: Single-word ID (backward compatibility)
test1 = "papa: loves mama"
print("Test 1 - Single-word ID (backward compatible):")
print("Input:", test1)
try:
    result1 = parser.parse(test1)
    print("Parsed ID:", result1[0].id)
    print("Values:", [v.id for v in result1[0].values])
    print("Formatted:", format_links(result1, True))
    if isinstance(result1[0].id, str):
        print("✅ Pass: Single-word ID still works as string")
    else:
        print("⚠️ Warning: ID type changed")
except Exception as e:
    print("❌ Fail:", e)
print()

# Test 2: Quoted multi-word ID (backward compatibility)
test2 = "('some example': value)"
print("Test 2 - Quoted multi-word ID (backward compatible):")
print("Input:", test2)
try:
    result2 = parser.parse(test2)
    print("Parsed ID:", result2[0].id)
    print("Formatted:", format_links(result2, True))
    if isinstance(result2[0].id, str) and result2[0].id == "some example":
        print("✅ Pass: Quoted multi-word ID still works as string")
    else:
        print("⚠️ Warning: ID type changed")
except Exception as e:
    print("❌ Fail:", e)
print()

# Test 3: Unquoted multi-word ID (NEW FEATURE)
test3 = "(some example: some example is a link)"
print("Test 3 - Unquoted multi-word ID (NEW):")
print("Input:", test3)
try:
    result3 = parser.parse(test3)
    print("Parsed ID:", result3[0].id)
    print("Values:", [v.id for v in result3[0].values])
    print("Formatted:", format_links(result3, True))
    if isinstance(result3[0].id, list) and result3[0].id == ["some", "example"]:
        print("✅ Pass: Multi-reference ID parsed as list:", result3[0].id)
    else:
        print("⚠️ ID is not a list:", result3[0].id)
except Exception as e:
    print("❌ Fail:", e)
print()

# Test 4: Context-aware multi-reference recognition in values
test4 = "(some example: some example is a link)"
print("Test 4 - Context-aware multi-reference in values:")
print("Input:", test4)
try:
    result4 = parser.parse(test4)
    print("Values count:", len(result4[0].values))
    print("First value ID:", result4[0].values[0].id)
    # Check if "some example" in values is recognized as a single multi-ref
    if (isinstance(result4[0].values[0].id, list) and
        result4[0].values[0].id == ["some", "example"]):
        print("✅ Pass: 'some example' recognized as multi-reference in values")
    else:
        print("⚠️ Multi-reference not recognized:", result4[0].values[0].id)
except Exception as e:
    print("❌ Fail:", e)
print()

# Test 5: Three-word multi-reference
test5 = "(new york city: new york city is great)"
print("Test 5 - Three-word multi-reference:")
print("Input:", test5)
try:
    result5 = parser.parse(test5)
    print("Parsed ID:", result5[0].id)
    print("Values count:", len(result5[0].values))
    if isinstance(result5[0].id, list) and len(result5[0].id) == 3:
        print("✅ Pass: 3-word multi-reference parsed correctly")
    else:
        print("⚠️ Unexpected result")
except Exception as e:
    print("❌ Fail:", e)
print()

# Test 6: Indented syntax with multi-reference
test6 = """some example:
  value1
  value2"""
print("Test 6 - Indented syntax with multi-reference:")
print("Input:", repr(test6))
try:
    result6 = parser.parse(test6)
    print("Parsed ID:", result6[0].id)
    print("Values count:", len(result6[0].values))
    if isinstance(result6[0].id, list) and result6[0].id == ["some", "example"]:
        print("✅ Pass: Indented multi-reference works")
    else:
        print("⚠️ Unexpected result")
except Exception as e:
    print("❌ Fail:", e)
print()

print("=== Summary ===\n")
print("Multi-reference feature implemented in Python:")
print("1. Parser updated to support multi-word IDs before colon")
print("2. ID field can now be string (single) or list[str] (multi)")
print("3. Context-aware recognition: defined multi-refs recognized in values")
print("4. Backward compatible: single-word and quoted IDs still work")

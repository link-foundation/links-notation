#!/usr/bin/env node
/**
 * Create a comprehensive test case comparison document across all 4 languages.
 * This script extracts test names from Python, JavaScript, Rust, and C# and creates
 * a markdown document showing which tests exist in each language.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Normalize a test name by removing common prefixes/suffixes for comparison.
 * Keeps the core test name consistent across languages.
 */
function normalizeTestName(testName) {
  // Remove test_ prefix
  let normalized = testName.replace(/^test_/, '');
  // Remove trailing _test suffix (from C# TestXxxTest pattern)
  normalized = normalized.replace(/_test$/, '');
  return normalized;
}

/**
 * Extract test names from Python test files.
 */
function extractPythonTests(baseDir) {
  const tests = {};
  const testDir = join(baseDir, 'python', 'tests');

  const files = readdirSync(testDir).filter(f => f.startsWith('test_') && f.endsWith('.py')).sort();

  for (const testFile of files) {
    // e.g., "test_api.py" -> "api"
    const category = testFile.replace('test_', '').replace('.py', '');
    const content = readFileSync(join(testDir, testFile), 'utf8');

    // Find all test functions
    const matches = content.matchAll(/^def (test_\w+)/gm);
    tests[category] = [];
    for (const match of matches) {
      const testName = match[1];
      tests[category].push({
        original: testName,
        normalized: normalizeTestName(testName)
      });
    }
  }

  return tests;
}

/**
 * Extract test names from JavaScript test files.
 */
function extractJavaScriptTests(baseDir) {
  const tests = {};
  const testDir = join(baseDir, 'js', 'tests');

  const files = readdirSync(testDir).filter(f => f.endsWith('.test.js')).sort();

  for (const testFile of files) {
    // Convert filename to category, e.g., "ApiTests.test.js" -> "api"
    let categoryName = testFile.replace('.test.js', '').replace('Tests', '');

    // Convert to snake_case to match Python naming
    const category = categoryName.replace(/([A-Z])/g, (match, p1, offset) =>
      offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase()
    );

    const content = readFileSync(join(testDir, testFile), 'utf8');

    // Find all test cases: test('test_name', ...) or it('test_name', ...)
    const matches = content.matchAll(/(?:test|it)\(['"]([^'"]+)['"]/g);
    tests[category] = [];
    for (const match of matches) {
      let testName = match[1];

      // Convert PascalCase to snake_case first
      // e.g., "EmptyLinkTest" -> "empty_link_test"
      testName = testName.replace(/([A-Z])/g, (match, p1, offset) =>
        offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase()
      );

      // Convert spaces and hyphens to underscores
      testName = testName.replace(/[ -]/g, '_').toLowerCase();

      // Ensure it starts with test_
      if (!testName.startsWith('test_')) {
        testName = 'test_' + testName;
      }

      tests[category].push({
        original: testName,
        normalized: normalizeTestName(testName)
      });
    }
  }

  return tests;
}

/**
 * Extract test names from Rust test files.
 */
function extractRustTests(baseDir) {
  const tests = {};
  const testDir = join(baseDir, 'rust', 'tests');

  const files = readdirSync(testDir).filter(f => f.endsWith('_tests.rs')).sort();

  for (const testFile of files) {
    // e.g., "api_tests.rs" -> "api"
    const category = testFile.replace('_tests.rs', '');

    const content = readFileSync(join(testDir, testFile), 'utf8');

    // Find all test functions marked with #[test]
    const matches = content.matchAll(/#\[test\]\s*fn\s+(\w+)/g);
    tests[category] = [];
    for (const match of matches) {
      let testName = match[1];
      // Ensure it starts with test_
      if (!testName.startsWith('test_')) {
        testName = 'test_' + testName;
      }
      tests[category].push({
        original: testName,
        normalized: normalizeTestName(testName)
      });
    }
  }

  return tests;
}

/**
 * Extract test names from C# test files.
 */
function extractCSharpTests(baseDir) {
  const tests = {};
  const testDir = join(baseDir, 'csharp', 'Link.Foundation.Links.Notation.Tests');

  const files = readdirSync(testDir).filter(f => f.endsWith('Tests.cs')).sort();

  for (const testFile of files) {
    // e.g., "ApiTests.cs" -> "api"
    let categoryName = testFile.replace('Tests.cs', '');

    const category = categoryName.replace(/([A-Z])/g, (match, p1, offset) =>
      offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase()
    );

    const content = readFileSync(join(testDir, testFile), 'utf8');

    // Find all test methods marked with [Fact] or [Theory]
    const matches = content.matchAll(/\[(?:Fact|Theory)\]\s*public\s+(?:static\s+)?(?:void|async\s+Task)\s+(\w+)/g);
    tests[category] = [];
    for (const match of matches) {
      let testName = match[1];
      // Convert to snake_case
      testName = testName.replace(/([A-Z])/g, (match, p1, offset) =>
        offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase()
      );
      if (!testName.startsWith('test_')) {
        testName = 'test_' + testName;
      }
      tests[category].push({
        original: testName,
        normalized: normalizeTestName(testName)
      });
    }
  }

  return tests;
}

/**
 * Create a comprehensive markdown document comparing tests across languages.
 */
function createComparisonDocument(baseDir, outputFile) {
  console.log("Extracting tests from all languages...");

  const pythonTests = extractPythonTests(baseDir);
  const jsTests = extractJavaScriptTests(baseDir);
  const rustTests = extractRustTests(baseDir);
  const csharpTests = extractCSharpTests(baseDir);

  // Get all unique categories
  const allCategories = [
    ...new Set([
      ...Object.keys(pythonTests),
      ...Object.keys(jsTests),
      ...Object.keys(rustTests),
      ...Object.keys(csharpTests)
    ])
  ].sort();

  // Get all unique NORMALIZED test names across all categories
  const allTestsByCategory = {};
  for (const category of allCategories) {
    allTestsByCategory[category] = new Set([
      ...(pythonTests[category] || []).map(t => t.normalized),
      ...(jsTests[category] || []).map(t => t.normalized),
      ...(rustTests[category] || []).map(t => t.normalized),
      ...(csharpTests[category] || []).map(t => t.normalized)
    ]);
  }

  // Create markdown document
  let content = "# Comprehensive Test Case Comparison Across All Languages\n\n";
  content += "This document provides a detailed comparison of test cases across Python, JavaScript, Rust, and C#.\n\n";
  content += "## Legend\n\n";
  content += "- ✅ Test exists in the language\n";
  content += "- ❌ Test is missing in the language\n";
  content += "- ⚠️ Test adapted/modified for language-specific behavior\n\n";
  content += "---\n\n";

  // Summary statistics
  const pythonTotal = Object.values(pythonTests).reduce((sum, arr) => sum + arr.length, 0);
  const jsTotal = Object.values(jsTests).reduce((sum, arr) => sum + arr.length, 0);
  const rustTotal = Object.values(rustTests).reduce((sum, arr) => sum + arr.length, 0);
  const csharpTotal = Object.values(csharpTests).reduce((sum, arr) => sum + arr.length, 0);

  const pythonCategories = Object.keys(pythonTests).filter(c => pythonTests[c].length > 0).length;
  const jsCategories = Object.keys(jsTests).filter(c => jsTests[c].length > 0).length;
  const rustCategories = Object.keys(rustTests).filter(c => rustTests[c].length > 0).length;
  const csharpCategories = Object.keys(csharpTests).filter(c => csharpTests[c].length > 0).length;

  content += "## Summary Statistics\n\n";
  content += "| Language   | Total Tests | Test Categories |\n";
  content += "|------------|-------------|----------------|\n";
  content += `| Python     | ${pythonTotal} | ${pythonCategories} |\n`;
  content += `| JavaScript | ${jsTotal} | ${jsCategories} |\n`;
  content += `| Rust       | ${rustTotal} | ${rustCategories} |\n`;
  content += `| C#         | ${csharpTotal} | ${csharpCategories} |\n\n`;

  content += "---\n\n";

  // Detailed comparison by category
  for (const category of allCategories) {
    const categoryDisplay = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    content += `## ${categoryDisplay}\n\n`;

    const pyTests = new Set((pythonTests[category] || []).map(t => t.normalized));
    const jsTestsSet = new Set((jsTests[category] || []).map(t => t.normalized));
    const rustTestsSet = new Set((rustTests[category] || []).map(t => t.normalized));
    const csTests = new Set((csharpTests[category] || []).map(t => t.normalized));

    const allTests = Array.from(allTestsByCategory[category]).sort();

    if (allTests.length === 0) {
      content += "*No tests found in this category*\n\n";
      continue;
    }

    // Create a table
    content += "| Test Name | Python | JavaScript | Rust | C# |\n";
    content += "|-----------|--------|------------|------|----|\n";

    for (const normalizedTestName of allTests) {
      // Clean up test name for display
      const displayName = normalizedTestName.replace(/_/g, ' ');

      const pyStatus = pyTests.has(normalizedTestName) ? "✅" : "❌";
      const jsStatus = jsTestsSet.has(normalizedTestName) ? "✅" : "❌";
      const rustStatus = rustTestsSet.has(normalizedTestName) ? "✅" : "❌";
      const csStatus = csTests.has(normalizedTestName) ? "✅" : "❌";

      content += `| ${displayName} | ${pyStatus} | ${jsStatus} | ${rustStatus} | ${csStatus} |\n`;
    }

    // Category statistics
    content += "\n";
    content += `**Category totals:** Python: ${pyTests.size}, JavaScript: ${jsTestsSet.size}, Rust: ${rustTestsSet.size}, C#: ${csTests.size}\n\n`;
  }

  // Missing tests summary
  content += "---\n\n";
  content += "## Missing Tests Summary\n\n";

  for (const [langName, langTests] of [
    ["Python", pythonTests],
    ["JavaScript", jsTests],
    ["Rust", rustTests],
    ["C#", csharpTests]
  ]) {
    content += `### ${langName} Missing Tests\n\n`;

    let missingCount = 0;
    for (const category of allCategories) {
      const allTests = allTestsByCategory[category];
      const langCategoryTests = new Set((langTests[category] || []).map(t => t.normalized));
      const missing = Array.from(allTests).filter(t => !langCategoryTests.has(t));

      if (missing.length > 0) {
        missingCount += missing.length;
        const categoryDisplay = category.replace('test_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        content += `**${categoryDisplay}** (${missing.length} missing):\n`;
        for (const test of missing.sort()) {
          content += `- ${test.replace(/_/g, ' ')}\n`;
        }
        content += "\n";
      }
    }

    if (missingCount === 0) {
      content += "✅ No missing tests!\n\n";
    } else {
      content += `**Total missing: ${missingCount} tests**\n\n`;
    }
  }

  writeFileSync(outputFile, content, 'utf8');
  console.log(`Comparison document created: ${outputFile}`);

  // Print summary to console
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`Python:     ${pythonTotal.toString().padStart(3)} tests across ${pythonCategories.toString().padStart(2)} categories`);
  console.log(`JavaScript: ${jsTotal.toString().padStart(3)} tests across ${jsCategories.toString().padStart(2)} categories`);
  console.log(`Rust:       ${rustTotal.toString().padStart(3)} tests across ${rustCategories.toString().padStart(2)} categories`);
  console.log(`C#:         ${csharpTotal.toString().padStart(3)} tests across ${csharpCategories.toString().padStart(2)} categories`);
  console.log("=".repeat(80));
}

// Main execution
const baseDir = join(__dirname, '..');
const outputFile = join(baseDir, 'TEST_CASE_COMPARISON.md');
createComparisonDocument(baseDir, outputFile);

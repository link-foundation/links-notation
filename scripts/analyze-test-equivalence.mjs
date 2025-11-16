#!/usr/bin/env node
/**
 * Deep analysis of test equivalence across languages.
 * Compares actual test content (input/output) rather than just names.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract test source strings from test files
 */
function extractTestData(file, content, language) {
  const tests = [];

  if (language === 'python') {
    // Extract test functions with their source strings
    const testRegex = /def (test_\w+)\(.*?\):([\s\S]*?)(?=\ndef test_|\ndef \w+\(|\Z)/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];

      // Extract source = '...' or source = "..."
      const sourceMatches = testBody.matchAll(/source\s*=\s*['"]([^'"]+)['"]/g);
      const sources = Array.from(sourceMatches, m => m[1]);

      tests.push({
        name: testName,
        file,
        sources: sources,
        body: testBody.substring(0, 200) // First 200 chars for reference
      });
    }
  } else if (language === 'javascript') {
    // Extract test(...) blocks with their source strings
    const testRegex = /(?:test|it)\(['"]([^'"]+)['"],\s*\(\)\s*=>\s*\{([\s\S]*?)^\}\);?/gm;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];

      // Extract const source = '...' or const source = "..."  or const source = `...`
      const sourceMatches = testBody.matchAll(/const source\s*=\s*[`'"]([^`'"]+)[`'"]/g);
      const sources = Array.from(sourceMatches, m => m[1]);

      tests.push({
        name: testName,
        file,
        sources: sources,
        body: testBody.substring(0, 200)
      });
    }
  } else if (language === 'rust') {
    // Extract #[test] fn ... blocks
    const testRegex = /#\[test\]\s*fn\s+(\w+)\s*\(\)\s*\{([\s\S]*?)(?=\n\s*#\[test\]|\n\s*fn\s+\w+|\Z)/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];

      // Extract let source = "..." or r#"..."#
      const sourceMatches = testBody.matchAll(/let source\s*=\s*(?:r#"([^"]*)"#|"([^"]*)")/g);
      const sources = Array.from(sourceMatches, m => m[1] || m[2]);

      tests.push({
        name: testName,
        file,
        sources: sources,
        body: testBody.substring(0, 200)
      });
    }
  } else if (language === 'csharp') {
    // Extract [Fact] or [Theory] public void ... tests
    const testRegex = /\[(?:Fact|Theory)\]\s*public\s+(?:static\s+)?(?:void|async\s+Task)\s+(\w+)\s*\(\)[\s\S]*?\{([\s\S]*?)(?=\n\s*\[(?:Fact|Theory)\]|\n\s*public\s+|\Z)/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];

      // Extract var source = "..." or string source = "..."
      const sourceMatches = testBody.matchAll(/(?:var|string)\s+source\s*=\s*(?:@)?"([^"]*)"/g);
      const sources = Array.from(sourceMatches, m => m[1]);

      tests.push({
        name: testName,
        file,
        sources: sources,
        body: testBody.substring(0, 200)
      });
    }
  }

  return tests;
}

/**
 * Find equivalent tests across languages based on test source strings
 */
function findEquivalentTests(allTests) {
  const equivalenceGroups = [];

  // Group tests by their source strings
  const sourceMap = new Map();

  for (const [lang, tests] of Object.entries(allTests)) {
    for (const test of tests) {
      for (const source of test.sources) {
        if (!source || source.length < 5) continue; // Skip very short sources

        const normalizedSource = source.trim().toLowerCase();

        if (!sourceMap.has(normalizedSource)) {
          sourceMap.set(normalizedSource, {
            source: source,
            tests: { python: [], javascript: [], rust: [], csharp: [] }
          });
        }

        sourceMap.get(normalizedSource).tests[lang].push({
          name: test.name,
          file: test.file
        });
      }
    }
  }

  // Filter to only show groups where tests exist in multiple languages
  for (const [source, data] of sourceMap.entries()) {
    const langCount = Object.values(data.tests).filter(arr => arr.length > 0).length;
    if (langCount > 1) { // Only show if test exists in at least 2 languages
      equivalenceGroups.push({
        source: data.source,
        ...data.tests
      });
    }
  }

  return equivalenceGroups;
}

/**
 * Main analysis
 */
function analyzeTestEquivalence(baseDir) {
  const allTests = {
    python: [],
    javascript: [],
    rust: [],
    csharp: []
  };

  // Extract Python tests
  console.log('Extracting Python tests...');
  const pythonDir = join(baseDir, 'python', 'tests');
  const pythonFiles = readdirSync(pythonDir).filter(f => f.startsWith('test_') && f.endsWith('.py'));
  for (const file of pythonFiles) {
    const content = readFileSync(join(pythonDir, file), 'utf8');
    allTests.python.push(...extractTestData(file, content, 'python'));
  }

  // Extract JavaScript tests
  console.log('Extracting JavaScript tests...');
  const jsDir = join(baseDir, 'js', 'tests');
  const jsFiles = readdirSync(jsDir).filter(f => f.endsWith('.test.js'));
  for (const file of jsFiles) {
    const content = readFileSync(join(jsDir, file), 'utf8');
    allTests.javascript.push(...extractTestData(file, content, 'javascript'));
  }

  // Extract Rust tests
  console.log('Extracting Rust tests...');
  const rustDir = join(baseDir, 'rust', 'tests');
  const rustFiles = readdirSync(rustDir).filter(f => f.endsWith('_tests.rs'));
  for (const file of rustFiles) {
    const content = readFileSync(join(rustDir, file), 'utf8');
    allTests.rust.push(...extractTestData(file, content, 'rust'));
  }

  // Extract C# tests
  console.log('Extracting C# tests...');
  const csharpDir = join(baseDir, 'csharp', 'Link.Foundation.Links.Notation.Tests');
  const csharpFiles = readdirSync(csharpDir).filter(f => f.endsWith('Tests.cs'));
  for (const file of csharpFiles) {
    const content = readFileSync(join(csharpDir, file), 'utf8');
    allTests.csharp.push(...extractTestData(file, content, 'csharp'));
  }

  console.log('\nTest counts:');
  console.log(`  Python:     ${allTests.python.length} tests`);
  console.log(`  JavaScript: ${allTests.javascript.length} tests`);
  console.log(`  Rust:       ${allTests.rust.length} tests`);
  console.log(`  C#:         ${allTests.csharp.length} tests`);

  // Find equivalent tests
  console.log('\nFinding equivalent tests across languages...');
  const equivalenceGroups = findEquivalentTests(allTests);

  console.log(`Found ${equivalenceGroups.length} test groups with equivalent functionality\n`);

  // Generate report
  let report = '# Test Equivalence Analysis\n\n';
  report += 'This document shows tests that test the SAME functionality but have DIFFERENT names.\n\n';
  report += `Analysis Date: ${new Date().toISOString()}\n\n`;
  report += '---\n\n';

  report += '## Summary\n\n';
  report += `- Found ${equivalenceGroups.length} test cases implemented across multiple languages\n`;
  report += `- These tests verify the same functionality despite different naming\n\n`;
  report += '---\n\n';

  report += '## Equivalent Tests by Source String\n\n';
  report += 'Tests grouped by the actual input they test (source string):\n\n';

  // Group by whether all 4 languages have the test
  const complete = equivalenceGroups.filter(g =>
    g.python.length > 0 && g.javascript.length > 0 && g.rust.length > 0 && g.csharp.length > 0
  );

  const incomplete = equivalenceGroups.filter(g =>
    !(g.python.length > 0 && g.javascript.length > 0 && g.rust.length > 0 && g.csharp.length > 0)
  );

  report += `### ✅ Tests in All 4 Languages (${complete.length})\n\n`;
  for (const group of complete.slice(0, 50)) { // Limit to first 50 for readability
    report += `**Source:** \`${group.source}\`\n\n`;
    report += '| Language | Test Name |\n';
    report += '|----------|----------|\n';
    if (group.python.length > 0) report += `| Python | ${group.python.map(t => t.name).join(', ')} |\n`;
    if (group.javascript.length > 0) report += `| JavaScript | ${group.javascript.map(t => t.name).join(', ')} |\n`;
    if (group.rust.length > 0) report += `| Rust | ${group.rust.map(t => t.name).join(', ')} |\n`;
    if (group.csharp.length > 0) report += `| C# | ${group.csharp.map(t => t.name).join(', ')} |\n`;
    report += '\n';
  }

  if (complete.length > 50) {
    report += `\n*... and ${complete.length - 50} more*\n\n`;
  }

  report += `\n### ⚠️ Tests Missing in Some Languages (${incomplete.length})\n\n`;
  for (const group of incomplete.slice(0, 30)) {
    report += `**Source:** \`${group.source}\`\n\n`;
    report += '| Language | Test Name | Status |\n';
    report += '|----------|-----------|--------|\n';
    report += `| Python | ${group.python.length > 0 ? group.python.map(t => t.name).join(', ') : '❌ Missing'} | ${group.python.length > 0 ? '✅' : '❌'} |\n`;
    report += `| JavaScript | ${group.javascript.length > 0 ? group.javascript.map(t => t.name).join(', ') : '❌ Missing'} | ${group.javascript.length > 0 ? '✅' : '❌'} |\n`;
    report += `| Rust | ${group.rust.length > 0 ? group.rust.map(t => t.name).join(', ') : '❌ Missing'} | ${group.rust.length > 0 ? '✅' : '❌'} |\n`;
    report += `| C# | ${group.csharp.length > 0 ? group.csharp.map(t => t.name).join(', ') : '❌ Missing'} | ${group.csharp.length > 0 ? '✅' : '❌'} |\n`;
    report += '\n';
  }

  if (incomplete.length > 30) {
    report += `\n*... and ${incomplete.length - 30} more*\n\n`;
  }

  return report;
}

// Main execution
const baseDir = join(__dirname, '..');
const outputFile = join(baseDir, 'TEST_EQUIVALENCE_ANALYSIS.md');
const report = analyzeTestEquivalence(baseDir);
writeFileSync(outputFile, report, 'utf8');
console.log(`\nAnalysis complete! Report written to ${outputFile}`);

#!/usr/bin/env node
/**
 * Generate a comprehensive test name standardization mapping
 * by analyzing actual test content across all languages.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Standard naming convention:
 * - Base name in lowercase with underscores
 * - Python: test_{base_name}
 * - JavaScript: {BaseName}Test
 * - Rust: {base_name}_test
 * - C#: {BaseName}Test
 */

// Mapping of standard base names to current test names
const standardMappings = {
  // Single Line Parser Tests
  'single_link': {
    standard: 'single_link',
    python: 'test_single_link',
    javascript: 'SingleLinkTest',
    rust: 'single_link_test',
    csharp: 'SingleLinkTest',
  },
  'triplet_single_link': {
    standard: 'triplet_single_link',
    python: 'test_triplet_single_link',
    javascript: 'TripletSingleLinkTest',
    rust: 'triplet_single_link_test',
    csharp: 'TripletSingleLinkTest',
  },
  'bug_test_1': {
    standard: 'bug_test_1',
    python: 'test_bug1',  // NEEDS RENAME to test_bug_test_1
    javascript: 'BugTest1',
    rust: 'bug_test_1',
    csharp: 'BugTest1',
  },
  'quoted_references': {
    standard: 'quoted_references',
    python: 'test_quoted_references',
    javascript: 'QuotedReferencesTest',
    rust: 'quoted_references_test',
    csharp: 'QuotedReferencesTest',
  },

  // Link Tests - toString vs to_string issue
  'link_to_string_with_id_only': {
    standard: 'link_to_string_with_id_only',
    python: 'test_link_tostring_with_id_only',  // NEEDS RENAME
    javascript: 'Link toString with id only',     // NEEDS RENAME
    rust: 'link_to_string_with_id_only_test',
    csharp: 'LinkToStringWithIdOnly',
  },
  'link_to_string_with_values_only': {
    standard: 'link_to_string_with_values_only',
    python: 'test_link_tostring_with_values_only',  // NEEDS RENAME
    javascript: 'Link toString with values only',     // NEEDS RENAME
    rust: 'link_to_string_with_values_only_test',
    csharp: 'LinkToStringWithValuesOnly',
  },
  'link_to_string_with_id_and_values': {
    standard: 'link_to_string_with_id_and_values',
    python: 'test_link_tostring_with_id_and_values',  // NEEDS RENAME
    javascript: 'Link toString with id and values',     // NEEDS RENAME
    rust: 'link_to_string_with_id_and_values_test',
    csharp: 'LinkToStringWithIdAndValues',
  },

  // Indented ID Syntax - huge naming variation
  'basic_indented_id_syntax': {
    standard: 'basic_indented_id_syntax',
    python: 'test_basic_indented_id_syntax',
    javascript: 'Basic indented ID syntax - issue #21',  // NEEDS RENAME
    rust: 'basic_indented_id_syntax_test',
    csharp: 'BasicIndentedIdSyntax',
  },

  // More tests to map...
};

/**
 * Extract test content to create mappings
 */
function analyzeTestEquivalence(baseDir) {
  const pythonDir = join(baseDir, 'python', 'tests');
  const jsDir = join(baseDir, 'js', 'tests');
  const rustDir = join(baseDir, 'rust', 'tests');
  const csharpDir = join(baseDir, 'csharp', 'Link.Foundation.Links.Notation.Tests');

  // Group tests by source strings
  const testsBySource = new Map();

  // Helper to add test to mapping
  function addTest(source, lang, testName, file) {
    if (!testsBySource.has(source)) {
      testsBySource.set(source, { python: null, javascript: null, rust: null, csharp: null });
    }
    testsBySource.get(source)[lang] = testName;
  }

  // Extract Python tests
  const pythonFiles = readdirSync(pythonDir).filter(f => f.startsWith('test_') && f.endsWith('.py'));
  for (const file of pythonFiles) {
    const content = readFileSync(join(pythonDir, file), 'utf8');
    const testRegex = /def (test_\w+)\(.*?\):([\s\S]*?)(?=\ndef test_|\ndef \w+\(|\Z)/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      const sourceMatches = testBody.matchAll(/source\s*=\s*[r]?['"]([^'"]+)['"]/g);
      for (const sm of sourceMatches) {
        addTest(sm[1].trim(), 'python', testName, file);
      }
    }
  }

  // Extract JavaScript tests
  const jsFiles = readdirSync(jsDir).filter(f => f.endsWith('.test.js'));
  for (const file of jsFiles) {
    const content = readFileSync(join(jsDir, file), 'utf8');
    const testRegex = /(?:test|it)\(['"]([^'"]+)['"],\s*\(\)\s*=>\s*\{([\s\S]*?)^\}\);?/gm;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      const sourceMatches = testBody.matchAll(/const source\s*=\s*[`'"]([^`'"]+)[`'"]/g);
      for (const sm of sourceMatches) {
        addTest(sm[1].trim(), 'javascript', testName, file);
      }
    }
  }

  // Extract Rust tests
  const rustFiles = readdirSync(rustDir).filter(f => f.endsWith('_tests.rs'));
  for (const file of rustFiles) {
    const content = readFileSync(join(rustDir, file), 'utf8');
    const testRegex = /#\[test\]\s*fn\s+(\w+)\s*\(\)\s*\{([\s\S]*?)(?=\n\s*#\[test\]|\n\s*fn\s+\w+|\Z)/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      const sourceMatches = testBody.matchAll(/let source\s*=\s*(?:r#"([^"]*)"#|"([^"]*)")/g);
      for (const sm of sourceMatches) {
        const source = (sm[1] || sm[2]).trim();
        addTest(source, 'rust', testName, file);
      }
    }
  }

  // Extract C# tests
  const csharpFiles = readdirSync(csharpDir).filter(f => f.endsWith('Tests.cs'));
  for (const file of csharpFiles) {
    const content = readFileSync(join(csharpDir, file), 'utf8');
    const testRegex = /\[(?:Fact|Theory)\]\s*public\s+(?:static\s+)?(?:void|async\s+Task)\s+(\w+)\s*\(\)[\s\S]*?\{([\s\S]*?)(?=\n\s*\[(?:Fact|Theory)\]|\n\s*public\s+|\Z)/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];
      const testBody = match[2];
      const sourceMatches = testBody.matchAll(/(?:var|string)\s+source\s*=\s*(?:@)?"([^"]*)"/g);
      for (const sm of sourceMatches) {
        addTest(sm[1].trim(), 'csharp', testName, file);
      }
    }
  }

  // Generate standardization recommendations
  let output = '# Test Name Standardization Recommendations\n\n';
  output += 'Generated: ' + new Date().toISOString() + '\n\n';
  output += '## Tests Found in All 4 Languages (Need Standardization)\n\n';

  const allLangTests = Array.from(testsBySource.entries())
    .filter(([source, tests]) => tests.python && tests.javascript && tests.rust && tests.csharp)
    .sort((a, b) => a[0].localeCompare(b[0]));

  output += `Found ${allLangTests.length} tests implemented in all 4 languages\n\n`;

  for (const [source, tests] of allLangTests) {
    // Propose standard name based on Python convention (most consistent)
    const pythonBase = tests.python.replace(/^test_/, '');
    const jsName = toPascalCase(pythonBase) + 'Test';
    const rustName = pythonBase + '_test';
    const csharpName = toPascalCase(pythonBase) + 'Test';

    output += `### Source: \`${source.substring(0, 50)}${source.length > 50 ? '...' : ''}\`\n\n`;
    output += '| Language | Current Name | Proposed Standard Name | Needs Rename |\n';
    output += '|----------|--------------|------------------------|-------------|\n';
    output += `| Python | \`${tests.python}\` | \`test_${pythonBase}\` | ${tests.python !== `test_${pythonBase}` ? '⚠️ YES' : '✅ NO'} |\n`;
    output += `| JavaScript | \`${tests.javascript}\` | \`${jsName}\` | ${tests.javascript !== jsName ? '⚠️ YES' : '✅ NO'} |\n`;
    output += `| Rust | \`${tests.rust}\` | \`${rustName}\` | ${tests.rust !== rustName ? '⚠️ YES' : '✅ NO'} |\n`;
    output += `| C# | \`${tests.csharp}\` | \`${csharpName}\` | ${tests.csharp !== csharpName ? '⚠️ YES' : '✅ NO'} |\n`;
    output += '\n';
  }

  return output;
}

function toPascalCase(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

// Main execution
const baseDir = join(__dirname, '..');
const outputFile = join(baseDir, 'TEST_NAME_STANDARDIZATION_RECOMMENDATIONS.md');
const report = analyzeTestEquivalence(baseDir);
writeFileSync(outputFile, report, 'utf8');
console.log(`\nStandardization recommendations written to ${outputFile}`);

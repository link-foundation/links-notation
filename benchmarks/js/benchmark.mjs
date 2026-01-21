#!/usr/bin/env node
/**
 * UTF-8 Character Count Benchmark for Links Notation vs JSON, YAML, and XML
 *
 * This benchmark measures the UTF-8 character count efficiency of Links Notation
 * compared to other popular data serialization formats.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Count UTF-8 characters in a string
 * @param {string} str - Input string
 * @returns {number} Character count
 */
function countUtf8Chars(str) {
  // In JavaScript, string.length gives UTF-16 code units
  // For proper UTF-8 character counting, we use the spread operator
  return [...str].length;
}

/**
 * Calculate savings percentage
 * @param {number} linoChars - Links Notation character count
 * @param {number} otherChars - Other format character count
 * @returns {number} Savings percentage
 */
function calculateSavings(linoChars, otherChars) {
  if (otherChars === 0) return 0;
  return ((otherChars - linoChars) / otherChars) * 100;
}

/**
 * Find the data directory by checking multiple possible paths
 * @returns {string|null} Path to data directory or null
 */
function findDataDir() {
  const possiblePaths = [
    join(__dirname, '../data'),           // Running from benchmarks/js/
    join(__dirname, '../../benchmarks/data'), // Running from repo root
    join(process.cwd(), 'benchmarks/data'),   // CWD is repo root
    join(process.cwd(), '../data'),           // CWD is benchmarks/
    join(process.cwd(), 'data'),              // CWD is benchmarks/
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Find the output directory for reports
 * @returns {string} Path to output directory
 */
function findOutputDir() {
  const possiblePaths = [
    join(__dirname, '..'),                    // Running from benchmarks/js/
    join(process.cwd(), 'benchmarks'),        // CWD is repo root
    process.cwd(),                            // Fallback to current directory
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  return process.cwd();
}

/**
 * Load all benchmark test cases
 * @param {string} dataDir - Path to data directory
 * @returns {Array} Array of benchmark cases
 */
function loadBenchmarkCases(dataDir) {
  const cases = [
    { name: 'employees', description: 'Employee records with nested structure' },
    { name: 'simple_doublets', description: 'Simple doublet links (2-tuples)' },
    { name: 'triplets', description: 'Triplet relations (3-tuples)' },
    { name: 'nested_structure', description: 'Deeply nested company structure' },
    { name: 'config', description: 'Application configuration' },
  ];

  return cases.map(testCase => {
    try {
      const lino = readFileSync(join(dataDir, `${testCase.name}.lino`), 'utf-8');
      const json = readFileSync(join(dataDir, `${testCase.name}.json`), 'utf-8');
      const yaml = readFileSync(join(dataDir, `${testCase.name}.yaml`), 'utf-8');
      const xml = readFileSync(join(dataDir, `${testCase.name}.xml`), 'utf-8');

      return {
        ...testCase,
        lino,
        json,
        yaml,
        xml,
      };
    } catch (error) {
      console.warn(`Warning: Could not load ${testCase.name}: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Run benchmark for a single case
 * @param {Object} testCase - Benchmark case
 * @returns {Object} Benchmark result
 */
function runBenchmark(testCase) {
  const linoChars = countUtf8Chars(testCase.lino);
  const jsonChars = countUtf8Chars(testCase.json);
  const yamlChars = countUtf8Chars(testCase.yaml);
  const xmlChars = countUtf8Chars(testCase.xml);

  return {
    name: testCase.name,
    description: testCase.description,
    lino_chars: linoChars,
    json_chars: jsonChars,
    yaml_chars: yamlChars,
    xml_chars: xmlChars,
    lino_vs_json: calculateSavings(linoChars, jsonChars),
    lino_vs_yaml: calculateSavings(linoChars, yamlChars),
    lino_vs_xml: calculateSavings(linoChars, xmlChars),
  };
}

/**
 * Aggregate results across all benchmark cases
 * @param {Array} results - Array of benchmark results
 * @returns {Object} Aggregated results
 */
function aggregateResults(results) {
  const totalLinoChars = results.reduce((sum, r) => sum + r.lino_chars, 0);
  const totalJsonChars = results.reduce((sum, r) => sum + r.json_chars, 0);
  const totalYamlChars = results.reduce((sum, r) => sum + r.yaml_chars, 0);
  const totalXmlChars = results.reduce((sum, r) => sum + r.xml_chars, 0);

  const avgLinoVsJson = results.reduce((sum, r) => sum + r.lino_vs_json, 0) / results.length;
  const avgLinoVsYaml = results.reduce((sum, r) => sum + r.lino_vs_yaml, 0) / results.length;
  const avgLinoVsXml = results.reduce((sum, r) => sum + r.lino_vs_xml, 0) / results.length;

  return {
    total_lino_chars: totalLinoChars,
    total_json_chars: totalJsonChars,
    total_yaml_chars: totalYamlChars,
    total_xml_chars: totalXmlChars,
    avg_lino_vs_json: avgLinoVsJson,
    avg_lino_vs_yaml: avgLinoVsYaml,
    avg_lino_vs_xml: avgLinoVsXml,
  };
}

/**
 * Main function
 */
function main() {
  const dataDir = findDataDir();
  if (!dataDir) {
    console.error('Error: Could not find benchmarks/data directory');
    console.error('Please run from the repository root or benchmarks directory');
    process.exit(1);
  }

  console.log(`Loading benchmark cases from ${dataDir}...`);
  const cases = loadBenchmarkCases(dataDir);

  if (cases.length === 0) {
    console.error('Error: No benchmark cases found');
    process.exit(1);
  }

  console.log(`Running ${cases.length} benchmark cases...\n`);

  const results = cases.map(runBenchmark);
  const aggregated = aggregateResults(results);

  // Print summary to console
  console.log('=== Links Notation Character Count Benchmark (JavaScript) ===\n');
  console.log('Summary:');
  console.log(`  Total Lino characters:  ${aggregated.total_lino_chars}`);
  console.log(`  Total JSON characters:  ${aggregated.total_json_chars}`);
  console.log(`  Total YAML characters:  ${aggregated.total_yaml_chars}`);
  console.log(`  Total XML characters:   ${aggregated.total_xml_chars}`);
  console.log();
  console.log('Average savings with Lino:');
  console.log(`  vs JSON: ${aggregated.avg_lino_vs_json.toFixed(1)}% fewer characters`);
  console.log(`  vs YAML: ${aggregated.avg_lino_vs_yaml.toFixed(1)}% fewer characters`);
  console.log(`  vs XML:  ${aggregated.avg_lino_vs_xml.toFixed(1)}% fewer characters`);
  console.log();

  // Generate JSON report
  const report = {
    language: 'JavaScript',
    summary: aggregated,
    results: results,
  };

  const outputDir = findOutputDir();
  const jsonPath = join(outputDir, 'benchmark_results_js.json');

  try {
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`JSON report written to ${jsonPath}`);
  } catch (error) {
    console.warn(`Warning: Could not write JSON report: ${error.message}`);
  }

  console.log('\nBenchmark completed successfully!');
}

// Run main function
main();

// Export for testing
export { countUtf8Chars, calculateSavings, runBenchmark, aggregateResults };

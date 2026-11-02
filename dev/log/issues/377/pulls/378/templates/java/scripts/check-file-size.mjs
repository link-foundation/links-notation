#!/usr/bin/env node
/**
 * File size validation script.
 *
 * Checks that all Java files in the project do not exceed the maximum
 * allowed line count (1000 lines by default).
 *
 * Usage:
 *   bun scripts/check-file-size.mjs [--max-lines <number>] [--verbose]
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { printUntrusted } from './github-actions-log.mjs';

const MAX_LINES_DEFAULT = 1000;

/**
 * Parse command line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let maxLines = MAX_LINES_DEFAULT;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-lines' && args[i + 1]) {
      maxLines = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--verbose') {
      verbose = true;
    }
  }

  return { maxLines, verbose };
}

/**
 * Recursively find all Java files in a directory.
 * @param {string} dir - Directory to search
 * @param {string[]} files - Accumulator array
 * @returns {string[]} Array of file paths
 */
function findJavaFiles(dir, files = []) {
  const excludeDirs = ['target', 'node_modules', '.git', '.idea', 'build'];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      if (excludeDirs.includes(entry)) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          findJavaFiles(fullPath, files);
        } else if (extname(entry) === '.java') {
          files.push(fullPath);
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Count lines in a file.
 * @param {string} filePath - Path to the file
 * @returns {number} Number of lines
 */
function countLines(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return content.split('\n').length;
}

/**
 * Main function.
 */
function main() {
  const { maxLines, verbose } = parseArgs();
  const projectRoot = process.cwd();

  console.log(`Checking Java files for maximum ${maxLines} lines...`);

  const javaFiles = findJavaFiles(projectRoot);
  const violations = [];

  for (const file of javaFiles) {
    const lineCount = countLines(file);
    const relativePath = file.replace(projectRoot + '/', '');

    if (verbose) {
      console.log(`  ${lineCount} lines:`);
      printUntrusted(relativePath);
    }

    if (lineCount > maxLines) {
      violations.push({ file: relativePath, lines: lineCount });
    }
  }

  if (violations.length > 0) {
    console.error('\nFile size violations found:');
    for (const { file, lines } of violations) {
      console.error(`  ${lines} lines (max: ${maxLines}):`);
      printUntrusted(file);
    }
    console.error(`\nTotal violations: ${violations.length}`);
    process.exit(1);
  }

  console.log(`\nAll ${javaFiles.length} files pass the size check.`);
  process.exit(0);
}

main();

#!/usr/bin/env bun

/**
 * Checks that Go source files don't exceed the maximum line limit.
 * This encourages modular, maintainable code.
 *
 * Usage:
 *   bun scripts/check-file-size.mjs [--max-lines <number>]
 *
 * Default max lines: 1000
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";
import { printUntrusted } from "./github-actions-log.mjs";

const DEFAULT_MAX_LINES = 1000;
const IGNORE_DIRS = ["vendor", ".git", "node_modules", "testdata"];

function parseArgs() {
  const args = process.argv.slice(2);
  let maxLines = DEFAULT_MAX_LINES;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-lines" && args[i + 1]) {
      maxLines = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { maxLines };
}

function findGoFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        findGoFiles(fullPath, files);
      }
    } else if (entry.isFile() && extname(entry.name) === ".go") {
      files.push(fullPath);
    }
  }

  return files;
}

function countLines(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return content.split("\n").length;
}

function main() {
  const { maxLines } = parseArgs();
  const violations = [];

  console.log(`Checking Go files for max ${maxLines} lines...`);

  try {
    const goFiles = findGoFiles(process.cwd());

    for (const file of goFiles) {
      const lineCount = countLines(file);
      if (lineCount > maxLines) {
        violations.push({ file, lineCount });
      }
    }

    if (violations.length > 0) {
      console.error("\nFile size violations found:");
      for (const { file, lineCount } of violations) {
        printUntrusted(`  ${file}: ${lineCount} lines (max: ${maxLines})`, {
          stream: process.stderr,
        });
      }
      console.error(`\nTotal violations: ${violations.length}`);
      process.exit(1);
    }

    console.log(`All ${goFiles.length} Go files are within the limit.`);
  } catch (error) {
    console.error("::error::File size check failed");
    printUntrusted(error.message, { stream: process.stderr });
    process.exit(1);
  }
}

main();

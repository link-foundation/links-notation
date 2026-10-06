#!/usr/bin/env bun

/**
 * Creates a GitHub release with notes extracted from CHANGELOG.md
 *
 * Usage:
 *   bun scripts/create-github-release.mjs --version <version> [--repository <owner/repo>]
 *
 * Examples:
 *   bun scripts/create-github-release.mjs --version 1.0.0
 *   bun scripts/create-github-release.mjs --version 1.0.0 --repository link-foundation/my-repo
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const CHANGELOG_FILE = join(process.cwd(), "CHANGELOG.md");

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { version: null, repository: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version" && args[i + 1]) {
      result.version = args[i + 1];
      i++;
    } else if (args[i] === "--repository" && args[i + 1]) {
      result.repository = args[i + 1];
      i++;
    }
  }

  return result;
}

function extractReleaseNotes(version) {
  if (!existsSync(CHANGELOG_FILE)) {
    return null;
  }

  const changelog = readFileSync(CHANGELOG_FILE, "utf-8");

  // Match the section for this version
  const escapedVersion = version.replace(/\./g, "\\.");
  const pattern = new RegExp(
    `## \\[${escapedVersion}\\][^\\n]*\\n\\n([\\s\\S]*?)(?=## \\[|$)`,
    "m"
  );

  const match = changelog.match(pattern);
  if (match) {
    return match[1].trim();
  }

  return null;
}

function createRelease(version, notes, repository) {
  const tag = `v${version}`;
  const title = `Release ${tag}`;
  const body = notes || `Release ${tag}`;

  let cmd = `gh release create "${tag}" --title "${title}"`;

  if (repository) {
    cmd += ` --repo "${repository}"`;
  }

  // Use stdin for body to avoid shell escaping issues
  try {
    execSync(cmd + " --notes-file -", {
      input: body,
      stdio: ["pipe", "inherit", "inherit"],
    });
    console.log(`Created release: ${tag}`);
  } catch (error) {
    // Check if release already exists
    if (error.message.includes("already exists")) {
      console.log(`Release ${tag} already exists, skipping.`);
    } else {
      throw error;
    }
  }
}

function main() {
  const { version, repository } = parseArgs();

  if (!version) {
    console.error("Error: --version is required");
    process.exit(1);
  }

  console.log(`Creating GitHub release for version ${version}...`);

  try {
    const notes = extractReleaseNotes(version);

    if (notes) {
      console.log("Found release notes in CHANGELOG.md");
    } else {
      console.log("No release notes found, using default message");
    }

    createRelease(version, notes, repository);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

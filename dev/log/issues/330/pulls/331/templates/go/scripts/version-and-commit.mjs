#!/usr/bin/env bun

/**
 * Complete version management workflow for changeset-based releases:
 * 1. Read bump type from changeset (or use provided --bump-type for instant mode)
 * 2. Bump version in source code
 * 3. Update CHANGELOG.md
 * 4. Delete processed changesets
 * 5. Commit changes
 * 6. Create git tag
 * 7. Push to remote
 *
 * Usage:
 *   Changeset mode (reads bump type from .changeset files):
 *     bun scripts/version-and-commit.mjs --mode changeset
 *
 *   Instant mode (manual release with specified bump type):
 *     bun scripts/version-and-commit.mjs --mode instant --bump-type <major|minor|patch> [--description "..."]
 *
 * Examples:
 *   bun scripts/version-and-commit.mjs --mode changeset
 *   bun scripts/version-and-commit.mjs --mode instant --bump-type patch --description "Bug fix release"
 */

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { printUntrusted } from "./github-actions-log.mjs";

// Package name for the Go module (used in changeset frontmatter)
const PACKAGE_NAME = "go-ai-driven-development-pipeline-template";
const VERSION_FILE = join(process.cwd(), "pkg", "mypackage", "mypackage.go");
const CHANGELOG_FILE = join(process.cwd(), "CHANGELOG.md");
const CHANGESET_DIR = ".changeset";

// Version bump type priority (higher number = higher priority)
const BUMP_PRIORITY = {
  patch: 1,
  minor: 2,
  major: 3,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { mode: "changeset", bumpType: null, description: "" };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mode" && args[i + 1]) {
      result.mode = args[i + 1];
      i++;
    } else if (args[i] === "--bump-type" && args[i + 1]) {
      result.bumpType = args[i + 1];
      i++;
    } else if (args[i] === "--description" && args[i + 1]) {
      result.description = args[i + 1];
      i++;
    }
  }

  return result;
}

function getCurrentVersion() {
  const content = readFileSync(VERSION_FILE, "utf-8");
  const match = content.match(/const Version = "(\d+\.\d+\.\d+)"/);

  if (!match) {
    throw new Error(`Could not find version in ${VERSION_FILE}`);
  }

  return match[1];
}

function calculateNewVersion(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split(".").map(Number);

  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

function updateVersion(newVersion) {
  let content = readFileSync(VERSION_FILE, "utf-8");
  content = content.replace(
    /const Version = "\d+\.\d+\.\d+"/,
    `const Version = "${newVersion}"`
  );
  writeFileSync(VERSION_FILE, content);
}

/**
 * Parse changeset files and extract bump type and descriptions
 * @returns {{bumpType: string, descriptions: string[]}}
 */
function parseChangesets() {
  const changesetFiles = readdirSync(CHANGESET_DIR).filter(
    (file) => file.endsWith(".md") && file !== "README.md"
  );

  if (changesetFiles.length === 0) {
    return { bumpType: null, descriptions: [] };
  }

  const bumpTypes = [];
  const descriptions = [];

  for (const file of changesetFiles) {
    const filePath = join(CHANGESET_DIR, file);
    const content = readFileSync(filePath, "utf-8");

    // Extract version type
    const versionTypeRegex = new RegExp(
      `^['"]?${PACKAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]?:\\s+(major|minor|patch)`,
      "m"
    );
    const versionTypeMatch = content.match(versionTypeRegex);

    if (versionTypeMatch) {
      bumpTypes.push(versionTypeMatch[1]);
    }

    // Extract description
    const parts = content.split("---");
    if (parts.length >= 3) {
      const description = parts.slice(2).join("---").trim();
      if (description) {
        descriptions.push(description);
      }
    }
  }

  // Determine highest bump type
  let highestBumpType = "patch";
  for (const type of bumpTypes) {
    if (BUMP_PRIORITY[type] > BUMP_PRIORITY[highestBumpType]) {
      highestBumpType = type;
    }
  }

  return { bumpType: highestBumpType, descriptions };
}

/**
 * Delete all changeset files (after processing)
 */
function deleteChangesets() {
  const changesetFiles = readdirSync(CHANGESET_DIR).filter(
    (file) => file.endsWith(".md") && file !== "README.md"
  );

  for (const file of changesetFiles) {
    const filePath = join(CHANGESET_DIR, file);
    unlinkSync(filePath);
    console.log("Deleted changeset:");
    printUntrusted(file);
  }
}

/**
 * Update CHANGELOG.md with new version entry
 * @param {string} newVersion
 * @param {string[]} descriptions
 */
function updateChangelog(newVersion, descriptions) {
  if (!existsSync(CHANGELOG_FILE)) {
    // Create new changelog
    const content = `# Changelog

All notable changes to this project will be documented in this file.

## [${newVersion}] - ${new Date().toISOString().split("T")[0]}

${descriptions.join("\n\n")}
`;
    writeFileSync(CHANGELOG_FILE, content);
    return;
  }

  // Update existing changelog
  let content = readFileSync(CHANGELOG_FILE, "utf-8");

  // Find the position after the header to insert new entry
  const headerMatch = content.match(/# Changelog\s*\n/);
  if (!headerMatch) {
    throw new Error("Could not find changelog header");
  }

  const insertPos = headerMatch.index + headerMatch[0].length;

  // Find any "All notable changes" line to skip
  const notableMatch = content
    .slice(insertPos)
    .match(/All notable changes[^\n]*\n\n?/);
  const actualInsertPos = notableMatch
    ? insertPos + notableMatch.index + notableMatch[0].length
    : insertPos;

  const newEntry = `\n## [${newVersion}] - ${new Date().toISOString().split("T")[0]}

${descriptions.join("\n\n")}

`;

  content =
    content.slice(0, actualInsertPos) + newEntry + content.slice(actualInsertPos);
  writeFileSync(CHANGELOG_FILE, content);
}

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: "inherit" });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function main() {
  const { mode, bumpType, description } = parseArgs();

  console.log(`Mode: ${mode}`);

  if (mode !== "changeset" && mode !== "instant") {
    console.error('Error: --mode must be "changeset" or "instant"');
    process.exit(1);
  }

  try {
    // Configure git for CI
    if (process.env.CI) {
      run('git config user.name "github-actions[bot]"');
      run('git config user.email "github-actions[bot]@users.noreply.github.com"');
    }

    let finalBumpType;
    let descriptions = [];

    if (mode === "changeset") {
      // Parse changesets to get bump type and descriptions
      const changesetData = parseChangesets();

      if (!changesetData.bumpType) {
        console.log("No changesets found. Nothing to release.");
        setOutput("version_committed", "false");
        return;
      }

      finalBumpType = changesetData.bumpType;
      descriptions = changesetData.descriptions;
      console.log(`Changeset bump type: ${finalBumpType}`);
      console.log(`Found ${descriptions.length} description(s)`);
    } else {
      // Instant mode - use provided bump type
      if (!bumpType) {
        console.error("Error: --bump-type is required for instant mode");
        process.exit(1);
      }

      if (!["major", "minor", "patch"].includes(bumpType)) {
        console.error("Error: --bump-type must be major, minor, or patch");
        process.exit(1);
      }

      finalBumpType = bumpType;
      descriptions = description ? [description] : ["Manual release"];
    }

    // Get current and new version
    const currentVersion = getCurrentVersion();
    const newVersion = calculateNewVersion(currentVersion, finalBumpType);

    console.log(`\nBumping version: ${currentVersion} -> ${newVersion}\n`);

    // Update version in source code
    updateVersion(newVersion);
    console.log(`Updated version in ${VERSION_FILE}`);

    // Update CHANGELOG.md
    updateChangelog(newVersion, descriptions);
    console.log("Updated CHANGELOG.md");

    // Delete changeset files (for changeset mode)
    if (mode === "changeset") {
      deleteChangesets();
    }

    // Stage all changes
    run("git add -A");

    // Check if there are changes to commit
    try {
      runCapture("git diff --cached --quiet");
      console.log("No changes to commit");
      setOutput("version_committed", "false");
    } catch {
      // There are changes, commit them
      run(`git commit -m "chore: release v${newVersion}"`);
      setOutput("version_committed", "true");
    }

    // Create tag
    const tag = `v${newVersion}`;
    run(`git tag -a "${tag}" -m "Release ${tag}"`);

    // Push changes and tags
    run("git push");
    run("git push --tags");

    console.log(`\nSuccessfully released version ${newVersion}`);

    // Output for GitHub Actions
    setOutput("new_version", newVersion);
    setOutput("tag", tag);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

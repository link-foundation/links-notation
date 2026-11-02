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
import { execFileSync } from "child_process";
import { printUntrusted } from "./github-actions-log.mjs";

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

export function extractReleaseNotes(
  version,
  changelog = existsSync(CHANGELOG_FILE)
    ? readFileSync(CHANGELOG_FILE, "utf-8")
    : null
) {
  if (!changelog) return null;

  // Match the section for this version
  const escapedVersion = version.replace(/\./g, "\\.");
  const pattern = new RegExp(
    `## \\[${escapedVersion}\\][^\\n]*\\n\\n([\\s\\S]*?)(?=\\n## \\[|$)`
  );

  const match = changelog.match(pattern);
  if (match) {
    return match[1].trim();
  }

  return null;
}

export function createRelease(version, notes, repository, run = execFileSync) {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("Invalid release version");
  const tag = `v${version}`;
  const title = `Release ${tag}`;
  const body = notes || `Release ${tag}`;

  const args = [
    "release",
    "create",
    tag,
    "--verify-tag",
    "--title",
    title,
    "--notes-file",
    "-",
  ];

  if (repository) {
    args.push("--repo", repository);
  }

  // Use stdin for body to avoid shell escaping issues
  try {
    run("gh", args, {
      input: body,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "pipe"],
    });
    console.log(`Created release: ${tag}`);
  } catch (error) {
    // Check if release already exists
    if (error.stderr?.includes("already exists")) {
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
    console.error("::error::Could not create the GitHub release");
    printUntrusted(error.message, { stream: process.stderr });
    process.exit(1);
  }
}

if (import.meta.main) main();

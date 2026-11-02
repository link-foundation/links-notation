#!/usr/bin/env bun

// Recover a release interrupted after its changesets and tag were committed.
import { appendFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { printUntrusted } from "./github-actions-log.mjs";

export function checkReleaseNeeded({
  version,
  probe = spawnSync,
  warn = console.warn,
}) {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("Invalid current version");
  const tag = `v${version}`;
  const release = probe("gh", ["release", "view", tag], { encoding: "utf8" });
  if (release.status === 0) return false;

  // Only gh's explicit not-found response is evidence of a missing release.
  // Authentication, API and transport failures must never trigger publishing.
  if (
    release.status !== 1 ||
    !/^release not found\s*$/i.test((release.stderr || "").trim())
  ) {
    warn(
      "::warning::Could not determine whether the current GitHub release exists; skipping recovery"
    );
    printUntrusted(
      release.error?.message || release.stderr || "Unknown gh error",
      { stream: process.stderr }
    );
    return false;
  }

  const tagged = probe(
    "git",
    ["show-ref", "--verify", "--quiet", `refs/tags/${tag}`],
    { encoding: "utf8" }
  );
  if (tagged.status === 0) return true;
  warn(
    "::warning::The current version has no local release tag; skipping recovery"
  );
  return false;
}

function main() {
  const source = readFileSync("pkg/mypackage/mypackage.go", "utf8");
  const version = source.match(/const Version = "(\d+\.\d+\.\d+)"/)?.[1];
  const releaseNeeded = checkReleaseNeeded({ version });
  console.log(
    releaseNeeded
      ? `Recovering GitHub release v${version} without a version bump`
      : "No release recovery needed"
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `release_needed=${releaseNeeded}\nversion=${version}\ntag=v${version}\n`
    );
  }
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error("::error::Could not read the current release version");
    printUntrusted(error.message, { stream: process.stderr });
    process.exitCode = 1;
  }
}

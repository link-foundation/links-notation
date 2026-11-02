#!/usr/bin/env node
// Audit a Yarn 1 lockfile that has no package.json beside it.
//
// The Kotlin/JS Gradle plugin writes kotlin/kotlin-js-store/yarn.lock for the
// Mocha test runner it installs, but no package.json: Gradle generates that
// under build/js. npm audit cannot read the lockfile, Dependabot's security
// updates abort with "/kotlin/kotlin-js-store/package.json not found", and its
// alerts (diff, glob, minimatch; issue #377) were reported by no CI job.
//
// This sends every locked name and version to the registry's bulk advisory
// endpoint (the one npm audit uses), which answers with the advisories that
// cover at least one of the versions sent, and fails at --audit-level or above.
//
// Usage: node scripts/ci/audit-yarn-lock.mjs <yarn.lock> [--audit-level=moderate]
// CI_VERBOSE=true lists every locked package.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const LEVELS = ["info", "low", "moderate", "high", "critical"];
const ENDPOINT = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

// Map each package in a Yarn 1 lockfile to the versions locked for it.
export function lockedVersions(text) {
  const versions = {};
  let names = [];
  for (const line of text.split(/\r?\n/)) {
    if (
      line &&
      !line.startsWith(" ") &&
      !line.startsWith("#") &&
      line.endsWith(":")
    ) {
      names = line
        .slice(0, -1)
        .split(", ")
        .map((spec) => spec.replace(/^"|"$/g, ""))
        .map((spec) => spec.slice(0, spec.lastIndexOf("@")));
    } else {
      const match = /^ {2}version "([^"]+)"$/.exec(line);
      if (match) {
        for (const name of new Set(names)) {
          versions[name] ??= [];
          if (!versions[name].includes(match[1])) versions[name].push(match[1]);
        }
        names = [];
      }
    }
  }
  return versions;
}

// The advisories at or above `level`, one line per package and advisory.
export function findings(advisories, versions, level) {
  const floor = LEVELS.indexOf(level);
  const lines = [];
  for (const [name, entries] of Object.entries(advisories)) {
    for (const advisory of entries) {
      if (LEVELS.indexOf(advisory.severity) >= floor) {
        lines.push(
          `${name} ${versions[name]?.join(", ")}: ${advisory.severity} ${advisory.vulnerable_versions} ${advisory.url}`,
        );
      }
    }
  }
  return lines;
}

async function main() {
  const lockfile = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith("--"));
  const level = (
    process.argv.find((argument) => argument.startsWith("--audit-level=")) ??
    "=moderate"
  ).split("=")[1];
  if (!lockfile || !LEVELS.includes(level)) {
    console.error(
      `Usage: audit-yarn-lock.mjs <yarn.lock> [--audit-level=${LEVELS.join("|")}]`,
    );
    process.exit(2);
  }
  const versions = lockedVersions(readFileSync(lockfile, "utf8"));
  if (Object.keys(versions).length === 0)
    throw new Error(`${lockfile} locks no packages; is it a Yarn 1 lockfile?`);
  if (process.env.CI_VERBOSE === "true") {
    for (const [name, list] of Object.entries(versions))
      console.log(`${name} ${list.join(", ")}`);
  }
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(versions),
  });
  if (!response.ok)
    throw new Error(
      `${ENDPOINT} answered ${response.status} ${response.statusText}`,
    );
  const lines = findings(await response.json(), versions, level);
  for (const line of lines) console.error(line);
  const count = Object.keys(versions).length;
  if (lines.length) {
    console.error(
      `::error file=${lockfile}::${lines.length} advisories at ${level} or above in ${count} locked packages. ` +
        "Raise the versions with YarnRootExtension.resolution(...) in kotlin/build.gradle.kts, then run " +
        "`./gradlew rootPackageJson --rerun kotlinUpgradeYarnLock` in kotlin/ and commit the lockfile " +
        "(rootPackageJson does not see a changed resolution, so a plain kotlinUpgradeYarnLock keeps the old one).",
    );
    process.exitCode = 1;
  } else {
    console.log(
      `${lockfile}: no advisories at ${level} or above in ${count} locked packages.`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

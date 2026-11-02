#!/usr/bin/env bun

// Check active CI pins against upstream releases, including immutable ref integrity.
// Registry errors fail the check so unavailable metadata cannot conceal stale pins.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { printUntrusted } from "../github-actions-log.mjs";

const VERSION = /^\d+\.\d+\.\d+$/;

export function findDependencies(workflows) {
  const dependencies = [];
  for (const { path, source } of workflows) {
    for (const [index, line] of source.split("\n").entries()) {
      const location = `${path}:${index + 1}`;
      const action = line.match(/^\s*-?\s*uses:\s+([^\s#]+)/);
      if (action) {
        if (action[1].startsWith("./")) continue;
        const match = line.match(
          /uses:\s+(docker:\/\/)?([\w.-]+\/[\w.-]+)@(\S+)\s+#\s+v(\d+\.\d+\.\d+)\s*$/
        );
        if (
          !match ||
          !(match[1] ? /^sha256:[0-9a-f]{64}$/ : /^[0-9a-f]{40}$/).test(
            match[3]
          )
        ) {
          throw new Error(
            `${location}: pin actions to a commit SHA and containers to a digest, with an exact version comment`
          );
        }
        dependencies.push({
          location,
          name: match[2],
          ref: match[3],
          version: match[4],
          kind: match[1] ? "container" : "action",
        });
        continue;
      }
      const tool = line.match(
        /^\s*(bun-version|go-version):\s*['"]?([^\s'"#]+)/
      );
      const staticcheck = line.match(
        /go install honnef\.co\/go\/tools\/cmd\/staticcheck@([^\s]+)/
      );
      if (tool || staticcheck) {
        const version = tool ? tool[2] : staticcheck[1];
        if (!VERSION.test(version))
          throw new Error(
            `${location}: pin tool versions to an exact stable release`
          );
        dependencies.push({
          location,
          name: staticcheck
            ? "dominikh/go-tools"
            : tool[1] === "bun-version"
              ? "oven-sh/bun"
              : "go",
          version,
          kind: "tool",
        });
      }
    }
  }
  return dependencies;
}

function github(endpoint) {
  return JSON.parse(
    execFileSync("gh", ["api", endpoint], { encoding: "utf8" })
  );
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function latestVersion(dependency) {
  if (dependency.name === "go") {
    const releases = await getJson("https://go.dev/dl/?mode=json");
    const version = releases.find((release) => release.stable)?.version;
    if (!version) throw new Error("Go endpoint returned no stable releases");
    return version.replace(/^go/, "");
  }
  const release = github(`repos/${dependency.name}/releases/latest`);
  if (release.draft || release.prerelease)
    throw new Error("Upstream latest release is not stable");
  const version = release.tag_name.replace(/^(?:bun-)?v/, "");
  if (!VERSION.test(version))
    throw new Error(`Unsupported upstream release ${release.tag_name}`);
  return version;
}

async function verifyPin(dependency) {
  if (dependency.kind === "action") {
    let object = github(
      `repos/${dependency.name}/git/ref/tags/v${dependency.version}`
    ).object;
    // Actions such as Codecov use annotated tags; resolve to the actual commit.
    for (let depth = 0; object.type === "tag" && depth < 5; depth += 1) {
      object = github(`repos/${dependency.name}/git/tags/${object.sha}`).object;
    }
    if (object.type !== "commit" || object.sha !== dependency.ref)
      throw new Error("Pinned SHA does not match the release tag");
  } else if (dependency.kind === "container") {
    const { token } = await getJson(
      `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${dependency.name}:pull`
    );
    const response = await fetch(
      `https://registry-1.docker.io/v2/${dependency.name}/manifests/${dependency.version}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json",
        },
      }
    );
    if (!response.ok)
      throw new Error(`Container registry returned HTTP ${response.status}`);
    const digest = response.headers.get("docker-content-digest");
    await response.arrayBuffer();
    if (digest !== dependency.ref)
      throw new Error("Pinned digest does not match the release image");
  }
}

export async function checkDependencies(
  dependencies,
  { latest = latestVersion, verifyPin: verify = verifyPin } = {}
) {
  const errors = [];
  const versions = new Map();
  const pins = new Set();
  for (const dependency of dependencies) {
    try {
      if (!versions.has(dependency.name))
        versions.set(dependency.name, await latest(dependency));
      const current = versions.get(dependency.name);
      if (dependency.version !== current) {
        errors.push(
          `${dependency.location}: ${dependency.name} pins ${dependency.version}; latest stable is ${current}`
        );
        continue;
      }
      const key = `${dependency.name}@${dependency.ref}`;
      if (dependency.ref && !pins.has(key)) {
        await verify(dependency);
        pins.add(key);
      }
    } catch (error) {
      errors.push(
        `${dependency.location}: ${dependency.name}: ${error.message}`
      );
    }
  }
  return errors;
}

async function main() {
  const directory = ".github/workflows";
  const workflows = readdirSync(directory)
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => ({
      path: `${directory}/${file}`,
      source: readFileSync(`${directory}/${file}`, "utf8"),
    }));
  const dependencies = findDependencies(workflows);
  const errors = await checkDependencies(dependencies);
  if (errors.length) {
    console.error("::error::CI dependencies need attention");
    for (const error of errors)
      printUntrusted(error, { stream: process.stderr });
    process.exitCode = 1;
  } else {
    console.log(
      `All ${dependencies.length} CI dependency pins match current stable releases`
    );
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error("::error::CI dependency check failed");
    printUntrusted(error.message, { stream: process.stderr });
    process.exitCode = 1;
  }
}

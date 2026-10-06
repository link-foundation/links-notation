#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { printUntrusted } from "./github-actions-log.mjs";

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_INTERVAL_MS = 10_000;

export function escapeModulePath(modulePath) {
  return modulePath
    .replaceAll("!", "!!")
    .replace(/[A-Z]/g, (character) => `!${character.toLowerCase()}`);
}

export function moduleInfoUrl(modulePath, tag) {
  return `https://proxy.golang.org/${escapeModulePath(modulePath)}/@v/${encodeURIComponent(tag)}.info`;
}

export async function verifyModuleAvailability({
  modulePath,
  tag,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  fetchImpl = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const url = moduleInfoUrl(modulePath, tag);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url);
      if (response.ok) {
        const info = await response.json();
        if (info.Version === tag) return { url, attempts: attempt };
      }
    } catch {
      // Proxy propagation is eventually consistent; retry transient failures.
    }

    if (attempt < attempts) await sleep(intervalMs);
  }

  throw new Error(
    `${modulePath}@${tag} did not become resolvable via proxy.golang.org after ${attempts} attempts`
  );
}

function parseTag(args) {
  const index = args.indexOf("--tag");
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const tag = parseTag(process.argv.slice(2));
  if (!tag) {
    console.error("Error: --tag is required");
    process.exit(1);
  }

  const modulePath = execFileSync("go", ["list", "-m"], {
    encoding: "utf8",
  }).trim();
  console.log(`Waiting for ${modulePath}@${tag} on proxy.golang.org...`);

  try {
    const result = await verifyModuleAvailability({ modulePath, tag });
    console.log(
      `Verified ${modulePath}@${tag} after ${result.attempts} attempt(s)`
    );
  } catch (error) {
    console.error("::error::The tagged Go module is not available to consumers");
    printUntrusted(error.message, { stream: process.stderr });
    process.exit(1);
  }
}

if (import.meta.main) await main();

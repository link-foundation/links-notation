#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function githubApi(path, body) {
  const args = ["api", path];
  if (body) {
    args.push("--method", "POST");
    for (const [key, value] of Object.entries(body))
      args.push("--raw-field", `${key}=${value}`);
  }
  if (path.includes("/matching-refs/")) {
    args.push("--paginate", "--slurp");
    return JSON.parse(execFileSync("gh", args, { encoding: "utf8" })).flat();
  }
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8" }));
}

// Packagist ignores php_VERSION release tags. Create a Composer-compatible
// version tag without changing the existing [PHP] release tag convention.
export async function ensureVersionTag({
  repository,
  version,
  sha,
  api = githubApi,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || ""))
    throw new Error("Invalid repository");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version || ""))
    throw new Error("Invalid Composer version");
  if (!/^[0-9a-f]{40}$/.test(sha || "")) throw new Error("Invalid release SHA");
  const ref = `refs/tags/${version}`;
  const refs = await api(
    `repos/${repository}/git/matching-refs/tags/${version}`,
  );
  const existing = refs.find((item) => item.ref === ref);
  if (existing) {
    let object = existing.object;
    for (let depth = 0; object.type === "tag" && depth < 4; depth++) {
      object = (await api(`repos/${repository}/git/tags/${object.sha}`)).object;
    }
    if (object.type !== "commit" || object.sha !== sha)
      throw new Error(
        `${ref} already points to another commit; bump the version instead of retagging`,
      );
    return "existing";
  }
  await api(`repos/${repository}/git/refs`, { ref, sha });
  return "created";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await ensureVersionTag({
    repository: process.env.GITHUB_REPOSITORY,
    version: process.env.PACKAGE_VERSION,
    sha: process.env.RELEASE_SHA,
  });
  console.log(`Composer version tag ${process.env.PACKAGE_VERSION}: ${result}`);
}

// Verify the extraction preserved every original job, changing only the
// publisher's native-stage dependencies now enforced by the release barrier.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { YAML } from "bun";

const beforeCommit = process.argv[2] ?? "0fe7471";
for (const language of [
  "javascript",
  "rust",
  "python",
  "java",
  "go",
  "csharp",
  "php",
]) {
  const before = YAML.parse(
    execFileSync(
      "git",
      ["show", `${beforeCommit}:.github/workflows/${language}.yml`],
      { encoding: "utf8" },
    ),
  );
  const native = YAML.parse(
    readFileSync(`.github/workflows/${language}.yml`, "utf8"),
  );
  const publisher = YAML.parse(
    readFileSync(
      `.github/workflows/publish-${language === "javascript" ? "js" : language}.yml`,
      "utf8",
    ),
  );
  const combined = { ...native.jobs, ...publisher.jobs };
  if (
    !isDeepStrictEqual(
      Object.keys(before.jobs).sort(),
      Object.keys(combined).sort(),
    )
  )
    throw new Error(`${language}: jobs were removed or duplicated`);
  for (const [name, job] of Object.entries(before.jobs)) {
    if (
      publisher.jobs[name] &&
      job.needs?.every((dependency) => !publisher.jobs[dependency])
    )
      delete job.needs;
    if (!isDeepStrictEqual(job, combined[name]))
      throw new Error(`${language}/${name}: unexpected job change`);
  }
  for (const key of ["env", "defaults"]) {
    if (
      !isDeepStrictEqual(before[key], native[key]) ||
      !isDeepStrictEqual(before[key], publisher[key])
    )
      throw new Error(`${language}: ${key} changed`);
  }
  console.log(
    `${language}: all ${Object.keys(combined).length} native/publishing jobs preserved`,
  );
}

#!/usr/bin/env bun
// Parse workflow YAML, then trace every reusable call back to an unconditional
// same-commit JS stage. Unknown language entry points fail closed.
import { readFileSync, readdirSync } from "node:fs";
import { YAML } from "bun";
import { pathToFileURL } from "node:url";

const languageNames = ["rust", "python", "java", "go", "csharp", "php"];
const languageAction = /(?:rust-toolchain|setup-(?:dotnet|java|go|php))/;
const languageRun =
  /\b(?:cargo|dotnet|mvn|php|pytest|go\s+(?:test|build|run|vet))\b|(?:python\/|python[23]?\s+-m\s+(?:pytest|unittest|build))/;
const nativeDirectory = /^(?:\.\/)?(?:rust|python|java|go|csharp|php)(?:\/|$)/;

export function checkGate(workflows) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const entry = workflows["js.yml"];
  const js = workflows["javascript.yml"];
  if (!entry || !js) return ["js.yml and javascript.yml are required"];
  if (!entry.on?.pull_request || !entry.on?.push) {
    // YAML null denotes a trigger with no options.
    if (
      !Object.hasOwn(entry.on ?? {}, "pull_request") ||
      !Object.hasOwn(entry.on ?? {}, "push")
    )
      fail("CI must run on every PR and main push");
  }
  for (const event of ["push", "pull_request"]) {
    if (entry.on?.[event]?.paths || entry.on?.[event]?.["paths-ignore"])
      fail(`CI ${event} cannot filter paths`);
  }
  if (
    entry.concurrency?.["cancel-in-progress"] !== false ||
    !entry.concurrency?.group?.includes("github.ref")
  )
    fail("CI must queue each branch without cancelling active runs");
  if (
    entry.jobs?.js?.uses !== "./.github/workflows/javascript.yml" ||
    Object.hasOwn(entry.jobs.js, "if") ||
    Object.hasOwn(entry.jobs.js, "needs")
  )
    fail("JS must run unconditionally from the same commit");
  for (const name of ["format", "lint", "test", "parity"]) {
    if (
      !js.jobs?.[name] ||
      Object.hasOwn(js.jobs[name], "if") ||
      Object.hasOwn(js.jobs[name], "needs")
    )
      fail(`JS ${name} must be unconditional`);
  }
  if (js.jobs?.findChangedJsFiles)
    fail("JS checks cannot have a change detector");
  const release = entry.jobs?.release;
  if (
    release?.uses !== "./.github/workflows/release.yml" ||
    !Array.isArray(release.needs) ||
    JSON.stringify(release.needs?.toSorted()) !==
      JSON.stringify(["js", ...languageNames].toSorted()) ||
    release.if !==
      "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}"
  )
    fail("Publication must wait for all seven native stages on main pushes");
  if (
    !entry.jobs?.release_audit?.needs?.includes("release") ||
    entry.jobs.release_audit.if !==
      "${{ always() && needs.js.result == 'success' }}"
  )
    fail("The final audit must run after publication, including failures");

  function dependsOnJs(document, name, visited = new Set()) {
    if (visited.has(name)) return false;
    visited.add(name);
    const job = document.jobs?.[name];
    if (!job) return false;
    if (job.uses === "./.github/workflows/javascript.yml")
      return !Object.hasOwn(job, "if") && !Object.hasOwn(job, "needs");
    // always()/failure()/cancelled() bypass implicit success(). Only an
    // explicit successful JS result is safe when a caller overrides it.
    if (
      /\b(?:always|failure|cancelled|success)\s*\(/.test(String(job.if)) &&
      String(job.if).trim() !==
        "${{ always() && needs.js.result == 'success' }}"
    )
      return false;
    const needs =
      typeof job.needs === "string" ? [job.needs] : (job.needs ?? []);
    return needs.some((dependency) =>
      dependsOnJs(document, dependency, new Set(visited)),
    );
  }

  const callers = new Map();
  for (const [file, document] of Object.entries(workflows)) {
    if (!document || !document.jobs) {
      fail(`${file}: invalid workflow`);
      continue;
    }
    if (
      Object.hasOwn(document.on ?? {}, "workflow_call") &&
      Object.keys(document.on).join() !== "workflow_call"
    )
      fail(`${file}: a reusable workflow cannot also trigger independently`);
    if (
      ["javascript", ...languageNames].some((name) => file === `${name}.yml`)
    ) {
      if (Object.keys(document.on ?? {}).join() !== "workflow_call")
        fail(`${file}: only workflow_call may start a language workflow`);
    }
    for (const [name, job] of Object.entries(document.jobs)) {
      if (
        ["javascript", ...languageNames].some(
          (language) => file === `${language}.yml`,
        ) &&
        /publish|pushToNuget/i.test(name)
      )
        fail(`${file}/${name}: publishing belongs after all native stages`);
      if (
        job.concurrency?.["cancel-in-progress"] !== undefined &&
        job.concurrency["cancel-in-progress"] !== false &&
        /^(?:javascript|rust|python|java|go|csharp|php|publish-.+)\.yml$/.test(
          file,
        )
      )
        fail(`${file}/${name}: gated jobs cannot cancel runs`);
      if (job.uses) {
        const target = job.uses.match(
          /^\.\/\.github\/workflows\/([^/]+\.yml)$/,
        )?.[1];
        if (!target) {
          fail(
            `${file}/${name}: reusable calls must use a local same-commit workflow`,
          );
          continue;
        }
        if (!workflows[target])
          fail(`${file}/${name}: unknown reusable workflow ${target}`);
        if (!callers.has(target)) callers.set(target, []);
        callers.get(target).push({ file, name, document });
      }
      const body = JSON.stringify(job);
      const commands = (job.steps ?? [])
        .map((step) => step.run ?? "")
        .join("\n");
      const nonJs =
        languageNames.some((language) => file === `${language}.yml`) ||
        languageAction.test(body) ||
        languageRun.test(commands) ||
        nativeDirectory.test(job.defaults?.run?.["working-directory"] ?? "") ||
        (job.steps ?? []).some((step) =>
          nativeDirectory.test(step["working-directory"] ?? ""),
        ) ||
        /CodeQL/.test(body);
      if (
        nonJs &&
        !Object.hasOwn(document.on ?? {}, "workflow_call") &&
        !dependsOnJs(document, name)
      )
        fail(`${file}/${name}: non-JS job bypasses JS`);
      for (const step of job.steps ?? []) {
        if (
          step.uses?.startsWith("actions/checkout@") &&
          step.with?.ref &&
          step.with.ref !== "${{ github.sha }}"
        )
          fail(`${file}/${name}: checkout must keep the gated commit`);
      }
    }
  }

  function checkCallers(file, chain = new Set()) {
    if (chain.has(file)) {
      fail(`${file}: recursive workflow calls`);
      return;
    }
    const parents = callers.get(file) ?? [];
    if (!parents.length) {
      fail(`${file}: reusable workflow has no gated caller`);
      return;
    }
    for (const { file: parent, name, document } of parents) {
      if (dependsOnJs(document, name)) continue;
      if (Object.keys(document.on ?? {}).join() === "workflow_call")
        checkCallers(parent, new Set([...chain, file]));
      else fail(`${parent}/${name}: call to ${file} bypasses successful JS`);
    }
  }
  for (const [file, document] of Object.entries(workflows)) {
    if (
      file !== "javascript.yml" &&
      Object.hasOwn(document.on ?? {}, "workflow_call")
    )
      checkCallers(file);
  }
  return errors;
}

export function readWorkflows(
  directory = new URL("../../.github/workflows/", import.meta.url),
) {
  return Object.fromEntries(
    readdirSync(directory)
      .filter((file) => /\.ya?ml$/.test(file))
      .map((file) => [
        file,
        YAML.parse(readFileSync(new URL(file, directory), "utf8")),
      ]),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = checkGate(readWorkflows());
  for (const error of errors) console.error(`::error::${error}`);
  console.log(
    errors.length
      ? `${errors.length} JS gate violation(s)`
      : "Every non-JS entry point waits for successful same-commit JS.",
  );
  process.exitCode = errors.length ? 1 : 0;
}

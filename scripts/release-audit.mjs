#!/usr/bin/env node
// Audit exact immutable versions, registry availability, and GitHub releases.
// PRs may precede publication. Main/scheduled audits fail on missing delivery.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { declaredVersions } from "./declared-versions.mjs";

export function registryTargets(version) {
  return [
    {
      name: "js",
      registry: "npm",
      urls: [`https://registry.npmjs.org/links-notation/${version.js}`],
      valid: (body) => body.version === version.js,
    },
    {
      name: "python",
      registry: "PyPI",
      urls: [`https://pypi.org/pypi/links-notation/${version.python}/json`],
      valid: (body) => body.info?.version === version.python,
    },
    {
      name: "rust",
      registry: "crates.io",
      urls: [`https://crates.io/api/v1/crates/links-notation/${version.rust}`],
      valid: (body) => body.version?.num === version.rust,
    },
    {
      name: "csharp",
      registry: "NuGet",
      urls: [
        "https://api.nuget.org/v3-flatcontainer/link.foundation.links.notation/index.json",
        `https://api.nuget.org/v3-flatcontainer/link.foundation.links.notation/${version.csharp}/link.foundation.links.notation.${version.csharp}.nupkg`,
      ],
      valid: (body) => body.versions?.includes(version.csharp),
    },
    {
      name: "go",
      registry: "Go proxy",
      urls: [
        `https://proxy.golang.org/github.com/link-foundation/links-notation/go/@v/v${version.go}.info`,
      ],
      valid: (body) => body.Version === `v${version.go}`,
    },
    {
      name: "java",
      registry: "Maven Central",
      urls: [
        `https://repo1.maven.org/maven2/io/github/link-foundation/links-notation/${version.java}/links-notation-${version.java}.pom`,
        "https://repo1.maven.org/maven2/io/github/link-foundation/",
      ],
      text: true,
      valid: (body) =>
        body.includes(`<version>${version.java}</version>`) &&
        body.includes("<artifactId>links-notation</artifactId>"),
    },
    {
      name: "php",
      registry: "Packagist",
      urls: [
        "https://repo.packagist.org/p2/link-foundation/links-notation.json",
      ],
      valid: (body) =>
        body.packages?.["link-foundation/links-notation"]?.some(
          (item) => item.version.replace(/^v/, "") === version.php,
        ),
    },
    {
      // C++ has no central registry: the release's source archive is what
      // CMake's FetchContent downloads, so its presence is the publication.
      name: "cpp",
      registry: "GitHub Releases",
      urls: [
        `https://github.com/link-foundation/links-notation/releases/download/cpp_${version.cpp}/links-notation-cpp-${version.cpp}.tar.gz`,
      ],
    },
  ];
}

export async function audit({
  versions,
  fetcher = fetch,
  expectPublished = true,
  token,
  repository = "link-foundation/links-notation",
  verbose = false,
  log = console.log,
}) {
  const findings = [];
  let failures = 0;
  const headers = { "user-agent": "links-notation-release-audit" };
  const report = (message, error = true) => {
    log(`${error ? "::error::" : "::notice::"}${message}`);
    if (error) failures++;
  };
  for (const target of registryTargets(versions)) {
    const record = {
      language: target.name,
      registry: target.registry,
      version: versions[target.name],
      requests: [],
      published: false,
      release: false,
    };
    findings.push(record);
    try {
      let present = true;
      for (const [index, url] of target.urls.entries()) {
        const response = await fetcher(url, {
          headers,
          signal: AbortSignal.timeout(30000),
        });
        record.requests.push({ url, status: response.status });
        if (verbose) log(`GET ${url} -> ${response.status}`);
        if (response.status === 404) {
          present = false;
          await response.body?.cancel();
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`GET ${url}: HTTP ${response.status}`);
        }
        if (index === 0 && target.valid) {
          const body = target.text
            ? await response.text()
            : await response.json();
          if (!target.valid(body)) present = false;
        } else await response.body?.cancel();
      }
      if (!present) {
        report(
          `${target.name}: ${record.version} is absent from ${target.registry}`,
          expectPublished,
        );
        continue;
      }
      record.published = true;
      const tag =
        target.name === "go"
          ? `go/v${record.version}`
          : `${target.name}_${record.version}`;
      const url = `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`;
      const response = await fetcher(url, {
        headers: {
          ...headers,
          accept: "application/vnd.github+json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(30000),
      });
      record.requests.push({ url, status: response.status });
      if (verbose) log(`GET ${url} -> ${response.status}`);
      await response.body?.cancel();
      if (response.status === 404)
        report(
          `${target.name}: registry version ${record.version} has no GitHub release ${tag}`,
        );
      else if (!response.ok)
        throw new Error(`GitHub release ${tag}: HTTP ${response.status}`);
      else {
        record.release = true;
        log(
          `${target.name}: ${record.version} registry and GitHub release verified`,
        );
      }
    } catch (error) {
      record.error = error.message;
      // An outage is not evidence of either absence or successful publication.
      report(
        `${target.name}: registry/release verification failed: ${error.message}`,
      );
    }
  }
  log(`${findings.length} languages audited; ${failures} delivery failure(s).`);
  return { failures, findings };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await audit({
    versions: Object.fromEntries(
      Object.entries(declaredVersions).map(([name, readVersion]) => [
        name,
        readVersion(),
      ]),
    ),
    expectPublished: process.env.AUDIT_EXPECT_PUBLISHED !== "false",
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repository:
      process.env.GITHUB_REPOSITORY || "link-foundation/links-notation",
    verbose: process.env.CI_VERBOSE === "true",
  });
  if (process.env.AUDIT_REPORT)
    writeFileSync(
      process.env.AUDIT_REPORT,
      JSON.stringify(result, null, 2) + "\n",
    );
  process.exitCode = result.failures ? 1 : 0;
}

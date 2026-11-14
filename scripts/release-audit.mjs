#!/usr/bin/env node
// Audit exact immutable versions, registry availability, and GitHub releases.
// PRs may precede publication. Main/scheduled audits fail on missing delivery.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { declaredVersions } from "./declared-versions.mjs";
import { verifyCentral, verifyMavenSignature } from "./ci/maven-central.mjs";
import {
  packagistVersion,
  checkPackagistSource,
} from "./ci/packagist-status.mjs";

export function registryTargets(version) {
  return [
    {
      name: "js",
      setup:
        "configure npm trusted publishing for js.yml or the NPM_TOKEN secret",
      registry: "npm",
      urls: [`https://registry.npmjs.org/links-notation/${version.js}`],
      valid: (body) => body.version === version.js,
    },
    {
      name: "python",
      setup:
        "configure PyPI trusted publishing for js.yml with PYPI_TRUSTED_PUBLISHING=true, or the PYPI_TOKEN secret",
      registry: "PyPI",
      urls: [`https://pypi.org/pypi/links-notation/${version.python}/json`],
      valid: (body) => body.info?.version === version.python,
    },
    {
      name: "rust",
      setup:
        "configure crates.io trusted publishing for js.yml with CRATES_IO_TRUSTED_PUBLISHING=true, or the CARGO_TOKEN secret",
      registry: "crates.io",
      urls: [`https://crates.io/api/v1/crates/links-notation/${version.rust}`],
      valid: (body) => body.version?.num === version.rust,
    },
    {
      name: "csharp",
      setup:
        "configure NuGet.org trusted publishing for publish-csharp.yml with the NUGET_USER variable, or renew the NUGET_API_KEY secret (NuGet API keys expire)",
      registry: "NuGet",
      urls: [
        "https://api.nuget.org/v3-flatcontainer/links-notation/index.json",
        `https://api.nuget.org/v3-flatcontainer/links-notation/${version.csharp}/links-notation.${version.csharp}.nupkg`,
      ],
      valid: (body) => body.versions?.includes(version.csharp),
    },
    {
      name: "go",
      setup: `check the publish-go log for the go/v${version.go} tag push`,
      registry: "Go proxy",
      urls: [
        `https://proxy.golang.org/github.com/link-foundation/links-notation/go/@v/v${version.go}.info`,
      ],
      valid: (body) => body.Version === `v${version.go}`,
    },
    {
      name: "java",
      artifact: "links-notation",
      group: "io.github.link-foundation",
      setup:
        "configure the CENTRAL_USERNAME, CENTRAL_TOKEN, GPG_PRIVATE_KEY and GPG_PASSPHRASE secrets for the verified io.github.link-foundation namespace",
      registry: "Maven Central",
      urls: [
        `https://repo1.maven.org/maven2/io/github/link-foundation/links-notation/${version.java}/links-notation-${version.java}.pom`,
      ],
      text: true,
      valid: (body) =>
        body.includes(`<version>${version.java}</version>`) &&
        body.includes("<artifactId>links-notation</artifactId>"),
    },
    {
      name: "php",
      setup:
        "submit the repository once at https://packagist.org/packages/submit and configure the PACKAGIST_USERNAME and PACKAGIST_TOKEN secrets",
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
      setup: `check the publish-cpp log for the cpp_${version.cpp} release upload`,
      registry: "GitHub Releases",
      urls: [
        `https://github.com/link-foundation/links-notation/releases/download/cpp_${version.cpp}/links-notation-cpp-${version.cpp}.tar.gz`,
      ],
    },
    {
      // SwiftPM resolves a package from a plain semantic-version tag of its Git
      // repository, so the tag (with Package.swift at the root) is the
      // publication, and it is also the release's tag.
      name: "swift",
      tag: version.swift,
      setup: `check the publish-swift log for the ${version.swift} tag`,
      registry: "GitHub tags (SwiftPM)",
      urls: [
        `https://raw.githubusercontent.com/link-foundation/links-notation/${version.swift}/Package.swift`,
      ],
      text: true,
      valid: (body) => body.includes('name: "links-notation"'),
    },
    {
      // Verify every target, file, strong hash and detached signature behind
      // the root metadata. A root POM alone is not a multiplatform release.
      name: "kotlin",
      artifact: "links-notation",
      group: "io.github.link-foundation.kotlin",
      setup:
        "configure the CENTRAL_USERNAME, CENTRAL_TOKEN, GPG_PRIVATE_KEY and GPG_PASSPHRASE secrets for the verified io.github.link-foundation namespace",
      registry: "Maven Central",
      urls: [
        `https://repo1.maven.org/maven2/io/github/link-foundation/kotlin/links-notation/${version.kotlin}/links-notation-${version.kotlin}.pom`,
      ],
      text: true,
      valid: (body) =>
        body.includes(`<version>${version.kotlin}</version>`) &&
        body.includes("<artifactId>links-notation</artifactId>"),
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
  verifySignature = verifyMavenSignature,
  // The result of the CI run's release job ("success", "failure", "cancelled"
  // or "skipped"), or "" when the caller does not know it. An aggregate
  // failure can mean partial publication; only skipped means no publisher ran.
  releaseResult = "",
  pause = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  // Registry connection resets are transient. HTTP failures and invalid
  // metadata still fail immediately; an exhausted transport retry also fails.
  const transport = fetcher;
  fetcher = async (url, options) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await transport(url, options);
      } catch (error) {
        const code = error.cause?.code;
        if (
          attempt === 3 ||
          ![
            "ECONNRESET",
            "ETIMEDOUT",
            "EAI_AGAIN",
            "UND_ERR_CONNECT_TIMEOUT",
            "UND_ERR_SOCKET",
          ].includes(code)
        )
          throw error;
        if (verbose) log(`GET ${url}: ${code}; retry ${attempt}/2`);
        await pause(attempt * 1000);
      }
    }
  };
  const findings = [];
  const releaseSkipped = expectPublished && releaseResult === "skipped";
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
      if (target.artifact) {
        record.maven = await verifyCentral({
          group: target.group,
          artifact: target.artifact,
          version: record.version,
          fetcher,
          verifySignature,
          requests: record.requests,
          verbose,
          log,
        });
        present = record.maven.present;
      }
      for (const [index, url] of (target.artifact
        ? []
        : target.urls
      ).entries()) {
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
          if (target.name === "php" && present) {
            const item = packagistVersion(
              body,
              "link-foundation/links-notation",
              record.version,
            );
            checkPackagistSource(item, repository);
            record.source = item.source.reference;
          }
        } else await response.body?.cancel();
      }
      if (!present) {
        // On main the version must exist, so the error names the fix.
        const absent = `${target.name}: ${record.version} is absent from ${target.registry}`;
        report(
          !expectPublished
            ? absent
            : releaseSkipped
              ? `${absent}; the release job did not run to completion (skipped). Check the event and validation stages. Fix or re-run the failed jobs of this CI run (docs/releases.md).`
              : `${absent}. To publish it, ${target.setup}, then re-run the main CI run (docs/releases.md).${releaseResult === "failure" || releaseResult === "cancelled" ? ` The release result is ${releaseResult}; inspect this provider's job. Other providers may have delivered successfully.` : ""}`,
          expectPublished,
        );
        continue;
      }
      record.published = true;
      if (target.name === "php") {
        let tagUrl = `https://api.github.com/repos/${repository}/git/ref/tags/${encodeURIComponent(record.version)}`;
        let object;
        for (let depth = 0; depth < 5; depth++) {
          const response = await fetcher(tagUrl, {
            headers: {
              ...headers,
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            signal: AbortSignal.timeout(30000),
          });
          record.requests.push({ url: tagUrl, status: response.status });
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`Packagist version tag: HTTP ${response.status}`);
          }
          object = (await response.json()).object;
          if (object?.type === "commit") break;
          if (object?.type !== "tag" || !/^[a-f0-9]{40}$/.test(object.sha))
            throw new Error("Invalid Packagist version tag");
          tagUrl = `https://api.github.com/repos/${repository}/git/tags/${object.sha}`;
        }
        if (object?.type !== "commit" || object.sha !== record.source)
          throw new Error(
            "Packagist source differs from the immutable Composer version tag",
          );
      }
      const tag =
        target.tag ??
        (target.name === "go"
          ? `go/v${record.version}`
          : `${target.name}_${record.version}`);
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
  log(
    `${findings.filter((item) => item.published && item.release).length} package/release pairs verified; ${findings.filter((item) => item.error).length} verification error(s).`,
  );
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
    releaseResult: process.env.RELEASE_RESULT ?? "",
  });
  if (process.env.AUDIT_REPORT)
    writeFileSync(
      process.env.AUDIT_REPORT,
      JSON.stringify(result, null, 2) + "\n",
    );
  process.exitCode = result.failures ? 1 : 0;
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { audit } from "../../scripts/release-audit.mjs";

const versions = Object.fromEntries(
  ["js", "rust", "python", "java", "go", "csharp", "php", "cpp"].map((name) => [
    name,
    "1.2.3",
  ]),
);
function mockFetch(change = () => null) {
  return async (url) => {
    const changed = change(url);
    if (changed) return changed;
    let body = {};
    if (url.includes("registry.npmjs.org")) body = { version: "1.2.3" };
    if (url.includes("pypi.org")) body = { info: { version: "1.2.3" } };
    if (url.includes("crates.io")) body = { version: { num: "1.2.3" } };
    if (url.endsWith("index.json")) body = { versions: ["1.2.3", "9.0.0"] };
    if (url.includes("proxy.golang.org")) body = { Version: "v1.2.3" };
    if (url.includes("packagist.org"))
      body = {
        packages: { "link-foundation/links-notation": [{ version: "v1.2.3" }] },
      };
    if (url.endsWith(".pom"))
      return new Response(
        "<artifactId>links-notation</artifactId><version>1.2.3</version>",
      );
    return new Response(JSON.stringify(body));
  };
}
const run = (fetcher, expectPublished = true) =>
  audit({ versions, fetcher, expectPublished, log: () => {} });
test("every exact version and release is verified", async () =>
  assert.equal((await run(mockFetch())).failures, 0));
test("missing Central namespace fails main even when the POM exists", async () =>
  assert.equal(
    (
      await run(
        mockFetch((url) =>
          url.endsWith("/io/github/link-foundation/")
            ? new Response("", { status: 404 })
            : null,
        ),
      )
    ).failures,
    1,
  ));
test("an unpublished PR version is expected", async () =>
  assert.equal(
    (
      await run(
        mockFetch(() => new Response("", { status: 404 })),
        false,
      )
    ).failures,
    0,
  ));
test("a missing release for an existing package fails even on PRs", async () =>
  assert.equal(
    (
      await run(
        mockFetch((url) =>
          url.includes("api.github.com")
            ? new Response("", { status: 404 })
            : null,
        ),
        false,
      )
    ).failures,
    8,
  ));
test("a missing C++ source archive fails main", async () =>
  assert.equal(
    (
      await run(
        mockFetch((url) =>
          url.endsWith("/cpp_1.2.3/links-notation-cpp-1.2.3.tar.gz")
            ? new Response("", { status: 404 })
            : null,
        ),
      )
    ).failures,
    1,
  ));
test("registry outages fail instead of being reported as absence", async () =>
  assert.equal(
    (
      await run(
        mockFetch((url) =>
          url.includes("repo1.maven.org")
            ? new Response("", { status: 503 })
            : null,
        ),
      )
    ).failures,
    1,
  ));
test("latest versions cannot stand in for the declared version", async () =>
  assert.equal(
    (
      await run(
        mockFetch((url) =>
          url.includes("registry.npmjs.org")
            ? new Response('{"version":"9.0.0"}')
            : null,
        ),
      )
    ).failures,
    1,
  ));
test("missing signing credentials fail without leaking values", () => {
  const result = spawnSync("bash", ["scripts/ci/require-java-credentials.sh"], {
    env: { PATH: process.env.PATH, CENTRAL_TOKEN: "never-print-this-token" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /CENTRAL_USERNAME/);
  assert.doesNotMatch(result.stdout, /never-print-this-token/);
});
test("a version missing on main says what a maintainer must do", async () => {
  const lines = [];
  await audit({
    versions,
    fetcher: mockFetch((url) =>
      url.includes("repo1.maven.org") || url.includes("packagist.org")
        ? new Response("", { status: 404 })
        : null,
    ),
    log: (line) => lines.push(line),
  });
  const errors = lines.filter((line) => line.startsWith("::error::"));
  assert.equal(errors.length, 2);
  assert.match(
    errors[0],
    /^::error::java: 1\.2\.3 is absent from Maven Central\. /,
  );
  assert.match(errors[0], /CENTRAL_USERNAME, CENTRAL_TOKEN, GPG_PRIVATE_KEY/);
  assert.match(errors[1], /https:\/\/packagist\.org\/packages\/submit/);
  assert.match(errors[1], /PACKAGIST_USERNAME and PACKAGIST_TOKEN/);
  for (const error of errors)
    assert.match(error, /re-run the main CI run \(docs\/releases\.md\)\.$/);
});

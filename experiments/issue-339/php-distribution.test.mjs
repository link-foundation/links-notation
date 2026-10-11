import assert from "node:assert/strict";
import test from "node:test";
import { distributionDescriptor } from "../../scripts/ci/php-distribution.mjs";
import { ensureVersionTag } from "../../scripts/ci/ensure-php-version-tag.mjs";
import { packagistStatus } from "../../scripts/ci/packagist-status.mjs";

const sha = "a".repeat(40);
const options = { repository: "owner/repo", version: "1.2.3", sha };
test("the distribution descriptor prefixes runtime paths and omits development metadata", () => {
  const native = {
    name: "owner/package",
    version: "1.2.3",
    require: { php: ">=8.4" },
    "require-dev": { test: "*" },
    "autoload-dev": {},
    scripts: {},
    config: {},
    autoload: {
      "psr-4": { "Example\\": ["src/", "lib/"] },
      files: ["bootstrap.php"],
    },
  };
  assert.deepEqual(distributionDescriptor(native), {
    name: "owner/package",
    require: { php: ">=8.4" },
    autoload: {
      "psr-4": { "Example\\": ["php/src/", "php/lib/"] },
      files: ["php/bootstrap.php"],
    },
  });
  assert.equal(native.autoload.files[0], "bootstrap.php");
});
test("an absent Composer version tag is created at the gated SHA", async () => {
  const calls = [];
  const api = async (...args) => {
    calls.push(args);
    return args[1] ? {} : [];
  };
  assert.equal(await ensureVersionTag({ ...options, api }), "created");
  assert.deepEqual(calls, [
    ["repos/owner/repo/git/matching-refs/tags/1.2.3"],
    ["repos/owner/repo/git/refs", { ref: "refs/tags/1.2.3", sha }],
  ]);
});
test("matching tag prefixes do not stand in for the exact version", async () => {
  let created = false;
  const api = async (_path, body) => {
    if (body) {
      created = true;
      return {};
    }
    return [{ ref: "refs/tags/1.2.30", object: { type: "commit", sha } }];
  };
  await ensureVersionTag({ ...options, api });
  assert.equal(created, true);
});
test("an exact existing version tag is reused without mutation", async () => {
  await ensureVersionTag({
    ...options,
    api: async (_path, body) => {
      assert.equal(body, undefined);
      return [{ ref: "refs/tags/1.2.3", object: { type: "commit", sha } }];
    },
  });
});
test("annotated version tags are resolved to their commit", async () => {
  const api = async (path) =>
    path.includes("matching-refs")
      ? [
          {
            ref: "refs/tags/1.2.3",
            object: { type: "tag", sha: "b".repeat(40) },
          },
        ]
      : { object: { type: "commit", sha } };
  assert.equal(await ensureVersionTag({ ...options, api }), "existing");
});
test("a version tag at another commit fails without retagging", async () => {
  await assert.rejects(
    ensureVersionTag({
      ...options,
      api: async (_path, body) => {
        assert.equal(body, undefined);
        return [
          {
            ref: "refs/tags/1.2.3",
            object: { type: "commit", sha: "b".repeat(40) },
          },
        ];
      },
    }),
    /another commit/,
  );
});
test("invalid versions and API errors cannot create tags", async () => {
  await assert.rejects(
    ensureVersionTag({
      ...options,
      version: "php_1.2.3",
      api: async () => assert.fail(),
    }),
    /version/,
  );
  await assert.rejects(
    ensureVersionTag({
      ...options,
      api: async () => {
        throw new Error("HTTP 503");
      },
    }),
    /HTTP 503/,
  );
});
const packageName = "link-foundation/links-notation";
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });
test("registered packages with only dev versions can publish their first stable tag", async () => {
  const result = await packagistStatus(packageName, "1.2.3", async (url) =>
    url.includes("/p2/")
      ? response({}, 404)
      : response({ package: { name: packageName } }),
  );
  assert.deepEqual(result, { packageKnown: true, shouldPublish: true });
});
test("an unregistered package fails preflight and an exact v-prefixed version is reusable", async () => {
  assert.deepEqual(
    await packagistStatus(packageName, "1.2.3", async () => response({}, 404)),
    { packageKnown: false, shouldPublish: true },
  );
  assert.deepEqual(
    await packagistStatus(packageName, "1.2.3", async () =>
      response({ packages: { [packageName]: [{ version: "v1.2.3" }] } }),
    ),
    { packageKnown: true, shouldPublish: false },
  );
});
test("registry outages and wrong-version metadata cannot become successful skips", async () => {
  await assert.rejects(
    packagistStatus(packageName, "1.2.3", async () => response({}, 503)),
    /503/,
  );
  assert.deepEqual(
    await packagistStatus(packageName, "1.2.3", async () =>
      response({ packages: { [packageName]: [{ version: "1.2.30" }] } }),
    ),
    { packageKnown: true, shouldPublish: true },
  );
});

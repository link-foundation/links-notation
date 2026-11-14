import assert from "node:assert/strict";
import test from "node:test";

for (const issue of ["330/pulls/331", "377/pulls/378"]) {
  const module = await import(
    `../../dev/log/issues/${issue}/templates/js/scripts/setup-npm.mjs`
  );
  test(`${issue}: npm 12 uses its actual supported Node ranges`, () => {
    for (const version of ["22.22.2", "24.15.0", "26.13.1"]) {
      assert.equal(module.isSupportedNodeVersion(version), true, version);
    }
    for (const version of ["22.22.1", "23.0.0", "24.14.0", "25.0.0"]) {
      assert.equal(module.isSupportedNodeVersion(version), false, version);
    }
  });
  test(`${issue}: npm selection stays at the reviewed current release`, () => {
    const versions = Object.fromEntries(
      ["11.15.0", "12.2.2", "12.3.0"].map((version) => [
        version,
        {
          dist: {
            tarball: `https://registry.npmjs.org/npm/-/npm-${version}.tgz`,
          },
        },
      ]),
    );
    assert.equal(
      module.selectLatestSupportedNpmRelease({ versions }).version,
      "12.2.2",
    );
    assert.ok(module.compareVersions("12.2.2-rc.10", "12.2.2-rc.2") > 0);
  });
}

for (const issue of ["330/pulls/331", "377/pulls/378"]) {
  const loader = await import(
    `../../dev/log/issues/${issue}/templates/js/scripts/use-module.mjs`
  );
  test(`${issue}: release helpers load only installed dependencies`, async () => {
    assert.equal(typeof loader.loadInstalledModule, "function");
    const shell = await loader.loadCommandStream();
    assert.equal(typeof shell.$, "function");
    const argumentsModule = await loader.loadLinoArguments();
    assert.equal(typeof argumentsModule.makeConfig, "function");
    assert.throws(() => loader.loadInstalledModule("unreviewed-package"));
  });
}

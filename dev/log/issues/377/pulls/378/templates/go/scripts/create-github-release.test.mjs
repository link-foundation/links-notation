import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  createRelease,
  extractReleaseNotes,
} from "./create-github-release.mjs";

describe("creating a recovered GitHub release", () => {
  test("retains the complete changelog section including multiple lines", () => {
    const changelog = readFileSync("CHANGELOG.md", "utf8");
    assert.equal(
      extractReleaseNotes("0.1.0"),
      changelog.split("## [0.1.0] - 2024-12-27\n\n")[1].trim()
    );
    assert.equal(extractReleaseNotes("9.9.9"), null);
    assert.equal(
      extractReleaseNotes(
        "1.2.3",
        "# Changelog\n\n## [1.2.4] - today\n\nNewer\n\n## [1.2.3] - yesterday\n\nFirst change\n\n### Fixed\n- Second change\n\n## [1.2.2] - earlier\n\nOlder\n"
      ),
      "First change\n\n### Fixed\n- Second change"
    );
  });

  test("requires an existing tag and passes release notes as data", () => {
    const notes = "First change\n\n$(touch injected)\nSecond change";
    const calls = [];
    createRelease("1.2.3", notes, "owner/repo", (...args) => calls.push(args));
    assert.deepEqual(calls[0][0], "gh");
    assert.deepEqual(calls[0][1], [
      "release",
      "create",
      "v1.2.3",
      "--verify-tag",
      "--title",
      "Release v1.2.3",
      "--notes-file",
      "-",
      "--repo",
      "owner/repo",
    ]);
    assert.equal(calls[0][2].input, notes);
  });

  test("accepts already-created releases but surfaces other failures", () => {
    const fail = (stderr) => () => {
      throw Object.assign(new Error("gh failed"), { stderr });
    };
    assert.doesNotThrow(() =>
      createRelease("1.2.3", null, null, fail("release already exists"))
    );
    assert.throws(
      () => createRelease("1.2.3", null, null, fail("Bad credentials")),
      /gh failed/
    );
    assert.throws(
      () => createRelease('1.2.3"; echo injected', null, null),
      /Invalid release version/
    );
  });
});

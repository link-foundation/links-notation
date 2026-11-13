import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSearch } from "../../dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/glob.mjs";
import { collectArtifactFiles } from "../../dev/log/issues/377/pulls/378/templates/js/scripts/artifact-files.mjs";
import { findFiles } from "../../dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/files.mjs";

test(
  "artifact globbing keeps nested files, exclusions, roots and hidden-file policy",
  { timeout: 10000 },
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), "issue-405-artifacts-"));
    try {
      await mkdir(path.join(root, "nested"));
      await writeFile(path.join(root, "nested", "one.txt"), "one");
      await writeFile(path.join(root, "nested", "two.txt"), "two");
      await writeFile(path.join(root, ".hidden"), "secret");
      await symlink(
        path.join(root, "nested", "one.txt"),
        path.join(root, "link"),
      );
      await symlink(path.join(root, "missing"), path.join(root, "broken"));
      const found = await findFiles(`${root}\n!${root}/nested/two.txt`);
      assert.deepEqual(found.files, [path.join(root, "nested", "one.txt")]);
      assert.equal(found.root, root);
      const input = `${root}\n!${root}/nested/two.txt`;
      const followed = await collectArtifactFiles(
        await createSearch(input, { follow: true }),
        input,
      );
      assert.deepEqual(followed.files.sort(), [
        path.join(root, "link"),
        path.join(root, "nested", "one.txt"),
      ]);
      assert.equal(followed.root, root);
      const only = await findFiles(path.join(root, "nested", "one.txt"));
      assert.equal(only.root, path.join(root, "nested"));
      await assert.rejects(
        findFiles(path.join(root, "missing*")),
        /No files found/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

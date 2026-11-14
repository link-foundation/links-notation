import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { createSearch } from "../../dev/log/issues/377/pulls/378/templates/js/.github/actions/artifact-transport/glob.mjs";
import { collectArtifactFiles } from "../../dev/log/issues/377/pulls/378/templates/js/scripts/artifact-files.mjs";
import { findFiles } from "../../dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/files.mjs";
import { createSearch as createPythonSearch } from "../../dev/log/issues/377/pulls/378/templates/python/.github/actions/artifact/glob.mjs";

for (const [name, search] of [
  ["JavaScript", createSearch],
  ["Python action", createPythonSearch],
]) {
  test(
    `${name} preserves directory exclusions and ordered patterns`,
    { timeout: 10000 },
    async () => {
      const root = await mkdtemp(path.join(tmpdir(), "issue-405-patterns-"));
      try {
        for (const directory of ["keep", "skip"]) {
          await mkdir(path.join(root, directory));
          await writeFile(path.join(root, directory, "one.txt"), "one");
          await writeFile(path.join(root, directory, "two.txt"), "two");
        }
        const kept = [
          path.join(root, "keep", "one.txt"),
          path.join(root, "keep", "two.txt"),
        ];
        assert.deepEqual(
          (await (await search(`${root}\n!${root}/skip`)).glob()).sort(),
          kept,
        );
        // Wildcard directory includes recurse; exclusions omit their subtree.
        assert.deepEqual(
          (
            await (await search(`# comment\n${root}/*\n!${root}/skip`)).glob()
          ).sort(),
          kept,
        );
        // A later include can restore a single excluded file.
        assert.deepEqual(
          (
            await (
              await search(`${root}\n!${root}/skip\n${root}/skip/one.txt`)
            ).glob()
          ).sort(),
          [...kept, path.join(root, "skip", "one.txt")],
        );
        // Negative patterns only affect earlier includes; two ! signs include.
        assert.deepEqual(
          await (await search(`!${root}\n!!${root}/skip/one.txt`)).glob(),
          [path.join(root, "skip", "one.txt")],
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  test(
    `${name} expands the current user's tilde`,
    { timeout: 10000 },
    async () => {
      const root = await mkdtemp(path.join(homedir(), "issue-405-tilde-"));
      try {
        await writeFile(path.join(root, "one.txt"), "one");
        assert.deepEqual(
          await (await search(`~/${path.basename(root)}`)).glob(),
          [path.join(root, "one.txt")],
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
}

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

// glob 14 supports current minimatch without @actions/glob's removed matchOne API.
import { glob } from "glob";
import globParent from "glob-parent";
import { stat } from "node:fs/promises";
import path from "node:path";

export async function createSearch(input, { follow = false } = {}) {
  const patterns = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const include = patterns.filter((pattern) => !pattern.startsWith("!"));
  const ignore = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1));
  const roots = [];
  const expanded = await Promise.all(
    include.map(async (pattern) => {
      const info = await stat(pattern).catch((error) => {
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      });
      roots.push(
        path.resolve(info?.isDirectory() ? pattern : globParent(pattern)),
      );
      return info?.isDirectory()
        ? `${pattern.replace(/\\/g, "/")}/**/*`
        : pattern;
    }),
  );
  return {
    glob: () =>
      glob(expanded, {
        absolute: true,
        nodir: true,
        follow,
        dot: false,
        ignore: [...ignore, "**/.*", "**/.*/**"],
      }),
    getSearchPaths: () => roots,
  };
}

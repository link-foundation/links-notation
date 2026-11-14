// Use glob's public API, preserving the action's ordered pattern contract.
import { glob } from 'glob';
import globParent from 'glob-parent';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const descendants = (pattern) => `${pattern.replace(/\/+$/, '')}/**/*`;

export async function createSearch(input, { follow = false } = {}) {
  const windows = process.platform === 'win32';
  const patterns = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const prefix = line.match(/^!*/)[0];
      const pattern = line.slice(prefix.length);
      return {
        exclude: prefix.length % 2 === 1,
        pattern: (windows ? pattern.replace(/\\/g, '/') : pattern).replace(
          /^~(?=$|\/)/,
          () => (windows ? homedir().replace(/\\/g, '/') : homedir())
        ),
      };
    });
  const roots = await Promise.all(
    patterns
      .filter(({ exclude }) => !exclude)
      .map(async ({ pattern }) => {
        const info = await stat(pattern).catch((error) => {
          if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
            throw error;
          }
        });
        return path.resolve(
          info?.isDirectory() ? pattern : globParent(pattern)
        );
      })
  );
  return {
    async glob() {
      const files = new Set();
      for (const [index, { pattern, exclude }] of patterns.entries()) {
        if (exclude) {
          continue;
        }
        // Later includes can restore a path excluded from an earlier include.
        const ignore = patterns
          .slice(index + 1)
          .filter(({ exclude }) => exclude)
          .flatMap(({ pattern }) => [pattern, descendants(pattern)]);
        for (const file of await glob([pattern, descendants(pattern)], {
          absolute: true,
          nodir: true,
          follow,
          dot: false,
          nobrace: true,
          noext: true,
          nocase: windows,
          windowsPathsNoEscape: windows,
          ignore: [...ignore, '**/.*', '**/.*/**'],
        })) {
          files.add(file);
        }
      }
      return [...files];
    },
    getSearchPaths: () => roots,
  };
}

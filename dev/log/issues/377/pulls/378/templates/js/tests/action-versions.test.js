import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'test-anywhere';

function yamlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') {
      return [];
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return yamlFiles(path);
    }
    return /\.ya?ml$/.test(entry.name) ? [path] : [];
  });
}

describe('action versions', () => {
  it('use one ref per action across every workflow and composite action', () => {
    // A bump that misses some files leaves jobs on different majors.
    const refs = new Map();
    // Immutable revisions used by the reusable prerequisite and its caller.
    const pins = {
      be39fa834029ff78f1a44aa3bb0819b8fc2bd8fd: 'v4.0.4',
      '0c5077e51419868618aeaa5fe8019c62421857d6': 'v2.2.0',
      '22d081ff2d3a40755e97629de92e3bcbfa7cf2ed': 'v2.0.5',
      '3ffccacd46053766916f087ce41d627c0b8cf2d1': 'v8.1.3',
      '3d3c42e5aac5ba805825da76410c181273ba90b1': 'v7.0.1',
      '949feb2413d6458794dcd2491c4babbbce0c15c1': 'v7.1.0',
    };
    for (const file of yamlFiles('.github')) {
      const text = readFileSync(file, 'utf8');
      for (const [, action, ref] of text.matchAll(
        /uses: ([\w.-]+\/[\w./-]+)@([\w.-]+)/g
      )) {
        refs.set(
          action,
          new Set([...(refs.get(action) ?? []), pins[ref] ?? ref])
        );
      }
    }

    expect(refs.get('actions/checkout')).toEqual(new Set(['v7.0.1']));
    for (const [action, versions] of refs) {
      expect(`${action} ${[...versions].join(', ')}`).toBe(
        `${action} ${[...versions][0]}`
      );
    }
  });
});

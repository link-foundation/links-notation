import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { actionReferences, isShaPinned, workflowFiles } from './action-pins.mjs';

describe('GitHub Action pins', () => {
  const references = workflowFiles().flatMap((file) =>
    actionReferences(readFileSync(file, 'utf-8')).map((ref) => ({ ...ref, file })),
  );

  test('finds the workflow references', () => {
    expect(references.length).toBeGreaterThan(40);
  });

  test('every remote action is pinned to a commit SHA with a version comment', () => {
    const loose = references.filter(
      (ref) => !/^[0-9a-f]{40}$/.test(ref.ref) || !ref.comment,
    );
    expect(loose.map((ref) => `${ref.file}: ${ref.action}@${ref.ref}`)).toEqual([]);
  });

  test('each action resolves to one SHA across all workflows', () => {
    /** @type {Map<string, Set<string>>} */
    const shas = new Map();
    for (const ref of references) {
      const repo = ref.action.split('/').slice(0, 2).join('/');
      shas.set(repo, (shas.get(repo) ?? new Set()).add(ref.ref));
    }
    const drift = [...shas].filter(([, set]) => set.size > 1).map(([repo]) => repo);
    expect(drift).toEqual([]);
  });

  test('isShaPinned rejects tags and missing comments', () => {
    const sha = 'a'.repeat(40);
    expect(isShaPinned(`- uses: o/r@${sha} # v1`, 'o/r')).toBe(true);
    expect(isShaPinned(`- uses: o/r@v1`, 'o/r')).toBe(false);
    expect(isShaPinned(`- uses: o/r@${sha}`, 'o/r')).toBe(false);
    expect(isShaPinned(`- uses: x/y@${sha} # v1`, 'o/r')).toBe(false);
  });
});

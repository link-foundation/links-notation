import { readdirSync } from 'node:fs';

const WORKFLOW_FILES = [
  ...readdirSync('.github/workflows')
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => `.github/workflows/${name}`),
  '.github/actions/csharp-layout/action.yml',
];

const USES = /^\s*-?\s*uses:\s*([\w.-]+\/[\w./-]+)@(\S+)(?:\s+#\s*(\S+))?/gm;

/**
 * Every `owner/repo@ref` reference in the given workflow text.
 * @param {string} text
 * @returns {{ action: string, ref: string, comment: string | undefined }[]}
 */
export function actionReferences(text) {
  return [...text.matchAll(USES)].map(([, action, ref, comment]) => ({
    action,
    ref,
    comment,
  }));
}

/** Workflow and composite action files that may contain `uses:` lines. */
export function workflowFiles() {
  return WORKFLOW_FILES;
}

/**
 * Asserts-friendly predicate: is `action` referenced in `text` and is every
 * reference an immutable 40-hex commit SHA with a version comment?
 * Dependabot keeps the SHA current; tests must not duplicate it.
 * @param {string} text
 * @param {string} action
 */
export function isShaPinned(text, action) {
  const refs = actionReferences(text).filter((ref) => ref.action === action);
  return (
    refs.length > 0 &&
    refs.every((ref) => /^[0-9a-f]{40}$/.test(ref.ref) && Boolean(ref.comment))
  );
}

import { spawnSync } from 'node:child_process';
/** @type {import('./process-types.js').Spawn} */
const runProcess = spawnSync;

/** Push only this release's branch/tag together; never leave a partial release. */
export function pushRelease({
  tag,
  tagMessage,
  branch = 'main',
  spawn = runProcess,
  log = console.log,
  attempts = 3,
}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5)
    throw Error('Invalid push attempt limit');
  const run = (args) => {
    const result = spawn('git', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    if (output) log(output);
    return { ...result, output };
  };
  const requireSuccess = (args) => {
    const result = run(args);
    if (result.error || result.status !== 0)
      throw Error(`git ${args[0]} failed: ${result.output || result.error?.message}`);
  };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = run([
      'push',
      '--atomic',
      'origin',
      `HEAD:refs/heads/${branch}`,
      `refs/tags/${tag}:refs/tags/${tag}`,
    ]);
    if (!result.error && result.status === 0) return;
    if (/GH006|GH013|protected branch|repository rule/i.test(result.output))
      throw Error(
        `Protected write rejected; configure the release identity's exact repository rule permissions. ${result.output}`,
      );
    if (result.error || !/non-fast-forward|\(fetch first\)/i.test(result.output))
      throw Error(`Release push failed: ${result.output || result.error?.message}`);
    if (attempt === attempts)
      throw Error(
        `Non-fast-forward release push exhausted ${attempts} attempts: ${result.output}`,
      );
    log(
      `Main advanced concurrently; fetching/rebasing before attempt ${attempt + 1}/${attempts}.`,
    );
    requireSuccess([
      'fetch',
      'origin',
      `refs/heads/${branch}:refs/remotes/origin/${branch}`,
    ]);
    requireSuccess(['rebase', `refs/remotes/origin/${branch}`]);
    // Atomic rejection guarantees this tag was not published by our failed push.
    // Recreate only our local annotated tag at the rebased commit.
    requireSuccess(['tag', '-d', tag]);
    requireSuccess(['tag', '-a', tag, '-m', tagMessage]);
  }
}

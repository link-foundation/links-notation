# lint-staged/lint-staged v17.6.0

Source: https://github.com/lint-staged/lint-staged/releases/tag/v17.6.0

### Minor Changes

- [#1850](https://github.com/lint-staged/lint-staged/pull/1850) [`938d3f4`](https://github.com/lint-staged/lint-staged/commit/938d3f43d07cbd74f08052dfb8a7380ce8868180) - Task functions like `{ title, task }` can now use a logger function `log()` to emit output while the task runs. By default, the output will only be visible if the task fails, unless the `--verbose` option was used. Additionally, when the task rejects, the error will be shown in the output.

  ```js
  import { defineConfig } from 'lint-staged/config'

  export default defineConfig({
    '*': {
      title: 'Fail if PDF files are committed',
      task: async (filepaths, { log }) => {
        const pdfFiles = filepaths.filter((f) => f.toLowerCase().endsWith('.pdf'))
        if (pdfFiles.length > 0) {
          log('PDF files should not be committed: %s', pdfFiles)
          throw new Error('Failed')
        }
      },
    },
  })
  ```

- [#1854](https://github.com/lint-staged/lint-staged/pull/1854) [`30562bc`](https://github.com/lint-staged/lint-staged/commit/30562bcbc5267bdb733c257c79c0a65c34465ba3) - _lint-staged_ now stages changes to **all tracked files modified by tasks**, including files that weren’t originally staged or didn’t match the configured globs. This can happen when your task has side-effects, or it's a function that ignores the staged files like `() => "prettier --write ."`.

  If you have unstaged changes in a file and the task also edits that file, your unstaged changes will be staged too. Use `--hide-unstaged` to hide your changes while tasks run.

### Patch Changes

- [#1860](https://github.com/lint-staged/lint-staged/pull/1860) [`4296532`](https://github.com/lint-staged/lint-staged/commit/4296532155fb893ab8f754a47f3518f691fd4d98) - The assignment of staged files to _lint-staged_ configuration files (when using multiple, for example in a monorepo) has been rewritten to be more efficient. As a reminder, each staged file is assigned to exactly one configuration (the closest one), even if that config doesn't match the file in its globs.

- [#1861](https://github.com/lint-staged/lint-staged/pull/1861) [`c45f28a`](https://github.com/lint-staged/lint-staged/commit/c45f28af47a540730de2bf22fddedeb8fac5952a) - Fix running parallel tasks for a single glob, when tasks are created by a function. Nesting one level of arrays inside an array of tasks will result in the inner tasks running in parallel. This behavior should now be consistent when creating tasks using functions. In the following example `eslint` and `prettier` will run in parallel (for all files, when any JS files are staged):

  ```js
  import { defineConfig } from 'lint-staged/config'

  export default defineConfig({
    '*.js': () => [['eslint --max-warnings=0 .', 'prettier --list-different .']],
  })
  ```

- [#1859](https://github.com/lint-staged/lint-staged/pull/1859) [`f0ea69d`](https://github.com/lint-staged/lint-staged/commit/f0ea69dc67399e504a08db67594f697d4c24df6d) - Various performance improvements from skipping redundant internal Git calls.

- [#1856](https://github.com/lint-staged/lint-staged/pull/1856) [`69d7d17`](https://github.com/lint-staged/lint-staged/commit/69d7d17ca6d3b10f2ececf8b2756c1927a627821) - Partially staged changes are hidden in a uniquely-named patch file to avoid multiple invocations of _lint-staged_ overwriting it. This makes it safer to run _lint-staged_ in multiple worktrees at the same time.

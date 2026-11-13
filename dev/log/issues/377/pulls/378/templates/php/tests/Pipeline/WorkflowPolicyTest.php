<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Tests\Pipeline;

use PHPUnit\Framework\TestCase;

/**
 * Regression tests that encode the hard-won CI/CD policies from the sibling
 * templates as assertions over the workflow YAML, so a careless edit that
 * re-introduces a known footgun fails locally before it reaches CI.
 */
final class WorkflowPolicyTest extends TestCase
{
    public function testHostedRunnersUseExplicitImages(): void
    {
        foreach (glob(\dirname(__DIR__, 2) . '/.github/workflows/*.yml') ?: [] as $file) {
            self::assertDoesNotMatchRegularExpression('/^\s*[^#\n].*\b(?:ubuntu|windows|macos)-latest\b/m', (string) file_get_contents($file), $file);
        }
    }

    public function testWorkflowFreshnessAndLinkConfigurationChangesAreChecked(): void
    {
        $workflow = self::workflow('workflows.yml');
        self::assertStringContainsString('php scripts/check-workflow-dependencies.php', $workflow);
        self::assertStringContainsString('schedule:', $workflow);
        self::assertSame(2, substr_count($workflow, "- 'scripts/src/WorkflowDependencies.php'"));

        $links = self::workflow('links.yml');
        self::assertSame(2, substr_count($links, "- 'lychee.toml'"));
        self::assertSame(2, substr_count($links, "- '.lycheeignore'"));
        self::assertSame(2, substr_count($links, "- 'scripts/recheck-broken-links.php'"));
    }

    private static function workflow(string $name): string
    {
        $path = \dirname(__DIR__, 2) . '/.github/workflows/' . $name;
        $contents = file_get_contents($path);
        self::assertIsString($contents, "Missing workflow: {$name}");

        return $contents;
    }

    /**
     * @return list<string>
     */
    private static function jobNames(string $yaml): array
    {
        // Only scan the `jobs:` section: the `on:` block's 2-space keys
        // (push, pull_request, ...) otherwise match the same shape.
        $jobsStart = strpos($yaml, "\njobs:\n");
        self::assertIsInt($jobsStart, 'Workflow is missing a jobs: section.');
        $jobsSection = substr($yaml, $jobsStart);

        preg_match_all('/^  ([A-Za-z0-9_-]+):\s*$/m', $jobsSection, $matches);

        return $matches[1];
    }

    private static function jobBlock(string $yaml, string $job): string
    {
        self::assertContains($job, self::jobNames($yaml), "Missing job {$job}.");

        $lines = explode("\n", $yaml);
        $start = null;
        $end = \count($lines);

        foreach ($lines as $index => $line) {
            if ($start === null) {
                if (preg_match('/^  ' . $job . ':\s*$/', $line) === 1) {
                    $start = (int) $index;
                }

                continue;
            }

            if (preg_match('/^  [A-Za-z0-9_-]+:\s*$/', $line) === 1) {
                $end = (int) $index;

                break;
            }
        }

        self::assertIsInt($start);

        return implode("\n", \array_slice($lines, $start, $end - $start));
    }

    /**
     * @return list<string>
     */
    private static function needsList(string $jobBlock): array
    {
        $lines = explode("\n", $jobBlock);
        $needs = [];

        foreach ($lines as $index => $line) {
            if (preg_match('/^    needs:\s*\[([^\]]*)\]\s*$/', $line, $flow) === 1) {
                foreach (array_map('trim', explode(',', $flow[1])) as $item) {
                    if ($item !== '') {
                        $needs[] = $item;
                    }
                }

                break;
            }

            if (preg_match('/^    needs:\s*$/', $line) === 1) {
                for ($next = (int) $index + 1, $count = \count($lines); $next < $count; ++$next) {
                    if (preg_match('/^      - ([A-Za-z0-9_-]+)\s*$/', $lines[$next], $item) === 1) {
                        $needs[] = $item[1];

                        continue;
                    }

                    break;
                }

                break;
            }
        }

        return $needs;
    }

    public function testReleaseWorkflowExists(): void
    {
        self::assertStringContainsString('name: CI/CD Pipeline', self::workflow('release.yml'));
    }

    public function testWorkflowChangesAreLintedForCorrectnessAndSecurity(): void
    {
        $yaml = self::workflow('workflows.yml');

        self::assertStringContainsString("- '.github/**'", $yaml);

        // The actionlint container image must be pinned by digest, not by the
        // mutable 1.7.x tag: a tag of a repository we do not control is
        // arbitrary code execution in a job that runs with the repo mounted
        // (issue #5). A bare hash is unreadable, so the pin carries its tag.
        self::assertMatchesRegularExpression(
            '/uses:\s+docker:\/\/rhysd\/actionlint@sha256:[0-9a-f]{64} # v1\.7\.12/',
            $yaml,
        );
        self::assertStringNotContainsString('docker://rhysd/actionlint:1', $yaml);
        self::assertStringContainsString('zizmorcore/zizmor-action@v0.8.1', $yaml);
        self::assertStringContainsString('advanced-security: false', $yaml);
        self::assertStringContainsString('annotations: true', $yaml);
    }

    public function testZizmorRunsANamedVersionAndThePedanticHighSeverityPass(): void
    {
        $yaml = self::workflow('workflows.yml');

        // `latest` in zizmor-action is the action's own frozen table entry
        // (v0.6.4 -> zizmor 1.30.1), not the latest zizmor; naming it keeps
        // the analyser that reproduces a finding visible in the diff (#6).
        self::assertStringContainsString('version: 1.32.0', $yaml);

        // The unpinned-images audit is Pedantic-only, so the `'*': hash-pin`
        // policy is only enforced on container references by this narrow
        // second pass, filtered to high severity and high confidence (#5).
        self::assertStringContainsString(
            'Audit for pedantic-only high-severity findings',
            $yaml,
        );
        self::assertStringContainsString('--persona pedantic --min-severity high --min-confidence high', $yaml);
        self::assertStringContainsString('pipx run zizmor==1.32.0', $yaml);
    }

    public function testZizmorOnlyAuditsActiveGitHubConfiguration(): void
    {
        $yaml = self::workflow('workflows.yml');

        self::assertStringContainsString('inputs: .github', $yaml);
    }

    public function testDocsWritePermissionsAreLimitedToDeployment(): void
    {
        $yaml = self::workflow('docs.yml');

        self::assertSame(1, substr_count($yaml, 'pages: write'));
        self::assertSame(1, substr_count($yaml, 'id-token: write'));
        self::assertMatchesRegularExpression(
            '/deploy:.*permissions:\s+pages: write\s+id-token: write/s',
            $yaml,
        );
    }

    public function testManualReleaseInputsReachShellThroughEnvironment(): void
    {
        $yaml = self::workflow('release.yml');

        self::assertStringContainsString('BUMP_TYPE: ${{ github.event.inputs.bump_type }}', $yaml);
        self::assertStringContainsString('RELEASE_DESCRIPTION: ${{ github.event.inputs.description }}', $yaml);
        self::assertStringContainsString('--bump="$BUMP_TYPE"', $yaml);
        self::assertStringContainsString('--description="$RELEASE_DESCRIPTION"', $yaml);
    }

    public function testConcurrencyNeverCancelsMain(): void
    {
        $yaml = self::workflow('release.yml');

        self::assertStringContainsString('concurrency:', $yaml);
        self::assertStringContainsString(
            "cancel-in-progress: \${{ github.ref != 'refs/heads/main' }}",
            $yaml,
            'Runs on main must never be cancelled mid-release.',
        );
    }

    public function testGatesUseNotCancelledNotAlwaysAlone(): void
    {
        $yaml = self::workflow('release.yml');

        // The release gates rely on !cancelled() so a skipped detect-changes
        // dependency does not silently skip lint/test/release.
        self::assertStringContainsString('!cancelled()', $yaml);
    }

    public function testEveryJobHasATimeout(): void
    {
        foreach (['release.yml', 'docs.yml', 'links.yml', 'workflows.yml', 'security.yml'] as $file) {
            $yaml = self::workflow($file);
            // One `runs-on:` per job; every job must carry a job-level timeout
            // (four-space indent). Step-level `timeout-minutes:` values are
            // eight spaces deep and checked by the budget-invariant test.
            $jobCount = substr_count($yaml, 'runs-on:');
            $timeoutCount = (int) preg_match_all('/^    timeout-minutes:/m', $yaml);

            self::assertGreaterThan(0, $jobCount, "{$file} should declare jobs.");
            self::assertSame(
                $jobCount,
                $timeoutCount,
                "{$file}: every job should declare a timeout-minutes.",
            );
        }
    }

    public function testEveryWorkflowHasATerminalStatusGateObservingEveryJob(): void
    {
        foreach (['release.yml', 'docs.yml', 'links.yml', 'workflows.yml', 'security.yml'] as $file) {
            $yaml = self::workflow($file);
            $jobs = self::jobNames($yaml);

            self::assertContains(
                'pipeline-status',
                $jobs,
                "{$file} needs a terminal pipeline-status gate (issue #9).",
            );

            $block = self::jobBlock($yaml, 'pipeline-status');

            // always() is load-bearing: without it the gate inherits the skip
            // of whichever dependency was cancelled and disappears exactly
            // when it is needed.
            self::assertStringContainsString('if: always()', $block);
            self::assertStringContainsString('bash scripts/check-pipeline-status.sh', $block);
            self::assertStringContainsString('NEEDS_JSON: ${{ toJSON(needs) }}', $block);
            self::assertStringContainsString('RUN_SHA: ${{ github.event.pull_request.head.sha || github.sha }}', $block);
            self::assertStringContainsString('BRANCH_REF: ${{ github.head_ref || github.ref_name }}', $block);
            self::assertStringContainsString("GIT_REMOTE: \${{ github.event.pull_request.head.repo.clone_url || 'origin' }}", $block);
            self::assertStringContainsString('persist-credentials: false', $block);

            // A job missing from `needs:` can hit its timeout cap with nothing
            // to observe it (issue #9), so pin the observed list to the job
            // list.
            self::assertSame(
                array_values(array_diff($jobs, ['pipeline-status'])),
                self::needsList($block),
                "{$file}: pipeline-status must observe every other job.",
            );
        }
    }

    public function testPipelineStatusScriptHandlesFailuresCancellationsAndSupersededRuns(): void
    {
        $contents = file_get_contents(\dirname(__DIR__, 2) . '/scripts/check-pipeline-status.sh');
        self::assertIsString($contents, 'Missing scripts/check-pipeline-status.sh.');

        self::assertStringContainsString('select_by_result not-success', $contents);
        self::assertStringContainsString('select_by_result cancelled', $contents);
        // A branch moving is only half the proof: the individual job must
        // actually opt into being cancelled by a superseding run (#14).
        self::assertStringContainsString('run_is_superseded', $contents);
        self::assertStringContainsString('read-job-cancel-in-progress.php', $contents);
        // Unreadable and expression-valued policies fail closed.
        self::assertStringContainsString('expression or otherwise unknown', $contents);
    }

    public function testLongStepsRunUnderAnExecutionBudget(): void
    {
        $yaml = self::workflow('release.yml');

        // The wrapper owns the deadline so a hung step fails the job (red)
        // instead of letting the runner kill the job as cancelled (grey).
        self::assertGreaterThanOrEqual(
            8,
            substr_count($yaml, 'run-with-budget-warning.sh'),
            'release.yml should wrap its long steps in run-with-budget-warning.sh (issue #10).',
        );

        $script = file_get_contents(\dirname(__DIR__, 2) . '/scripts/run-with-budget-warning.sh');
        self::assertIsString($script, 'Missing scripts/run-with-budget-warning.sh.');
        // set -m gives the command its own process group so the whole tree is
        // signalled, not just the direct child; the grace window is what makes
        // SIGTERM -> SIGKILL orderly; exit 124 is what turns a timeout into a
        // failure the pipeline-status gate can see.
        self::assertStringContainsString('set -m', $script);
        self::assertStringContainsString('BUDGET_WARN_RATIO_PERCENT', $script);
        self::assertStringContainsString('BUDGET_GRACE_SECONDS', $script);
        self::assertStringContainsString('BUDGET_CAPTURE_OUTPUT', $script);
        self::assertStringContainsString('group_members', $script);
        self::assertStringContainsString('sudo -n kill', $script);
        self::assertStringContainsString('exit 124', $script);
    }

    public function testStepBudgetsExpireBeforeTheJobCapTheySitUnder(): void
    {
        $yaml = self::workflow('release.yml');
        $maxBudgetSharePercent = 70;
        $checked = 0;

        foreach (self::jobNames($yaml) as $job) {
            $block = self::jobBlock($yaml, $job);

            preg_match('/^    timeout-minutes: (\d+)$/m', $block, $capMatch);
            $capMinutes = (int) ($capMatch[1] ?? '0');
            self::assertGreaterThan(
                0,
                $capMinutes,
                "{$job}: every release job declares a job-level timeout.",
            );
            $capSeconds = $capMinutes * 60;

            $deadlines = [];

            $budgetMatches = [];
            preg_match_all('/^          ([A-Z0-9_]*BUDGET_SECONDS): (\d+)$/m', $block, $budgetMatches, PREG_SET_ORDER);
            foreach ($budgetMatches as $set) {
                $deadlines[] = [$set[1], (int) $set[2]];
            }

            $timeoutMatches = [];
            preg_match_all('/^        timeout-minutes: (\d+)$/m', $block, $timeoutMatches, PREG_SET_ORDER);
            foreach ($timeoutMatches as $set) {
                $deadlines[] = ["step timeout-minutes: {$set[1]}", ((int) $set[1]) * 60];
            }

            foreach ($deadlines as [$source, $seconds]) {
                ++$checked;
                self::assertLessThanOrEqual(
                    (int) ($capSeconds * $maxBudgetSharePercent / 100),
                    $seconds,
                    "{$job}: {$source} must expire before the job's {$capMinutes}-minute cap, or the cap fires first and the deadline was decorative.",
                );
            }
        }

        // The invariant must have checked real work: an empty deadline list
        // would let a future edit drop every budget without a failure.
        self::assertGreaterThanOrEqual(10, $checked, 'Expected the long steps to carry budgets.');
    }

    public function testReleaseJobsGateOnThePreflightResult(): void
    {
        $yaml = self::workflow('release.yml');
        $preflight = self::jobBlock($yaml, 'release-preflight');

        self::assertStringContainsString('php scripts/preflight-credentials.php', $preflight);
        self::assertStringContainsString('persist-credentials: false', $preflight);
        // The blocking mode is reserved for the events that can actually
        // release: a fork pull request only annotates (issue #11).
        self::assertStringContainsString("'release' || 'report'", $preflight);

        foreach (['auto-release', 'manual-release'] as $job) {
            $block = self::jobBlock($yaml, $job);

            self::assertContains('release-preflight', self::needsList($block));
            self::assertStringContainsString(
                "needs.release-preflight.result == 'success'",
                $block,
                "{$job} must gate on the preflight succeeding, not merely not failing.",
            );
        }
    }

    public function testEveryWorkflowGrantsExplicitTopLevelPermissions(): void
    {
        // A workflow without a top-level permissions block hands every job
        // the repository's default token permissions; zizmor's
        // excessive-permissions audit and CodeQL both flag it.
        foreach (['release.yml', 'docs.yml', 'links.yml', 'workflows.yml', 'security.yml'] as $file) {
            $yaml = self::workflow($file);

            self::assertMatchesRegularExpression(
                '/^permissions:\n  contents: read$/m',
                $yaml,
                "{$file} must declare explicit top-level permissions.",
            );
        }
    }

    public function testEveryCheckoutDeclaresCredentialPersistence(): void
    {
        // actions/checkout writes the token into .git/config unless told not
        // to, so every checkout must make the choice explicit instead of
        // inheriting the credential-persisting default (issue #8).
        $checkouts = 0;
        $persisting = [];

        foreach (['release.yml', 'docs.yml', 'links.yml', 'workflows.yml', 'security.yml'] as $file) {
            $lines = explode("\n", self::workflow($file));

            foreach ($lines as $index => $line) {
                if (preg_match('/^\s*- uses: actions\/checkout@/', $line) !== 1) {
                    continue;
                }

                ++$checkouts;
                $step = implode("\n", \array_slice($lines, $index, 6));

                self::assertStringContainsString(
                    'persist-credentials:',
                    $step,
                    "{$file}:" . ($index + 1) . ' checkout does not set persist-credentials.',
                );

                if (str_contains($step, 'persist-credentials: true')) {
                    $persisting[] = "{$file}:" . ($index + 1);
                }
            }
        }

        self::assertSame(21, $checkouts, 'Expected every checkout to be visited by this test.');
        // Only the two release jobs push (version-and-commit.php runs
        // `git push` to publish the version bump); every other checkout only
        // reads the tree.
        self::assertSame(
            ['release.yml:330', 'release.yml:423'],
            $persisting,
            'Only the pushing release checkouts may persist credentials.',
        );
    }

    /**
     * @return list<string>
     */
    private static function codeqlLanguages(string $yaml): array
    {
        self::assertMatchesRegularExpression('/^        language: \[[^\]]+\]$/m', $yaml);
        preg_match('/^        language: \[([^\]]+)\]$/m', $yaml, $match);
        self::assertIsString($match[1] ?? null, 'CodeQL matrix must declare its languages inline.');

        return array_values(array_map('trim', explode(',', $match[1])));
    }

    public function testSecurityWorkflowAuditsTheSupplyChain(): void
    {
        $yaml = self::workflow('security.yml');

        // Advisory + abandonment checks run against the freshly resolved set:
        // the template ships no lock file, so an audit without a resolve step
        // would have nothing to look at.
        self::assertStringContainsString('composer update --no-interaction', $yaml);
        self::assertStringContainsString('composer audit --locked --abandoned=fail', $yaml);

        // Weekly cadence: a newly published advisory must not wait for the
        // next unrelated merge to be discovered.
        self::assertStringContainsString("cron: '0 6 * * 1'", $yaml);

        // CodeQL has no PHP analyser; the only language it can scan here is
        // this repository's own workflow definitions.
        self::assertSame(['actions'], self::codeqlLanguages($yaml));

        // A pull request that raises a high-severity dependency fails and
        // says so in the PR itself.
        $review = self::jobBlock($yaml, 'dependency-review');
        self::assertStringContainsString('fail-on-severity: high', $review);
        self::assertStringContainsString('comment-summary-in-pr: on-failure', $review);
    }

    public function testBrokenLinkGatesReAskTheNeverAnsweredUrls(): void
    {
        $yaml = self::workflow('links.yml');

        self::assertStringContainsString('php scripts/recheck-broken-links.php', $yaml);

        // The re-check only runs when lychee failed; a green lychee pass
        // must not spend the budget.
        self::assertMatchesRegularExpression(
            '/if: steps\.lychee\.outputs\.exit_code != 0\n        id: recheck/',
            $yaml,
        );

        // `!= 'true'`, never `== 'false'`: a skipped or crashed re-check
        // leaves the output empty, and only the != form fails safe.
        self::assertSame(
            2,
            substr_count($yaml, "steps.recheck.outputs.all_recovered != 'true'"),
            'Both the archive lookup and the fail step must respect a full recovery (issue #12).',
        );
        self::assertStringNotContainsString("all_recovered == 'false'", $yaml);

        // The archive check must receive the re-check's recovered list, or
        // it would send healthy URLs to the Wayback Machine.
        self::assertStringContainsString('RECOVERED_URLS: lychee/recovered.txt', $yaml);
    }

    public function testReleaseJobsRequireWriteContents(): void
    {
        $yaml = self::workflow('release.yml');

        self::assertStringContainsString('contents: write', $yaml);
    }

    public function testCiCdLogicIsInvokedThroughPhpScripts(): void
    {
        $yaml = self::workflow('release.yml');

        foreach ([
            'scripts/detect-code-changes.php',
            'scripts/check-release-needed.php',
            'scripts/version-and-commit.php',
            'scripts/create-github-release.php',
        ] as $script) {
            self::assertStringContainsString($script, $yaml, "Workflow should call {$script}.");
        }
    }

    public function testNoForeignRuntimesInWorkflows(): void
    {
        // The pipeline must be native PHP: no node/python/ruby steps.
        foreach (['release.yml', 'docs.yml', 'links.yml'] as $file) {
            $yaml = self::workflow($file);

            self::assertStringNotContainsString('setup-node', $yaml, "{$file} must not set up Node.");
            self::assertStringNotContainsString('setup-python', $yaml, "{$file} must not set up Python.");
            self::assertDoesNotMatchRegularExpression('/run:\s*(node|python|ruby|npm|pip) /', $yaml);
        }
    }
}

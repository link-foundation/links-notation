<?php

declare(strict_types=1);

/**
 * Release preflight: prove the release preconditions before the pipeline
 * spends its build minutes on top of them (issue #11).
 *
 * Today the first step that asks whether Packagist knows the package is
 * wait-for-packagist.php -- deep into the run and after the version tag has
 * already been pushed. This script asks first, together with the workflow
 * token's push permission, so a broken precondition costs one minute instead
 * of the whole release path.
 *
 * Environment:
 *   PREFLIGHT_MODE      'release' blocks on refused preconditions (push to
 *                       main, workflow_dispatch); 'report' (default) only
 *                       annotates, because a fork has no way to satisfy a
 *                       precondition of a package it does not own.
 *   GITHUB_REPOSITORY   the repository the token is probed against
 *   GITHUB_TOKEN        the token whose push permission is probed
 *
 * Exit codes: 'release' mode exits 1 when a precondition was definitively
 * refused, or when nothing at all could be verified (a run that verified
 * nothing is not a pass); 'report' mode always exits 0.
 */

require_once __DIR__ . '/bootstrap.php';

use LinkFoundation\Template\Pipeline\Actions;
use LinkFoundation\Template\Pipeline\PreflightCheck;
use LinkFoundation\Template\Pipeline\Project;
use LinkFoundation\Template\Pipeline\ReleasePreflight;

$project = Project::locate();
$packageName = $project->packageName();
$repository = getenv('GITHUB_REPOSITORY') ?: '';
$token = getenv('GITHUB_TOKEN') ?: '';
$mode = getenv('PREFLIGHT_MODE') ?: 'report';

echo "Release preflight (mode: {$mode}) for {$packageName}...\n";

$preflight = new ReleasePreflight(
    packageName: $packageName,
    githubRepository: $repository,
    githubToken: $token,
);

// Report every precondition even after one fails: one run naming all the
// broken preconditions beats several runs each naming one.
$results = [];

// The sentinel package exists only in this template; Packagist will never
// know it, and that is not a broken precondition.
if (!$project->isTemplateSentinel()) {
    $results[] = $preflight->checkPackagistRegistration();
}

if ($repository !== '') {
    $results[] = $preflight->checkGitHubPushPermission();
}

if ($results === []) {
    echo "No release preconditions to probe.\n";
    exit(0);
}

$verified = 0;
$failed = 0;
$unknown = 0;

foreach ($results as $result) {
    echo "[{$result->status}] {$result->name}: {$result->detail}\n";

    if ($result->status === PreflightCheck::VERIFIED) {
        ++$verified;
        continue;
    }

    if ($result->status === PreflightCheck::FAILED) {
        ++$failed;
        $mode === 'release'
            ? Actions::error($result->name . ': ' . $result->detail)
            : Actions::warning($result->name . ': ' . $result->detail);
        continue;
    }

    ++$unknown;
    $mode === 'release'
        ? Actions::error($result->name . ': ' . $result->detail)
        : Actions::warning($result->name . ': ' . $result->detail);
}

echo "Preflight finished: {$verified} verified, {$failed} refused, {$unknown} undetermined.\n";

if ($mode !== 'release') {
    exit(0);
}

// Report every failure before deciding, then block: a refused precondition is
// a release that would fail an hour in, and a run that verified nothing is
// not a pass.
exit($failed > 0 || $verified === 0 ? 1 : 0);

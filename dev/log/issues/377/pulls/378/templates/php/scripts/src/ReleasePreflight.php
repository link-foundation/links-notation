<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * Proves the release preconditions before the pipeline spends an hour building
 * on top of them (issue #11).
 *
 * The PHP template publishes through two preconditions that today are only
 * discovered broken at the very end of the run:
 *
 * - Packagist must know the package. The release reaches Packagist through its
 *   webhook, and `wait-for-packagist.php` is the first step that ever asks --
 *   deep into the run and after the version tag has already been pushed. The
 *   probe is a single unauthenticated GET of the p2 metadata the wait loop
 *   polls anyway.
 * - The workflow token must be able to push. `create-github-release.php` runs
 *   last; a repository whose Actions workflow permissions are read-only only
 *   fails there. The probe asks the API for the repository's permission block.
 *
 * Probing with a real answer (the metadata GET, the permissions block) is the
 * point: a login-style check would report a credential as good while the write
 * it is meant to prove is silently missing.
 */
final class ReleasePreflight
{
    public function __construct(
        private readonly string $packageName,
        private readonly string $githubRepository,
        private readonly Packagist $packagist = new Packagist(),
        private readonly Http $http = new Http(),
        private readonly string $githubToken = '',
    ) {
    }

    public function checkPackagistRegistration(): PreflightCheck
    {
        $name = 'Packagist knows the package';
        $response = $this->http->get($this->packagist->metadataUrl($this->packageName));

        return match ($response['status']) {
            200 => new PreflightCheck(
                $name,
                PreflightCheck::VERIFIED,
                "Packagist has metadata for {$this->packageName}.",
            ),
            404 => new PreflightCheck(
                $name,
                PreflightCheck::FAILED,
                "Packagist has no metadata for {$this->packageName}: the package is not "
                . 'registered, so a pushed tag will never reach Packagist. Submit the '
                . 'package on packagist.org before releasing.',
            ),
            default => $this->unanswered($name, $response['status'], 'repo.packagist.org'),
        };
    }

    public function checkGitHubPushPermission(): PreflightCheck
    {
        $name = 'The workflow token can push to the repository';

        if ($this->githubToken === '') {
            return new PreflightCheck(
                $name,
                PreflightCheck::UNKNOWN,
                'No GITHUB_TOKEN is available; the push permission could not be probed.',
            );
        }

        $response = $this->http->get(
            "https://api.github.com/repos/{$this->githubRepository}",
            [
                'Authorization' => "Bearer {$this->githubToken}",
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
            ],
        );

        if ($response['status'] !== 200) {
            return new PreflightCheck(
                $name,
                PreflightCheck::FAILED,
                "api.github.com answered {$response['status']} for {$this->githubRepository}; "
                . 'the release will not be able to create a GitHub Release with this token.',
            );
        }

        /** @var array{permissions?: array{push?: bool}} $data */
        $data = json_decode($response['body'], true) ?: [];
        $canPush = $data['permissions']['push'] ?? false;

        if ($canPush === true) {
            return new PreflightCheck(
                $name,
                PreflightCheck::VERIFIED,
                "The token holds push permission on {$this->githubRepository}.",
            );
        }

        return new PreflightCheck(
            $name,
            PreflightCheck::FAILED,
            "The token has no push permission on {$this->githubRepository} "
            . '(Settings -> Actions -> General -> Workflow permissions must grant write).',
        );
    }

    private function unanswered(string $name, int $status, string $host): PreflightCheck
    {
        $reason = $status === 0
            ? "{$host} did not answer"
            : "{$host} answered {$status}";

        return new PreflightCheck(
            $name,
            PreflightCheck::UNKNOWN,
            "{$reason} (rate limit or outage); the precondition is undetermined, not met.",
        );
    }
}

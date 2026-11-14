<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Tests\Pipeline;

use LinkFoundation\Template\Pipeline\Http;
use LinkFoundation\Template\Pipeline\PreflightCheck;
use LinkFoundation\Template\Pipeline\ReleasePreflight;
use PHPUnit\Framework\TestCase;

final class ReleasePreflightTest extends TestCase
{
    /**
     * @param array<string, string> $headers
     * @return array{0: string, 1: string, 2: array<string, string>}
     */
    private static function capture(string $method, string $url, array $headers): array
    {
        return [$method, $url, $headers];
    }

    private function preflightAnswering(int $status, string $body): ReleasePreflight
    {
        return new ReleasePreflight(
            packageName: 'vendor/pkg',
            githubRepository: 'owner/repo',
            http: new Http(static fn (): array => ['status' => $status, 'body' => $body]),
            githubToken: 'token',
        );
    }

    public function testRegisteredPackageVerifies(): void
    {
        $check = $this->preflightAnswering(200, '{}')->checkPackagistRegistration();

        self::assertSame(PreflightCheck::VERIFIED, $check->status);
        self::assertStringContainsString('vendor/pkg', $check->detail);
    }

    public function testUnregisteredPackageFailsWithTheFix(): void
    {
        $check = $this->preflightAnswering(404, '')->checkPackagistRegistration();

        self::assertSame(PreflightCheck::FAILED, $check->status);
        self::assertStringContainsString('packagist.org', $check->detail);
    }

    public function testRateLimitedRegistryStaysUnknown(): void
    {
        $check = $this->preflightAnswering(429, '')->checkPackagistRegistration();

        self::assertSame(PreflightCheck::UNKNOWN, $check->status);
        self::assertStringContainsString('answered 429', $check->detail);
    }

    public function testSilentRegistryStaysUnknown(): void
    {
        $check = $this->preflightAnswering(0, '')->checkPackagistRegistration();

        self::assertSame(PreflightCheck::UNKNOWN, $check->status);
        self::assertStringContainsString('did not answer', $check->detail);
    }

    public function testPackagistProbeAsksTheMetadataEndpointTheWaitLoopPolls(): void
    {
        $seen = null;
        $http = new Http(static function (string $method, string $url) use (&$seen): array {
            $seen = self::capture($method, $url, []);

            return ['status' => 200, 'body' => '{}'];
        });

        $preflight = new ReleasePreflight(
            packageName: 'Vendor/Pkg',
            githubRepository: 'owner/repo',
            http: $http,
            githubToken: 'token',
        );
        $preflight->checkPackagistRegistration();

        self::assertIsArray($seen);
        self::assertSame('GET', $seen[0]);
        self::assertSame('https://repo.packagist.org/p2/vendor/pkg.json', $seen[1]);
    }

    public function testPushPermissionVerifies(): void
    {
        $body = json_encode(['permissions' => ['push' => true]], JSON_THROW_ON_ERROR);

        $check = $this->preflightAnswering(200, $body)->checkGitHubPushPermission();

        self::assertSame(PreflightCheck::VERIFIED, $check->status);
    }

    public function testReadOnlyTokenFailsWithWhereToFixIt(): void
    {
        $body = json_encode(['permissions' => ['push' => false]], JSON_THROW_ON_ERROR);

        $check = $this->preflightAnswering(200, $body)->checkGitHubPushPermission();

        self::assertSame(PreflightCheck::FAILED, $check->status);
        self::assertStringContainsString('Workflow permissions', $check->detail);
    }

    public function testRefusedRepositoryFails(): void
    {
        $check = $this->preflightAnswering(403, '')->checkGitHubPushPermission();

        self::assertSame(PreflightCheck::FAILED, $check->status);
        self::assertStringContainsString('answered 403', $check->detail);
    }

    public function testMissingTokenStaysUnknown(): void
    {
        $preflight = new ReleasePreflight(
            packageName: 'vendor/pkg',
            githubRepository: 'owner/repo',
            http: new Http(static fn (): array => ['status' => 200, 'body' => '{}']),
            githubToken: '',
        );

        $check = $preflight->checkGitHubPushPermission();

        self::assertSame(PreflightCheck::UNKNOWN, $check->status);
    }

    public function testGitHubProbeAuthenticatesAsTheTokenItJudges(): void
    {
        $seen = null;
        $http = new Http(static function (string $method, string $url, array $headers) use (&$seen): array {
            $seen = self::capture($method, $url, $headers);

            return ['status' => 200, 'body' => json_encode(['permissions' => ['push' => true]], JSON_THROW_ON_ERROR)];
        });

        $preflight = new ReleasePreflight(
            packageName: 'vendor/pkg',
            githubRepository: 'owner/repo',
            http: $http,
            githubToken: 'secret-token',
        );
        $preflight->checkGitHubPushPermission();

        self::assertIsArray($seen);
        self::assertSame('GET', $seen[0]);
        self::assertSame('https://api.github.com/repos/owner/repo', $seen[1]);
        self::assertSame('Bearer secret-token', $seen[2]['Authorization']);
    }
}

<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * Keeps active workflow runners and action/tool versions explicit and current.
 * The release lookup is injectable so regression tests stay offline.
 */
final class WorkflowDependencies
{
    private const TOOL_INPUTS = [
        'zizmorcore/zizmor-action' => 'zizmorcore/zizmor',
        'trufflesecurity/trufflehog' => 'trufflesecurity/trufflehog',
    ];

    /** @var callable(string): string */
    private $latestRelease;

    /** @param (callable(string): string)|null $latestRelease */
    public function __construct(?callable $latestRelease = null)
    {
        $this->latestRelease = $latestRelease ?? static function (string $repository): string {
            // Some repositories also publish non-action releases (CodeQL
            // bundles, for example). Select the newest stable semantic tag,
            // rather than blindly trusting /releases/latest.
            $result = Process::mustRun([
                'gh', 'api', 'repos/' . $repository . '/releases', '--paginate',
                '--jq', '.[] | select(.draft == false and .prerelease == false) | .tag_name',
            ]);

            return self::newestRelease($result->stdout);
        };
    }

    /** @return list<string> */
    public static function runnerErrors(string $yaml): array
    {
        $errors = [];
        foreach (explode("\n", $yaml) as $index => $line) {
            $line = trim((string) preg_replace('/\s+#.*$/', '', $line));
            if (preg_match('/^(?:runs-on:|os:|-\s).*\b(?:ubuntu|windows|macos)-latest\b/', $line) === 1) {
                $errors[] = 'line ' . ($index + 1) . ': pin hosted runners to an explicit image such as ubuntu-24.04';
            }
        }

        return $errors;
    }

    /** @return list<array{repository: string, reference: string, line: int}> */
    public static function dependencies(string $yaml): array
    {
        $dependencies = [];
        $action = '';
        foreach (explode("\n", $yaml) as $index => $line) {
            if (str_starts_with(trim($line), '#')) {
                continue;
            }
            if (preg_match('/^\s*-\s/', $line) === 1) {
                $action = '';
            }

            $repository = '';
            $reference = '';
            if (preg_match('/^\s*(?:-\s*)?uses:\s*[\'\"]?([\w.-]+\/[\w.\/-]+)@([^\s\'\"#]+)/', $line, $match) === 1) {
                $parts = explode('/', $match[1]);
                $repository = $parts[0] . '/' . $parts[1];
                $reference = $match[2];
                $action = $repository;
            } elseif (preg_match('/^\s*(?:-\s*)?uses:\s*[\'\"]?docker:\/\/rhysd\/actionlint/', $line) === 1) {
                $repository = 'rhysd/actionlint';
                // Preserve the digest pin for security and check its readable
                // release annotation, rather than replacing it with a tag.
                if (preg_match('/#\s*(v?\d+\.\d+\.\d+)\s*$/', $line, $match) !== 1) {
                    throw new \RuntimeException('The actionlint image needs a release annotation such as # v1.7.12');
                }
                $reference = $match[1];
            } elseif (isset(self::TOOL_INPUTS[$action]) && preg_match('/^\s+version:\s*[\'\"]?([^\s\'\"#]+)/', $line, $match) === 1) {
                $repository = self::TOOL_INPUTS[$action];
                $reference = $match[1];
            } elseif (preg_match('/\bpipx run zizmor==([^\s\'\"\\\\]+)/', $line, $match) === 1) {
                $repository = 'zizmorcore/zizmor';
                $reference = $match[1];
            }

            if ($repository !== '') {
                $dependencies[] = ['repository' => $repository, 'reference' => $reference, 'line' => $index + 1];
            }
        }

        return $dependencies;
    }

    public static function newestRelease(string $tags): string
    {
        $latest = '';
        foreach (explode("\n", trim($tags)) as $tag) {
            $tag = trim($tag);
            if (preg_match('/^v?\d+\.\d+\.\d+$/', $tag) !== 1) {
                continue;
            }
            if ($latest === '' || version_compare(ltrim($tag, 'v'), ltrim($latest, 'v'), '>')) {
                $latest = $tag;
            }
        }
        if ($latest === '') {
            throw new \RuntimeException('No stable semantic release found');
        }

        return $latest;
    }

    /**
     * @param array<string, string> $workflows Workflow paths and their contents.
     * @return list<string>
     */
    public function check(array $workflows): array
    {
        $errors = [];
        $releases = [];
        $lookupErrors = [];
        foreach ($workflows as $file => $yaml) {
            foreach (self::runnerErrors($yaml) as $error) {
                $errors[] = $file . ':' . $error;
            }
            try {
                $dependencies = self::dependencies($yaml);
            } catch (\Throwable $error) {
                $errors[] = $file . ': ' . $error->getMessage();

                continue;
            }
            foreach ($dependencies as $dependency) {
                $repository = $dependency['repository'];
                $location = $file . ':' . $dependency['line'];
                if (isset($lookupErrors[$repository])) {
                    $errors[] = "{$location}: cannot check {$repository}: " . $lookupErrors[$repository];

                    continue;
                }
                try {
                    if (!isset($releases[$repository])) {
                        $releases[$repository] = ($this->latestRelease)($repository);
                    }
                    $latest = $releases[$repository];
                    if (ltrim($dependency['reference'], 'v') !== ltrim($latest, 'v')) {
                        $errors[] = "{$location}: {$repository}@{$dependency['reference']} must use the latest stable release {$latest}";
                    }
                } catch (\Throwable $error) {
                    $lookupErrors[$repository] = $error->getMessage();
                    $errors[] = "{$location}: cannot check {$repository}: " . $error->getMessage();
                }
            }
        }

        return $errors;
    }
}

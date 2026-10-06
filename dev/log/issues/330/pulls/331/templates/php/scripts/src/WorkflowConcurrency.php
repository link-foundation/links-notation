<?php

declare(strict_types=1);

namespace LinkFoundation\Template\Pipeline;

/**
 * Reads effective job concurrency from a GitHub Actions workflow without a
 * YAML dependency. Gate jobs may run without Composer-installed packages.
 */
final class WorkflowConcurrency
{
    public const TRUE = 'true';
    public const FALSE = 'false';
    public const NONE = 'none';
    public const MISSING = 'missing';
    public const UNKNOWN = 'unknown';

    /**
     * @param list<string> $jobNames
     * @return array<string, string>
     */
    public static function readFile(string $path, array $jobNames): array
    {
        $contents = file_get_contents($path);
        if ($contents === false) {
            throw new \RuntimeException("Unable to read workflow: {$path}");
        }

        return self::read($contents, $jobNames);
    }

    /**
     * @param list<string> $jobNames
     * @return array<string, string>
     */
    public static function read(string $yaml, array $jobNames): array
    {
        $lines = preg_split('/\R/', $yaml);
        if (!\is_array($lines)) {
            throw new \RuntimeException('Unable to split workflow into lines.');
        }

        $workflowLevel = null;
        foreach ($lines as $index => $line) {
            if (preg_match('/^concurrency\s*:/', $line) === 1) {
                $workflowLevel = self::readConcurrency($lines, (int) $index, 0);
                break;
            }
        }

        /** @var array<string, ?string> $jobs */
        $jobs = [];
        $inJobs = false;
        $current = null;
        foreach ($lines as $index => $line) {
            if (preg_match('/^jobs:\s*(?:#.*)?$/', $line) === 1) {
                $inJobs = true;
                continue;
            }
            if ($inJobs && !self::isBlank($line) && preg_match('/^[A-Za-z_]/', $line) === 1) {
                break;
            }
            if (!$inJobs || self::isBlank($line)) {
                continue;
            }
            if (preg_match('/^  ([A-Za-z_][A-Za-z0-9_.-]*):/', $line, $match) === 1) {
                $current = $match[1];
                $jobs[$current] = null;
                continue;
            }
            if ($current !== null && preg_match('/^    concurrency\s*:/', $line) === 1) {
                $jobs[$current] = self::readConcurrency($lines, (int) $index, 4);
            }
        }

        $answers = [];
        foreach ($jobNames as $name) {
            if (!\array_key_exists($name, $jobs)) {
                $answers[$name] = self::MISSING;
            } elseif ($jobs[$name] !== null) {
                $answers[$name] = $jobs[$name];
            } elseif ($workflowLevel !== null) {
                $answers[$name] = $workflowLevel;
            } else {
                $answers[$name] = self::NONE;
            }
        }

        return $answers;
    }

    /** @param list<string> $lines */
    private static function readConcurrency(array $lines, int $start, int $indent): string
    {
        $parts = explode(':', $lines[$start], 2);
        $rest = trim($parts[1] ?? '');
        if ($rest !== '' && !str_starts_with($rest, '#')) {
            return self::FALSE;
        }

        $value = null;
        for ($index = $start + 1, $count = \count($lines); $index < $count; ++$index) {
            $line = $lines[$index];
            if (self::isBlank($line)) {
                continue;
            }
            if (self::indent($line) <= $indent) {
                break;
            }
            if (preg_match('/^\s*cancel-in-progress:\s*(.*)$/', $line, $match) === 1) {
                $value = $match[1];
            }
        }

        return $value === null ? self::FALSE : self::normalise($value);
    }

    private static function normalise(string $raw): string
    {
        if (str_contains($raw, '${{')) {
            return self::UNKNOWN;
        }
        $withoutComment = preg_replace('/\s+#.*$/', '', $raw);
        $value = strtolower(trim((string) $withoutComment, " \t\n\r\0\x0B'\""));

        return match ($value) {
            'true' => self::TRUE,
            'false' => self::FALSE,
            default => self::UNKNOWN,
        };
    }

    private static function isBlank(string $line): bool
    {
        $trimmed = trim($line);

        return $trimmed === '' || str_starts_with($trimmed, '#');
    }

    private static function indent(string $line): int
    {
        return \strlen($line) - \strlen(ltrim($line, ' '));
    }
}

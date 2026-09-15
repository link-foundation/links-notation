<?php

/**
 * PHP side of the Links Notation token efficiency benchmarks.
 *
 * The Rust benchmark is the one that writes the documents and the report. Every
 * other language answers the two questions that make those numbers portable
 * rather than a property of one implementation:
 *
 *   1. does this language's own links-notation parser accept the generated
 *      Links Notation documents;
 *   2. does this language's own tokenizer count them the same way.
 *
 * It writes benchmarks/results/php.json and fails when a count differs from
 * benchmarks/results/rust.json.
 *
 * Usage: php benchmarks/php/benchmark.php [--check] [--verbose]
 * With --check the results file is compared instead of written, which is what
 * CI runs to catch a stale commit.
 */

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use LinkFoundation\LinksNotation\Parser;
use Yethee\Tiktoken\EncoderProvider;

const LANGUAGE = 'php';

/** The order the measurements are reported in, shared by every language. */
const METRIC_KEYS = ['tokens_o200k', 'tokens_cl100k', 'chars', 'bytes'];

/**
 * The benchmarks directory, found from the working directory so the command
 * runs from the repository root as well as from its own directory.
 */
function benchmarksDirectory(): string
{
    $fromEnvironment = getenv('BENCHMARKS_DIR');
    if (is_string($fromEnvironment) && $fromEnvironment !== '') {
        return $fromEnvironment;
    }

    $current = __DIR__;
    while (true) {
        if (is_file($current . '/benchmarks/generated/index.json')) {
            return $current . '/benchmarks';
        }
        if (is_file($current . '/generated/index.json')) {
            return $current;
        }
        $parent = dirname($current);
        if ($parent === $current) {
            throw new RuntimeException('no benchmarks directory above the working directory');
        }
        $current = $parent;
    }
}

/**
 * The contents of a file, read as raw bytes so the CRLF line endings RFC 4180
 * asks of CSV are counted rather than collapsed.
 */
function readText(string $root, string $path): string
{
    $contents = file_get_contents($root . '/' . $path);
    if ($contents === false) {
        throw new RuntimeException('cannot read ' . $path);
    }

    return $contents;
}

/** @return array<string, mixed> */
function readJson(string $root, string $path): array
{
    return json_decode(readText($root, $path), true, 512, JSON_THROW_ON_ERROR);
}

/**
 * The four measurements taken of every document.
 *
 * `chars` counts Unicode code points rather than bytes, so a character outside
 * the basic plane counts once here and once in every other language.
 *
 * @return array<string, int>
 */
function measure(string $text, object $o200k, object $cl100k): array
{
    return [
        'tokens_o200k' => count($o200k->encode($text)),
        'tokens_cl100k' => count($cl100k->encode($text)),
        'chars' => mb_strlen($text, 'UTF-8'),
        'bytes' => strlen($text),
    ];
}

/**
 * Every measurement that differs from the reference results.
 *
 * @param array<string, mixed> $results
 * @param array<string, mixed> $reference
 *
 * @return list<string>
 */
function compare(array $results, array $reference): array
{
    $byName = [];
    foreach ($reference['datasets'] as $dataset) {
        $byName[$dataset['name']] = $dataset;
    }

    $differences = [];
    foreach ($results['datasets'] as $dataset) {
        $name = $dataset['name'];
        if (!isset($byName[$name])) {
            $differences[] = $name . ': missing from the Rust results';
            continue;
        }
        foreach ($dataset['formats'] as $format => $metrics) {
            foreach (METRIC_KEYS as $key) {
                $value = $metrics[$key];
                $other = $byName[$name]['formats'][$format][$key] ?? null;
                if ($other !== $value) {
                    $differences[] = sprintf(
                        '%s/%s/%s: %d here, %s in Rust',
                        $name,
                        $format,
                        $key,
                        $value,
                        $other === null ? 'nothing' : (string) $other,
                    );
                }
            }
        }
    }

    return $differences;
}

/**
 * The results file text.
 *
 * PHP indents pretty-printed JSON with four spaces; every other language in
 * this benchmark writes two, so the indentation is halved to keep the results
 * files of the seven languages comparable line by line.
 *
 * @param array<string, mixed> $results
 */
function encodeResults(array $results): string
{
    $json = json_encode(
        $results,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
    );

    $lines = explode("\n", $json);
    foreach ($lines as $position => $line) {
        $indent = strlen($line) - strlen(ltrim($line, ' '));
        $lines[$position] = str_repeat(' ', intdiv($indent, 2)) . substr($line, $indent);
    }

    return implode("\n", $lines) . "\n";
}

function main(): int
{
    $arguments = array_slice($_SERVER['argv'], 1);
    $check = in_array('--check', $arguments, true);
    $verbose = in_array('--verbose', $arguments, true) || getenv('CI_VERBOSE') === 'true';

    $root = benchmarksDirectory();

    $provider = new EncoderProvider();
    $o200k = $provider->get('o200k_base');
    $cl100k = $provider->get('cl100k_base');

    $index = readJson($root, 'generated/index.json');
    $parser = new Parser();

    $datasets = [];
    $totals = [];

    foreach ($index['representations'] as $entry) {
        $files = $entry['files'];
        ksort($files, SORT_STRING);
        $formats = [];
        foreach ($files as $format => $path) {
            $text = readText($root, $path);
            if (str_starts_with($format, 'lino')) {
                // Parsing with this language's own implementation is the point:
                // a document only counts if the notation is portable.
                $parser->parse($text);
            }
            $metrics = measure($text, $o200k, $cl100k);
            $formats[$format] = $metrics;
            foreach (METRIC_KEYS as $key) {
                $totals[$format][$key] = ($totals[$format][$key] ?? 0) + $metrics[$key];
            }
        }

        if ($verbose) {
            fwrite(STDERR, sprintf("%s: measured %d formats\n", $entry['dataset'], count($formats)));
        }

        $datasets[] = [
            'name' => $entry['dataset'],
            'structure' => $entry['structure'],
            'profile' => $entry['profile'],
            'formats' => $formats,
        ];
    }

    ksort($totals, SORT_STRING);

    $results = [
        'schema' => $index['schema'],
        'generator' => LANGUAGE,
        'tokenizers' => ['primary' => 'o200k_base', 'secondary' => 'cl100k_base'],
        'datasets' => $datasets,
        'totals' => $totals,
    ];

    $differences = compare($results, readJson($root, 'results/rust.json'));
    if ($differences !== []) {
        fwrite(STDERR, sprintf(
            "%s: %d measurement(s) differ from the Rust results:\n",
            LANGUAGE,
            count($differences),
        ));
        foreach (array_slice($differences, 0, 20) as $difference) {
            fwrite(STDERR, '  - ' . $difference . "\n");
        }

        return 1;
    }

    $text = encodeResults($results);
    $path = 'results/' . LANGUAGE . '.json';
    if ($check) {
        if (readText($root, $path) !== $text) {
            fwrite(STDERR, sprintf(
                "%s is out of date; run php benchmarks/php/benchmark.php\n",
                $path,
            ));

            return 1;
        }
        printf("%s: %s is up to date and agrees with the Rust results.\n", LANGUAGE, $path);

        return 0;
    }

    file_put_contents($root . '/' . $path, $text);
    printf("%s: wrote %s; every measurement agrees with the Rust results.\n", LANGUAGE, $path);

    return 0;
}

exit(main());

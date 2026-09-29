<?php

// Reproduces issue #315 in the PHP port: how the parser behaves on deeply
// nested input. Run: php experiments/issue-315/php-depth.php [shape] [depth] [maxDepth]
// Without arguments it runs every shape in a child process, so a crash in one
// does not hide the others.

require __DIR__ . '/../../php/vendor/autoload.php';

use LinkFoundation\LinksNotation\ParseException;
use LinkFoundation\LinksNotation\Parser;

$shapes = [
    'parens' => fn (int $d) => str_repeat('(', $d) . 'a' . str_repeat(')', $d),
    'values' => fn (int $d) => str_repeat('(a ', $d) . 'b' . str_repeat(')', $d),
    'indent' => fn (int $d) => implode('', array_map(fn ($i) => str_repeat(' ', $i) . "a\n", range(0, $d))),
    'indent2' => fn (int $d) => implode('', array_map(fn ($i) => str_repeat('  ', $i) . "a\n", range(0, $d))),
    'open' => fn (int $d) => str_repeat('(', $d),
    'openValues' => fn (int $d) => str_repeat('(a ', $d),
];

if ($argc >= 3) {
    [, $shape, $depth] = $argv;
    $parser = isset($argv[3]) ? new Parser(maxDepth: (int) $argv[3]) : new Parser();
    $start = microtime(true);
    try {
        $links = $parser->parse($shapes[$shape]((int) $depth));
        printf("%s %s ok (%d links)", $shape, $depth, count($links));
    } catch (ParseException $e) {
        printf("%s %s %s: %s", $shape, $depth, $e::class, json_encode(substr($e->getMessage(), 0, 100)));
    }
    printf(" %.0f ms, peak %.1f MB\n", (microtime(true) - $start) * 1000, memory_get_peak_usage() / 1048576);
    exit(0);
}

$cases = [
    ['parens', 4, 3], ['values', 4, 3], ['indent', 4, 3],
    ['parens', 64], ['values', 64], ['indent', 64],
    ['parens', 65], ['values', 65], ['indent', 65],
    ['indent2', 4, 3], ['indent2', 65],
    ['parens', 100000], ['values', 100000], ['indent', 2000], ['indent2', 2000], ['indent2', 100000],
    ['open', 100000], ['openValues', 100000],
];
foreach ($cases as $case) {
    $command = sprintf('timeout 60 php -d memory_limit=512M %s %s 2>&1', escapeshellarg(__FILE__), implode(' ', $case));
    exec($command, $output, $status);
    $last = $output ? $output[count($output) - 1] : '';
    printf("%-30s exit %3d  %s\n", implode(' ', $case), $status, substr($last, 0, 200));
    $output = [];
}

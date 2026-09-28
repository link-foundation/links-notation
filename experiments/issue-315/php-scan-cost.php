<?php

// Times one call of each of the PHP parser's per-line scanners on
// `(a ` repeated n times (issue #315). Refusing such a document runs each of
// them once per level up to the limit, so one call times 64 is what
// refusing it costs. Run: php experiments/issue-315/php-scan-cost.php [n]

require __DIR__ . '/../../php/vendor/autoload.php';

use LinkFoundation\LinksNotation\Parser;

$n = (int) ($argv[1] ?? 100000);
$text = str_repeat('(a ', $n) . 'b' . str_repeat(')', $n);
$parser = new Parser();
$call = function (string $method, ...$args) use ($parser) {
    $reflection = new ReflectionMethod($parser, $method);
    $start = hrtime(true);
    $reflection->invoke($parser, ...$args);
    printf("%-28s %8.1f ms\n", $method, (hrtime(true) - $start) / 1e6);
};
$call('splitLinesRespectingQuotes', $text, 0);
$call('findMatchingParen', $text, 0);
$call('findColonOutsideQuotes', $text);
$inner = substr($text, 1, -1);
$call('extractNextValue', $inner, 2);

<?php
// Run every shared fixture through the PHP binding and list each one that
// differs, instead of stopping at the first (issue #445 porting aid).
// Usage: php check-fixtures.php /path/to/vendor/autoload.php

declare(strict_types=1);

require $argv[1];

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;
use LinkFoundation\LinksNotation\StreamParser;

$root = dirname(__DIR__, 3);
$tree = function (array $links) use (&$tree): array {
    return array_map(fn (Link $l): array => ['id' => $l->id, 'values' => $tree($l->values)], $links);
};
$syntaxTree = function (array $links) use (&$syntaxTree): array {
    return array_map(fn (Link $l): array => [
        'id' => $l->id, 'raw' => $l->getRawId(), 'quote' => $l->getQuote(), 'values' => $syntaxTree($l->values),
    ], $links);
};
$stream = function (string $input): array {
    $s = new StreamParser();
    foreach (mb_str_split($input) as $c) {
        $s->write($c);
    }
    return $s->finish();
};
$failures = 0;
$check = function (string $id, string $what, mixed $expected, callable $actual) use (&$failures): void {
    try {
        $got = $actual();
    } catch (Throwable $e) {
        $got = get_class($e) . ': ' . $e->getMessage();
    }
    if ($got !== $expected) {
        $failures++;
        echo "FAIL $id [$what]\n  expected: " . json_encode($expected) . "\n  actual:   " . json_encode($got) . "\n";
    }
};
$load = fn (string $name): array => json_decode(file_get_contents("$root/parity/$name"), true, flags: JSON_THROW_ON_ERROR);

foreach ($load('text-fixtures.json') as $f) {
    $check($f['id'], 'parse', $f['expected'], fn () => $tree((new Parser())->parse($f['input'])));
    $check($f['id'], 'format', $f['format'], fn () => Formatter::formatLinks((new Parser())->parse($f['input'])));
    $check($f['id'], 'reparse', $f['expected'], fn () => $tree((new Parser())->parse($f['format'])));
    $check($f['id'], 'less', $f['lessParentheses'], fn () => Formatter::formatLinks((new Parser())->parse($f['input']), true));
    $check($f['id'], 'stream', $f['expected'], fn () => $tree($stream($f['input'])));
    $check($f['id'], 'cst-roundtrip', $f['input'], fn () => (string) (new Parser())->parseCst($f['input']));
}
foreach ($load('syntax-fixtures.json') as $f) {
    $check($f['id'], 'links', $f['links'], fn () => $syntaxTree((new Parser())->parse($f['input'])));
    $check($f['id'], 'cst', $f['cst'], fn () => (new Parser())->parseCst($f['input'])->toSExpression());
    $check($f['id'], 'stream', $f['links'], fn () => $syntaxTree($stream($f['input'])));
}
foreach ($load('nested-fixtures.json') as $f) {
    $check($f['id'], 'nested', $f['nested'], fn () => Formatter::formatNested((new Parser())->parse($f['input'])));
}
echo $failures === 0 ? "all shared fixtures pass\n" : "$failures failing checks\n";
exit($failures === 0 ? 0 : 1);

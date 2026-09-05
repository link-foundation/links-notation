<?php

/**
 * Runnable version of the examples from php/README.md.
 *
 * Usage: php examples/php/quick_start.php
 */

declare(strict_types=1);

require __DIR__ . '/../../php/vendor/autoload.php';

use LinkFoundation\LinksNotation\FormatConfig;
use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();

echo "== Basic parsing ==\n";
$input = <<<'LINO'
papa (lovesMama: loves mama)
son lovesMama
daughter lovesMama
all (love mama)
LINO;
foreach ($parser->parse($input) as $link) {
    echo $link, PHP_EOL;
}

echo "\n== Working with links ==\n";
$parent = new Link('parent', [new Link('child1'), new Link('child2')]);
echo $parent, PHP_EOL;
echo $parent->id, PHP_EOL;
echo count($parent->values), PHP_EOL;
echo $parent->format(true), PHP_EOL;

echo "\n== Formatting a document ==\n";
$links = $parser->parse("papa lovesMama\nson lovesMama");
echo Formatter::formatLinks($links), PHP_EOL;
echo Formatter::formatLinks($links, true), PHP_EOL;

echo "\n== Formatting options ==\n";
$link = new Link('id', [new Link('1'), new Link('2'), new Link('3'), new Link('4')]);
echo $link->format(new FormatConfig(maxInlineRefs: 3, preferInline: false)), PHP_EOL;

echo "\n== Nested structures ==\n";
$nested = <<<'LINO'
parent
  child1
  child2
    grandchild
LINO;
echo Formatter::formatLinks($parser->parse($nested)), PHP_EOL;

echo "\n== Multi-quote strings ==\n";
echo Formatter::formatLinks($parser->parse('("simple" \'simple\' `simple`)')), PHP_EOL;
echo Formatter::formatLinks($parser->parse('(""text with " inside"")')), PHP_EOL;
echo Formatter::formatLinks($parser->parse('(```const x = 1;```)')), PHP_EOL;

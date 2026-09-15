<?php

declare(strict_types=1);

/** Print the canonical rendering of every case in issue #288. */

spl_autoload_register(static function (string $class): void {
    $prefix = 'LinkFoundation\\LinksNotation\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/../../../php/src/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($path)) {
        require $path;
    }
});

use LinkFoundation\LinksNotation\Link;
use LinkFoundation\LinksNotation\Parser;

$cases = [
    '(a " " b)', '(a "" b)', "(a '' b)", '(a `` b)',
    '(a "" "" b)', "(a '' '' b)", '(a `` `` b)',
    '(a ""x"" b)', '(a """" b)', '(x "" " "")', '(x \' " \')',
    '("" ("" 1))', '("" (\'\' 1))', '("x" ("" 1))', '("" ("x" 1))',
    '("" x ("" 1))', '("" 1 ("" 1))', '(o: ("" (o: ("" 1))))',
    '(a " b)', '(a """ b)', '("")', '("": 1)', '(a ""  "" b)', '("" "")',
];

function render(Link $node): string
{
    if ($node->values === null || $node->values === []) {
        return '<' . ($node->id ?? '') . '>';
    }
    $head = $node->id === null ? '' : '<' . $node->id . '>: ';

    return '(' . $head . implode(' ', array_map('render', $node->values)) . ')';
}

$parser = new Parser();
foreach ($cases as $case) {
    try {
        $links = $parser->parse($case);
        printf("%-24s => %s\n", $case, implode("\n", array_map('render', $links)));
    } catch (Throwable $e) {
        printf("%-24s => Err(%s: %s)\n", $case, get_class($e), $e->getMessage());
    }
}

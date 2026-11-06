<?php

declare(strict_types=1);

// Only the installed public package's Composer autoloader is used.
require $argv[1];

use LinkFoundation\LinksNotation\Parser;

$parser = new Parser();
$links = $parser->parse('(published: hello world)');
if (count($links) !== 1 || (string) $links[0] !== '(published: hello world)') {
    throw new RuntimeException('Unexpected public PHP parser output');
}
if ($parser->parse((string) $links[0]) != $links) {
    throw new RuntimeException('Public PHP round trip failed');
}
echo "Public Composer parser/formatter consumer passed\n";

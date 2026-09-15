<?php

// Print what the PHP implementation makes of the document.

declare(strict_types=1);

require dirname(__DIR__, 3) . '/php/vendor/autoload.php';

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;

$document = file_get_contents(__DIR__ . '/document.lino');
echo Formatter::formatLinks((new Parser())->parse($document)), "\n";

<?php
spl_autoload_register(function ($class) {
    $prefix = 'LinkFoundation\\LinksNotation\\';
    if (str_starts_with($class, $prefix)) {
        require __DIR__ . '/../../php/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    }
});
$docs = ["# a b\n", "# a: b\n", "a: b # note\n", "a#b\n", '"#" a' . "\n", "parent\n  # what the child is for\n  child\n"];
foreach ($docs as $doc) {
    try {
        $links = (new LinkFoundation\LinksNotation\Parser())->parse($doc);
        echo json_encode($doc) . ' -> PARSED [' . implode(' ', array_map(fn ($link) => (string) $link, $links)) . "]\n";
    } catch (Throwable $error) {
        echo json_encode($doc) . ' -> ' . get_class($error) . ': ' . $error->getMessage() . "\n";
    }
}

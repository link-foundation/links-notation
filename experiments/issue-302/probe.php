<?php
spl_autoload_register(function ($class) {
    $prefix = 'LinkFoundation\\LinksNotation\\';
    if (str_starts_with($class, $prefix)) {
        require __DIR__ . '/../../php/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    }
});
$docs = ["# ok line\n# break: two\nci_gate x\n", "a: b: c", "a (b\n", "a b)\n", ":"];
foreach ($docs as $doc) {
    try {
        $links = (new LinkFoundation\LinksNotation\Parser())->parse($doc);
        echo json_encode($doc) . " -> PARSED " . count($links) . " links\n";
    } catch (Throwable $e) {
        echo json_encode($doc) . " -> " . get_class($e) . ": " . $e->getMessage() . "\n";
    }
}

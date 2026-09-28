<?php
// Times the PHP parser on the nesting shapes from #314.
// Usage: php probe.php (from the repository root)
spl_autoload_register(function (string $class): void {
    $prefix = 'LinkFoundation\\LinksNotation\\';
    if (str_starts_with($class, $prefix)) {
        require __DIR__ . '/../../../php/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    }
});
use LinkFoundation\LinksNotation\Parser;

$shapes = [
    'closed' => fn (int $d) => str_repeat('(', $d) . 'a' . str_repeat(')', $d),
    'value after' => fn (int $d) => str_repeat('(', $d) . 'a' . str_repeat(') b', $d),
    'unclosed' => fn (int $d) => str_repeat('(', $d) . 'a',
    'indented' => fn (int $d) => implode("\n", array_map(fn ($i) => str_repeat(' ', $i) . '(a', range(0, $d - 1))),
];
$parser = new Parser();
foreach ($shapes as $name => $shape) {
    printf('%-12s', $name);
    foreach ([2, 4, 8, 12, 16, 20, 24, 64, 256] as $d) {
        $start = microtime(true);
        try {
            $parser->parse($shape($d));
            $outcome = 'ok';
        } catch (Throwable $e) {
            $outcome = get_class($e);
        }
        $elapsed = microtime(true) - $start;
        printf(' %d: %.1f ms (%s),', $d, $elapsed * 1000, $outcome);
        if ($elapsed > 3) {
            break;
        }
    }
    echo "\n";
}

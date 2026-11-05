<?php
// Runs the shared less parentheses corpus without phpunit, for hosts with no composer.
// Usage: php experiments/issue-379/php-less-parentheses.php
spl_autoload_register(function ($class) {
    $prefix = 'LinkFoundation\\LinksNotation\\';
    if (str_starts_with($class, $prefix)) {
        require __DIR__ . '/../../php/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    }
});
use LinkFoundation\LinksNotation\{FormatConfig, Formatter, Parser};
function tree(array $links): array {
    return array_map(fn ($l) => ['id' => $l->id, 'values' => tree($l->values)], $links);
}
$failed = 0;
$fixtures = json_decode(file_get_contents(__DIR__ . '/../../parity/text-fixtures.json'), true, flags: JSON_THROW_ON_ERROR);
foreach ($fixtures as $f) {
    $parsed = (new Parser())->parse($f['input']);
    $bool = Formatter::formatLinks($parsed, true);
    $config = Formatter::formatLinks($parsed, new FormatConfig(lessParentheses: true));
    $back = tree((new Parser())->parse($f['lessParentheses']));
    if ($bool !== $f['lessParentheses'] || $config !== $f['lessParentheses'] || $back != $f['expected']) {
        $failed++;
        echo "FAIL {$f['id']}: bool=[$bool] config=[$config] want=[{$f['lessParentheses']}]\n";
    }
}
echo count($fixtures) . " cases, $failed failed\n";
exit($failed ? 1 : 0);

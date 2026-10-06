<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

use LinkFoundation\Template\Pipeline\WorkflowConcurrency;

$workflow = getenv('WORKFLOW_FILE');
if ($workflow === false || $workflow === '') {
    fwrite(STDERR, "read-job-cancel-in-progress: WORKFLOW_FILE is required\n");
    exit(2);
}

/** @var list<string> $arguments */
$arguments = $_SERVER['argv'] ?? [];
$names = array_slice($arguments, 1);
if ($names === []) {
    $names = array_values(array_filter(
        explode("\n", (string) getenv('JOB_NAMES')),
        static fn (string $name): bool => $name !== '',
    ));
}

try {
    foreach (WorkflowConcurrency::readFile($workflow, $names) as $name => $value) {
        echo $name . "\t" . $value . "\n";
    }
} catch (Throwable $error) {
    fwrite(STDERR, 'read-job-cancel-in-progress: ' . $error->getMessage() . "\n");
    exit(1);
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

use LinkFoundation\Template\Pipeline\Actions;
use LinkFoundation\Template\Pipeline\WorkflowDependencies;

try {
    $workflows = [];
    foreach (glob(__DIR__ . '/../.github/workflows/*.{yml,yaml}', GLOB_BRACE) ?: [] as $file) {
        $content = file_get_contents($file);
        if ($content === false) {
            throw new RuntimeException('Cannot read ' . $file);
        }
        $workflows['.github/workflows/' . basename($file)] = $content;
    }
    if ($workflows === []) {
        throw new RuntimeException('No active workflows found');
    }
    $errors = (new WorkflowDependencies())->check($workflows);
    foreach ($errors as $error) {
        Actions::error($error);
    }
    if ($errors !== []) {
        exit(1);
    }
    echo "All hosted runner images are explicit and workflow dependencies use current stable releases.\n";
} catch (Throwable $error) {
    Actions::error($error->getMessage());
    exit(1);
}

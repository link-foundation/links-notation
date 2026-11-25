<?php
// Recompute what `composer update --lock` would write for the two Composer
// locks that quote this package's version, without Composer installed.
// Usage: php experiments/issue-445/composer-hashes.php <repo root>
$root = $argv[1];

// Composer\Package\Locker::getContentHash
function contentHash(string $json): string {
    $content = json_decode($json, true);
    $relevantKeys = ['name', 'version', 'require', 'require-dev', 'conflict', 'replace', 'provide', 'minimum-stability', 'prefer-stable', 'repositories', 'extra'];
    $relevant = [];
    foreach (array_intersect($relevantKeys, array_keys($content)) as $key) {
        $relevant[$key] = $content[$key];
    }
    if (isset($content['config']['platform'])) {
        $relevant['config']['platform'] = $content['config']['platform'];
    }
    ksort($relevant);
    return md5(json_encode($relevant));
}

$php = file_get_contents("$root/php/composer.json");
echo "php content-hash: ", contentHash($php), "\n";
// Composer\Repository\PathRepository: the dist reference of a path package
// outside git-based versioning is sha1(composer.json . serialize(options)).
$options = ['symlink' => true, 'relative' => true];
echo "path reference (symlink+relative): ", hash('sha1', $php . serialize($options)), "\n";
echo "path reference (symlink): ", hash('sha1', $php . serialize(['symlink' => true])), "\n";
echo "benchmarks content-hash: ", contentHash(file_get_contents("$root/benchmarks/php/composer.json")), "\n";

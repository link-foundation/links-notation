<?php

declare(strict_types=1);

require __DIR__ . '/../../php/vendor/autoload.php';

use LinkFoundation\LinksNotation\Binary\ArityRange;
use LinkFoundation\LinksNotation\Binary\BinaryLinoCodec;
use LinkFoundation\LinksNotation\Binary\Options;

$corpus = explode("\n", rtrim(file_get_contents(__DIR__ . '/corpus.txt'), "\n"));
foreach ($corpus as $source) {
    $text = str_replace('\\n', "\n", $source);
    $document = new BinaryLinoCodec()->parseDocument($text);
    foreach ([false, true] as $external) {
        foreach (['2', '2..3', '1..'] as $arity) {
            foreach ([false, true] as $packed) {
                $codec = new BinaryLinoCodec(new Options($external, ArityRange::parse($arity), $packed));
                $data = $codec->encode($document);
                $decoded = $codec->decode($data);
                if (count($document) !== count($decoded)) {
                    throw new RuntimeException('Document changed');
                }
                foreach ($document as $i => $node) {
                    if (!$node->equals($decoded[$i])) {
                        throw new RuntimeException('Document changed');
                    }
                }
                $formatted = $codec->formatDocument($decoded);
                $reparsed = $codec->parseDocument($formatted);
                if (count($document) !== count($reparsed)) {
                    throw new RuntimeException('Text model changed');
                }
                foreach ($document as $i => $node) {
                    if (!$node->equals($reparsed[$i])) {
                        throw new RuntimeException('Text model changed');
                    }
                }
                echo implode(' ', str_split(bin2hex($data), 2)), "\t", str_replace("\n", '\\n', $formatted), "\n";
            }
        }
    }
}

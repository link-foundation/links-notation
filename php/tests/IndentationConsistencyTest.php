<?php

/**
 * Indentation consistency tests (issue #135) - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class IndentationConsistencyTest extends TestCase
{
    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    private function formatSource(string $source): string
    {
        return Formatter::formatLinks($this->parser->parse($source));
    }

    public function testLeadingSpacesVsNoLeadingSpaces(): void
    {
        $withLeading = "  TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n"
            . "  TELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    -1002861722681\n"
            . "  TELEGRAM_HIVE_OVERRIDES:\n    --all-issues\n    --once\n"
            . '  TELEGRAM_BOT_VERBOSE: true';

        $withoutLeading = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n"
            . "TELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  -1002861722681\n"
            . "TELEGRAM_HIVE_OVERRIDES:\n  --all-issues\n  --once\n"
            . 'TELEGRAM_BOT_VERBOSE: true';

        $this->assertSame($this->formatSource($withoutLeading), $this->formatSource($withLeading));
    }

    public function testTwoSpacesVsFourSpacesIndentation(): void
    {
        $twoSpaces = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n"
            . "TELEGRAM_ALLOWED_CHATS:\n  -1002975819706\n  -1002861722681\n"
            . "TELEGRAM_HIVE_OVERRIDES:\n  --all-issues\n  --once\n  --auto-fork\n"
            . "  --skip-issues-with-prs\n  --attach-logs\n  --verbose\n  --no-tool-check\n"
            . "TELEGRAM_SOLVE_OVERRIDES:\n  --auto-fork\n  --auto-continue\n  --attach-logs\n"
            . "  --verbose\n  --no-tool-check\n"
            . 'TELEGRAM_BOT_VERBOSE: true';

        $fourSpaces = "TELEGRAM_BOT_TOKEN: '849...355:AAG...rgk_YZk...aPU'\n"
            . "TELEGRAM_ALLOWED_CHATS:\n    -1002975819706\n    -1002861722681\n"
            . "TELEGRAM_HIVE_OVERRIDES:\n    --all-issues\n    --once\n    --auto-fork\n"
            . "    --skip-issues-with-prs\n    --attach-logs\n    --verbose\n    --no-tool-check\n"
            . "TELEGRAM_SOLVE_OVERRIDES:\n    --auto-fork\n    --auto-continue\n    --attach-logs\n"
            . "    --verbose\n    --no-tool-check\n"
            . 'TELEGRAM_BOT_VERBOSE: true';

        $this->assertSame($this->formatSource($fourSpaces), $this->formatSource($twoSpaces));
    }

    public function testSimpleTwoVsFourSpacesIndentation(): void
    {
        $twoSpaces = "parent:\n  child1\n  child2";
        $fourSpaces = "parent:\n    child1\n    child2";

        $this->assertSame($this->formatSource($fourSpaces), $this->formatSource($twoSpaces));
    }

    public function testThreeLevelNestingWithDifferentIndentation(): void
    {
        $twoSpaces = "level1:\n  level2:\n    level3a\n    level3b\n  level2b";
        $fourSpaces = "level1:\n    level2:\n        level3a\n        level3b\n    level2b";

        $this->assertSame($this->formatSource($fourSpaces), $this->formatSource($twoSpaces));
    }
}

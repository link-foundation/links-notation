<?php

/**
 * Mixed indentation modes tests - ported from the Python implementation.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation\Tests;

use LinkFoundation\LinksNotation\Formatter;
use LinkFoundation\LinksNotation\Parser;
use PHPUnit\Framework\TestCase;

class MixedIndentationModesTest extends TestCase
{
    private const HERO_VERSION_1 = "empInfo\n  employees:\n"
        . "    (\n      name (James Kirk)\n      age 40\n    )\n"
        . "    (\n      name (Jean-Luc Picard)\n      age 45\n    )\n"
        . "    (\n      name (Wesley Crusher)\n      age 27\n    )";

    private const HERO_VERSION_2 = "empInfo\n  (\n    employees:\n"
        . "      (\n        name (James Kirk)\n        age 40\n      )\n"
        . "      (\n        name (Jean-Luc Picard)\n        age 45\n      )\n"
        . "      (\n        name (Wesley Crusher)\n        age 27\n      )\n  )";

    private Parser $parser;

    protected function setUp(): void
    {
        $this->parser = new Parser();
    }

    private function formatSource(string $source): string
    {
        return Formatter::formatLinks($this->parser->parse($source));
    }

    public function testHeroExampleMixedModes(): void
    {
        $formatted = $this->formatSource(self::HERO_VERSION_1);

        $this->assertStringContainsString('empInfo', $formatted);
        $this->assertStringContainsString('employees:', $formatted);
        $this->assertStringContainsString('James Kirk', $formatted);
        $this->assertStringContainsString('Jean-Luc Picard', $formatted);
        $this->assertStringContainsString('Wesley Crusher', $formatted);
    }

    public function testHeroExampleAlternativeFormat(): void
    {
        $formatted = $this->formatSource(self::HERO_VERSION_2);

        $this->assertStringContainsString('empInfo', $formatted);
        $this->assertStringContainsString('employees:', $formatted);
        $this->assertStringContainsString('James Kirk', $formatted);
        $this->assertStringContainsString('Jean-Luc Picard', $formatted);
        $this->assertStringContainsString('Wesley Crusher', $formatted);
    }

    public function testHeroExampleEquivalence(): void
    {
        $this->assertSame($this->formatSource(self::HERO_VERSION_1), $this->formatSource(self::HERO_VERSION_2));
    }

    public function testSetContextWithoutColon(): void
    {
        $formatted = $this->formatSource("empInfo\n  employees");

        $this->assertStringContainsString('empInfo', $formatted);
        $this->assertStringContainsString('employees', $formatted);
    }

    public function testSequenceContextWithColon(): void
    {
        $input = "employees:\n  James Kirk\n  Jean-Luc Picard\n  Wesley Crusher";
        $result = $this->parser->parse($input);
        $this->assertCount(1, $result);

        $formatted = Formatter::formatLinks($result);
        $this->assertStringContainsString('employees:', $formatted);
        $this->assertStringContainsString('James Kirk', $formatted);
        $this->assertStringContainsString('Jean-Luc Picard', $formatted);
        $this->assertStringContainsString('Wesley Crusher', $formatted);
    }

    public function testSequenceContextWithComplexValues(): void
    {
        $input = "employees:\n  (\n    name (James Kirk)\n    age 40\n  )\n"
            . "  (\n    name (Jean-Luc Picard)\n    age 45\n  )";
        $result = $this->parser->parse($input);
        $this->assertCount(1, $result);

        $formatted = Formatter::formatLinks($result);
        $this->assertStringContainsString('employees:', $formatted);
        $this->assertStringContainsString('James Kirk', $formatted);
        $this->assertStringContainsString('Jean-Luc Picard', $formatted);
    }

    public function testNestedSetAndSequenceContexts(): void
    {
        $input = "company\n  departments:\n    engineering\n    sales\n  employees:\n    (name John)\n    (name Jane)";
        $formatted = $this->formatSource($input);

        $this->assertStringContainsString('company', $formatted);
        $this->assertStringContainsString('departments:', $formatted);
        $this->assertStringContainsString('employees:', $formatted);
    }

    public function testDeeplyNestedMixedModes(): void
    {
        $input = "root\n  level1\n    level2:\n      value1\n      value2\n    level2b\n      level3";
        $formatted = $this->formatSource($input);

        $this->assertStringContainsString('root', $formatted);
        $this->assertStringContainsString('level2:', $formatted);
    }
}

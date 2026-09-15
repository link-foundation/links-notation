<?php

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

use Generator;
use InvalidArgumentException;
use LogicException;

/** Incrementally emits complete top-level Links Notation records. */
class StreamParser
{
    private const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
    private const BEFORE_REFERENCE = " \t\n\r(:";
    private const BEFORE_COMMENT = " \t\n\r";

    private Parser $parser;
    private mixed $onLink;
    private bool $collect;
    private int $maxBufferSize;
    private string $buffer = '';
    private string $currentLine = '';
    private ?int $baseIndentation = null;
    private bool $lineClassified = false;
    /** @var Link[] */
    private array $links = [];
    private int $offset = 0;
    private int $line = 1;
    private int $column = 1;
    private int $segmentOffset = 0;
    private int $segmentLine = 1;
    private bool $ended = false;

    public function __construct(
        ?Parser $parser = null,
        ?callable $onLink = null,
        bool $collect = true,
        ?int $maxBufferSize = null
    ) {
        $this->parser = $parser ?? new Parser();
        $this->onLink = $onLink;
        $this->collect = $collect;
        $this->maxBufferSize = $maxBufferSize ?? min(self::DEFAULT_MAX_BUFFER_SIZE, $this->parser->maxInputSize);
        if ($this->maxBufferSize < 1) {
            throw new InvalidArgumentException('Maximum buffer size must be positive');
        }
        $this->reset();
    }

    /** Register a callback invoked for each completed link. */
    public function onLink(?callable $callback): self
    {
        $this->onLink = $callback;

        return $this;
    }

    /**
     * Consume a chunk and return the links made complete by it.
     *
     * @return Link[]
     */
    public function write(string $chunk): array
    {
        if ($this->ended) {
            throw new LogicException('Cannot write after finish()');
        }

        $emitted = [];
        $length = strlen($chunk);
        for ($index = 0; $index < $length; $index++) {
            $character = $chunk[$index];
            $this->currentLine .= $character;
            $this->offset++;

            if ($character === "\n") {
                $this->buffer .= $this->currentLine;
                $this->currentLine = '';
                $this->lineClassified = false;
                $this->line++;
                $this->column = 1;
            } else {
                if (!$this->lineClassified && !str_contains(" \t\r", $character)) {
                    $this->lineClassified = true;
                    if (!($this->parser->comments && $character === Comments::COMMENT)) {
                        $this->startContentLine(self::leadingSpaces($this->currentLine), $emitted);
                    }
                }
                $this->column++;
            }

            if (strlen($this->buffer) + strlen($this->currentLine) > $this->maxBufferSize) {
                throw new InvalidArgumentException(
                    "Buffered record exceeds maximum size of {$this->maxBufferSize} bytes"
                );
            }
        }

        return $emitted;
    }

    /**
     * Finish the stream and return all undrained or newly emitted links.
     *
     * @return Link[]
     */
    public function finish(string $chunk = ''): array
    {
        if ($this->ended) {
            if ($chunk !== '') {
                throw new LogicException('Cannot write after finish()');
            }

            return $this->collect ? $this->links : [];
        }

        $emitted = $chunk === '' ? [] : $this->write($chunk);
        $document = $this->buffer . $this->currentLine;
        if ($document !== '') {
            try {
                $links = $this->parser->parse($document);
            } catch (ParseException $error) {
                throw new StreamParseException($error, $this->segmentOffset, $this->segmentLine, 1);
            }
            $this->publish($links, $emitted);
            $this->advanceSegment($document);
        }

        $this->buffer = '';
        $this->currentLine = '';
        $this->baseIndentation = null;
        $this->ended = true;

        return $this->collect ? $this->links : $emitted;
    }

    /** @return Link[] Return and forget retained links. */
    public function drain(): array
    {
        $links = $this->links;
        $this->links = [];

        return $links;
    }

    /** Reuse this parser while retaining configuration and its callback. */
    public function reset(): self
    {
        $this->buffer = '';
        $this->currentLine = '';
        $this->baseIndentation = null;
        $this->lineClassified = false;
        $this->links = [];
        $this->offset = 0;
        $this->line = 1;
        $this->column = 1;
        $this->segmentOffset = 0;
        $this->segmentLine = 1;
        $this->ended = false;

        return $this;
    }

    /** @return array{offset: int, line: int, column: int, buffered: int} */
    public function position(): array
    {
        return [
            'offset' => $this->offset,
            'line' => $this->line,
            'column' => $this->column,
            'buffered' => strlen($this->buffer) + strlen($this->currentLine),
        ];
    }

    /**
     * Lazily parse an iterable of chunks using a native generator.
     *
     * @param iterable<string> $chunks
     * @return Generator<int, Link>
     */
    public static function parseChunks(iterable $chunks, ?Parser $parser = null): Generator
    {
        $stream = new self($parser, collect: false);
        foreach ($chunks as $chunk) {
            foreach ($stream->write($chunk) as $link) {
                yield $link;
            }
        }
        foreach ($stream->finish() as $link) {
            yield $link;
        }
    }

    /** @param Link[] $emitted */
    private function startContentLine(int $indentation, array &$emitted): void
    {
        if (
            $this->buffer !== ''
            && $this->baseIndentation !== null
            && $indentation <= $this->baseIndentation
            && self::structurallyComplete($this->buffer, $this->parser->comments)
        ) {
            try {
                $links = $this->parser->parse($this->buffer);
                $this->publish($links, $emitted);
                $this->advanceSegment($this->buffer);
                $this->buffer = '';
                $this->baseIndentation = null;
            } catch (ParseException) {
                // A rejected prefix may become valid when more input arrives.
            }
        }

        if ($this->baseIndentation === null) {
            $this->baseIndentation = $indentation;
        }
    }

    /** @param Link[] $links @param Link[] $emitted */
    private function publish(array $links, array &$emitted): void
    {
        foreach ($links as $link) {
            $emitted[] = $link;
            if ($this->collect) {
                $this->links[] = $link;
            }
            if ($this->onLink !== null) {
                ($this->onLink)($link);
            }
        }
    }

    private function advanceSegment(string $document): void
    {
        $this->segmentOffset += strlen($document);
        $this->segmentLine += substr_count($document, "\n");
    }

    private static function leadingSpaces(string $line): int
    {
        return strlen($line) - strlen(ltrim($line, ' '));
    }

    private static function structurallyComplete(string $document, bool $comments): bool
    {
        $depth = 0;
        $length = strlen($document);
        for ($position = 0; $position < $length; $position++) {
            $character = $document[$position];
            if (self::isQuote($character) && self::follows($document, $position, self::BEFORE_REFERENCE)) {
                $end = Parser::quotedReferenceEnd($document, $position);
                if ($end < 0) {
                    return false;
                }
                $position = $end - 1;
                continue;
            }
            if (
                $comments
                && $character === Comments::COMMENT
                && self::follows($document, $position, self::BEFORE_COMMENT)
            ) {
                $newline = strpos($document, "\n", $position);
                if ($newline === false) {
                    break;
                }
                $position = $newline;
                continue;
            }
            if ($character === '(') {
                $depth++;
            } elseif ($character === ')') {
                $depth--;
            }
        }

        return $depth === 0;
    }

    private static function isQuote(string $character): bool
    {
        return $character === '"' || $character === "'" || $character === '`';
    }

    private static function follows(string $document, int $position, string $allowed): bool
    {
        return $position === 0 || str_contains($allowed, $document[$position - 1]);
    }
}

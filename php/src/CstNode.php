<?php

/**
 * One node or token of the concrete syntax tree of a Links Notation document.
 */

declare(strict_types=1);

namespace LinkFoundation\LinksNotation;

use Stringable;

/**
 * One node or token of a concrete syntax tree.
 *
 * Every character of a document belongs to exactly one token, so the text of
 * the tree is the document itself, comments, blank lines, indentation, quotes
 * and line endings included. A document is a list of `line` nodes; a line holds
 * the tokens up to and including its line ending, and a parenthesized `group`
 * node holds its own parentheses and the lines written between them. A group is
 * part of the line it opens on, however many lines it spans.
 *
 * The tree records how a document was written; Parser::parse() reads what it
 * means. Read one with Parser::parseCst().
 */
class CstNode implements Stringable
{
    /** @var string One of the CstKind constants. */
    public string $kind;

    /** @var CstNode[] The children of a node, in document order; empty for a token. */
    public array $children;

    /**
     * @var string|null What a reference token means, its delimiters and escapes
     *                  resolved (the ID a parsed link has); null for every other
     *                  node and token.
     */
    public ?string $value;

    /**
     * @var string|null The delimiter a quoted reference token was written
     *                  between (`'`, `"` or `` ` ``); null for a bare or
     *                  literal reference and every other kind.
     */
    public ?string $quote;

    /** @var string A token's text exactly as written; empty for a node. */
    private string $tokenText;

    /**
     * @param string      $kind     One of the CstKind constants
     * @param string      $text     A token's text exactly as written
     * @param CstNode[]   $children A node's children
     * @param string|null $value    What a reference token means
     * @param string|null $quote    The delimiter of a quoted reference token
     */
    public function __construct(
        string $kind,
        string $text = '',
        array $children = [],
        ?string $value = null,
        ?string $quote = null
    ) {
        $this->kind = $kind;
        $this->tokenText = $text;
        $this->children = $children;
        $this->value = $value;
        $this->quote = $quote;
    }

    /**
     * Whether this is a token rather than a node with children.
     */
    public function isToken(): bool
    {
        return !in_array($this->kind, CstKind::NODES, true);
    }

    /**
     * The exact text this node or token was read from.
     */
    public function text(): string
    {
        if ($this->isToken()) {
            return $this->tokenText;
        }

        return implode('', array_map(static fn (CstNode $child): string => $child->text(), $this->children));
    }

    /**
     * The exact text this node or token was read from.
     */
    public function __toString(): string
    {
        return $this->text();
    }

    /**
     * Every token of this subtree, in document order.
     *
     * @return CstNode[]
     */
    public function tokens(): array
    {
        if ($this->isToken()) {
            return [$this];
        }

        $tokens = [];
        foreach ($this->children as $child) {
            array_push($tokens, ...$child->tokens());
        }

        return $tokens;
    }

    /**
     * The tree as an S-expression: `(kind child ...)` for a node and
     * `kind:"text"` for a token, with `\`, `"`, line feeds, carriage returns
     * and tabs escaped and every other character, non-ASCII included, written
     * as it is. Two trees are the same exactly when their S-expressions are.
     *
     * `(new Parser())->parseCst("a '1'")->toSExpression()` gives
     * `(document (line reference:"a" whitespace:" " reference:"'1'"))`.
     */
    public function toSExpression(): string
    {
        if ($this->isToken()) {
            return $this->kind . ':"' . strtr($this->tokenText, [
                '\\' => '\\\\',
                '"' => '\\"',
                "\n" => '\\n',
                "\r" => '\\r',
                "\t" => '\\t',
            ]) . '"';
        }

        $parts = [$this->kind];
        foreach ($this->children as $child) {
            $parts[] = $child->toSExpression();
        }

        return '(' . implode(' ', $parts) . ')';
    }
}

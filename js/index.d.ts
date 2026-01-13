/**
 * TypeScript type definitions for links-notation
 *
 * This module provides TypeScript type definitions for the Links Notation parser.
 * Links Notation is a format for representing relationships between entities.
 */

/**
 * Represents a link with an optional identifier and values.
 *
 * A Link can represent:
 * - A simple reference: `new Link('id')`
 * - A link with values: `new Link('id', [new Link('child1'), new Link('child2')])`
 * - A link without an id: `new Link(null, [...])`
 */
export class Link {
  /**
   * Optional identifier for the link
   */
  id: string | null;

  /**
   * Array of child links/values
   */
  values: Link[];

  /**
   * Create a new Link
   * @param id - Optional identifier for the link
   * @param values - Optional array of nested links
   * @throws {TypeError} If values is not an array or null
   */
  constructor(id?: string | null, values?: Link[] | null);

  /**
   * Convert link to string representation
   * @returns String representation of the link
   */
  toString(): string;

  /**
   * Get formatted string of all values
   * @returns Space-separated string of values
   */
  getValuesString(): string;

  /**
   * Simplify the link structure by unwrapping single-value containers
   * @returns Simplified link
   */
  simplify(): Link;

  /**
   * Combine this link with another link
   * @param other - The link to combine with
   * @returns Combined link
   */
  combine(other: Link): Link;

  /**
   * Convert to string using either just ID or full format
   * @returns String representation
   */
  toLinkOrIdString(): string;

  /**
   * Check equality with another Link
   * @param other - Object to compare with
   * @returns True if links are equal
   */
  equals(other: any): boolean;

  /**
   * Format the link as a string
   * @param lessParentheses - If true, omit parentheses where safe; or a FormatOptions/FormatConfig object
   * @param isCompoundValue - If true, this is a value in a compound link
   * @returns Formatted string
   */
  format(
    lessParentheses?: boolean | FormatOptions | FormatConfig,
    isCompoundValue?: boolean
  ): string;

  /**
   * Check if a string needs to be wrapped in parentheses
   * @param str - The string to check
   * @returns True if parentheses are needed
   */
  needsParentheses(str: string): boolean;

  /**
   * Get string representation of a value
   * @param value - The value to stringify
   * @returns String representation
   */
  static getValueString(value: Link): string;

  /**
   * Escape a reference string by adding quotes if necessary
   * @param reference - The reference to escape
   * @returns Escaped reference
   */
  static escapeReference(reference: string): string;
}

/**
 * Parser options for configuring the parser behavior
 */
export interface ParserOptions {
  /**
   * Maximum input size in bytes (default: 10MB)
   */
  maxInputSize?: number;

  /**
   * Maximum nesting depth (default: 1000)
   */
  maxDepth?: number;
}

/**
 * Parser for Links Notation format
 *
 * The Parser class converts Links Notation strings into Link objects.
 */
export class Parser {
  /**
   * Maximum input size in bytes
   */
  maxInputSize: number;

  /**
   * Maximum nesting depth
   */
  maxDepth: number;

  /**
   * Create a new Parser instance
   * @param options - Parser options
   */
  constructor(options?: ParserOptions);

  /**
   * Parse Lino notation text into Link objects
   * @param input - The Lino notation text to parse
   * @returns Array of parsed Link objects
   * @throws {Error} If parsing fails
   */
  parse(input: string): Link[];
}

/**
 * Options for formatting links
 */
export interface FormatOptionsConfig {
  /**
   * If true, omit parentheses where safe (default: false)
   */
  lessParentheses?: boolean;

  /**
   * Maximum line length before auto-indenting (default: 80)
   */
  maxLineLength?: number;

  /**
   * If true, indent lines exceeding maxLineLength (default: false)
   */
  indentLongLines?: boolean;

  /**
   * Maximum number of references before auto-indenting (default: null)
   */
  maxInlineRefs?: number | null;

  /**
   * If true, group consecutive links with same ID (default: false)
   */
  groupConsecutive?: boolean;

  /**
   * String to use for indentation (default: "  ")
   */
  indentString?: string;

  /**
   * If true, prefer inline format when under thresholds (default: true)
   */
  preferInline?: boolean;
}

/**
 * FormatOptions for Lino notation formatting.
 *
 * Provides configuration options for controlling how Link objects are formatted.
 */
export class FormatOptions {
  /**
   * If true, omit parentheses where safe
   */
  lessParentheses: boolean;

  /**
   * Maximum line length before auto-indenting
   */
  maxLineLength: number;

  /**
   * If true, indent lines exceeding maxLineLength
   */
  indentLongLines: boolean;

  /**
   * Maximum number of references before auto-indenting
   */
  maxInlineRefs: number | null;

  /**
   * If true, group consecutive links with same ID
   */
  groupConsecutive: boolean;

  /**
   * String to use for indentation
   */
  indentString: string;

  /**
   * If true, prefer inline format when under thresholds
   */
  preferInline: boolean;

  /**
   * Create a new FormatOptions instance
   * @param options - Configuration options
   */
  constructor(options?: FormatOptionsConfig);

  /**
   * Check if line should be indented based on length
   * @param line - The line to check
   * @returns True if line should be indented based on length threshold
   */
  shouldIndentByLength(line: string): boolean;

  /**
   * Check if link should be indented based on reference count
   * @param refCount - Number of references in the link
   * @returns True if link should be indented based on reference count threshold
   */
  shouldIndentByRefCount(refCount: number): boolean;
}

/**
 * FormatConfig is an alias for FormatOptions to maintain API consistency
 * with the Python implementation.
 *
 * This is an alias for FormatOptions to maintain API consistency across languages.
 * Python uses 'FormatConfig', so this export provides the same name for JavaScript.
 */
export class FormatConfig extends FormatOptions {
  /**
   * Create a new FormatConfig instance
   * @param options - Configuration options
   */
  constructor(options?: FormatOptionsConfig);
}

/**
 * Container for grouping related links
 */
export class LinksGroup {
  /**
   * The element associated with this group
   */
  element: any;

  /**
   * Child groups or links
   */
  children: (LinksGroup | Link)[];

  /**
   * Create a new LinksGroup
   * @param element - The element for this group
   * @param children - Optional array of child groups or links
   */
  constructor(element: any, children?: (LinksGroup | Link)[]);

  /**
   * Convert the group to a flat list
   * @returns Flattened list of elements
   */
  toList(): any[];

  /**
   * Convert the group to a string representation
   * @returns String representation of the group
   */
  toString(): string;
}

/**
 * Format an array of links as a string
 * @param links - Array of links to format
 * @param lessParentheses - If true, omit parentheses where safe; or a FormatOptions/FormatConfig object
 * @returns Formatted string with each link on a new line
 */
export function formatLinks(
  links: Link[],
  lessParentheses?: boolean | FormatOptions | FormatConfig
): string;

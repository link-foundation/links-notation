import { DEFAULT_PUNCTUATION_SYMBOLS, DEFAULT_MATH_SYMBOLS } from './Parser.js';

/**
 * FormatOptions for Lino notation formatting.
 *
 * Provides configuration options for controlling how Link objects are formatted.
 */
export class FormatOptions {
  /**
   * Create a new FormatOptions instance
   * @param {Object} options - Configuration options
   * @param {boolean} [options.lessParentheses=false] - If true, omit parentheses where safe
   * @param {number} [options.maxLineLength=80] - Maximum line length before auto-indenting
   * @param {boolean} [options.indentLongLines=false] - If true, indent lines exceeding maxLineLength
   * @param {number|null} [options.maxInlineRefs=null] - Maximum number of references before auto-indenting
   * @param {boolean} [options.groupConsecutive=false] - If true, group consecutive links with same ID
   * @param {string} [options.indentString="  "] - String to use for indentation
   * @param {boolean} [options.preferInline=true] - If true, prefer inline format when under thresholds
   * @param {boolean} [options.compactSymbols=false] - If true, format output with no spaces around punctuation/math symbols
   * @param {string[]} [options.punctuationSymbols] - Symbols to compact around (default: [',', '.', ';', '!', '?'])
   * @param {string[]} [options.mathSymbols] - Math symbols to compact around (default: ['+', '-', '*', '/', '=', '<', '>', '%', '^'])
   */
  constructor(options = {}) {
    this.lessParentheses = options.lessParentheses ?? false;
    this.maxLineLength = options.maxLineLength ?? 80;
    this.indentLongLines = options.indentLongLines ?? false;
    this.maxInlineRefs = options.maxInlineRefs ?? null;
    this.groupConsecutive = options.groupConsecutive ?? false;
    this.indentString = options.indentString ?? "  ";
    this.preferInline = options.preferInline ?? true;
    this.compactSymbols = options.compactSymbols ?? false;
    this.punctuationSymbols = options.punctuationSymbols ?? DEFAULT_PUNCTUATION_SYMBOLS;
    this.mathSymbols = options.mathSymbols ?? DEFAULT_MATH_SYMBOLS;
  }

  /**
   * Check if line should be indented based on length
   * @param {string} line - The line to check
   * @returns {boolean} True if line should be indented based on length threshold
   */
  shouldIndentByLength(line) {
    if (!this.indentLongLines) {
      return false;
    }
    // Count printable unicode characters
    return line.length > this.maxLineLength;
  }

  /**
   * Check if link should be indented based on reference count
   * @param {number} refCount - Number of references in the link
   * @returns {boolean} True if link should be indented based on reference count threshold
   */
  shouldIndentByRefCount(refCount) {
    if (this.maxInlineRefs === null) {
      return false;
    }
    return refCount > this.maxInlineRefs;
  }

  /**
   * Compact symbols in the formatted output by removing spaces around punctuation and math symbols.
   * Only called when compactSymbols is true.
   * @param {string} output - The formatted output string
   * @returns {string} Output with spaces around symbols removed
   */
  compactOutput(output) {
    if (!this.compactSymbols) {
      return output;
    }

    const allSymbols = new Set([...this.punctuationSymbols, ...this.mathSymbols]);
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let i = 0;

    while (i < output.length) {
      const char = output[i];

      // Handle quote toggling
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        result += char;
        i++;
        continue;
      }
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        result += char;
        i++;
        continue;
      }

      // If inside quotes, preserve as-is
      if (inSingleQuote || inDoubleQuote) {
        result += char;
        i++;
        continue;
      }

      // Check if this is a space that should be removed
      if (char === ' ') {
        // Check if previous or next char is a symbol
        const prevChar = result.length > 0 ? result[result.length - 1] : '';
        const nextChar = i + 1 < output.length ? output[i + 1] : '';

        // Skip space if it's between a word and a symbol, or between symbols
        // But keep space if both prev and next are non-symbols (regular word separation)
        if (allSymbols.has(prevChar) || allSymbols.has(nextChar)) {
          i++;
          continue;
        }
      }

      result += char;
      i++;
    }

    return result;
  }
}

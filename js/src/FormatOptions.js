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
   */
  constructor(options = {}) {
    this.lessParentheses = options.lessParentheses ?? false;
    this.maxLineLength = options.maxLineLength ?? 80;
    this.indentLongLines = options.indentLongLines ?? false;
    this.maxInlineRefs = options.maxInlineRefs ?? null;
    this.groupConsecutive = options.groupConsecutive ?? false;
    this.indentString = options.indentString ?? "  ";
    this.preferInline = options.preferInline ?? true;
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
}

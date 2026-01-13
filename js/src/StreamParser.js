import { EventEmitter } from 'events';
import { Link } from './Link.js';
import * as parserModule from './parser-generated.js';

/**
 * Streaming parser for Links Notation
 *
 * This class allows you to parse Links Notation incrementally,
 * processing data as it arrives without loading the entire message
 * into memory.
 *
 * @extends EventEmitter
 *
 * @example
 * const parser = new StreamParser();
 *
 * parser.on('link', (link) => {
 *   console.log('Parsed link:', link);
 * });
 *
 * parser.on('error', (error) => {
 *   console.error(`Error at line ${error.line}, col ${error.column}: ${error.message}`);
 * });
 *
 * // Feed data incrementally
 * parser.write('papa (lovesMama: ');
 * parser.write('loves mama)\n');
 * parser.write('son lovesMama\n');
 *
 * // Finish parsing
 * const links = parser.end();
 */
export class StreamParser extends EventEmitter {
  /**
   * Create a new StreamParser
   * @param {Object} options - Parser options
   * @param {number} options.maxInputSize - Maximum input size in bytes (default: 10MB)
   * @param {number} options.maxDepth - Maximum nesting depth (default: 1000)
   */
  constructor(options = {}) {
    super();
    this.buffer = '';
    this.maxInputSize = options.maxInputSize || 10 * 1024 * 1024; // 10MB default
    this.maxDepth = options.maxDepth || 1000;
    this.lineOffset = 1;
    this.charOffset = 0;
    this.pendingLinks = [];
    this.totalBytesWritten = 0;
  }

  /**
   * Write a chunk of data to the parser
   *
   * This method attempts to parse complete links from the buffer.
   * Links are parsed incrementally line-by-line when possible.
   *
   * @param {string} chunk - The data chunk to write
   * @throws {Error} If input size exceeds maximum allowed size
   */
  write(chunk) {
    if (typeof chunk !== 'string') {
      const error = this._createError('Input must be a string');
      this.emit('error', error);
      throw error;
    }

    this.totalBytesWritten += chunk.length;
    if (this.totalBytesWritten > this.maxInputSize) {
      const error = this._createError(
        `Input size exceeds maximum allowed size of ${this.maxInputSize} bytes`
      );
      this.emit('error', error);
      throw error;
    }

    this.buffer += chunk;
    this._tryParseIncremental();
  }

  /**
   * Try to parse complete links from the buffer incrementally
   * @private
   */
  _tryParseIncremental() {
    // Try to parse line by line for simple cases
    // We look for complete lines (ending with \n)
    let newlinePos;
    while ((newlinePos = this.buffer.indexOf('\n')) !== -1) {
      const lineWithNewline = this.buffer.substring(0, newlinePos + 1);

      // Check if this line looks complete (not part of a multi-line structure)
      // We do a simple heuristic: count open/close parens
      const openParens = (lineWithNewline.match(/\(/g) || []).length;
      const closeParens = (lineWithNewline.match(/\)/g) || []).length;

      // If parens are balanced and we have a complete line, try to parse it
      if (openParens === closeParens) {
        try {
          const rawResult = parserModule.parse(lineWithNewline);
          const links = this._transformResult(rawResult);

          // Successfully parsed the line
          for (const link of links) {
            this.pendingLinks.push(link);
            this.emit('link', link);
          }

          // Remove the parsed line from buffer
          this.buffer = this.buffer.substring(newlinePos + 1);
          this.lineOffset += 1;
          this.charOffset = 0;
          continue;
        } catch (error) {
          // If parsing fails, it might be part of a larger structure
          // Break and wait for more data
          break;
        }
      }

      // If we can't parse this line yet, break and wait for more data
      break;
    }
  }

  /**
   * Finish parsing and return all parsed links
   *
   * This method should be called after all data has been written.
   * It attempts to parse any remaining data in the buffer.
   *
   * @returns {Link[]} Array of all parsed links
   * @throws {Error} If there is unparsed data in the buffer or if the final parse fails
   */
  end() {
    // If there's any remaining data in the buffer, try to parse it
    if (this.buffer.length > 0) {
      const remaining = this.buffer.trim();
      if (remaining.length > 0) {
        try {
          const rawResult = parserModule.parse(remaining);
          const links = this._transformResult(rawResult);

          for (const link of links) {
            this.pendingLinks.push(link);
            this.emit('link', link);
          }

          this.buffer = '';
        } catch (error) {
          const parseError = this._createError(
            `Failed to parse remaining data: ${error.message}`,
            error.location
          );
          this.emit('error', parseError);
          throw parseError;
        }
      }
    }

    return this.pendingLinks;
  }

  /**
   * Transform parsed result into Link objects
   * @private
   * @param {*} rawResult - Raw result from parser
   * @returns {Link[]} Array of Link objects
   */
  _transformResult(rawResult) {
    const links = [];
    const items = Array.isArray(rawResult) ? rawResult : [rawResult];

    for (const item of items) {
      if (item !== null && item !== undefined) {
        this._collectLinks(item, [], links);
      }
    }
    return links;
  }

  /**
   * Collect links from parsed items
   * @private
   */
  _collectLinks(item, parentPath, result) {
    if (item === null || item === undefined) return;

    // For items with children (indented structure)
    if (item.children && item.children.length > 0) {
      // Special case: If this is an ID with empty values but has children,
      // the children should become the values of the link (indented ID syntax)
      if (item.id && (!item.values || item.values.length === 0)) {
        const childValues = item.children.map((child) => {
          if (child.values && child.values.length === 1) {
            return this._transformLink(child.values[0]);
          }
          return this._transformLink(child);
        });
        const linkWithChildren = {
          id: item.id,
          values: childValues,
        };
        const currentLink = this._transformLink(linkWithChildren);

        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this._combinePathElements(parentPath, currentLink));
        }
      } else {
        // Regular indented structure
        const currentLink = this._transformLink(item);

        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this._combinePathElements(parentPath, currentLink));
        }

        const newPath = [...parentPath, currentLink];

        for (const child of item.children) {
          this._collectLinks(child, newPath, result);
        }
      }
    } else {
      // Leaf item or item with inline values
      const currentLink = this._transformLink(item);

      if (parentPath.length === 0) {
        result.push(currentLink);
      } else {
        result.push(this._combinePathElements(parentPath, currentLink));
      }
    }
  }

  /**
   * Combine path elements
   * @private
   */
  _combinePathElements(pathElements, current) {
    if (pathElements.length === 0) return current;
    if (pathElements.length === 1) {
      const combined = new Link(null, [pathElements[0], current]);
      combined._isFromPathCombination = true;
      return combined;
    }

    const parentPath = pathElements.slice(0, -1);
    const lastElement = pathElements[pathElements.length - 1];

    let parent = this._combinePathElements(parentPath, lastElement);

    const combined = new Link(null, [parent, current]);
    combined._isFromPathCombination = true;
    return combined;
  }

  /**
   * Transform a parsed item into a Link object
   * @private
   */
  _transformLink(item) {
    if (item === null || item === undefined) return null;

    if (item instanceof Link) {
      return item;
    }

    if (item.id !== undefined && !item.values && !item.children) {
      return new Link(item.id);
    }

    if (item.values && Array.isArray(item.values)) {
      const link = new Link(item.id || null, []);
      link.values = item.values.map((v) => this._transformLink(v));
      return link;
    }

    return new Link(item.id || null, []);
  }

  /**
   * Create an error object with location information
   * @private
   * @param {string} message - Error message
   * @param {Object} location - Location information from parser
   * @returns {Error} Error object with line and column information
   */
  _createError(message, location = null) {
    const error = new Error(message);

    if (location) {
      error.line = location.start?.line || this.lineOffset;
      error.column = location.start?.column || this.charOffset;
      error.offset = location.start?.offset || this.buffer.length;
      error.location = location;
    } else {
      error.line = this.lineOffset;
      error.column = this.charOffset;
      error.offset = this.buffer.length;
    }

    return error;
  }

  /**
   * Get the current parsing position
   * @returns {Object} Object with line, column, and offset information
   */
  position() {
    return {
      line: this.lineOffset,
      column: this.charOffset,
      offset: this.buffer.length,
    };
  }
}

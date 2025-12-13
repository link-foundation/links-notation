import { Link } from './Link.js';
import * as parserModule from './parser-generated.js';

export class Parser {
  /**
   * Create a new Parser instance
   * @param {Object} options - Parser options
   * @param {number} options.maxInputSize - Maximum input size in bytes (default: 10MB)
   * @param {number} options.maxDepth - Maximum nesting depth (default: 1000)
   * @param {boolean} options.enableMultiRefContext - Enable context-aware multi-reference recognition (default: true)
   */
  constructor(options = {}) {
    this.maxInputSize = options.maxInputSize || 10 * 1024 * 1024; // 10MB default
    this.maxDepth = options.maxDepth || 1000;
    this.enableMultiRefContext = options.enableMultiRefContext !== false; // Default true

    // Storage for defined multi-references (keys are joined strings for lookup)
    this.multiRefDefinitions = new Map();
  }

  /**
   * Clear the multi-reference definitions cache
   */
  clearMultiRefDefinitions() {
    this.multiRefDefinitions.clear();
  }

  /**
   * Parse Lino notation text into Link objects
   * @param {string} input - The Lino notation text to parse
   * @returns {Link[]} Array of parsed Link objects
   * @throws {Error} If parsing fails
   */
  parse(input) {
    // Validate input
    if (typeof input !== 'string') {
      throw new TypeError('Input must be a string');
    }

    if (input.length > this.maxInputSize) {
      throw new Error(
        `Input size exceeds maximum allowed size of ${this.maxInputSize} bytes`
      );
    }

    // Clear previous multi-ref definitions for each parse
    this.clearMultiRefDefinitions();

    try {
      const rawResult = parserModule.parse(input);
      return this.transformResult(rawResult);
    } catch (error) {
      // Preserve original error information
      const parseError = new Error(`Parse error: ${error.message}`);
      parseError.cause = error;
      parseError.location = error.location;
      throw parseError;
    }
  }

  transformResult(rawResult) {
    const links = [];
    const items = Array.isArray(rawResult) ? rawResult : [rawResult];

    // First pass: collect all multi-reference definitions
    if (this.enableMultiRefContext) {
      this.collectMultiRefDefinitions(items);
    }

    // Second pass: transform with multi-reference recognition
    for (const item of items) {
      // Use explicit null/undefined check
      if (item !== null && item !== undefined) {
        this.collectLinks(item, [], links);
      }
    }
    return links;
  }

  /**
   * Collect multi-reference definitions from parsed items
   * @param {Array} items - Parsed items from grammar
   */
  collectMultiRefDefinitions(items) {
    for (const item of items) {
      if (item === null || item === undefined) continue;

      // Check if this item has a multi-reference ID (array)
      if (Array.isArray(item.id) && item.id.length > 1) {
        // Store the multi-reference definition
        const key = item.id.join(' ');
        this.multiRefDefinitions.set(key, item.id);
      }

      // Recursively check children
      if (item.children && Array.isArray(item.children)) {
        this.collectMultiRefDefinitions(item.children);
      }

      // Recursively check values (they might contain nested links with multi-ref IDs)
      if (item.values && Array.isArray(item.values)) {
        this.collectMultiRefDefinitions(item.values);
      }
    }
  }

  collectLinks(item, parentPath, result) {
    // Use explicit null/undefined check
    if (item === null || item === undefined) return;

    // For items with children (indented structure)
    if (item.children && item.children.length > 0) {
      // Special case: If this is an ID with empty values but has children,
      // the children should become the values of the link (indented ID syntax)
      if (item.id && (!item.values || item.values.length === 0)) {
        const childValues = item.children.map((child) => {
          // For indented children, extract the actual reference from the child's values
          if (child.values && child.values.length === 1) {
            return this.transformLink(child.values[0]);
          }
          return this.transformLink(child);
        });
        const linkWithChildren = {
          id: item.id,
          values: childValues,
        };
        const currentLink = this.transformLink(linkWithChildren);

        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this.combinePathElements(parentPath, currentLink));
        }
      } else {
        // Regular indented structure - process as before
        const currentLink = this.transformLink(item);

        // Add the link combined with parent path
        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this.combinePathElements(parentPath, currentLink));
        }

        // Process each child with this item in the path
        const newPath = [...parentPath, currentLink];

        for (const child of item.children) {
          this.collectLinks(child, newPath, result);
        }
      }
    } else {
      // Leaf item or item with inline values
      const currentLink = this.transformLink(item);

      if (parentPath.length === 0) {
        result.push(currentLink);
      } else {
        result.push(this.combinePathElements(parentPath, currentLink));
      }
    }
  }

  combinePathElements(pathElements, current) {
    if (pathElements.length === 0) return current;
    if (pathElements.length === 1) {
      const combined = new Link(null, [pathElements[0], current]);
      combined._isFromPathCombination = true;
      return combined;
    }

    // For multiple path elements, we need to build proper nesting
    // The last element in the path should be combined with its parent
    const parentPath = pathElements.slice(0, -1);
    const lastElement = pathElements[pathElements.length - 1];

    // Build the parent structure
    let parent = this.combinePathElements(parentPath, lastElement);

    // Add current element to the built structure
    const combined = new Link(null, [parent, current]);
    combined._isFromPathCombination = true;
    return combined;
  }

  /**
   * Transform a parsed item into a Link object
   * @param {*} item - The item to transform
   * @returns {Link|null} The transformed Link or null
   */
  transformLink(item) {
    // Use explicit null/undefined check
    if (item === null || item === undefined) return null;

    if (item instanceof Link) {
      return item;
    }

    // Handle simple reference objects like {id: 'a'}
    if (item.id !== undefined && !item.values && !item.children) {
      return new Link(item.id);
    }

    // For items with values, create a link with those values
    if (item.values && Array.isArray(item.values)) {
      // Create a link with id (if present) and transformed values
      const link = new Link(item.id || null, []);

      // Apply multi-reference context recognition to values
      if (this.enableMultiRefContext && this.multiRefDefinitions.size > 0) {
        link.values = this.transformValuesWithMultiRefContext(item.values);
      } else {
        link.values = item.values.map((v) => this.transformLink(v));
      }
      return link;
    }

    // Default case
    return new Link(item.id || null, []);
  }

  /**
   * Transform values with multi-reference context recognition
   * Consecutive simple references that form a known multi-reference are combined
   * @param {Array} values - Array of parsed values
   * @returns {Link[]} Array of transformed Link objects
   */
  transformValuesWithMultiRefContext(values) {
    const result = [];
    let i = 0;

    while (i < values.length) {
      const current = values[i];

      // Check if this could be the start of a multi-reference
      if (this.isSimpleReference(current)) {
        // Try to match against known multi-references
        const matchResult = this.tryMatchMultiRef(values, i);

        if (matchResult) {
          // Found a multi-reference match
          result.push(new Link(matchResult.multiRef));
          i += matchResult.consumed;
          continue;
        }
      }

      // No multi-reference match, transform normally
      result.push(this.transformLink(current));
      i++;
    }

    return result;
  }

  /**
   * Check if a parsed item is a simple reference (just an ID, no nested values)
   * @param {*} item - The item to check
   * @returns {boolean} True if it's a simple reference
   */
  isSimpleReference(item) {
    return (
      item &&
      item.id !== undefined &&
      typeof item.id === 'string' &&
      (!item.values || item.values.length === 0) &&
      (!item.children || item.children.length === 0)
    );
  }

  /**
   * Try to match a sequence of references against known multi-references
   * @param {Array} values - Array of values to check
   * @param {number} startIndex - Starting index
   * @returns {Object|null} Match result with multiRef array and consumed count, or null
   */
  tryMatchMultiRef(values, startIndex) {
    // Sort multi-refs by length (longest first) to match greedily
    const sortedMultiRefs = [...this.multiRefDefinitions.entries()].sort(
      (a, b) => b[1].length - a[1].length
    );

    for (const [, multiRefParts] of sortedMultiRefs) {
      // Check if we have enough values left to match
      if (startIndex + multiRefParts.length > values.length) {
        continue;
      }

      // Check if all parts match
      let matches = true;
      for (let j = 0; j < multiRefParts.length; j++) {
        const value = values[startIndex + j];
        if (!this.isSimpleReference(value) || value.id !== multiRefParts[j]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return {
          multiRef: multiRefParts,
          consumed: multiRefParts.length,
        };
      }
    }

    return null;
  }
}

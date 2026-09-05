import { Link } from './Link.js';
import * as parserModule from './parser-generated.js';

export class Parser {
  /**
   * Create a new Parser instance
   * @param {Object} options - Parser options
   * @param {number} options.maxInputSize - Maximum input size in bytes (default: 10MB)
   * @param {number} options.maxDepth - Maximum nesting depth (default: 1000)
   */
  constructor(options = {}) {
    this.maxInputSize = options.maxInputSize || 10 * 1024 * 1024; // 10MB default
    this.maxDepth = options.maxDepth || 1000;
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

    for (const item of items) {
      // Use explicit null/undefined check
      if (item !== null && item !== undefined) {
        this.collectLinks(item, [], links);
      }
    }
    return links;
  }

  collectLinks(item, parentPath, result) {
    // Use explicit null/undefined check
    if (item === null || item === undefined) return;

    // For items with children (indented structure)
    if (item.children && item.children.length > 0) {
      // Special case: If this is an ID with empty values but has children,
      // the children should become the values of the link (indented ID syntax)
      if (
        item.id !== undefined &&
        item.id !== null &&
        (!item.values || item.values.length === 0)
      ) {
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
   * Transform the links of a nested (parenthesised) context into a single Link.
   * The nested context is parsed with the same rules as the root, so it yields
   * a list of links; a single link is used as is, several links become the
   * values of one anonymous link. An already parenthesised single link keeps
   * its own group so that `((a b))` stays distinct from `(a b)`.
   * @param {Array} nested - Raw items parsed inside the parentheses
   * @returns {Link} The link representing the parenthesised group
   */
  transformNested(nested) {
    const nestedLinks = [];
    for (const item of nested) {
      if (item !== null && item !== undefined) {
        this.collectLinks(item, [], nestedLinks);
      }
    }
    const wrapsSingleGroup =
      nested.length === 1 && nested[0] && nested[0].nested !== undefined;
    if (nestedLinks.length === 1 && !wrapsSingleGroup) {
      return nestedLinks[0];
    }
    return new Link(null, nestedLinks);
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

    // Parenthesised group parsed as a nested context
    if (item.nested !== undefined) {
      return this.transformNested(item.nested);
    }

    // Handle simple reference objects like {id: 'a'}
    if (item.id !== undefined && !item.values && !item.children) {
      return new Link(item.id);
    }

    // For items with values, create a link with those values
    if (item.values && Array.isArray(item.values)) {
      // Create a link with id (if present) and transformed values
      const link = new Link(item.id ?? null, []);
      link.values = item.values.map((v) => this.transformLink(v));
      return link;
    }

    // Default case
    return new Link(item.id ?? null, []);
  }
}

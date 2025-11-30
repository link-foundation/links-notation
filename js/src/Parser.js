import { Link } from './Link.js';
import * as parserModule from './parser-generated.js';

/**
 * Default punctuation symbols that should be tokenized as separate references.
 * These are separated from adjacent characters during parsing.
 */
export const DEFAULT_PUNCTUATION_SYMBOLS = [',', '.', ';', '!', '?'];

/**
 * Default math symbols that should be tokenized as separate references.
 * These are separated from adjacent characters during parsing.
 */
export const DEFAULT_MATH_SYMBOLS = ['+', '-', '*', '/', '=', '<', '>', '%', '^'];

export class Parser {
  /**
   * Create a new Parser instance
   * @param {Object} options - Parser options
   * @param {number} options.maxInputSize - Maximum input size in bytes (default: 10MB)
   * @param {number} options.maxDepth - Maximum nesting depth (default: 1000)
   * @param {boolean} options.tokenizeSymbols - If true, tokenize punctuation and math symbols (default: true)
   * @param {string[]} options.punctuationSymbols - Custom punctuation symbols to tokenize
   * @param {string[]} options.mathSymbols - Custom math symbols to tokenize
   */
  constructor(options = {}) {
    this.maxInputSize = options.maxInputSize || 10 * 1024 * 1024; // 10MB default
    this.maxDepth = options.maxDepth || 1000;
    this.tokenizeSymbols = options.tokenizeSymbols !== false; // default true
    this.punctuationSymbols = options.punctuationSymbols || DEFAULT_PUNCTUATION_SYMBOLS;
    this.mathSymbols = options.mathSymbols || DEFAULT_MATH_SYMBOLS;
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
      throw new Error(`Input size exceeds maximum allowed size of ${this.maxInputSize} bytes`);
    }

    try {
      // Apply tokenization if enabled
      const processedInput = this.tokenizeSymbols ? this.tokenize(input) : input;
      const rawResult = parserModule.parse(processedInput);
      return this.transformResult(rawResult);
    } catch (error) {
      // Preserve original error information
      const parseError = new Error(`Parse error: ${error.message}`);
      parseError.cause = error;
      parseError.location = error.location;
      throw parseError;
    }
  }

  /**
   * Check if a character is a letter (alphabetic)
   * @param {string} char - Single character to check
   * @returns {boolean} True if the character is a letter
   */
  isLetter(char) {
    if (!char) return false;
    return /[a-zA-Z]/.test(char);
  }

  /**
   * Check if a character is a digit
   * @param {string} char - Single character to check
   * @returns {boolean} True if the character is a digit
   */
  isDigit(char) {
    if (!char) return false;
    return /[0-9]/.test(char);
  }

  /**
   * Tokenize input by separating punctuation and math symbols from adjacent characters.
   * Quoted strings are preserved as-is.
   * Math symbols are only tokenized when between digits (e.g., "1+1" → "1 + 1").
   * Punctuation is only tokenized when following an alphanumeric character (e.g., "hello," → "hello ,").
   * @param {string} input - The input text to tokenize
   * @returns {string} Tokenized input with symbols separated by spaces
   */
  tokenize(input) {
    const punctuationSet = new Set(this.punctuationSymbols);
    const mathSet = new Set(this.mathSymbols);
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let i = 0;

    while (i < input.length) {
      const char = input[i];
      const prevChar = i > 0 ? input[i - 1] : '';
      const nextChar = i + 1 < input.length ? input[i + 1] : '';

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

      // Check if current char is a punctuation symbol
      if (punctuationSet.has(char)) {
        // Only tokenize punctuation when it follows an alphanumeric character
        // This handles "hello," → "hello ," but not standalone punctuation
        const prevIsAlphanumeric = /[a-zA-Z0-9]/.test(prevChar);

        if (prevIsAlphanumeric) {
          // Add space before
          if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('\t') && !result.endsWith('\n')) {
            result += ' ';
          }
          result += char;
          // Add space after if next char is alphanumeric (not whitespace or more punctuation)
          if (nextChar && /[a-zA-Z0-9]/.test(nextChar)) {
            result += ' ';
          }
        } else {
          result += char;
        }
        i++;
        continue;
      }

      // Check if current char is a math symbol
      if (mathSet.has(char)) {
        // Only tokenize math symbols when BOTH sides are digits
        // This handles "1+1" → "1 + 1" but preserves "Jean-Luc", "a-b", "bmFtZQ=="
        const prevIsDigit = this.isDigit(prevChar);
        const nextIsDigit = this.isDigit(nextChar);

        if (prevIsDigit && nextIsDigit) {
          // Tokenize: both sides are digits
          if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('\t') && !result.endsWith('\n')) {
            result += ' ';
          }
          result += char;
          result += ' ';
        } else {
          // Don't tokenize: preserve as part of identifier
          result += char;
        }
        i++;
        continue;
      }

      result += char;
      i++;
    }

    return result;
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
          values: childValues
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
      link.values = item.values.map(v => this.transformLink(v));
      return link;
    }

    // Default case
    return new Link(item.id || null, []);
  }

}
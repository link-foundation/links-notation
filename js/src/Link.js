export class Link {
  /**
   * Create a new Link
   * @param {string|null} id - Optional identifier for the link
   * @param {Link[]|null} values - Optional array of nested links
   * @throws {TypeError} If values is not an array or null
   */
  constructor(id = null, values = null) {
    this.id = id;

    // Validate that values is an array if provided
    if (values !== null && values !== undefined) {
      if (!Array.isArray(values)) {
        throw new TypeError('values must be an array or null');
      }
      this.values = values;
    } else {
      this.values = [];
    }
  }

  /**
   * Convert link to string representation
   * @returns {string} String representation of the link
   */
  toString() {
    return this.format(false);
  }

  /**
   * Get formatted string of all values
   * @returns {string} Space-separated string of values
   */
  getValuesString() {
    return (!this.values || this.values.length === 0) ?
      '' : this.values.map(v => Link.getValueString(v)).join(' ');
  }

  /**
   * Simplify the link structure by unwrapping single-value containers
   * @returns {Link} Simplified link
   */
  simplify() {
    if (!this.values || this.values.length === 0) {
      return this;
    } else if (this.values.length === 1) {
      return this.values[0];
    } else {
      const newValues = this.values.map(v => {
        // Check if value has simplify method (defensive programming)
        return v && typeof v.simplify === 'function' ? v.simplify() : v;
      });
      return new Link(this.id, newValues);
    }
  }

  /**
   * Combine this link with another link
   * @param {Link} other - The link to combine with
   * @returns {Link} Combined link
   */
  combine(other) {
    return new Link(null, [this, other]);
  }

  /**
   * Get string representation of a value
   * @param {Link} value - The value to stringify
   * @returns {string} String representation
   */
  static getValueString(value) {
    // Defensive check for method existence
    return value && typeof value.toLinkOrIdString === 'function' ? value.toLinkOrIdString() : String(value);
  }

  /**
   * Escape a reference string by adding quotes if necessary
   * @param {string} reference - The reference to escape
   * @returns {string} Escaped reference
   */
  static escapeReference(reference) {
    if (!reference || reference.trim() === '') {
      return '';
    }

    const hasSingleQuote = reference.includes("'");
    const hasDoubleQuote = reference.includes('"');

    const needsQuoting =
      reference.includes(':') ||
      reference.includes('(') ||
      reference.includes(')') ||
      reference.includes(' ') ||
      reference.includes('\t') ||
      reference.includes('\n') ||
      reference.includes('\r') ||
      hasDoubleQuote ||
      hasSingleQuote;

    // Handle edge case: reference contains both single and double quotes
    if (hasSingleQuote && hasDoubleQuote) {
      // Escape single quotes and wrap in single quotes
      return `'${reference.replace(/'/g, "\\'")}'`;
    }

    // Prefer single quotes if double quotes are present
    if (hasDoubleQuote) {
      return `'${reference}'`;
    }

    // Use double quotes if single quotes are present
    if (hasSingleQuote) {
      return `"${reference}"`;
    }

    // Use single quotes for special characters
    if (needsQuoting) {
      return `'${reference}'`;
    }

    // No quoting needed
    return reference;
  }

  /**
   * Convert to string using either just ID or full format
   * @returns {string} String representation
   */
  toLinkOrIdString() {
    if (!this.values || this.values.length === 0) {
      return this.id === null ? '' : Link.escapeReference(this.id);
    }
    return this.toString();
  }

  /**
   * Check equality with another Link
   * @param {*} other - Object to compare with
   * @returns {boolean} True if links are equal
   */
  equals(other) {
    if (!(other instanceof Link)) return false;
    if (this.id !== other.id) return false;

    // Handle null/undefined values arrays
    const thisValues = this.values || [];
    const otherValues = other.values || [];

    if (thisValues.length !== otherValues.length) return false;

    for (let i = 0; i < thisValues.length; i++) {
      // Defensive check for equals method
      if (thisValues[i] && typeof thisValues[i].equals === 'function') {
        if (!thisValues[i].equals(otherValues[i])) {
          return false;
        }
      } else {
        // Fallback to reference equality
        if (thisValues[i] !== otherValues[i]) {
          return false;
        }
      }
    }
    return true;
  }


  /**
   * Format the link as a string
   * @param {boolean} lessParentheses - If true, omit parentheses where safe
   * @param {boolean} isCompoundValue - If true, this is a value in a compound link
   * @returns {string} Formatted string
   */
  format(lessParentheses = false, isCompoundValue = false) {
    // Empty link
    if (this.id === null && (!this.values || this.values.length === 0)) {
      return lessParentheses ? '' : '()';
    }
    
    // Link with only ID, no values
    if (!this.values || this.values.length === 0) {
      const escapedId = Link.escapeReference(this.id);
      // When used as a value in a compound link (created from combining links), wrap in parentheses
      if (isCompoundValue) {
        return `(${escapedId})`;
      }
      return lessParentheses && !this.needsParentheses(this.id) ? escapedId : `(${escapedId})`;
    }
    
    // Format values recursively  
    const valuesStr = this.values.map(v => this.formatValue(v)).join(' ');
    
    // Link with values only (null id)
    if (this.id === null) {
      // For lessParentheses mode with simple values, don't wrap the whole thing
      if (lessParentheses) {
        // Check if all values are simple (no nested values)
        const allSimple = this.values.every(v => !v.values || v.values.length === 0);
        if (allSimple) {
          // Format each value without extra wrapping
          const simpleValuesStr = this.values.map(v => Link.escapeReference(v.id)).join(' ');
          return simpleValuesStr;
        }
        // For mixed or complex values in lessParentheses mode, still avoid outer wrapper
        // but keep the inner formatting
        return valuesStr;
      }
      // For normal mode, wrap in parentheses
      return `(${valuesStr})`;
    }
    
    // Link with ID and values
    const idStr = Link.escapeReference(this.id);
    const withColon = `${idStr}: ${valuesStr}`;
    return lessParentheses && !this.needsParentheses(this.id) ? withColon : `(${withColon})`;
  }
  
  /**
   * Format a value within this link
   * @param {Link} value - The value to format
   * @returns {string} Formatted value string
   */
  formatValue(value) {
    if (!value || !value.format) {
      return Link.escapeReference((value && value.id) || '');
    }

    // Check if we're in a compound link that was created from path combinations
    // This is indicated by having a parent context passed through
    const isCompoundFromPaths = this._isFromPathCombination === true;

    // For compound links from paths, format values with parentheses
    if (isCompoundFromPaths) {
      return value.format(false, true);
    }

    // Simple link with just an ID - don't wrap in parentheses when used as a value
    if (!value.values || value.values.length === 0) {
      return Link.escapeReference(value.id);
    }

    // Complex value with its own structure - format it normally with parentheses
    return value.format(false, false);
  }

  /**
   * Check if a string needs to be wrapped in parentheses
   * @param {string} str - The string to check
   * @returns {boolean} True if parentheses are needed
   */
  needsParentheses(str) {
    return str && (str.includes(' ') || str.includes(':') || str.includes('(') || str.includes(')'));
  }
}

export function formatLinks(links, lessParentheses = false) {
  if (!links || links.length === 0) return '';
  return links.map(link => link.format(lessParentheses)).join('\n');
}
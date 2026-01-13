export class Link {
  /**
   * Create a new Link
   * @param {string|string[]|null} id - Optional identifier for the link (string for single ref, array for multi-ref)
   * @param {Link[]|null} values - Optional array of nested links
   * @throws {TypeError} If values is not an array or null
   */
  constructor(id = null, values = null) {
    // Store ids as an array internally (primary storage)
    if (id === null || id === undefined) {
      this._ids = null;
    } else if (Array.isArray(id)) {
      this._ids = id;
    } else {
      this._ids = [id];
    }

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
   * Get the ids array (primary storage for reference identifiers)
   * @returns {string[]|null} Array of reference strings, or null if no id
   */
  get ids() {
    return this._ids;
  }

  /**
   * Set the ids array
   * @param {string[]|null} value - Array of reference strings, or null
   */
  set ids(value) {
    this._ids = value;
  }

  /**
   * Get the id as a single string (backward compatibility)
   * @throws {Error} If ids has more than one element (use ids property instead)
   * @returns {string|null} Single reference string, or null if no id
   */
  get id() {
    if (this._ids === null) {
      return null;
    }
    if (this._ids.length > 1) {
      throw new Error(
        `This link has a multi-reference id with ${this._ids.length} parts. Use the 'ids' property instead of 'id'.`
      );
    }
    return this._ids[0];
  }

  /**
   * Set the id (backward compatibility)
   * @param {string|string[]|null} value - Single reference string, array, or null
   */
  set id(value) {
    if (value === null || value === undefined) {
      this._ids = null;
    } else if (Array.isArray(value)) {
      this._ids = value;
    } else {
      this._ids = [value];
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
    return !this.values || this.values.length === 0
      ? ''
      : this.values.map((v) => Link.getValueString(v)).join(' ');
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
      const newValues = this.values.map((v) => {
        // Check if value has simplify method (defensive programming)
        return v && typeof v.simplify === 'function' ? v.simplify() : v;
      });
      return new Link(this._ids, newValues);
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
    return value && typeof value.toLinkOrIdString === 'function'
      ? value.toLinkOrIdString()
      : String(value);
  }

  /**
   * Escape a reference string or multi-reference array by adding quotes if necessary
   * @param {string|string[]} reference - The reference to escape (string or array of strings for multi-ref)
   * @returns {string} Escaped reference
   */
  static escapeReference(reference) {
    // Handle multi-reference (array of strings)
    if (Array.isArray(reference)) {
      // Multi-reference: join with space, each part should be a simple reference
      // For output, we can either keep as space-separated or quote if needed
      return reference.map((r) => Link.escapeReference(r)).join(' ');
    }

    if (
      !reference ||
      (typeof reference === 'string' && reference.trim() === '')
    ) {
      return '';
    }

    // Ensure reference is a string
    const refStr = String(reference);

    const hasSingleQuote = refStr.includes("'");
    const hasDoubleQuote = refStr.includes('"');

    const needsQuoting =
      refStr.includes(':') ||
      refStr.includes('(') ||
      refStr.includes(')') ||
      refStr.includes(' ') ||
      refStr.includes('\t') ||
      refStr.includes('\n') ||
      refStr.includes('\r') ||
      hasDoubleQuote ||
      hasSingleQuote;

    // Handle edge case: reference contains both single and double quotes
    if (hasSingleQuote && hasDoubleQuote) {
      // Escape single quotes and wrap in single quotes
      return `'${refStr.replace(/'/g, "\\'")}'`;
    }

    // Prefer single quotes if double quotes are present
    if (hasDoubleQuote) {
      return `'${refStr}'`;
    }

    // Use double quotes if single quotes are present
    if (hasSingleQuote) {
      return `"${refStr}"`;
    }

    // Use single quotes for special characters
    if (needsQuoting) {
      return `'${refStr}'`;
    }

    // No quoting needed
    return refStr;
  }

  /**
   * Convert to string using either just ID or full format
   * @returns {string} String representation
   */
  toLinkOrIdString() {
    if (!this.values || this.values.length === 0) {
      return this._ids === null ? '' : Link.escapeReference(this._ids);
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

    // Compare ids arrays
    if (this._ids === null && other._ids !== null) return false;
    if (this._ids !== null && other._ids === null) return false;
    if (this._ids !== null && other._ids !== null) {
      if (this._ids.length !== other._ids.length) return false;
      for (let i = 0; i < this._ids.length; i++) {
        if (this._ids[i] !== other._ids[i]) return false;
      }
    }

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
   * @param {boolean|FormatOptions} lessParentheses - If true, omit parentheses where safe; or a FormatOptions object
   * @param {boolean} isCompoundValue - If true, this is a value in a compound link
   * @returns {string} Formatted string
   */
  format(lessParentheses = false, isCompoundValue = false) {
    // Support FormatOptions/FormatConfig as first parameter
    // Check if it's an object with formatting properties (FormatOptions or FormatConfig)
    if (
      lessParentheses &&
      typeof lessParentheses === 'object' &&
      (lessParentheses.constructor.name === 'FormatOptions' ||
        lessParentheses.constructor.name === 'FormatConfig')
    ) {
      return this._formatWithOptions(lessParentheses, isCompoundValue);
    }

    // Original implementation for backward compatibility
    // Empty link
    if (this._ids === null && (!this.values || this.values.length === 0)) {
      return lessParentheses ? '' : '()';
    }

    // Link with only ID, no values
    if (!this.values || this.values.length === 0) {
      const escapedId = Link.escapeReference(this._ids);
      // When used as a value in a compound link (created from combining links), wrap in parentheses
      if (isCompoundValue) {
        return `(${escapedId})`;
      }
      return lessParentheses && !this.needsParentheses(this._ids)
        ? escapedId
        : `(${escapedId})`;
    }

    // Format values recursively
    const valuesStr = this.values.map((v) => this.formatValue(v)).join(' ');

    // Link with values only (null id)
    if (this._ids === null) {
      // For lessParentheses mode with simple values, don't wrap the whole thing
      if (lessParentheses) {
        // Check if all values are simple (no nested values)
        const allSimple = this.values.every(
          (v) => !v.values || v.values.length === 0
        );
        if (allSimple) {
          // Format each value without extra wrapping
          const simpleValuesStr = this.values
            .map((v) => Link.escapeReference(v._ids))
            .join(' ');
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
    const idStr = Link.escapeReference(this._ids);
    const withColon = `${idStr}: ${valuesStr}`;
    return lessParentheses && !this.needsParentheses(this._ids)
      ? withColon
      : `(${withColon})`;
  }

  /**
   * Format a value within this link
   * @param {Link} value - The value to format
   * @returns {string} Formatted value string
   */
  formatValue(value) {
    if (!value || !value.format) {
      return Link.escapeReference((value && value._ids) || '');
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
      return Link.escapeReference(value._ids);
    }

    // Complex value with its own structure - format it normally with parentheses
    return value.format(false, false);
  }

  /**
   * Check if a string or array needs to be wrapped in parentheses
   * @param {string|string[]} str - The string or array to check
   * @returns {boolean} True if parentheses are needed
   */
  needsParentheses(str) {
    // Multi-reference arrays always need parentheses when formatted inline
    if (Array.isArray(str)) {
      return str.length > 1;
    }
    return (
      str &&
      (str.includes(' ') ||
        str.includes(':') ||
        str.includes('(') ||
        str.includes(')'))
    );
  }

  /**
   * Format the link using a FormatOptions object
   * @param {FormatOptions} options - FormatOptions object with formatting options
   * @param {boolean} isCompoundValue - If true, this is a value in a compound link
   * @returns {string} Formatted string
   */
  _formatWithOptions(options, isCompoundValue = false) {
    // Empty link
    if (this._ids === null && (!this.values || this.values.length === 0)) {
      return options.lessParentheses ? '' : '()';
    }

    // Link with only ID, no values
    if (!this.values || this.values.length === 0) {
      const escapedId = Link.escapeReference(this._ids);
      if (isCompoundValue) {
        return `(${escapedId})`;
      }
      return options.lessParentheses && !this.needsParentheses(this._ids)
        ? escapedId
        : `(${escapedId})`;
    }

    // Check if we should use indented format
    let shouldIndent = false;
    if (options.shouldIndentByRefCount(this.values.length)) {
      shouldIndent = true;
    } else {
      // Try inline format first
      const valuesStr = this.values.map((v) => this.formatValue(v)).join(' ');
      let testLine;
      if (this._ids !== null) {
        const idStr = Link.escapeReference(this._ids);
        testLine = options.lessParentheses
          ? `${idStr}: ${valuesStr}`
          : `(${idStr}: ${valuesStr})`;
      } else {
        testLine = options.lessParentheses ? valuesStr : `(${valuesStr})`;
      }

      if (options.shouldIndentByLength(testLine)) {
        shouldIndent = true;
      }
    }

    // Format with indentation if needed
    if (shouldIndent && options.preferInline === false) {
      return this._formatIndented(options);
    }

    // Standard inline formatting
    const valuesStr = this.values.map((v) => this.formatValue(v)).join(' ');

    // Link with values only (null id)
    if (this._ids === null) {
      if (options.lessParentheses) {
        const allSimple = this.values.every(
          (v) => !v.values || v.values.length === 0
        );
        if (allSimple) {
          return this.values.map((v) => Link.escapeReference(v._ids)).join(' ');
        }
        return valuesStr;
      }
      return `(${valuesStr})`;
    }

    // Link with ID and values
    const idStr = Link.escapeReference(this._ids);
    const withColon = `${idStr}: ${valuesStr}`;
    return options.lessParentheses && !this.needsParentheses(this._ids)
      ? withColon
      : `(${withColon})`;
  }

  /**
   * Format the link with indentation
   * @param {FormatOptions} options - FormatOptions object with formatting options
   * @returns {string} Indented formatted string
   */
  _formatIndented(options) {
    if (this._ids === null) {
      // Values only - format each on separate line
      const lines = this.values.map(
        (v) => options.indentString + this.formatValue(v)
      );
      return lines.join('\n');
    }

    // Link with ID - format as id:\n  value1\n  value2
    const idStr = Link.escapeReference(this._ids);
    const lines = [`${idStr}:`];
    for (const v of this.values) {
      lines.push(options.indentString + this.formatValue(v));
    }
    return lines.join('\n');
  }
}

/**
 * Group consecutive links with the same ID
 * @param {Link[]} links - List of links to group
 * @returns {Link[]} New list with consecutive links grouped
 */
function _groupConsecutiveLinks(links) {
  if (!links || links.length === 0) {
    return links;
  }

  const grouped = [];
  let i = 0;

  // Helper to compare ids arrays
  const idsEqual = (ids1, ids2) => {
    if (ids1 === null && ids2 === null) return true;
    if (ids1 === null || ids2 === null) return false;
    if (ids1.length !== ids2.length) return false;
    return ids1.every((id, idx) => id === ids2[idx]);
  };

  while (i < links.length) {
    const current = links[i];

    // Look ahead for consecutive links with same ID
    if (current._ids !== null && current.values && current.values.length > 0) {
      // Collect all values with same ID
      const sameIdValues = [...current.values];
      let j = i + 1;

      while (j < links.length) {
        const nextLink = links[j];
        if (
          idsEqual(nextLink._ids, current._ids) &&
          nextLink.values &&
          nextLink.values.length > 0
        ) {
          sameIdValues.push(...nextLink.values);
          j++;
        } else {
          break;
        }
      }

      // If we found consecutive links, create grouped link
      if (j > i + 1) {
        const groupedLink = new Link(current._ids, sameIdValues);
        grouped.push(groupedLink);
        i = j;
        continue;
      }
    }

    grouped.push(current);
    i++;
  }

  return grouped;
}

export function formatLinks(links, lessParentheses = false) {
  if (!links || links.length === 0) return '';

  // Support FormatOptions/FormatConfig as parameter
  if (
    lessParentheses &&
    typeof lessParentheses === 'object' &&
    (lessParentheses.constructor.name === 'FormatOptions' ||
      lessParentheses.constructor.name === 'FormatConfig')
  ) {
    const options = lessParentheses;
    // Apply consecutive link grouping if enabled
    let linksToFormat = links;
    if (options.groupConsecutive) {
      linksToFormat = _groupConsecutiveLinks(links);
    }
    return linksToFormat.map((link) => link.format(options)).join('\n');
  }

  // Backward compatibility with boolean parameter
  return links.map((link) => link.format(lessParentheses)).join('\n');
}

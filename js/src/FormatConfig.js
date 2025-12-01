/**
 * FormatConfig is an alias for FormatOptions to maintain API consistency
 * with the Python implementation.
 *
 * JavaScript uses 'FormatOptions' internally, but exports 'FormatConfig'
 * as the primary name to match Python's naming convention.
 */
import { FormatOptions } from './FormatOptions.js';

/**
 * FormatConfig for Lino notation formatting.
 *
 * This is an alias for FormatOptions to maintain API consistency across languages.
 * Python uses 'FormatConfig', so this export provides the same name for JavaScript.
 */
export class FormatConfig extends FormatOptions {
  // FormatConfig inherits all functionality from FormatOptions
  // No additional implementation needed - this is purely for naming consistency
}

/**
 * Delimited references, and how far each one reaches.
 *
 * A reference opened by a run of N delimiters (`"`, `'` or `` ` ``) closes at
 * the next run of exactly N, and a run of 2N inside it is that delimiter
 * escaped. An even run that encloses nothing substantive is the empty
 * reference: the shortest reading, a bare delimiter pair enclosing nothing,
 * wins over a longer n-quote delimiter.
 *
 * A run of R delimiters in a body is read as a whole: each 2N of it in turn are
 * an escaped N, and the R % 2N left over close the reference when there are at
 * least N of them - the last N close it, the ones before are content - and are
 * content otherwise. So a run closes the reference exactly when
 * `Math.floor(R / N)` is odd, and a run shorter than N never does.
 *
 * {@link DelimitedReferences} lists the runs of a delimiter once per document
 * and links each run to the next longer one, so finding where a reference
 * closes skips every run too short to close it. Reading a reference takes time
 * linear in its body however wide its opening run is, and finding that a
 * reference never closes does not take a pass over the rest of the document
 * each time it is asked.
 */

/** The characters a reference can be written between. */
export const QUOTES = ['"', "'", '`'];

/**
 * Every delimited reference of one document, read on demand.
 *
 * The grammar and the comment reader each keep one per document they read, so
 * a reference asked for twice is read once.
 */
export class DelimitedReferences {
  /**
   * @param {string} document - The document the references are read from
   */
  constructor(document) {
    this.document = document;
    this.runsByQuote = new Map();
    this.readings = new Map();
  }

  /**
   * The reference opened at `start`.
   * @param {number} start - Position of the opening delimiter
   * @returns {{value: string, length: number}|null} What the reference holds
   *   and how many characters it takes, or null when nothing opens there
   */
  readAt(start) {
    if (!this.readings.has(start)) {
      this.readings.set(start, this.#read(start));
    }
    return this.readings.get(start);
  }

  /**
   * The position just past the reference opened at `start`.
   * @param {number} start - Position of the opening delimiter
   * @returns {number|null} The position, or null when nothing opens there
   */
  endAt(start) {
    const reading = this.readAt(start);
    return reading === null ? null : start + reading.length;
  }

  #read(start) {
    const document = this.document;
    const quote = document[start];
    if (!QUOTES.includes(quote)) {
      return null;
    }

    const runs = this.#runsOf(quote);
    const opening = runs.indexOf(start);
    const count = runs.end(opening) - start;
    const emptyReference =
      count % 2 === 0 ? { value: '', length: count } : null;

    // The first run after the opening one that closes the reference.
    let closing = opening + 1;
    while (closing < runs.count) {
      const length = runs.lengths[closing];
      if (length < count) {
        closing = runs.nextLonger[closing];
      } else if (Math.floor(length / count) % 2 === 1) {
        break;
      } else {
        closing++;
      }
    }
    if (closing >= runs.count) {
      return emptyReference;
    }

    const parts = [];
    let position = runs.end(opening);
    for (let run = opening + 1; run <= closing; run++) {
      const length = runs.lengths[run];
      const escaped = Math.floor(length / (2 * count)) * count;
      const closes = run === closing ? count : 0;
      parts.push(document.slice(position, runs.starts[run]));
      parts.push(quote.repeat(length - escaped - closes));
      position = runs.end(run);
    }
    const value = parts.join('');

    if (emptyReference !== null && !isSubstantiveBody(value)) {
      return emptyReference;
    }
    return { value, length: position - start };
  }

  #runsOf(quote) {
    if (!this.runsByQuote.has(quote)) {
      this.runsByQuote.set(quote, new DelimiterRuns(this.document, quote));
    }
    return this.runsByQuote.get(quote);
  }
}

/**
 * The maximal runs of one delimiter in a document, in order, each linked to the
 * next run that is longer than it.
 */
class DelimiterRuns {
  constructor(document, quote) {
    this.starts = [];
    this.lengths = [];

    let position = document.indexOf(quote);
    while (position !== -1) {
      let end = position + 1;
      while (end < document.length && document[end] === quote) {
        end++;
      }
      this.starts.push(position);
      this.lengths.push(end - position);
      position = document.indexOf(quote, end);
    }
    this.count = this.starts.length;

    // Every run between a run and the next longer one is at most as long as
    // it, which is what lets a search for a run of some length jump over them.
    this.nextLonger = new Array(this.count);
    const longer = [];
    for (let run = this.count - 1; run >= 0; run--) {
      while (
        longer.length > 0 &&
        this.lengths[longer[longer.length - 1]] <= this.lengths[run]
      ) {
        longer.pop();
      }
      this.nextLonger[run] =
        longer.length > 0 ? longer[longer.length - 1] : this.count;
      longer.push(run);
    }
  }

  /** Position just past the given run. */
  end(run) {
    return this.starts[run] + this.lengths[run];
  }

  /** The run that holds the given position of a delimiter. */
  indexOf(position) {
    let low = 0;
    let high = this.count - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.starts[middle] <= position) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return low;
  }
}

/**
 * Whether a body written between an even run of delimiters carries something a
 * pair of delimiters enclosing nothing cannot: at least one visible character,
 * and no parenthesis it straddles.
 * @param {string} content - The body between the delimiters
 * @returns {boolean} True when the n-quote reading is the one to take
 */
export function isSubstantiveBody(content) {
  let depth = 0;
  let hasVisible = false;

  for (const character of content) {
    if (character === '(') {
      depth++;
    } else if (character === ')') {
      depth--;
      if (depth < 0) {
        return false;
      }
    }
    if (!/[ \t\n\r]/.test(character)) {
      hasVisible = true;
    }
  }

  return hasVisible && depth === 0;
}

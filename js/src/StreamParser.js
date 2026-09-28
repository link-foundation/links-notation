import { EventEmitter } from 'events';
import { Parser } from './Parser.js';
import { DelimitedReferences } from './quotes.js';

const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;

/**
 * An error raised while finishing a streamed document.
 *
 * The canonical parser reports positions relative to the currently buffered
 * record. This wrapper translates them back to the complete stream.
 */
export class StreamParseError extends Error {
  constructor(error, startOffset, startLine) {
    const localOffset = error?.offset ?? 0;
    const localLine = error?.line ?? 1;
    const column = error?.column ?? 1;
    const line = startLine + localLine - 1;
    super(
      `Stream parse error at line ${line}, column ${column}: ${error.message}`
    );
    this.name = 'StreamParseError';
    this.cause = error;
    this.offset = startOffset + localOffset;
    this.line = line;
    this.column = column;
    this.found = error?.found ?? null;
    this.lineText = error?.lineText ?? '';
    this.snippet = error?.snippet ?? '';
  }
}

/**
 * Incrementally parses complete top-level Links Notation records.
 *
 * A line can acquire indented children, so its terminating newline alone does
 * not prove that the record is complete. The parser commits a buffered record
 * as soon as the first non-indented character of the next record arrives. It
 * uses the regular Parser as the source of truth, which keeps quoted strings,
 * nested contexts, comments, and future grammar changes in one place.
 */
export class StreamParser extends EventEmitter {
  constructor(options = {}) {
    super();
    this.parser = options.parser ?? new Parser(options);
    this.comments = options.comments ?? this.parser.comments ?? true;
    this.maxBufferSize =
      options.maxBufferSize ?? options.maxInputSize ?? DEFAULT_MAX_BUFFER_SIZE;
    this.collect = options.collect ?? true;
    this.reset();
  }

  /** Feed a string chunk and return the links made complete by that chunk. */
  write(chunk) {
    if (typeof chunk !== 'string') {
      return this._fail(new TypeError('Input must be a string'));
    }
    if (this.ended) {
      return this._fail(new Error('Cannot write after end()'));
    }

    const emitted = [];
    for (let index = 0; index < chunk.length; index++) {
      const character = chunk[index];
      this.currentLine += character;
      this.offset += 1;

      if (character === '\n') {
        this.buffer += this.currentLine;
        this.currentLine = '';
        this.lineClassified = false;
        this.line += 1;
        this.column = 1;
      } else {
        if (
          !this.lineClassified &&
          character !== ' ' &&
          character !== '\t' &&
          character !== '\r'
        ) {
          this.lineClassified = true;
          const isComment = this.comments && character === '#';
          if (!isComment) {
            const indentation = leadingSpaces(this.currentLine);
            this._startContentLine(indentation, emitted);
          }
        }
        this.column += 1;
      }

      if (this.buffer.length + this.currentLine.length > this.maxBufferSize) {
        return this._fail(
          new RangeError(
            `Buffered record exceeds maximum size of ${this.maxBufferSize} characters`
          )
        );
      }
    }
    return emitted;
  }

  /**
   * Finish the stream. With collection enabled (the default), returns every
   * undrained link; otherwise returns only links completed by this call.
   */
  end(chunk = '') {
    const emitted = chunk === '' ? [] : this.write(chunk);
    if (this.ended) {
      return this.collect ? [...this.links] : emitted;
    }

    const document = this.buffer + this.currentLine;
    if (document.length > 0) {
      let links;
      try {
        links = this.parser.parse(document);
      } catch (error) {
        const streamError = new StreamParseError(
          error,
          this.segmentOffset,
          this.segmentLine
        );
        return this._fail(streamError);
      }
      this._publish(links, emitted);
      this._advanceSegment(document);
    }

    this.buffer = '';
    this.currentLine = '';
    this.baseIndentation = null;
    this.ended = true;
    const result = this.collect ? [...this.links] : emitted;
    this.emit('end', result);
    return result;
  }

  /** Return and forget links retained since the previous drain. */
  drain() {
    const links = this.links;
    this.links = [];
    return links;
  }

  /** Reuse this parser for a new stream while keeping listeners and options. */
  reset() {
    this.buffer = '';
    this.currentLine = '';
    this.baseIndentation = null;
    this.lineClassified = false;
    this.links = [];
    this.offset = 0;
    this.line = 1;
    this.column = 1;
    this.segmentOffset = 0;
    this.segmentLine = 1;
    this.ended = false;
    return this;
  }

  /** Position immediately after the last character written. */
  position() {
    return {
      offset: this.offset,
      line: this.line,
      column: this.column,
      buffered: this.buffer.length + this.currentLine.length,
    };
  }

  /** Lazily parse a synchronous iterable of chunks. */
  static *parse(chunks, options = {}) {
    const parser = new StreamParser({ ...options, collect: false });
    for (const chunk of chunks) {
      yield* parser.write(chunk);
    }
    yield* parser.end();
  }

  /** Lazily parse an async iterable of chunks. */
  static async *parseAsync(chunks, options = {}) {
    const parser = new StreamParser({ ...options, collect: false });
    for await (const chunk of chunks) {
      yield* parser.write(chunk);
    }
    yield* parser.end();
  }

  _startContentLine(indentation, emitted) {
    if (
      this.buffer.length > 0 &&
      this.baseIndentation !== null &&
      indentation <= this.baseIndentation &&
      structurallyComplete(this.buffer, this.comments)
    ) {
      let links;
      try {
        links = this.parser.parse(this.buffer);
      } catch {
        links = null;
      }
      if (links !== null) {
        this._publish(links, emitted);
        this._advanceSegment(this.buffer);
        this.buffer = '';
        this.baseIndentation = null;
      }
    }

    if (this.baseIndentation === null) {
      this.baseIndentation = indentation;
    }
  }

  _publish(links, emitted) {
    for (const link of links) {
      emitted.push(link);
      if (this.collect) this.links.push(link);
      this.emit('link', link);
    }
  }

  _advanceSegment(document) {
    this.segmentOffset += document.length;
    this.segmentLine += countNewlines(document);
  }

  _fail(error) {
    this.emit('error', error);
    throw error;
  }
}

function leadingSpaces(line) {
  let indentation = 0;
  while (line[indentation] === ' ') indentation += 1;
  return indentation;
}

function countNewlines(value) {
  let count = 0;
  for (const character of value) {
    if (character === '\n') count += 1;
  }
  return count;
}

function structurallyComplete(document, comments) {
  const quotes = ['"', "'", '`'];
  const beforeReference = [' ', '\t', '\n', '\r', '(', ':'];
  const beforeComment = [' ', '\t', '\n', '\r'];
  const references = new DelimitedReferences(document);
  let depth = 0;

  for (let position = 0; position < document.length; position++) {
    const character = document[position];
    const previous = position === 0 ? null : document[position - 1];

    if (
      quotes.includes(character) &&
      (previous === null || beforeReference.includes(previous))
    ) {
      const end = references.endAt(position);
      if (end === null) return false;
      position = end - 1;
      continue;
    }

    if (
      comments &&
      character === '#' &&
      (previous === null || beforeComment.includes(previous))
    ) {
      const newline = document.indexOf('\n', position);
      if (newline === -1) return true;
      position = newline;
      continue;
    }

    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
  }

  return depth === 0;
}

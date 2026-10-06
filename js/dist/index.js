// src/Link.js
class Link {
  constructor(id = null, values = null) {
    this.id = id;
    if (values !== null && values !== undefined) {
      if (!Array.isArray(values)) {
        throw new TypeError("values must be an array or null");
      }
      this.values = values;
    } else {
      this.values = [];
    }
  }
  toString() {
    return this.format(false);
  }
  getValuesString() {
    return !this.values || this.values.length === 0 ? "" : this.values.map((v) => Link.getValueString(v)).join(" ");
  }
  simplify() {
    if (!this.values || this.values.length === 0) {
      return this;
    } else if (this.values.length === 1) {
      return this.values[0];
    } else {
      const newValues = this.values.map((v) => {
        return v && typeof v.simplify === "function" ? v.simplify() : v;
      });
      return new Link(this.id, newValues);
    }
  }
  combine(other) {
    return new Link(null, [this, other]);
  }
  static getValueString(value) {
    return value && typeof value.toLinkOrIdString === "function" ? value.toLinkOrIdString() : String(value);
  }
  static escapeReference(reference) {
    if (reference === null || reference === undefined) {
      return "";
    }
    if (reference === "") {
      return '""';
    }
    const hasSingleQuote = reference.includes("'");
    const hasDoubleQuote = reference.includes('"');
    const needsQuoting = reference.startsWith("#") || reference.includes(":") || reference.includes("(") || reference.includes(")") || reference.includes(" ") || reference.includes("\t") || reference.includes(`
`) || reference.includes("\r") || hasDoubleQuote || hasSingleQuote;
    if (hasSingleQuote && hasDoubleQuote) {
      return `'${reference.replace(/'/g, "\\'")}'`;
    }
    if (hasDoubleQuote) {
      return `'${reference}'`;
    }
    if (hasSingleQuote) {
      return `"${reference}"`;
    }
    if (needsQuoting) {
      return `'${reference}'`;
    }
    return reference;
  }
  toLinkOrIdString() {
    if (!this.values || this.values.length === 0) {
      return this.id === null ? "" : Link.escapeReference(this.id);
    }
    return this.toString();
  }
  equals(other) {
    if (!(other instanceof Link))
      return false;
    if (this.id !== other.id)
      return false;
    const thisValues = this.values || [];
    const otherValues = other.values || [];
    if (thisValues.length !== otherValues.length)
      return false;
    for (let i = 0;i < thisValues.length; i++) {
      if (thisValues[i] && typeof thisValues[i].equals === "function") {
        if (!thisValues[i].equals(otherValues[i])) {
          return false;
        }
      } else {
        if (thisValues[i] !== otherValues[i]) {
          return false;
        }
      }
    }
    return true;
  }
  format(lessParentheses = false, isCompoundValue = false) {
    if (lessParentheses && typeof lessParentheses === "object" && (lessParentheses.constructor.name === "FormatOptions" || lessParentheses.constructor.name === "FormatConfig")) {
      return this._formatWithOptions(lessParentheses, isCompoundValue);
    }
    if (this.id === null && (!this.values || this.values.length === 0)) {
      return lessParentheses ? "" : "()";
    }
    if (!this.values || this.values.length === 0) {
      const escapedId = Link.escapeReference(this.id);
      if (isCompoundValue) {
        return `(${escapedId})`;
      }
      return lessParentheses && !this.needsParentheses(this.id) ? escapedId : `(${escapedId})`;
    }
    const valuesStr = this.values.map((v) => this.formatValue(v)).join(" ");
    if (this.id === null) {
      if (lessParentheses) {
        const allSimple = this.values.every((v) => !v.values || v.values.length === 0);
        if (allSimple) {
          const simpleValuesStr = this.values.map((v) => Link.escapeReference(v.id)).join(" ");
          return simpleValuesStr;
        }
        return valuesStr;
      }
      return `(${valuesStr})`;
    }
    const idStr = Link.escapeReference(this.id);
    const withColon = `${idStr}: ${valuesStr}`;
    return lessParentheses && !this.needsParentheses(this.id) ? withColon : `(${withColon})`;
  }
  formatValue(value) {
    if (!value || !value.format) {
      return Link.escapeReference(value && value.id || "");
    }
    const isCompoundFromPaths = this._isFromPathCombination === true;
    if (isCompoundFromPaths) {
      return value.format(false, true);
    }
    if (!value.values || value.values.length === 0) {
      return Link.escapeReference(value.id);
    }
    return value.format(false, false);
  }
  needsParentheses(str) {
    return str && (str.includes(" ") || str.includes(":") || str.includes("(") || str.includes(")"));
  }
  _formatWithOptions(options, isCompoundValue = false) {
    if (this.id === null && (!this.values || this.values.length === 0)) {
      return options.lessParentheses ? "" : "()";
    }
    if (!this.values || this.values.length === 0) {
      const escapedId = Link.escapeReference(this.id);
      if (isCompoundValue) {
        return `(${escapedId})`;
      }
      return options.lessParentheses && !this.needsParentheses(this.id) ? escapedId : `(${escapedId})`;
    }
    let shouldIndent = false;
    if (options.shouldIndentByRefCount(this.values.length)) {
      shouldIndent = true;
    } else {
      const valuesStr = this.values.map((v) => this.formatValue(v)).join(" ");
      let testLine;
      if (this.id !== null) {
        const idStr = Link.escapeReference(this.id);
        testLine = options.lessParentheses ? `${idStr}: ${valuesStr}` : `(${idStr}: ${valuesStr})`;
      } else {
        testLine = options.lessParentheses ? valuesStr : `(${valuesStr})`;
      }
      if (options.shouldIndentByLength(testLine)) {
        shouldIndent = true;
      }
    }
    if (shouldIndent && options.preferInline === false) {
      return this._formatIndented(options);
    }
    const valuesStr = this.values.map((v) => this.formatValue(v)).join(" ");
    if (this.id === null) {
      if (options.lessParentheses) {
        const allSimple = this.values.every((v) => !v.values || v.values.length === 0);
        if (allSimple) {
          return this.values.map((v) => Link.escapeReference(v.id)).join(" ");
        }
        return valuesStr;
      }
      return `(${valuesStr})`;
    }
    const idStr = Link.escapeReference(this.id);
    const withColon = `${idStr}: ${valuesStr}`;
    return options.lessParentheses && !this.needsParentheses(this.id) ? withColon : `(${withColon})`;
  }
  _formatIndented(options) {
    if (this.id === null) {
      const lines = this.values.map((v) => options.indentString + this.formatValue(v));
      return lines.join(`
`);
    }
    const idStr = Link.escapeReference(this.id);
    const lines = [`${idStr}:`];
    for (const v of this.values) {
      lines.push(options.indentString + this.formatValue(v));
    }
    return lines.join(`
`);
  }
}
function _groupConsecutiveLinks(links) {
  if (!links || links.length === 0) {
    return links;
  }
  const grouped = [];
  let i = 0;
  while (i < links.length) {
    const current = links[i];
    if (current.id !== null && current.values && current.values.length > 0) {
      const sameIdValues = [...current.values];
      let j = i + 1;
      while (j < links.length) {
        const nextLink = links[j];
        if (nextLink.id === current.id && nextLink.values && nextLink.values.length > 0) {
          sameIdValues.push(...nextLink.values);
          j++;
        } else {
          break;
        }
      }
      if (j > i + 1) {
        const groupedLink = new Link(current.id, sameIdValues);
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
function formatLinks(links, lessParentheses = false) {
  if (!links || links.length === 0)
    return "";
  if (lessParentheses && typeof lessParentheses === "object" && (lessParentheses.constructor.name === "FormatOptions" || lessParentheses.constructor.name === "FormatConfig")) {
    const options = lessParentheses;
    let linksToFormat = links;
    if (options.groupConsecutive) {
      linksToFormat = _groupConsecutiveLinks(links);
    }
    return linksToFormat.map((link) => link.format(options)).join(`
`);
  }
  return links.map((link) => link.format(lessParentheses)).join(`
`);
}
// src/LinksGroup.js
class LinksGroup {
  constructor(element, children = []) {
    this.element = element;
    this.children = children;
  }
  toList() {
    const result = [];
    this._appendToList(result);
    return result;
  }
  _appendToList(list) {
    list.push(this.element);
    if (this.children && this.children.length > 0) {
      for (const child of this.children) {
        if (child instanceof LinksGroup) {
          child._appendToList(list);
        } else {
          list.push(child);
        }
      }
    }
  }
  toString() {
    const list = this.toList();
    return list.map((item) => `(${item.id || item})`).join(" ");
  }
}
// src/ParseError.js
var QUOTED_LINE_WIDTH = 80;
var ELLIPSIS = "...";

class ParseError extends Error {
  constructor(input, error) {
    const start = positionAt(input, error?.location?.start?.offset ?? 0);
    const end = positionAt(input, error?.location?.end?.offset ?? start.offset);
    const lineText = lineAt(input, start.offset);
    const summary = `line ${start.line}, column ${start.column}: ${error.message}`;
    const snippet = quote(start.line, lineText, start.column);
    const maxDepth = error?.maxDepth ?? null;
    const kind = maxDepth === null ? "Syntax error" : "Nesting too deep";
    super(`${kind} at ${summary}
${snippet}`);
    this.name = "ParseError";
    this.cause = error;
    this.location = { ...error.location, start, end };
    this.offset = start.offset;
    this.line = start.line;
    this.column = start.column;
    this.found = error.found ?? null;
    this.lineText = lineText;
    this.snippet = snippet;
    this.maxDepth = maxDepth;
  }
}
function lineAt(input, offset) {
  const at = Math.max(0, Math.min(offset, input.length));
  const before = input.slice(0, at);
  const start = Math.max(before.lastIndexOf(`
`), before.lastIndexOf("\r")) + 1;
  const end = input.slice(start).search(/[\r\n]/);
  return input.slice(start, end === -1 ? input.length : start + end);
}
function positionAt(input, offset) {
  const at = Math.max(0, Math.min(offset, input.length));
  let line = 1;
  let column = 1;
  for (let index = 0;index < at; index++) {
    if (input[index] === "\r") {
      line++;
      column = 1;
      if (input[index + 1] === `
` && index + 1 < at)
        index++;
    } else if (input[index] === `
`) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { offset: at, line, column };
}
function quote(number, lineText, column) {
  const [quoted, at] = windowAround(lineText, column);
  const gutter = " ".repeat(String(number).length);
  return `${number} | ${quoted}
${gutter} | ${" ".repeat(at - 1)}^`;
}
function windowAround(lineText, column) {
  if (lineText.length <= QUOTED_LINE_WIDTH) {
    return [lineText, column];
  }
  const target = column - 1;
  const lastStart = lineText.length - QUOTED_LINE_WIDTH;
  const start = Math.min(Math.max(target - Math.floor(QUOTED_LINE_WIDTH / 2), 0), lastStart);
  const end = start + QUOTED_LINE_WIDTH;
  const quoted = (start > 0 ? ELLIPSIS : "") + lineText.slice(start, end) + (end < lineText.length ? ELLIPSIS : "");
  const shift = start > 0 ? ELLIPSIS.length : 0;
  return [quoted, target - start + shift + 1];
}

// src/quotes.js
var QUOTES = ['"', "'", "`"];

class DelimitedReferences {
  constructor(document) {
    this.document = document;
    this.runsByQuote = new Map;
    this.readings = new Map;
  }
  readAt(start) {
    if (!this.readings.has(start)) {
      this.readings.set(start, this.#read(start));
    }
    return this.readings.get(start);
  }
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
    const end = closing < runs.count ? runs.end(closing) : null;
    return reading(document, start, quote, count, end);
  }
  #runsOf(quote) {
    if (!this.runsByQuote.has(quote)) {
      this.runsByQuote.set(quote, new DelimiterRuns(this.document, quote));
    }
    return this.runsByQuote.get(quote);
  }
}
function reading(document, start, quote, count, end) {
  const emptyReference = count % 2 === 0 ? { value: "", length: count } : null;
  if (end === null) {
    return emptyReference;
  }
  const parts = [];
  let position = start + count;
  let run = document.indexOf(quote, position);
  while (run !== -1 && run < end) {
    const length = runLength(document, run, quote);
    const escaped = Math.floor(length / (2 * count)) * count;
    const closes = run + length === end ? count : 0;
    parts.push(document.slice(position, run));
    parts.push(quote.repeat(length - escaped - closes));
    position = run + length;
    run = document.indexOf(quote, position);
  }
  const value = parts.join("");
  if (emptyReference !== null && !isSubstantiveBody(value)) {
    return emptyReference;
  }
  return { value, length: end - start };
}
function runLength(text, start, quote) {
  let end = start;
  while (end < text.length && text[end] === quote) {
    end++;
  }
  return end - start;
}

class DelimiterRuns {
  constructor(document, quote) {
    this.starts = [];
    this.lengths = [];
    let position = document.indexOf(quote);
    while (position !== -1) {
      const length = runLength(document, position, quote);
      this.starts.push(position);
      this.lengths.push(length);
      position = document.indexOf(quote, position + length);
    }
    this.count = this.starts.length;
    this.nextLonger = new Array(this.count);
    const longer = [];
    for (let run = this.count - 1;run >= 0; run--) {
      while (longer.length > 0 && this.lengths[longer[longer.length - 1]] <= this.lengths[run]) {
        longer.pop();
      }
      this.nextLonger[run] = longer.length > 0 ? longer[longer.length - 1] : this.count;
      longer.push(run);
    }
  }
  end(run) {
    return this.starts[run] + this.lengths[run];
  }
  indexOf(position) {
    let low = 0;
    let high = this.count - 1;
    while (low < high) {
      const middle = low + high + 1 >> 1;
      if (this.starts[middle] <= position) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return low;
  }
}
function isSubstantiveBody(content) {
  let depth = 0;
  let hasVisible = false;
  for (const character of content) {
    if (character === "(") {
      depth++;
    } else if (character === ")") {
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

// src/comments.js
var COMMENT = "#";
var BEFORE_REFERENCE = [" ", "\t", `
`, "\r", "(", ":"];
var BEFORE_COMMENT = [" ", "\t", `
`, "\r"];
function stripComments(document) {
  let blanked = null;
  let position = 0;
  const references = new DelimitedReferences(document);
  while (position < document.length) {
    const character = document[position];
    if (QUOTES.includes(character) && follows(document, position, BEFORE_REFERENCE)) {
      const end = references.endAt(position);
      position = end === null ? position + 1 : end;
      continue;
    }
    if (character === COMMENT && follows(document, position, BEFORE_COMMENT)) {
      blanked = blanked ?? document.split("");
      while (position < document.length && document[position] !== `
` && document[position] !== "\r") {
        blanked[position] = " ";
        position++;
      }
      continue;
    }
    position++;
  }
  return blanked === null ? document : blanked.join("");
}
function follows(document, position, allowed) {
  return position === 0 || allowed.includes(document[position - 1]);
}

// src/parser-generated.js
class peg$SyntaxError extends SyntaxError {
  constructor(message, expected, found, location) {
    super(message);
    this.expected = expected;
    this.found = found;
    this.location = location;
    this.name = "SyntaxError";
  }
  format(sources) {
    let str = "Error: " + this.message;
    if (this.location) {
      let src = null;
      const st = sources.find((s) => s.source === this.location.source);
      if (st) {
        src = st.text.split(/\r\n|\n|\r/g);
      }
      const s = this.location.start;
      const offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
      const loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
      if (src) {
        const e = this.location.end;
        const filler = "".padEnd(offset_s.line.toString().length, " ");
        const line = src[s.line - 1];
        const last = s.line === e.line ? e.column : line.length + 1;
        const hatLen = last - s.column || 1;
        str += `
 --> ` + loc + `
` + filler + ` |
` + offset_s.line + " | " + line + `
` + filler + " | " + "".padEnd(s.column - 1, " ") + "".padEnd(hatLen, "^");
      } else {
        str += `
 at ` + loc;
      }
    }
    return str;
  }
  static buildMessage(expected, found) {
    function hex(ch) {
      return ch.codePointAt(0).toString(16).toUpperCase();
    }
    const nonPrintable = Object.prototype.hasOwnProperty.call(RegExp.prototype, "unicode") ? new RegExp("[\\p{C}\\p{Mn}\\p{Mc}]", "gu") : null;
    function unicodeEscape(s) {
      if (nonPrintable) {
        return s.replace(nonPrintable, (ch) => "\\u{" + hex(ch) + "}");
      }
      return s;
    }
    function literalEscape(s) {
      return unicodeEscape(s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, (ch) => "\\x0" + hex(ch)).replace(/[\x10-\x1F\x7F-\x9F]/g, (ch) => "\\x" + hex(ch)));
    }
    function classEscape(s) {
      return unicodeEscape(s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, (ch) => "\\x0" + hex(ch)).replace(/[\x10-\x1F\x7F-\x9F]/g, (ch) => "\\x" + hex(ch)));
    }
    const DESCRIBE_EXPECTATION_FNS = {
      literal(expectation) {
        return '"' + literalEscape(expectation.text) + '"';
      },
      class(expectation) {
        const escapedParts = expectation.parts.map((part) => Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part));
        return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]" + (expectation.unicode ? "u" : "");
      },
      any() {
        return "any character";
      },
      end() {
        return "end of input";
      },
      other(expectation) {
        return expectation.description;
      }
    };
    function describeExpectation(expectation) {
      return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }
    function describeExpected(expected) {
      const descriptions = expected.map(describeExpectation);
      descriptions.sort();
      if (descriptions.length > 0) {
        let j = 1;
        for (let i = 1;i < descriptions.length; i++) {
          if (descriptions[i - 1] !== descriptions[i]) {
            descriptions[j] = descriptions[i];
            j++;
          }
        }
        descriptions.length = j;
      }
      switch (descriptions.length) {
        case 1:
          return descriptions[0];
        case 2:
          return descriptions[0] + " or " + descriptions[1];
        default:
          return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
      }
    }
    function describeFound(found) {
      return found ? '"' + literalEscape(found) + '"' : "end of input";
    }
    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  }
}
function peg$parse(input, options) {
  options = options !== undefined ? options : {};
  const peg$FAILED = {};
  const peg$source = options.grammarSource;
  const peg$startRuleFunctions = {
    document: peg$parsedocument
  };
  let peg$startRuleFunction = peg$parsedocument;
  const peg$c0 = "(";
  const peg$c1 = ")";
  const peg$c2 = ":";
  const peg$c3 = '"';
  const peg$c4 = "'";
  const peg$c5 = "`";
  const peg$c6 = " ";
  const peg$r0 = /^[ \t]/;
  const peg$r1 = /^[\r\n]/;
  const peg$r2 = /^[ \t\n\r]/;
  const peg$r3 = /^[^ \t\n\r(:)]/;
  const peg$e0 = peg$classExpectation([" ", "\t"], false, false, false);
  const peg$e1 = peg$classExpectation(["\r", `
`], false, false, false);
  const peg$e2 = peg$anyExpectation();
  const peg$e3 = peg$literalExpectation("(", false);
  const peg$e4 = peg$literalExpectation(")", false);
  const peg$e5 = peg$literalExpectation(":", false);
  const peg$e6 = peg$literalExpectation('"', false);
  const peg$e7 = peg$literalExpectation("'", false);
  const peg$e8 = peg$literalExpectation("`", false);
  const peg$e9 = peg$literalExpectation(" ", false);
  const peg$e10 = peg$classExpectation([" ", "\t", `
`, "\r"], false, false, false);
  const peg$e11 = peg$classExpectation([" ", "\t", `
`, "\r", "(", ":", ")"], true, false, false);
  function peg$f0() {
    return resetState();
  }
  function peg$f1(links) {
    return links;
  }
  function peg$f2() {
    return resetState();
  }
  function peg$f3() {
    return [];
  }
  function peg$f4(fl, list) {
    popIndentation();
    return [fl].concat(list || []);
  }
  function peg$f5(l) {
    return l;
  }
  function peg$f6(l) {
    return l;
  }
  function peg$f7() {
    return !unreadableLines.has(lineKey(offset()));
  }
  function peg$f8(start, e) {
    return checkDepth(depth(), start);
  }
  function peg$f9(start, e, saved, l) {
    if (l === null) {
      indentationStack = saved;
      return e;
    }
    return Object.assign({}, e, { children: l });
  }
  function peg$f10() {
    unreadableLines.add(lineKey(offset()));
    return false;
  }
  function peg$f11(l) {
    return l;
  }
  function peg$f12(i) {
    return { id: i };
  }
  function peg$f13(g, rest) {
    return rest === null ? g : { values: [g].concat(rest) };
  }
  function peg$f14() {
    return null;
  }
  function peg$f15(fl) {
    return fl;
  }
  function peg$f16(vl) {
    return vl;
  }
  function peg$f17(start) {
    return checkDepth(depth() + 1, start);
  }
  function peg$f18(start, body) {
    exitNestedContext();
    return body;
  }
  function peg$f19() {
    exitNestedContext();
    return false;
  }
  function peg$f20(l) {
    return { nested: l };
  }
  function peg$f21() {
    return { nested: [] };
  }
  function peg$f22() {
    return enterNestedContext();
  }
  function peg$f23() {
    return location();
  }
  function peg$f24(value) {
    return value;
  }
  function peg$f25(list) {
    return list;
  }
  function peg$f26(id, v) {
    return { id, values: v };
  }
  function peg$f27(v) {
    return { values: v };
  }
  function peg$f28(id) {
    return { id, values: [] };
  }
  function peg$f29(chars) {
    return chars.join("");
  }
  function peg$f30() {
    const pos = offset();
    const result = parseQuotedStringAt(input, pos, '"');
    if (result) {
      parsedValue = result.value;
      parsedLength = result.length;
      return true;
    }
    return false;
  }
  function peg$f31(chars) {
    return parsedValue;
  }
  function peg$f32(c, cs) {
    return [c].concat(cs).join("");
  }
  function peg$f33() {
    return parsedLength > 1 && (parsedLength--, true);
  }
  function peg$f34(c) {
    return c;
  }
  function peg$f35() {
    const pos = offset();
    const result = parseQuotedStringAt(input, pos, "'");
    if (result) {
      parsedValue = result.value;
      parsedLength = result.length;
      return true;
    }
    return false;
  }
  function peg$f36(chars) {
    return parsedValue;
  }
  function peg$f37(c, cs) {
    return [c].concat(cs).join("");
  }
  function peg$f38() {
    return parsedLength > 1 && (parsedLength--, true);
  }
  function peg$f39(c) {
    return c;
  }
  function peg$f40() {
    const pos = offset();
    const result = parseQuotedStringAt(input, pos, "`");
    if (result) {
      parsedValue = result.value;
      parsedLength = result.length;
      return true;
    }
    return false;
  }
  function peg$f41(chars) {
    return parsedValue;
  }
  function peg$f42(c, cs) {
    return [c].concat(cs).join("");
  }
  function peg$f43() {
    return parsedLength > 1 && (parsedLength--, true);
  }
  function peg$f44(c) {
    return c;
  }
  function peg$f45() {
    return indentationStack.slice();
  }
  function peg$f46(spaces) {
    setBaseIndentation(spaces);
  }
  function peg$f47(spaces) {
    return normalizeIndentation(spaces) > getCurrentIndentation();
  }
  function peg$f48(spaces) {
    pushIndentation(spaces);
  }
  function peg$f49(spaces) {
    return checkIndentation(spaces);
  }
  function peg$f50() {
    return isInsideNestedContext();
  }
  let peg$currPos = options.peg$currPos | 0;
  let peg$savedPos = peg$currPos;
  const peg$posDetailsCache = [{ line: 1, column: 1 }];
  let peg$maxFailPos = peg$currPos;
  let peg$maxFailExpected = options.peg$maxFailExpected || [];
  let peg$silentFails = options.peg$silentFails | 0;
  let peg$result;
  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }
  function offset() {
    return peg$savedPos;
  }
  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }
  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }
  function expected(description, location) {
    location = location !== undefined ? location : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildStructuredError([peg$otherExpectation(description)], input.substring(peg$savedPos, peg$currPos), location);
  }
  function error(message, location) {
    location = location !== undefined ? location : peg$computeLocation(peg$savedPos, peg$currPos);
    throw peg$buildSimpleError(message, location);
  }
  function peg$getUnicode(pos = peg$currPos) {
    const cp = input.codePointAt(pos);
    if (cp === undefined) {
      return "";
    }
    return String.fromCodePoint(cp);
  }
  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase, unicode) {
    return { type: "class", parts, inverted, ignoreCase, unicode };
  }
  function peg$anyExpectation() {
    return { type: "any" };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    let details = peg$posDetailsCache[pos];
    let p;
    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {}
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset) {
    const startPosDetails = peg$computePosDetails(startPos);
    const endPosDetails = peg$computePosDetails(endPos);
    const res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset && peg$source && typeof peg$source.offset === "function") {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }
  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected);
  }
  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }
  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
  }
  function peg$parsedocument() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    peg$savedPos = peg$currPos;
    s1 = peg$f0();
    if (s1) {
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseskipEmptyLines();
      s3 = peg$parselinks();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        s5 = peg$parseeof();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f1(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      peg$savedPos = peg$currPos;
      s1 = peg$f2();
      if (s1) {
        s1 = undefined;
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        s3 = peg$parseeof();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f3();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseskipEmptyLines() {
    let s0, s1, s2, s3;
    s0 = [];
    s1 = peg$currPos;
    s2 = [];
    s3 = input.charAt(peg$currPos);
    if (peg$r0.test(s3)) {
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    while (s3 !== peg$FAILED) {
      s2.push(s3);
      s3 = input.charAt(peg$currPos);
      if (peg$r0.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
    }
    s3 = input.charAt(peg$currPos);
    if (peg$r1.test(s3)) {
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e1);
      }
    }
    if (s3 !== peg$FAILED) {
      s2 = [s2, s3];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$currPos;
      s2 = [];
      s3 = input.charAt(peg$currPos);
      if (peg$r0.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = input.charAt(peg$currPos);
        if (peg$r0.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
      }
      s3 = input.charAt(peg$currPos);
      if (peg$r1.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e1);
        }
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parselinks() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$parsefirstLine();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseline();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseline();
      }
      peg$savedPos = s0;
      s0 = peg$f4(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsefirstLine() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parseSET_BASE_INDENTATION();
    s2 = peg$parseelement();
    if (s2 !== peg$FAILED) {
      peg$savedPos = s0;
      s0 = peg$f5(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseline() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parseCHECK_INDENTATION();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseelement();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f6(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseelement() {
    let s0, s1, s2, s3, s4, s5, s6, s7, s8;
    s0 = peg$currPos;
    peg$savedPos = peg$currPos;
    s1 = peg$f7();
    if (s1) {
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseHERE();
      s3 = peg$parseanyLink();
      if (s3 !== peg$FAILED) {
        peg$savedPos = peg$currPos;
        s4 = peg$f8(s2, s3);
        if (s4) {
          s4 = undefined;
        } else {
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parseSAVE_INDENTATION();
          s6 = peg$currPos;
          s7 = peg$parsePUSH_INDENTATION();
          if (s7 !== peg$FAILED) {
            s8 = peg$parselinks();
            if (s8 !== peg$FAILED) {
              s6 = s8;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
          if (s6 === peg$FAILED) {
            s6 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f9(s2, s3, s5, s6);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      peg$savedPos = peg$currPos;
      s1 = peg$f10();
      if (s1) {
        s1 = undefined;
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parsereferenceOrLink() {
    let s0, s1;
    s0 = peg$currPos;
    s1 = peg$parsenestedGroup();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f11(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsereference();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f12(s1);
      }
      s0 = s1;
    }
    return s0;
  }
  function peg$parseanyLink() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 40) {
      s2 = peg$c0;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e3);
      }
    }
    peg$silentFails--;
    if (s2 !== peg$FAILED) {
      peg$currPos = s1;
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsegroupLink();
      if (s2 !== peg$FAILED) {
        s0 = s2;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 40) {
        s2 = peg$c0;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e3);
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = undefined;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseindentedIdLink();
        if (s2 === peg$FAILED) {
          s2 = peg$parsesingleLineAnyLink();
        }
        if (s2 !== peg$FAILED) {
          s0 = s2;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parsegroupLink() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parsenestedGroup();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsegroupLinkRest();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f13(s1, s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsegroupLinkRest() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parseeol();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f14();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsesingleLineValueAndWhitespace();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsesingleLineValueAndWhitespace();
      }
      s2 = peg$parseeol();
      if (s2 !== peg$FAILED) {
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parsesingleLineAnyLink() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parsesingleLineLink();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseeol();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f15(s1);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsesingleLineValueLink();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseeol();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f16(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parsenestedGroup() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parseHERE();
    if (input.charCodeAt(peg$currPos) === 40) {
      s2 = peg$c0;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e3);
      }
    }
    if (s2 !== peg$FAILED) {
      peg$savedPos = peg$currPos;
      s3 = peg$f17(s1);
      if (s3) {
        s3 = undefined;
      } else {
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parseENTER_NESTED_CONTEXT();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsenestedGroupBody();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f18(s1, s5);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c0;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e3);
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = peg$currPos;
        s2 = peg$f19();
        if (s2) {
          s2 = undefined;
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parsenestedGroupBody() {
    let s0, s1, s2, s3, s4;
    s0 = peg$currPos;
    s1 = peg$parseskipEmptyLines();
    s2 = peg$parselinks();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 41) {
        s4 = peg$c1;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      if (s4 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f20(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parse_();
      if (input.charCodeAt(peg$currPos) === 41) {
        s2 = peg$c1;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f21();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    return s0;
  }
  function peg$parseENTER_NESTED_CONTEXT() {
    let s0;
    peg$savedPos = peg$currPos;
    s0 = peg$f22();
    if (s0) {
      s0 = undefined;
    } else {
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseHERE() {
    let s0, s1;
    s0 = peg$currPos;
    s1 = "";
    peg$savedPos = s0;
    s1 = peg$f23();
    s0 = s1;
    return s0;
  }
  function peg$parsesingleLineValueAndWhitespace() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parse__();
    s2 = peg$parsereferenceOrLink();
    if (s2 !== peg$FAILED) {
      peg$savedPos = s0;
      s0 = peg$f24(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsesingleLineValues() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsesingleLineValueAndWhitespace();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsesingleLineValueAndWhitespace();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f25(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parsesingleLineLink() {
    let s0, s1, s2, s3, s4, s5;
    s0 = peg$currPos;
    s1 = peg$parse__();
    s2 = peg$parsereference();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse__();
      if (input.charCodeAt(peg$currPos) === 58) {
        s4 = peg$c2;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e5);
        }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parsesingleLineValues();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f26(s2, s5);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsesingleLineValueLink() {
    let s0, s1;
    s0 = peg$currPos;
    s1 = peg$parsesingleLineValues();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f27(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parseindentedIdLink() {
    let s0, s1, s2, s3, s4;
    s0 = peg$currPos;
    s1 = peg$parsereference();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (input.charCodeAt(peg$currPos) === 58) {
        s3 = peg$c2;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e5);
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parseeol();
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f28(s1);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsereference() {
    let s0;
    s0 = peg$parsequotedReference();
    if (s0 === peg$FAILED) {
      s0 = peg$parsesimpleReference();
    }
    return s0;
  }
  function peg$parsesimpleReference() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsereferenceSymbol();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsereferenceSymbol();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f29(s1);
    }
    s0 = s1;
    return s0;
  }
  function peg$parsequotedReference() {
    let s0;
    s0 = peg$parsedoubleQuotedUniversal();
    if (s0 === peg$FAILED) {
      s0 = peg$parsesingleQuotedUniversal();
      if (s0 === peg$FAILED) {
        s0 = peg$parsebacktickQuotedUniversal();
      }
    }
    return s0;
  }
  function peg$parsedoubleQuotedUniversal() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 34) {
      s2 = peg$c3;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e6);
      }
    }
    peg$silentFails--;
    if (s2 !== peg$FAILED) {
      peg$currPos = s1;
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = peg$currPos;
      s2 = peg$f30();
      if (s2) {
        s2 = undefined;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseconsumeDouble();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f31(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconsumeDouble() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseconsumeDoubleMore();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseconsumeDoubleMore();
      }
      peg$savedPos = s0;
      s0 = peg$f32(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconsumeDoubleMore() {
    let s0, s1, s2;
    s0 = peg$currPos;
    peg$savedPos = peg$currPos;
    s1 = peg$f33();
    if (s1) {
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e2);
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f34(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsesingleQuotedUniversal() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 39) {
      s2 = peg$c4;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e7);
      }
    }
    peg$silentFails--;
    if (s2 !== peg$FAILED) {
      peg$currPos = s1;
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = peg$currPos;
      s2 = peg$f35();
      if (s2) {
        s2 = undefined;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseconsumeSingle();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f36(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconsumeSingle() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseconsumeSingleMore();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseconsumeSingleMore();
      }
      peg$savedPos = s0;
      s0 = peg$f37(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconsumeSingleMore() {
    let s0, s1, s2;
    s0 = peg$currPos;
    peg$savedPos = peg$currPos;
    s1 = peg$f38();
    if (s1) {
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e2);
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f39(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsebacktickQuotedUniversal() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 96) {
      s2 = peg$c5;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e8);
      }
    }
    peg$silentFails--;
    if (s2 !== peg$FAILED) {
      peg$currPos = s1;
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = peg$currPos;
      s2 = peg$f40();
      if (s2) {
        s2 = undefined;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseconsumeBacktick();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f41(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconsumeBacktick() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseconsumeBacktickMore();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseconsumeBacktickMore();
      }
      peg$savedPos = s0;
      s0 = peg$f42(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseconsumeBacktickMore() {
    let s0, s1, s2;
    s0 = peg$currPos;
    peg$savedPos = peg$currPos;
    s1 = peg$f43();
    if (s1) {
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e2);
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f44(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseSAVE_INDENTATION() {
    let s0, s1;
    s0 = peg$currPos;
    s1 = "";
    peg$savedPos = s0;
    s1 = peg$f45();
    s0 = s1;
    return s0;
  }
  function peg$parseSET_BASE_INDENTATION() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    if (input.charCodeAt(peg$currPos) === 32) {
      s2 = peg$c6;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (input.charCodeAt(peg$currPos) === 32) {
        s2 = peg$c6;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f46(s1);
    s0 = s1;
    return s0;
  }
  function peg$parsePUSH_INDENTATION() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    if (input.charCodeAt(peg$currPos) === 32) {
      s2 = peg$c6;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (input.charCodeAt(peg$currPos) === 32) {
        s2 = peg$c6;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
    }
    peg$savedPos = peg$currPos;
    s2 = peg$f47(s1);
    if (s2) {
      s2 = undefined;
    } else {
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      peg$savedPos = s0;
      s0 = peg$f48(s1);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseCHECK_INDENTATION() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    if (input.charCodeAt(peg$currPos) === 32) {
      s2 = peg$c6;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (input.charCodeAt(peg$currPos) === 32) {
        s2 = peg$c6;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
    }
    peg$savedPos = peg$currPos;
    s2 = peg$f49(s1);
    if (s2) {
      s2 = undefined;
    } else {
      s2 = peg$FAILED;
    }
    if (s2 !== peg$FAILED) {
      s1 = [s1, s2];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseeol() {
    let s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parse__();
    s2 = peg$parselineBreaks();
    if (s2 === peg$FAILED) {
      s2 = peg$parseeof();
      if (s2 === peg$FAILED) {
        s2 = peg$parsenestedGroupEnd();
      }
    }
    if (s2 !== peg$FAILED) {
      s1 = [s1, s2];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parselineBreaks() {
    let s0, s1, s2, s3, s4, s5, s6;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r1.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e1);
      }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r1.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r0.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
      if (s5 !== peg$FAILED) {
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r0.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
        }
      } else {
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s5 = [];
        s6 = input.charAt(peg$currPos);
        if (peg$r1.test(s6)) {
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e1);
          }
        }
        if (s6 !== peg$FAILED) {
          while (s6 !== peg$FAILED) {
            s5.push(s6);
            s6 = input.charAt(peg$currPos);
            if (peg$r1.test(s6)) {
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e1);
              }
            }
          }
        } else {
          s5 = peg$FAILED;
        }
        if (s5 !== peg$FAILED) {
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = [];
        s5 = input.charAt(peg$currPos);
        if (peg$r0.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e0);
          }
        }
        if (s5 !== peg$FAILED) {
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = input.charAt(peg$currPos);
            if (peg$r0.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e0);
              }
            }
          }
        } else {
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s5 = [];
          s6 = input.charAt(peg$currPos);
          if (peg$r1.test(s6)) {
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e1);
            }
          }
          if (s6 !== peg$FAILED) {
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = input.charAt(peg$currPos);
              if (peg$r1.test(s6)) {
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e1);
                }
              }
            }
          } else {
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      s1 = [s1, s2];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsenestedGroupEnd() {
    let s0, s1, s2, s3;
    s0 = peg$currPos;
    peg$savedPos = peg$currPos;
    s1 = peg$f50();
    if (s1) {
      s1 = undefined;
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 41) {
        s3 = peg$c1;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      peg$silentFails--;
      if (s3 !== peg$FAILED) {
        peg$currPos = s2;
        s2 = undefined;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parseeof() {
    let s0, s1;
    s0 = peg$currPos;
    peg$silentFails++;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e2);
      }
    }
    peg$silentFails--;
    if (s1 === peg$FAILED) {
      s0 = undefined;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parse__() {
    let s0, s1;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r0.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r0.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
    }
    return s0;
  }
  function peg$parse_() {
    let s0, s1;
    s0 = [];
    s1 = peg$parsewhiteSpaceSymbol();
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsewhiteSpaceSymbol();
    }
    return s0;
  }
  function peg$parsewhiteSpaceSymbol() {
    let s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r2.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e10);
      }
    }
    return s0;
  }
  function peg$parsereferenceSymbol() {
    let s0;
    s0 = input.charAt(peg$currPos);
    if (peg$r3.test(s0)) {
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e11);
      }
    }
    return s0;
  }
  let indentationStack = [0];
  let baseIndentation = null;
  let contextStack = [];
  let contextDepth = 0;
  const maxDepth = options.maxDepth ?? Infinity;
  let unreadableLines = new Set;
  function resetState() {
    indentationStack = [0];
    baseIndentation = null;
    contextStack = [];
    contextDepth = 0;
    unreadableLines = new Set;
    return true;
  }
  function lineKey(position) {
    return contextStack.length > 0 ? -1 - position : position;
  }
  function enterNestedContext() {
    contextStack.push({ indentationStack, baseIndentation, contextDepth });
    contextDepth = depth() + 1;
    indentationStack = [0];
    baseIndentation = null;
    return true;
  }
  function exitNestedContext() {
    const saved = contextStack.pop();
    if (saved) {
      indentationStack = saved.indentationStack;
      baseIndentation = saved.baseIndentation;
      contextDepth = saved.contextDepth;
    }
    return true;
  }
  function depth() {
    return contextDepth + indentationStack.length - 1;
  }
  function checkDepth(levels, where) {
    if (levels <= maxDepth) {
      return true;
    }
    try {
      error(`nesting depth exceeds the maximum of ${maxDepth}`, where);
    } catch (tooDeep) {
      tooDeep.maxDepth = maxDepth;
      throw tooDeep;
    }
  }
  function isInsideNestedContext() {
    return contextStack.length > 0;
  }
  function setBaseIndentation(spaces) {
    if (baseIndentation === null) {
      baseIndentation = spaces.length;
    }
  }
  function normalizeIndentation(spaces) {
    if (baseIndentation === null) {
      return spaces.length;
    }
    return Math.max(0, spaces.length - baseIndentation);
  }
  function pushIndentation(spaces) {
    const normalized = normalizeIndentation(spaces);
    indentationStack.push(normalized);
  }
  function popIndentation() {
    if (indentationStack.length > 1) {
      indentationStack.pop();
    }
  }
  function checkIndentation(spaces) {
    const normalized = normalizeIndentation(spaces);
    return normalized >= indentationStack[indentationStack.length - 1];
  }
  function getCurrentIndentation() {
    return indentationStack[indentationStack.length - 1];
  }
  const delimitedReferences = new DelimitedReferences(input);
  function parseQuotedStringAt(inputStr, startPos, quoteChar) {
    if (startPos >= inputStr.length || inputStr[startPos] !== quoteChar) {
      return null;
    }
    return delimitedReferences.readAt(startPos);
  }
  let parsedValue = null;
  let parsedLength = 0;
  peg$result = peg$startRuleFunction();
  const peg$success = peg$result !== peg$FAILED && peg$currPos === input.length;
  function peg$throw() {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? peg$getUnicode(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
  }
  if (options.peg$library) {
    return {
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos,
      peg$success,
      peg$throw: peg$success ? undefined : peg$throw
    };
  }
  if (peg$success) {
    return peg$result;
  } else {
    peg$throw();
  }
}

// src/Parser.js
var DEFAULT_MAX_DEPTH = 64;

class Parser {
  constructor(options = {}) {
    this.maxInputSize = options.maxInputSize || 10 * 1024 * 1024;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.comments = options.comments ?? true;
  }
  parse(input) {
    if (typeof input !== "string") {
      throw new TypeError("Input must be a string");
    }
    if (input.length > this.maxInputSize) {
      throw new Error(`Input size exceeds maximum allowed size of ${this.maxInputSize} bytes`);
    }
    const prepared = this.comments ? stripComments(input) : input;
    try {
      const rawResult = peg$parse(prepared, {
        maxDepth: this.maxDepth
      });
      return this.transformResult(rawResult);
    } catch (error) {
      if (error && error.location) {
        throw new ParseError(input, error);
      }
      const parseError = new Error(`Parse error: ${error.message}`);
      parseError.cause = error;
      throw parseError;
    }
  }
  transformResult(rawResult) {
    const links = [];
    const items = Array.isArray(rawResult) ? rawResult : [rawResult];
    for (const item of items) {
      if (item !== null && item !== undefined) {
        this.collectLinks(item, [], links);
      }
    }
    return links;
  }
  collectLinks(item, parentPath, result) {
    if (item === null || item === undefined)
      return;
    if (item.children && item.children.length > 0) {
      if (item.id !== undefined && item.id !== null && (!item.values || item.values.length === 0)) {
        const childValues = item.children.map((child) => this.transformIndentedValue(child));
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
        const currentLink = this.transformLink(item);
        if (parentPath.length === 0) {
          result.push(currentLink);
        } else {
          result.push(this.combinePathElements(parentPath, currentLink));
        }
        const newPath = [...parentPath, currentLink];
        for (const child of item.children) {
          this.collectLinks(child, newPath, result);
        }
      }
    } else {
      const currentLink = this.transformLink(item);
      if (parentPath.length === 0) {
        result.push(currentLink);
      } else {
        result.push(this.combinePathElements(parentPath, currentLink));
      }
    }
  }
  transformIndentedValue(item) {
    const children = item.children || [];
    if (children.length && item.id != null && !item.values?.length) {
      return new Link(item.id, children.map((child) => this.transformIndentedValue(child)));
    }
    const current = this.transformLink(item);
    if (children.length) {
      return new Link(current.id, [
        ...current.values,
        ...children.map((child) => this.transformIndentedValue(child))
      ]);
    }
    if (item.id == null && item.nested === undefined && current.values.length === 1) {
      return current.values[0];
    }
    return current;
  }
  combinePathElements(pathElements, current) {
    if (pathElements.length === 0)
      return current;
    if (pathElements.length === 1) {
      const combined = new Link(null, [pathElements[0], current]);
      combined._isFromPathCombination = true;
      return combined;
    }
    const parentPath = pathElements.slice(0, -1);
    const lastElement = pathElements[pathElements.length - 1];
    let parent = this.combinePathElements(parentPath, lastElement);
    const combined = new Link(null, [parent, current]);
    combined._isFromPathCombination = true;
    return combined;
  }
  transformNested(nested) {
    const nestedLinks = [];
    for (const item of nested) {
      if (item !== null && item !== undefined) {
        this.collectLinks(item, [], nestedLinks);
      }
    }
    const wrapsSingleGroup = nested.length === 1 && nested[0] && nested[0].nested !== undefined;
    if (nestedLinks.length === 1 && !wrapsSingleGroup) {
      return nestedLinks[0];
    }
    return new Link(null, nestedLinks);
  }
  transformLink(item) {
    if (item === null || item === undefined)
      return null;
    if (item instanceof Link) {
      return item;
    }
    if (item.nested !== undefined) {
      return this.transformNested(item.nested);
    }
    if (item.id !== undefined && !item.values && !item.children) {
      return new Link(item.id);
    }
    if (item.values && Array.isArray(item.values)) {
      const link = new Link(item.id ?? null, []);
      link.values = item.values.map((v) => this.transformLink(v));
      return link;
    }
    return new Link(item.id ?? null, []);
  }
}
// src/StreamParser.js
import { EventEmitter } from "events";
var DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;

class StreamParseError extends Error {
  constructor(error, startOffset, startLine) {
    const localOffset = error?.offset ?? 0;
    const localLine = error?.line ?? 1;
    const column = error?.column ?? 1;
    const line = startLine + localLine - 1;
    super(`Stream parse error at line ${line}, column ${column}: ${error.message}`);
    this.name = "StreamParseError";
    this.cause = error;
    this.offset = startOffset + localOffset;
    this.line = line;
    this.column = column;
    this.found = error?.found ?? null;
    this.lineText = error?.lineText ?? "";
    this.snippet = error?.snippet ?? "";
  }
}

class StreamParser extends EventEmitter {
  constructor(options = {}) {
    super();
    this.parser = options.parser ?? new Parser(options);
    this.comments = options.comments ?? this.parser.comments ?? true;
    this.maxBufferSize = options.maxBufferSize ?? options.maxInputSize ?? DEFAULT_MAX_BUFFER_SIZE;
    this.collect = options.collect ?? true;
    this.reset();
  }
  write(chunk) {
    if (typeof chunk !== "string") {
      return this._fail(new TypeError("Input must be a string"));
    }
    if (this.ended) {
      return this._fail(new Error("Cannot write after end()"));
    }
    const emitted = [];
    for (let index = 0;index < chunk.length; index++) {
      const character = chunk[index];
      this.currentLine += character;
      this.offset += 1;
      if (character === `
`) {
        this.buffer += this.currentLine;
        this.currentLine = "";
        this.lineClassified = false;
        this.line += 1;
        this.column = 1;
      } else {
        if (!this.lineClassified && character !== " " && character !== "\t" && character !== "\r") {
          this.lineClassified = true;
          const isComment = this.comments && character === "#";
          if (!isComment) {
            const indentation = leadingSpaces(this.currentLine);
            this._startContentLine(indentation, emitted);
          }
        }
        this.column += 1;
      }
      if (this.buffer.length + this.currentLine.length > this.maxBufferSize) {
        return this._fail(new RangeError(`Buffered record exceeds maximum size of ${this.maxBufferSize} characters`));
      }
    }
    return emitted;
  }
  end(chunk = "") {
    const emitted = chunk === "" ? [] : this.write(chunk);
    if (this.ended) {
      return this.collect ? [...this.links] : emitted;
    }
    const document = this.buffer + this.currentLine;
    if (document.length > 0) {
      let links;
      try {
        links = this.parser.parse(document);
      } catch (error) {
        const streamError = new StreamParseError(error, this.segmentOffset, this.segmentLine);
        return this._fail(streamError);
      }
      this._publish(links, emitted);
      this._advanceSegment(document);
    }
    this.buffer = "";
    this.currentLine = "";
    this.baseIndentation = null;
    this.ended = true;
    const result = this.collect ? [...this.links] : emitted;
    this.emit("end", result);
    return result;
  }
  drain() {
    const links = this.links;
    this.links = [];
    return links;
  }
  reset() {
    this.buffer = "";
    this.currentLine = "";
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
  position() {
    return {
      offset: this.offset,
      line: this.line,
      column: this.column,
      buffered: this.buffer.length + this.currentLine.length
    };
  }
  static *parse(chunks, options = {}) {
    const parser = new StreamParser({ ...options, collect: false });
    for (const chunk of chunks) {
      yield* parser.write(chunk);
    }
    yield* parser.end();
  }
  static async* parseAsync(chunks, options = {}) {
    const parser = new StreamParser({ ...options, collect: false });
    for await (const chunk of chunks) {
      yield* parser.write(chunk);
    }
    yield* parser.end();
  }
  _startContentLine(indentation, emitted) {
    if (this.buffer.length > 0 && this.baseIndentation !== null && indentation <= this.baseIndentation && structurallyComplete(this.buffer, this.comments)) {
      let links;
      try {
        links = this.parser.parse(this.buffer);
      } catch {
        links = null;
      }
      if (links !== null) {
        this._publish(links, emitted);
        this._advanceSegment(this.buffer);
        this.buffer = "";
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
      if (this.collect)
        this.links.push(link);
      this.emit("link", link);
    }
  }
  _advanceSegment(document) {
    this.segmentOffset += document.length;
    this.segmentLine += countNewlines(document);
  }
  _fail(error) {
    this.emit("error", error);
    throw error;
  }
}
function leadingSpaces(line) {
  let indentation = 0;
  while (line[indentation] === " ")
    indentation += 1;
  return indentation;
}
function countNewlines(value) {
  let count = 0;
  for (const character of value) {
    if (character === `
`)
      count += 1;
  }
  return count;
}
function structurallyComplete(document, comments) {
  const quotes = ['"', "'", "`"];
  const beforeReference = [" ", "\t", `
`, "\r", "(", ":"];
  const beforeComment = [" ", "\t", `
`, "\r"];
  const references = new DelimitedReferences(document);
  let depth = 0;
  for (let position = 0;position < document.length; position++) {
    const character = document[position];
    const previous = position === 0 ? null : document[position - 1];
    if (quotes.includes(character) && (previous === null || beforeReference.includes(previous))) {
      const end = references.endAt(position);
      if (end === null)
        return false;
      position = end - 1;
      continue;
    }
    if (comments && character === "#" && (previous === null || beforeComment.includes(previous))) {
      const newline = document.indexOf(`
`, position);
      if (newline === -1)
        return true;
      position = newline;
      continue;
    }
    if (character === "(")
      depth += 1;
    if (character === ")")
      depth -= 1;
  }
  return depth === 0;
}
// src/FormatOptions.js
class FormatOptions {
  constructor(options = {}) {
    this.lessParentheses = options.lessParentheses ?? false;
    this.maxLineLength = options.maxLineLength ?? 80;
    this.indentLongLines = options.indentLongLines ?? false;
    this.maxInlineRefs = options.maxInlineRefs ?? null;
    this.groupConsecutive = options.groupConsecutive ?? false;
    this.indentString = options.indentString ?? "  ";
    this.preferInline = options.preferInline ?? true;
  }
  shouldIndentByLength(line) {
    if (!this.indentLongLines) {
      return false;
    }
    return line.length > this.maxLineLength;
  }
  shouldIndentByRefCount(refCount) {
    if (this.maxInlineRefs === null) {
      return false;
    }
    return refCount > this.maxInlineRefs;
  }
}

// src/FormatConfig.js
class FormatConfig extends FormatOptions {
}
// src/Binary.js
var U64 = (1n << 64n) - 1n;
var WIDTHS = [1, 2, 4, 8];
function requireValue(condition, message) {
  if (!condition)
    throw new RangeError(message);
}
function uint64(value) {
  requireValue(typeof value === "bigint" || Number.isSafeInteger(value) && value >= 0, "expected uint64");
  const result = BigInt(value);
  requireValue(result >= 0n && result <= U64, "uint64 overflow");
  return result;
}

class External {
  constructor(value) {
    this.value = uint64(value);
  }
}

class ArityRange {
  constructor(min = 2, max = 2) {
    this.min = uint64(min);
    this.max = max === null ? null : uint64(max);
    requireValue(this.min > 0n && this.min <= U64 >> 4n && (this.max === null || this.max >= this.min), "invalid arity");
  }
  contains(length) {
    return BigInt(length) >= this.min && (this.max === null || BigInt(length) <= this.max);
  }
  get fixed() {
    return this.min === this.max;
  }
  static parse(text) {
    requireValue(/^[0-9]+(?:\.\.[0-9]*)?$/.test(text), "invalid arity");
    const parts = text.split("..");
    return new ArityRange(BigInt(parts[0]), parts.at(-1) === "" ? null : BigInt(parts.at(-1)));
  }
}

class DecodeLimits {
  constructor(values = {}) {
    Object.assign(this, {
      maxLinks: 2 ** 22,
      maxReferences: 2 ** 24,
      maxNodes: 2 ** 22,
      maxStringBytes: 64 * 2 ** 20,
      maxDepth: 64
    }, values);
    for (const key of Object.keys(this)) {
      requireValue([
        "maxLinks",
        "maxReferences",
        "maxNodes",
        "maxStringBytes",
        "maxDepth"
      ].includes(key), "unknown limit");
      requireValue(Number.isSafeInteger(this[key]) && this[key] >= 0, "invalid limit");
    }
  }
  static unlimited() {
    return new DecodeLimits({
      maxLinks: Number.MAX_SAFE_INTEGER,
      maxReferences: Number.MAX_SAFE_INTEGER,
      maxNodes: Number.MAX_SAFE_INTEGER,
      maxStringBytes: Number.MAX_SAFE_INTEGER,
      maxDepth: Number.MAX_SAFE_INTEGER
    });
  }
}

class BinaryLinoOptions {
  constructor(externalReferences = false, arity = new ArityRange, packedWidths = false) {
    Object.assign(this, { externalReferences, arity, packedWidths });
  }
  static ofPacket(packet) {
    let min = 2, max = 2;
    for (const [, link] of packet.links()) {
      min = Math.min(min, link.length);
      max = Math.max(max, link.length);
    }
    return new BinaryLinoOptions(packet.externalReferences, new ArityRange(min, max), new Set(packet.sections.map((s) => s.width)).size > 1);
  }
}

class Section {
  constructor(gap, arity, width, links) {
    Object.assign(this, { gap: uint64(gap), arity, width, links });
  }
}
function referenceWidth(reference, external) {
  const value = reference instanceof External ? reference.value : uint64(reference);
  requireValue(!(reference instanceof External) || external, "external references disabled");
  for (const width of WIDTHS)
    if (value < 1n << BigInt(width * 8 - Number(external)))
      return width;
  throw new RangeError("reference exceeds capacity");
}
function leb(out, input) {
  let value = uint64(input);
  while (value >= 128n) {
    out.push(Number(value & 127n) | 128);
    value >>= 7n;
  }
  out.push(Number(value));
}

class PacketReader {
  constructor(bytes, offset = 0) {
    requireValue(bytes instanceof Uint8Array && Number.isSafeInteger(offset) && offset >= 0 && offset <= bytes.length, "invalid byte cursor");
    this.bytes = bytes;
    this.offset = offset;
  }
  raw(width) {
    requireValue(width <= this.bytes.length - this.offset, "unexpected end of packet");
    let result = 0n;
    for (let i = 0;i < width; i++)
      result |= BigInt(this.bytes[this.offset++]) << BigInt(i * 8);
    return result;
  }
  leb() {
    let value = 0n;
    for (let shift = 0n;shift < 64n; shift += 7n) {
      const byte = this.raw(1);
      requireValue(shift !== 63n || (byte & 127n) <= 1n, "LEB128 overflow");
      value |= (byte & 127n) << shift;
      if (byte < 128n)
        return value;
    }
    throw new RangeError("LEB128 overflow");
  }
  read(limits = new DecodeLimits) {
    if (this.offset === this.bytes.length)
      return null;
    const header = Number(this.raw(1));
    requireValue((header & 240) === 16, "unsupported binary version");
    const sections = [], counts = [];
    if (header & 2) {
      requireValue((header & 12) === 0, "explicit header width bits set");
      const sectionCount = this.leb();
      requireValue(sectionCount <= BigInt(limits.maxLinks), "too many sections");
      let address = 1n, total = 0n;
      for (let i = 0n;i < sectionCount; i++) {
        const shape = this.leb(), gap = shape & 4n ? this.leb() : 0n;
        const min = shape >> 4n, extra = shape & 8n ? this.leb() : null;
        const arity = new ArityRange(min, extra === null ? min : extra === 0n ? null : uint64(min + extra));
        const count = this.leb();
        address = uint64(address + gap + count);
        total += count;
        requireValue(total <= BigInt(limits.maxLinks), "too many links");
        sections.push(new Section(gap, arity, WIDTHS[Number(shape & 3n)], []));
        counts.push(Number(count));
      }
    } else {
      const count = this.leb();
      uint64(6n + count);
      requireValue(count <= BigInt(limits.maxLinks), "too many links");
      if (count) {
        sections.push(new Section(5, new ArityRange, WIDTHS[header >> 2 & 3], []));
        counts.push(Number(count));
      }
    }
    let references = 0n;
    for (let i = 0;i < sections.length; i++) {
      const section = sections[i];
      for (let j = 0;j < counts[i]; j++) {
        const length = uint64(section.arity.min + (section.arity.fixed ? 0n : this.leb()));
        requireValue(section.arity.contains(length), "link outside arity");
        references += length;
        requireValue(references <= BigInt(limits.maxReferences), "too many references");
        const link = [], top = 1n << BigInt(section.width * 8 - 1);
        for (let k = 0n;k < length; k++) {
          const raw = this.raw(section.width);
          link.push(header & 1 && raw >= top ? new External(raw === top ? 0n : (top << 1n) - raw) : raw);
        }
        section.links.push(link);
      }
    }
    return new LinksPacket(Boolean(header & 1), sections);
  }
}

class LinksPacket {
  constructor(externalReferences = false, sections = []) {
    Object.assign(this, { externalReferences, sections });
  }
  links() {
    const result = [];
    let address = 1n;
    for (const section of this.sections) {
      address = uint64(address + uint64(section.gap));
      for (const link of section.links) {
        result.push([
          address,
          link.map((r) => r instanceof External ? r : uint64(r))
        ]);
        address = uint64(address + 1n);
      }
    }
    return result;
  }
  validate(limits = new DecodeLimits) {
    requireValue(this.sections.length <= limits.maxLinks && this.links().length <= limits.maxLinks, "too many links or sections");
    let references = 0;
    for (const s of this.sections) {
      requireValue(WIDTHS.includes(s.width), "invalid width");
      new ArityRange(s.arity.min, s.arity.max);
      for (const link of s.links) {
        requireValue(s.arity.contains(link.length), "link outside arity");
        references += link.length;
        requireValue(references <= limits.maxReferences, "too many references");
        for (const r of link)
          requireValue(referenceWidth(r, this.externalReferences) <= s.width, "reference outside width");
      }
    }
    return this;
  }
  toBytes(limits = new DecodeLimits) {
    this.validate(limits);
    const s = this.sections[0];
    const compact = !s || this.sections.length === 1 && s.gap === 5n && s.arity.min === 2n && s.arity.max === 2n && s.links.length > 0;
    const out = [16 | Number(this.externalReferences)];
    if (compact) {
      out[0] |= WIDTHS.indexOf(s?.width ?? 1) << 2;
      leb(out, s?.links.length ?? 0);
    } else {
      out[0] |= 2;
      leb(out, this.sections.length);
      for (const s of this.sections) {
        leb(out, s.arity.min << 4n | BigInt(WIDTHS.indexOf(s.width) | (s.gap ? 4 : 0) | (s.arity.fixed ? 0 : 8)));
        if (s.gap)
          leb(out, s.gap);
        if (!s.arity.fixed)
          leb(out, s.arity.max === null ? 0n : s.arity.max - s.arity.min);
        leb(out, s.links.length);
      }
    }
    for (const s of this.sections)
      for (const link of s.links) {
        if (!s.arity.fixed)
          leb(out, BigInt(link.length) - s.arity.min);
        for (const r of link) {
          const bits = BigInt(s.width * 8);
          let raw = r instanceof External ? r.value === 0n ? 1n << bits - 1n : (1n << bits) - r.value : uint64(r);
          for (let i = 0;i < s.width; i++) {
            out.push(Number(raw & 255n));
            raw >>= 8n;
          }
        }
      }
    return Uint8Array.from(out);
  }
  static fromBytes(bytes, limits = new DecodeLimits) {
    const reader = new PacketReader(bytes), packet = reader.read(limits);
    requireValue(packet !== null, "empty input");
    requireValue(reader.offset === bytes.length, "trailing bytes");
    return packet;
  }
  static parseLinks(text) {
    return text.split(";").filter((s) => s.trim()).map((entry) => {
      const [a, refs] = entry.split(":");
      return [
        uint64(BigInt(a.trim())),
        refs.trim().split(/\s+/).filter(Boolean).map((r) => r.startsWith("#") ? new External(BigInt(r.slice(1))) : uint64(BigInt(r)))
      ];
    });
  }
  static pack(externalReferences, input, packedWidths = false) {
    const links = input.map(([a, r]) => [uint64(a), r]);
    let previous = 0n;
    const needs = links.map(([a, refs]) => {
      requireValue(a > previous && a < U64 && refs.length > 0, "invalid address order or empty link");
      previous = a;
      return refs.reduce((need, r) => Math.max(need, referenceWidth(r, externalReferences)), 1);
    });
    function layout(packed) {
      if (!links.length)
        return [];
      const widest = needs.reduce((a, b) => Math.max(a, b), 1), opens = [], bests = [];
      let costs = Array(8).fill(Infinity);
      const cheapest = (c) => c.reduce((best, v, s) => v < c[best] ? s : best, 0);
      for (let i = 0;i < links.length; i++) {
        const best = cheapest(costs), before = i ? costs[best] : 0, next = Array(8).fill(Infinity);
        let mask = 0;
        bests.push(best);
        for (let state = 0;state < 8; state++) {
          const width = WIDTHS[state >> 1], variable = state & 1;
          if (!packed && width !== widest || width < needs[i])
            continue;
          const opening = before + 2 + variable;
          const continuing = i && links[i - 1][0] + 1n === links[i][0] && (variable || links[i - 1][1].length === links[i][1].length) ? costs[state] : Infinity;
          if (continuing <= opening)
            next[state] = continuing + links[i][1].length * width + variable;
          else {
            next[state] = opening + links[i][1].length * width + variable;
            mask |= 1 << state;
          }
        }
        opens.push(mask);
        costs = next;
      }
      const result = [];
      let end = links.length, state = cheapest(costs);
      for (let i = links.length - 1;i >= 0; i--)
        if (opens[i] & 1 << state) {
          result.push([end - i, WIDTHS[state >> 1]]);
          end = i;
          state = bests[i];
        }
      return result.reverse();
    }
    function packet(plan) {
      const sections = [];
      let index = 0, address = 1n;
      for (const [count, width] of plan) {
        const members = links.slice(index, index + count), start = members[0][0];
        let min = Infinity, max = 0;
        for (const [, r] of members) {
          min = Math.min(min, r.length);
          max = Math.max(max, r.length);
        }
        sections.push(new Section(start - address, new ArityRange(min, max), width, members.map(([, r]) => r)));
        index += count;
        address = start + BigInt(count);
      }
      return new LinksPacket(externalReferences, sections);
    }
    const uniform = packet(layout(false));
    if (!packedWidths)
      return uniform;
    const packed = packet(layout(true));
    return packed.toBytes(DecodeLimits.unlimited()).length < uniform.toBytes(DecodeLimits.unlimited()).length ? packed : uniform;
  }
}

class Encoder {
  constructor(options) {
    this.options = options;
    this.doublets = [];
    this.tuples = [];
    this.created = new Map;
    this.powers = [["i", 1n]];
  }
  link(items) {
    const key = items.map(([k, v]) => `${k}${v}`).join(",");
    if (!this.created.has(key)) {
      const doublet = items.length === 2 && items.every(([k]) => k !== "t"), target = doublet ? this.doublets : this.tuples;
      const node = [doublet ? "d" : "t", BigInt(target.length)];
      target.push(items);
      this.created.set(key, node);
    }
    return this.created.get(key);
  }
  chain(items) {
    let tail = ["i", 0n];
    for (let i = items.length - 1;i >= 0; i--)
      tail = this.link([items[i], tail]);
    return tail;
  }
  typed(marker, elements) {
    const items = [["i", BigInt(marker)], ...elements];
    return items.length !== 2 && this.options.arity.contains(items.length) ? this.link(items) : this.link([items[0], this.chain(elements)]);
  }
  list(elements) {
    if (!elements.length)
      return ["i", 0n];
    return elements.length === 2 || this.options.arity.contains(elements.length) ? this.link(elements) : this.typed(4, elements);
  }
  unary(value) {
    const powers = [];
    for (let bit = 63;bit >= 0; bit--)
      if (value & 1n << BigInt(bit)) {
        while (this.powers.length <= bit) {
          const p = this.powers.at(-1);
          this.powers.push(this.link([p, p]));
        }
        powers.push(this.powers[bit]);
      }
    let sum = powers.pop() ?? ["i", 0n];
    while (powers.length)
      sum = this.link([powers.pop(), sum]);
    return sum;
  }
  scalar(value) {
    return this.options.externalReferences && value < 1n << 63n ? ["e", value] : this.unary(value);
  }
  reference(text) {
    if (/^(0|[1-9][0-9]*)$/.test(text) && text.length <= 20 && BigInt(text) <= U64) {
      const value = BigInt(text);
      return this.options.externalReferences && value < 1n << 63n ? ["e", value] : this.link([["i", 2n], this.unary(value)]);
    }
    return this.typed(3, Array.from(text, (c) => this.scalar(BigInt(c.codePointAt(0)))));
  }
  encode(node) {
    if (node.id !== null && !node.values.length)
      return this.reference(node.id);
    if (node.id !== null) {
      const id = this.reference(node.id);
      return this.typed(5, [id, ...node.values.map((v) => this.encode(v))]);
    }
    return this.list(node.values.map((v) => this.encode(v)));
  }
  finish() {
    const resolve = ([k, v]) => k === "e" ? new External(v) : k === "i" ? v : 6n + v + (k === "t" ? BigInt(this.doublets.length) : 0n);
    return LinksPacket.pack(this.options.externalReferences, this.doublets.concat(this.tuples).map((items, i) => [6n + BigInt(i), items.map(resolve)]), this.options.packedWidths);
  }
}

class Decoder {
  constructor(packet, limits) {
    packet.validate(limits);
    this.limits = limits;
    this.links = [];
    this.unary = [];
    this.nodes = limits.maxNodes;
    this.strings = limits.maxStringBytes;
    for (const [address, refs] of packet.links()) {
      requireValue(address === 6n + BigInt(this.links.length) && refs.every((r) => r instanceof External || r < address), "document addresses must be contiguous and references backward");
      const value = (r) => r instanceof External ? null : r <= 1n ? r : r >= 6n ? this.unary[Number(r - 6n)] : null;
      const a = refs.length === 2 ? value(refs[0]) : null, b = refs.length === 2 ? value(refs[1]) : null;
      this.unary.push(a !== null && b !== null && a + b <= U64 ? a + b : null);
      this.links.push(refs);
    }
  }
  chain(tail) {
    const elements = [];
    while (tail !== 0n) {
      requireValue(typeof tail === "bigint" && tail >= 6n, "broken chain");
      const items = this.links[Number(tail - 6n)];
      requireValue(items.length === 2 && elements.length < this.limits.maxNodes, "broken or excessive chain");
      elements.push(items[0]);
      tail = items[1];
    }
    return elements;
  }
  number(r) {
    const value = r instanceof External ? r.value : r <= 1n ? r : r >= 6n ? this.unary[Number(r - 6n)] : null;
    requireValue(value !== null, "expected unary number");
    return value;
  }
  text(text) {
    this.strings -= new globalThis.TextEncoder().encode(text).length;
    requireValue(this.strings >= 0, "string budget exceeded");
    return new Link(text);
  }
  decode(r, depth) {
    requireValue(depth < this.limits.maxDepth && --this.nodes >= 0, "node or depth budget exceeded");
    if (r instanceof External)
      return this.text(String(r.value));
    if (r === 0n)
      return new Link;
    requireValue(r >= 6n, "standalone marker");
    const items = this.links[Number(r - 6n)];
    let elements;
    if (typeof items[0] === "bigint" && items[0] >= 1n && items[0] <= 5n) {
      const marker = Number(items[0]);
      elements = items.length !== 2 || marker === 2 ? items.slice(1) : this.chain(items[1]);
      if (marker === 2) {
        requireValue(elements.length === 1, "number needs one value");
        return this.text(String(this.number(elements[0])));
      }
      if (marker === 3) {
        const chars = elements.map((e) => {
          const p = this.number(e);
          requireValue(p <= 0x10ffffn && !(p >= 0xd800n && p <= 0xdfffn), "invalid Unicode scalar");
          return String.fromCodePoint(Number(p));
        });
        return this.text(chars.join(""));
      }
      if (marker === 5) {
        requireValue(elements.length > 0, "identified needs id");
        const id = this.decode(elements[0], depth);
        requireValue(id.id !== null && !id.values.length, "id must be reference");
        return new Link(id.id, elements.slice(1).map((e) => this.decode(e, depth + 1)));
      }
      requireValue(marker === 4, "invalid typed marker");
    } else
      elements = items;
    return new Link(null, elements.map((e) => this.decode(e, depth + 1)));
  }
  document() {
    if (!this.links.length)
      return [];
    const root = this.links.at(-1);
    let elements;
    if (root.length === 2 && root[0] === 4n)
      elements = this.chain(root[1]);
    else {
      requireValue(!(typeof root[0] === "bigint" && root[0] >= 1n && root[0] <= 5n), "root must be list");
      elements = root;
    }
    return elements.map((e) => this.decode(e, 0));
  }
}
function canonical(node) {
  if (node.id === null && node.values.length === 1 && node.values[0].id !== null && !node.values[0].values.length)
    return node.values[0];
  return new Link(node.id, node.values.map(canonical));
}
function formatBinaryReference(text) {
  if (text && !text.startsWith("#") && !/[\p{White_Space}():"'`]/u.test(text))
    return text;
  let choice = null;
  for (const quote of ["'", '"', "`"])
    if (!text.startsWith(quote)) {
      let longest = 0, run = 0;
      for (const c of text) {
        run = c === quote ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
      const count = longest + 1 | 1;
      if (choice === null || count < choice.count)
        choice = { quote, count };
    }
  const delimiter = choice.quote.repeat(choice.count);
  return delimiter + text + delimiter;
}
function formatBinaryDocument(document) {
  function nested(node, top = false) {
    if (node.id !== null && !node.values.length)
      return formatBinaryReference(node.id);
    const values = node.values.map((v) => nested(v)).join(" ");
    if (node.id !== null)
      return `(${formatBinaryReference(node.id)}: ${values})`;
    if (node.values.length === 1 && node.values[0].id !== null && !node.values[0].values.length)
      return `((${values}))`;
    return top && node.values.length >= 2 ? values : `(${values})`;
  }
  return document.map((n) => nested(n, true)).join(`
`);
}

class BinaryLinoCodec {
  constructor(options = new BinaryLinoOptions, limits = new DecodeLimits) {
    Object.assign(this, { options, limits });
  }
  encodePacket(document) {
    requireValue(this.options.arity.contains(2), "arity must contain 2");
    const pending = document.map((n) => [n, 0]);
    let nodes = 0, strings = 0;
    while (pending.length) {
      const [n, depth] = pending.pop();
      requireValue(n instanceof Link && depth < this.limits.maxDepth, "invalid model or excessive depth");
      nodes += 1 + Number(n.id !== null && n.values.length > 0);
      if (n.id !== null) {
        requireValue(typeof n.id === "string" && n.id.isWellFormed(), "invalid Unicode string");
        strings += new globalThis.TextEncoder().encode(n.id).length;
      }
      requireValue(nodes <= this.limits.maxNodes && strings <= this.limits.maxStringBytes, "model budget exceeded");
      for (const v of n.values)
        pending.push([v, depth + 1]);
    }
    const encoder = new Encoder(this.options);
    if (document.length)
      encoder.list(document.map((n) => encoder.encode(n)));
    return encoder.finish().validate(this.limits);
  }
  encode(document) {
    return this.encodePacket(document).toBytes(this.limits);
  }
  decodePacket(packet) {
    return new Decoder(packet, this.limits).document();
  }
  decode(bytes) {
    return this.decodePacket(LinksPacket.fromBytes(bytes, this.limits));
  }
  parseDocument(text, parser = new Parser) {
    return parser.parse(text).map(canonical);
  }
  formatDocument(document) {
    return formatBinaryDocument(document);
  }
  encodeText(text, parser) {
    return this.encode(this.parseDocument(text, parser));
  }
  decodeText(bytes) {
    return this.formatDocument(this.decode(bytes));
  }
}
export {
  ArityRange,
  BinaryLinoCodec,
  BinaryLinoOptions,
  DEFAULT_MAX_DEPTH,
  DecodeLimits,
  External,
  FormatConfig,
  FormatOptions,
  Link,
  LinksGroup,
  LinksPacket,
  PacketReader,
  ParseError,
  Parser,
  Section,
  StreamParseError,
  StreamParser,
  formatBinaryDocument,
  formatBinaryReference,
  formatLinks,
  stripComments
};

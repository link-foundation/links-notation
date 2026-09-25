{
  let indentationStack = [0];
  let baseIndentation = null;
  // Saved indentation contexts of the enclosing scopes. Every parenthesised
  // group opens a nested context that starts fresh at indentation level zero,
  // so line breaks and indentation mean the same thing at every depth.
  let contextStack = [];
  // Lines already found unreadable, keyed by where they start and whether they
  // are inside a parenthesised group. Reading a line depends on nothing else: a
  // group starts a fresh indentation context, and indentation only decides
  // which lines become children, so a line that could not be read once never
  // can be. A line that does not parse as the first child of the line above it
  // is tried again as a sibling at every enclosing indentation level, and
  // without this each of those attempts would read the whole line again.
  let unreadableLines = new Set();

  function resetState() {
    indentationStack = [0];
    baseIndentation = null;
    contextStack = [];
    unreadableLines = new Set();
    return true;
  }

  function lineKey(position) {
    return contextStack.length > 0 ? -1 - position : position;
  }

  function enterNestedContext() {
    contextStack.push({ indentationStack, baseIndentation });
    indentationStack = [0];
    baseIndentation = null;
    return true;
  }

  function exitNestedContext() {
    const saved = contextStack.pop();
    if (saved) {
      indentationStack = saved.indentationStack;
      baseIndentation = saved.baseIndentation;
    }
    return true;
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

  // A body written between an even run of delimiters is substantive when it
  // holds at least one visible character and does not straddle a parenthesis.
  // An even run can always be read as delimiter pairs enclosing nothing, so the
  // n-quote reading is only taken when it carries something the pairs cannot.
  function isSubstantiveBody(content) {
    let depth = 0;
    let hasVisible = false;

    for (const c of content) {
      if (c === '(') {
        depth++;
      } else if (c === ')') {
        depth--;
        if (depth < 0) {
          return false;
        }
      }
      if (!/[ \t\n\r]/.test(c)) {
        hasVisible = true;
      }
    }

    return hasVisible && depth === 0;
  }

  // Universal procedural parser for N-quote strings (any N >= 1)
  // Parses from the given position in the input string
  // A run of an even number of delimiters that does not open a reference with a
  // substantive body is the empty reference: the shortest reading, a bare
  // delimiter pair enclosing nothing, wins over a longer n-quote delimiter.
  // Returns { value, length } or null
  function parseQuotedStringAt(inputStr, startPos, quoteChar) {
    if (startPos >= inputStr.length || inputStr[startPos] !== quoteChar) {
      return null;
    }

    // Count opening quotes
    let quoteCount = 0;
    let pos = startPos;
    while (pos < inputStr.length && inputStr[pos] === quoteChar) {
      quoteCount++;
      pos++;
    }

    const isEvenRun = quoteCount % 2 === 0;
    const emptyReference = isEvenRun ? { value: '', length: quoteCount } : null;

    const closeSeq = quoteChar.repeat(quoteCount);
    const escapeSeq = quoteChar.repeat(quoteCount * 2);

    let content = '';
    while (pos < inputStr.length) {
      // Check for escape sequence (2*N quotes)
      if (inputStr.substr(pos, escapeSeq.length) === escapeSeq) {
        content += closeSeq; // 2*N quotes become N quotes
        pos += escapeSeq.length;
        continue;
      }

      // Check for closing sequence (exactly N quotes)
      if (inputStr.substr(pos, quoteCount) === closeSeq) {
        // Verify it's exactly N quotes (not followed by more of same char)
        const afterClose = pos + quoteCount;
        if (afterClose >= inputStr.length || inputStr[afterClose] !== quoteChar) {
          // Found valid closing
          if (isEvenRun && !isSubstantiveBody(content)) {
            return emptyReference;
          }
          return {
            value: content,
            length: afterClose - startPos
          };
        }
      }

      // Add character to content
      content += inputStr[pos];
      pos++;
    }

    return emptyReference; // No valid closing found
  }

  // Global state for passing parsed values between predicate and action
  let parsedValue = null;
  let parsedLength = 0;
}

document = &{ return resetState(); } skipEmptyLines links:links _ eof { return links; }
  / &{ return resetState(); } _ eof { return []; }

skipEmptyLines = ([ \t]* [\r\n])*

links = fl:firstLine list:line* { popIndentation(); return [fl].concat(list || []); }

firstLine = SET_BASE_INDENTATION l:element { return l; }

line = CHECK_INDENTATION l:element { return l; }

// A line is read once, whether or not indented children follow it: reading it
// again after looking for children doubled the work at every level of nesting.
element = &{ return !unreadableLines.has(lineKey(offset())); }
    e:anyLink saved:SAVE_INDENTATION l:(PUSH_INDENTATION @links)? {
    if (l === null) {
      // No child line followed the indentation. Forget what looking for one
      // pushed, so the next line is compared with this line's indentation.
      indentationStack = saved;
      return e;
    }
    return Object.assign({}, e, { children: l });
  }
  // Remember that this line could not be read. The predicate always fails, so
  // the "." is never reached; it only tells Peggy that this alternative cannot
  // succeed without consuming input.
  / &{ unreadableLines.add(lineKey(offset())); return false; } .

referenceOrLink = l:multiLineAnyLink { return l; } / i:reference { return { id: i }; }

// A line that starts with a parenthesised group reads that group once and then
// branches on what follows it: the end of the line makes the group the whole
// link, and more values make it the first value of a value link. Neither an
// indented ID nor a single-line link can start with a parenthesis, so nothing
// else is tried for such a line; trying them read the group again, doubling
// the work at every level of nesting.
anyLink = &"(" @groupLink / !"(" @(indentedIdLink / singleLineAnyLink)

groupLink = g:multiLineAnyLink rest:groupLinkRest {
    return rest === null ? g : { values: [g].concat(rest) };
  }

groupLinkRest = eol { return null; }
  / @singleLineValueAndWhitespace* eol

multiLineAnyLink = nestedGroup

singleLineAnyLink = fl:singleLineLink eol { return fl; }
  / vl:singleLineValueLink eol { return vl; }

// A parenthesised group opens a nested context that follows exactly the same
// rules as the root of the document: line breaks separate links and
// indentation nests them, starting fresh at indentation level zero.
nestedGroup = "(" ENTER_NESTED_CONTEXT body:nestedGroupBody {
    exitNestedContext();
    return body;
  }
  // The group was opened but its body did not parse: restore the context it
  // was opened in before failing, just as a parsed group does.
  / "(" &{ exitNestedContext(); return false; }

nestedGroupBody = skipEmptyLines l:links _ ")" { return { nested: l }; }
  / _ ")" { return { nested: [] }; }

ENTER_NESTED_CONTEXT = &{ return enterNestedContext(); }

singleLineValueAndWhitespace = __ value:referenceOrLink { return value; }

singleLineValues = list:singleLineValueAndWhitespace+ { return list; }

singleLineLink = __ id:reference __ ":" v:singleLineValues { return { id: id, values: v }; }

singleLineValueLink = v:singleLineValues { return { values: v }; }

indentedIdLink = id:reference __ ":" eol { return { id: id, values: [] }; }

// Reference can be quoted (with any number of quotes N >= 1) or simple unquoted
// Universal approach: use procedural parsing for all quote types and counts
reference = quotedReference / simpleReference

simpleReference = chars:referenceSymbol+ { return chars.join(''); }

// Universal quoted reference - handles any N quotes for all quote types
// Uses procedural parsing with input/offset() for clean, simple logic
quotedReference = doubleQuotedUniversal / singleQuotedUniversal / backtickQuotedUniversal

// Double quotes: peek at input, parse procedurally, consume exact chars
doubleQuotedUniversal = &'"' &{
  const pos = offset();
  const result = parseQuotedStringAt(input, pos, '"');
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
} chars:consumeDouble { return parsedValue; }

// Consume exactly parsedLength characters for double quotes
consumeDouble = c:. cs:consumeDoubleMore* { return [c].concat(cs).join(''); }
consumeDoubleMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:. { return c; }

// Single quotes
singleQuotedUniversal = &"'" &{
  const pos = offset();
  const result = parseQuotedStringAt(input, pos, "'");
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
} chars:consumeSingle { return parsedValue; }

consumeSingle = c:. cs:consumeSingleMore* { return [c].concat(cs).join(''); }
consumeSingleMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:. { return c; }

// Backticks
backtickQuotedUniversal = &'`' &{
  const pos = offset();
  const result = parseQuotedStringAt(input, pos, '`');
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
} chars:consumeBacktick { return parsedValue; }

consumeBacktick = c:. cs:consumeBacktickMore* { return [c].concat(cs).join(''); }
consumeBacktickMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:. { return c; }

SAVE_INDENTATION = "" { return indentationStack.slice(); }

SET_BASE_INDENTATION = spaces:" "* { setBaseIndentation(spaces); }

PUSH_INDENTATION = spaces:" "* &{ return normalizeIndentation(spaces) > getCurrentIndentation(); } { pushIndentation(spaces); }

CHECK_INDENTATION = spaces:" "* &{ return checkIndentation(spaces); }

eol = __ (lineBreaks / eof / nestedGroupEnd)

// A line ends at the first line break, and the blank lines that follow it
// belong to that ending: a line holding nothing but spaces or tabs separates
// links exactly the way an empty line does. Blanking a comment leaves such a
// line behind, so this is also what lets a comment stand on a line of its own.
lineBreaks = [\r\n]+ ([ \t]+ [\r\n]+)*

// Inside a parenthesised group the closing parenthesis terminates a line the
// same way the end of the input does at the root.
nestedGroupEnd = &{ return isInsideNestedContext(); } &")"

eof = !.

__ = [ \t]*

_ = whiteSpaceSymbol*

whiteSpaceSymbol = [ \t\n\r]

referenceSymbol = [^ \t\n\r(:)]

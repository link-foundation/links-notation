{
  let indentationStack = [0];
  let baseIndentation = null;

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

  // Universal procedural parser for N-quote strings (any N >= 1)
  // Parses from the given position in the input string
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

    return null; // No valid closing found
  }

  // Global state for passing parsed values between predicate and action
  let parsedValue = null;
  let parsedLength = 0;
}

document = &{ indentationStack = [0]; baseIndentation = null; return true; } skipEmptyLines links:links _ eof { return links; }
  / &{ indentationStack = [0]; baseIndentation = null; return true; } _ eof { return []; }

skipEmptyLines = ([ \t]* [\r\n])*

links = fl:firstLine list:line* { popIndentation(); return [fl].concat(list || []); }

firstLine = SET_BASE_INDENTATION l:element { return l; }

line = CHECK_INDENTATION l:element { return l; }

element = e:anyLink PUSH_INDENTATION l:links {
    return { id: e.id, values: e.values, children: l };
  }
  / e:anyLink { return e; }

referenceOrLink = l:multiLineAnyLink { return l; } / i:reference { return { id: i }; }

anyLink = ml:multiLineAnyLink eol { return ml; } / il:indentedIdLink { return il; } / sl:singleLineAnyLink { return sl; }

multiLineAnyLink = multiLineValueLink / multiLineLink

singleLineAnyLink = fl:singleLineLink eol { return fl; }
  / vl:singleLineValueLink eol { return vl; }

multiLineValueAndWhitespace = value:referenceOrLink _ { return value; }

multiLineValues = _ list:multiLineValueAndWhitespace* { return list; }

singleLineValueAndWhitespace = __ value:referenceOrLink { return value; }

singleLineValues = list:singleLineValueAndWhitespace+ { return list; }

singleLineLink = __ id:reference __ ":" v:singleLineValues { return { id: id, values: v }; }

multiLineLink = "(" _ id:reference _ ":" v:multiLineValues _ ")" { return { id: id, values: v }; }

singleLineValueLink = v:singleLineValues { return { values: v }; }

multiLineValueLink = "(" v:multiLineValues _ ")" { return { values: v }; }

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

SET_BASE_INDENTATION = spaces:" "* { setBaseIndentation(spaces); }

PUSH_INDENTATION = spaces:" "* &{ return normalizeIndentation(spaces) > getCurrentIndentation(); } { pushIndentation(spaces); }

CHECK_INDENTATION = spaces:" "* &{ return checkIndentation(spaces); }

eol = __ ([\r\n]+ / eof)

eof = !.

__ = [ \t]*

_ = whiteSpaceSymbol*

whiteSpaceSymbol = [ \t\n\r]

referenceSymbol = [^ \t\n\r(:)]

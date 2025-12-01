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

  // Universal parser for any N-quote strings
  // For N quotes: opening = N quotes, closing = N quotes, escape = 2*N quotes -> N quotes
  // Returns { value: string, length: number } or null if no match
  function parseNQuoteString(inputStr, quoteChar) {
    // Count opening quotes
    let quoteCount = 0;
    while (quoteCount < inputStr.length && inputStr[quoteCount] === quoteChar) {
      quoteCount++;
    }

    if (quoteCount < 1) {
      return null;
    }

    const openClose = quoteChar.repeat(quoteCount);
    const escapeSeq = quoteChar.repeat(quoteCount * 2);
    const escapeVal = quoteChar.repeat(quoteCount);

    let pos = quoteCount; // Start after opening quotes
    let content = '';

    while (pos < inputStr.length) {
      // Check for escape sequence (2*N quotes)
      if (inputStr.substr(pos, escapeSeq.length) === escapeSeq) {
        content += escapeVal;
        pos += escapeSeq.length;
        continue;
      }

      // Check for closing quotes (exactly N quotes, not more)
      if (inputStr.substr(pos, quoteCount) === openClose) {
        // Make sure it's exactly N quotes (not followed by more of the same quote)
        const afterClose = pos + quoteCount;
        if (afterClose >= inputStr.length || inputStr[afterClose] !== quoteChar) {
          // Found valid closing
          return {
            value: content,
            length: afterClose
          };
        }
      }

      // Take next character
      content += inputStr[pos];
      pos++;
    }

    // No closing quotes found
    return null;
  }
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

// Reference can be quoted (with any number of quotes) or simple unquoted
// Universal approach: use procedural parsing for all N-quote strings
reference = quotedReference / simpleReference

simpleReference = chars:referenceSymbol+ { return chars.join(''); }

// Universal quoted reference - handles any N quotes for all three quote types
// Captures the raw string and uses parseNQuoteString for validation and parsing
quotedReference = doubleQuotedAny / singleQuotedAny / backtickQuotedAny

doubleQuotedAny = raw:$('"'+ doubleQuoteContent* '"'+) &{
  const result = parseNQuoteString(raw, '"');
  if (result && result.length === raw.length) {
    options._quoteValue = result.value;
    return true;
  }
  return false;
} { return options._quoteValue; }

singleQuotedAny = raw:$("'"+ singleQuoteContent* "'"+) &{
  const result = parseNQuoteString(raw, "'");
  if (result && result.length === raw.length) {
    options._quoteValue = result.value;
    return true;
  }
  return false;
} { return options._quoteValue; }

backtickQuotedAny = raw:$('`'+ backtickQuoteContent* '`'+) &{
  const result = parseNQuoteString(raw, '`');
  if (result && result.length === raw.length) {
    options._quoteValue = result.value;
    return true;
  }
  return false;
} { return options._quoteValue; }

// Content for quoted strings - match non-quote chars (including newlines) OR quote sequences followed by non-quote
doubleQuoteContent = [^"\r\n] / [\r\n] / '"'+ &[^"]
singleQuoteContent = [^'\r\n] / [\r\n] / "'"+ &[^']
backtickQuoteContent = [^`\r\n] / [\r\n] / '`'+ &[^`]

SET_BASE_INDENTATION = spaces:" "* { setBaseIndentation(spaces); }

PUSH_INDENTATION = spaces:" "* &{ return normalizeIndentation(spaces) > getCurrentIndentation(); } { pushIndentation(spaces); }

CHECK_INDENTATION = spaces:" "* &{ return checkIndentation(spaces); }

eol = __ ([\r\n]+ / eof)

eof = !.

__ = [ \t]*

_ = whiteSpaceSymbol*

whiteSpaceSymbol = [ \t\n\r]

referenceSymbol = [^ \t\n\r(:)]

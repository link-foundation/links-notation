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

  // Process escape sequences for multi-quote strings
  // For N quotes: 2*N consecutive quotes become N quotes
  function processEscapes(content, quoteChar, quoteCount) {
    const escapeSequence = quoteChar.repeat(quoteCount * 2);
    const replacement = quoteChar.repeat(quoteCount);
    let result = '';
    let i = 0;
    while (i < content.length) {
      if (content.substr(i, escapeSequence.length) === escapeSequence) {
        result += replacement;
        i += escapeSequence.length;
      } else {
        result += content[i];
        i++;
      }
    }
    return result;
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

// Reference can be quoted (with 1-5+ quotes) or simple unquoted
reference = quotedReference / simpleReference

simpleReference = chars:referenceSymbol+ { return chars.join(''); }

// Quoted references - try longer quote sequences first (greedy matching)
quotedReference = quintupleQuotedReference / quadrupleQuotedReference / tripleQuotedReference / doubleQuotedReference / singleQuotedReference

// Single quote (1 quote char)
singleQuotedReference = doubleQuote1 / singleQuote1 / backtickQuote1

doubleQuote1 = '"' r:doubleQuote1Content* '"' { return r.join(''); }
doubleQuote1Content = '""' { return '"'; } / [^"]

singleQuote1 = "'" r:singleQuote1Content* "'" { return r.join(''); }
singleQuote1Content = "''" { return "'"; } / [^']

backtickQuote1 = '`' r:backtickQuote1Content* '`' { return r.join(''); }
backtickQuote1Content = '``' { return '`'; } / [^`]

// Double quotes (2 quote chars)
doubleQuotedReference = doubleQuote2 / singleQuote2 / backtickQuote2

doubleQuote2 = '""' r:doubleQuote2Content* '""' { return r.join(''); }
doubleQuote2Content = '""""' { return '""'; } / !('""') c:. { return c; }

singleQuote2 = "''" r:singleQuote2Content* "''" { return r.join(''); }
singleQuote2Content = "''''" { return "''"; } / !("''") c:. { return c; }

backtickQuote2 = '``' r:backtickQuote2Content* '``' { return r.join(''); }
backtickQuote2Content = '````' { return '``'; } / !('``') c:. { return c; }

// Triple quotes (3 quote chars)
tripleQuotedReference = doubleQuote3 / singleQuote3 / backtickQuote3

doubleQuote3 = '"""' r:doubleQuote3Content* '"""' { return r.join(''); }
doubleQuote3Content = '""""""' { return '"""'; } / !('"""') c:. { return c; }

singleQuote3 = "'''" r:singleQuote3Content* "'''" { return r.join(''); }
singleQuote3Content = "''''''" { return "'''"; } / !("'''") c:. { return c; }

backtickQuote3 = '```' r:backtickQuote3Content* '```' { return r.join(''); }
backtickQuote3Content = '``````' { return '```'; } / !('```') c:. { return c; }

// Quadruple quotes (4 quote chars)
quadrupleQuotedReference = doubleQuote4 / singleQuote4 / backtickQuote4

doubleQuote4 = '""""' r:doubleQuote4Content* '""""' { return r.join(''); }
doubleQuote4Content = '""""""""' { return '""""'; } / !('""""') c:. { return c; }

singleQuote4 = "''''" r:singleQuote4Content* "''''" { return r.join(''); }
singleQuote4Content = "''''''''''" { return "''''"; } / !("''''") c:. { return c; }

backtickQuote4 = '````' r:backtickQuote4Content* '````' { return r.join(''); }
backtickQuote4Content = '````````' { return '````'; } / !('````') c:. { return c; }

// Quintuple quotes (5 quote chars)
quintupleQuotedReference = doubleQuote5 / singleQuote5 / backtickQuote5

doubleQuote5 = '"""""' r:doubleQuote5Content* '"""""' { return r.join(''); }
doubleQuote5Content = '""""""""""' { return '"""""'; } / !('"""""') c:. { return c; }

singleQuote5 = "'''''" r:singleQuote5Content* "'''''" { return r.join(''); }
singleQuote5Content = "''''''''''" { return "'''''"; } / !("'''''") c:. { return c; }

backtickQuote5 = '`````' r:backtickQuote5Content* '`````' { return r.join(''); }
backtickQuote5Content = '``````````' { return '`````'; } / !('`````') c:. { return c; }

SET_BASE_INDENTATION = spaces:" "* { setBaseIndentation(spaces); }

PUSH_INDENTATION = spaces:" "* &{ return normalizeIndentation(spaces) > getCurrentIndentation(); } { pushIndentation(spaces); }

CHECK_INDENTATION = spaces:" "* &{ return checkIndentation(spaces); }

eol = __ ([\r\n]+ / eof)

eof = !.

__ = [ \t]*

_ = whiteSpaceSymbol*

whiteSpaceSymbol = [ \t\n\r]

referenceSymbol = [^ \t\n\r(:)]

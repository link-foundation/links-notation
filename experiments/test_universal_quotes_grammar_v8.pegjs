{
  // Universal procedural parser for N-quote strings
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

  let parsedValue = null;
  let parsedLength = 0;
}

// Entry point
start = _ first:quotedReference rest:(_ q:quotedReference { return q; })* _ { return [first].concat(rest); }

quotedReference = anyQuoted / simpleRef

anyQuoted = doubleQuotedUniversal / singleQuotedUniversal / backtickQuotedUniversal

// Double quotes: use the input directly via predicate
// The predicate peeks ahead, parses the quoted string, and we consume exact chars
doubleQuotedUniversal = &'"' &{
  const pos = offset();
  const result = parseQuotedStringAt(input, pos, '"');
  if (result) {
    parsedValue = result.value;
    parsedLength = result.length;
    return true;
  }
  return false;
} chars:doubleQuotedConsume { return parsedValue; }

// Consume the exact number of characters that were parsed
doubleQuotedConsume = c:. cs:doubleQuotedConsumeMore* { return [c].concat(cs).join(''); }
doubleQuotedConsumeMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:. { return c; }

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
} chars:singleQuotedConsume { return parsedValue; }

singleQuotedConsume = c:. cs:singleQuotedConsumeMore* { return [c].concat(cs).join(''); }
singleQuotedConsumeMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:. { return c; }

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
} chars:backtickQuotedConsume { return parsedValue; }

backtickQuotedConsume = c:. cs:backtickQuotedConsumeMore* { return [c].concat(cs).join(''); }
backtickQuotedConsumeMore = &{ return parsedLength > 1 && (parsedLength--, true); } c:. { return c; }

simpleRef = chars:[a-zA-Z0-9_]+ { return chars.join(''); }

_ = [ \t\n\r]*

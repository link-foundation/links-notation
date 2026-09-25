// The character-by-character scanner the parsers used before issue #316,
// kept verbatim (apart from the export) as the reference the linear scanner is
// checked against in differential-fuzz.mjs.
export function isSubstantiveBody(content) {
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

export function parseQuotedStringAt(inputStr, startPos, quoteChar) {
  if (startPos >= inputStr.length || inputStr[startPos] !== quoteChar) {
    return null;
  }
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
    if (inputStr.substr(pos, escapeSeq.length) === escapeSeq) {
      content += closeSeq;
      pos += escapeSeq.length;
      continue;
    }
    if (inputStr.substr(pos, quoteCount) === closeSeq) {
      const afterClose = pos + quoteCount;
      if (afterClose >= inputStr.length || inputStr[afterClose] !== quoteChar) {
        if (isEvenRun && !isSubstantiveBody(content)) {
          return emptyReference;
        }
        return { value: content, length: afterClose - startPos };
      }
    }
    content += inputStr[pos];
    pos++;
  }
  return emptyReference;
}

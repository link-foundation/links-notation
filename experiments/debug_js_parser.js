// Manually test the parseHighQuoteString function
function parseHighQuoteString(inputStr, quoteChar) {
  // Count opening quotes
  let quoteCount = 0;
  while (quoteCount < inputStr.length && inputStr[quoteCount] === quoteChar) {
    quoteCount++;
  }

  if (quoteCount < 6) {
    console.log(`  quoteCount=${quoteCount} is < 6, returning null`);
    return null; // Let the regular rules handle 1-5 quotes
  }

  const openClose = quoteChar.repeat(quoteCount);
  const escapeSeq = quoteChar.repeat(quoteCount * 2);
  const escapeVal = quoteChar.repeat(quoteCount);

  console.log(`  quoteCount=${quoteCount}, openClose="${openClose}", escapeSeq="${escapeSeq}"`);

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
        console.log(`  Found closing at pos=${pos}, content="${content}"`);
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
  console.log(`  No closing found, content so far="${content}"`);
  return null;
}

const simple6 = '""""""hello""""""';
console.log('Testing simple6:', simple6);
const result = parseHighQuoteString(simple6, '"');
console.log('Result:', result);

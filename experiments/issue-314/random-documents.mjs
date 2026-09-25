// Prints random small documents, one per line with line breaks written as \n,
// for comparing two versions of a parser on the same inputs.
// Usage: node random-documents.mjs [count] [seed]
const count = Number(process.argv[2] ?? 20000);
let seed = Number(process.argv[3] ?? 314);
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pieces = ['(', ')', 'a', 'b', ':', ' ', '  ', '\n', '"', "'", 'c d', '(a)', ': ', '\t'];
for (let i = 0; i < count; i++) {
  const length = 1 + Math.floor(random() * 16);
  let document = '';
  for (let j = 0; j < length; j++) {
    document += pieces[Math.floor(random() * pieces.length)];
  }
  console.log(document.replace(/\\/g, '\\\\').replace(/\n/g, '\\n'));
}

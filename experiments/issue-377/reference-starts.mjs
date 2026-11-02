// Where does the grammar start a delimited reference, compared with the
// comment pre-pass (stripComments)? Prints each probe's parse with and without
// comment handling. Run: node experiments/issue-377/reference-starts.mjs
import { Parser, stripComments } from '../../js/src/index.js';

const probes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'a"b"',
      '"x""y"',
      '"x" "y"',
      '(a)"b"',
      '```q```"" #🙂\r\n  \n    \'it\'\'s\'"""',
      '""﻿\n    \n  #)~1{zz}🙂\n    ""\'\r\'́',
      '"q""" #c\n"',
      'a: "b"" #c\n"',
    ];
const show = (parser, text) => {
  try {
    return JSON.stringify(parser.parse(text).map(String));
  } catch (error) {
    return `error: ${error.message.split('\n')[0]}`;
  }
};
for (const probe of probes) {
  console.log(JSON.stringify(probe));
  console.log('  stripped:  ', JSON.stringify(stripComments(probe)));
  console.log('  comments:  ', show(new Parser(), probe));
  console.log('  nocomments:', show(new Parser({ comments: false }), probe));
}

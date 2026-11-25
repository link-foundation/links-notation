import { buildCst } from '../../js/src/Cst.js';
const show = (n) => n.children?.length ? `(${n.kind} ${n.children.map(show).join(' ')})` : `${n.kind}:${JSON.stringify(n.text)}`;
for (const d of ['time 12:30\n', 'a:b: c\n', 'a:"b"\n', 'std::string x\n', 'a:~1{62}\n', 'tag #release # c\n', 'u https://x/y#f\n'])
  console.log(JSON.stringify(d), show(buildCst(d)));

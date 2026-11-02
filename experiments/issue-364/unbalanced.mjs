// Which inputs does JS parse accept, and does parseCst reject them?
import { Parser } from "../../js/src/index.js";
const p = new Parser();
for (const input of ["(a", "a)", "(a))", "((a)"]) {
  let parse, cst;
  try { p.parse(input); parse = "ok"; } catch (e) { parse = "throws"; }
  try { p.parseCst(input); cst = "ok"; } catch (e) { cst = "throws"; }
  console.log(JSON.stringify(input), "parse", parse, "parseCst", cst);
}

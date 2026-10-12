// Lists Rust integration tests with no same-named C++ test, after the
// comparison script's normalization (lowercase, separators removed).
import { readFileSync, readdirSync } from "node:fs";
const norm = (n) => n.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_?test_?/, "").replace(/_?test$/, "").replace(/[_\s-]/g, "");
const collect = (dir, ext, re) => {
  const out = new Map();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(ext)))
    for (const m of readFileSync(`${dir}/${f}`, "utf8").matchAll(re)) out.set(norm(m[1]), `${f}:${m[1]}`);
  return out;
};
const rust = collect("rust/links-notation/tests", "_tests.rs", /#\[test\]\s*fn\s+(\w+)/g);
const cpp = collect("cpp/tests", "_tests.cpp", /\bTEST(?:_F)?\(\s*\w+\s*,\s*(\w+)\s*\)/g);
const missing = [...rust].filter(([k]) => !cpp.has(k));
const extra = [...cpp].filter(([k]) => !rust.has(k));
console.log(`Rust ${rust.size}, C++ ${cpp.size}, Rust without C++: ${missing.length}, C++ without Rust: ${extra.length}`);
for (const [, v] of missing) console.log("  rust-only", v);
for (const [, v] of extra) console.log("  cpp-only", v);

// kotlin-web-helpers still invokes Base.call(), but Mocha 12 exports a class.
// Scope the compatibility constructor to that reporter's import alone. Remove
// this hook when Kotlin/kotlin-web-helpers supports Mocha's class constructor.
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (
      specifier !== "mocha" ||
      !context.parentURL?.endsWith("/mocha-kotlin-reporter.js")
    )
      return resolved;
    return {
      url: `issue405:mocha-base:${encodeURIComponent(resolved.url)}`,
      shortCircuit: true,
    };
  },
  load(url, context, nextLoad) {
    if (!url.startsWith("issue405:mocha-base:")) return nextLoad(url, context);
    const original = fileURLToPath(
      decodeURIComponent(url.slice("issue405:mocha-base:".length)),
    );
    return {
      format: "commonjs",
      shortCircuit: true,
      source: `const mocha = require(${JSON.stringify(original)});
        function Base(...args) { Object.assign(this, Reflect.construct(mocha.reporters.Base, args)); }
        module.exports = { ...mocha, reporters: { ...mocha.reporters, Base } };`,
    };
  },
});

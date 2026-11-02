// Native adapter for deploy-pages v5's bundled CommonJS dependency. Replace
// only its deprecated built-in import; Node still reports every warning.
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const replacement = pathToFileURL(require.resolve('punycode/')).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'punycode' || specifier === 'node:punycode') {
      return { url: replacement, format: 'commonjs', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

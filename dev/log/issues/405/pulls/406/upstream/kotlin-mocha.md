Mocha 12.0.3 exports `reporters.Base` as an ES class. Both kotlin-web-helpers 3.3.0 (KGP 2.4.21's default) and current 3.5.4 invoke `Base.call(this, runner)` in `dist/mocha-kotlin-reporter.js`. On Node 26.13.0 this aborts before discovering any tests:

```
TypeError: Class constructor Base cannot be invoked without 'new'
```

Minimal reproduction:

```sh
npm install --save-dev mocha@12.0.3 kotlin-web-helpers@3.5.4
printf 'describe("suite", () => { it("passes", () => {}); });\n' > fixture.cjs
node node_modules/mocha/bin/mocha.js --reporter kotlin-web-helpers/dist/mocha-kotlin-reporter.js fixture.cjs
```

Expected: one passing test and TeamCity service messages. Actual: reporter initialization throws; KGP reports that `jsNodeTest` discovered no tests. Disabling `failOnNoDiscoveredTests` would hide the problem.

Suggested change: construct the supplied Base with `Reflect.construct(Base, [runner])` and copy its initialized state onto the reporter (or migrate the Node reporter to extend Base). This supports Mocha 12 classes and ordinary callable constructors. Keep pass/fail/skip and flow ID tests, including nonzero exit status on assertion failure.

Our temporary workaround scopes a callable constructor using `Reflect.construct` to this reporter's `require('mocha')` via Node's module hooks. Other Mocha imports retain the original class. We retain Mocha 12 and do not disable discovery or test failures. The reproducing test and adapter are in https://github.com/link-foundation/links-notation/pull/406 (`experiments/issue-405/mocha-reporter.test.mjs`, `kotlin/mocha-base.mjs`).

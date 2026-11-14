const assert = require("node:assert/strict");

describe("reporter contract", () => {
  it("passes", () => assert.equal(1, 1));
  it.skip("skips", () => {});
  it("preserves failures", () =>
    assert.equal(process.env.REPORTER_FAIL || "pass", "pass"));
});

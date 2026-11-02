import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import {
  escapeModulePath,
  moduleInfoUrl,
  verifyModuleAvailability,
} from "./verify-module-availability.mjs";

describe("Go module proxy verification", () => {
  test("uses the proxy protocol's case and exclamation-mark encoding", () => {
    assert.equal(
      escapeModulePath("example.com/Acme/Hello!"),
      "example.com/!acme/!hello!!"
    );
    assert.equal(
      moduleInfoUrl("example.com/Acme/mod", "v1.2.3"),
      "https://proxy.golang.org/example.com/!acme/mod/@v/v1.2.3.info"
    );
  });

  test("polls until the exact tag is available", async () => {
    const responses = [
      { ok: false },
      { ok: true, json: async () => ({ Version: "v1.2.2" }) },
      { ok: true, json: async () => ({ Version: "v1.2.3" }) },
    ];
    const waits = [];

    const result = await verifyModuleAvailability({
      modulePath: "example.com/Acme/mod",
      tag: "v1.2.3",
      attempts: 3,
      intervalMs: 10,
      fetchImpl: async () => responses.shift(),
      sleep: async (milliseconds) => waits.push(milliseconds),
    });

    assert.equal(result.attempts, 3);
    assert.deepEqual(waits, [10, 10]);
  });

  test("fails after the bounded retry budget", async () => {
    await assert.rejects(
      verifyModuleAvailability({
        modulePath: "example.com/mod",
        tag: "v9.9.9",
        attempts: 2,
        intervalMs: 0,
        fetchImpl: async () => ({ ok: false }),
        sleep: async () => {},
      }),
      /did not become resolvable/
    );
  });
});

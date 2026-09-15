#!/usr/bin/env node

/** Incremental Links Notation parsing with events and async iterables. */

import { StreamParser } from "../js/src/StreamParser.js";

const document = `first loves data
profile:
  name Ada
  note "line one
line two"
last sees first`;

// Event-driven processing can keep memory bounded by the unresolved record.
const stream = new StreamParser({ collect: false, maxBufferSize: 1024 });
let count = 0;
stream.on("link", (link) => {
  count += 1;
  console.log(`event ${count}: ${link}`);
});
stream.on("error", (error) => {
  console.error(`line ${error.line}, column ${error.column}: ${error.message}`);
});

// Chunk boundaries are arbitrary: this intentionally writes one symbol at a time.
for (const symbol of document) stream.write(symbol);
stream.end();
console.log("position:", stream.position());

// Node, Bun, and browser streams can also be exposed as an async iterable.
async function* networkPackets() {
  yield "one link\npro";
  yield "file:\n  name Ada\n";
  yield "two link";
}

for await (const link of StreamParser.parseAsync(networkPackets())) {
  console.log(`async: ${link}`);
}

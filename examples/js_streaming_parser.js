#!/usr/bin/env node

/**
 * Example: Using StreamParser for incremental parsing in JavaScript
 *
 * This example demonstrates how to use the StreamParser to process
 * Links Notation data incrementally, which is useful for:
 * - Large files that don't fit in memory
 * - Network streaming (e.g., TCP/HTTP streaming)
 * - Real-time processing of incoming data
 */

import { StreamParser } from '../js/src/StreamParser.js';

console.log('=== JavaScript StreamParser Example ===\n');

// Example 1: Basic usage with event listeners
console.log('Example 1: Basic usage with event listeners');
console.log('-------------------------------------------');

const parser1 = new StreamParser();
let linkCount = 0;

parser1.on('link', (link) => {
  linkCount++;
  console.log(`Link #${linkCount}:`, link.toString());
});

parser1.on('error', (error) => {
  console.error(`Error at line ${error.line}, col ${error.column}: ${error.message}`);
});

// Feed data incrementally (simulating network chunks)
parser1.write('papa (lovesMama: loves mama)\n');
parser1.write('son lovesMama\n');
parser1.write('daughter lovesMama\n');

const links1 = parser1.end();
console.log(`\nTotal links parsed: ${links1.length}\n`);

// Example 2: Processing data in very small chunks
console.log('Example 2: Processing data in small chunks');
console.log('-------------------------------------------');

const parser2 = new StreamParser();

parser2.on('link', (link) => {
  console.log('Parsed:', link.toString());
});

// Simulate character-by-character streaming
const message = '(message: hello world)\n(status: ok)\n';
for (let i = 0; i < message.length; i++) {
  parser2.write(message[i]);
}

const links2 = parser2.end();
console.log(`Total links: ${links2.length}\n`);

// Example 3: Handling multiline indented syntax
console.log('Example 3: Multiline indented syntax');
console.log('-------------------------------------');

const parser3 = new StreamParser();

parser3.on('link', (link) => {
  console.log('Parsed link:', link.toString());
});

parser3.write('relationship:\n');
parser3.write('  papa\n');
parser3.write('  loves\n');
parser3.write('  mama\n');

parser3.end();
console.log();

// Example 4: Error handling
console.log('Example 4: Error handling with location info');
console.log('---------------------------------------------');

const parser4 = new StreamParser();

parser4.on('error', (error) => {
  console.log('✓ Error caught successfully:');
  console.log(`  Message: ${error.message}`);
  console.log(`  Location: line ${error.line}, column ${error.column}`);
});

parser4.write('valid link here\n');
parser4.write('(unclosed parenthesis\n');

try {
  parser4.end();
} catch (error) {
  console.log('  (Error was also thrown as expected)\n');
}

// Example 5: Real-world use case - Simulating TCP stream
console.log('Example 5: Simulating TCP stream processing');
console.log('--------------------------------------------');

const parser5 = new StreamParser();
const receivedLinks = [];

parser5.on('link', (link) => {
  receivedLinks.push(link);
  console.log(`Received link: ${link.toString()}`);
});

// Simulate receiving network packets with partial data
const packets = [
  '(user: alice',
  ') (action: ',
  'login)\n(user',
  ': bob) (act',
  'ion: logout)\n',
];

console.log('Processing packets...');
for (const packet of packets) {
  parser5.write(packet);
}

parser5.end();
console.log(`\nProcessed ${receivedLinks.length} links from stream\n`);

// Example 6: Memory-efficient processing of large data
console.log('Example 6: Memory-efficient processing');
console.log('---------------------------------------');

const parser6 = new StreamParser();
let processedCount = 0;

parser6.on('link', (link) => {
  // Process each link immediately without accumulating in memory
  processedCount++;

  // Simulate processing (e.g., database insert, validation, etc.)
  if (processedCount % 1000 === 0) {
    console.log(`Processed ${processedCount} links...`);
  }
});

// Simulate processing a large file in chunks
const largeData = Array(5000)
  .fill(0)
  .map((_, i) => `(item: ${i})\n`)
  .join('');

// Process in 1KB chunks
const chunkSize = 1024;
for (let i = 0; i < largeData.length; i += chunkSize) {
  parser6.write(largeData.substring(i, i + chunkSize));
}

parser6.end();
console.log(`Final count: ${processedCount} links processed\n`);

console.log('=== All examples completed successfully! ===');

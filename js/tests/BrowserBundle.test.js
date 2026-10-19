import { describe, expect, test } from 'bun:test';
import { on, once } from 'node:events';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { Emitter } from '../src/Emitter.js';
import { Parser, StreamParser } from '../src/index.js';

const source = fileURLToPath(new URL('../src/index.js', import.meta.url));
const published = fileURLToPath(new URL('../dist/index.js', import.meta.url));

// Bundlers such as esbuild (`--platform=browser`) cannot resolve Node built-ins
// like `events`, so any bare import in the package graph breaks browser builds
// unless consumers add a polyfill (issue #351). Bun's own browser target would
// silently polyfill them, so this plugin fails on every bare import instead.
const rejectBareImports = (imports) => ({
  name: 'reject-bare-imports',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      imports.push(`${args.path} (from ${args.importer})`);
      return { path: args.path, external: true };
    });
  },
});

async function bundleForBrowser(entrypoint) {
  const imports = [];
  const result = await globalThis.Bun.build({
    entrypoints: [entrypoint],
    target: 'browser',
    plugins: [rejectBareImports(imports)],
  });
  return { result, imports };
}

describe('browser bundling (issue #351)', () => {
  test('the source entry point imports no Node built-ins or packages', async () => {
    const { result, imports } = await bundleForBrowser(source);
    expect(result.success).toBe(true);
    expect(imports).toEqual([]);
  });

  test('the published dist entry point imports no Node built-ins or packages', async () => {
    const { result, imports } = await bundleForBrowser(published);
    expect(result.success).toBe(true);
    expect(imports).toEqual([]);

    const text = readFileSync(published, 'utf8');
    expect(text).not.toMatch(/^\s*import\s[^;]*from\s*["'][^./]/m);
    expect(text).not.toMatch(/\brequire\(\s*["']/);
  });

  test('the dist bundle parses and streams like the source', async () => {
    const dist = await import(published);
    const input = '(law: text)\nnext value';
    expect(dist.formatLinks(new dist.Parser().parse(input))).toBe(
      dist.formatLinks(new Parser().parse(input))
    );

    const stream = new dist.StreamParser();
    const seen = [];
    stream.on('link', (link) => seen.push(link.toString()));
    stream.end(input);
    expect(seen).toEqual(['(law: text)', '(next value)']);
  });
});

describe('Emitter', () => {
  test('calls listeners in order with the emitter as this', () => {
    const emitter = new Emitter();
    const calls = [];
    emitter.on('event', function (value) {
      calls.push(['first', value, this === emitter]);
    });
    emitter.addListener('event', (value) => calls.push(['second', value]));
    emitter.prependListener('event', (value) => calls.push(['zeroth', value]));

    expect(emitter.emit('event', 1)).toBe(true);
    expect(calls).toEqual([
      ['zeroth', 1],
      ['first', 1, true],
      ['second', 1],
    ]);
    expect(emitter.emit('missing')).toBe(false);
  });

  test('once listeners run a single time', () => {
    const emitter = new Emitter();
    const calls = [];
    emitter.once('event', (value) => calls.push(`once ${value}`));
    emitter.prependOnceListener('event', (value) => calls.push(`pre ${value}`));
    emitter.emit('event', 1);
    emitter.emit('event', 2);
    expect(calls).toEqual(['pre 1', 'once 1']);
    expect(emitter.listenerCount('event')).toBe(0);
  });

  test('off removes the latest registration, including once listeners', () => {
    const emitter = new Emitter();
    const calls = [];
    const listener = (value) => calls.push(value);
    emitter.on('event', listener);
    emitter.on('event', listener);
    emitter.off('event', listener);
    emitter.emit('event', 'a');
    emitter.removeListener('event', listener);
    emitter.emit('event', 'b');
    emitter.once('event', listener);
    emitter.off('event', listener);
    emitter.emit('event', 'c');
    expect(calls).toEqual(['a']);
    expect(emitter.eventNames()).toEqual([]);
  });

  test('listener changes during emit take effect on the next emit', () => {
    const emitter = new Emitter();
    const calls = [];
    const second = () => calls.push('second');
    emitter.on('event', () => {
      calls.push('first');
      emitter.off('event', second);
      emitter.on('event', () => calls.push('added'));
    });
    emitter.on('event', second);
    emitter.emit('event');
    expect(calls).toEqual(['first', 'second']);
  });

  test('inspects and removes listeners', () => {
    const emitter = new Emitter();
    const listener = () => {};
    emitter.on('a', listener).on('b', listener).on('b', listener);
    expect(emitter.listeners('b')).toEqual([listener, listener]);
    expect(emitter.listenerCount('b')).toBe(2);
    expect(emitter.eventNames()).toEqual(['a', 'b']);
    emitter.removeAllListeners('b');
    expect(emitter.eventNames()).toEqual(['a']);
    emitter.removeAllListeners();
    expect(emitter.listenerCount('a')).toBe(0);
  });

  test('an unhandled error event throws like Node.js', () => {
    const emitter = new Emitter();
    const error = new Error('boom');
    expect(() => emitter.emit('error', error)).toThrow(error);
    expect(() => emitter.emit('error', 'text')).toThrow(
      'Unhandled error. (text)'
    );
    emitter.on('error', () => {});
    expect(emitter.emit('error', error)).toBe(true);
  });

  test('rejects listeners that are not functions', () => {
    expect(() => new Emitter().on('event', 'nope')).toThrow(TypeError);
  });

  test('works with the Node.js events.once helper', async () => {
    const stream = new StreamParser();
    const ended = once(stream, 'end');
    stream.end('a b');
    const [links] = await ended;
    expect(links.map(String)).toEqual(['(a b)']);
  });

  test('works with the Node.js events.on async iterator', async () => {
    const stream = new StreamParser();
    const controller = new globalThis.AbortController();
    const links = on(stream, 'link', { signal: controller.signal });
    globalThis.setTimeout(() => stream.end('a b\nc d'), 0);
    const seen = [];
    try {
      for await (const [link] of links) {
        seen.push(String(link));
        if (seen.length === 2) controller.abort();
      }
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
    expect(seen).toEqual(['(a b)', '(c d)']);
    expect(stream.listenerCount('link')).toBe(0);
    expect(stream.listenerCount('error')).toBe(0);
  });

  test('StreamParser still throws the stream error without a listener', () => {
    const stream = new StreamParser();
    expect(() => stream.write(1)).toThrow(TypeError);
  });
});

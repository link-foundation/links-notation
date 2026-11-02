import { inflateRawSync } from 'node:zlib';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const LIMIT = 64 * 1024 * 1024;
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Validate every entry and all bytes before creating any extraction output. */
export function readZipEntries(bytes) {
  if (bytes.length > LIMIT || bytes.length < 22) throw Error('Invalid ZIP size');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      bytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + bytes.readUInt16LE(i + 20) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6))
    throw Error('ZIP must have one complete directory');
  const count = bytes.readUInt16LE(end + 10);
  if (count !== bytes.readUInt16LE(end + 8) || count > 10000)
    throw Error('Ambiguous ZIP directory');
  const directory = bytes.readUInt32LE(end + 16);
  if (directory + bytes.readUInt32LE(end + 12) !== end)
    throw Error('Invalid ZIP directory bounds');
  let cursor = directory;
  let total = 0;
  const entries = new Map();
  const names = new Set();
  const ranges = [];
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw Error('Malformed ZIP entry');
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressed = bytes.readUInt32LE(cursor + 20);
    const size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const next =
      cursor +
      46 +
      nameLength +
      bytes.readUInt16LE(cursor + 30) +
      bytes.readUInt16LE(cursor + 32);
    if (next > end || flags & ~0x080e || ![0, 8].includes(method))
      throw Error('Unsupported ZIP entry');
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = nameBytes.toString('utf8');
    const parts = name.replace(/\/$/, '').split('/');
    const canonical = name.replace(/\/$/, '').toLowerCase();
    if (
      !name ||
      !Buffer.from(name).equals(nameBytes) ||
      /[\\:]/.test(name) ||
      [...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
      name.startsWith('/') ||
      parts.some((p) => !p || p === '.' || p === '..' || /[. ]$/.test(p)) ||
      names.has(canonical)
    )
      throw Error('Unsafe or ambiguous ZIP path');
    names.add(canonical);
    const mode = (bytes.readUInt32LE(cursor + 38) >>> 16) & 0xf000;
    if (![0, 0x8000, 0x4000].includes(mode))
      throw Error('ZIP symlinks and special files are forbidden');
    total += size;
    if (size > LIMIT || total > LIMIT) throw Error('ZIP expansion exceeds budget');
    const offset = bytes.readUInt32LE(cursor + 42);
    if (
      offset + 30 > directory ||
      bytes.readUInt32LE(offset) !== 0x04034b50 ||
      bytes.readUInt16LE(offset + 6) !== flags ||
      bytes.readUInt16LE(offset + 8) !== method
    )
      throw Error('Invalid ZIP local header');
    if (
      !(flags & 8) &&
      (bytes.readUInt32LE(offset + 14) !== bytes.readUInt32LE(cursor + 16) ||
        bytes.readUInt32LE(offset + 18) !== compressed ||
        bytes.readUInt32LE(offset + 22) !== size)
    )
      throw Error('Conflicting ZIP local metadata');
    const start =
      offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    if (
      start + compressed > directory ||
      !bytes
        .subarray(offset + 30, offset + 30 + bytes.readUInt16LE(offset + 26))
        .equals(nameBytes)
    )
      throw Error('ZIP local name/bounds mismatch');
    if (ranges.some(([a, b]) => offset < b && start + compressed > a))
      throw Error('Overlapping ZIP entries');
    ranges.push([offset, start + compressed]);
    const packed = bytes.subarray(start, start + compressed);
    const data =
      method === 0
        ? packed
        : inflateRawSync(packed, { maxOutputLength: Math.max(1, size) });
    if (data.length !== size || crc32(data) !== bytes.readUInt32LE(cursor + 16))
      throw Error('ZIP size/checksum mismatch');
    entries.set(name, data);
    cursor = next;
  }
  if (cursor !== end) throw Error('Ambiguous ZIP central directory');
  for (const name of entries.keys()) {
    const parts = name.split('/');
    parts.pop();
    while (parts.length) {
      if (
        [...entries.keys()].some(
          (other) =>
            !other.endsWith('/') &&
            other.toLowerCase() === parts.join('/').toLowerCase(),
        )
      )
        throw Error('ZIP file/directory collision');
      parts.pop();
    }
  }
  return entries;
}

export function extractVerifiedZip({ bytes, sha256, destination }) {
  if (
    !/^[a-f\d]{64}$/i.test(sha256) ||
    createHash('sha256').update(bytes).digest('hex') !== sha256.toLowerCase()
  )
    throw Error('Artifact SHA-256 mismatch');
  if (existsSync(destination)) throw Error('Extraction destination must be new');
  const entries = readZipEntries(bytes);
  mkdirSync(destination, { recursive: true });
  for (const [name, data] of entries) {
    const target = resolve(destination, name);
    if (name.endsWith('/')) mkdirSync(target, { recursive: true });
    else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data, { flag: 'wx' });
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  extractVerifiedZip({
    bytes: readFileSync(process.argv[2]),
    sha256: process.env.ARTIFACT_SHA256 || '',
    destination: process.argv[3],
  });
}

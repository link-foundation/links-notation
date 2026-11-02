// Prints the functions with the most self time in a V8 .cpuprofile file.
// Usage: node experiments/cpuprofile-top.mjs profile.cpuprofile [count]
import { readFileSync } from 'node:fs';

const profile = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const count = Number(process.argv[3] ?? 25);
const byId = new Map(profile.nodes.map((node) => [node.id, node]));
const self = new Map();
const deltas = profile.timeDeltas;
profile.samples.forEach((id, index) => {
  const node = byId.get(id);
  const frame = node.callFrame;
  const key = `${frame.functionName || '(anonymous)'} ${frame.url.split('/').pop()}:${frame.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + (deltas[index] ?? 0));
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
for (const [key, micros] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, count)) {
  console.log(`${(micros / 1000).toFixed(1).padStart(8)} ms ${((100 * micros) / total).toFixed(1).padStart(5)}%  ${key}`);
}

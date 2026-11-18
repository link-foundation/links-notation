import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('C# API metadata evaluates the shipped library project only', () => {
  const config = new URL('../../csharp/docfx.json', import.meta.url);
  const { metadata } = JSON.parse(readFileSync(config, 'utf8'));
  assert.deepEqual(metadata.flatMap(({ src }) => src.flatMap(({ files }) => files)), [
    'Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj',
  ]);
  const project = readFileSync(new URL(metadata[0].src[0].files[0], config), 'utf8');
  assert.match(project, new RegExp(`<TargetFramework>${metadata[0].properties.TargetFramework}</TargetFramework>`));
});

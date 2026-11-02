import { test, expect, setDefaultTimeout } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeZip } from '../experiments/issue-82/zip-fixture.mjs';
import { validatePackage } from './validate-nuget-package.mjs';
// Cold Roslyn inline-task compilation can exceed Bun's five-second default.
// Bun 1.4.4 ignores test.timeout in bunfig; set a finite limit for this file.
setDefaultTimeout(30000);
const spec =
  '<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd"><metadata><id>Example.Package</id><version>1.2.3</version><authors>Example Owner</authors><description>Example library</description><license type="expression">Unlicense</license></metadata></package>';
function fixture(xml, license, run) {
  const root = mkdtempSync(join(tmpdir(), 'package-metadata-'));
  const file = join(root, 'Example.Package.1.2.3.nupkg');
  try {
    writeFileSync(
      file,
      makeZip([
        { name: 'Example.Package.nuspec', bytes: xml },
        { name: 'LICENSE', bytes: license ?? readFileSync('LICENSE') },
        { name: 'lib/net10.0/Example.Package.dll', bytes: 'fixture' },
      ]),
    );
    run({ packagePath: file, packageId: 'Example.Package', version: '1.2.3' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('valid generated metadata and exact bundled license pass', () =>
  fixture(spec, null, (options) =>
    expect(() => validatePackage(options)).not.toThrow(),
  ));
for (const [name, xml] of [
  ['identity', spec.replace('Example.Package', 'Wrong.Package')],
  ['version', spec.replace('1.2.3', '1.2.4')],
  ['SPDX', spec.replace('Unlicense', 'MIT')],
  ['license kind', spec.replace('expression', 'file')],
  ['authors', spec.replace('<authors>Example Owner</authors>', '')],
  ['description', spec.replace('Example library', '')],
  ['malformed XML', '<package><metadata>'],
  [
    'DTD',
    '<!DOCTYPE package [<!ENTITY external SYSTEM "file:///etc/passwd">]>' +
      spec.replace('Example library', '&external;'),
  ],
])
  test(`generated package rejects ${name} before upload`, () =>
    fixture(xml, null, (options) =>
      expect(() => validatePackage(options)).toThrow(/metadata validation/),
    ));
test('changed bundled license bytes fail even with correct SPDX metadata', () =>
  fixture(spec, 'changed license', (options) =>
    expect(() => validatePackage(options)).toThrow(/license bytes/),
  ));

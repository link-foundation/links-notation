import { expect, test } from 'bun:test';
import { validateSarif, validateAudit, validateJobResults } from './security-gates.mjs';
const clean = () => ({
  version: '2.1.0',
  runs: [
    {
      tool: { driver: { name: 'CodeQL' } },
      invocations: [{ executionSuccessful: true }],
      results: [],
    },
  ],
});
test('complete clean SARIF passes; every finding level fails', () => {
  expect(() => validateSarif(clean())).not.toThrow();
  for (const level of ['error', 'warning', 'note', 'none', undefined]) {
    const data = clean();
    data.runs[0].results.push({
      level,
      ruleId: 'example',
      message: { text: 'finding' },
    });
    expect(() => validateSarif(data)).toThrow();
  }
});
for (const mutate of [
  (d) => (d.runs = []),
  (d) => delete d.runs[0].results,
  (d) => (d.runs[0].results = {}),
  (d) => (d.runs[0].invocations = []),
  (d) => delete d.runs[0].invocations,
  (d) => (d.runs[0].invocations[0] = {}),
  (d) => (d.runs[0].invocations[0].executionSuccessful = false),
  (d) => (d.runs[0].invocations[0].toolExecutionNotifications = [{ level: 'warning' }]),
]) {
  test('incomplete or diagnostic-bearing SARIF cannot look clean', () => {
    const data = clean();
    mutate(data);
    expect(() => validateSarif(data)).toThrow();
  });
}
const graph = () => ({
  version: 1,
  projects: [
    {
      path: 'tests/Test.csproj',
      frameworks: [
        {
          framework: 'net10.0',
          topLevelPackages: [{ id: 'Direct', resolvedVersion: '1.0.0' }],
          transitivePackages: [{ id: 'Transitive', resolvedVersion: '1.0.0' }],
        },
      ],
    },
  ],
});
const audit = () => ({
  version: 1,
  projects: [{ path: 'tests/Test.csproj', frameworks: [{ framework: 'net10.0' }] }],
});
test('full direct/transitive dependency graph and clean validated audit pass', () => {
  expect(() => validateAudit(audit(), graph(), ['tests/Test.csproj'])).not.toThrow();
});
test('SDK 8 clean audit omits frameworks, but never substitutes for the full graph', () => {
  const cleanReport = { version: 1, projects: [{ path: 'tests/Test.csproj' }] };
  expect(() =>
    validateAudit(cleanReport, graph(), ['tests/Test.csproj']),
  ).not.toThrow();
  expect(() =>
    validateAudit(cleanReport, cleanReport, ['tests/Test.csproj']),
  ).toThrow();
  cleanReport.projects[0].error = 'provider unavailable';
  expect(() => validateAudit(cleanReport, graph(), ['tests/Test.csproj'])).toThrow();
});
for (const group of ['topLevelPackages', 'transitivePackages'])
  test(`existing vulnerable ${group} fails without any dependency diff`, () => {
    const data = audit();
    data.projects[0].frameworks[0][group] = [
      {
        id: 'Bad',
        resolvedVersion: '1.0.0',
        vulnerabilities: [{ severity: 'High', advisoryurl: 'https://example.com' }],
      },
    ];
    expect(() => validateAudit(data, graph(), ['tests/Test.csproj'])).toThrow();
  });
test('unverified provider, missing graph, unknown projects and malformed JSON fail', () => {
  for (const data of [
    {},
    { version: 1, projects: [] },
    { ...audit(), problems: [{ severity: 'error', message: 'unreachable' }] },
  ])
    expect(() => validateAudit(data, graph(), ['tests/Test.csproj'])).toThrow();
  expect(() => validateAudit(audit(), {}, ['tests/Test.csproj'])).toThrow();
  expect(() => validateAudit(audit(), graph(), ['missing.csproj'])).toThrow();
});
test('terminal gate rejects skipped, missing, cancelled and failed expected work', () => {
  expect(() =>
    validateJobResults({ scan: { result: 'success' } }, ['scan']),
  ).not.toThrow();
  for (const result of ['skipped', 'failure', 'cancelled', undefined])
    expect(() => validateJobResults({ scan: { result } }, ['scan'])).toThrow();
  expect(() => validateJobResults({}, ['scan'])).toThrow();
});

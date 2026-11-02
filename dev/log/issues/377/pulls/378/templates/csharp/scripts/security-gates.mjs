import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const array = (x, name, nonempty = false) => {
  if (!Array.isArray(x) || (nonempty && !x.length))
    throw Error(`Missing/malformed ${name}`);
  return x;
};
export function validateSarif(data) {
  if (data?.version !== '2.1.0') throw Error('Unknown SARIF version');
  for (const run of array(data.runs, 'SARIF runs', true)) {
    if (!run?.tool?.driver?.name) throw Error('Missing SARIF tool');
    if (array(run.results, 'SARIF results').length)
      throw Error('CodeQL findings detected (all levels are fatal)');
    for (const invocation of array(run.invocations, 'SARIF invocations', true)) {
      if (invocation?.executionSuccessful !== true)
        throw Error('Incomplete/failed CodeQL execution');
      for (const key of [
        'toolExecutionNotifications',
        'toolConfigurationNotifications',
      ]) {
        if (invocation[key] === undefined) continue;
        for (const diagnostic of array(invocation[key], key)) {
          if (!object(diagnostic) || !['note', 'none'].includes(diagnostic.level))
            throw Error('CodeQL warning/error/unknown diagnostic');
        }
      }
    }
  }
}

function projects(data, expected, kind) {
  if (data?.version !== 1 || data.problems?.length || data.errors?.length)
    throw Error(`Unverified ${kind} provider/schema`);
  const found = new Map();
  for (const project of array(data.projects, `${kind} projects`, true)) {
    if (typeof project?.path !== 'string' || found.has(resolve(project.path)))
      throw Error(`Invalid ${kind} project`);
    // dotnet 8 emits exactly {path} for a successfully audited clean project.
    // The independently captured complete graph still supplies every TFM.
    if (
      kind === 'audit' &&
      project.frameworks === undefined &&
      Object.keys(project).length === 1
    ) {
      found.set(resolve(project.path), null);
      continue;
    }
    const frameworks = new Map();
    for (const framework of array(project.frameworks, `${kind} frameworks`, true)) {
      if (!framework?.framework || frameworks.has(framework.framework))
        throw Error('Invalid/duplicate framework');
      frameworks.set(framework.framework, framework);
    }
    found.set(resolve(project.path), frameworks);
  }
  if (found.size !== expected.length || expected.some((p) => !found.has(resolve(p))))
    throw Error(`Missing/unexpected ${kind} project graph`);
  return found;
}

export function validateAudit(audit, graph, expected) {
  array(expected, 'expected projects', true);
  const resolved = projects(graph, expected, 'dependency graph');
  const audited = projects(audit, expected, 'audit');
  for (const [project, frameworks] of resolved) {
    const checked = audited.get(project);
    if (checked !== null && checked.size !== frameworks.size)
      throw Error('Audit omitted resolved framework');
    for (const [name, framework] of frameworks) {
      const report = checked === null ? {} : checked.get(name);
      if (!report) throw Error('Audit omitted resolved framework');
      for (const kind of ['topLevelPackages', 'transitivePackages']) {
        for (const pkg of array(framework[kind] ?? [], `resolved ${kind}`)) {
          if (
            typeof pkg?.id !== 'string' ||
            !pkg.id ||
            typeof pkg.resolvedVersion !== 'string' ||
            !pkg.resolvedVersion
          )
            throw Error('Unresolved dependency coordinate');
        }
        for (const pkg of array(report[kind] ?? [], `audit ${kind}`)) {
          if (
            !object(pkg) ||
            !Array.isArray(pkg.vulnerabilities) ||
            !pkg.vulnerabilities.length
          )
            throw Error('Malformed vulnerability verdict');
          throw Error(`Vulnerable ${kind}: ${pkg.id}@${pkg.resolvedVersion}`);
        }
      }
    }
  }
}
export function validateJobResults(needs, required) {
  if (!object(needs)) throw Error('Missing job results');
  for (const name of required)
    if (needs[name]?.result !== 'success')
      throw Error(`Required job ${name}: ${needs[name]?.result ?? 'missing'}`);
}
export function findProjects(directory = '.') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'bin', 'obj', 'node_modules', 'artifacts'].includes(entry.name))
      return [];
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? findProjects(path)
      : entry.isFile() && entry.name.endsWith('.csproj')
        ? [resolve(path)]
        : [];
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  if (process.argv[2] === 'sarif') {
    const directory = process.argv[3];
    const files = readdirSync(directory).filter((f) => f.endsWith('.sarif'));
    if (!files.length) throw Error('Missing SARIF reports');
    for (const file of files) validateSarif(read(join(directory, file)));
  } else if (process.argv[2] === 'audit')
    validateAudit(read(process.argv[3]), read(process.argv[4]), findProjects());
  else if (process.argv[2] === 'jobs')
    validateJobResults(
      JSON.parse(process.env.NEEDS_JSON || '{}'),
      process.argv.slice(3),
    );
  else throw Error('Expected sarif, audit or jobs command');
}

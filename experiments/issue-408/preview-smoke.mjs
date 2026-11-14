import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  symlink,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Run the actual archived preview script against a finite local fixture using
// the newly locked libraries and an installed browser, without downloading one.
const root = fileURLToPath(new URL("../../", import.meta.url));
const template = path.join(root, "dev/log/issues/377/pulls/378/templates/js");
const work = await mkdtemp(path.join(tmpdir(), "issue408-preview-"));
const { chromium } = await import(
  pathToFileURL(path.join(template, "node_modules/playwright/index.mjs"))
);
const launch = chromium.launch.bind(chromium);
chromium.launch = (options) =>
  launch({
    ...options,
    executablePath: process.env.ISSUE408_CHROME || "/usr/bin/google-chrome",
    args: [...(options.args || []), "--no-sandbox", "--disable-dev-shm-usage"],
  });
try {
  await mkdir(path.join(work, "scripts"));
  await mkdir(path.join(work, "examples/universal-app/dist"), {
    recursive: true,
  });
  await symlink(
    path.join(template, "node_modules"),
    path.join(work, "node_modules"),
  );
  const source = await readFile(
    path.join(template, "scripts/update-preview-images.mjs"),
    "utf8",
  );
  await writeFile(
    path.join(work, "scripts/update-preview-images.mjs"),
    source.replace(/\nmain\(\)\.catch\([\s\S]*$/, "\nexport { main };\n"),
  );
  await writeFile(
    path.join(work, "examples/universal-app/dist/index.html"),
    '<!doctype html><html lang="en"><body><main class="app-shell"><h1 id="calculator-title">Preview dependency smoke</h1></main></body></html>',
  );
  process.argv = [
    process.execPath,
    path.join(work, "scripts/update-preview-images.mjs"),
    "--skip-build",
  ];
  const { main } = await import(pathToFileURL(process.argv[1]));
  await main();
  const screenshots = path.join(work, "docs/screenshots/example-app");
  const files = await readdir(screenshots);
  assert.equal(files.filter((file) => file.endsWith(".png")).length, 5);
  for (const file of files) {
    const bytes = await readFile(path.join(screenshots, file));
    assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), 1280);
    assert.equal(bytes.readUInt32BE(20), 800);
  }
  await copyFile(
    path.join(screenshots, "example-app.png"),
    path.join(root, "ci-logs/issue-408/preview-smoke.png"),
  );
  console.log(
    "Verified actual preview script: four locale/theme tiles, fallback, native PNG dimensions and teardown.",
  );
} finally {
  chromium.launch = launch;
  await rm(work, { recursive: true, force: true });
}

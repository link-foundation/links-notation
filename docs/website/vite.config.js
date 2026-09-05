import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

// The version the page shows comes from the library it documents. It used to
// be typed into index.html, and had been left at v0.6.0 for ten minor
// releases.
const library = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../js/package.json", import.meta.url)), "utf8")
);

export default defineConfig({
  // Relative, not "/links-notation/". The site is served from a project Pages
  // path, and hard-coding that path is how every asset came to 404: the base
  // still said "/Protocols.Lino/" long after the repository was renamed, so
  // the deployed page loaded no CSS and no JavaScript. A relative base is
  // correct wherever the site is served from, including `vite preview` and a
  // future rename.
  base: "./",
  define: {
    __LIBRARY_VERSION__: JSON.stringify(library.version)
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
});

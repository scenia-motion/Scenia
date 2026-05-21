#!/usr/bin/env node
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const siteDir = path.join(repoRoot, "site");
const outDir = path.join(repoRoot, "_site");

function loadDemos() {
  const demosPath = path.join(siteDir, "demos.json");
  const demos = JSON.parse(readFileSync(demosPath, "utf8"));
  if (!Array.isArray(demos) || demos.length === 0) {
    throw new Error("site/demos.json must be a non-empty array");
  }
  return demos;
}

function normalizeBase(base) {
  if (!base.startsWith("/")) {
    base = "/" + base;
  }
  if (!base.endsWith("/")) {
    base += "/";
  }
  return base;
}

function injectBaseMeta(html, base) {
  const content = `content="${base}"`;
  if (html.includes('name="scenia-base"')) {
    return html.replace(
      /(<meta\s+name="scenia-base"\s+content=")[^"]*(")/i,
      `$1${base.replace(/"/g, "&quot;")}$2`
    );
  }
  return html.replace(
    /<head>/i,
    `<head>\n    <meta name="scenia-base" content="${base.replace(/"/g, "&quot;")}" />`
  );
}

function writeRedirectIndex(buildOutDir, slug) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=../../?demo=${slug}" />
    <title>Redirecting…</title>
    <script>location.replace("../../?demo=${slug}");</script>
  </head>
  <body>
    <p><a href="../../?demo=${slug}">Open ${slug} in the Scenia gallery</a></p>
  </body>
</html>
`;
  writeFileSync(path.join(buildOutDir, "index.html"), html, "utf8");
}

const pagesBase = normalizeBase(process.env.PAGES_BASE ?? "/scenia/");
const demos = loadDemos();

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

for (const name of ["index.html", "site.css", "site.js", ".nojekyll"]) {
  const src = path.join(siteDir, name);
  if (!existsSync(src)) {
    console.error("Missing site/" + name);
    process.exit(1);
  }
  copyFileSync(src, path.join(outDir, name));
}

let indexHtml = readFileSync(path.join(outDir, "index.html"), "utf8");
indexHtml = injectBaseMeta(indexHtml, pagesBase);
writeFileSync(path.join(outDir, "index.html"), indexHtml, "utf8");

const publicDemos = demos.map(({ slug, label }) => ({ slug, label }));
writeFileSync(path.join(outDir, "demos.json"), JSON.stringify(publicDemos, null, 2) + "\n", "utf8");

for (const { slug } of demos) {
  const buildSrc = path.join(repoRoot, "builds", slug);
  const buildOut = path.join(outDir, "builds", slug);

  if (!existsSync(buildSrc)) {
    console.error(`Missing build output at builds/${slug} — run build:pages or build-all-bundles first`);
    process.exit(1);
  }

  mkdirSync(buildOut, { recursive: true });
  cpSync(buildSrc, buildOut, { recursive: true });

  const playerIndex = path.join(buildOut, "index.html");
  if (!existsSync(playerIndex)) {
    console.error(`Missing index.html in builds/${slug}`);
    process.exit(1);
  }
  renameSync(playerIndex, path.join(buildOut, "player.html"));
  writeRedirectIndex(buildOut, slug);
}

console.log(`Assembled site at ${outDir} (base: ${pagesBase})`);

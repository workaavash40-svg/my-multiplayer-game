/* ============================================================
   build/build.js
   Bundles src/main.js (ES modules) with esbuild and inlines the
   result + public/style.css into a single dist/index.html — this
   is what preserves the "download one file, it just works" /
   drag-onto-a-static-host workflow, now produced by a build step
   instead of hand concatenation.

   Usage: node build/build.js   (or `npm run build`)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

function build() {
  console.log('Bundling src/main.js...');
  const result = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'main.js')],
    bundle: true,
    format: 'iife',
    target: 'es2019',
    write: false,
    minify: false,
    sourcemap: false
  });

  const bundledJs = result.outputFiles[0].text;
  const css = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
  let html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

  // Inline the stylesheet.
  html = html.replace(
    '<link rel="stylesheet" href="style.css">',
    `<style>\n${css}\n</style>`
  );

  // Replace the ES-module entry script with the bundled, inlined JS.
  // (Socket.IO's CDN <script> tag is left as-is — it's the one
  // legitimate external dependency, same as the pre-refactor build.)
  const moduleScriptTag = '<script type="module" src="/src/main.js"></script>';
  if (!html.includes(moduleScriptTag)) {
    throw new Error('build.js: could not find the module script tag to replace in public/index.html');
  }
  html = html.replace(moduleScriptTag, `<script>\n${bundledJs}\n</script>`);

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);

  console.log(`Wrote ${path.join('dist', 'index.html')} (${(html.length / 1024).toFixed(1)} KB)`);
}

build();

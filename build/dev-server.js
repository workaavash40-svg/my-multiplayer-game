/* ============================================================
   build/dev-server.js
   Minimal static file server for local development — serves the
   project root so /src/*.js and /public/* both resolve, which ES
   modules require (they can't run via file://). Deliberately uses
   only Node's built-in http/fs modules, no dependencies.

   Usage: node build/dev-server.js   (or `npm run dev`)
   Then open http://localhost:5173/public/index.html
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.DEV_PORT || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/public/index.html';

  const filePath = path.join(ROOT, urlPath);
  // Prevent path traversal outside the project root.
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found: ' + urlPath); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}/public/index.html`);
});

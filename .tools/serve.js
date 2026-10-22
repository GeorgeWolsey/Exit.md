// Local preview server for the site. Not deployed (dot-prefixed folder).
//
//   node .tools/serve.js            -> http://localhost:8765/
//
//   /                 the working copy (repo root, exactly what deploys)
//   /versions/        list of saved iterations in .versions/
//   /versions/<name>/ one saved iteration
//
// Files are read on every request, so edits show up on refresh. Any other
// dot-prefixed path returns 404, matching Azure Static Web Apps.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8765;
const ROOT = path.resolve(__dirname, '..');
const VERSIONS = path.join(ROOT, '.versions');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
};

const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

// Serve a file from `base`, refusing anything outside it or under a dot path.
function serveFile(res, base, rel) {
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = path.join(base, rel);
  const inside = path.relative(base, file);
  if (inside.startsWith('..') || path.isAbsolute(inside) || inside.split(path.sep).some(s => s.startsWith('.'))) {
    return send(res, 404, 'Not found');
  }
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}

function versionList(res) {
  let names = [];
  try {
    names = fs.readdirSync(VERSIONS, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
      .map(d => d.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch { /* no versions yet */ }

  const rows = names.map(name => {
    let notes = '';
    try { notes = fs.readFileSync(path.join(VERSIONS, name, 'NOTES.md'), 'utf8').trim(); } catch { }
    return `<li><a href="/versions/${encodeURIComponent(name)}/">${escapeHtml(name)}</a><p>${escapeHtml(notes)}</p></li>`;
  }).join('\n');

  send(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EXIT versions</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 44rem; margin: 3rem auto; padding: 0 1.25rem; color: #1d1b2e; }
  li { margin-bottom: 1.25rem; } a { font-weight: 600; font-size: 1.1rem; } p { margin: .25rem 0 0; color: #555; }
</style>
<h1>EXIT versions</h1>
<p><a href="/">Working copy (repo root)</a>: what deploys on push.</p>
<ol>${rows || '<li>No saved versions yet.</li>'}</ol>`, 'text/html; charset=utf-8');
}

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(res, 400, 'Bad request'); }

  if (url === '/versions' || url === '/versions/') return versionList(res);

  const m = url.match(/^\/versions\/([^/]+)(\/.*)?$/);
  if (m) {
    if (!m[2]) { res.writeHead(301, { location: `/versions/${encodeURIComponent(m[1])}/` }); return res.end(); }
    return serveFile(res, path.join(VERSIONS, m[1]), m[2].slice(1));
  }

  serveFile(res, ROOT, url.slice(1));
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}/  (versions: http://localhost:${PORT}/versions/)`));

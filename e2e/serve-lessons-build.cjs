// Local test server for the compiled SPA. No proxy or live domain requests.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist/closed-cras/browser');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Execute npm run build antes do teste de navegador.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/oauth/')) {
      response.writeHead(404).end(); return;
    }
    file = path.join(root, 'index.html');
  }
  response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
}).listen(4200, '127.0.0.1');

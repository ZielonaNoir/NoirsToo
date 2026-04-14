import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || '4173');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');
  const normalizedPath = reqPath === '/' ? '/popup.html' : reqPath;
  const candidate = path.normalize(path.join(root, normalizedPath.replace(/^\/+/, '')));

  if (!candidate.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const filePath = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
    ? path.join(candidate, 'index.html')
    : candidate;

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`static-server listening ${port} root=${root}`);
});

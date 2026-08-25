import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname);
    const candidate = path.join(root, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    let target = candidate;
    try {
      if (!(await stat(target)).isFile()) throw new Error('not-file');
    } catch {
      target = path.join(root, 'index.html');
    }
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': types[path.extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end('Preview server error');
  }
}).listen(port, '127.0.0.1', () => console.log(`UNIQ preview: http://127.0.0.1:${port}`));

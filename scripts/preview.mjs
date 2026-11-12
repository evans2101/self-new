import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = new URL('../', import.meta.url);
const { siteUrl } = JSON.parse(await readFile(new URL('content/site.json', project)));
const mount = new URL(process.env.SITE_URL || siteUrl).pathname.replace(/\/?$/, '/');
const dist = fileURLToPath(new URL('dist', project));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.webp':'image/webp', '.jpg':'image/jpeg', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 4173);

createServer(async (req, res) => {
  try {
    const request = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(request.pathname);
    if (path === '/' && mount !== '/' || path === mount.slice(0, -1)) {
      res.writeHead(302, { location: mount }).end();
      return;
    }
    if (!path.startsWith(mount)) throw new Error('Not found');
    const relative = path.slice(mount.length);
    const file = resolve(dist, relative + (path.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(dist + sep)) throw new Error('Not found');
    let body;
    try {
      body = await readFile(file);
    } catch (error) {
      if (error.code !== 'EISDIR') throw error;
      res.writeHead(301, { location: request.pathname + '/' + request.search }).end();
      return;
    }
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }).end(req.method === 'HEAD' ? undefined : body);
  } catch {
    const notFound = await readFile(resolve(dist,'404.html')).catch(() => Buffer.from('Run npm run build before previewing.'));
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(req.method === 'HEAD' ? undefined : notFound);
  }
}).listen(port,'127.0.0.1',() => console.log(`Local: http://127.0.0.1:${port}${mount}`));

import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleHnStories, handleImageProxy, handleProxy } from './lib/api-core.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copies a web-standard Response (as returned by lib/api-core) onto an Express response.
async function send(res: Response, webResponse: globalThis.Response) {
  res.status(webResponse.status);
  const contentType = webResponse.headers.get('content-type');
  if (contentType) res.setHeader('Content-Type', contentType);
  const cacheControl = webResponse.headers.get('cache-control');
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);
  res.send(Buffer.from(await webResponse.arrayBuffer()));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/proxy', async (req: Request, res: Response) => {
    await send(res, await handleProxy(req.body));
  });

  app.get('/api/hn-stories', async (req: Request, res: Response) => {
    const feed = typeof req.query.feed === 'string' ? req.query.feed : null;
    const limit = typeof req.query.limit === 'string' ? req.query.limit : null;
    await send(res, await handleHnStories(feed, limit));
  });

  app.get('/api/image-proxy', async (req: Request, res: Response) => {
    const url = typeof req.query.url === 'string' ? req.query.url : null;
    await send(res, await handleImageProxy(url));
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Episteme server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

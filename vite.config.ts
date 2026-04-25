import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3100,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        zaimProxyPlugin(),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

// Vite plugin to proxy Zaim API requests with OAuth 1.0 signing
function zaimProxyPlugin() {
  return {
    name: 'zaim-proxy',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/zaim-api/')) return next();

        try {
          const { OAuth } = await import('oauth');
          const { loadEnv: le } = await import('vite');
          const e = le('development', '.', 'VITE_');

          const consumerKey = e.VITE_ZAIM_CONSUMER_KEY || '';
          const consumerSecret = e.VITE_ZAIM_CONSUMER_SECRET || '';
          const accessToken = e.VITE_ZAIM_ACCESS_TOKEN || '';
          const accessTokenSecret = e.VITE_ZAIM_ACCESS_TOKEN_SECRET || '';

          if (!accessToken) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: 'Zaim access token not configured' }));
            return;
          }

          const targetUrl = 'https://api.zaim.net' + req.url.replace('/zaim-api', '');

          const oauth = new OAuth(
            'https://api.zaim.net/v2/auth/request',
            'https://api.zaim.net/v2/auth/access',
            consumerKey,
            consumerSecret,
            '1.0',
            null,
            'HMAC-SHA1'
          );

          oauth.get(
            targetUrl,
            accessToken,
            accessTokenSecret,
            (err: any, data: any) => {
              if (err) {
                res.statusCode = err.statusCode || 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Zaim API error', details: err.data }));
                return;
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            }
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

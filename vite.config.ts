import path from 'path';
import dns from 'dns';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

dns.setDefaultResultOrder('ipv4first');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/tmdb': {
            target: 'https://api.themoviedb.org/3',
            rewrite: (path) => path.replace(/^\/api\/tmdb/, ''),
            changeOrigin: true,
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, res) => {
                console.warn('[Vite Proxy Error] Failed to reach TMDB API:', err.message);
                if (!res.headersSent) {
                  res.writeHead(502, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'TMDB API is currently unreachable. Please check your internet connection or DNS settings.' }));
                }
              });
            }
          }
        },
        headers: {
          // Allow eval (needed by Vite HMR + some streaming players)
          // Allow blob: and data: URIs (needed by HLS.js and video providers)
          // Allow all iframes from streaming providers
          'Content-Security-Policy': [
            "default-src * 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
            "script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
            "script-src-elem * 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
            "worker-src * blob: data:",
            "frame-src *",
            "media-src * blob: data: https://*.strem.io",
            "img-src * blob: data:",
            "connect-src * blob: data: https://*.strem.io",
          ].join('; '),
        },
      },
      plugins: [
        react(),
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 10240,
          deleteOriginFile: false
        }),
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 10240,
          deleteOriginFile: false
        }),
        {
          name: 'local-api-middleware',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              if (req.url?.startsWith('/api/translate') || req.url?.startsWith('/api/subtitle')) {
                // Populate process.env with Vite env variables
                Object.keys(env).forEach(key => {
                  if (!process.env[key]) {
                    process.env[key] = env[key];
                  }
                });

                const urlObj = new URL(req.url, 'http://localhost');
                const query = Object.fromEntries(urlObj.searchParams.entries());
                
                let body = {};
                if (req.method === 'POST') {
                  const bodyText = await new Promise<string>((resolve) => {
                    let data = '';
                    req.on('data', chunk => data += chunk);
                    req.on('end', () => resolve(data));
                  });
                  if (bodyText) {
                    try { body = JSON.parse(bodyText); } catch (e) {}
                  }
                }
                
                const mockReq = {
                  method: req.method,
                  query,
                  body,
                  headers: req.headers
                };
                
                const mockRes = {
                  statusCode: 200,
                  headers: {},
                  setHeader(name: string, value: any) {
                    this.headers[name] = value;
                    res.setHeader(name, value);
                    return this;
                  },
                  status(code: number) {
                    this.statusCode = code;
                    res.statusCode = code;
                    return this;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return this;
                  },
                  end(data: any) {
                    res.end(data);
                    return this;
                  }
                };

                try {
                  if (urlObj.pathname === '/api/translate') {
                    const modulePath = path.resolve(__dirname, 'api/translate.js');
                    const { default: handler } = await import(modulePath + '?t=' + Date.now());
                    await handler(mockReq, mockRes);
                    return;
                  }
                  if (urlObj.pathname === '/api/subtitle') {
                    const modulePath = path.resolve(__dirname, 'api/subtitle.js');
                    const { default: handler } = await import(modulePath + '?t=' + Date.now());
                    await handler(mockReq, mockRes);
                    return;
                  }
                } catch (err: any) {
                  console.error('[LOCAL API MIDDLEWARE ERROR]', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
              }
              next();
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                  return 'vendor-react';
                }
                if (id.includes('framer-motion')) {
                  return 'vendor-motion';
                }
                if (id.includes('@supabase') || id.includes('supabase-js')) {
                  return 'vendor-supabase';
                }
                if (id.includes('@novu') || id.includes('novu')) {
                  return 'vendor-novu';
                }
                if (id.includes('@tauri-apps') || id.includes('tauri')) {
                  return 'vendor-tauri';
                }
                return 'vendor-utils';
              }
              if (id.includes('index.css')) {
                return 'vendor-styles';
              }
            }
          }
        },
        chunkSizeWarningLimit: 1000
      }
    };
});

import path from 'path';
import dns from 'dns';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

dns.setDefaultResultOrder('ipv4first');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/subtitle': {
            target: 'https://api.opensubtitles.com',
            rewrite: (path) => path.replace(/^\/api\/subtitle/, '/api/v1/subtitles'),
            changeOrigin: true,
            headers: {
              'Api-Key': env.VITE_OPENSUBTITLES_API_KEY ? env.VITE_OPENSUBTITLES_API_KEY.split(',')[1] || env.VITE_OPENSUBTITLES_API_KEY.split(',')[0] : '',
              'User-Agent': 'flkrd_movies_v1',
              'Accept': 'application/json'
            }
          },
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
      plugins: [react()],
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
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-utils': ['framer-motion', 'lucide-react'],
              'vendor-styles': ['./index.css']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      }
    };
});

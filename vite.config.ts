import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
              'Api-Key': 'TMK1BRNZCmW3AfZaJBZiGlieOD8Cq1hl',
              'User-Agent': 'flkrd_movies_v1',
              'Accept': 'application/json'
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
            "media-src * blob: data:",
            "img-src * blob: data:",
            "connect-src *",
          ].join('; '),
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
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

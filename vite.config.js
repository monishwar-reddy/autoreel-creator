import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          // Allow external images, audio etc from proxy with cross-origin
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/itunes-api': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/itunes-api/, '')
      },
      '/itunes-audio': {
        target: 'https://audio-ssl.itunes.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/itunes-audio/, '')
      }
    }
  }
})

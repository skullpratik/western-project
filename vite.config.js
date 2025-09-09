// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses
    port: 5173,
    strictPort: true,
    proxy: {
      // Route all API calls to backend without CORS
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // ensure path stays /api/... when forwarded
        rewrite: (path) => path
      },
    },
  }
})
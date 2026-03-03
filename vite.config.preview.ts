import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { renameSync } from 'fs'

export default defineConfig({
  root: 'preview',
  base: '/geolonia-maps-draw/',
  plugins: [
    react(),
    {
      name: 'replace-api-key',
      transformIndexHtml(html) {
        const apiKey = process.env.VITE_GEOLONIA_API_KEY || 'YOUR-API-KEY'
        return html.replace(/%VITE_GEOLONIA_API_KEY%/g, apiKey)
      },
    },
    {
      name: 'rename-home-to-index',
      writeBundle() {
        const outDir = resolve(__dirname, 'dist-preview')
        renameSync(resolve(outDir, 'index.html'), resolve(outDir, 'react.html'))
        renameSync(resolve(outDir, 'home.html'), resolve(outDir, 'index.html'))
      },
    },
  ],
  resolve: {
    alias: {
      '@geolonia/drawing-engine/style.css': resolve(__dirname, 'src/drawing-engine.css'),
      '@geolonia/drawing-engine': resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist-preview'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'preview/home.html'),
        index: resolve(__dirname, 'preview/index.html'),
      },
    },
  },
})

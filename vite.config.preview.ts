import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync, renameSync } from 'fs'

export default defineConfig({
  root: 'preview',
  base: '/geolonia-maps-draw/',
  plugins: [
    react(),
    {
      name: 'replace-api-key',
      transformIndexHtml(html) {
        const apiKey = process.env.VITE_GEOLONIA_API_KEY
        if (!apiKey && process.env.CI) {
          console.warn('Warning: VITE_GEOLONIA_API_KEY is not set in CI environment, using fallback')
        }
        return html.replace(/%VITE_GEOLONIA_API_KEY%/g, apiKey || 'YOUR-API-KEY')
      },
    },
    {
      name: 'rename-home-to-index',
      writeBundle() {
        const outDir = resolve(__dirname, 'dist-preview')
        const indexHtml = resolve(outDir, 'index.html')
        const homeHtml = resolve(outDir, 'home.html')
        if (!existsSync(indexHtml)) {
          throw new Error(`Expected file not found: ${indexHtml}`)
        }
        if (!existsSync(homeHtml)) {
          throw new Error(`Expected file not found: ${homeHtml}`)
        }
        renameSync(indexHtml, resolve(outDir, 'react.html'))
        renameSync(homeHtml, resolve(outDir, 'index.html'))
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
        'html-sample': resolve(__dirname, 'preview/html-sample.html'),
      },
    },
  },
})

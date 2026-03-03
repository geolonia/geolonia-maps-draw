import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    // Library build
    return {
      plugins: [
        react(),
        dts({
          include: ['src'],
          outDir: 'dist',
          rollupTypes: true,
        }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          formats: ['es'],
          fileName: 'index',
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime', 'maplibre-gl'],
        },
        cssFileName: 'style',
      },
    }
  }

  // Dev server for preview
  return {
    root: 'preview',
    plugins: [
      react(),
      {
        name: 'replace-api-key',
        transformIndexHtml(html) {
          const apiKey = process.env.VITE_GEOLONIA_API_KEY || 'YOUR-API-KEY'
          return html.replace(/%VITE_GEOLONIA_API_KEY%/g, apiKey)
        },
      },
    ],
    resolve: {
      alias: {
        '@geolonia/drawing-engine/style.css': resolve(__dirname, 'src/drawing-engine.css'),
        '@geolonia/drawing-engine': resolve(__dirname, 'src/index.ts'),
      },
    },
  }
})

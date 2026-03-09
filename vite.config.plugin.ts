import { defineConfig } from 'vite'
import { resolve } from 'path'

/** IIFE build for the Geolonia Embed plugin. */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/plugin/index.ts'),
      name: 'GeoloniaDrawPlugin',
      formats: ['iife'],
      fileName: () => 'plugin.iife.js',
    },
    outDir: 'dist/plugin',
    rollupOptions: {
      external: ['maplibre-gl'],
      output: {
        globals: {
          'maplibre-gl': 'maplibregl',
        },
      },
    },
    cssFileName: 'style',
  },
})

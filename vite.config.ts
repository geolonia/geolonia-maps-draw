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
          entry: {
            index: resolve(__dirname, 'src/index.ts'),
            vanilla: resolve(__dirname, 'src/vanilla/index.ts'),
          },
          formats: ['es'],
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime', 'maplibre-gl'],
        },
        cssFileName: 'drawing-engine',
      },
    }
  }

  // Dev server for preview
  return {
    root: 'preview',
    plugins: [react()],
    resolve: {
      alias: {
        '@geolonia/drawing-engine/style.css': resolve(__dirname, 'src/drawing-engine.css'),
        '@geolonia/drawing-engine': resolve(__dirname, 'src/index.ts'),
      },
    },
  }
})

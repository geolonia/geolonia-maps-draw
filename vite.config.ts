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
    plugins: [react()],
    resolve: {
      alias: {
        '@geolonia/drawing-engine': resolve(__dirname, 'src/index.ts'),
      },
    },
  }
})

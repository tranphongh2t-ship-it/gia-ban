import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['sql.js'],
            },
          },
        },
      },
      { entry: 'electron/preload.ts', onstart(args) { args.reload() }, vite: { build: { rollupOptions: { output: { format: 'cjs', entryFileNames: 'preload.js' } } } } },
    ]),
    renderer(),
  ],
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8787' },
  },
})

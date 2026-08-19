import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config dev dùng backend local (wrangler dev port 8787)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8787' },
  },
})

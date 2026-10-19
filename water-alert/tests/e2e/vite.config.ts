import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Do not inherit the normal dev server's /api proxy or load local credentials.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5194, strictPort: true, hmr: false },
})

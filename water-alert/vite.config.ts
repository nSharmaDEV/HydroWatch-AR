import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Runtime secrets belong to the API, never the frontend build or UI-only preview.
  envDir: false,
  plugins: [react()],
  server: { port: 5178, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8788' } },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'] },
})

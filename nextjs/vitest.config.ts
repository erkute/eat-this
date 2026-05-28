import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    server: {
      deps: {
        // Re-transform next-intl so vitest's resolver handles 'next/server'
        // (which next-intl's ESM dist imports without .js extension).
        inline: ['next-intl'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // next-intl (ESM) imports 'next/server' without .js extension; point it
      // at the CJS entrypoint so vitest's Node resolver can find it.
      'next/server': resolve(__dirname, 'node_modules/next/server.js'),
    },
  },
})

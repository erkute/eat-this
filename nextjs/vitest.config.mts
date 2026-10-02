import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
      // Next resolves this package to empty.js under the react-server
      // condition. Vitest has no RSC condition, so mirror that server import.
      'server-only': resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
})

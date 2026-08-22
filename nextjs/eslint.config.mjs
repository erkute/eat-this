import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Map markers and sheet thumbs render plain <img> on purpose: they live
    // inside MapLibre overlays that re-render constantly, and their sources
    // are pre-sized WebP cutouts / Sanity CDN URLs (?auto=format) already —
    // next/image adds wrapper + srcset overhead without a payload win.
    files: ['app/components/map/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    // Test fixtures and Firebase/Stripe mocks intentionally cast partial
    // objects into SDK shapes. Requiring complete SDK object types here adds
    // noise without improving production type safety.
    files: ['**/*.test.{ts,tsx}', '__tests__/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Email templates cannot use next/image. Gmail and friends need a plain
    // <img> with an absolute URL and inline styles; there is no client runtime
    // to hydrate an optimized component, and the Next optimizer is not
    // reachable from a mail client anyway.
    files: ['emails/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    // The cascade sweep scripts are not modules — each file IS a bare
    // `async (page) => {…}` expression, handed to the Playwright MCP as a
    // file to evaluate in the page (see scripts/cascade/README.md). A
    // top-level expression is the whole point of the format.
    files: ['scripts/cascade/sweep-*.js', 'scripts/cascade/hover*.js'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
  {
    // `for (const _ of …)` is the counting idiom in the cascade tooling: the
    // match itself is irrelevant, only how many there are. Underscore is the
    // conventional "deliberately unused" name.
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_$', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.next-verify/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'public/**',
    ],
  },
];

export default eslintConfig;

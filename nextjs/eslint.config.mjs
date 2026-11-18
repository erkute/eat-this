import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Regeln für den React Compiler, den die App nicht nutzt. Sie verlangen
    // andere Muster für Refs und Effekte, ändern aber nichts am Verhalten ohne
    // Compiler.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    // Map markers and sheet thumbs render plain <img> on purpose: they live
    // inside MapLibre overlays that re-render constantly, and their sources
    // are pre-sized WebP cutouts / Sanity CDN URLs (?auto=format) already —
    // next/image adds wrapper + srcset overhead without a payload win.
    files: ['app/components/map/**'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  {
    // next/image nur über app/components/SiteImage.tsx: Dort bekommen
    // Sanity-URLs den Sanity-Loader und gehen direkt an die CDN. Ein direkter
    // Import schickte sie durch den Optimierer der Instanz, und der kostet
    // Speicher, der auf Cloud Run fehlt (siehe lib/imageLoader.ts).
    files: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    ignores: ['app/components/SiteImage.tsx', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/image',
              message:
                "Bilder über '@/app/components/SiteImage' einbinden, nicht direkt über next/image.",
            },
          ],
        },
      ],
    },
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
    // Next lädt den Cache-Handler selbst, ohne Bundler, als CommonJS – und er
    // erweitert Nexts eigenen FileSystemCache, den es nur per require gibt.
    files: ['cache-handler.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Underscore is the conventional "deliberately unused" name.
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

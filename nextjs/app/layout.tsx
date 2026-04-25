import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: {
    template: '%s | Eat This Berlin',
    default: 'Eat This Berlin — Must-Eat Guide',
  },
  description: "The must-eat guide to Berlin's best dishes.",
  metadataBase: new URL('https://www.eatthisdot.com'),
}

// Root layout is a pass-through; <html>/<body> live in app/[locale]/layout.tsx
// so lang attribute can be locale-aware.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /* Cream paper matches the html/body bg in globals.css so iOS Safari's
     URL bar + status bar tint blends with the page surface instead of
     showing as a default white/grey stripe. Per-route overrides (e.g.
     the launch holding page) can replace this in their own layout. */
  themeColor: '#fbf8ee',
}

export const metadata: Metadata = {
  title: {
    template: '%s | Eat This Berlin',
    default: 'Eat This Berlin — Must Eat Guide',
  },
  description: "The must eat guide to Berlin's best dishes.",
  metadataBase: new URL('https://www.eatthisdot.com'),
}

// Root layout is a pass-through; <html>/<body> live in app/[locale]/layout.tsx
// so lang attribute can be locale-aware.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}

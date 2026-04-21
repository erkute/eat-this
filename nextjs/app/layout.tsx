import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Eat This Berlin',
    default: 'Eat This Berlin — Must-Eat Guide',
  },
  description: "The must-eat guide to Berlin's best dishes.",
  metadataBase: new URL('https://www.eatthisdot.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}

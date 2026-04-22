import type { Metadata } from 'next'
import SPAShell from './SPAShell'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.eatthisdot.com/',
    languages: {
      de: 'https://www.eatthisdot.com/',
      en: 'https://www.eatthisdot.com/?lang=en',
      'x-default': 'https://www.eatthisdot.com/',
    },
  },
}

export default function SPAHomePage() {
  return <SPAShell />;
}

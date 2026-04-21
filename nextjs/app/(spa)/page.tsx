import type { Metadata } from 'next'
import { spaBodyHTML } from './spa-content'

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

// Renders the vanilla-JS SPA shell for the homepage.
// spaBodyHTML is a trusted static constant (not user input).
export default function SPAHomePage() {
  // display:contents makes this wrapper transparent to the layout engine.
  // eslint-disable-next-line react/no-danger
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: spaBodyHTML }} />
}

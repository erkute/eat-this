// nextjs/app/components/buddy/BuddyWidget.test.tsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import BuddyWidget from './BuddyWidget'

describe('BuddyWidget', () => {
  it('renders a launcher button (closed by default)', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>,
    )
    expect(html).toMatch(/data-buddy-launcher/)
    // panel is not open initially
    expect(html).not.toMatch(/data-buddy-panel="open"/)
  })
})

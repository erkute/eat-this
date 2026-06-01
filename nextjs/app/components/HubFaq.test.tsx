import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HubFaq from '@/app/components/HubFaq'

describe('HubFaq', () => {
  it('renders the FAQ heading and at least one question/answer in a details element', () => {
    const html = renderToStaticMarkup(<HubFaq locale="de" />)
    expect(html).toContain('FAQ')
    expect(html).toContain('<details')
    expect(html).toContain('<summary')
    // first DE FAQ question
    expect(html).toContain('Was ist Eat This?')
  })
})

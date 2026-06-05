import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import MagicLinkEmail from '../MagicLinkEmail'

const spots = [
  {
    name: 'SOFI', area: 'Mitte', cuisine: 'Bakery',
    photo: 'https://cdn.sanity.io/images/x/y/rest.png',
    mustEats: [{ dish: 'Breakfast Plate', cardPhoto: 'https://cdn.sanity.io/images/x/y/a.png' }],
  },
  {
    name: 'GEMELLO', area: 'Prenzlauer Berg', cuisine: 'Italian',
    photo: 'https://cdn.sanity.io/images/x/y/rest2.png?w=800',
    mustEats: [{ dish: 'Pizza', cardPhoto: 'https://cdn.sanity.io/images/x/y/b.png?w=800' }],
  },
]

const props = {
  magicLink: 'https://x/verify?abc=1',
  appUrl: 'https://www.eatthisdot.com',
  restaurants: spots,
}

describe('MagicLinkEmail', () => {
  it('renders the new brand assets, link and CTA', async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).toContain('/pics/email/eat-this-logo.png')
    expect(html).toContain('/pics/email/slogan.png')
    expect(html).toContain('/pics/email/booster_free.png')
    expect(html).toContain('https://x/verify?abc=1')
    expect(html).toContain('Anmelden')
  })

  it('renders the editorial headline and curated restaurant spots', async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).toContain('Deine kuratierte')
    expect(html).toContain('Food Discovery Map')
    expect(html).toContain('besten Restaurants, Cafés und Bars in Berlin')
    expect(html).toContain('SOFI')
    expect(html).toContain('Breakfast Plate')
    // Restaurant photo is banner-cropped; Must-Eat card is resized (not cropped).
    // (HTML-escapes `&` to `&amp;` in the attribute.)
    expect(html).toContain('rest.png?w=640&amp;h=360&amp;fit=crop')
    expect(html).toContain('a.png?w=400&amp;auto=format')
    expect(html).toContain('b.png?w=400&amp;auto=format')
  })

  it('drops the retired promo image', async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).not.toContain('/pics/map-promo.webp')
  })

  it('drops all retired onboarding-script content', async () => {
    const html = await render(MagicLinkEmail(props))
    for (const s of ['Pack öffnen', 'Booster Pack wartet', 'enthüllt', 'Sag uns deinen Namen', 'So geht', 'char1.png', 'logo2-white']) {
      expect(html).not.toContain(s)
    }
  })

  it('first-time variant shows the starter pack', async () => {
    const html = await render(MagicLinkEmail({ ...props, returning: false }))
    expect(html).toContain('Deine kuratierte')
    expect(html).toContain('Dein Starter Pack')
    expect(html).toContain('/pics/email/booster_free.png')
  })

  it('uses only Gmail-safe CSS — no properties the Gmail sanitizer strips', async () => {
    // Gmail removes these declarations from inline styles entirely; any layout
    // that depends on them collapses for Gmail recipients (the Must-Eat card
    // was once absolutely positioned and fell into flow as a stray image).
    const html = await render(MagicLinkEmail(props))
    expect(html).not.toMatch(/position\s*:/i)
    expect(html).not.toMatch(/z-index\s*:/i)
    expect(html).not.toMatch(/(?<![a-z-])transform\s*:/i) // text-transform is fine
    expect(html).not.toMatch(/(?<![a-z-])filter\s*:/i)
    expect(html).not.toMatch(/box-shadow\s*:/i)
  })

  it("ships no WebP artwork — Gmail's image proxy flattens WebP alpha, Outlook can't decode it", async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).not.toMatch(/\.webp/i)
  })

  it('returning variant greets back and drops the starter pack', async () => {
    const html = await render(MagicLinkEmail({ ...props, returning: true }))
    expect(html).toContain('Willkommen')
    expect(html).toContain('zurück.')
    // No first-time starter-pack framing
    expect(html).not.toContain('Dein Starter Pack')
    expect(html).not.toContain('/pics/email/booster_free.png')
    expect(html).not.toContain('Deine kuratierte')
    // Still keeps the curated spots + CTA
    expect(html).toContain('SOFI')
    expect(html).toContain('Anmelden')
  })
})

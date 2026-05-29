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
    expect(html).toContain('/pics/eat-this-logo.webp')
    expect(html).toContain('/pics/slogan.webp')
    expect(html).toContain('/pics/booster/booster_free.webp')
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
    expect(html).toContain('/pics/booster/booster_free.webp')
  })

  it('returning variant greets back and drops the starter pack', async () => {
    const html = await render(MagicLinkEmail({ ...props, returning: true }))
    expect(html).toContain('Willkommen')
    expect(html).toContain('zurück.')
    // No first-time starter-pack framing
    expect(html).not.toContain('Dein Starter Pack')
    expect(html).not.toContain('/pics/booster/booster_free.webp')
    expect(html).not.toContain('Deine kuratierte')
    // Still keeps the curated spots + CTA
    expect(html).toContain('SOFI')
    expect(html).toContain('Anmelden')
  })
})

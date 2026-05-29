import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import MagicLinkEmail from '../MagicLinkEmail'

const restaurants = [
  { name: 'Restaurant Alpha', photo: 'https://cdn/a.png?w=320&h=240&fit=crop', meta: 'Japanese' },
  { name: 'Restaurant Beta', photo: 'https://cdn/b.png?w=320&h=240&fit=crop', meta: 'Mitte' },
]
const props = { magicLink: 'https://x/verify?abc=1', appUrl: 'https://www.eatthisdot.com', restaurants }

describe('MagicLinkEmail', () => {
  it('renders the launch branding, link and CTA', async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).toContain('/pics/launch-banner.webp')
    expect(html).toContain('/pics/launch-tagline.webp')
    expect(html).toContain('/pics/booster/booster_free.webp')
    expect(html).toContain('https://x/verify?abc=1')
    expect(html).toContain('Anmelden')
    expect(html).toContain('kuratierte Food-Map')
  })

  it('renders the appetite row when restaurants are provided', async () => {
    const html = await render(MagicLinkEmail(props))
    expect(html).toContain('Ein Vorgeschmack')
    expect(html).toContain('Restaurant Alpha')
    expect(html).toContain('Restaurant Beta')
    expect(html).toContain('https://cdn/a.png?w=320') // & is HTML-encoded in the src attr
  })

  it('omits the appetite row when no restaurants loaded', async () => {
    const html = await render(MagicLinkEmail({ ...props, restaurants: [] }))
    expect(html).not.toContain('Ein Vorgeschmack')
    expect(html).toContain('Anmelden') // rest of the email still renders
  })

  it('drops all retired onboarding-script content', async () => {
    const html = await render(MagicLinkEmail(props))
    for (const s of ['Pack öffnen', 'Booster Pack wartet', 'enthüllt', 'Sag uns deinen Namen', 'So geht', 'char1.png', 'logo2-white', 'eat-this-logo.webp', 'slogan.webp']) {
      expect(html).not.toContain(s)
    }
  })
})

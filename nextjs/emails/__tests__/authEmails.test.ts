import { describe, it, expect } from 'vitest';
import { renderEmail as render } from '../render';
import SignupEmail, { SIGNUP_SUBJECT } from '../SignupEmail';
import LoginEmail, { LOGIN_SUBJECT } from '../LoginEmail';

const spots = [
  {
    name: 'SOFI',
    slug: 'sofi',
    area: 'Mitte',
    cuisine: 'Bakery',
    photo: 'https://cdn.sanity.io/images/x/y/rest.png',
  },
  {
    name: 'GEMELLO',
    slug: 'gemello',
    area: 'Prenzlauer Berg',
    cuisine: 'Italian',
    photo: 'https://cdn.sanity.io/images/x/y/rest2.png?w=800',
  },
];

const magicLink = 'https://x/verify?abc=1';
const appUrl = 'https://www.eatthisdot.com';

const signup = () => render(SignupEmail({ magicLink, appUrl, restaurants: spots }));
const login = () => render(LoginEmail({ magicLink, appUrl }));

describe('shared shell', () => {
  it('opens on the ink masthead and closes on the ink footer with the wordmark', async () => {
    for (const html of [await signup(), await login()]) {
      // The site chrome: ink bar + ink footer, both carrying the wordmark.
      expect(html.match(/\/pics\/email\/eat-this-logo\.png/g)?.length).toBe(2);
      expect(html).toContain('#15120e');
      expect(html).toContain('WE TELL YOU WHAT TO EAT');
      expect(html).toContain('Impressum');
      expect(html).toContain('Datenschutz');
    }
  });

  it('pins the light palette so Apple Mail cannot invert the brand colours', async () => {
    for (const html of [await signup(), await login()]) {
      expect(html).toContain('name="color-scheme" content="light"');
      expect(html).toContain('supported-color-schemes');
    }
  });

  it('uses only Gmail-safe CSS — no properties the Gmail sanitizer strips', async () => {
    // Gmail removes these declarations from inline styles entirely; any layout
    // that depends on them collapses for Gmail recipients.
    for (const html of [await signup(), await login()]) {
      expect(html).not.toMatch(/position\s*:/i);
      expect(html).not.toMatch(/z-index\s*:/i);
      expect(html).not.toMatch(/(?<![a-z-])transform\s*:/i); // text-transform is fine
      expect(html).not.toMatch(/(?<![a-z-])filter\s*:/i);
      expect(html).not.toMatch(/box-shadow\s*:/i);
    }
  });

  it("ships no WebP artwork — Gmail's image proxy flattens WebP alpha, Outlook can't decode it", async () => {
    for (const html of [await signup(), await login()]) {
      expect(html).not.toMatch(/\.webp/i);
    }
  });

  it('never hides the call to action behind an image', async () => {
    // An image button is invisible wherever images are blocked (Outlook, many
    // Gmail accounts) — in a login mail that is a dead end.
    for (const html of [await signup(), await login()]) {
      expect(html).not.toContain('cta-anmelden.png');
    }
  });
});

describe('LoginEmail', () => {
  it('leads with the link and stays transactional', async () => {
    const html = await login();
    expect(html).toContain(magicLink);
    expect(html).toContain('Einloggen');
    expect(html).toContain('WILLKOMMEN');
    expect(html).toContain('1 Stunde');
    expect(LOGIN_SUBJECT).toContain('Login-Link');
  });

  it('carries no product pitch and no artwork to fetch', async () => {
    const html = await login();
    expect(html).not.toContain('Starter Pack');
    expect(html).not.toContain('booster_free');
    expect(html).not.toContain('/api/email/spot-card');
    expect(html).not.toContain('/map?r=');
  });
});

describe('SignupEmail', () => {
  it('shows the home hero, the CTA and the starter pack panel', async () => {
    const html = await signup();
    expect(html).toContain(magicLink);
    expect(html).toContain('Anmelden und Map öffnen');
    expect(html).toContain('WE TELL YOU WHAT TO EAT');
    expect(html).toContain('besten Orte Berlins auf einer Map');
    expect(html).toContain('STARTER PACK');
    expect(html).toContain('Gratis');
    expect(html).toContain('/pics/email/booster_free.png');
    expect(SIGNUP_SUBJECT).toContain('Willkommen');
  });

  it('spots are server-composed cards that deep-link onto the map', async () => {
    const html = await signup();
    // Each spot is ONE composed image (public restaurant photo + name)…
    expect(html).toContain('/api/email/spot-card?slug=sofi');
    expect(html).toContain('/api/email/spot-card?slug=gemello');
    // …wrapped in a link that opens the restaurant on the map.
    expect(html).toContain('/map?r=sofi');
    expect(html).toContain('/map?r=gemello');
    // Alt text carries the full wording for blocked-images clients.
    expect(html).toContain('SOFI — Mitte · Bakery');
  });

  it('caps the spot rail at three so the mail stays short', async () => {
    const many = [...spots, { ...spots[0], slug: 'c' }, { ...spots[0], slug: 'd' }];
    const html = await render(SignupEmail({ magicLink, appUrl, restaurants: many }));
    expect(html.match(/\/api\/email\/spot-card/g)?.length).toBe(3);
  });

  it('drops the spot section entirely when there is no content', async () => {
    const html = await render(SignupEmail({ magicLink, appUrl, restaurants: [] }));
    expect(html).not.toContain('/api/email/spot-card');
    expect(html).toContain('Anmelden und Map öffnen');
  });

  it('drops all retired onboarding-script content', async () => {
    const html = await signup();
    for (const s of [
      'Pack öffnen',
      'Booster Pack wartet',
      'enthüllt',
      'Sag uns deinen Namen',
      'So geht',
      'char1.png',
      'logo2-white',
      'teaser-spots',
    ]) {
      expect(html).not.toContain(s);
    }
  });
});

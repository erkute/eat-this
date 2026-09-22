import { describe, it, expect } from 'vitest';
import { buildLoginText, buildSignupText } from '../magicLinkText';

describe('auth mail plain-text parts', () => {
  it('both carry the link and the expiry note', () => {
    for (const t of [
      buildLoginText('https://x/verify?z=1', 'de'),
      buildSignupText('https://x/verify?z=1', 'de'),
    ]) {
      expect(t).toContain('https://x/verify?z=1');
      expect(t).toContain('eine Stunde gültig');
    }
  });

  it('the login part stays transactional — no product pitch', () => {
    const t = buildLoginText('https://x/verify', 'de');
    expect(t).toContain('Willkommen zurück');
    expect(t).not.toContain('Starter Pack');
    expect(t).not.toContain('Must Eats');
  });

  /* Die Anmeldemail muss sagen, was ein Konto bringt — und das sind seit dem
     06.09.2026 Karten, nicht mehr Spots: die Map liegt fuer jeden ganz da. */
  it('the signup part names what an account is actually worth', () => {
    const t = buildSignupText('https://x/verify', 'de');
    expect(t).toContain('20 Must Eats');
    // Nicht nur wohin, sondern was bestellen — das Versprechen seit 22.09.2026.
    expect(t).toContain('was du');
    expect(t).not.toContain('Gute Spots findest du überall');
    // „auf deiner Map" war das alte Versprechen — Spots gibt es gratis.
    expect(t).not.toContain('Spots samt');
    expect(t).not.toContain('weitere Spots');
  });

  it('drops all retired onboarding-script content', () => {
    for (const t of [buildLoginText('https://x/v', 'de'), buildSignupText('https://x/v', 'de')]) {
      for (const s of [
        'Pack öffnen',
        'Booster Pack',
        '20 zufällige',
        'Sag uns deinen Namen',
        'So geht',
      ]) {
        expect(t).not.toContain(s);
      }
    }
  });

  it('EN: gleiche Teile, kein Deutsch', () => {
    const login = buildLoginText('https://x/v', 'en');
    const signup = buildSignupText('https://x/v', 'en');
    expect(login).toContain('Welcome back.');
    expect(signup).toContain('20 Must Eats to get you started.');
    for (const t of [login, signup]) {
      expect(t).toContain('https://x/v');
      expect(t).toContain('one hour');
      expect(t).not.toMatch(/[äöüß]|Stunde|Anmeldelink|Adresse/);
    }
  });
});

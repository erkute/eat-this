import { describe, it, expect } from 'vitest';
import { buildLoginText, buildSignupText } from '../magicLinkText';

describe('auth mail plain-text parts', () => {
  it('both carry the link and the expiry note', () => {
    for (const t of [
      buildLoginText('https://x/verify?z=1'),
      buildSignupText('https://x/verify?z=1'),
    ]) {
      expect(t).toContain('https://x/verify?z=1');
      expect(t).toContain('1 Stunde');
    }
  });

  it('the login part stays transactional — no product pitch', () => {
    const t = buildLoginText('https://x/verify');
    expect(t).toContain('Willkommen zurück');
    expect(t).not.toContain('Starter Pack');
    expect(t).not.toContain('Must Eats');
  });

  it('the signup part names the starter pack', () => {
    const t = buildSignupText('https://x/verify');
    expect(t).toContain('Starter Pack');
    expect(t).toContain('20 Must Eats');
  });

  it('drops all retired onboarding-script content', () => {
    for (const t of [buildLoginText('https://x/v'), buildSignupText('https://x/v')]) {
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
});

import { describe, expect, it } from 'vitest';
import { shouldGoToProfile } from './afterSignIn';

describe('shouldGoToProfile', () => {
  it('schickt jede Anmeldung ins Profil, egal wo sie anfing', () => {
    expect(shouldGoToProfile('/map')).toBe(true);
    expect(shouldGoToProfile('/')).toBe(true);
    expect(shouldGoToProfile('/restaurant/barra')).toBe(true);
  });

  it('bleibt im Profil, wenn es schon dort ist', () => {
    expect(shouldGoToProfile('/profile')).toBe(false);
  });
});

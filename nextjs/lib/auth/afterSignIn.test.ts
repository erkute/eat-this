import { describe, expect, it } from 'vitest';
import { shouldGoToProfile } from './afterSignIn';

describe('shouldGoToProfile', () => {
  it('schickt ein bestehendes Konto ohne Anlass ins Profil', () => {
    expect(shouldGoToProfile({ isNewUser: false, hasIntent: false, pathname: '/map' })).toBe(true);
  });

  /* Die Starter-Pack-Tour laeuft auf der Seite, auf der die Anmeldung endet. */
  it('laesst ein neues Konto stehen', () => {
    expect(shouldGoToProfile({ isNewUser: true, hasIntent: false, pathname: '/' })).toBe(false);
  });

  it('laesst stehen, wer wegen einer Karte oder eines Herzens angemeldet hat', () => {
    expect(shouldGoToProfile({ isNewUser: false, hasIntent: true, pathname: '/map' })).toBe(false);
  });

  it('bleibt im Profil, wenn es schon dort ist', () => {
    expect(shouldGoToProfile({ isNewUser: false, hasIntent: false, pathname: '/profile' })).toBe(
      false
    );
  });
});

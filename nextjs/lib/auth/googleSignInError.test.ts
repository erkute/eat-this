import { describe, expect, it } from 'vitest';
import { describeGoogleSignInError } from './googleSignInError';

describe('describeGoogleSignInError', () => {
  it('behandelt das Zumachen des Popups als Entscheidung, nicht als Fehler', () => {
    /* `benign` steuert nur die MELDUNG auf dem Schirm. Gemeldet wird trotzdem
       alles (siehe AuthContext) — auth/popup-closed-by-user ist auch das, was
       eine gescheiterte Übergabe liefert, und die erste Fassung war dadurch
       blind an genau der Stelle, an der ich hinsehen wollte. */
    for (const code of [
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/no-auth-event',
    ]) {
      expect(describeGoogleSignInError({ code }), code).toEqual({
        code,
        benign: true,
        blocked: false,
      });
    }
  });

  it('gibt echte Fehler mit ihrem Code weiter', () => {
    /* Der Code ist die ganze Diagnose: auth/unauthorized-domain heisst etwas
       völlig anderes als auth/popup-blocked, und ohne ihn rät man. */
    expect(describeGoogleSignInError({ code: 'auth/unauthorized-domain' })).toEqual({
      code: 'auth/unauthorized-domain',
      benign: false,
      blocked: false,
    });
  });

  it('hebt das geblockte Fenster heraus', () => {
    /* Der Leser kann hier selbst etwas tun — deshalb bekommt der Fall eine
       eigene Ansage statt des allgemeinen „hat nicht geklappt". */
    expect(describeGoogleSignInError({ code: 'auth/popup-blocked' })).toEqual({
      code: 'auth/popup-blocked',
      benign: false,
      blocked: true,
    });
  });

  it('kommt auch mit etwas klar, das gar kein Firebase-Fehler ist', () => {
    expect(describeGoogleSignInError(new Error('boom'))).toEqual({
      code: 'unknown',
      benign: false,
      blocked: false,
    });
    expect(describeGoogleSignInError(undefined)).toEqual({
      code: 'unknown',
      benign: false,
      blocked: false,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { resolveLockedOffer, type LockedOfferFacts } from './lockedOffer';

const spot = 'jungblut';
const facts = (over: Partial<LockedOfferFacts> = {}): LockedOfferFacts => ({
  uid: null,
  mapUid: null,
  claimingSlug: null,
  slug: spot,
  ...over,
});

describe('resolveLockedOffer', () => {
  it('bietet einem Besucher ohne Konto die Anmeldung', () => {
    expect(resolveLockedOffer(facts())).toBe('signup');
  });

  it('bietet einem angemeldeten Leser die Packs', () => {
    expect(resolveLockedOffer(facts({ uid: 'u1', mapUid: 'u1' }))).toBe('packs');
  });

  /**
   * Der Ablauf, den drei Anläufe nicht dichtbekommen haben: Klick auf den Link
   * in der Mail, /welcome, harter Reload der Karte. Jede Zeile ist ein Zustand,
   * den es real gibt, und in keinem darf ein Preis stehen.
   */
  it('zeigt auf dem ganzen Weg aus der Login-Mail nie einen Preis', () => {
    const schritte: { wann: string; f: LockedOfferFacts }[] = [
      {
        wann: 'SSR und Hydration — auth noch nicht aufgelöst',
        f: facts(),
      },
      {
        wann: 'uid ist da, Karte noch die anonyme Sicht',
        f: facts({ uid: 'u1', mapUid: null, claimingSlug: spot }),
      },
      {
        wann: 'Refetch für diese uid gelandet, Claim noch unterwegs',
        f: facts({ uid: 'u1', mapUid: 'u1', claimingSlug: spot }),
      },
      {
        wann: 'Claim geschrieben, Listener-Refetch noch nicht zurück',
        f: facts({ uid: 'u1', mapUid: 'u1', claimingSlug: spot }),
      },
    ];
    for (const { wann, f } of schritte) {
      expect(resolveLockedOffer(f), `Preis gezeigt bei: ${wann}`).not.toBe('packs');
    }
  });

  it('lässt den Preis erst zu, wenn der Claim entschieden und die Karte aktuell ist', () => {
    // Erst hier steht fest, dass dieser Spot wirklich Geld kostet.
    expect(resolveLockedOffer(facts({ uid: 'u1', mapUid: 'u1', claimingSlug: null }))).toBe(
      'packs'
    );
  });

  it('nennt den laufenden Claim beim Namen, statt ihn als Angebot zu tarnen', () => {
    /* Sonst fragt das Sheet nach einer Anmeldung, die gerade läuft. */
    expect(resolveLockedOffer(facts({ uid: 'u1', mapUid: 'u1', claimingSlug: spot }))).toBe(
      'claiming'
    );
  });

  it('hält nur den Spot, um den es geht — nicht die ganze Karte', () => {
    /* Ein laufender Claim ist kein Grund, jedem ANDEREN gesperrten Spot sein
       Angebot wegzunehmen: dort ist der Preis die richtige Auskunft. */
    expect(
      resolveLockedOffer(facts({ uid: 'u1', mapUid: 'u1', claimingSlug: 'ein-anderer-spot' }))
    ).toBe('packs');
  });

  it('fällt beim Abmelden sofort auf die Anmeldung zurück', () => {
    // uid weg, Karte trägt noch die Daten des alten Kontos.
    expect(resolveLockedOffer(facts({ uid: null, mapUid: 'u1' }))).toBe('signup');
  });

  it('erkennt einen Kontowechsel als veraltete Karte', () => {
    expect(resolveLockedOffer(facts({ uid: 'u2', mapUid: 'u1' }))).toBe('signup');
  });
});

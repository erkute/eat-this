import { describe, expect, it } from 'vitest';
import { pathKey } from './pathKey';

describe('pathKey', () => {
  it.each([
    ['/', '/'],
    ['/map', '/map'],
    ['/map/', '/map'],
    ['/must-eats', '/must-eats'],
    ['/news', '/news'],
    ['/checkout/success', '/checkout/success'],
    ['/welcome', '/welcome'],
    ['/restaurant/bari', '/restaurant/bari'],
    ['/kategorie/lunch', '/kategorie/lunch'],
    ['/bezirk/kreuzberg', '/bezirk/kreuzberg'],
    ['/news/berlins-beste-pizza', '/news/berlins-beste-pizza'],
    ['/pack/starter', '/pack/starter'],
  ])('nimmt die Route %s an', (raw, expected) => {
    expect(pathKey(raw)).toBe(expected);
  });

  it.each([
    ['/en', '/en'],
    ['/en/', '/en'],
    ['/en/map', '/en/map'],
    ['/en/restaurant/bari', '/en/restaurant/bari'],
  ])('behaelt das Sprachpraefix %s', (raw, expected) => {
    expect(pathKey(raw)).toBe(expected);
  });

  /* Der Grund fuer dieses Modul: `paths`, `entryPaths` und `continuations`
     sind freie Map-Schluessel in EINEM Firestore-Dokument. Jeder Pfad, den
     diese Seite nicht ausliefert, waere ein Schluessel, den ein Fremder
     bestimmt. */
  it.each([
    ['/wp-admin/install.php'],
    ['/../../etc/passwd'],
    ['/a?b=c'],
    ['/UPPER'],
    ['/a/b/c/d/e/f/g'],
    ['/erfundenes-wort'],
    ['/restaurant/bari/extra'],
    ['/restaurant'],
    ['/kein-hub/bari'],
    ['/de/map'],
    ['/restaurant/Bari'],
    ['/restaurant/bari.php'],
    [`/restaurant/${'a'.repeat(90)}`],
    [''],
    ['map'],
    [null],
    [42],
  ])('verwirft %s', (raw) => {
    expect(pathKey(raw)).toBeNull();
  });

  /* Das Zahlenbrett zaehlte seinen einzigen Leser: /admin/stats stand mit 67
     Aufrufen in der eigenen Ausstiegstabelle. Es steht in keiner Allowlist,
     faellt also schon an der Route durch — kein eigener Regex mehr noetig. */
  it.each(['/admin', '/admin/stats', '/en/admin/stats'])(
    'zaehlt das interne Werkzeug %s nicht',
    (raw) => {
      expect(pathKey(raw)).toBeNull();
    }
  );

  /* Ein geteiltes Sammelalbum traegt die uid im Pfad. Gezaehlt wird die Seite,
     nicht die Person — je Konto ein Schluessel waere der naechste Verstaerker,
     und eine fremde Kennung gehoert ohnehin nicht ins Tagesdokument. */
  describe('geteiltes Deck', () => {
    const UID = 'Z2IJ8CJsAbCdEfGhIjKlMnOpQr01';

    it.each([
      [`/deck/${UID}`, '/deck'],
      [`/en/deck/${UID}`, '/en/deck'],
      ['/deck', '/deck'],
    ])('kuerzt %s auf %s', (raw, expected) => {
      expect(pathKey(raw)).toBe(expected);
    });

    it('nimmt nichts an, was tiefer liegt als die uid', () => {
      expect(pathKey(`/deck/${UID}/karte`)).toBeNull();
    });
  });
});

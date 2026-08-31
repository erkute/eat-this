import { describe, expect, it } from 'vitest';
import { translations } from './translations';

/**
 * Der Dialog darf nicht behaupten, die Antwort entscheide über das Zählen.
 *
 * Bis Version 3 hiess er „Dürfen wir mitzählen?", während `/api/count` seit
 * dem 21.08.2026 jeden Besucher zählt — unabhängig von der Antwort und im
 * Dialog mit keinem Wort erwähnt. Wer „Nein, danke" wählte, ging davon aus,
 * nicht gezählt zu werden. Das war falsch, und diese Klasse von Fehler faellt
 * niemandem auf, weil beide Texte fuer sich genommen stimmen.
 */
describe('Cookie-Dialog: was er über das Zählen behauptet', () => {
  const locales = ['de', 'en'] as const;

  it.each(locales)('[%s] verspricht im Titel keine Zählung, die es nicht gibt', (locale) => {
    const title = translations[locale].cookie.title.toLowerCase();

    // „mitzählen" / „mind if we count" lesen sich als: ohne Ja wird nicht
    // gezählt. Gezählt wird aber immer.
    expect(title).not.toContain('mitzähl');
    expect(title).not.toMatch(/mind if we count/);
  });

  it.each(locales)('[%s] hält den Haupttext bei dem, worüber entschieden wird', (locale) => {
    // Der eigene Zähler gehört nicht hierher: über ihn wird nicht abgestimmt,
    // seine Informationspflicht erfüllt die Datenschutzerklärung. Im Banner
    // stünde er nur im Weg. Genannt wird er trotzdem — im Detailbereich,
    // siehe CookieConsent.test.tsx.
    const text = translations[locale].cookie.text;

    expect(text.length).toBeLessThan(220);
  });

  it.each(locales)('[%s] nennt den Preis der Zustimmung beim Namen', (locale) => {
    // Ohne Google und Cookie ist die Einwilligung nicht informiert.
    const text = translations[locale].cookie.text.toLowerCase();

    expect(text).toContain('google');
    expect(text).toContain('cookie');
  });
});

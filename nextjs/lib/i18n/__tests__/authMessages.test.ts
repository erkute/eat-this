import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import { translations, type Lang } from '@/lib/i18n/translations';

/**
 * Die Anmelde-Fehler kommen aus dem Wurzel-Translator, und der findet einen
 * Text nur über den vollen Pfad. Ohne `auth.`-Präfix wirft next-intl nicht,
 * sondern schreibt dem Leser stillschweigend den SCHLÜSSEL hin: im Panel stand
 * wörtlich „errGooglePopup" statt einer Meldung (Nutzer, 28.08.2026). Genau
 * dieses stille Danebengreifen fängt der Test — ein Aufruf ohne Präfix ist hier
 * nicht von einem funktionierenden zu unterscheiden, ausser am Ergebnis.
 *
 * Reichweite, damit niemand mehr erwartet als drin ist: `de` ist ein
 * Deep-Merge von `en`, ein fehlendes DE-Override fällt also still auf den
 * englischen Text zurück — gewolltes Verhalten, und der Test sieht es nicht.
 * Er greift an der Quelle: verschwindet ein Schlüssel aus `en`, fällt er.
 * Gegenprobe am 29.08.2026 in beide Richtungen gemacht.
 */
const KEYS = [
  'auth.errGooglePopup',
  'auth.errGooglePopupBlocked',
  'auth.googleCancelled',
  // Die Wartescreens (AuthScreen.tsx) — beim Anlegen der Texte vergessen.
  'auth.signingInKicker',
  'auth.signingOutKicker',
  'auth.signingOutTitle',
] as const;

function translator(lang: Lang) {
  return createTranslator({
    locale: lang,
    messages: translations[lang] as unknown as Record<string, unknown>,
    // Wie in i18n/request.ts: fehlt der Text, kommt der Pfad zurück.
    getMessageFallback: ({ key, namespace }) => (namespace ? `${namespace}.${key}` : key),
    onError: () => {},
  });
}

describe('Anmelde-Fehlermeldungen', () => {
  for (const lang of ['de', 'en'] as const) {
    it(`liefert in ${lang} echten Text statt des Schlüssels`, () => {
      const t = translator(lang);
      for (const key of KEYS) {
        const message = t(key as never);
        expect(message, key).not.toBe(key);
        /* Der Fallback liefert den Pfad — ein echter Text traegt den
           Schluesselnamen nirgends. Eine Mindestlaenge waere hier der falsche
           Massstab: "Gleich da" hat neun Zeichen und ist trotzdem richtig. */
        expect(message, key).not.toContain(key.split('.').pop());
        expect(message.trim(), key).not.toBe('');
      }
    });
  }

  it('sagt beim geblockten Fenster etwas anderes als beim allgemeinen Fehler', () => {
    // Sonst wäre die ganze Unterscheidung in describeGoogleSignInError umsonst.
    const t = translator('de');
    expect(t('auth.errGooglePopupBlocked' as never)).not.toBe(t('auth.errGooglePopup' as never));
  });
});

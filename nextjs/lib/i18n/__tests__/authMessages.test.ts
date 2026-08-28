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
 */
const KEYS = ['auth.errGooglePopup', 'auth.errGooglePopupBlocked', 'auth.googleCancelled'] as const;

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
        expect(message.length, key).toBeGreaterThan(10);
      }
    });
  }

  it('sagt beim geblockten Fenster etwas anderes als beim allgemeinen Fehler', () => {
    // Sonst wäre die ganze Unterscheidung in describeGoogleSignInError umsonst.
    const t = translator('de');
    expect(t('auth.errGooglePopupBlocked' as never)).not.toBe(t('auth.errGooglePopup' as never));
  });
});

import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import { translations, type Lang } from '@/lib/i18n/translations';

/**
 * Schlüssel, die im Code erst zur Laufzeit zusammengesetzt werden.
 *
 * `t(\`avatarChoice${c}\`)` steht in keiner Suche nach `avatarChoice1`, kein
 * Compiler und kein Linter sieht die Verbindung. Genau deshalb sind die drei
 * Namen in 24ee6c3 mitgelöscht worden, ohne dass etwas rot wurde — und im
 * Profil standen ab da die Schlüssel selbst statt „Spot Scout“ (Nutzer,
 * 28.08.2026). Zusammengesetzte Schlüssel brauchen deshalb eine Liste, die
 * jemand pflegt: diese hier.
 */
const ZUSAMMENGESETZT: Record<string, string[]> = {
  // app/components/profile/AvatarPickerModal.tsx — CHOICES = [1, 2, 3]
  profile: ['avatarChoice1', 'avatarChoice2', 'avatarChoice3'],
};

function translator(lang: Lang, namespace: string) {
  return createTranslator({
    locale: lang,
    namespace,
    messages: translations[lang] as unknown as Record<string, unknown>,
    // Wie in i18n/request.ts: fehlt der Text, kommt der Pfad zurück.
    getMessageFallback: ({ key, namespace: ns }) => (ns ? `${ns}.${key}` : key),
    onError: () => {},
  });
}

describe('zusammengesetzte Übersetzungsschlüssel', () => {
  for (const [namespace, keys] of Object.entries(ZUSAMMENGESETZT)) {
    for (const lang of ['de', 'en'] as const) {
      it(`${namespace} liefert in ${lang} echten Text statt der Schlüssel`, () => {
        const t = translator(lang, namespace);
        for (const key of keys) {
          const text = t(key as never);
          expect(text, key).not.toBe(`${namespace}.${key}`);
          expect(text, key).not.toContain(key);
        }
      });
    }
  }

  it('gibt den drei Avataren verschiedene Namen', () => {
    // Drei Karten mit demselben Namen wären ein Fehler eigener Art.
    const t = translator('de', 'profile');
    const namen = ZUSAMMENGESETZT.profile.map((key) => t(key as never));
    expect(new Set(namen).size).toBe(namen.length);
  });
});

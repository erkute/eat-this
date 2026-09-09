// nextjs/lib/buddy/prompt.saved.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './prompt';

describe('buildSystemPrompt — Merkliste', () => {
  it('erklärt das Werkzeug nur, wenn ein Konto dahintersteht', () => {
    // Ohne Konto gibt es keine Merkliste. Ein Werkzeug, das immer leer
    // antwortet, lädt nur zu Fragen ein, die niemand beantworten kann.
    expect(buildSystemPrompt('de')).not.toMatch(/list_saved_spots/);
    const signedIn = buildSystemPrompt('de', { signedIn: true });
    expect(signedIn).toMatch(/list_saved_spots/);
    expect(signedIn).toMatch(/meine Map|gemerkt|gespeichert/i);
    // Kein Ersatz für die normale Suche.
    expect(signedIn).toMatch(/NICHT für allgemeine Suchen/i);
  });
});

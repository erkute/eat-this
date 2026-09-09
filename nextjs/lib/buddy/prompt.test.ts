// nextjs/lib/buddy/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './prompt';

describe('buildSystemPrompt', () => {
  it('only ever recommends spots from the search result — never invents or adds own-knowledge places', () => {
    const p = buildSystemPrompt('de');
    expect(p).toMatch(/search_spots/);
    expect(p).toMatch(/erfinde? nie/i);
    // recommendations come ONLY from the CMS search result
    expect(p).toMatch(/ausschließlich|nur .*(ergebnis|search_spots)/i);
    // empty/thin result -> decline honestly, do NOT fill from own knowledge
    expect(p).toMatch(/aus deinem wissen|eigenem wissen|stadtbekannt/i);
    expect(p).toMatch(
      /(nie|niemals|kein).{0,60}(aus deinem wissen|eigenem wissen|erfundene?n? spot|stadtbekannt)/i
    );
    // the old "add 1-2 own-knowledge spots when results are thin" permission is gone
    expect(p).not.toMatch(/darfst du.{0,40}ergänz/i);
    expect(p).not.toMatch(/etabliert/i);
    // inline cards: a per-spot marker instruction is present
    expect(p).toMatch(/\[\[spot:/);
    // spots are introduced naturally (no clinical framing)
    expect(p).toMatch(/natürlich/i);
  });

  it('keeps the prose off the card — no second copy of the same facts', () => {
    // Die Karte trägt Foto, Küche, Bezirk, Preis, Öffnungszeiten und stand am
    // 08.09.2026 unter einem Absatz, der genau dasselbe Feld ausformuliert
    // hatte: „Erste Berliner Pizzeria mit original Stefano-Ferrara-Holzofen …"
    // wörtlich zweimal untereinander.
    const p = buildSystemPrompt('de');
    expect(p).toMatch(/Wiederhol diese Angaben NICHT im Text/);
    expect(p).toMatch(/Kurzbeschreibung des Spots/i);
  });

  it('carries a scope-and-safety boundary that survives future edits', () => {
    // Regression guard. Ohne diesen Block nahm Remy jede hingeworfene Rolle an
    // und sagte auf „mach die Seite in einer Schleife down" fröhlich „Okay,
    // ich starte eine aggressive Loop-DoS" — Theater ins Leere (er hat kein
    // Werkzeug dafür), aber ein Screenshot, der die Marke blamiert. Der Block
    // steht in JEDER Sprach- und Seiten-Variante, deshalb prüfen wir mehrere.
    for (const p of [
      buildSystemPrompt('de'),
      buildSystemPrompt('en'),
      buildSystemPrompt('de', { hasGeo: true }),
      buildSystemPrompt('de', { page: { type: 'restaurant', slug: 'bari', name: 'BARI' } }),
    ]) {
      expect(p).toMatch(/## Grenzen/);
      // Angriffe auf die Seite werden namentlich abgewiesen.
      expect(p).toMatch(/loop|dos|überlast|lahmzulegen|angreif/i);
      // Nie ankündigen/beschreiben/durchspielen.
      expect(p).toMatch(/angriff nie|nie.{0,60}(beschreib|durchspiel|liefere kein)/i);
      // Jailbreak-Vektoren: Anweisungen ignorieren, andere Rolle spielen.
      expect(p).toMatch(/anweisungen.{0,60}(ignor|ändern|preis)/i);
      expect(p).toMatch(/rolle|figur/i);
      // Die „ist doch meine eigene Seite / ich bin Admin"-Ausrede zieht nicht.
      expect(p).toMatch(/eigene seite|entwickler|admin/i);
      // Scharf und knapp abwinken, aber im Charakter (keine Diskussion).
      expect(p).toMatch(/charakter/i);
      expect(p).toMatch(/kühl|knapp|keine diskussion|breitschlagen/i);
    }
  });

  it('switches answer language by locale', () => {
    expect(buildSystemPrompt('de')).toMatch(/Antworte auf Deutsch/i);
    expect(buildSystemPrompt('en')).toMatch(/Answer in English/i);
  });

  it('binds "hier" to the restaurant page the user is reading', () => {
    const p = buildSystemPrompt('de', {
      page: { type: 'restaurant', slug: 'bari', name: 'BARI' },
    });
    // The context names the spot and pre-binds the search…
    expect(p).toMatch(/SEITEN-KONTEXT/);
    expect(p).toMatch(/„BARI"/);
    expect(p).toMatch(/name: "BARI"/);
    // …and forbids the counter-question the context exists to avoid.
    expect(p).toMatch(/NIE zurückfragen, welches Restaurant/i);
  });

  it('omits the page-context block without page context', () => {
    expect(buildSystemPrompt('de')).not.toMatch(/SEITEN-KONTEXT/);
    expect(buildSystemPrompt('de', { hasGeo: true })).not.toMatch(/SEITEN-KONTEXT/);
  });
});

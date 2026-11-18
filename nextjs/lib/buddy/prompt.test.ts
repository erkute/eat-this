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
    // no permission to add own-knowledge spots when results are thin
    expect(p).not.toMatch(/darfst du.{0,40}ergänz/i);
    expect(p).not.toMatch(/etabliert/i);
    // inline cards: a per-spot marker instruction is present
    expect(p).toMatch(/\[\[spot:/);
    // spots are introduced naturally (no clinical framing)
    expect(p).toMatch(/natürlich/i);
  });

  it('puts the card first and keeps the prose short — the chat window shows ~540px', () => {
    // Karte vor Absatz, kurze Absätze: sonst kommt die erste Karte spät, und
    // lange Absätze machen eine Antwort mehrere Fenster lang.
    const p = buildSystemPrompt('de');
    expect(p).toMatch(/Marker `\[\[spot:<slug>\]\]` VOR jeden Mini-Absatz/);
    // Das Beispiel zeigt die Reihenfolge: Marker, dann Text.
    expect(p.indexOf('[[spot:zola]]')).toBeLessThan(p.indexOf('**ZOLA**'));
    expect(p).toMatch(/160 Zeichen/);
    expect(p).toMatch(/150 Zeichen/);
  });

  it('keeps the prose off the card — no second copy of the same facts', () => {
    // Die Karte trägt Foto, Küche, Bezirk, Preis, Öffnungszeiten. Ein Absatz
    // darüber, der dasselbe Feld ausformuliert, stünde wörtlich zweimal
    // untereinander.
    const p = buildSystemPrompt('de');
    expect(p).toMatch(/Wiederhol diese Angaben NICHT im Text/);
    expect(p).toMatch(/Kurzbeschreibung des Spots/i);
  });

  it('carries a scope-and-safety boundary that survives future edits', () => {
    // Ohne diesen Block naehme Remy hingeworfene Rollen an und spielte Angriffe
    // auf die Seite durch: Theater ins Leere (er hat kein Werkzeug dafuer),
    // aber ein Screenshot, der die Marke blamiert. Der Block steht in jeder
    // Sprach- und Standort-Variante, deshalb pruefen wir mehrere.
    for (const p of [
      buildSystemPrompt('de'),
      buildSystemPrompt('en'),
      buildSystemPrompt('de', { hasGeo: true }),
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
});

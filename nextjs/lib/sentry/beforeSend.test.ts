import { describe, expect, it } from 'vitest';

import { dropResourceLoadErrors, isResourceLoadEvent } from './beforeSend';

/* Der Fall, der JAVASCRIPT-3N gefüllt hat: ein <link> im <head> scheitert, das
   DOM-Event landet über onunhandledrejection in Sentry — ohne Stacktrace, ohne
   Titel. Nachgebaut wie es im echten Event stand (target war
   "[HTMLElement: > html > head > link]"). */
const linkErrorEvent = { type: 'error', target: { tagName: 'LINK' } };

describe('isResourceLoadEvent', () => {
  it('erkennt den fehlgeschlagenen <link> aus JAVASCRIPT-3N', () => {
    expect(isResourceLoadEvent(linkErrorEvent)).toBe(true);
  });

  it.each(['SCRIPT', 'IMG', 'SOURCE', 'VIDEO', 'AUDIO', 'TRACK'])(
    'erkennt auch ein gescheitertes <%s>',
    (tagName) => {
      expect(isResourceLoadEvent({ type: 'error', target: { tagName } })).toBe(true);
    }
  );

  /* Die Gegenprobe ist der eigentliche Zweck des Filters: Er darf nur wegwerfen,
     was ohnehin nicht auswertbar ist. Alles mit Stacktrace muss durch. */
  it('lässt einen echten Error durch', () => {
    expect(isResourceLoadEvent(new Error('Loading chunk 42 failed'))).toBe(false);
  });

  it('lässt ein DOM-Event ohne Ressourcen-Ziel durch', () => {
    expect(isResourceLoadEvent({ type: 'error', target: { tagName: 'DIV' } })).toBe(false);
    // Ein Fehler auf `window` hat gar kein tagName — der globale Handler darf
    // nicht mitgefiltert werden.
    expect(isResourceLoadEvent({ type: 'error', target: {} })).toBe(false);
  });

  it('lässt andere Event-Typen auf einem Ressourcen-Element durch', () => {
    expect(isResourceLoadEvent({ type: 'load', target: { tagName: 'LINK' } })).toBe(false);
  });

  it.each([null, undefined, 'boom', 42, {}, { type: 'error' }, { type: 'error', target: null }])(
    'kippt nicht über %s',
    (input) => {
      expect(isResourceLoadEvent(input)).toBe(false);
    }
  );
});

describe('dropResourceLoadErrors', () => {
  it('verwirft das Sentry-Event beim Ressourcen-Fehler', () => {
    expect(dropResourceLoadErrors({ event_id: 'x' }, { originalException: linkErrorEvent })).toBeNull();
  });

  it('gibt echte Fehler unverändert zurück', () => {
    const event = { event_id: 'x' };
    expect(dropResourceLoadErrors(event, { originalException: new Error('kaputt') })).toBe(event);
  });

  it('gibt das Event auch ohne hint zurück', () => {
    const event = { event_id: 'x' };
    expect(dropResourceLoadErrors(event)).toBe(event);
    expect(dropResourceLoadErrors(event, {})).toBe(event);
  });
});

import { describe, expect, it } from 'vitest';

import { filterBrowserErrors, isResourceLoadEvent } from './beforeSend';

/* Ein <link> im <head> scheitert, und das DOM-Event landet über
   onunhandledrejection in Sentry, ohne Stacktrace und Titel. Nachgebaut wie im
   echten Event (target "[HTMLElement: > html > head > link]"). */
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

describe('filterBrowserErrors', () => {
  it('verwirft das Sentry-Event beim Ressourcen-Fehler', () => {
    expect(filterBrowserErrors({ event_id: 'x' }, { originalException: linkErrorEvent })).toBeNull();
  });

  it('gibt echte Fehler unverändert zurück', () => {
    const event = { event_id: 'x' };
    expect(filterBrowserErrors(event, { originalException: new Error('kaputt') })).toBe(event);
  });

  it('gibt das Event auch ohne hint zurück', () => {
    const event = { event_id: 'x' };
    expect(filterBrowserErrors(event)).toBe(event);
    expect(filterBrowserErrors(event, {})).toBe(event);
  });
});

describe('JAVASCRIPT-B5 browser extension error', () => {
  const extensionError = {
    type: 'TypeError',
    value: "Cannot read properties of undefined (reading 'M_ID')",
    mechanism: { type: 'auto.browser.global_handlers.onunhandledrejection', handled: false },
    stacktrace: {
      frames: [
        { filename: 'app:///executors/200.js', lineno: 1, colno: 1442 },
        { filename: 'app:///executors/200.js', lineno: 1, colno: 761 },
      ],
    },
  };

  it.each([
    'app:///executors/200.js',
    'chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js',
  ])('drops the observed Urban VPN error in %s', (filename) => {
    const event = {
      exception: {
        values: [{
          ...extensionError,
          stacktrace: { frames: extensionError.stacktrace.frames.map((frame) => ({ ...frame, filename })) },
        }],
      },
    };
    expect(filterBrowserErrors(event)).toBeNull();
  });

  it('keeps the same error message when an app frame is present', () => {
    const event = {
      exception: {
        values: [{
          ...extensionError,
          stacktrace: {
            frames: [
              ...extensionError.stacktrace.frames,
              { filename: 'app:///_next/static/chunks/app.js' },
            ],
          },
        }],
      },
    };
    expect(filterBrowserErrors(event)).toBe(event);
  });

  it('keeps a normalized stack whose location does not match the extension', () => {
    const event = {
      exception: {
        values: [{
          ...extensionError,
          stacktrace: { frames: [{ filename: 'app:///executors/200.js', lineno: 1, colno: 42 }] },
        }],
      },
    };
    expect(filterBrowserErrors(event)).toBe(event);
  });

  it('keeps a different exception from the same script', () => {
    const event = { exception: { values: [{ ...extensionError, value: 'Failed to fetch' }] } };
    expect(filterBrowserErrors(event)).toBe(event);
  });
});

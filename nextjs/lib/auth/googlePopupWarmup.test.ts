// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Firebases echter Resolver, auf das eine reduziert, was uns interessiert. */
const resolver: { _initialize?: (auth: unknown) => Promise<unknown> } = {};
const auth = { name: 'test-auth' };

vi.mock('firebase/auth', () => ({ browserPopupRedirectResolver: resolver }));
vi.mock('@/lib/firebase/config', () => ({ auth }));

/** Frisches Modul je Fall — der Warmlauf-Zustand lebt im Modul. */
async function loadWarmup() {
  vi.resetModules();
  return (await import('./googlePopupWarmup')).warmGooglePopup;
}

/** Eine Runde Makrotask, damit ein abgelehnter Warmlauf sich setzen kann. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('warmGooglePopup', () => {
  beforeEach(() => {
    delete resolver._initialize;
  });

  it('initialisiert den Popup-Resolver mit unserer Auth-Instanz', async () => {
    const initialize = vi.fn(() => Promise.resolve('manager'));
    resolver._initialize = initialize;

    (await loadWarmup())();

    expect(initialize).toHaveBeenCalledWith(auth);
  });

  it('lädt den Helfer nur einmal, egal wie oft die Oberfläche das anstößt', async () => {
    const initialize = vi.fn(() => Promise.resolve('manager'));
    resolver._initialize = initialize;

    const warm = await loadWarmup();
    warm();
    warm();
    warm();

    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('lässt nach einem Fehlschlag einen neuen Versuch zu', async () => {
    // Sonst bliebe ein einmaliger Netzaussetzer für die ganze Sitzung hängen,
    // und der Knopf wäre wieder genau da, wo er vorher war.
    const initialize = vi.fn(() => Promise.reject(new Error('offline')));
    resolver._initialize = initialize;

    const warm = await loadWarmup();
    warm();
    await settle();
    warm();

    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it('bleibt still, wenn Firebase die interne Methode nicht mehr hat', async () => {
    const warm = await loadWarmup();

    expect(() => warm()).not.toThrow();
  });
});

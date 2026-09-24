// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectLocationPlatform,
  locationBlockedOptions,
  locationHowToSteps,
  watchLocationUnblock,
} from './locationHelp';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
};

describe('detectLocationPlatform', () => {
  it('erkennt die Browser, deren Wege sich unterscheiden', () => {
    expect(detectLocationPlatform(UA.iphoneSafari)).toBe('ios-safari');
    expect(detectLocationPlatform(UA.iphoneChrome)).toBe('ios-chrome');
    expect(detectLocationPlatform(UA.android)).toBe('android-chrome');
    expect(detectLocationPlatform(UA.samsung)).toBe('android-other');
    expect(detectLocationPlatform(UA.macChrome)).toBe('desktop-chrome');
    expect(detectLocationPlatform(UA.firefox)).toBe('desktop-firefox');
  });

  /* iPadOS meldet sich als Mac; ohne die Touch-Punkte bekaeme ein iPad die
     Mac-Anleitung, deren Menues es nicht hat. */
  it('trennt das iPad vom Mac ueber die Touch-Punkte', () => {
    expect(detectLocationPlatform(UA.ipadAsMac, 5)).toBe('ios-safari');
    expect(detectLocationPlatform(UA.ipadAsMac, 0)).toBe('desktop-safari');
  });
});

describe('locationHowToSteps', () => {
  /* Im Simulator gemessen: nach einer Ablehnung reicht Neuladen, nach der
     zweiten nur der globale Schalter, bei Systemsperre die Ortungsdienste. */
  it('fuehrt auf dem iPhone vom haeufigsten zum seltensten Fall', () => {
    const steps = locationHowToSteps('ios-safari', 'de');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toContain('Neu laden');
    expect(steps[1]).toContain('Apps → Safari → Standort');
    expect(steps[2]).toContain('Ortungsdienste → Safari');
  });

  it('spricht Englisch, wenn die Seite es tut', () => {
    expect(locationHowToSteps('android-chrome', 'en')[1]).toContain('Permissions');
  });
});

describe('locationBlockedOptions', () => {
  afterEach(() => {
    delete window.showNotice;
  });

  it('bleibt stehen und oeffnet auf „So geht’s" die Anleitung mit „Neu laden"', () => {
    const showNotice = vi.fn();
    window.showNotice = showNotice;
    const options = locationBlockedOptions('de');

    expect(options.duration).toBe(0);
    expect(options.action?.label).toBe('So geht’s');

    options.action?.onClick();
    const howTo = showNotice.mock.calls[0][0];
    expect(howTo.title).toBe('So gibst du ihn frei');
    expect(howTo.steps.length).toBeGreaterThan(1);
    expect(howTo.action.label).toBe('Neu laden');
  });
});

describe('watchLocationUnblock', () => {
  function fakePermission(initial: PermissionState) {
    const listeners = new Set<() => void>();
    const status = {
      state: initial,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    };
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(() => Promise.resolve(status)) },
    });
    return {
      set(state: PermissionState) {
        status.state = state;
        listeners.forEach((fn) => fn());
      },
      listeners,
    };
  }

  it('meldet, wenn der Browser die Freigabe zurueckgibt', async () => {
    const perm = fakePermission('denied');
    const seen = vi.fn();
    const stop = watchLocationUnblock(seen);
    await Promise.resolve();
    await Promise.resolve();

    perm.set('granted');
    expect(seen).toHaveBeenCalledWith('granted');

    stop();
    expect(perm.listeners.size).toBe(0);
  });

  it('bleibt still, solange es blockiert bleibt', async () => {
    const perm = fakePermission('denied');
    const seen = vi.fn();
    watchLocationUnblock(seen);
    await Promise.resolve();
    await Promise.resolve();

    perm.set('denied');
    expect(seen).not.toHaveBeenCalled();
  });
});

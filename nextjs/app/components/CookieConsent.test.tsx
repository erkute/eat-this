// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  load: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  loadAnalytics: analytics.load,
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    lang: 'de',
    t: (key: string) => ({
      'cookie.title': 'Cookie-Check',
      'cookie.text': 'Cookie-Text',
      'cookie.moreInfo': 'Mehr erfahren',
      'cookie.decline': 'Ablehnen',
      'cookie.accept': 'Akzeptieren',
    })[key] ?? key,
  }),
}));

import CookieConsent from './CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    analytics.load.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it.each(['accepted', 'declined'])('does not leave a stored %s choice in the accessibility tree', (choice) => {
    localStorage.setItem('cookieConsent', choice);

    render(<CookieConsent />);

    expect(screen.queryByRole('dialog', { name: 'Cookie-Check' })).toBeNull();
    expect(analytics.load).toHaveBeenCalledTimes(choice === 'accepted' ? 1 : 0);
  });
});

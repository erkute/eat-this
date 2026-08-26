// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));

import SignInProgressBanner from './SignInProgressBanner';

afterEach(() => vi.useRealTimers());

describe('SignInProgressBanner', () => {
  it('says nothing to someone who just opened the map', () => {
    /* It must announce a sign-in, not greet every visitor. */
    const { container } = render(<SignInProgressBanner working={false} openSpotCount={106} />);
    expect(container.textContent).toBe('');
  });

  it('names the wait while the claim runs', () => {
    const { container } = render(<SignInProgressBanner working openSpotCount={106} />);
    expect(container.textContent).toContain('Du wirst angemeldet');
    expect(container.textContent).toContain('freigeschaltet');
  });

  it('reports what the sign-in was worth, in spots', () => {
    // "Erfolgreich angemeldet" says nothing. A number is the reward.
    const { container, rerender } = render(<SignInProgressBanner working openSpotCount={106} />);
    rerender(<SignInProgressBanner working={false} openSpotCount={151} />);
    expect(container.textContent).toContain('45 neue Spots');
  });

  it('falls back to a plain confirmation when nothing was gained', () => {
    const { container, rerender } = render(<SignInProgressBanner working openSpotCount={151} />);
    rerender(<SignInProgressBanner working={false} openSpotCount={151} />);
    expect(container.textContent).toContain('Du bist angemeldet');
    expect(container.textContent).not.toContain('0 neue Spots');
  });

  it('leaves the map alone again once it has been read', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<SignInProgressBanner working openSpotCount={106} />);
    rerender(<SignInProgressBanner working={false} openSpotCount={151} />);
    expect(container.textContent).toContain('45 neue Spots');
    // Zwei Stufen: erst zurückfahren, dann abbauen. Der Banner bleibt während
    // der Ausfahrt gemountet, sonst verschwände er einfach.
    act(() => {
      vi.advanceTimersByTime(4500 + 10);
    });
    expect(container.textContent).toContain('45 neue Spots');
    act(() => {
      vi.advanceTimersByTime(260 + 10);
    });
    expect(container.textContent).toBe('');
  });
});

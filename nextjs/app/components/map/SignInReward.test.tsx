// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));

import SignInReward from './SignInReward';

afterEach(() => vi.useRealTimers());

describe('SignInReward', () => {
  it('says nothing to someone who just opened the map', () => {
    const { container } = render(
      <SignInReward working={false} outcome={null} openSpotCount={106} />
    );
    expect(container.textContent).toBe('');
  });

  it('names the wait while the claim runs', () => {
    const { container } = render(<SignInReward working outcome={null} openSpotCount={106} />);
    expect(container.textContent).toContain('Du wirst angemeldet');
  });

  it('leads with the number — that is what the sign-up was for', () => {
    /* Der Streifen am oberen Rand war zu klein für genau diese Zahl ("das kann
       ich gar nicht lesen", User 26.08.2026). Sie ist die Belohnung, nicht ein
       Nebensatz. */
    const { container, rerender } = render(
      <SignInReward working outcome={null} openSpotCount={106} />
    );
    rerender(<SignInReward working={false} outcome="granted" openSpotCount={151} />);
    expect(container.textContent).toContain('45');
    expect(container.textContent).toContain('neue Spots auf deiner Map');
    expect(container.textContent).toContain('Dein Spot ist dabei');
  });

  it('says why the promised spot did not come, instead of just showing packs', () => {
    /* Der Fall, der diese Komponente so nötig macht wie die Zahl: das Konto
       hatte seinen Gratis-Spot schon, und das Sheet konnte das ausgeloggt
       unmöglich wissen. Unausgesprochen sieht das aus wie eine Anmeldung, die
       nichts getan hat (User, 26.08.2026). */
    const { container, rerender } = render(
      <SignInReward working outcome={null} openSpotCount={106} />
    );
    rerender(<SignInReward working={false} outcome="spent" openSpotCount={151} />);
    expect(container.textContent).toContain('Gratis-Spot hattest du schon');
    expect(container.textContent).toContain('Pack');
    // Keine Zahl in diesem Fall: sie würde über den ausgefallenen Spot hinwegreden.
    expect(container.textContent).not.toContain('45');
  });

  it('does not claim a spot came along when none did', () => {
    const { container, rerender } = render(
      <SignInReward working outcome={null} openSpotCount={106} />
    );
    rerender(<SignInReward working={false} outcome="failed" openSpotCount={151} />);
    expect(container.textContent).toContain('45');
    expect(container.textContent).not.toContain('Dein Spot ist dabei');
  });

  it('falls back to a plain confirmation when nothing was gained', () => {
    const { container, rerender } = render(
      <SignInReward working outcome={null} openSpotCount={151} />
    );
    rerender(<SignInReward working={false} outcome="failed" openSpotCount={151} />);
    expect(container.textContent).toContain('Du bist angemeldet');
  });

  it('leaves the map alone again once it has been read', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <SignInReward working outcome={null} openSpotCount={106} />
    );
    rerender(<SignInReward working={false} outcome="granted" openSpotCount={151} />);
    act(() => {
      vi.advanceTimersByTime(7000 + 10);
    });
    act(() => {
      vi.advanceTimersByTime(240 + 10);
    });
    expect(container.textContent).toBe('');
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    key === 'cityCount' ? `von ${vars?.total} Spots auf deiner Map` : key,
}));
import ProfileCityProgress from './ProfileCityProgress';

describe('ProfileCityProgress', () => {
  it('nennt die Zahl', () => {
    const { container } = render(<ProfileCityProgress open={154} total={464} />);
    expect(container.textContent).toContain('154');
    expect(container.textContent).toContain('von 464 Spots auf deiner Map');
    // Der Balken trägt den echten Anteil, nicht eine gefühlte Breite.
    const fill = container.querySelector('[class*="cityBarFill"]') as HTMLElement;
    expect(fill.style.width).toBe('33%');
  });

  /* Der Knopf sass am rechten Rand der Textspalte, also direkt neben der
     Figur, und war der DRITTE Weg zur Map auf einem Bildschirm — SiteNav
     oben links, der naechste Zug direkt darunter. Eine Zahl braucht keinen
     Weg (Nutzer, 31.08.2026: „warum zweimal Map"). */
  it('fuehrt nirgendwohin — der Fortschritt ist eine Angabe', () => {
    const { container } = render(<ProfileCityProgress open={154} total={464} />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  /* Die Bank rendert weiter, dieser Block nicht: eine Null von 0 waere keine
     Zahl, sondern eine Luecke, die gleich von der echten ersetzt wuerde. */
  it('zeigt lieber nichts als eine Null, die gleich ersetzt würde', () => {
    const { container } = render(<ProfileCityProgress open={0} total={0} />);
    expect(container.textContent).toBe('');
  });
});

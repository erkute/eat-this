// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHubFilter } from './useHubFilter';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe('useHubFilter', () => {
  const scrolled = vi.fn();
  let anchor: HTMLElement;

  beforeEach(() => {
    anchor = document.createElement('div');
    anchor.id = 'liste';
    anchor.scrollIntoView = scrolled;
    document.body.appendChild(anchor);
    window.history.replaceState(null, '', '/kategorie/pizza');
  });

  afterEach(() => {
    anchor.remove();
    scrolled.mockReset();
  });

  /* Ansage 02.10.2026: „bei einem Klick drauf muss man in der Kategorie-Seite
     ganz oben beginnen". Im Dev-Server lässt Reacts StrictMode Effekte
     zweimal laufen; der alte Merker übersprang nur den ersten, der zweite
     scrollte zur Liste. jsdom wiederholt die Effekte hier nicht — gemessen
     wurde das im Browser (Playwright, /kategorie/pizza: vorher 310px, jetzt
     0). Dieser Test hält fest, woran es hängt: gescrollt wird nur, wenn sich
     der Filter ändert. */
  it('scrollt beim Ankommen nicht', () => {
    renderHook(() => useHubFilter({ queryKey: 'cat', slugs: ['coffee'], anchorId: 'liste' }), {
      wrapper: strict,
    });
    expect(scrolled).not.toHaveBeenCalled();
  });

  it('holt die Liste ins Bild, sobald man umschaltet', () => {
    const { result } = renderHook(
      () => useHubFilter({ queryKey: 'cat', slugs: ['coffee'], anchorId: 'liste' }),
      { wrapper: strict }
    );
    act(() => result.current.select('coffee'));
    expect(scrolled).toHaveBeenCalledTimes(1);
    act(() => result.current.select(null));
    expect(scrolled).toHaveBeenCalledTimes(2);
  });

  it('geht über einen geteilten Link gefiltert auf und zeigt die Liste', () => {
    window.history.replaceState(null, '', '/kategorie/pizza?cat=coffee');
    const { result } = renderHook(
      () => useHubFilter({ queryKey: 'cat', slugs: ['coffee'], anchorId: 'liste' }),
      { wrapper: strict }
    );
    expect(result.current.active).toBe('coffee');
    expect(scrolled).toHaveBeenCalledTimes(1);
  });
});

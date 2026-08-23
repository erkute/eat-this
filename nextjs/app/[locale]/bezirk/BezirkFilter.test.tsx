// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  BEZIRK_LIST_ID,
  BezirkFilterBar,
  BezirkFilterProvider,
  BezirkRow,
  type BezirkChip,
} from './BezirkFilter';

// jsdom kennt weder scrollIntoView noch Element.scrollTo — beides ist hier
// reine Kosmetik, der Filter selbst hängt nicht daran.
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.scrollTo = vi.fn();

const DISTRICTS: BezirkChip[] = [
  { slug: 'mitte', name: 'Mitte', count: 77 },
  { slug: 'neukoelln', name: 'Neukölln', count: 30 },
  { slug: 'friedenau', name: 'Friedenau', count: 1 },
];

function renderList(districts: BezirkChip[] = DISTRICTS) {
  return render(
    <BezirkFilterProvider slugs={districts.map((d) => d.slug)}>
      <BezirkFilterBar districts={districts} locale="de" />
      <div id={BEZIRK_LIST_ID}>
        {districts.map((d) => (
          <BezirkRow key={d.slug} slug={d.slug}>
            <h3 id={`bezirk-${d.slug}-title`}>{d.name}</h3>
          </BezirkRow>
        ))}
      </div>
    </BezirkFilterProvider>
  );
}

function visibleSlugs(container: HTMLElement): string[] {
  return [...container.querySelectorAll('section:not([hidden])')].map((s) => s.id);
}

function chip(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(name, 'i') });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/bezirk');
});

afterEach(cleanup);

describe('BezirkFilter', () => {
  it('zeigt ohne Auswahl jede Zeile und die Gesamtzahlen', () => {
    const { container } = renderList();

    expect(visibleSlugs(container)).toEqual([
      'bezirk-mitte',
      'bezirk-neukoelln',
      'bezirk-friedenau',
    ]);
    expect(chip('^Alle$')).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByRole('status').textContent).toBe('3 Bezirke · 108 Spots');
  });

  it('blendet auf Klick alles ausser dem gewählten Bezirk aus', () => {
    const { container } = renderList();

    fireEvent.click(chip('Neukölln'));

    expect(visibleSlugs(container)).toEqual(['bezirk-neukoelln']);
    expect(chip('Neukölln')).toHaveProperty('ariaPressed', 'true');
    expect(chip('^Alle$')).toHaveProperty('ariaPressed', 'false');
    expect(screen.getByRole('status').textContent).toBe('Neukölln · 30 Spots');
    expect(window.location.search).toBe('?bezirk=neukoelln');
  });

  it('zählt einen einzelnen Spot in der Einzahl', () => {
    renderList();

    fireEvent.click(chip('Friedenau'));

    expect(screen.getByRole('status').textContent).toBe('Friedenau · 1 Spot');
  });

  it('hebt den Filter auf, wenn der aktive Chip erneut geklickt wird', () => {
    const { container } = renderList();

    fireEvent.click(chip('Mitte'));
    fireEvent.click(chip('Mitte'));

    expect(visibleSlugs(container)).toHaveLength(3);
    expect(window.location.search).toBe('');
  });

  it('stellt einen geteilten Link (?bezirk=…) nach dem Mount her', () => {
    window.history.replaceState(null, '', '/bezirk?bezirk=neukoelln');

    const { container } = renderList();

    expect(visibleSlugs(container)).toEqual(['bezirk-neukoelln']);
    expect(chip('Neukölln')).toHaveProperty('ariaPressed', 'true');
  });

  it('ignoriert einen unbekannten Slug, statt jede Zeile zu verstecken', () => {
    window.history.replaceState(null, '', '/bezirk?bezirk=gibtsnicht');

    const { container } = renderList();

    expect(visibleSlugs(container)).toHaveLength(3);
    expect(chip('^Alle$')).toHaveProperty('ariaPressed', 'true');
  });
});

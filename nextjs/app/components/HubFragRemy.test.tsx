// @vitest-environment jsdom
// nextjs/app/components/HubFragRemy.test.tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import HubFragRemy from './HubFragRemy';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

function renderSection(categoryNames: Record<string, string> = { pizza: 'Pizza', lunch: 'Lunch' }) {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubFragRemy categoryNames={categoryNames} />
    </NextIntlClientProvider>
  );
}

describe('HubFragRemy', () => {
  it('fragt „Worauf hast du Lust?" in der homeV2-Sprache', () => {
    renderSection();
    const section = document.querySelector('#hub-fragremy');
    expect(section?.classList.contains('homeV2')).toBe(true);
    expect(document.querySelector('h2.hv-title')?.textContent).toBe('Worauf hast du Lust?');
  });

  it('verlinkt jede Kategorie auf ihre Seite, um Remy herum', () => {
    renderSection();
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-remy-orbit] a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/kategorie/pizza',
      '/kategorie/lunch',
    ]);
    expect(links.map((a) => a.textContent)).toEqual(['Pizza', 'Lunch']);
  });

  it('verkauft nichts und chattet nicht hier: kein Pack, kein Formular', () => {
    renderSection();
    const html = document.body.innerHTML;
    // Der Chat beginnt über den Knopf unten rechts oder den Burger
    // (Ansage 01.10.2026), nicht mehr in dieser Tafel.
    expect(document.querySelector('form')).toBeNull();
    expect(document.querySelector('input')).toBeNull();
    expect(html).not.toContain('/pack/');
    expect(html).not.toContain('Starter Pack');
  });

  it('zeigt ohne Kategorien keine leere Liste', () => {
    renderSection({});
    expect(document.querySelector('[data-hub-categories]')).toBeNull();
    expect(document.querySelector('img[alt="Remy"]')).not.toBeNull();
  });

  it('gibt HubMotion die Haken: Remy, sein Platz, sein Kopf, die Kategorien', () => {
    renderSection();
    expect(document.querySelector('[data-fragremy-avatar]')).not.toBeNull();
    expect(document.querySelector('[data-fragremy-spot]')).not.toBeNull();
    expect(document.querySelector('[data-remy-head]')).not.toBeNull();
    expect(document.querySelectorAll('[data-remy-orbit]')).toHaveLength(2);
  });
});

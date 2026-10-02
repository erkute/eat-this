// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react';
import type { MouseEvent, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigations: string[] = [];
// Stands in for Next's Link: it navigates unless the click was prevented.
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    onClick,
    children,
    ...rest
  }: {
    href: string;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    children: ReactNode;
  }) => (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) navigations.push(href);
        e.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

import MagazineLink from './MagazineLink';

const cover = <span data-magazine-cover="">Cover</span>;
const overlay = () => document.querySelector('[aria-hidden="true"][class]');

/** The article page the opener waits for. */
function land(slug: string) {
  const page = document.createElement('div');
  page.dataset.page = 'news-article';
  page.dataset.articleSlug = slug;
  document.body.append(page);
}

beforeEach(() => {
  navigations.length = 0;
  Element.prototype.animate = vi.fn(
    () => ({ finished: Promise.resolve(), cancel: vi.fn() }) as unknown as Animation
  );
  window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
  globalThis.CSS ??= { escape: (s: string) => s } as typeof CSS;
});

afterEach(() => {
  document.body.innerHTML = '';
  // @ts-expect-error — jsdom has no Web Animations; tests add and remove it.
  delete Element.prototype.animate;
});

describe('MagazineLink', () => {
  it('opens the magazine first and lets the link navigate itself afterwards', async () => {
    const { getByRole } = render(<MagazineLink href="/news/doener">{cover}</MagazineLink>);
    fireEvent.click(getByRole('link'));
    expect(navigations).toEqual([]);
    expect(overlay()).not.toBeNull();
    await vi.waitFor(() => expect(navigations).toEqual(['/news/doener']));
    land('doener');
    await vi.waitFor(() => expect(overlay()).toBeNull());
  });

  it('navigates at once with reduced motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    const { getByRole } = render(<MagazineLink href="/news/doener">{cover}</MagazineLink>);
    fireEvent.click(getByRole('link'));
    expect(navigations).toEqual(['/news/doener']);
    expect(overlay()).toBeNull();
  });

  it('leaves a modifier click to the browser (new tab)', () => {
    const { getByRole } = render(<MagazineLink href="/news/doener">{cover}</MagazineLink>);
    fireEvent.click(getByRole('link'), { metaKey: true });
    expect(overlay()).toBeNull();
    expect(navigations).toEqual(['/news/doener']);
  });

  it('stays out of a click someone else caught — the fan flips to that cover', () => {
    const { getByRole, container } = render(
      <MagazineLink href="/news/doener">{cover}</MagazineLink>
    );
    container.addEventListener('click', (e) => e.preventDefault(), true);
    fireEvent.click(getByRole('link'));
    expect(overlay()).toBeNull();
    expect(navigations).toEqual([]);
  });

  it('opens the cover of another link for „Lesen"', async () => {
    const { getAllByRole } = render(
      <>
        <MagazineLink href="/news/doener" data-current-issue="">
          {cover}
        </MagazineLink>
        <MagazineLink href="/news/doener" coverFrom="[data-current-issue]">
          Lesen
        </MagazineLink>
      </>
    );
    const [front, read] = getAllByRole('link');
    fireEvent.click(read);
    expect(front.style.visibility).toBe('hidden');
    await vi.waitFor(() => expect(navigations).toEqual(['/news/doener']));
    land('doener');
    await vi.waitFor(() => expect(overlay()).toBeNull());
  });
});

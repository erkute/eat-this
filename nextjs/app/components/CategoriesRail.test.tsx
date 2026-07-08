// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const magicLinkState = vi.hoisted(() => ({
  sendLink: vi.fn(),
  reset: vi.fn(),
  state: 'idle',
  errorMessage: '',
}));

vi.mock('@/lib/auth', () => ({
  useMagicLink: () => ({
    sendLink: magicLinkState.sendLink,
    state: magicLinkState.state,
    errorMessage: magicLinkState.errorMessage,
    reset: magicLinkState.reset,
  }),
}));
vi.mock('./MapIntentLink', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <img src={src} alt="" />,
}));
import CategoriesRail from './CategoriesRail';

describe('CategoriesRail', () => {
  beforeEach(() => {
    magicLinkState.sendLink.mockReset();
    magicLinkState.reset.mockReset();
    magicLinkState.state = 'idle';
    magicLinkState.errorMessage = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a category card linking to the booster detail page', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).toContain('/pack/pizza');
    expect(html).toContain('Öffnen');
    expect(html).toContain('Pizza');
  });
  it('renders the starter pack signup before category packs', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />
    );
    expect(html).toContain('Starter Pack');
    expect(html.indexOf('Starter Pack')).toBeLessThan(html.indexOf('Pizza'));
    expect(html).toContain('placeholder="deine@email.com"');
    expect(html).toContain('Anmelden');
  });
  it('keeps the starter pack submit hoverable before an email is entered', () => {
    render(<CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />);

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anmelden' }).disabled).toBe(false);
  });
  it('shows a local error when the starter email is empty', () => {
    render(<CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />);

    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(screen.getByRole('alert').textContent).toBe('Bitte gib deine E-Mail ein.');
    expect(magicLinkState.sendLink).not.toHaveBeenCalled();
  });
  it('shows a local error when the starter email is invalid', () => {
    render(<CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />);

    fireEvent.change(screen.getByLabelText('E-Mail Adresse'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(screen.getByRole('alert').textContent).toBe('Das sieht noch nicht nach einer E-Mail aus.');
    expect(magicLinkState.sendLink).not.toHaveBeenCalled();
  });
  it('sends the starter magic link for a valid email', () => {
    render(<CategoriesRail categoryNames={{ pizza: 'Pizza' }} locale="de" />);

    fireEvent.change(screen.getByLabelText('E-Mail Adresse'), { target: { value: ' test@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(magicLinkState.sendLink).toHaveBeenCalledWith('test@example.com');
  });
  it('keeps the category rail on booster pack art even when Sanity home images exist', () => {
    const html = renderToStaticMarkup(
      <CategoriesRail
        categoryNames={{ pizza: 'Pizza' }}
        categoryImages={{ pizza: 'https://cdn.sanity.io/images/pizza.webp' }}
        locale="de"
      />
    );
    expect(html).toContain('/pics/booster/booster_pizza.webp');
    expect(html).not.toContain('https://cdn.sanity.io/images/pizza.webp');
  });
  it('renders nothing when empty', () => {
    const html = renderToStaticMarkup(<CategoriesRail categoryNames={{}} locale="de" />);
    expect(html).toBe('');
  });
});

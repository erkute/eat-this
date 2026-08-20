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
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

import StarterPackSignup from './StarterPackSignup';

describe('StarterPackSignup', () => {
  beforeEach(() => {
    magicLinkState.sendLink.mockReset();
    magicLinkState.reset.mockReset();
    magicLinkState.state = 'idle';
    magicLinkState.errorMessage = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('names the offer, its price and the magic-link step', () => {
    const html = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    expect(html).toContain('Starter Pack');
    expect(html).toContain('Gratis');
    expect(html).toContain('placeholder="deine@email.com"');
    expect(html).toContain('Starter Pack holen');
    // The mail that follows must not come as a surprise.
    expect(html).toContain('Wir schicken dir einen Link zum Einloggen.');
  });

  it('hides itself pre-paint for signed-in visitors', () => {
    const html = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    expect(html).toContain('data-guest-only');
  });

  it('drops the artwork in the repeat placement', () => {
    const primary = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    const repeat = renderToStaticMarkup(<StarterPackSignup locale="de" variant="repeat" />);
    expect(primary).toContain('booster_free.webp');
    expect(repeat).not.toContain('booster_free.webp');
    expect(repeat).toContain('Hol dir das Starter Pack');
  });

  it('keeps the submit hoverable before an email is entered', () => {
    render(<StarterPackSignup locale="de" />);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Starter Pack holen' }).disabled
    ).toBe(false);
  });

  it('shows a local error when the email is empty', () => {
    render(<StarterPackSignup locale="de" />);

    fireEvent.click(screen.getByRole('button', { name: 'Starter Pack holen' }));

    expect(screen.getByRole('alert').textContent).toBe('Bitte gib deine E-Mail ein.');
    expect(magicLinkState.sendLink).not.toHaveBeenCalled();
  });

  it('shows a local error when the email is invalid', () => {
    render(<StarterPackSignup locale="de" />);

    fireEvent.change(screen.getByLabelText('E-Mail Adresse'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Starter Pack holen' }));

    expect(screen.getByRole('alert').textContent).toBe(
      'Das sieht noch nicht nach einer E-Mail aus.'
    );
    expect(magicLinkState.sendLink).not.toHaveBeenCalled();
  });

  it('sends the magic link for a valid email', () => {
    render(<StarterPackSignup locale="de" />);

    fireEvent.change(screen.getByLabelText('E-Mail Adresse'), {
      target: { value: ' test@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Starter Pack holen' }));

    expect(magicLinkState.sendLink).toHaveBeenCalledWith('test@example.com');
  });

  it('confirms in place once the link is sent', () => {
    magicLinkState.state = 'sent';
    render(<StarterPackSignup locale="de" />);

    expect(screen.getByRole('button', { name: 'Check deine Mail' })).toBeTruthy();
    expect(
      screen.getByText('Wir haben dir den Link geschickt. Ein Klick und du bist drin.')
    ).toBeTruthy();
  });
});

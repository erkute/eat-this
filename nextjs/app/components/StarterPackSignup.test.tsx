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

/** Der Google-Weg, auf das reduziert, was die Tafel davon zeigt. */
const googleState = vi.hoisted(() => ({
  start: vi.fn(),
  prepare: vi.fn(),
  phase: 'idle' as 'idle' | 'busy' | 'done' | 'leaving',
  note: null as 'cancelled' | 'blocked' | 'failed' | null,
}));

vi.mock('@/lib/auth', () => ({
  useMagicLink: () => ({
    sendLink: magicLinkState.sendLink,
    state: magicLinkState.state,
    errorMessage: magicLinkState.errorMessage,
    reset: magicLinkState.reset,
  }),
  useGoogleSignIn: () => ({
    start: googleState.start,
    prepare: googleState.prepare,
    phase: googleState.phase,
    note: googleState.note,
  }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
/* Der Wartescreen braucht next-intl; hier zaehlt nur, ob er da ist. */
vi.mock('./AuthScreen', () => ({
  default: ({ leaving }: { leaving?: boolean }) => (
    <div data-testid="auth-screen" data-leaving={leaving ? '1' : '0'} />
  ),
}));

import StarterPackSignup from './StarterPackSignup';

describe('StarterPackSignup', () => {
  beforeEach(() => {
    magicLinkState.sendLink.mockReset();
    magicLinkState.reset.mockReset();
    magicLinkState.state = 'idle';
    magicLinkState.errorMessage = '';
    googleState.start.mockReset();
    googleState.prepare.mockReset();
    googleState.phase = 'idle';
    googleState.note = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('names the offer, its price and the magic-link step', () => {
    const html = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    expect(html).toContain('Starter Pack');
    expect(html).toContain('Gratis');
    expect(html).toContain('placeholder="deine@email.com"');
    expect(html).toContain('Anmelden');
    // The mail that follows must not come as a surprise.
    expect(html).toContain('Wir schicken dir einen Link zum Einloggen.');
  });

  it('hides itself pre-paint for signed-in visitors', () => {
    const html = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    expect(html).toContain('data-guest-only');
  });

  it('shows the pack, so the free thing is visible and not just named', () => {
    const html = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    expect(html).toContain('booster_free.webp');
  });

  it('keeps the submit hoverable before an email is entered', () => {
    render(<StarterPackSignup locale="de" />);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anmelden' }).disabled).toBe(
      false
    );
  });

  it('shows a local error when the email is empty', () => {
    render(<StarterPackSignup locale="de" />);

    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(screen.getByRole('alert').textContent).toBe('Bitte gib deine E-Mail ein.');
    expect(magicLinkState.sendLink).not.toHaveBeenCalled();
  });

  it('shows a local error when the email is invalid', () => {
    render(<StarterPackSignup locale="de" />);

    fireEvent.change(screen.getByLabelText('E-Mail Adresse'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

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
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

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

  /* Der Google-Weg — bis 07.09.2026 fehlte er hier, das Login-Modal hatte
     ihn (Nutzer: „das Anmeldeformular auf der Startseite hat nicht die
     Google-Anmeldung"). */
  it('offers Google next to the email, in both languages', () => {
    const de = renderToStaticMarkup(<StarterPackSignup locale="de" />);
    expect(de).toContain('Mit Google anmelden');
    expect(de).toContain('>oder<');
    const en = renderToStaticMarkup(<StarterPackSignup locale="en" />);
    expect(en).toContain('Sign in with Google');
  });

  it('starts the Google sign-in on click and warms the popup when the hand reaches the button', () => {
    render(<StarterPackSignup locale="de" />);
    const button = screen.getByRole('button', { name: 'Mit Google anmelden' });

    fireEvent.pointerEnter(button);
    expect(googleState.prepare).toHaveBeenCalledTimes(1);
    expect(googleState.start).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(googleState.start).toHaveBeenCalledTimes(1);
  });

  it('does not warm the Google popup just because the page rendered', () => {
    render(<StarterPackSignup locale="de" />);
    expect(googleState.prepare).not.toHaveBeenCalled();
  });

  it('holds the button and shows the wait screen while Google is open', () => {
    googleState.phase = 'busy';
    render(<StarterPackSignup locale="de" />);

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Mit Google anmelden' }).disabled
    ).toBe(true);
    expect(screen.getByTestId('auth-screen').getAttribute('data-leaving')).toBe('0');
  });

  it('tells the reader quietly when they closed the Google window themselves', () => {
    googleState.note = 'cancelled';
    render(<StarterPackSignup locale="de" />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe(
      'Abgebrochen. Versuch es nochmal oder nimm deine E-Mail.'
    );
  });

  it('raises an alert when the browser blocked the Google window', () => {
    googleState.note = 'blocked';
    render(<StarterPackSignup locale="de" />);

    expect(screen.getByRole('alert').textContent).toBe(
      'Dein Browser hat das Google-Fenster blockiert. Lass es zu oder nimm deine E-Mail.'
    );
  });

  it('drops the Google button and its note once the mail link is out', () => {
    magicLinkState.state = 'sent';
    googleState.note = 'failed';
    render(<StarterPackSignup locale="de" />);

    expect(screen.queryByRole('button', { name: 'Mit Google anmelden' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

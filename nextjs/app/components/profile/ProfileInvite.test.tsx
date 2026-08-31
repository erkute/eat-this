// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const state = vi.hoisted(() => ({ joined: null as number | null }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'de',
}));
vi.mock('@/lib/firebase/useReferralCount', () => ({
  useReferralCount: () => state.joined,
}));
vi.mock('../ShareButton', () => ({
  default: ({ url, label }: { url: string; label: string }) => (
    <button data-url={url}>{label}</button>
  ),
}));

import ProfileInvite from './ProfileInvite';

const UID = 'u'.repeat(28);

afterEach(() => {
  cleanup();
  state.joined = null;
});

describe('ProfileInvite', () => {
  // Der Kasten sah nach zwanzig Anmeldungen genauso aus wie nach keiner. Die
  // einzige Rueckmeldung war ein Toast, der nur feuerte, wenn man in genau
  // dieser Sekunde die Seite offen hatte.
  it('stays quiet until the first friend has actually joined', () => {
    const { container } = render(<ProfileInvite uid={UID} />);
    expect(container.textContent).not.toContain('inviteJoined');

    cleanup();
    state.joined = 0;
    expect(render(<ProfileInvite uid={UID} />).container.textContent).not.toContain('inviteJoined');
  });

  it('names the count once there is one', () => {
    state.joined = 1;
    expect(render(<ProfileInvite uid={UID} />).container.textContent).toContain('inviteJoinedOne');

    cleanup();
    state.joined = 4;
    expect(render(<ProfileInvite uid={UID} />).container.textContent).toContain(
      'inviteJoinedMany:{"count":4}'
    );
  });

  it('builds the invite link on the origin the user is standing on', () => {
    const { container } = render(<ProfileInvite uid={UID} />);
    // Staging darf keine Einladung auf die Live-Domain schicken.
    expect(container.querySelector('button')?.getAttribute('data-url')).toBe(
      `${window.location.origin}/deck/${UID}?ref=${UID}`
    );
  });

  /* Geteilt wird das eigene Deck, nicht die Startseite: ein nackter Link auf
     `/` war eine Bitte, das Deck zeigt erst etwas her. Das `?ref` muss dabei
     dranbleiben — es ist der einzige Grund, dass aus dem Angeben eine
     Werbung wird, und die Middleware nimmt es auf jeder Route entgegen. */
  it('zeigt auf das eigene Deck und behaelt den Referral-Parameter', () => {
    const { container } = render(<ProfileInvite uid={UID} />);
    const url = container.querySelector('button')?.getAttribute('data-url') ?? '';

    expect(new URL(url).pathname).toBe(`/deck/${UID}`);
    expect(new URL(url).searchParams.get('ref')).toBe(UID);
  });
});

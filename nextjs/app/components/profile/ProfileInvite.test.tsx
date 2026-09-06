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
    const { container } = render(<ProfileInvite uid={UID} cards={[]} />);
    expect(container.textContent).not.toContain('inviteJoined');

    cleanup();
    state.joined = 0;
    expect(render(<ProfileInvite uid={UID} cards={[]} />).container.textContent).not.toContain('inviteJoined');
  });

  it('names the count once there is one', () => {
    state.joined = 1;
    expect(render(<ProfileInvite uid={UID} cards={[]} />).container.textContent).toContain('inviteJoinedOne');

    cleanup();
    state.joined = 4;
    expect(render(<ProfileInvite uid={UID} cards={[]} />).container.textContent).toContain(
      'inviteJoinedMany:{"count":4}'
    );
  });

  it('builds the invite link on the origin the user is standing on', () => {
    const { container } = render(<ProfileInvite uid={UID} cards={[]} />);
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
    const { container } = render(<ProfileInvite uid={UID} cards={[]} />);
    const url = container.querySelector('button')?.getAttribute('data-url') ?? '';

    expect(new URL(url).pathname).toBe(`/deck/${UID}`);
    expect(new URL(url).searchParams.get('ref')).toBe(UID);
  });

  /* Der Kasten war eine gelbe Leiste mit zwei Zeilen und ging zwischen Deck
     und gespeicherten Spots unter (Nutzer, 06.09.2026). Drei Karten machen
     ihn zu einem Gegenstand — und drei sind es immer, auch bei einem leeren
     Deck: ein Faecher aus einer Karte sieht aus wie ein Fehler. */
  it('haelt immer drei Karten hin und fuellt mit Rueckseiten auf', () => {
    const { container } = render(
      <ProfileInvite uid={UID} cards={['/api/must-eat-image/m1', '/api/must-eat-image/m2']} />
    );

    const srcs = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toEqual([
      '/api/must-eat-image/m1',
      '/api/must-eat-image/m2',
      '/pics/card-back.webp?v=7',
    ]);
  });

  it('zeigt drei Rueckseiten, wenn noch nichts aufgedeckt ist', () => {
    const { container } = render(<ProfileInvite uid={UID} cards={[]} />);

    expect(container.querySelectorAll('img')).toHaveLength(3);
  });
});

// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.compose.test.tsx
// Die Zeile unter dem Log: schreiben, während Remy antwortet, und ihn
// abbrechen können. Vorher war das Feld gesperrt, solange er schrieb (der
// Fokus sprang heraus) und es gab keinen Weg, eine lange Antwort zu stoppen.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';
import type { BuddyDisplayMessage } from './useBuddyChat';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}));
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({ location: null, loading: false, error: null, request: vi.fn() }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const { stop } = vi.hoisted(() => ({ stop: vi.fn() }));
const chat: { messages: BuddyDisplayMessage[]; isStreaming: boolean } = {
  messages: [],
  isStreaming: false,
};
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ ...chat, send: vi.fn(), stop, setGeo: vi.fn() }),
}));

import BuddyWidget from './BuddyWidget';

afterEach(() => {
  cleanup();
  stop.mockClear();
  chat.messages = [];
  chat.isStreaming = false;
});

function renderOpenWidget() {
  const utils = render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>
  );
  fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
  return utils;
}

const input = () => document.querySelector<HTMLInputElement>('#buddy-panel input')!;

describe('BuddyWidget compose row', () => {
  it('puts the caret in the field when the panel opens', () => {
    renderOpenWidget();
    expect(document.activeElement).toBe(input());
  });

  it('keeps the field writable while Remy is answering', () => {
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: 'Moment' },
    ];
    chat.isStreaming = true;
    renderOpenWidget();
    expect(input().disabled).toBe(false);
  });

  it('turns the send button into a stop button while streaming', () => {
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: 'Moment' },
    ];
    chat.isStreaming = true;
    renderOpenWidget();

    const button = document.querySelector<HTMLButtonElement>(
      '#buddy-panel button[aria-label="Stopp"]'
    );
    expect(button).not.toBeNull();
    expect(document.querySelector('#buddy-panel button[aria-label="Senden"]')).toBeNull();

    fireEvent.click(button!);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('gives focus back to whatever opened it', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>
    );
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
    expect(document.activeElement).toBe(input());

    fireEvent.click(document.querySelector('#buddy-panel button[aria-label="Schließen"]')!);
    rerender(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>
    );
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

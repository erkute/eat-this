// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.markdown.test.tsx
// Inline-Markdown im Antworttext. Kursiv fehlte: Claude betont damit gern ein
// einzelnes Wort („eigentlich *die* Pizza-Referenz"), und die Sternchen
// standen roh in Remys Antwort.
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

const chat: { messages: BuddyDisplayMessage[]; isStreaming: boolean } = {
  messages: [],
  isStreaming: false,
};
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ ...chat, send: vi.fn(), stop: vi.fn(), setGeo: vi.fn() }),
}));

import BuddyWidget from './BuddyWidget';

afterEach(() => {
  cleanup();
  chat.messages = [];
});

describe('BuddyWidget inline markdown', () => {
  it('renders **bold** and *italic* instead of printing the markers', () => {
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: '**ZOLA** ist eigentlich *die* Referenz.' },
    ];
    render(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>
    );
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));

    const log = document.querySelector('#buddy-panel [class*="log"]')!;
    expect(log.querySelector('strong')?.textContent).toBe('ZOLA');
    expect(log.querySelector('em')?.textContent).toBe('die');
    expect(log.textContent).not.toContain('*');
  });
});

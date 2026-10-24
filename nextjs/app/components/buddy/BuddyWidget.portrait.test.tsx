// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';
import type { BuddyDisplayMessage } from './useBuddyChat';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}));
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({ location: null, loading: false, request: vi.fn() }),
}));
const { chat, handoff } = vi.hoisted(() => ({
  chat: { messages: [] as BuddyDisplayMessage[] },
  handoff: vi.fn((node: HTMLElement) => {
    node.dataset.motionRunning = 'true';
    return () => { delete node.dataset.motionRunning; };
  }),
}));
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ ...chat, send: vi.fn(), setGeo: vi.fn() }),
}));
vi.mock('@/lib/buddy/portraitMotion', () => ({ animatePortraitHandoff: handoff }));
import BuddyWidget from './BuddyWidget';

afterEach(() => {
  cleanup();
  chat.messages = [];
  handoff.mockClear();
});

describe('Remy portrait lifecycle', () => {
  it('keeps the handoff alive after Strict Mode reattaches the header ref and cleans it up on close', () => {
    const widget = (
      <StrictMode>
        <NextIntlClientProvider locale="de" messages={{}}><BuddyWidget /></NextIntlClientProvider>
      </StrictMode>
    );
    const { rerender } = render(widget);
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
    chat.messages = [{ role: 'user', content: 'Pizza?' }];
    // A fresh element makes the mocked chat state render again.
    rerender(
      <StrictMode>
        <NextIntlClientProvider locale="de" messages={{}}><BuddyWidget /></NextIntlClientProvider>
      </StrictMode>
    );
    const header = document.querySelector<HTMLElement>('[data-buddy-avatar="header"]')!;
    expect(header.dataset.motionRunning).toBe('true');
    expect(document.querySelectorAll('[data-buddy-avatar]')).toHaveLength(1);
    fireEvent.click(document.querySelector('[aria-label="Schließen"]')!);
    expect(header.dataset.motionRunning).toBeUndefined();
    expect(document.querySelector('[data-buddy-avatar]')).toBeNull();
  });
});

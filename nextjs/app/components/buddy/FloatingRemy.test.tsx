// @vitest-environment jsdom
// nextjs/app/components/buddy/FloatingRemy.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { BUDDY_ASK_EVENT, type BuddyAskDetail } from '@/lib/buddy/homeStage';
import FloatingRemy from './FloatingRemy';

// Mock next-intl's usePathname so the component renders on the home route.
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
}));

afterEach(() => {
  cleanup();
});

describe('FloatingRemy', () => {
  it('renders a button with an accessible name containing "Remy"', () => {
    const { getByRole } = render(<FloatingRemy />);
    const btn = getByRole('button', { name: /remy/i });
    expect(btn).toBeTruthy();
  });

  it('dispatches buddy:ask with no question when clicked', () => {
    let received: BuddyAskDetail | undefined;
    const handler = (e: Event) => {
      received = (e as CustomEvent<BuddyAskDetail>).detail;
    };
    window.addEventListener(BUDDY_ASK_EVENT, handler);

    const { getByRole } = render(<FloatingRemy />);
    fireEvent.click(getByRole('button', { name: /remy/i }));

    window.removeEventListener(BUDDY_ASK_EVENT, handler);
    // detail should be an object (possibly empty — no pre-canned question)
    expect(received).toBeDefined();
    expect(received?.question).toBeUndefined();
  });
});

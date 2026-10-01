// @vitest-environment jsdom
// nextjs/app/components/HubFragRemy.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT, type BuddyAskDetail } from '@/lib/buddy/homeStage';
import HubFragRemy from './HubFragRemy';

const messages = {
  hub: {
    fragRemy: {
      sub: 'Frag Remy direkt.',
      inputPlaceholder: '...oder frag Remy direkt',
      sendAria: 'Senden',
    },
  },
};

afterEach(() => {
  cleanup();
});

function renderSection() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <HubFragRemy />
    </NextIntlClientProvider>
  );
}

describe('HubFragRemy', () => {
  it('renders the homeV2 section header with hv-title', () => {
    renderSection();
    // The section should use homeV2 vocabulary classes
    const section = document.querySelector('#hub-fragremy');
    expect(section?.classList.contains('homeV2')).toBe(true);
    // hv-title must be present
    const title = document.querySelector('.hv-title');
    expect(title).not.toBeNull();
  });

  it('renders the time-of-day lead and the two quick answers', () => {
    renderSection();
    // Daypart lead + answers land after mount via useEffect.
    const lead = document.querySelector('[data-fragremy-lead]');
    expect((lead?.textContent ?? '').length).toBeGreaterThan(0);
    const chips = document.querySelectorAll('[data-fragremy-chips] button');
    expect(chips.length).toBe(2);
  });

  it('dispatches buddy:ask with the chip question on chip click', () => {
    let got: BuddyAskDetail | null = null;
    const onAsk = (e: Event) => {
      got = (e as CustomEvent<BuddyAskDetail>).detail;
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    renderSection();
    const chip = document.querySelector<HTMLButtonElement>('[data-fragremy-chips] button')!;
    fireEvent.click(chip);
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    expect(got).toEqual({ question: chip.textContent });
  });

  it('dispatches buddy:ask when the free-text form is submitted', () => {
    let got: BuddyAskDetail | null = null;
    const onAsk = (e: Event) => {
      got = (e as CustomEvent<BuddyAskDetail>).detail;
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    renderSection();
    const input = document.querySelector<HTMLInputElement>('[data-fragremy-input]')!;
    const form = document.querySelector<HTMLFormElement>('[data-fragremy-form]')!;
    fireEvent.change(input, { target: { value: 'Gute Ramen' } });
    fireEvent.submit(form);
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    expect(got).toEqual({ question: 'Gute Ramen' });
  });

  it('gibt HubMotion die Haken für den Auftritt: Fragezeichen, „Frag Remy.", Remy', () => {
    renderSection();
    // Seit 01.10.2026 die zweite Frage der Tafel, unter „Worauf hast du
    // Lust?" (CategoriesRail) — daher h3.
    const title = document.querySelector('h3')!;
    expect(title.textContent).toBe('Keine Idee?Frag Remy.');
    expect(document.querySelector('[data-fragremy-q]')!.textContent).toBe('?');
    expect(document.querySelector('[data-fragremy-ask]')!.textContent).toBe('Frag Remy.');
    expect(document.querySelector('[data-fragremy-avatar]')).not.toBeNull();
  });
});

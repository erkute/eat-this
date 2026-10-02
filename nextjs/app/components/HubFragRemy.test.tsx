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
      sub: 'Ich kenne die besten Spots in Berlin.',
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

  it('fragt „Worauf hast du Lust?" und zeigt darüber Remys Satz zur Tageszeit', () => {
    renderSection();
    expect(document.querySelector('h2')!.textContent).toBe('Worauf hast du Lust?');
    // Der Satz zur Tageszeit kommt nach dem Mount (useEffect); den Textknoten
    // schreibt HubMotion später um.
    const line = document.querySelector('[data-fragremy-line]')!;
    expect(line.textContent!.length).toBeGreaterThan(0);
    expect(line.firstChild!.nodeType).toBe(Node.TEXT_NODE);
    expect(line.childNodes.length).toBe(1);
  });

  it('nimmt die Kategorien als Antworten auf (`choices`)', () => {
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <HubFragRemy choices={<ul data-hub-categories="" />} />
      </NextIntlClientProvider>
    );
    expect(document.querySelector('[data-hub-fragremy] [data-hub-categories]')).not.toBeNull();
  });

  it('dispatches buddy:ask when the free-text form is submitted', () => {
    let got: BuddyAskDetail | null = null;
    const onAsk = (e: Event) => {
      got = (e as CustomEvent<BuddyAskDetail>).detail;
    };
    window.addEventListener(BUDDY_ASK_EVENT, onAsk);
    renderSection();
    const input = document.querySelector<HTMLInputElement>('[data-fragremy-input]')!;
    const form = input.closest('form')!;
    fireEvent.change(input, { target: { value: 'Gute Ramen' } });
    fireEvent.submit(form);
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    expect(got).toEqual({ question: 'Gute Ramen' });
  });

  it('gibt HubMotion die Haken: Frage, Satz, Feld, Remy und sein Platz', () => {
    renderSection();
    expect(document.querySelector('[data-fragremy-title]')!.tagName).toBe('H2');
    expect(document.querySelector('[data-fragremy-say] [data-fragremy-line]')).not.toBeNull();
    // Was er sagt, wenn man ins Feld tippt.
    expect(
      document.querySelector('[data-fragremy-input]')!.getAttribute('data-remy-line')
    ).toBeTruthy();
    expect(document.querySelector('[data-fragremy-avatar]')).not.toBeNull();
    expect(document.querySelector('[data-fragremy-spot]')).not.toBeNull();
  });

  it('zeigt Remy als drei Gesichter: neutral, Mund offen, Lachen', () => {
    renderSection();
    const avatar = document.querySelector('[data-fragremy-avatar]')!;
    expect(Array.from(avatar.querySelectorAll('img'), (img) => img.getAttribute('alt'))).toEqual([
      'Remy',
      '',
      '',
    ]);
  });
});

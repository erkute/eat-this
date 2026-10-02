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
      <HubFragRemy categoryNames={{ pizza: 'Pizza', lunch: 'Lunch' }} />
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
    // Zu sehen ist zuerst der Satz zur Tageszeit (nach dem Mount, useEffect).
    const shown = document.querySelectorAll('[data-remy-say][data-on]');
    expect(shown.length).toBe(1);
    expect(shown[0].getAttribute('data-remy-say')).toBe('lead');
    expect(shown[0].textContent!.length).toBeGreaterThan(0);
  });

  /* Alle Sätze liegen schon in der Box: so hoch wie der längste, damit beim
     Wechsel nichts darunter springt. HubMotion zeigt sie per `data-on`. */
  it('legt zu jeder Kategorie Remys Satz in die Box, dazu den Satz fürs Feld', () => {
    renderSection();
    const keys = Array.from(
      document.querySelectorAll('[data-fragremy-say] [data-remy-say]'),
      (el) => el.getAttribute('data-remy-say')
    );
    expect(keys).toEqual(['lead', 'pizza', 'lunch', 'listen']);
    expect(document.querySelector('[data-remy-say="pizza"]')!.textContent).toBe(
      'Pizza? Ich kenn die Öfen, die es wirklich können.'
    );
    // Im Kicker steht nur „Remy", und er rollt nicht mit.
    expect(document.querySelector('[data-fragremy-say] > span')!.textContent).toBe('Remy');
    expect(document.querySelector('[data-remy-say="listen"]')!.textContent).toContain('Schieß los');
  });

  it('stellt die Kategorien als Antworten darunter, jede mit ihrem Slug', () => {
    renderSection();
    const links = document.querySelectorAll('[data-hub-categories] a[data-slug]');
    expect(Array.from(links, (a) => a.getAttribute('data-slug'))).toEqual(['pizza', 'lunch']);
  });

  it('bietet unter den Kategorien zwei Fragen zur Tageszeit an, wie auf main', () => {
    renderSection();
    const chips = document.querySelectorAll('[data-fragremy-chips] button');
    expect(chips.length).toBe(2);
    // Unter den Kategorien, über dem Feld.
    const cats = document.querySelector('[data-hub-categories]')!;
    const input = document.querySelector('[data-fragremy-input]')!;
    expect(cats.compareDocumentPosition(chips[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chips[1].compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    const form = input.closest('form')!;
    fireEvent.change(input, { target: { value: 'Gute Ramen' } });
    fireEvent.submit(form);
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk);
    expect(got).toEqual({ question: 'Gute Ramen' });
  });

  it('gibt HubMotion die Haken: Frage, Sätze, Feld, Remy und sein Platz', () => {
    renderSection();
    expect(document.querySelector('[data-fragremy-title]')!.tagName).toBe('H2');
    expect(document.querySelector('[data-fragremy-say]')).not.toBeNull();
    expect(document.querySelector('[data-fragremy-input]')).not.toBeNull();
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

// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.mood.test.tsx
// Expression policy: idle while streaming with no answer text yet; the mouth
// flap starts only once text is actually appearing.
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
  Link: ({
    children,
    href,
    prefetch,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
  }) => {
    void prefetch;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const chat: { messages: BuddyDisplayMessage[]; isStreaming: boolean } = {
  messages: [],
  isStreaming: false,
};
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ ...chat, send: vi.fn(), setGeo: vi.fn() }),
}));

import BuddyWidget from './BuddyWidget';

afterEach(cleanup);

function renderOpenWidget() {
  const utils = render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>
  );
  fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));
  return utils;
}

const panelMood = () =>
  document.querySelector('#buddy-panel [data-mood]')?.getAttribute('data-mood');

describe('BuddyWidget expression policy', () => {
  it('stays idle while streaming with no answer text yet', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: '' },
    ];
    chat.isStreaming = true;
    renderOpenWidget();
    expect(panelMood()).toBe('idle');
    expect(document.body.textContent).toContain('Remy denkt nach …');
    expect(document.body.textContent).not.toContain('Antwort wird geladen');
  });

  it('talks once answer text is appearing', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: 'Da hab ich was für dich:' },
    ];
    chat.isStreaming = true;
    renderOpenWidget();
    expect(panelMood()).toBe('talking');
  });

  it('idles when nothing is streaming', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: 'Da hab ich was für dich:' },
    ];
    chat.isStreaming = false;
    renderOpenWidget();
    expect(panelMood()).toBe('idle');
  });

  it('renders an inline spot card as facts only — the surface is the link', () => {
    chat.messages = [
      { role: 'user', content: 'Bars, die offen haben' },
      {
        role: 'assistant',
        content: 'Nimm den hier:\n[[spot:beast-berlin]]',
        spots: [
          {
            _id: 'restaurant-beast',
            name: 'Beast Berlin',
            slug: 'beast-berlin',
            cuisineType: 'Bar',
            bezirk: 'Mitte',
            shortDescription: 'Steakhauskultur im Pressecafé.',
            tip: null,
            priceRange: '30-80 €',
            mapsUrl: null,
            image: '/pics/test/beast.webp',
            openNow: true,
            openLabel: 'Offen · bis 01:00',
            distanceLabel: null,
          },
        ],
      },
    ];
    chat.isStreaming = false;
    renderOpenWidget();

    // Die Fläche selbst ist der Weg zur Map — kein Verb-Balken pro Karte.
    const link = document.querySelector('a[href="/map?r=beast-berlin"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('aria-label')).toBe('Beast Berlin auf der Map');
    expect(document.body.textContent).not.toContain('Auf der Map ansehen');

    // Fakten ja, Beschreibung nein: Remys Absatz steht direkt darüber und
    // formuliert genau dieses Feld aus.
    expect(document.body.textContent).toContain('Bar · Mitte · 30-80 €');
    expect(document.body.textContent).toContain('Offen · bis 01:00');
    expect(document.body.textContent).not.toContain('Steakhauskultur im Pressecafé.');

    // Das Herz bleibt ein eigener Knopf, blank auf dem Foto wie im Detail.
    const save = document.querySelector('button[aria-label="Spot herzen"]');
    expect(save).not.toBeNull();
    expect(save?.textContent).toBe('');
    expect(save?.querySelector('svg')).not.toBeNull();
  });

  it('keeps the description on the fallback block, where no prose introduces the spots', () => {
    chat.messages = [
      { role: 'user', content: 'Bars, die offen haben' },
      {
        role: 'assistant',
        // kein [[spot:…]]-Marker → Sammelausgabe am Ende
        content: 'Schau mal.',
        spots: [
          {
            _id: 'restaurant-beast',
            name: 'Beast Berlin',
            slug: 'beast-berlin',
            cuisineType: 'Bar',
            bezirk: 'Mitte',
            shortDescription: 'Steakhauskultur im Pressecafé.',
            tip: null,
            priceRange: '30-80 €',
            mapsUrl: null,
            image: null,
            openNow: true,
            openLabel: 'Offen · bis 01:00',
            distanceLabel: null,
          },
        ],
      },
    ];
    chat.isStreaming = false;
    renderOpenWidget();

    expect(document.body.textContent).toContain('Steakhauskultur im Pressecafé.');
  });

  it('leaves the page’s own spot out of the fallback block', () => {
    // Auf ZOLAs Seite setzt Remy — der Regel folgend — keinen Marker für ZOLA.
    // Die Sammelausgabe legte darunter trotzdem eine ZOLA-Karte: der Weg zu
    // der Seite, auf der der Nutzer schon steht.
    chat.messages = [
      { role: 'user', content: 'Was bestell ich hier am besten?' },
      {
        role: 'assistant',
        content: 'Fang mit der Margherita an.',
        spots: [
          {
            _id: 'restaurant-zola',
            name: 'ZOLA',
            slug: 'zola',
            cuisineType: 'Italienisch',
            bezirk: 'Kreuzberg',
            shortDescription: 'Erste Berliner Pizzeria mit Stefano-Ferrara-Holzofen.',
            tip: null,
            priceRange: '10–20 €',
            mapsUrl: null,
            image: null,
            openNow: false,
            openLabel: 'Geschlossen',
            distanceLabel: null,
          },
        ],
      },
    ];
    chat.isStreaming = false;
    render(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget pageSlug="zola" />
      </NextIntlClientProvider>
    );
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }));

    expect(document.querySelector('a[href="/map?r=zola"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Stefano-Ferrara-Holzofen');
  });

  it('offers sharper Sanity image candidates for spot cards', () => {
    chat.messages = [
      {
        role: 'assistant',
        content: 'Der passt:\n[[spot:test-spot]]',
        spots: [
          {
            _id: 'restaurant-test',
            name: 'Test Spot',
            slug: 'test-spot',
            cuisineType: 'Café',
            bezirk: 'Neukölln',
            shortDescription: null,
            tip: null,
            priceRange: null,
            mapsUrl: null,
            image:
              'https://cdn.sanity.io/images/project/dataset/test.jpg?w=120&h=120&fit=crop&auto=format&q=80',
            openNow: null,
            openLabel: null,
            distanceLabel: null,
          },
        ],
      },
    ];
    chat.isStreaming = false;
    renderOpenWidget();

    const img = document.querySelector('img[src*="cdn.sanity.io"]');
    expect(img?.getAttribute('srcset')).toContain('w=800');
    expect(img?.getAttribute('sizes')).toContain('360px');
  });
});

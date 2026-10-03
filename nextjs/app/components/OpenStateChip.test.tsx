// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import OpenStateChip from './OpenStateChip';

const hours = [{ days: 'daily', hours: '00:00-23:59' }];

describe('OpenStateChip', () => {
  it('sagt bei isClosed „Vorübergehend geschlossen“, schon im Server-HTML', () => {
    const html = renderToString(
      <OpenStateChip openingHours={hours} locale="de" temporarilyClosed />
    );
    expect(html).toContain('Vorübergehend geschlossen');
    expect(html).not.toContain('Geöffnet');
  });

  it('spricht auf /en Englisch', () => {
    render(<OpenStateChip openingHours={[]} locale="en" temporarilyClosed />);
    expect(screen.getByText('Temporarily closed')).toBeTruthy();
  });

  it('zeigt ohne isClosed weiter den Live-Zustand', async () => {
    // Feste Uhrzeit: mit der echten Uhr fiel der Test in der Minute 23:59
    // (Berlin) durch — „00:00-23:59" ist dann geschlossen (CI 02.10.2026).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T10:00:00Z'));
    try {
      render(<OpenStateChip openingHours={hours} locale="de" />);
      expect((await screen.findByText(/Geöffnet/)).textContent).toContain('Geöffnet');
      expect(screen.queryByText('Vorübergehend geschlossen')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import ShareButton from './ShareButton';
import { trackEvent } from '@/lib/analytics';
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
const mount = () => render(<NextIntlClientProvider locale="de" messages={{}}><ShareButton title="Spot" slug="spot" contentType="restaurant" label="Teilen" copiedLabel="Link kopiert" url="https://www.eatthisdot.com/restaurant/spot" /></NextIntlClientProvider>);
describe('share feedback', () => {
  it('does not announce success or track a rejected write and offers the URL', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new DOMException('denied','NotAllowedError')) } });
    mount(); fireEvent.click(screen.getByText('Teilen'));
    await screen.findByRole('alert');
    expect(screen.queryByText('Link kopiert')).toBeNull();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toContain('/restaurant/spot');
    expect(trackEvent).not.toHaveBeenCalled();
  });
  it('announces and tracks a completed clipboard write', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    mount(); fireEvent.click(screen.getByText('Teilen'));
    await screen.findByText('Link kopiert');
    expect(trackEvent).toHaveBeenCalledWith('share', expect.objectContaining({ method: 'copy_link' }));
  });
  it('rejects a false legacy copy result and removes its temporary input', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn().mockReturnValue(false) });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mount(); fireEvent.click(screen.getByText('Teilen'));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull());
    expect(document.querySelector('textarea')).toBeNull();
    expect(trackEvent).not.toHaveBeenCalled();
  });
  it('treats native cancellation as cancellation, without copying or reporting an error', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    mount(); fireEvent.click(screen.getByText('Teilen'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(trackEvent).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

});

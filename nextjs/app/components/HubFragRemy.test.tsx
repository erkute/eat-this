// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage';
import HubFragRemy from './HubFragRemy';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = (locale = 'de') => render(<NextIntlClientProvider locale={locale} messages={{}}><HubFragRemy /></NextIntlClientProvider>);

describe('HubFragRemy', () => {
  it('offers three questions without categories or rotating copy', () => {
    show();
    expect(screen.getByRole('heading').textContent).toBe('Worauf hast du Lust?');
    expect(document.querySelectorAll('[data-fragremy-chips] button')).toHaveLength(3);
    expect(document.querySelector('[data-hub-categories]')).toBeNull();
    expect(document.querySelector('[data-remy-say]')).toBeNull();
  });
  it('uses a different expression for each question and resets on blur', () => {
    show();
    const buttons = document.querySelectorAll('[data-fragremy-chips] button');
    const figure = document.querySelector('[data-expression]')!;
    ['open', 'neutral', 'laugh'].forEach((expression, index) => {
      fireEvent.focus(buttons[index]);
      expect(figure.getAttribute('data-expression')).toBe(expression);
      fireEvent.blur(buttons[index]);
      expect(figure.getAttribute('data-expression')).toBe('neutral');
    });
  });
  it('opens the selected question immediately with reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }));
    const ask = vi.fn();
    window.addEventListener(BUDDY_ASK_EVENT, ask);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Überrasch mich.' }));
    expect(ask).toHaveBeenCalledOnce();
    expect(ask.mock.calls[0][0].detail).toEqual({ question: 'Überrasch mich.' });
    window.removeEventListener(BUDDY_ASK_EVENT, ask);
  });
  it('sends trimmed free text and clears the input', () => {
    const ask = vi.fn();
    window.addEventListener(BUDDY_ASK_EVENT, ask);
    show();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Gute Ramen  ' } });
    fireEvent.submit(screen.getByRole('form'));
    expect(ask.mock.calls[0][0].detail).toEqual({ question: 'Gute Ramen' });
    expect(input.value).toBe('');
    window.removeEventListener(BUDDY_ASK_EVENT, ask);
  });
  it('does not submit an empty question', () => {
    const ask = vi.fn();
    window.addEventListener(BUDDY_ASK_EVENT, ask);
    show();
    fireEvent.submit(screen.getByRole('form'));
    expect(ask).not.toHaveBeenCalled();
    window.removeEventListener(BUDDY_ASK_EVENT, ask);
  });
  it('offers English questions and an accessible input', () => {
    show('en');
    expect(screen.getByRole('button', { name: 'Surprise me.' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Your question for Remy' })).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AuthSurfaceLoading from './AuthSurfaceLoading';
import { finishEmailLink } from '@/lib/auth/emailLinkPending';

vi.mock('next-intl', () => ({ useLocale: () => 'de' }));

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-email-link');
});

it('keeps focus in the email confirmation until it releases the tour', async () => {
  document.documentElement.setAttribute('data-email-link', '');
  const email = render(<AuthSurfaceLoading layer="email" />);
  const emailDialog = screen.getByRole('dialog');
  expect(document.activeElement).toBe(emailDialog);

  render(<AuthSurfaceLoading layer="tour" />);
  expect(document.activeElement).toBe(emailDialog);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);

  email.unmount();
  await act(async () => finishEmailLink());
  expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Dein Einstieg in Eat This' }));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
});

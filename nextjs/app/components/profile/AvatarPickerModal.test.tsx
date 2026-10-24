// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import AvatarPickerModal from './AvatarPickerModal';
afterEach(cleanup);
it('supports keyboard selection and keeps the picker open after a failed save', async () => {
  const apply = vi.fn().mockRejectedValue(new Error('offline'));
  const close = vi.fn();
  render(<AvatarPickerModal current={1} onApply={apply} onClose={close} />);
  const first = screen.getByRole('radio', { name: 'avatarChoice1' });
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  const second = screen.getByRole('radio', { name: 'avatarChoice2' });
  expect(second.getAttribute('aria-checked')).toBe('true');
  expect(document.activeElement).toBe(second);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'avatarApply' })));
  expect(apply).toHaveBeenCalledWith(2);
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toBe('avatarError');
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProfileAccount from './ProfileAccount';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
afterEach(cleanup);
it('saves a trimmed name and preserves edits after a failed save for retry', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  render(
    <ProfileAccount
      name="Alex"
      email="alex@example.test"
      onSaveName={save}
      onPickAvatar={() => {}}
      onSignOut={() => {}}
    />
  );
  const input = screen.getByLabelText('fieldName');
  fireEvent.change(input, { target: { value: '  Robin  ' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'nameSave' })));
  expect(save).toHaveBeenCalledWith('Robin');
  expect(screen.getByRole('alert').textContent).toBe('nameError');
  expect((input as HTMLInputElement).value).toBe('  Robin  ');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'nameSave' })));
  expect(screen.getByRole('status').textContent).toBe('nameSaved');
  expect((input as HTMLInputElement).value).toBe('Robin');
  expect((screen.getByRole('button', { name: 'nameSave' }) as HTMLButtonElement).disabled).toBe(
    true
  );
});

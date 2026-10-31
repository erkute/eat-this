// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProfileAccount from './ProfileAccount';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values?.date ? `${key} ${values.date}` : key,
  useLocale: () => 'de',
}));
afterEach(cleanup);
function renderAccount(
  onSaveName: (name: string) => Promise<void>,
  name = 'Alex',
  memberSince: string | null = null
) {
  return render(
    <ProfileAccount
      name={name}
      email="alex@example.test"
      memberSince={memberSince}
      avatarIdx={3}
      onSaveName={onSaveName}
      onPickAvatar={() => {}}
      onSignOut={async () => {}}
    />
  );
}

describe('Dabei seit', () => {
  it('nennt Monat und Jahr der Anmeldung, und nichts ohne Datum', () => {
    renderAccount(vi.fn(), 'Alex', '2026-10-05T10:00:00Z');
    expect(screen.getByText(/^accountSince .*2026$/)).toBeTruthy();
    cleanup();
    renderAccount(vi.fn(), 'Alex', null);
    expect(screen.queryByText(/accountSince/)).toBeNull();
  });
});

describe('name autosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('has no save button and saves the trimmed name by itself after a pause', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderAccount(save);
    expect(screen.queryByRole('button', { name: 'nameSave' })).toBeNull();

    fireEvent.change(screen.getByLabelText('fieldName'), { target: { value: '  Robin  ' } });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('Robin');
    expect(screen.getByRole('status').textContent).toBe('nameSaved');
    expect(screen.getByRole('heading', { level: 2, name: 'Robin' })).toBeTruthy();
  });

  it('saves right away when the field is left or Enter is pressed', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderAccount(save);
    const input = screen.getByLabelText('fieldName');

    fireEvent.change(input, { target: { value: 'Robin' } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(save).toHaveBeenCalledWith('Robin');

    fireEvent.change(input, { target: { value: 'Robin B' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(save).toHaveBeenLastCalledWith('Robin B');
  });

  it('keeps the edit after a failed save and tries again when the field is left', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    renderAccount(save);
    const input = screen.getByLabelText('fieldName') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Robin' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(screen.getByRole('alert').textContent).toBe('nameError');
    expect(input.value).toBe('Robin');

    // Kein Wiederholen im Takt: erst das Verlassen des Feldes versucht es neu.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.blur(input);
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('nameSaved');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('never saves an unchanged or empty name, and puts the old name back when empty', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderAccount(save);
    const input = screen.getByLabelText('fieldName') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Alex' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    fireEvent.change(input, { target: { value: '   ' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      fireEvent.blur(input);
    });

    expect(save).not.toHaveBeenCalled();
    expect(input.value).toBe('Alex');
  });
});

it('zeigt den Charakter frei mit dem Namen als Überschrift und wechselt ihn per Tipp', () => {
  const onPickAvatar = vi.fn();
  render(
    <ProfileAccount
      name="Alex"
      email="alex@example.test"
      avatarIdx={3}
      onSaveName={async () => {}}
      onPickAvatar={onPickAvatar}
      onSignOut={async () => {}}
    />
  );
  expect(screen.getAllByRole('button', { name: 'changeAvatar' })).toHaveLength(2);
  const imgs = document.querySelectorAll('img[src^="/pics/avatar/3.webp"]');
  expect(imgs).toHaveLength(1);
  // Der Name ist die Überschrift neben der Figur, nicht „Du".
  expect(screen.getByRole('heading', { level: 2, name: 'Alex' })).toBeTruthy();
  fireEvent.click(imgs[0].closest('button')!);
  expect(onPickAvatar).toHaveBeenCalledTimes(1);
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterEmailLink, finishEmailLink } from './emailLinkPending';

afterEach(() => document.documentElement.removeAttribute('data-email-link'));

describe('afterEmailLink', () => {
  it('laeuft sofort, wenn kein Mail-Link wartet', () => {
    const run = vi.fn();
    afterEmailLink(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('wartet, bis die Bestaetigung zugeht', async () => {
    document.documentElement.setAttribute('data-email-link', '');
    const run = vi.fn();
    afterEmailLink(run);
    expect(run).not.toHaveBeenCalled();
    finishEmailLink();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('laesst sich abbrechen', async () => {
    document.documentElement.setAttribute('data-email-link', '');
    const run = vi.fn();
    afterEmailLink(run)();
    finishEmailLink();
    await Promise.resolve();
    expect(run).not.toHaveBeenCalled();
  });
});

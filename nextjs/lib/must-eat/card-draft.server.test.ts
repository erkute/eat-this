import { describe, expect, it, vi } from 'vitest';
import type { SanityClient } from '@sanity/client';
import { attachMustEatCardVersion, type MustEatDraft } from './card-draft.server';

describe('private card publication boundary', () => {
  const published: MustEatDraft = { _id: 'm1', _type: 'mustEat', _rev: 'published', restaurantRef: { _ref: 'r1' } };
  function client(draft = { ...published, _id: 'drafts.m1', _rev: 'draft-revision' }) {
    const patch = { ifRevisionId: vi.fn(() => patch), set: vi.fn(() => patch), commit: vi.fn() };
    const sanity = { createIfNotExists: vi.fn(async () => draft), patch: vi.fn(() => patch) };
    return { sanity: sanity as unknown as SanityClient, mocks: sanity, patch };
  }

  it('changes only the draft, with a revision condition, until the editor publishes', async () => {
    const { sanity, mocks, patch } = client();
    await attachMustEatCardVersion(sanity, published, 'a'.repeat(64));
    expect(mocks.createIfNotExists).toHaveBeenCalledWith({ _id: 'drafts.m1', _type: 'mustEat', restaurantRef: { _ref: 'r1' } });
    expect(mocks.patch).toHaveBeenCalledExactlyOnceWith('drafts.m1');
    expect(patch.ifRevisionId).toHaveBeenCalledWith('draft-revision');
    expect(patch.set).toHaveBeenCalledWith({ cardVersion: 'a'.repeat(64) });
  });

  it('does not attach a card when another editor changes the restaurant', async () => {
    const { sanity, patch } = client({ ...published, _id: 'drafts.m1', _rev: 'concurrent', restaurantRef: { _ref: 'r2' } });
    await expect(attachMustEatCardVersion(sanity, published, 'a'.repeat(64))).rejects.toMatchObject({ statusCode: 409 });
    expect(patch.commit).not.toHaveBeenCalled();
  });
});

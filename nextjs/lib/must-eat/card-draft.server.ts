import type { SanityClient } from '@sanity/client';

export interface MustEatDraft {
  _id: string;
  _type: 'mustEat';
  _rev: string;
  cardVersion?: string;
  restaurantRef?: { _ref: string };
  [field: string]: unknown;
}

/** Publish selects content and restaurant together in one Sanity revision. */
export async function attachMustEatCardVersion(
  sanity: SanityClient,
  selected: MustEatDraft,
  version: string
): Promise<void> {
  const id = selected._id.replace(/^drafts\./, '');
  let draft = selected;
  if (!selected._id.startsWith('drafts.')) {
    const seed = Object.fromEntries(
      Object.entries(selected).filter(
        ([key]) => !['_id', '_rev', '_createdAt', '_updatedAt'].includes(key)
      )
    );
    draft = (await sanity.createIfNotExists({
      ...seed,
      _id: `drafts.${id}`,
      _type: 'mustEat',
    })) as MustEatDraft;
    // A draft created by another editor must be reviewed before saving over it.
    if (
      draft.cardVersion !== selected.cardVersion ||
      draft.restaurantRef?._ref !== selected.restaurantRef?._ref
    ) {
      throw Object.assign(new Error('Must-Eat draft changed'), { statusCode: 409 });
    }
  }
  await sanity.patch(draft._id).ifRevisionId(draft._rev).set({ cardVersion: version }).commit();
}

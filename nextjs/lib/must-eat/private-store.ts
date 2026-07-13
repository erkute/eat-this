import 'server-only'

import { getAdminFirestore } from '@/lib/firebase/admin'
import type { MapMustEat } from '@/lib/types'

export const PRIVATE_MUST_EATS_COLLECTION = 'privateMustEats'
export const PRIVATE_MUST_EAT_OBJECT_PREFIX = 'premium/must-eats/'

export interface PrivateMustEatContent {
  dish: string
  description: string
  descriptionEn: string
  price: string
  imageObjectPath: string
  imageContentType: string
  restaurantId: string
  schemaVersion: 1
}

export class PrivateMustEatContentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrivateMustEatContentError'
  }
}

function requiredString(
  data: FirebaseFirestore.DocumentData,
  key: keyof Omit<PrivateMustEatContent, 'schemaVersion'>,
  documentId: string,
): string {
  const value = data[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new PrivateMustEatContentError(
      `Private Must-Eat ${documentId} has no valid ${key}`,
    )
  }
  return value
}

function stringValue(
  data: FirebaseFirestore.DocumentData,
  key: keyof Omit<PrivateMustEatContent, 'schemaVersion'>,
  documentId: string,
): string {
  const value = data[key]
  if (typeof value !== 'string') {
    throw new PrivateMustEatContentError(
      `Private Must-Eat ${documentId} has no valid ${key}`,
    )
  }
  return value
}

function parsePrivateMustEat(
  documentId: string,
  data: FirebaseFirestore.DocumentData | undefined,
): PrivateMustEatContent {
  if (!data) {
    throw new PrivateMustEatContentError(`Private Must-Eat ${documentId} is missing`)
  }
  if (data.schemaVersion !== 1) {
    throw new PrivateMustEatContentError(
      `Private Must-Eat ${documentId} has an unsupported schemaVersion`,
    )
  }

  const imageObjectPath = requiredString(data, 'imageObjectPath', documentId)
  if (
    !imageObjectPath.startsWith(PRIVATE_MUST_EAT_OBJECT_PREFIX) ||
    imageObjectPath.includes('..')
  ) {
    throw new PrivateMustEatContentError(
      `Private Must-Eat ${documentId} has an invalid imageObjectPath`,
    )
  }

  return {
    dish: requiredString(data, 'dish', documentId),
    description: requiredString(data, 'description', documentId),
    descriptionEn: requiredString(data, 'descriptionEn', documentId),
    price: stringValue(data, 'price', documentId),
    imageObjectPath,
    imageContentType: requiredString(data, 'imageContentType', documentId),
    restaurantId: requiredString(data, 'restaurantId', documentId),
    schemaVersion: 1,
  }
}

function documentRef(id: string) {
  return getAdminFirestore().collection(PRIVATE_MUST_EATS_COLLECTION).doc(id)
}

export async function getPrivateMustEatContent(
  id: string,
): Promise<PrivateMustEatContent> {
  const snapshot = await documentRef(id).get()
  return parsePrivateMustEat(id, snapshot.data())
}

/**
 * Adds premium fields only for IDs already authorized by the caller. Sanity
 * contributes metadata (ID, order, public reveal flag, restaurant relation)
 * but never the paid text or image reference.
 */
export async function hydrateAuthorizedMustEats(
  mustEats: MapMustEat[],
  authorizedIds: ReadonlySet<string>,
): Promise<MapMustEat[]> {
  const authorized = mustEats.filter((mustEat) => authorizedIds.has(mustEat._id))
  if (authorized.length === 0) return mustEats

  const snapshots = await getAdminFirestore().getAll(
    ...authorized.map((mustEat) => documentRef(mustEat._id)),
  )
  const contentById = new Map(
    snapshots.map((snapshot) => [
      snapshot.id,
      parsePrivateMustEat(snapshot.id, snapshot.data()),
    ]),
  )

  return mustEats.map((mustEat) => {
    if (!authorizedIds.has(mustEat._id)) return mustEat
    const content = contentById.get(mustEat._id)
    if (!content) {
      throw new PrivateMustEatContentError(`Private Must-Eat ${mustEat._id} is missing`)
    }
    if (content.restaurantId !== mustEat.restaurant._id) {
      throw new PrivateMustEatContentError(
        `Private Must-Eat ${mustEat._id} points at the wrong restaurant`,
      )
    }

    return {
      ...mustEat,
      dish: content.dish,
      description: content.description,
      descriptionEn: content.descriptionEn,
      price: content.price,
      image: `/api/must-eat-image/${encodeURIComponent(mustEat._id)}`,
    }
  })
}

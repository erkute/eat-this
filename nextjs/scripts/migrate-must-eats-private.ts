/**
 * Two-phase Premium Must-Eat migration.
 *
 *   npx tsx scripts/migrate-must-eats-private.ts backfill --dry-run ...
 *   npx tsx scripts/migrate-must-eats-private.ts backfill --apply ...
 *   npx tsx scripts/migrate-must-eats-private.ts export-metadata ...
 *   npx tsx scripts/migrate-must-eats-private.ts purge --apply \
 *     --confirm-source <project>/<dataset> --manifest <ignored-json>
 *   npx tsx scripts/migrate-must-eats-private.ts verify --manifest <ignored-json>
 *
 * The manifest contains document IDs, hashes and legacy public asset URLs but
 * never premium prose or credentials. It belongs under .private/ (gitignored).
 * No command prints premium values or secret values.
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import crypto from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const API_VERSION = '2024-01-01'
const COLLECTION = 'privateMustEats'
const OBJECT_PREFIX = 'premium/must-eats/'
const PREMIUM_FIELDS = ['dish', 'description', 'descriptionEn', 'price', 'image', 'district']

interface SourceMustEat {
  _id: string
  dish?: string
  description?: string
  descriptionEn?: string
  price?: string
  restaurantId?: string
  image?: {
    id?: string
    url?: string
    contentType?: string
  }
}

interface PublicMustEatMetadata {
  _id: string
  restaurantRef?: {
    _ref?: string
  }
  order?: number
  revealedForAnon?: boolean
}

interface ManifestEntry {
  id: string
  restaurantId: string
  legacyAssetId: string
  legacyAssetUrl: string
  privateObjectPath: string
  imageSha256: string
  recordSha256: string
}

interface MigrationManifest {
  version: 1
  createdAt: string
  sourceSanityProject: string
  sourceSanityDataset: string
  publicSanityProject: string
  publicSanityDataset: string
  targetFirebaseProject: string
  targetStorageBucket: string
  entries: ManifestEntry[]
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

function requiredArg(name: string): string {
  const value = arg(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function safeId(id: string): boolean {
  return /^[A-Za-z0-9._-]{1,128}$/.test(id) && !id.startsWith('drafts.')
}

function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function privateRecord(input: {
  document: SourceMustEat
  imageObjectPath: string
  imageSha256: string
}) {
  return {
    schemaVersion: 1,
    dish: input.document.dish,
    description: input.document.description,
    descriptionEn: input.document.descriptionEn,
    price: input.document.price,
    restaurantId: input.document.restaurantId,
    imageObjectPath: input.imageObjectPath,
    imageContentType: 'image/webp',
    imageSha256: input.imageSha256,
  }
}

function storedRecordSha256(data: FirebaseFirestore.DocumentData): string {
  return sha256(JSON.stringify({
    schemaVersion: data.schemaVersion,
    dish: data.dish,
    description: data.description,
    descriptionEn: data.descriptionEn,
    price: data.price,
    restaurantId: data.restaurantId,
    imageObjectPath: data.imageObjectPath,
    imageContentType: data.imageContentType,
    imageSha256: data.imageSha256,
  }))
}

function requireString(value: string | undefined, field: string, id: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Must-Eat ${id} has no valid ${field}`)
  }
  return value
}

function requireStringValue(value: string | undefined, field: string, id: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Must-Eat ${id} has no valid ${field}`)
  }
  return value
}

function sourceClient(projectId: string, dataset: string, token?: string) {
  return createClient({
    projectId,
    dataset,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: token ? 'raw' : 'published',
    ...(token ? { token } : {}),
  })
}

async function fetchPublishedMustEats(projectId: string, dataset: string) {
  const client = sourceClient(projectId, dataset)
  return client.fetch<SourceMustEat[]>(`*[
    _type == "mustEat" && !(_id in path("drafts.**"))
  ] | order(_id asc) {
    _id,
    dish,
    description,
    descriptionEn,
    price,
    "restaurantId": restaurantRef._ref,
    "image": {
      "id": image.asset._ref,
      "url": image.asset->url,
      "contentType": image.asset->mimeType
    }
  }`)
}

async function exportMetadata(): Promise<void> {
  const sourceProject = requiredArg('--source-project')
  const sourceDataset = requiredArg('--source-dataset')
  const output = requiredArg('--output')
  const documents = await sourceClient(sourceProject, sourceDataset).fetch<PublicMustEatMetadata[]>(`
    *[_type == "mustEat" && !(_id in path("drafts.**"))] | order(_id asc) {
      _id,
      restaurantRef,
      order,
      revealedForAnon
    }
  `)

  const sanitized = documents.map((document) => {
    if (!safeId(document._id) || !safeId(document.restaurantRef?._ref ?? '')) {
      throw new Error('Unsafe Must-Eat metadata reference')
    }
    return {
      _id: document._id,
      _type: 'mustEat',
      restaurantRef: {
        _type: 'reference',
        _ref: document.restaurantRef!._ref!,
      },
      ...(typeof document.order === 'number' ? { order: document.order } : {}),
      ...(typeof document.revealedForAnon === 'boolean'
        ? { revealedForAnon: document.revealedForAnon }
        : {}),
      premiumStoreVersion: 1,
    }
  })

  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(
    output,
    `${sanitized.map((document) => JSON.stringify(document)).join('\n')}\n`,
    { encoding: 'utf8', mode: 0o600 },
  )
  console.log(JSON.stringify({
    command: 'export-metadata',
    status: 'complete',
    documents: sanitized.length,
    output,
  }))
}

function initializeTarget(projectId: string, bucket: string) {
  if (getApps().length > 0) return getApps()[0]

  const explicitProject = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const hasAnyExplicit = Boolean(explicitProject || clientEmail || privateKey)
  const hasAllExplicit = Boolean(explicitProject && clientEmail && privateKey)
  if (hasAnyExplicit && !hasAllExplicit) {
    throw new Error('Explicit Firebase Admin credentials are incomplete')
  }
  if (explicitProject && explicitProject !== projectId) {
    throw new Error(
      'Explicit Firebase Admin credentials do not match --target-project; use target-specific ADC or --env-file',
    )
  }

  return initializeApp({
    credential: hasAllExplicit
      ? cert({
          projectId: explicitProject!,
          clientEmail: clientEmail!,
          privateKey: privateKey!,
        })
      : applicationDefault(),
    projectId,
    storageBucket: bucket,
  })
}

async function optimizedImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Asset download failed with HTTP ${response.status}`)
  const input = Buffer.from(await response.arrayBuffer())
  return sharp(input)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}

async function saveManifest(filePath: string, manifest: MigrationManifest) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
}

async function loadManifest(filePath: string): Promise<MigrationManifest> {
  const manifest = JSON.parse(await readFile(filePath, 'utf8')) as MigrationManifest
  if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error('Unsupported migration manifest')
  }
  return manifest
}

async function scrubLegacyUnlockedDishes(
  db: ReturnType<typeof getFirestore>,
): Promise<number> {
  const snapshot = await db.collectionGroup('unlockedMustEats').get()
  const legacy = snapshot.docs.filter((document) =>
    Object.hasOwn(document.data(), 'dish'),
  )
  if (legacy.length === 0) return 0

  const writer = db.bulkWriter()
  for (const document of legacy) {
    writer.update(document.ref, { dish: FieldValue.delete() })
  }
  await writer.close()
  return legacy.length
}

async function backfill(): Promise<void> {
  const sourceProject = requiredArg('--source-project')
  const sourceDataset = requiredArg('--source-dataset')
  const targetProject = requiredArg('--target-project')
  const targetBucket = requiredArg('--target-bucket')
  const publicProject = arg('--public-project') ?? sourceProject
  const publicDataset = arg('--public-dataset') ?? sourceDataset
  const apply = hasFlag('--apply')
  if (apply === hasFlag('--dry-run')) {
    throw new Error('Choose exactly one of --dry-run or --apply')
  }

  const documents = await fetchPublishedMustEats(sourceProject, sourceDataset)
  for (const document of documents) {
    if (!safeId(document._id)) throw new Error('Unsafe Must-Eat document ID')
    requireString(document.dish, 'dish', document._id)
    requireString(document.description, 'description', document._id)
    requireString(document.descriptionEn, 'descriptionEn', document._id)
    requireStringValue(document.price, 'price', document._id)
    requireString(document.restaurantId, 'restaurantId', document._id)
    requireString(document.image?.id, 'image asset ID', document._id)
    requireString(document.image?.url, 'image asset URL', document._id)
  }

  console.log(JSON.stringify({
    command: 'backfill',
    mode: apply ? 'apply' : 'dry-run',
    documents: documents.length,
    source: `${sourceProject}/${sourceDataset}`,
    targetProject,
    targetBucket,
  }))
  if (!apply) return

  const app = initializeTarget(targetProject, targetBucket)
  const db = getFirestore(app)
  const bucket = getStorage(app).bucket(targetBucket)
  const entries: ManifestEntry[] = []

  for (const document of documents) {
    const image = await optimizedImage(document.image!.url!)
    const imageSha256 = sha256(image)
    const objectPath = `${OBJECT_PREFIX}${document._id}/${imageSha256}.webp`
    const record = privateRecord({ document, imageObjectPath: objectPath, imageSha256 })
    const recordSha256 = sha256(JSON.stringify(record))
    const file = bucket.file(objectPath)
    const [exists] = await file.exists()
    if (!exists) {
      await file.save(image, {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'private, no-store',
          contentDisposition: 'inline',
          metadata: { mustEatId: document._id, imageSha256 },
        },
      })
    }

    await db.collection(COLLECTION).doc(document._id).set({
      ...record,
      recordSha256,
      sourceSanityProject: sourceProject,
      sourceSanityDataset: sourceDataset,
      sourceSanityDocumentId: document._id,
      legacySanityAssetId: document.image!.id,
      updatedAt: FieldValue.serverTimestamp(),
    })

    entries.push({
      id: document._id,
      restaurantId: document.restaurantId!,
      legacyAssetId: document.image!.id!,
      legacyAssetUrl: document.image!.url!,
      privateObjectPath: objectPath,
      imageSha256,
      recordSha256,
    })
  }

  // Previous reveal documents duplicated the private dish name into an
  // owner-readable subcollection. Remove it from every target-project user
  // during the same migration before the manifest can be considered complete.
  const scrubbedUnlockDocuments = await scrubLegacyUnlockedDishes(db)

  const manifestPath = arg('--manifest') ?? `.private/must-eats-${targetProject}.json`
  await saveManifest(manifestPath, {
    version: 1,
    createdAt: new Date().toISOString(),
    sourceSanityProject: sourceProject,
    sourceSanityDataset: sourceDataset,
    publicSanityProject: publicProject,
    publicSanityDataset: publicDataset,
    targetFirebaseProject: targetProject,
    targetStorageBucket: targetBucket,
    entries,
  })
  console.log(JSON.stringify({
    command: 'backfill',
    status: 'complete',
    documents: entries.length,
    scrubbedUnlockDocuments,
    manifest: manifestPath,
  }))
}

async function verifyPrivateStore(manifest: MigrationManifest): Promise<void> {
  const app = initializeTarget(manifest.targetFirebaseProject, manifest.targetStorageBucket)
  const db = getFirestore(app)
  const bucket = getStorage(app).bucket(manifest.targetStorageBucket)
  const snapshots = await db.getAll(
    ...manifest.entries.map((entry) => db.collection(COLLECTION).doc(entry.id)),
  )
  if (snapshots.length !== manifest.entries.length || snapshots.some((snapshot) => !snapshot.exists)) {
    throw new Error('Private Firestore backfill is incomplete')
  }

  const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]))
  for (const entry of manifest.entries) {
    const data = snapshotsById.get(entry.id)?.data()
    if (
      !data ||
      data.restaurantId !== entry.restaurantId ||
      data.imageObjectPath !== entry.privateObjectPath ||
      data.imageSha256 !== entry.imageSha256 ||
      data.recordSha256 !== entry.recordSha256 ||
      storedRecordSha256(data) !== entry.recordSha256
    ) {
      throw new Error(`Private Firestore record ${entry.id} failed integrity verification`)
    }

    const file = bucket.file(entry.privateObjectPath)
    const [exists] = await file.exists()
    if (!exists) throw new Error('Private Storage backfill is incomplete')
    const [bytes] = await file.download()
    if (sha256(bytes) !== entry.imageSha256) {
      throw new Error(`Private Storage object ${entry.id} failed integrity verification`)
    }

    const encodedPath = entry.privateObjectPath.split('/').map(encodeURIComponent).join('/')
    const directUrls = [
      `https://storage.googleapis.com/${manifest.targetStorageBucket}/${encodedPath}`,
      `https://firebasestorage.googleapis.com/v0/b/${manifest.targetStorageBucket}/o/${encodeURIComponent(entry.privateObjectPath)}?alt=media`,
    ]
    for (const url of directUrls) {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      if (response.status >= 200 && response.status < 300) {
        throw new Error('A private Storage object is anonymously readable')
      }
    }
  }
}

async function purge(): Promise<void> {
  if (!hasFlag('--apply')) throw new Error('purge requires --apply')
  const manifestPath = requiredArg('--manifest')
  const manifest = await loadManifest(manifestPath)
  const confirmation = requiredArg('--confirm-source')
  const expected = `${manifest.publicSanityProject}/${manifest.publicSanityDataset}`
  if (confirmation !== expected) {
    throw new Error(`--confirm-source must equal ${expected}`)
  }
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) throw new Error('SANITY_API_WRITE_TOKEN is required for purge')

  await verifyPrivateStore(manifest)
  const client = sourceClient(
    manifest.publicSanityProject,
    manifest.publicSanityDataset,
    token,
  )
  const ids = new Set(manifest.entries.map((entry) => entry.id))
  const documents = await client.fetch<{ _id: string }[]>(
    `*[_type == "mustEat"]{_id}`,
    {},
    { perspective: 'raw' },
  )
  const targetDocuments = documents.filter((document) =>
    ids.has(document._id.replace(/^drafts\./, '')),
  )
  const transaction = client.transaction()
  const migratedAt = new Date().toISOString()
  for (const document of targetDocuments) {
    transaction.patch(document._id, (patch) =>
      patch.unset(PREMIUM_FIELDS).set({ premiumStoreVersion: 1, premiumMigratedAt: migratedAt }),
    )
  }
  await transaction.commit()

  let deletedAssets = 0
  for (const assetId of new Set(manifest.entries.map((entry) => entry.legacyAssetId))) {
    const references = await client.fetch<number>(`count(*[references($assetId)])`, { assetId })
    if (references === 0) {
      await client.delete(assetId)
      deletedAssets += 1
    }
  }
  console.log(JSON.stringify({
    command: 'purge',
    status: 'complete',
    documents: targetDocuments.length,
    deletedAssets,
  }))
}

async function verify(): Promise<void> {
  const manifest = await loadManifest(requiredArg('--manifest'))
  await verifyPrivateStore(manifest)

  const publicClient = sourceClient(
    manifest.publicSanityProject,
    manifest.publicSanityDataset,
  )
  const publicCounts = await publicClient.fetch<Record<string, number>>(`{
    "documents": count(*[_type == "mustEat" && !(_id in path("drafts.**"))]),
    "withDish": count(*[_type == "mustEat" && defined(dish)]),
    "withDescription": count(*[_type == "mustEat" && (defined(description) || defined(descriptionEn))]),
    "withPrice": count(*[_type == "mustEat" && defined(price)]),
    "withImage": count(*[_type == "mustEat" && defined(image.asset._ref)])
  }`)
  if (publicCounts.withDish || publicCounts.withDescription || publicCounts.withPrice || publicCounts.withImage) {
    throw new Error('Public Sanity still exposes Premium Must-Eat fields')
  }

  if (hasFlag('--require-legacy-unreachable')) {
    let reachable = 0
    for (const entry of manifest.entries) {
      const response = await fetch(entry.legacyAssetUrl, { method: 'HEAD', redirect: 'follow' })
      if (response.status >= 200 && response.status < 300) reachable += 1
    }
    if (reachable > 0) {
      throw new Error(`${reachable} legacy Sanity assets remain anonymously reachable`)
    }
  }

  const appUrl = arg('--app-url')
  if (appUrl && manifest.entries[0]) {
    const basicUser = process.env.STAGING_BASIC_AUTH_USER
    const basicPass = process.env.STAGING_BASIC_AUTH_PASS
    const headers = basicUser && basicPass
      ? { authorization: `Basic ${Buffer.from(`${basicUser}:${basicPass}`).toString('base64')}` }
      : undefined
    const response = await fetch(
      `${appUrl.replace(/\/$/, '')}/api/must-eat-image/${encodeURIComponent(manifest.entries[0].id)}`,
      { headers, redirect: 'manual' },
    )
    if (response.status !== 403) {
      throw new Error(`Anonymous app image route returned HTTP ${response.status}, expected 403`)
    }
  }

  console.log(JSON.stringify({
    command: 'verify',
    status: 'passed',
    documents: manifest.entries.length,
    legacyAssetGate: hasFlag('--require-legacy-unreachable') ? 'passed' : 'not-requested',
  }))
}

async function main() {
  const envFile = arg('--env-file') ?? '.env.local'
  loadEnv({ path: envFile, quiet: true })
  const command = process.argv[2]
  if (command === 'backfill') return backfill()
  if (command === 'export-metadata') return exportMetadata()
  if (command === 'purge') return purge()
  if (command === 'verify') return verify()
  throw new Error('Usage: migrate-must-eats-private.ts <backfill|export-metadata|purge|verify> [options]')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed')
  process.exit(1)
})

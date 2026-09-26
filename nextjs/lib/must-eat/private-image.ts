import 'server-only';

import sharp from 'sharp';

import { getAdminStorage } from '@/lib/firebase/admin';
import { getPrivateMustEatContent, type PrivateMustEatContent } from './private-store';

/* Die Bild-Route holte bis zum 16.09.2026 fuer JEDE Anfrage das Original aus
   dem Bucket, las das Firestore-Dokument neu und rechnete die Variante mit
   sharp neu — pro Karte, pro Blaettern, ohne Gedaechtnis. Im Produktions-Log
   (13.–16.09.2026): Median 858 ms, jedes zehnte Bild ueber 2,6 s, das
   langsamste 6,5 s. Die Bytes waren es nicht: die Originale sind 47–159 kB.

   Deshalb behaelt der Prozess, was sich nicht aendert:

   - Das Original, adressiert ueber seinen Objektpfad. Der traegt den
     Inhalts-Hash (`premium/must-eats/<id>/<sha256>.webp`, siehe
     scripts/replace-must-eat-cards.ts) — dieselbe Adresse heisst dieselben
     Bytes, also ohne Verfallszeit.
   - Jede gerechnete Variante (Breite, Qualitaet, Format), unter demselben
     Pfad — auch inhaltsadressiert.
   - Das Firestore-Dokument fuenf Minuten. Es zeigt auf den Pfad; eine
     ersetzte Karte kommt also bis zu fuenf Minuten alt heraus — dieselbe
     Frist, die der oeffentliche Zweig der Route ohnehin als max-age nennt.

   Gleichzeitige Anfragen nach demselben Ding teilen sich einen Ladevorgang:
   sechs Karten auf einem Startbild-Teaser heissen einen Download, nicht
   sechs. Der Speicher pro Instanz bleibt klein — 54 Originale sind rund
   5 MB, die Varianten dazu ein Vielfaches davon in Kilobyte, nicht Megabyte;
   die Deckel unten sind Sicherheitsnetz, kein Arbeitsmass. */

const CONTENT_TTL_MS = 5 * 60_000;
const CONTENT_MAX_ENTRIES = 512;
const ORIGINAL_MAX_ENTRIES = 256;
const VARIANT_MAX_ENTRIES = 1024;

interface Entry<V> {
  value: V;
  expiresAt: number;
}

/** Kleiner LRU mit Verfallszeit und Zusammenlegung laufender Ladevorgaenge.
 *  Ein Fehlschlag wird nicht gemerkt — der naechste Aufrufer laedt neu. */
export class MemoCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly inflight = new Map<string, Promise<V>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now
  ) {}

  peek(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Zuletzt benutzt ans Ende — Map iteriert in Einfuegereihenfolge.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  async get(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.peek(key);
    if (hit !== undefined) return hit;
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const loading = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, loading);
    return loading;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }
}

export interface StoredImage {
  body: Buffer;
  contentType: string;
  /** Das ETag des Buckets, ohne Anfuehrungszeichen — beschreibt das Original. */
  etag: string | null;
}

export interface ImageVariant {
  width: number;
  quality: number;
  webp: boolean;
}

export interface RenderedMustEatImage {
  body: Buffer;
  contentType: string;
  /** Fertig fuer den Header, mit Anfuehrungszeichen und Varianten-Suffix —
   *  eine skalierte Variante braucht ihr eigenes, sonst gilt ein 304 fuer die
   *  falschen Bytes. */
  etag: string | null;
}

export interface PrivateMustEatImageDeps {
  readContent: (id: string) => Promise<PrivateMustEatContent>;
  download: (objectPath: string) => Promise<StoredImage>;
  resize: (original: StoredImage, variant: ImageVariant) => Promise<StoredImage>;
  now?: () => number;
}

/** Laeuft vor jeder Arbeit, die Geld kostet (Bucket-Download, sharp) — und
 *  nur davor. Wirft, um die Arbeit zu verhindern; ein Treffer aus dem
 *  Speicher ruft sie nicht. */
export type PaidWorkGate = () => Promise<void>;

function variantSuffix(variant: ImageVariant): string {
  return `-w${variant.width}-q${variant.quality}${variant.webp ? '-webp' : ''}`;
}

function withEtag(image: StoredImage, suffix: string): RenderedMustEatImage {
  return {
    body: image.body,
    contentType: image.contentType,
    etag: image.etag ? `"${image.etag.replaceAll('"', '')}${suffix}"` : null,
  };
}

export function createPrivateMustEatImageRenderer(deps: PrivateMustEatImageDeps) {
  const now = deps.now ?? Date.now;
  const content = new MemoCache<PrivateMustEatContent>(CONTENT_MAX_ENTRIES, CONTENT_TTL_MS, now);
  const originals = new MemoCache<StoredImage>(ORIGINAL_MAX_ENTRIES, Infinity, now);
  const variants = new MemoCache<RenderedMustEatImage>(VARIANT_MAX_ENTRIES, Infinity, now);

  const loadOriginal = (objectPath: string, gate: PaidWorkGate) =>
    originals.get(objectPath, async () => {
      await gate();
      const image = await deps.download(objectPath);
      if (!image.contentType.startsWith('image/')) {
        throw new Error('Private Must-Eat object is not an image');
      }
      return image;
    });

  async function render(
    id: string,
    variant: ImageVariant | null,
    gate: PaidWorkGate
  ): Promise<RenderedMustEatImage> {
    const { imageObjectPath } = await content.get(id, () => deps.readContent(id));

    if (!variant) return withEtag(await loadOriginal(imageObjectPath, gate), '');

    const suffix = variantSuffix(variant);
    return variants.get(`${imageObjectPath}${suffix}`, async () => {
      await gate();
      // Das Original liegt hinter demselben Riegel — einmal gefragt reicht.
      const original = await loadOriginal(imageObjectPath, async () => {});
      try {
        return withEtag(await deps.resize(original, variant), suffix);
      } catch (error) {
        // Ein Format, das sharp nicht anfasst (SVG, animiertes GIF), ist kein
        // Grund, gar kein Bild zu liefern — dann eben das Original.
        console.error(
          '[must-eat-image] resize failed, serving original',
          error instanceof Error ? error.name : 'UnknownError'
        );
        return withEtag(original, '');
      }
    });
  }

  /** Nur fuer Tests: der Prozess-Cache ueberlebt sonst jeden Testfall. */
  function reset(): void {
    content.clear();
    originals.clear();
    variants.clear();
  }

  return { render, reset };
}

async function downloadFromBucket(objectPath: string): Promise<StoredImage> {
  const file = getAdminStorage().bucket().file(objectPath);
  const [[body], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
  return {
    body,
    contentType: metadata.contentType ?? 'application/octet-stream',
    etag: metadata.etag ?? null,
  };
}

async function resizeWithSharp(original: StoredImage, variant: ImageVariant): Promise<StoredImage> {
  // `withoutEnlargement`: ein kleineres Original bleibt, wie es ist —
  // Hochskalieren kostet Bytes und bringt kein Pixel dazu.
  const pipeline = sharp(original.body)
    .rotate()
    .resize({ width: variant.width, withoutEnlargement: true });
  const body = variant.webp
    ? // `effort: 2` statt 4: 32–40 % weniger CPU je Bild bei 4 % mehr Bytes
      // (gemessen 26.09.2026, 1026×1410 → 360/720). Auf einer frischen
      // Instanz ist die vCPU der Engpass, nicht die Leitung.
      await pipeline.webp({ quality: variant.quality, effort: 2 }).toBuffer()
    : await pipeline.toBuffer();
  return {
    body,
    contentType: variant.webp ? 'image/webp' : original.contentType,
    etag: original.etag,
  };
}

/** Der eine Renderer pro Prozess — sein Gedaechtnis ist der Cache. */
const renderer = createPrivateMustEatImageRenderer({
  readContent: getPrivateMustEatContent,
  download: downloadFromBucket,
  resize: resizeWithSharp,
});
export const renderPrivateMustEatImage = renderer.render;
export const resetPrivateMustEatImageCache = renderer.reset;

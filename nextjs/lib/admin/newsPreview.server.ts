import 'server-only';
import { randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { NewsArticle } from '@/lib/types';

// Vorschau unveröffentlichter Artikel. Die Seite selbst hat keinen Zugang zu
// Sanity-Entwürfen — das Produktions-Dataset liest sie ohne Token, und
// Entwürfe sind dort privat. Deshalb liest die Studio-Route den Entwurf mit
// der Sitzung des Redakteurs und legt hier einen Schnappschuss ab; die
// Vorschauseite rendert nur diesen. Wer den Link hat, sieht den Stand vom
// Klick — die zufällige ID ist der ganze Schutz, darum ist sie 128 Bit lang
// und läuft ab.

const COLLECTION = '_newsPreviews';
export const NEWS_PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;
const ID_PATTERN = /^[a-f0-9]{32}$/;

interface PreviewDoc {
  // Als String: Firestore lehnt `undefined` und verschachtelte Arrays ab, und
  // der Schnappschuss wird nie abgefragt, nur als Ganzes gelesen.
  article: string;
  expiresAt: Timestamp;
}

export async function saveNewsPreview(article: NewsArticle): Promise<string> {
  const id = randomBytes(16).toString('hex');
  const doc: PreviewDoc = {
    article: JSON.stringify(article),
    expiresAt: Timestamp.fromMillis(Date.now() + NEWS_PREVIEW_TTL_MS),
  };
  await getAdminFirestore().collection(COLLECTION).doc(id).set(doc);
  return id;
}

export async function loadNewsPreview(id: string): Promise<NewsArticle | null> {
  if (!ID_PATTERN.test(id)) return null;
  const snap = await getAdminFirestore().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const doc = snap.data() as PreviewDoc;
  // Die TTL-Policy räumt nur irgendwann auf; abgelaufen ist abgelaufen.
  if (doc.expiresAt.toMillis() <= Date.now()) return null;
  return JSON.parse(doc.article) as NewsArticle;
}

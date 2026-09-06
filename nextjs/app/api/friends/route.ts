import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getFriendCards } from '@/lib/profile/friends.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Die eigenen geworbenen Freunde, als Spielerkarten fuer das Profil.
 *
 * Nur die EIGENEN: die uid kommt aus dem verifizierten ID-Token, nie aus der
 * Anfrage. Ohne diese Grenze waere die Route ein Verzeichnis, das zu jeder
 * Kontokennung einen Vornamen ausspuckt — und Kontokennungen stehen in jedem
 * geteilten Deck-Link.
 *
 * Kein Rate-Limit: die Antwort haengt an einem Token, das der Aufrufer nur
 * fuer sein eigenes Konto bekommt, und sie kostet eine Firestore-Abfrage plus
 * zwei Sammelabrufe. Wer sein eigenes Profil hämmert, hämmert seine eigenen
 * Daten.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'auth required' }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  try {
    return NextResponse.json({ friends: await getFriendCards(uid) });
  } catch (err) {
    console.error('[api/friends] lookup failed', err);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }
}

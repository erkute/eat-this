import 'server-only';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { UID_SHAPE } from '@/lib/referral/constants';
import type { FriendCard } from './friends';

/* Ein Konto kann nicht beliebig viele Freunde werben (MAX_REFERRALS_PER_INVITER
   deckelt die Boni), aber der Deckel gehoert dort hin und nicht hierher. Diese
   Grenze schuetzt nur die Abfrage: `getUsers` nimmt hoechstens 100 Kennungen
   auf einmal, und eine Reihe mit mehr als 50 Figuren liest ohnehin niemand. */
const MAX_FRIENDS = 50;

function firstNameOf(displayName: string | null | undefined): string | null {
  const first = (displayName ?? '').trim().split(/\s+/)[0];
  return first || null;
}

function avatarOf(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

/**
 * Die Freunde, die ueber den eigenen Link gestartet sind — als Spielerkarten.
 *
 * Die Maschine dafuer laeuft seit dem ersten Tag: `?ref=<uid>` → Middleware →
 * `/api/referral/confirm` legt unter `users/{inviter}/referralBonuses` ein
 * Dokument `invited-<friendUid>` an, das die uid des Freundes in `partnerUid`
 * traegt. Gelesen hat davon bisher nur `useReferralCount`, und der zaehlt sie
 * bloss. Die Namen dahinter standen nirgends.
 *
 * WER HIER GEFRAGT WIRD, ENTSCHEIDET DER SERVER. Der Aufrufer reicht nur
 * seine eigene uid herein (aus dem verifizierten ID-Token), und die Liste der
 * Freunde kommt aus SEINEN Bonus-Dokumenten. Es gibt bewusst keinen Weg,
 * diese Funktion nach einer beliebigen uid zu fragen — sonst waere sie ein
 * Verzeichnis, das zu jeder Kontokennung den Vornamen ausspuckt.
 *
 * `source: 'invited'` ist die Einladenden-Seite. Das Gegenstueck
 * (`'invited-by'`, der eigene Willkommens-Bonus) traegt in `partnerUid` den,
 * der EINEN SELBST geworben hat — er gehoert nicht in diese Reihe, sonst
 * behauptet jedes geworbene Konto, seinen Werber geworben zu haben.
 *
 * Ein Konto, das es nicht mehr gibt, faellt still heraus statt die ganze
 * Reihe scheitern zu lassen: geloeschte Konten sind der Normalfall, nicht der
 * Fehlerfall.
 */
export async function getFriendCards(uid: string): Promise<FriendCard[]> {
  if (!UID_SHAPE.test(uid)) return [];

  const snap = await getAdminFirestore()
    .collection('users')
    .doc(uid)
    .collection('referralBonuses')
    .where('source', '==', 'invited')
    .limit(MAX_FRIENDS)
    .get();

  const friendUids = snap.docs
    .map((doc) => doc.data()?.partnerUid)
    .filter((value): value is string => typeof value === 'string' && UID_SHAPE.test(value));
  if (friendUids.length === 0) return [];

  /* Zwei Runden statt 2n: `getUsers` holt alle Anzeigenamen in einer Abfrage,
     `getAll` alle Profildokumente in einer zweiten. */
  const [accounts, profiles] = await Promise.all([
    getAdminAuth()
      .getUsers(friendUids.map((id) => ({ uid: id })))
      .catch(() => null),
    getAdminFirestore()
      .getAll(...friendUids.map((id) => getAdminFirestore().doc(`users/${id}`)))
      .catch(() => null),
  ]);
  if (!accounts) return [];

  const nameByUid = new Map(accounts.users.map((u) => [u.uid, firstNameOf(u.displayName)]));
  const avatarByUid = new Map(
    (profiles ?? []).map((doc) => [doc.id, avatarOf(doc.data()?.avatar)] as const)
  );

  /* Die Reihenfolge der Bonus-Dokumente, nicht die der Auth-Antwort: so steht
     die Reihe stabil, statt bei jedem Laden zu springen. */
  return friendUids
    .filter((id) => nameByUid.has(id))
    .map((id) => ({
      uid: id,
      name: nameByUid.get(id) ?? null,
      avatar: avatarByUid.get(id) ?? 1,
    }));
}

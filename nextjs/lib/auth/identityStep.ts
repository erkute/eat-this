'use client';

import type { AvatarChoice } from '@/lib/firebase/useUserProfile';

/**
 * Name und Charakter — die erste Seite der Tour, für jedes neue Konto.
 *
 * Die Tour (SignInReward) hängt an der Pack-Vergabe, also genau einmal pro
 * Konto und egal über welchen Weg: Magic-Link und Google landen hier gleich.
 * Bis 21.09.2026 bekam ein Google-Konto den Namen aus dem Google-Profil und
 * einen aus der uid geratenen Avatar, ohne je gefragt zu werden; bis
 * 22.09.2026 fragte der Magic-Link auf /welcome mit einem eigenen Formular.
 *
 * Maßstab ist der gespeicherte Avatar, nicht der Anmeldeweg: wer schon einen
 * Charakter hat, wird nicht noch einmal gefragt. Google startet mit dem
 * Vornamen aus dem Profil, der Magic-Link mit einem leeren Feld.
 *
 * Firebase wird erst hier geladen — die Tour hängt im Locale-Layout und soll
 * das Auth-SDK nicht selbst mitziehen.
 */

/** Der Vorname, mit dem das Feld startet — `null` heißt: kein Schritt nötig. */
export async function identityStepPrefill(): Promise<{ name: string } | null> {
  const [{ auth, getDb }, { doc, getDoc }] = await Promise.all([
    import('@/lib/firebase/config'),
    import('firebase/firestore'),
  ]);
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const cached = Number(localStorage.getItem(`eatthis_avatar_${user.uid}`));
    if (cached === 1 || cached === 2 || cached === 3) return null;
  } catch {}
  const snap = await getDoc(doc(await getDb(), 'users', user.uid));
  const avatar = snap.data()?.avatar;
  if (avatar === 1 || avatar === 2 || avatar === 3) return null;
  return { name: (user.displayName ?? '').trim().split(/\s+/)[0] ?? '' };
}

export async function saveIdentity(name: string, avatar: AvatarChoice): Promise<void> {
  const [{ auth, getDb }, { doc, setDoc }, { updateProfile }] = await Promise.all([
    import('@/lib/firebase/config'),
    import('firebase/firestore'),
    import('firebase/auth'),
  ]);
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await updateProfile(user, { displayName: name });
  await setDoc(doc(await getDb(), 'users', user.uid), { avatar }, { merge: true });
  /* Der Avatar-Cache und der Vorab-Hinweis fürs erste Bild der nächsten
     Seite. updateProfile löst keinen Auth-Wechsel aus, BridgeAuth schriebe
     sonst bis zum nächsten Laden den alten Namen (Google) oder die
     Mailadresse (Magic-Link). */
  try {
    localStorage.setItem(`eatthis_avatar_${user.uid}`, String(avatar));
    localStorage.setItem(
      '_authHint',
      JSON.stringify({ n: name.split(' ')[0] || name, a: avatar, u: user.uid })
    );
  } catch {}
}

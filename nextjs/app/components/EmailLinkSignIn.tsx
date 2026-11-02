'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import AuthSurfaceLoading from './AuthSurfaceLoading';
import { EMAIL_LINK_PARAMS } from '@/lib/auth/emailLinkParams';
import { HEART_PARAM, STARTER_PARAM } from '@/lib/auth/loginContinueUrl';
import { rememberPendingStarterCard } from '@/lib/auth/pendingStarterCard';
import { PROFILE_PATH, SIGNED_IN_EVENT, shouldGoToProfile } from '@/lib/auth/afterSignIn';
import { finishEmailLink } from '@/lib/auth/emailLinkPending';
import { arrivalDecided } from '@/lib/auth/signInArrival';
import { usePathname, useRouter } from '@/i18n/navigation';
import { trackEvent } from '@/lib/analytics';

const EmailLinkSignInPanel = dynamic(() => import('./EmailLinkSignInPanel'), {
  ssr: false,
  loading: () => <AuthSurfaceLoading layer="email" />,
});

export type EmailLinkState =
  | { kind: 'confirm'; email: string; busy: boolean; error: boolean }
  | { kind: 'needs-email'; email: string; busy: boolean; error: 'invalid' | 'generic' | null }
  | { kind: 'expired' };

/**
 * Bestätigt den Mail-Link auf der Seite, auf der die Anmeldung begann.
 * Postfach-Scanner führen JavaScript aus; eingelöst wird deshalb erst nach
 * einem ausdrücklichen Klick. Die Adresse kommt aus dem Browser-Speicher
 * oder einer Eingabe. Sensible Link-Felder verschwinden sofort aus der URL.
 *
 * Die Abdeckung liegt während des Panel-Downloads über der Seite. Mail- und
 * Google-Anmeldung warten vor dem Profilwechsel auf die Starter-Pack-Entscheidung.
 */
export default function EmailLinkSignIn() {
  const [state, setState] = useState<EmailLinkState | null>(null);
  /* Der Link, wie er ankam — die Adresszeile ist da schon aufgeräumt. */
  const linkRef = useRef('');
  /* Was der Link an Absicht mitbrachte (angetippte Karte, Herz). */
  const intentRef = useRef<{ starterId: string | null; heartId: string | null }>({
    starterId: null,
    heartId: null,
  });
  const router = useRouter();
  const pathname = usePathname();

  /* Auch die Google-Anmeldung endet hier: die Anmelde-Tafel und der
     Redirect-Weg haben keinen eigenen Router und melden nur, dass jemand
     angekommen ist (afterSignIn.ts). */
  useEffect(() => {
    const onSignedIn = async () => {
      if (!shouldGoToProfile(pathname)) return;
      /* Wie beim Mail-Link: erst wenn feststeht, ob die Tour kommt — sonst
         stand das Profil offen da, bis sie aufging (signInArrival). */
      const { auth } = await import('@/lib/firebase/config');
      const uid = auth.currentUser?.uid;
      if (uid) await arrivalDecided(uid);
      router.push(PROFILE_PATH);
    };
    window.addEventListener(SIGNED_IN_EVENT, onSignedIn);
    return () => window.removeEventListener(SIGNED_IN_EVENT, onSignedIn);
  }, [pathname, router]);
  /* Nach der Anmeldung unterwegs ins Profil: angekommen, gibt die Seite frei,
     was auf den Mail-Link gewartet hat (emailLinkPending). */
  const leavingRef = useRef(false);
  useEffect(() => {
    if (!leavingRef.current) return;
    leavingRef.current = false;
    finishEmailLink();
  }, [pathname]);
  const [claimingCard, setClaimingCard] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    if (params.get('mode') !== 'signIn' || !params.get('oobCode')) return;
    linkRef.current = url.toString();
    /* Die Adresse hat eine Mailadresse und einen einlösbaren Code in der
       Adresszeile — beides raus, bevor jemand den Link teilt oder ein
       Seitenaufruf ihn mitzählt. Die Absichten (Karte, Herz) gehen mit raus
       und warten hier; erst beim Anmelden wandern sie in den sessionStorage
       (signIn), denselben Träger wie bei Google — die Anmeldung endet im
       Profil, und dort lösen Pack-Vergabe und Spot-Liste sie ein. */
    const starterId = params.get(STARTER_PARAM);
    intentRef.current = { starterId, heartId: params.get(HEART_PARAM) };
    setClaimingCard(Boolean(starterId));
    for (const name of [...EMAIL_LINK_PARAMS, STARTER_PARAM, HEART_PARAM]) params.delete(name);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );

    /* Never trust an email supplied by the link. Another browser must ask
       for the address to prevent signing into a sender's account. */
    let remembered = '';
    try {
      remembered = localStorage.getItem('emailForSignIn') ?? '';
    } catch {}
    setState(
      remembered
        ? { kind: 'confirm', email: remembered, busy: false, error: false }
        : { kind: 'needs-email', email: '', busy: false, error: null }
    );

    /* Firebase lädt, während die Tafel schon steht. Ein Link, den Firebase
       nicht als Anmelde-Link erkennt, ist eine Sackgasse. Ohne Abbruch beim
       Aufräumen: die Adresszeile ist schon geräumt, ein zweiter Lauf des
       Effekts (StrictMode) kommt hier nie an — er muss das Ergebnis des
       ersten bekommen. Die Komponente hängt im Layout und bleibt stehen. */
    Promise.all([import('@/lib/firebase/config'), import('firebase/auth')]).then(
      ([{ auth }, { isSignInWithEmailLink }]) => {
        if (!isSignInWithEmailLink(auth, linkRef.current)) setState({ kind: 'expired' });
      },
      () => setState({ kind: 'expired' })
    );
  }, []);

  if (!state) return null;

  const close = () => {
    setState(null);
    finishEmailLink();
  };

  const signIn = async (email: string) => {
    const { starterId, heartId } = intentRef.current;
    const [{ auth }, { signInWithEmailLink }, pendingHeart] = await Promise.all([
      import('@/lib/firebase/config'),
      import('firebase/auth'),
      heartId ? import('@/lib/map/pendingHeart') : null,
    ]);
    /* Vor der Anmeldung gemerkt: Pack-Vergabe und Spot-Liste lesen sie,
       sobald das Konto da ist — und die Frist (zehn Minuten) beginnt erst
       jetzt, nicht beim Öffnen des Links. */
    if (starterId) rememberPendingStarterCard(starterId);
    if (heartId) pendingHeart?.rememberPendingHeart(heartId);
    const credential = await signInWithEmailLink(auth, email, linkRef.current);
    const { user } = credential;
    try {
      localStorage.removeItem('emailForSignIn');
    } catch {}
    trackEvent(user.displayName ? 'login' : 'sign_up', { method: 'email_link' });
    /* Die Tafel bleibt („Anmelden …"), bis feststeht, ob die Tour kommt.
       Kommt sie, liegt ihr Ink-Grund dann schon unter der Tafel, und das
       Profil wechselt verdeckt darunter — man sieht es nie vor der Tour. */
    await arrivalDecided(user.uid);
    setState(null);
    /* Was auf der alten Seite von selbst aufgehen wollte, bleibt bis zum
       Seitenwechsel zurückgehalten — sonst blitzte es vor dem Profil auf. */
    if (!shouldGoToProfile(pathname)) return finishEmailLink();
    leavingRef.current = true;
    router.push(PROFILE_PATH);
  };

  return <EmailLinkSignInPanel state={state} setState={setState} claimingCard={claimingCard} signIn={signIn} close={close} />;
}

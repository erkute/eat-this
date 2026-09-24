'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { announceSignIn } from '@/lib/auth/signInArrival';
import LoginBoard, { LoginSceneArt } from '@/app/components/LoginBoard';
import styles from '@/app/components/profile/Profile.module.css';
import starter from '@/app/components/StarterPackSignup.module.css';
import deck from './Deck.module.css';

/**
 * Der Ausgang des geteilten Decks — die einzige Handlung, die die Seite
 * anbietet.
 *
 * Bis zum 06.09.2026 war das ein Link auf die Startseite: „Mach deine eigene
 * Map auf" → `/`. Wer über einen geteilten Link kam, landete damit auf einer
 * Seite, die noch einmal von vorn anfing, und die Anmeldung lag dahinter
 * irgendwo — vom fremden Deck zum eigenen Konto waren es mindestens zwei
 * Seitenwechsel. Nutzer, 06.09.2026: „da muss dann direkt eine Anmeldung
 * folgen."
 *
 * Also steht sie hier: dieselbe Ink-Tafel wie der Starter-Pack-Abschnitt der
 * Startseite, mit demselben Inhalt wie das Anmelde-Modal (LoginBoard) — nur
 * die Zeile unter der Ueberschrift nennt, wessen Deck man gerade sieht.
 *
 * Mit `continueUrl` zurueck auf genau diese Seite. Sie stand hier zuerst
 * bewusst NICHT — die Annahme war, wer sich vom Deck eines Freundes aus
 * anmeldet, wolle danach seine eigene Map sehen. Ohne sie nimmt die Route
 * ihren Fallback (die Startseite), und damit landet der einzige Kanal, ueber
 * den ohne Werbebudget jemand herkommt, in einer Seite, die von vorn anfaengt:
 * das Deck, das den Besuch ausgeloest hat, ist weg und ueber die Startseite
 * nicht wiederzufinden. Angemeldet zeigt dieselbe Seite die Tafel „dein Deck
 * ist offen" und den Weg zur Map — der Ausgang bleibt also da, nur eben mit
 * dem Zusammenhang, in dem der Besuch angefangen hat.
 *
 * Darunter der leise Weg für alle, die noch nicht so weit sind: zur Map. Ohne
 * ihn endet die Seite für sie in einer Sackgasse, und der geteilte Link ist
 * der einzige Kanal, über den ohne Werbebudget jemand herkommt.
 *
 * Das Werben braucht dafür keine eigene Mechanik: der geteilte Link trägt
 * `?ref=<uid>`, die Middleware hat das Cookie längst gesetzt (siehe
 * page.tsx). Wer sich von hier aus anmeldet, ist geworben — per Mail wie per
 * Google. Der Google-Weg bleibt im selben Browser (Popup auf dieser Seite,
 * Redirect zurück auf diese Adresse), dort liegt das Cookie, und der
 * ReferralToastListener im Layout bestätigt am Auth-Wechsel, egal welcher Weg
 * ihn ausgelöst hat. Nur die Mail braucht `ref` in der continueUrl, weil sie
 * auf einem anderen Gerät geöffnet werden kann (send-magic-link).
 *
 * Angemeldet gibt es nichts anzumelden — dann führt dieselbe Fläche zum
 * eigenen Deck.
 */
export default function DeckJoin({ name }: { name: string | null }) {
  const t = useTranslations('deck');
  const tLogin = useTranslations('modals.login');
  const { user } = useAuth();
  /* Nach der Haltezeit des Wartescreens kommt der Toast — es sei denn, ein
     Starter Pack wird vergeben, dann spricht dessen Einblendung (siehe
     signInArrival). */
  const signedInLine = tLogin('signedIn');
  const onSignedIn = useCallback(
    () => announceSignIn(() => window.showNotification?.(signedInLine)),
    [signedInLine]
  );

  /* Der Weg zur Map steht IMMER da, in beiden Zustaenden. Er hing zuerst nur
     am Anmeldeblock — und damit sah ein Angemeldeter eine Seite ohne
     Anmeldung UND ohne Ausgang zur Map (Nutzer, 06.09.2026). Fuer den
     Angemeldeten ist er sogar der naheliegendere der beiden Wege. */
  /* Ohne `locale`-Prop: `localePrefix` ist `as-needed`, und ein explizit
     mitgegebenes `de` erzwingt trotzdem `/de/map` — von dort schickt die
     Middleware mit 308 auf `/map`. Ein Umweg fuer nichts, auf dem einzigen
     Ausgang der Seite. */
  const toMap = (
    <Link className={deck.browse} href="/map">
      {t('browse')}
    </Link>
  );

  return (
    <>
      {user && (
        <div className={styles.invite}>
          <div className={styles.inviteCopy}>
            <h2 className={styles.inviteTitle}>{t('ctaHeadingIn')}</h2>
            <p className={styles.inviteLine}>{t('ctaLineIn')}</p>
          </div>
          <div className={styles.inviteAction}>
            <Link href="/profile" className={styles.inviteButton}>
              {t('ctaIn')}
            </Link>
          </div>
        </div>
      )}

      {/* Die Tafel bleibt gemountet, auch wenn Firebase den Nutzer schon
          meldet: an ihr haengt der Wartescreen eines Google-Logins, und der
          muss seine Haltezeit zu Ende stehen (er liegt als Portal am `body`,
          `hidden` nimmt ihn also nicht mit). `data-guest-only`: der
          Vorab-Bootstrap blendet sie schon vor dem ersten Bild aus, wenn das
          Konto bekannt ist — sonst blitzt fuer einen Angemeldeten eine
          Sekunde lang die Anmeldung auf. */}
      <div className={starter.inner} data-guest-only="" hidden={Boolean(user)}>
        <LoginBoard
          art={<LoginSceneArt reason={null} />}
          title={tLogin('packTitle')}
          lead={name ? t('joinLead', { name }) : t('joinLeadAnon')}
          googleWarmup="intent"
          onGoogleSettled={onSignedIn}
        />
      </div>

      {/* Kein zweiter Knopf: ein gleich lauter Ausgang neben der Anmeldung
          wäre eine Abzweigung, keine Alternative. */}
      {toMap}
    </>
  );
}

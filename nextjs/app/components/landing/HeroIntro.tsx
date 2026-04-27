'use client';

import { useState } from 'react';
import styles from './landing.module.css';
import { useAuth, useMagicLink } from '@/lib/auth';

export default function HeroIntro() {
  const { user } = useAuth();
  const { sendLink, state, errorMessage } = useMagicLink();
  const [email, setEmail] = useState('');

  // HeroIntro is a pure signup CTA — no content value for signed-in users (unlike BoosterPack/Newsletter)
  if (user) return null;

  return (
    <section className={styles.heroIntro}>
      <span className={styles.heroIntroStats}>
        Berlin · 150+ Must Eats · 200+ Restaurants
      </span>
      <h1 className={styles.heroIntroHeadline}>
        Wahrscheinlich der beste Foodguide, den du kennst.
      </h1>
      {state === 'sent' ? (
        <p className={styles.magicSent}>
          E-Mail unterwegs! Schau in dein Postfach und klick auf den Link.
        </p>
      ) : (
        <>
          <p className={styles.heroIntroSubtitle}>
            Eine kuratierte Sammlung der besten Berliner Restaurants und Cafés.
          </p>
          <form
            className={styles.heroIntroForm}
            onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
          >
            <input
              className={styles.heroIntroInput}
              type="email"
              placeholder="deine@email.de"
              aria-label="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className={styles.heroIntroSubmit}
              type="submit"
              disabled={state === 'sending'}
            >
              {state === 'sending' ? 'Wird gesendet…' : 'Registriere dich'}
            </button>
          </form>
          {state === 'error' && (
            <p className={styles.magicError}>{errorMessage}</p>
          )}
        </>
      )}
    </section>
  );
}

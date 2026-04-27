'use client';

import { useState } from 'react';
import styles from './landing.module.css';
import { useAuth, useMagicLink } from '@/lib/auth';

export default function Newsletter() {
  const { user } = useAuth();
  const { sendLink, state, errorMessage } = useMagicLink();
  const [email, setEmail] = useState('');

  return (
    <section className={styles.news}>
      <div className={styles.newsInner}>
        <div className={styles.newsVisual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pics/booster/booster1.webp"
            alt=""
            className={styles.newsPack}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className={styles.newsCopy}>
          <span className={styles.secLabel}>Newsletter</span>
          <h2>Gruß aus der Küche</h2>
          <p>
            Neue Städte, neue Restaurants, neue Must Eats - direkt in dein Postfach,
            bevor wir öffentlich davon erzählen.
          </p>
          {!user && (
            state === 'sent' ? (
              <p className={styles.magicSent}>
                E-Mail unterwegs! Schau in dein Postfach und klick auf den Link.
              </p>
            ) : (
              <>
                <form
                  className={styles.newsForm}
                  onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
                >
                  <input
                    className={styles.newsInput}
                    type="email"
                    placeholder="deine@email.de"
                    aria-label="E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    className={styles.newsBtn}
                    type="submit"
                    disabled={state === 'sending'}
                  >
                    {state === 'sending' ? 'Wird gesendet…' : 'Abonnieren'}
                  </button>
                </form>
                {state === 'error' && (
                  <p className={styles.magicError}>{errorMessage}</p>
                )}
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import styles from './landing.module.css';
import { useMagicLink } from '@/lib/auth';

export default function HeroForm() {
  const { sendLink, state, errorMessage } = useMagicLink();
  const [email, setEmail] = useState('');

  if (state === 'sent') {
    return (
      <p className={styles.magicSent}>
        E-Mail unterwegs! Schau in dein Postfach und klick auf den Link.
      </p>
    );
  }

  return (
    <>
      <form
        className={styles.heroForm}
        onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
      >
        <input
          className={styles.heroInput}
          type="email"
          placeholder="deine@email.de"
          aria-label="E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          className={styles.heroSubmit}
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
  );
}

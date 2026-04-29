'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import type { MustEatAlbumCard } from '@/lib/types';
import type { BoosterPack } from '@/lib/firebase/usePack';
import LocaleLink from '@/app/components/LocaleLink';
import CardReveal from './CardReveal';
import styles from './profile.module.css';

interface Props {
  pack:     BoosterPack;
  mustEats: MustEatAlbumCard[];
}

const openPackFn = httpsCallable<{ packId: string }, { ok: boolean }>(functions, 'openPack');

const STAGGER_S = 0.18;

type Stage = 'closed' | 'revealing' | 'open';

export default function BoosterPackOpener({ pack, mustEats }: Props) {
  const cards = pack.mustEatIds
    .map((id) => mustEats.find((m) => m._id === id))
    .filter((c): c is MustEatAlbumCard => Boolean(c));

  const [stage, setStage] = useState<Stage>(pack.opened ? 'open' : 'closed');
  const [error, setError] = useState<string | null>(null);

  const onOpen = useCallback(async () => {
    setStage('revealing');
    setError(null);
    try {
      await openPackFn({ packId: pack.id });
    } catch {
      setError('Konnte Pack serverseitig nicht öffnen — die Karten sind aber dein.');
    }
  }, [pack.id]);

  const onLastCardComplete = useCallback(() => {
    setStage('open');
  }, []);

  if (stage === 'closed') {
    return (
      <div className={styles.openerStage}>
        <p className={styles.openerEyebrow}>Dein Booster Pack</p>
        <motion.button
          type="button"
          className={styles.packBtn}
          onClick={onOpen}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          aria-label="Booster Pack öffnen"
        >
          <img src="/pics/booster/booster1.webp" alt="" className={styles.packArt} />
        </motion.button>
        <h2 className={styles.openerTitle}>10 Must Eat Cards.</h2>
        <p className={styles.openerSub}>Tippe zum Öffnen.</p>
      </div>
    );
  }

  const lastIndex = cards.length - 1;

  return (
    <div className={styles.revealStage}>
      <div className={styles.revealGrid}>
        {cards.map((card, idx) => (
          <CardReveal
            key={card._id}
            card={card}
            delay={stage === 'revealing' ? idx * STAGGER_S : 0}
            animate={stage === 'revealing'}
            onComplete={idx === lastIndex ? onLastCardComplete : undefined}
          />
        ))}
      </div>

      {stage === 'open' && (
        <motion.div
          className={styles.revealCta}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className={styles.revealCtaSub}>Deine Sammlung — {cards.length} Karten.</p>
          <LocaleLink href="/map" className={styles.ctaSecondary}>Zur Map</LocaleLink>
        </motion.div>
      )}

      {error && <p className={styles.feedbackError}>{error}</p>}
    </div>
  );
}

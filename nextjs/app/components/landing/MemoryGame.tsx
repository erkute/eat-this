'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './landing.module.css';
import { useTranslation } from '@/lib/i18n';

const ALL_CARDS = [
  { id: 'banh-mi',    img: 'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png' },
  { id: 'thai',       img: 'https://cdn.sanity.io/images/ehwjnjr2/production/70e13f906df3aa37dd062fc6d83034ded924b1ae-1449x2163.png' },
  { id: 'pizza',      img: 'https://cdn.sanity.io/images/ehwjnjr2/production/7d58817e5ac7298642bdc2816944e5f64468e713-1449x2163.png' },
  { id: 'tomate',     img: 'https://cdn.sanity.io/images/ehwjnjr2/production/d15cfc50bd31fd486d16d1e1e6135ed4222e945b-1449x2163.png' },
  { id: 'sabich',     img: 'https://cdn.sanity.io/images/ehwjnjr2/production/b1a2aafdff07349d224a15a7b298af783db48271-1449x2163.png' },
  { id: 'doener',     img: 'https://cdn.sanity.io/images/ehwjnjr2/production/de27d072ad8d240ed1361d00b22b60525378375b-1449x2163.png' },
];
const PAIR_COUNT = 6;

type Card = { uid: number; id: string; img: string };

function shuffle<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();

  // Build deck on the client only — avoids SSR/CSR shuffle mismatch
  useEffect(() => {
    const deck = ALL_CARDS.slice(0, PAIR_COUNT);
    const pairs = shuffle([...deck, ...deck]).map((c, idx) => ({ ...c, uid: idx }));
    setCards(pairs);
  }, []);

  const found = matched.size / 2;
  const remaining = PAIR_COUNT - found;

  function clickCard(c: Card) {
    if (locked) return;
    if (matched.has(c.uid) || flipped.includes(c.uid)) return;
    const nextFlipped = [...flipped, c.uid];
    setFlipped(nextFlipped);
    if (nextFlipped.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [u1, u2] = nextFlipped;
      const c1 = cards.find((x) => x.uid === u1);
      const c2 = cards.find((x) => x.uid === u2);
      if (c1 && c2 && c1.id === c2.id) {
        // Match
        setTimeout(() => {
          setMatched((prev) => {
            const next = new Set(prev);
            next.add(u1);
            next.add(u2);
            // Trigger modal once the last pair is found
            if (next.size / 2 === PAIR_COUNT) {
              setTimeout(() => setModalOpen(true), 700);
            }
            return next;
          });
          setFlipped([]);
          setLocked(false);
        }, 500);
      } else {
        // Miss — flip back
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 1000);
      }
    }
  }

  return (
    <section className={styles.game}>
      <div className={styles.gameHead}>
        <div>
          <span className={styles.secLabel}>{t('landing.memoryEyebrow')}</span>
          <h2>{t('landing.memoryHeadline')}</h2>
          <p>{t('landing.memorySubline')}</p>
        </div>
        <div className={styles.gameMeta}>
          <div className={styles.scoreboard}>
            <div className={styles.scoreCell}>
              <span className={styles.scoreVal}>{found}</span>
              <span className={styles.scoreLabel}>{t('landing.memoryFound')}</span>
            </div>
            <div className={styles.scoreCell}>
              <span className={styles.scoreVal}>{remaining}</span>
              <span className={styles.scoreLabel}>{t('landing.memoryLeft')}</span>
            </div>
            <div className={styles.scoreCell}>
              <span className={styles.scoreVal}>{moves}</span>
              <span className={styles.scoreLabel}>{t('landing.memoryMoves')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.gameGrid}>
        {cards.map((c) => {
          const isFlipped = flipped.includes(c.uid) || matched.has(c.uid);
          const isMatched = matched.has(c.uid);
          return (
            <div
              key={c.uid}
              className={`${styles.memCard} ${isFlipped ? styles.flipped : ''} ${
                isMatched ? styles.matched : ''
              }`}
              onClick={() => clickCard(c)}
            >
              <div className={styles.memInner}>
                <div className={styles.memBack} />
                <div className={styles.memFace}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Memory-complete modal — fixed full-viewport with blurred backdrop */}
      <div className={`${styles.memModal} ${modalOpen ? styles.show : ''}`}>
        <div className={styles.memModalBd} onClick={() => setModalOpen(false)} />
        <div className={styles.memModalCard}>
          <button
            type="button"
            className={styles.memModalClose}
            onClick={() => setModalOpen(false)}
            aria-label={t('landing.memoryModalClose')}
          >
            ×
          </button>
          <div className={styles.memModalPack}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/booster/booster5.webp" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/booster/booster2.webp" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/booster/booster3.webp" alt="" />
          </div>
          <div className={styles.memModalLabel}>{t('landing.memoryModalLabel')}</div>
          <h3>{t('landing.memoryModalHeadline')}</h3>
          <p>{t('landing.memoryModalBody')}</p>
          <form className={styles.memModalForm} onSubmit={(e) => e.preventDefault()}>
            <input
              className={styles.memModalInput}
              type="email"
              placeholder={t('landing.memoryModalEmailPlaceholder')}
              aria-label={t('landing.emailAriaLabel')}
            />
            <button className={styles.memModalCta} type="submit">
              {t('landing.memoryModalSubmit')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

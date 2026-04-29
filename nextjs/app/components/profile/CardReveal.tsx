'use client';

import { motion } from 'framer-motion';
import type { MustEatAlbumCard } from '@/lib/types';
import styles from './profile.module.css';

interface Props {
  card:        MustEatAlbumCard;
  delay:       number;
  animate:     boolean;
  onComplete?: () => void;
}

export default function CardReveal({ card, delay, animate, onComplete }: Props) {
  const art = card.imageUrl ? (
    <img
      src={card.imageUrl}
      alt={card.dish}
      className={styles.revealCardArt}
      loading="lazy"
    />
  ) : (
    <div className={styles.revealCardPlaceholder} aria-hidden="true">🍽</div>
  );

  const caption = (
    <div className={styles.revealCardCaption}>
      <span className={styles.revealCardDish}>{card.dish}</span>
      <span className={styles.revealCardSub}>
        {card.restaurant}{card.district ? ` · ${card.district}` : ''}
      </span>
    </div>
  );

  if (!animate) {
    return (
      <div className={styles.revealCard}>
        {art}
        {caption}
      </div>
    );
  }

  return (
    <motion.div
      className={styles.revealCard}
      initial={{ opacity: 0, scale: 0.3, y: 24, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{
        delay,
        duration: 0.55,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      onAnimationComplete={onComplete}
    >
      {art}
      {caption}
    </motion.div>
  );
}

'use client';
import { motion } from 'framer-motion';
import styles from './ZoomCurtain.module.css';

const PIECES = [styles.curtain, styles.capTop, styles.capBottom];

// Der Vorhang hinter jedem Foto-Zoom samt deckender Kappen an Status- und
// URL-Leiste — warum, steht in ZoomCurtain.module.css. `className` traegt die
// Stapelhoehe der jeweiligen Lightbox; `fade` blendet ihn mit der Lightbox ein
// und aus (die Galerie), ohne steht er sofort (die Must-Eat-Karte).
export default function ZoomCurtain({ className, fade = false }: { className: string; fade?: boolean }) {
  return PIECES.map((piece) => (
    <motion.div
      key={piece}
      className={`${piece} ${className}`}
      aria-hidden="true"
      initial={fade ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={fade ? { opacity: 0 } : undefined}
      transition={{ duration: 0.2 }}
    />
  ));
}

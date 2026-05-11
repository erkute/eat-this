import styles from './SolariTiles.module.css'

interface Props {
  /** Text to render as a row of split-flap tiles. Always rendered in
   *  uppercase regardless of input casing — that's the Solari look. */
  text: string
  /** Tile size. `lg` is the hero RestaurantTicker, `md` is the smaller
   *  FinalCtaSection marquee. Default `lg`. */
  size?: 'lg' | 'md'
  /** When provided, the outer span carries this aria-label so screen
   *  readers announce the word once. Omit for purely decorative use
   *  (the inner tiles always carry `aria-hidden`). */
  ariaLabel?: string
}

/* Render a string as a row of Solari split-flap tiles, one tile per
   character. Spaces become invisible gap-tiles so the row stays evenly
   spaced. The horizontal mid-seam, dark glow, and yellow LED colour
   are all in the CSS module — see `.tile::after`. */
export default function SolariTiles({ text, size = 'lg', ariaLabel }: Props) {
  const chars = text.toUpperCase().split('')
  const sizeClass = size === 'md' ? styles.tilesMd : styles.tilesLg
  return (
    <span
      className={`${styles.tiles} ${sizeClass}`}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : { 'aria-hidden': true })}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          className={ch === ' ' ? `${styles.tile} ${styles.tileGap}` : styles.tile}
          aria-hidden="true"
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

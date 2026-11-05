import styles from './PaperPhoto.module.css';

/** Ein Papierfoto über die ganze Fläche. Die Fläche braucht position:relative und
 * isolation:isolate. Es lädt erst kurz vor dem Sichtbarwerden. `mirrored` ist für
 * Flächen direkt über dem Footer, damit dort nicht dieselben Falten stehen. */
export default function PaperPhoto({ className = '', mirrored = false }: { className?: string; mirrored?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`${styles.photo} ${mirrored ? styles.mirrored : ''} ${className}`}
      data-paper-photo=""
      src="/pics/paper/footer-paper.webp?v=20261105"
      width={2000}
      height={1333}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  );
}

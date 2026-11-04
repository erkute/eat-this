import styles from './PaperPhoto.module.css';

/** Ein Papierfoto über die ganze Fläche, ab Tablet-Breite. Die Fläche braucht
 * position:relative und isolation:isolate. Es lädt erst kurz vor dem Sichtbarwerden,
 * und ausgeblendet am Telefon gar nicht. */
export default function PaperPhoto({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`${styles.photo} ${className}`}
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

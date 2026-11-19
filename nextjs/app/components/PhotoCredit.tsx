/**
 * Eigene Fotos („Foto: Eat This“) brauchen keinen Nachweis auf der Seite; der
 * Credit steht nur im Studio, damit klar ist, woher das Bild stammt.
 */
export function shownPhotoCredit(text: string | null | undefined): string | null {
  const credit = text?.trim();
  if (!credit) return null;
  return /^(?:fotos?|photos?):\s*eat this\.?$/i.test(credit) ? null : credit;
}

/** Foto-Nachweis unter einem Bild — als Link, wenn die Quelle eine sichere URL hat. */
export function PhotoCredit({
  text,
  href,
  className,
}: {
  text: string;
  href: string | null;
  className?: string;
}) {
  return (
    <span className={className}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </span>
  );
}

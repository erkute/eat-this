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

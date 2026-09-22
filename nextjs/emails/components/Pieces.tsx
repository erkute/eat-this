// The home element vocabulary (`.hv-*` in css/style.css), rebuilt with the
// handful of constructs every email client renders the same way: tables,
// inline styles, flat colour.

import { Button, Img, Section, Text } from '@react-email/components';
import type { ArtAsset } from '../art.generated';
import { COLOR, LAYOUT } from '../theme';

/**
 * The ink CTA — `.hv-btn`. Live text, never an image: Outlook and a large
 * share of Gmail accounts block images by default, and an invisible button in
 * a login mail is a dead end. react-email's Button carries the mso padding
 * hack so the ink slab keeps its height in Outlook's Word engine.
 */
export function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      href={href}
      className="et-cta"
      style={{
        display: 'block',
        backgroundColor: COLOR.accent,
        color: COLOR.onAccent,
        borderRadius: `${LAYOUT.radiusControl}px`,
        fontSize: '17px',
        fontWeight: 700,
        letterSpacing: '0.01em',
        textAlign: 'center',
        textDecoration: 'none',
        padding: '17px 24px',
      }}
    >
      {label}
    </Button>
  );
}

/**
 * Brand-font art, sized from the generated manifest so copy edits can't skew it.
 *
 * Two things here exist purely for recipients whose client blocks images —
 * Outlook by default, and a large share of Gmail accounts:
 *
 *  * No `height` attribute. With one, a blocked image reserves its full box and
 *    leaves a conspicuous hole above the copy; without it the row collapses to
 *    the height of the alt text and the mail still reads as a mail.
 *  * `altStyle` colours and sizes the alt text. Clients render alt text in the
 *    img's own font and colour, so an unstyled headline degrades to small black
 *    body text — and on the ink masthead and footer, to black on black.
 */
export function ArtImage({
  art,
  appUrl,
  style,
  altStyle,
}: {
  art: ArtAsset;
  appUrl: string;
  style?: React.CSSProperties;
  altStyle?: Pick<React.CSSProperties, 'color' | 'fontSize' | 'fontWeight' | 'letterSpacing'>;
}) {
  return (
    <Img
      src={`${appUrl}/pics/email/${art.id}.png?v=${art.version}`}
      alt={art.alt}
      width={art.width}
      style={{
        display: 'block',
        border: 0,
        height: 'auto',
        maxWidth: '100%',
        ...altStyle,
        ...style,
      }}
    />
  );
}

/** The fine print directly under the CTA. */
export function Fineprint({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: '14px 0 0',
        fontSize: '13px',
        lineHeight: 1.55,
        color: COLOR.muted,
        textAlign: 'center',
      }}
    >
      {children}
    </Text>
  );
}

/** Ein Block auf der Ink-Fläche, mittig gesetzt wie die ganze Mail. */
export function Paper({
  children,
  padding = '38px 32px',
}: {
  children: React.ReactNode;
  padding?: string;
}) {
  return (
    <Section
      className="et-pad"
      style={{ backgroundColor: COLOR.surface, padding, textAlign: 'center' }}
    >
      {children}
    </Section>
  );
}

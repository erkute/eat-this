// The home element vocabulary (`.hv-*` in css/style.css), rebuilt with the
// handful of constructs every email client renders the same way: tables,
// inline styles, flat colour.

import { Button, Img, Section, Text } from '@react-email/components';
import type { ArtAsset } from '../art.generated';
import { COLOR, LAYOUT } from '../theme';

/**
 * Der gelbe Knopf — `.action` aus der Tour.
 *
 * Der Knopf selbst ist ein echter Link mit gelber Fläche; nur sein Wort ist ein
 * Bild in der Markenschrift (`art`), wie jede andere Zeile der Mail. Blockiert
 * ein Client Bilder (Outlook, viele Gmail-Konten), steht der Alt-Text in Ink
 * auf dem Gelb: der Knopf ist dann in Systemschrift beschriftet, aber nie
 * leer — und der Ersatz-Link darunter ist ohnehin echter Text.
 *
 * react-email's Button carries the mso padding hack so the slab keeps its
 * height in Outlook's Word engine.
 */
export function CtaButton({ href, art, appUrl }: { href: string; art: ArtAsset; appUrl: string }) {
  return (
    <Button
      href={href}
      className="et-cta"
      style={{
        /* So breit wie sein Wort plus Luft, nicht die ganze Spalte — ein
           Balken über 536 px war zu viel (Betreiber, 22.09.2026). Mittig
           steht er, weil der Block drumherum mittig gesetzt ist. */
        display: 'inline-block',
        minWidth: '200px',
        boxSizing: 'border-box',
        backgroundColor: COLOR.accent,
        color: COLOR.onAccent,
        borderRadius: `${LAYOUT.radiusControl}px`,
        textAlign: 'center',
        textDecoration: 'none',
        padding: '10px 40px',
      }}
    >
      <Img
        src={`${appUrl}/pics/email/${art.id}.png?v=${art.version}`}
        alt={art.alt}
        width={art.width}
        style={{
          display: 'inline-block',
          verticalAlign: 'middle',
          border: 0,
          height: 'auto',
          color: COLOR.onAccent,
          fontSize: '17px',
          fontWeight: 700,
        }}
      />
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

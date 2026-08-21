// The home element vocabulary (`.hv-*` in css/style.css), rebuilt with the
// handful of constructs every email client renders the same way: tables,
// inline styles, flat colour.

import { Button, Column, Img, Row, Section, Text } from '@react-email/components';
import type { ArtAsset } from '../art.generated';
import { COLOR, LAYOUT, MARKER_SIZE } from '../theme';

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
        backgroundColor: COLOR.ink,
        color: COLOR.inverse,
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
 * `.hv-kicker` — the small uppercase eyebrow above a hero headline. No yellow
 * square: on home the marker belongs to section heads, not to the hero.
 */
export function Kicker({ children }: { children: string }) {
  return (
    <Text
      style={{
        margin: '0 0 14px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: COLOR.ink,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * `.hv-head` — the yellow `.hv-mk` square followed by a red section title, on
 * one line. Two table cells rather than an inline-block: the 9px square must
 * not collapse, and a table cell is the one box model no client second-guesses.
 */
export function SectionHead({
  art,
  appUrl,
  style,
}: {
  art: ArtAsset;
  appUrl: string;
  style?: React.CSSProperties;
}) {
  return (
    <Row style={{ marginBottom: '10px', ...style }}>
      <Column width={MARKER_SIZE + 11} style={{ verticalAlign: 'bottom' }}>
        <div
          style={{
            width: `${MARKER_SIZE}px`,
            height: `${MARKER_SIZE}px`,
            backgroundColor: COLOR.accent,
            fontSize: '1px',
            lineHeight: '1px',
          }}
        >
          &nbsp;
        </div>
      </Column>
      <Column style={{ verticalAlign: 'bottom' }}>
        <ArtImage art={art} appUrl={appUrl} />
      </Column>
    </Row>
  );
}

/** Brand-font art, sized from the generated manifest so copy edits can't skew it. */
export function ArtImage({
  art,
  appUrl,
  style,
}: {
  art: ArtAsset;
  appUrl: string;
  style?: React.CSSProperties;
}) {
  return (
    <Img
      src={`${appUrl}/pics/email/${art.id}.png`}
      alt={art.alt}
      width={art.width}
      height={art.height}
      style={{ display: 'block', border: 0, height: 'auto', maxWidth: '100%', ...style }}
    />
  );
}

/** Body copy — `.hv-sub` at reading size. */
export function Lead({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Text style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, color: COLOR.muted, ...style }}>
      {children}
    </Text>
  );
}

/** The fine print directly under the CTA. */
export function Fineprint({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: '14px 0 0', fontSize: '13px', lineHeight: 1.55, color: COLOR.muted }}>
      {children}
    </Text>
  );
}

/** White page block with the card's horizontal rhythm. */
export function Paper({
  children,
  padding = '38px 32px',
}: {
  children: React.ReactNode;
  padding?: string;
}) {
  return (
    <Section className="et-pad" style={{ backgroundColor: COLOR.paper, padding }}>
      {children}
    </Section>
  );
}

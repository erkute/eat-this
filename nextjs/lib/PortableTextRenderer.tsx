import { Fragment, type ReactNode } from 'react';
import type {
  PortableTextBlock,
  MustEatCardBlock,
  SpotCardBlock,
  ArticleImageBlock,
} from './types';

type Span = {
  _type?: string;
  _key?: string;
  text?: string;
  marks?: string[];
};

type LinkDef = { _key: string; _type: 'link'; href?: string; blank?: boolean };
type MarkDef = LinkDef | { _key: string; _type: string };

type Block = PortableTextBlock & {
  style?: string;
  listItem?: string;
  children?: Span[];
  markDefs?: MarkDef[];
};

const CONTACT_EMAIL = 'hello@eatthisdot.com';

function normalizeDisplayText(text: string): string {
  return text.replace(/AMATŌ/g, 'AMATO').replace(/Amatō/g, 'Amato').replace(/amatō/g, 'amato');
}

/** Ein PARAMETRISIERTER Deep-Link in die Kartenansicht, z. B. `/map?r=sofi`
 *  oder `/en/map?me=…`. Diese bekommen rel="nofollow".
 *
 *  Der Grund war früher „/map ist noindex" — das stimmt seit dem 01.09.2026
 *  nicht mehr, die Karte ist die Landingpage für „Berlin Food Map". Geblieben
 *  ist der zweite Grund, und der trägt allein: jede Kombination aus `?r=`,
 *  `?me=`, `?bezirk=` und `?cat=` ist eine eigene URL, die auf dieselbe Seite
 *  kanonisiert. Ohne nofollow zählt die Search Console sie einzeln auf.
 *
 *  Das blanke `/map` ist deshalb bewusst ausgenommen: ein Guide, der im
 *  Fließtext auf die Karte verweist, soll das auch tun dürfen. */
function isMapLink(href: string): boolean {
  return /^\/(?:[a-z]{2}\/)?map\?/.test(href);
}

function renderLink(def: LinkDef, node: ReactNode): ReactNode {
  const href = def.href;
  if (!href) return node;
  const internal = href.startsWith('/');
  const rel = [isMapLink(href) ? 'nofollow' : null, internal ? null : 'noopener noreferrer']
    .filter(Boolean)
    .join(' ');
  const target = !internal && def.blank ? '_blank' : undefined;
  return (
    <a href={href} {...(rel ? { rel } : {})} {...(target ? { target } : {})}>
      {node}
    </a>
  );
}

function renderEmailText(text: string): ReactNode {
  if (!text.includes(CONTACT_EMAIL)) return text;

  const parts = text.split(CONTACT_EMAIL);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : null}
    </Fragment>
  ));
}

function renderSpan(span: Span, key: number, markDefs: MarkDef[] = []): ReactNode {
  const marks = span.marks ?? [];
  const hasExplicitLink = marks.some((mark) =>
    markDefs.some((d) => d._key === mark && d._type === 'link')
  );
  const text = normalizeDisplayText(span.text ?? '');
  let node: ReactNode = hasExplicitLink ? text : renderEmailText(text);
  for (const mark of marks) {
    if (mark === 'strong') node = <strong>{node}</strong>;
    else if (mark === 'em') node = <em>{node}</em>;
    else {
      // Annotation mark (key into markDefs) — currently only `link`.
      const def = markDefs.find((d) => d._key === mark);
      if (def && def._type === 'link') node = renderLink(def as LinkDef, node);
    }
  }
  return <span key={key}>{node}</span>;
}

function renderChildren(children: Span[] = [], markDefs: MarkDef[] = []): ReactNode {
  return children.map((c, i) => renderSpan(c, i, markDefs));
}

/** Concatenated plain text of a block's spans — used for heading anchors. */
function headingText(children: Span[] = []): string {
  return normalizeDisplayText(children.map((c) => c.text ?? '').join(''));
}

/** Deterministic ASCII anchor slug. Shared by the renderer (heading ids) and
 *  the article TOC so the #-links line up. */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Mirrors the shape of the legacy renderPortableText helper in app.min.js:
// handles block-level style (h2/h3/blockquote/normal), listItem (number/bullet),
// and inline marks (strong/em + link). Inline `mustEatCard` / `spotCard` blocks
// are delegated to the optional `renderMustEatCard` / `renderSpotCard` render-
// props (so this stays presentation-agnostic); callers that don't pass them
// simply skip those blocks. Inline `image` blocks work the same way via
// `renderImage`. Other unknown types skip.
export function PortableTextRenderer({
  blocks,
  renderMustEatCard,
  renderSpotCard,
  renderImage,
}: {
  blocks?: PortableTextBlock[];
  renderMustEatCard?: (block: MustEatCardBlock) => ReactNode;
  renderSpotCard?: (block: SpotCardBlock) => ReactNode;
  renderImage?: (block: ArticleImageBlock) => ReactNode;
}) {
  if (!blocks?.length) return null;

  const out: ReactNode[] = [];
  let listTag: 'ol' | 'ul' | null = null;
  let listItems: ReactNode[] = [];

  // Ein Fazit ist keine weitere Kapitelüberschrift, sondern der Schluss des
  // Textes — die Überschrift wird zum Etikett, und die Absätze darunter gehören
  // in denselben Block statt als Geschwister daneben. Solange einer offen ist,
  // laufen alle Knoten in seinen Körper; die nächste Überschrift schliesst ihn.
  let conclusion: { id: string; label: ReactNode; body: ReactNode[] } | null = null;
  const sink = () => (conclusion ? conclusion.body : out);

  const flushConclusion = () => {
    if (!conclusion) return;
    const done = conclusion;
    conclusion = null;
    out.push(
      <aside key={`conclusion-${out.length}`} id={done.id} data-block="conclusion">
        <p data-block="conclusion-label">{done.label}</p>
        {done.body}
      </aside>
    );
  };

  const flushList = () => {
    if (!listTag) return;
    const Tag = listTag;
    const target = sink();
    target.push(<Tag key={`list-${target.length}`}>{listItems}</Tag>);
    listTag = null;
    listItems = [];
  };

  for (const raw of blocks as Block[]) {
    if (raw._type === 'mustEatCard') {
      flushList();
      const card = renderMustEatCard?.(raw as unknown as MustEatCardBlock);
      if (card) sink().push(<Fragment key={raw._key ?? sink().length}>{card}</Fragment>);
      continue;
    }
    if (raw._type === 'spotCard') {
      flushList();
      const card = renderSpotCard?.(raw as unknown as SpotCardBlock);
      if (card) sink().push(<Fragment key={raw._key ?? sink().length}>{card}</Fragment>);
      continue;
    }
    if (raw._type === 'image') {
      flushList();
      const figure = renderImage?.(raw as unknown as ArticleImageBlock);
      if (figure) sink().push(<Fragment key={raw._key ?? sink().length}>{figure}</Fragment>);
      continue;
    }
    if (raw._type !== 'block') {
      flushList();
      continue;
    }

    if (raw.listItem) {
      const wantTag = raw.listItem === 'number' ? 'ol' : 'ul';
      if (listTag !== wantTag) {
        flushList();
        listTag = wantTag;
      }
      listItems.push(
        <li key={raw._key ?? listItems.length}>{renderChildren(raw.children, raw.markDefs)}</li>
      );
      continue;
    }

    flushList();
    const style = raw.style ?? 'normal';
    if (style === 'conclusion') {
      flushConclusion();
      conclusion = {
        id: slugifyHeading(headingText(raw.children)),
        label: renderChildren(raw.children, raw.markDefs),
        body: [],
      };
      continue;
    }
    if (style === 'h2' || style === 'h3') flushConclusion();
    const target = sink();
    const key = raw._key ?? target.length;
    if (style === 'h2')
      target.push(
        <h2 key={key} id={slugifyHeading(headingText(raw.children))}>
          {renderChildren(raw.children, raw.markDefs)}
        </h2>
      );
    else if (style === 'h3')
      target.push(
        <h3 key={key} id={slugifyHeading(headingText(raw.children))}>
          {renderChildren(raw.children, raw.markDefs)}
        </h3>
      );
    else if (style === 'blockquote')
      target.push(<blockquote key={key}>{renderChildren(raw.children, raw.markDefs)}</blockquote>);
    else target.push(<p key={key}>{renderChildren(raw.children, raw.markDefs)}</p>);
  }

  flushList();
  flushConclusion();
  return <>{out}</>;
}

/** The article's h2 chapters with the same anchor ids the renderer emits, so
 *  the rail's jump list and the headings can't drift apart. h3 stays out — the
 *  rail is a chapter list, not an outline. */
export function extractHeadings(blocks?: PortableTextBlock[]): { id: string; text: string }[] {
  if (!blocks?.length) return [];
  const seen = new Set<string>();
  const out: { id: string; text: string }[] = [];
  for (const raw of blocks as Block[]) {
    // 'conclusion' zaehlt mit: die Ueberschrift verschwindet nicht, sie wird zum
    // Etikett des Schlussblocks — und traegt dieselbe Ankerkennung.
    if (raw._type !== 'block' || raw.listItem) continue;
    if (raw.style !== 'h2' && raw.style !== 'conclusion') continue;
    const text = headingText(raw.children).trim();
    const id = slugifyHeading(text);
    if (!text || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, text });
  }
  return out;
}

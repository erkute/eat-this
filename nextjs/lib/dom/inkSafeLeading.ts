import { useLayoutEffect, type RefObject } from 'react';

/* Spot-Namen stehen eng (line-height 1.1), weil Providence weit unter die
   Grundlinie hängt: das g reicht 0,484em hinunter, ein l 0,699em hinauf.
   Kollisionsfrei für jeden Fall wären 1,18 — so weit aufgezogen stehen
   zweizeilige Namen aber sichtbar auseinander (User, 04.09.2026). Kracht es
   trotzdem, dann nur, wo eine Unterlänge genau über einer Oberlänge steht:
   „Burgermeister / Schlesisches Tor", das g über dem l (User, 09.10.2026).
   Gemessen an allen 247 Spots trifft das bei 1.1 zwei Namen.

   Deshalb misst der Hook die gesetzten Zeilen nach: Glyphen-Maße aus der
   geladenen Schrift (Canvas), Positionen aus dem Layout (Range je Zeichen).
   Liegt eine Unterlänge über einer Oberlänge, setzt er `--ink-lead` auf den
   Grundlinienabstand, der beide trennt; das CSS nimmt das Größere aus seiner
   eigenen Zeilenhöhe und diesem Wert. Alle anderen Namen bleiben eng. */

const GAP_EM = 0.06;

interface Glyph {
  asc: number;
  desc: number;
  left: number;
  right: number;
}

const glyphs = new Map<string, Glyph>();
let ctx: CanvasRenderingContext2D | null | undefined;

function glyph(font: string, ch: string): Glyph | null {
  const key = `${font}|${ch}`;
  const hit = glyphs.get(key);
  if (hit) return hit;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  ctx.font = font;
  const m = ctx.measureText(ch);
  const g = {
    asc: m.actualBoundingBoxAscent / 100,
    desc: m.actualBoundingBoxDescent / 100,
    left: m.actualBoundingBoxLeft / 100,
    right: m.actualBoundingBoxRight / 100,
  };
  glyphs.set(key, g);
  return g;
}

/** Grundlinienabstand in px, den die Tinte der Zeilen braucht — 0, wenn
 *  nichts kollidiert oder der Name auf eine Zeile passt. */
function requiredLead(el: HTMLElement): number {
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return 0;
  const text = node.textContent ?? '';
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  const font = `${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily}`;
  const range = document.createRange();
  const lines: { x: number; g: Glyph }[][] = [];
  let lineTop = NaN;
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    const start = i;
    i += ch.length;
    if (/\s/.test(ch)) continue;
    const g = glyph(font, ch);
    if (!g) return 0;
    range.setStart(node, start);
    range.setEnd(node, i);
    const { top, left } = range.getBoundingClientRect();
    if (!(Math.abs(top - lineTop) < size / 2)) {
      lines.push([]);
      lineTop = top;
    }
    lines[lines.length - 1].push({ x: left, g });
  }

  let need = 0;
  for (let l = 1; l < lines.length; l++) {
    for (const a of lines[l - 1]) {
      if (a.g.desc <= 0) continue;
      for (const b of lines[l]) {
        const overlap =
          Math.min(a.x + a.g.right * size, b.x + b.g.right * size) -
          Math.max(a.x - a.g.left * size, b.x - b.g.left * size);
        if (overlap > 0) need = Math.max(need, (a.g.desc + b.g.asc + GAP_EM) * size);
      }
    }
  }
  return need;
}

/** Hält die Zeilen eines Namens auseinander, wo Unter- und Oberlänge
 *  aufeinandertreffen. Das Element trägt den Namen als einzigen Textknoten;
 *  sein CSS liest `--ink-lead`, z. B. `line-height: max(1.1em, var(--ink-lead, 0px))`. */
export function useInkSafeLeading(ref: RefObject<HTMLElement | null>, text: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const apply = () => {
      const need = requiredLead(el);
      if (need > 0) el.style.setProperty('--ink-lead', `${Math.ceil(need)}px`);
      else el.style.removeProperty('--ink-lead');
    };
    /* Nur die Breite verschiebt die Umbrüche. Die Höhe ändert der Hook selbst
       — darauf neu zu messen, ergäbe dasselbe Ergebnis noch einmal. */
    let width = -1;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      apply();
    });
    ro.observe(el);
    /* Vor der Markenschrift misst der Canvas die Ersatzschrift — wie das
       Layout auch. Kommt Providence, gilt beides nicht mehr. */
    const onFonts = () => {
      glyphs.clear();
      apply();
    };
    document.fonts?.addEventListener('loadingdone', onFonts);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener('loadingdone', onFonts);
    };
  }, [ref, text]);
}

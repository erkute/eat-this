/**
 * Der Lead im Aufmacher („Die besten Spots …") tippt sich hin (Ansage
 * 07.10.2026, gewählt aus Mischen, Tippen und kleinem Stempel — Reinfliegen,
 * Gleiten und Handschrift abgelehnt): Zeichen für Zeichen an Ort und Stelle,
 * ein grauer Strich steht hinter dem letzten Zeichen, blinkt am Ende zweimal
 * und ist weg. Kein Wischen, keine Opacity — jedes Zeichen ist auf einmal da.
 *
 * Gibt die Animationen zurück, damit HubMotion auf ihr Ende warten und sie
 * beim Verlassen abbrechen kann, dazu die Dauer in ms, bis der Satz steht.
 * Jedes Wort ist ein eigenes `[data-lead-word]` mit genau einem Textknoten
 * (HubHeroCopy, `display: inline-block` in HubSection.module.css).
 */

export interface LeadEntrance {
  animations: Animation[];
  duration: number;
}

function typeLead(lead: HTMLElement, words: HTMLElement[]): LeadEntrance {
  const PER_CHAR = 26;
  const SPACE = 40;
  const animations: Animation[] = [];
  const origin = lead.getBoundingClientRect();
  const cursorStops: { x: number; y: number; h: number; at: number }[] = [];
  let at = 0;
  words.forEach((word) => {
    const node = word.firstChild;
    const box = word.getBoundingClientRect();
    if (!node || node.nodeType !== Node.TEXT_NODE || !box.width) return;
    const range = document.createRange();
    const length = (node.textContent ?? '').length;
    const start = at;
    const rights: number[] = [];
    for (let i = 1; i <= length; i++) {
      range.setStart(node, i - 1);
      range.setEnd(node, i);
      const right = range.getBoundingClientRect().right;
      rights.push(right - box.left);
      // Zeichen i (ab 1) steht ab start + (i − 1) · PER_CHAR.
      cursorStops.push({ x: right - origin.left, y: box.top - origin.top, h: box.height, at: start + (i - 1) * PER_CHAR });
    }
    // Ein Takt Vorlauf, in dem das Wort noch ganz verdeckt ist — so zeigt
    // `fill: backwards` vor dem Einsatz nichts statt des ersten Zeichens.
    const duration = (length + 1) * PER_CHAR;
    const shown = (right: number, last: boolean) => `inset(-25% ${last ? '-4px' : `${box.width - right}px`} -25% -4px)`;
    const frames: Keyframe[] = [{ clipPath: 'inset(-25% 100% -25% -4px)', offset: 0, easing: 'steps(1, end)' }];
    rights.forEach((right, i) => {
      frames.push({ clipPath: shown(right, i === length - 1), offset: (i + 1) / (length + 1), easing: 'steps(1, end)' });
    });
    frames.push({ clipPath: shown(0, true), offset: 1 });
    animations.push(word.animate(frames, { duration, delay: start - PER_CHAR, fill: 'backwards' }));
    at = start + length * PER_CHAR + SPACE;
  });
  const typed = Math.max(0, at - SPACE);

  // Der Strich steht in der Zeile hinter dem zuletzt getippten Zeichen, grau
  // in der Farbe des Leads (Ansage: „grau statt gelb").
  const cursor = document.createElement('span');
  cursor.setAttribute('aria-hidden', 'true');
  Object.assign(cursor.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '2px',
    background: 'currentColor',
    pointerEvents: 'none',
  });
  lead.style.position = 'relative';
  lead.appendChild(cursor);
  const BLINK = 520;
  const total = typed + BLINK * 2;
  const place = (stop: { x: number; y: number; h: number }) => ({
    transform: `translate(${stop.x + 3}px, ${stop.y + stop.h * 0.12}px)`,
    height: `${stop.h * 0.76}px`,
  });
  const first = cursorStops[0];
  if (first && total > 0) {
    const frames: Keyframe[] = [{ ...place(first), visibility: 'visible', offset: 0, easing: 'steps(1, end)' }];
    cursorStops.forEach((stop) => {
      frames.push({ ...place(stop), visibility: 'visible', offset: Math.min(1, stop.at / total), easing: 'steps(1, end)' });
    });
    const last = cursorStops[cursorStops.length - 1];
    [0.25, 0.5, 0.75].forEach((step, i) => {
      frames.push({
        ...place(last),
        visibility: i % 2 ? 'visible' : 'hidden',
        offset: Math.min(1, (typed + BLINK * 2 * step) / total),
        easing: 'steps(1, end)',
      });
    });
    frames.push({ ...place(last), visibility: 'hidden', offset: 1 });
    const blink = cursor.animate(frames, { duration: total, fill: 'both' });
    const remove = () => {
      cursor.remove();
      lead.style.position = '';
    };
    blink.finished.then(remove, remove);
    animations.push(blink);
  } else {
    cursor.remove();
    lead.style.position = '';
  }
  return { animations, duration: typed };
}

export function enterLead(leads: HTMLElement[]): LeadEntrance {
  return leads.reduce<LeadEntrance>(
    (all, lead) => {
      const one = typeLead(lead, Array.from(lead.querySelectorAll<HTMLElement>('[data-lead-word]')));
      return { animations: [...all.animations, ...one.animations], duration: Math.max(all.duration, one.duration) };
    },
    { animations: [], duration: 0 }
  );
}

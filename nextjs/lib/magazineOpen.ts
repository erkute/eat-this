/**
 * Ein Heft aufschlagen (02.10.2026, Ansage: „wenn man auf einen Artikel
 * klickt, öffnet sich das Magazin, und man landet im Artikel"). Läuft auf
 * jedem Heft, das MagazineLink trägt — Startseite, Magazin-Index, „Weiter auf
 * dem Teller".
 *
 * Drei Takte über einer eigenen Ebene, der Artikel lädt währenddessen darunter:
 *
 * 1. Das Heft hebt sich von seinem Platz in die Mitte und wird gross, der Tisch
 *    (eine Spur dunkler als die Seite) zieht sich als Kreis um es zu.
 * 2. Sobald der Artikel darunter steht, schwingt der Umschlag am Rücken auf.
 *    Die rechte Seite ist ein Fenster: durch sie sieht man den echten Artikel.
 * 3. Die rechte Seite wächst, bis sie das Fenster ist — man ist im Artikel,
 *    die Ebene verschwindet ohne Sprung, weil darunter genau das steht.
 *
 * Nur Transform und clip-path, keine Blende. Mit reduzierter Bewegung (oder
 * ohne Web Animations) gibt `openMagazine` false zurück und der Link
 * navigiert wie immer.
 */

export interface MagazineOpenClasses {
  overlay: string;
  table: string;
  book: string;
  page: string;
  leaf: string;
  front: string;
  back: string;
  backFolio: string;
  backMark: string;
}

interface Options {
  link: HTMLElement;
  cover: HTMLElement;
  /** Slug of the article — its page in the DOM ends the wait. */
  slug: string;
  /** Change the route only once the table covers the page, else the article
   *  would show around the rising cover. */
  navigate: () => void;
  classes: MagazineOpenClasses;
}

const IDENTITY = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';
/** Longest wait for the article before the magazine opens anyway. */
const LANDING_TIMEOUT = 6000;
/** Longest wait for the lead photo, so the window does not open on a hole. */
const PHOTO_TIMEOUT = 700;

const LIFT = { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };
const OPEN = { duration: 640, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' };
const ENTER = { duration: 480, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' };

let busy = false;

export function canOpenMagazine(): boolean {
  if (typeof window === 'undefined' || typeof Element === 'undefined') return false;
  if (typeof Element.prototype.animate !== 'function') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A rendered frame — with a timer behind it, because a hidden tab never
 *  paints and rAF would wait forever. */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 100);
  });

/** Wait for an animation. The timer is only the net for a tab that went to
 *  the background mid-way — generous, so a slow frame never cuts a take
 *  short and starts the next one early. */
function done(animation: Animation, timing: { duration: number }): Promise<void> {
  return Promise.race([
    animation.finished.then(() => undefined),
    sleep(timing.duration * 3 + 1000),
  ]).catch(() => undefined);
}

function waitFor(selector: string, timeout: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }
    const finish = (el: Element | null) => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(el);
    };
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) finish(el);
    });
    const timer = setTimeout(() => finish(null), timeout);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function photoReady(page: Element): Promise<void> {
  const photo = page.querySelector('header img');
  if (!(photo instanceof HTMLImageElement) || photo.complete) return;
  await Promise.race([photo.decode().catch(() => undefined), sleep(PHOTO_TIMEOUT)]);
}

/** Size and place of the closed magazine: centred, upright 3:4, as large as
 *  the window allows with room around it. Opened, the whole spread — cover on
 *  the left, the article on the right — has to be seen (Ansage: „das Magazin
 *  muss aufklappen, und da drin steht der Artikel"): it moves half a page
 *  right to sit in the middle, and where two pages are wider than the window
 *  (every phone) it shrinks until they fit. */
export function bookGeometry(vw: number, vh: number) {
  const narrow = vw < 768;
  const h = Math.min(vh * 0.74, 720, (narrow ? vw * 0.76 : vw * 0.38) / 0.75);
  const w = h * 0.75;
  const spread = Math.min(1, (vw - 32) / (2 * w));
  return {
    w,
    h,
    left: (vw - w) / 2,
    top: (vh - h) / 2,
    spread,
    shift: (w / 2) * spread,
    scaleX: vw / w,
    scaleY: vh / h,
  };
}

/** Returns false when the link should navigate on its own. */
export function openMagazine(options: Options): boolean {
  if (busy || !canOpenMagazine()) return false;
  busy = true;
  void run(options).finally(() => {
    busy = false;
  });
  return true;
}

async function run({ link, cover, slug, navigate, classes }: Options) {
  const landing = `[data-page="news-article"][data-article-slug="${CSS.escape(slug)}"]`;
  const overlay = document.createElement('div');
  overlay.className = classes.overlay;
  overlay.setAttribute('aria-hidden', 'true');
  // Kein Scrollen unter der Ebene: der Artikel soll oben ankommen.
  const block = (event: Event) => event.preventDefault();
  overlay.addEventListener('wheel', block, { passive: false });
  overlay.addEventListener('touchmove', block, { passive: false });

  const table = document.createElement('div');
  table.className = classes.table;
  const book = document.createElement('div');
  book.className = classes.book;
  const page = document.createElement('div');
  page.className = classes.page;
  const leaf = document.createElement('div');
  leaf.className = classes.leaf;
  const front = document.createElement('div');
  front.className = classes.front;
  const back = document.createElement('div');
  back.className = classes.back;

  // Die Innenseite des Umschlags: oben dieselbe Heftzeile wie vorn, unten
  // klein das Logo — wie das Impressum eines Hefts.
  const folioText = cover.querySelector('[data-cover-folio]')?.textContent ?? '';
  if (folioText) {
    const folio = document.createElement('span');
    folio.className = classes.backFolio;
    folio.textContent = folioText;
    back.append(folio);
  }
  const mark = document.createElement('img');
  mark.className = classes.backMark;
  mark.src = '/pics/eat-this-logo.webp';
  mark.alt = '';
  back.append(mark);

  const clone = cover.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img').forEach((img) => {
    img.loading = 'eager';
  });
  front.append(clone);
  leaf.append(front, back);
  book.append(page, leaf);
  overlay.append(table, book);

  const from = cover.getBoundingClientRect();
  const style = getComputedStyle(link);
  const tilt = style.transform && style.transform !== 'none' ? style.transform : IDENTITY;
  const turn = style.rotate && style.rotate !== 'none' ? style.rotate : '0deg';

  document.body.append(overlay);
  const vw = overlay.clientWidth;
  const vh = overlay.clientHeight;
  const g = bookGeometry(vw, vh);
  Object.assign(book.style, {
    left: `${g.left}px`,
    top: `${g.top}px`,
    width: `${g.w}px`,
    height: `${g.h}px`,
  });

  const startX = from.left + from.width / 2 - (g.left + g.w / 2);
  const startY = from.top + from.height / 2 - (g.top + g.h / 2);
  const startScale = (cover.offsetWidth || from.width) / g.w;
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const reach = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));

  link.style.visibility = 'hidden';
  try {
    // 1 — hochheben, der Tisch zieht sich zu.
    const lift = book.animate(
      [
        {
          transform: `translate(${startX}px, ${startY}px) scale(${startScale}) rotate(${turn}) ${tilt}`,
        },
        { transform: `translate(0px, 0px) scale(1) rotate(0deg) ${IDENTITY}` },
      ],
      { ...LIFT, fill: 'forwards' }
    );
    const close = table.animate(
      [
        { clipPath: `circle(0px at ${cx}px ${cy}px)` },
        { clipPath: `circle(${reach}px at ${cx}px ${cy}px)` },
      ],
      { ...LIFT, fill: 'forwards' }
    );
    await Promise.all([done(lift, LIFT), done(close, LIFT)]);
    navigate();
    const landed = await waitFor(landing, LANDING_TIMEOUT);
    if (landed) await photoReady(landed);
    await nextFrame();

    // 2 — aufschlagen. Die Seite übernimmt den Tisch (gleiche Farbe, ohne
    // Sprung) und ist innen ein Fenster auf den Artikel.
    page.style.visibility = 'visible';
    table.remove();
    const opening = leaf.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }],
      { ...OPEN, fill: 'forwards' }
    );
    // Vorder- und Innenseite tauschen genau bei 90°, nicht über
    // `backface-visibility`: WebKit zeigte die Innenseite sonst schon in der
    // ersten Hälfte, gespiegelt, über der Titelseite. Gleiche Kurve wie die
    // Drehung, deshalb trifft Offset 0.5 genau die Kante.
    const hide = [
      { visibility: 'visible' },
      { visibility: 'visible', offset: 0.5 },
      { visibility: 'hidden', offset: 0.5 },
      { visibility: 'hidden' },
    ];
    const show = [
      { visibility: 'hidden' },
      { visibility: 'hidden', offset: 0.5 },
      { visibility: 'visible', offset: 0.5 },
      { visibility: 'visible' },
    ];
    front.animate(hide, { ...OPEN, fill: 'forwards' });
    back.animate(show, { ...OPEN, fill: 'forwards' });
    const centre = book.animate(
      [
        { transform: 'translateX(0px) scale(1)' },
        { transform: `translateX(${g.shift}px) scale(${g.spread})` },
      ],
      { ...OPEN, fill: 'forwards' }
    );
    await Promise.all([done(opening, OPEN), done(centre, OPEN)]);

    // 3 — hinein: die Seite wächst bis an den Fensterrand.
    const enter = book.animate(
      [
        { transform: `translateX(${g.shift}px) scale(${g.spread})` },
        { transform: `translateX(0px) scale(${g.scaleX}, ${g.scaleY})` },
      ],
      { ...ENTER, fill: 'forwards' }
    );
    await done(enter, ENTER);
  } finally {
    overlay.remove();
    link.style.visibility = '';
  }
}

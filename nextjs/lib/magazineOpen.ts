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
 *    Auf der rechten Seite steht schon der Artikel — der echte, verkleinert
 *    wie eine gedruckte Seite: sein erster Bildschirm, ohne die Kopfleiste
 *    der Website (Ansagen 02.10.: „beim Aufklappen muss der Artikel schon auf
 *    der Seite stehen, dann zoomt man rein" — „ohne Header").
 * 3. Hineinzoomen: Seite und Artikel wachsen gemeinsam bis an den Rand. Am
 *    Ende steht der Artikel in voller Grösse genau dort, wo er ohnehin steht —
 *    die Ebene verschwindet ohne Sprung, und erst dann rutscht die
 *    Kopfleiste von oben herein.
 *
 * Der Artikel auf der Seite ist die echte Seite unter der Ebene, durch die
 * rechte Seite hindurch gesehen und per Transform auf deren Fläche gelegt.
 * Die Seite bewegt sich in jedem Takt linear im Fortschritt derselben Kurve —
 * deshalb bleibt der Artikel mit gleicher Kurve und gleicher Dauer auf ihr.
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
  shadow: string;
  gutter: string;
  strip: string;
  front: string;
  back: string;
  skin: string;
  inside: string;
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
const NAV = { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

/** The cover is thin paper, not a board (Ansage: „wie ein Magazin, nicht
 *  wie ein Buch"): it turns in strips, each a little ahead of the one before,
 *  so it bends while it opens and lies flat at both ends. */
const STRIPS = 3;
/** How far the outer edge leads the spine at the middle of the turn. */
const BEND = 36;
/** The bend over the turn (offset, share of BEND); flat at both ends. */
const BEND_CURVE: [number, number][] = [
  [0, 0],
  [0.25, 0.7],
  [0.5, 1],
  [0.75, 0.7],
  [1, 0],
];

let busy = false;

function bendAt(p: number): number {
  for (let i = 1; i < BEND_CURVE.length; i++) {
    const [p1, v1] = BEND_CURVE[i];
    const [p0, v0] = BEND_CURVE[i - 1];
    if (p <= p1) return v0 + ((v1 - v0) * (p - p0)) / (p1 - p0);
  }
  return 0;
}

/** Progress at which strip `i` stands edge-on (90°) — where its front and
 *  back change places. Strip 0 turns evenly, each further strip adds its
 *  share of the bend. */
export function edgeOnAt(i: number): number {
  const angle = (p: number) => 180 * p + (i * BEND * bendAt(p)) / (STRIPS - 1);
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 30; n++) {
    const mid = (lo + hi) / 2;
    if (angle(mid) < 90) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Visibility that flips at `at` (progress of the turn). */
function flip(at: number, from: 'visible' | 'hidden', to: 'visible' | 'hidden'): Keyframe[] {
  return [
    { visibility: from },
    { visibility: from, offset: at },
    { visibility: to, offset: at },
    { visibility: to },
  ];
}

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

/** Wait until the page draws smoothly again — a few frames in a row, each
 *  on time. Right after the route change the browser is busy building the
 *  article; a turn started then ran out while nothing was drawn, and Safari
 *  showed the magazine shut in one frame and open in the next. Never longer
 *  than `limit`: the magazine waits shut meanwhile. */
function settled(limit = 1200): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    let last = start;
    let smooth = 0;
    const tick = (now: number) => {
      smooth = now - last < 34 ? smooth + 1 : 0;
      last = now;
      if (smooth >= 4 || now - start > limit) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(resolve, limit + 200);
  });
}

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

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the right page lies: closed in the middle, opened in the spread,
 *  and at the end as the whole window. Mirrors the book's transforms (centre
 *  origin), so each state can be computed without reading the screen. */
export function pageRects(g: ReturnType<typeof bookGeometry>, vw: number, vh: number) {
  const cx = g.left + g.w / 2;
  const cy = g.top + g.h / 2;
  return {
    closed: { x: g.left, y: g.top, w: g.w, h: g.h },
    open: {
      x: cx + g.shift - (g.spread * g.w) / 2,
      y: cy - (g.spread * g.h) / 2,
      w: g.spread * g.w,
      h: g.spread * g.h,
    },
    full: { x: 0, y: 0, w: vw, h: vh },
  };
}

/** The article's first screen (`sw` × `sh`, below the site's header) shrunk
 *  onto a page: as large as it fits whole, centred across, from the top. Wide
 *  windows fill the width (and the page shows how the text runs on below), a
 *  phone's tall screen fills the height and leaves ink margins — the article
 *  ground. */
export function onPage(r: Rect, sw: number, sh: number) {
  const k = Math.min(r.w / sw, r.h / sh);
  return { k, x: r.x + (r.w - k * sw) / 2, y: r.y };
}

/** Transform (origin top left) that lays the article, standing at `at` on
 *  the screen, onto the page. */
function placeOn(page: Rect, vw: number, vh: number, at: DOMRect): string {
  const m = onPage(page, vw, vh - at.top);
  return `translate(${m.x - at.left}px, ${m.y - at.top}px) scale(${m.k})`;
}

/** Returns false when the link should navigate on its own. */
export function openMagazine(options: Options): boolean {
  if (busy || !canOpenMagazine()) return false;
  busy = true;
  void run(options)
    .catch(() => undefined)
    .finally(() => {
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

  const div = (className: string) => {
    const el = document.createElement('div');
    el.className = className;
    return el;
  };
  const table = div(classes.table);
  const book = div(classes.book);
  const page = div(classes.page);
  const shadow = div(classes.shadow);
  const gutter = div(classes.gutter);
  book.append(page, shadow, gutter);
  overlay.append(table, book);

  // Die Innenseite des Umschlags: oben dieselbe Heftzeile wie vorn, unten
  // klein das Logo — wie das Impressum eines Hefts.
  const folioText = cover.querySelector('[data-cover-folio]')?.textContent ?? '';
  const inside = () => {
    const el = div(classes.inside);
    if (folioText) {
      const folio = document.createElement('span');
      folio.className = classes.backFolio;
      folio.textContent = folioText;
      el.append(folio);
    }
    const mark = document.createElement('img');
    mark.className = classes.backMark;
    mark.src = '/pics/eat-this-logo.webp';
    mark.alt = '';
    el.append(mark);
    return el;
  };
  const skin = () => {
    const el = div(classes.skin);
    const clone = cover.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
    });
    el.append(clone);
    return el;
  };

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

  // Der Umschlag in Streifen, jeder im vorigen verschachtelt und an dessen
  // rechter Kante angeschlagen. Vorn zeigt jeder seinen Teil der Titelseite,
  // hinten seinen Teil der Innenseite — die liegt aufgeschlagen links vom
  // Rücken, der innerste Streifen also an ihrem rechten Ende. 2px Überlappung
  // gegen Haarfugen.
  const stripW = g.w / STRIPS;
  const strips: { strip: HTMLElement; front: HTMLElement; back: HTMLElement }[] = [];
  let holder: HTMLElement = book;
  for (let i = 0; i < STRIPS; i++) {
    const strip = div(classes.strip);
    strip.style.left = `${i === 0 ? 0 : stripW}px`;
    strip.style.width = `${stripW + (i < STRIPS - 1 ? 2 : 0)}px`;
    const front = div(classes.front);
    const back = div(classes.back);
    const outside = skin();
    outside.style.width = `${g.w}px`;
    outside.style.left = `${-i * stripW}px`;
    const inner = inside();
    inner.style.width = `${g.w}px`;
    inner.style.left = `${-(g.w - (i + 1) * stripW)}px`;
    front.append(outside);
    back.append(inner);
    strip.append(front, back);
    holder.append(strip);
    holder = strip;
    strips.push({ strip, front, back });
  }

  const startX = from.left + from.width / 2 - (g.left + g.w / 2);
  const startY = from.top + from.height / 2 - (g.top + g.h / 2);
  const startScale = (cover.offsetWidth || from.width) / g.w;
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  const reach = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));

  // Was auf die Seite gelegt wird (der Artikel) und wie es dort hinkommt.
  const scene: { el: HTMLElement; at: DOMRect }[] = [];
  const nav = document.getElementById('navbar');
  const sceneAnimations: Animation[] = [];

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
    await settled();

    // Den Artikel auf die Seite legen, bevor sie sichtbar wird. Die
    // Kopfleiste der Website gehört nicht auf die Heftseite: sie wartet über
    // dem Rand, bis man gelandet ist. Ohne Übergang — sie klappt am Telefon
    // per `transition` weg, und ein laufender Übergang schlüge jede Animation.
    const rects = pageRects(g, vw, vh);
    if (nav) {
      nav.style.transition = 'none';
      nav.style.transform = 'translateY(calc(-100% - 2px))';
    }
    if (landed instanceof HTMLElement) {
      const at = landed.getBoundingClientRect();
      scene.push({ el: landed, at });
      landed.style.transformOrigin = '0 0';
      landed.style.transform = placeOn(rects.closed, vw, vh, at);
      // Nur zeichnen, was auf der Seite zu sehen ist: verkleinert zeigt sie
      // am meisten vom Artikel, und der ist fast 10 000px lang — als eine
      // Ebene war das in Safari zu schwer für eine flüssige Drehung.
      const shown = rects.closed.h / onPage(rects.closed, vw, vh - at.top).k;
      const keep = Math.max(shown, vh - at.top) + 40;
      landed.style.clipPath = `inset(0 0 ${Math.max(0, at.height - keep)}px 0)`;
    }
    // Zuletzt endet der Artikel ohne Transform, also genau an seinem Platz
    // unter der Kopfleiste.
    const moveScene = (fromRect: Rect, toRect: Rect | null, timing: typeof OPEN) =>
      scene.map(({ el, at }) =>
        el.animate(
          [
            { transform: placeOn(fromRect, vw, vh, at) },
            { transform: toRect ? placeOn(toRect, vw, vh, at) : 'translate(0px, 0px) scale(1)' },
          ],
          { ...timing, fill: 'forwards' }
        )
      );

    // 2 — aufschlagen. Die Seite übernimmt den Tisch (gleiche Farbe, ohne
    // Sprung); auf ihr steht schon der Artikel.
    page.style.visibility = 'visible';
    table.remove();
    gutter.style.visibility = 'visible';
    // Der innerste Streifen dreht gleichmässig um den Rücken, jeder weitere
    // eilt ihm um seinen Teil der Biegung voraus. Vorder- und Rückseite
    // tauschen, wenn ein Streifen genau auf der Kante steht — nicht über
    // `backface-visibility`: WebKit zeigte die Innenseite sonst schon in der
    // ersten Hälfte, gespiegelt, über der Titelseite. Gleiche Kurve wie die
    // Drehung, deshalb treffen die Offsets genau die Kante.
    const turning = strips.map(({ strip, front, back }, i) => {
      front.animate(flip(edgeOnAt(i), 'visible', 'hidden'), { ...OPEN, fill: 'forwards' });
      back.animate(flip(edgeOnAt(i), 'hidden', 'visible'), { ...OPEN, fill: 'forwards' });
      const frames: Keyframe[] =
        i === 0
          ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }]
          : BEND_CURVE.map(([offset, share]) => ({
              offset,
              transform: `rotateY(${(-BEND * share) / (STRIPS - 1)}deg)`,
            }));
      return strip.animate(frames, { ...OPEN, fill: 'forwards' });
    });
    const centre = book.animate(
      [
        { transform: 'translateX(0px) scale(1)' },
        { transform: `translateX(${g.shift}px) scale(${g.spread})` },
      ],
      { ...OPEN, fill: 'forwards' }
    );
    sceneAnimations.push(...moveScene(rects.closed, rects.open, OPEN));
    await Promise.all([...turning.map((t) => done(t, OPEN)), done(centre, OPEN)]);

    // 3 — hineinzoomen: Seite und Artikel wachsen bis an den Fensterrand.
    const enter = book.animate(
      [
        { transform: `translateX(${g.shift}px) scale(${g.spread})` },
        { transform: `translateX(0px) scale(${g.scaleX}, ${g.scaleY})` },
      ],
      { ...ENTER, fill: 'forwards' }
    );
    sceneAnimations.push(...moveScene(rects.open, null, ENTER));
    // Der Falzschatten zieht sich zum Rücken zurück, damit am Ende kein
    // dunkler Streifen über dem Artikel liegt.
    gutter.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      ...ENTER,
      fill: 'forwards',
    });
    await done(enter, ENTER);
  } finally {
    overlay.remove();
    link.style.visibility = '';
    // Am Ende steht der Artikel wieder ohne Transform — dieselbe Lage, die
    // die letzte Animation zeigt, also ohne Sprung.
    for (const { el } of scene) {
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.clipPath = '';
    }
    sceneAnimations.forEach((animation) => animation.cancel());
    if (nav?.style.transform) {
      // Die Kopfleiste rutscht herein, sobald man im Artikel steht.
      nav.style.transform = '';
      void done(
        nav.animate(
          [{ transform: 'translateY(calc(-100% - 2px))' }, { transform: 'translateY(0px)' }],
          NAV
        ),
        NAV
      ).then(() => {
        nav.style.transition = '';
      });
    }
  }
}

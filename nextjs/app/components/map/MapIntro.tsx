import { getMapSeoCopy } from '@/lib/map/mapSeoCopy';
import styles from './MapIntro.module.css';

interface Props {
  locale: string;
}

/**
 * Der Kopf der Kartenseite: die einzige H1, schwebend über der Karte, mittig
 * zwischen Suchknopf und Burger.
 *
 * Sie stand bis zum 01.09.2026 im Listen-Panel über der Chip-Leiste. Auf dem
 * Desktop war sie dort dauerhaft sichtbar und scrollte nie weg (User); über der
 * Karte kostet sie der Liste keinen Pixel und beschriftet die Fläche, um die es
 * geht. Gestaltet wie Suche und Burger daneben: Ink auf der Karte, weißer Halo,
 * keine Fläche.
 *
 * Nur der Titel, kein Untertitel: die Zeile darunter stand am 01.09.2026 kurz
 * hier und flog auf Wunsch wieder raus. Ihre Begriffe trägt die
 * Meta-Description und der Block am Listenende — der Seite fehlt nichts.
 *
 * Bewusst ohne `'use client'` und ohne Hooks: der Text soll im ausgelieferten
 * HTML stehen (Crawler lesen ihn ohne JavaScript, und er ist damit auch das
 * erste serverseitig gemalte Element der Seite). Weil ihn eine Client-Komponente
 * einbindet, landet er trotzdem im Client-Bundle — das ist hier ein konstanter
 * String, keine Logik.
 *
 * Rendert in JEDEM Zustand, auch im Detail: die Kartenfläche bleibt ja stehen.
 * Deshalb tragen RestaurantDetail, LockedDetail und MustEatDetailMobile seit
 * demselben Tag `h2` — die URL ist /map, das Detail ist ein Panel darin.
 */
export default function MapIntro({ locale }: Props) {
  const copy = getMapSeoCopy(locale);
  return (
    <div className={styles.intro}>
      <h1 className={styles.title}>{copy.h1}</h1>
    </div>
  );
}

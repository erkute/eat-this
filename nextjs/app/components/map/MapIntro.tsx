import { getMapSeoCopy } from '@/lib/map/mapSeoCopy';
import styles from './MapIntro.module.css';

interface Props {
  locale: string;
}

/**
 * Die einzige H1 der Kartenseite: im HTML, aber nicht im Bild
 * (MapIntro.module.css). Oben stehen nur Suche, Burger und Karte. Für Crawler
 * und Screenreader ist sie die Überschrift der Seite, mit demselben Text wie
 * der Seitentitel.
 *
 * Bewusst ohne `'use client'` und ohne Hooks: Der Text soll im ausgelieferten
 * HTML stehen (Crawler lesen ihn ohne JavaScript). Weil ihn eine
 * Client-Komponente einbindet, landet er trotzdem im Client-Bundle; das ist
 * hier ein konstanter String, keine Logik.
 *
 * Rendert in jedem Zustand, auch im Detail. Deshalb tragen RestaurantDetail und
 * MustEatDetailMobile `h2`: Die URL ist /map, das Detail ist ein Panel darin.
 */
export default function MapIntro({ locale }: Props) {
  const copy = getMapSeoCopy(locale);
  return <h1 className={styles.title}>{copy.h1}</h1>;
}

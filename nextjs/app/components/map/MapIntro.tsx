import { getMapSeoCopy } from '@/lib/map/mapSeoCopy';
import styles from './MapIntro.module.css';

interface Props {
  locale: string;
}

/**
 * Die einzige H1 der Kartenseite — im HTML, aber nicht im Bild.
 *
 * Sie schwebte bis zum 23.09.2026 als „BERLIN FOOD MAP" über der Karte und ist
 * seitdem visuell ausgeblendet (MapIntro.module.css): oben stehen nur Suche,
 * Burger und Karte. Für Crawler und Screenreader bleibt sie die Überschrift der
 * Seite, mit demselben Text wie der Seitentitel.
 *
 * Bewusst ohne `'use client'` und ohne Hooks: der Text soll im ausgelieferten
 * HTML stehen (Crawler lesen ihn ohne JavaScript). Weil ihn eine
 * Client-Komponente einbindet, landet er trotzdem im Client-Bundle — das ist
 * hier ein konstanter String, keine Logik.
 *
 * Rendert in JEDEM Zustand, auch im Detail. Deshalb tragen RestaurantDetail und
 * MustEatDetailMobile `h2` — die URL ist /map, das Detail ist ein Panel darin.
 */
export default function MapIntro({ locale }: Props) {
  const copy = getMapSeoCopy(locale);
  return <h1 className={styles.title}>{copy.h1}</h1>;
}

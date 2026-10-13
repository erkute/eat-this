import { Link } from '@/i18n/navigation';
import type { CSSProperties } from 'react';
import type { RestaurantCard } from '@/lib/types';
import { normalizeName } from '@/lib/normalizeName';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import { categoryArt } from '@/lib/categoryArt';
import Image from './SiteImage';
import MapIntentLink from './MapIntentLink';
import DiscoveryArrival from './DiscoveryArrival';
import DiscoveryMotion from './DiscoveryMotion';
import SpotLink from './SpotLink';
import styles from './DiscoveryDetail.module.css';

export default function DiscoveryDetail({
  kind,
  slug,
  name,
  description,
  updated,
  photos,
  locale,
}: {
  kind: 'bezirk' | 'kategorie';
  slug: string;
  name: string;
  description: string;
  updated: string;
  photos: RestaurantCard[];
  locale: 'de' | 'en';
}) {
  const de = locale === 'de';
  const packArt = kind === 'kategorie' ? categoryArt(slug) : null;
  const pictures = photos.filter((r) => r.photo).slice(0, 2);
  return (
    <header className={`${styles.header} ${kind === 'kategorie' ? styles.category : ''} ${packArt ? styles.withPack : ''}`}>
      <DiscoveryArrival />
      <DiscoveryMotion />
      {kind === 'kategorie' && <Link className={styles.back} href="/kategorie">
        {de ? 'Alle Kategorien' : 'All categories'}
      </Link>}
      <div className={styles.head}>
        {kind === 'bezirk' && <Link className={styles.back} href="/bezirk">
          {de ? 'Alle Bezirke' : 'All districts'}
        </Link>}
        <h1 className={styles.title} style={{ '--title-fit': `${100 / (name.length * 0.85)}cqi` } as CSSProperties}>
          {kind === 'bezirk' && <span>Restaurants in </span>}
          {name}
          {kind === 'kategorie' && <span> in Berlin</span>}
        </h1>
      </div>
      {packArt && (
        <div className={styles.categoryPack} data-discovery-motion data-category-pack aria-hidden="true">
          <Image src={packArt} alt="" width={240} height={360}
            sizes="(max-width: 767px) 96px, 140px" priority />
        </div>
      )}
      <div className={styles.copy}>
        {description && <p className={styles.description}>{description}</p>}
        {kind === 'bezirk' && <div className={styles.actions}>
          <a href="#restaurants" className={styles.primary}>
            {de ? 'Die Spots entdecken' : 'Explore the spots'}
          </a>
          <MapIntentLink
            href={`/map?${kind === 'bezirk' ? 'bezirk' : 'cat'}=${slug}`}
            rel="nofollow"
            className={styles.map}
          >
            {de ? 'Auf der Map' : 'On the map'}
          </MapIntentLink>
        </div>}
        {updated && (
          <p className={styles.updated}>{de ? `Stand ${updated}` : `Updated ${updated}`}</p>
        )}
      </div>
      {kind === 'bezirk' && <div className={styles.photos}>
      {pictures.map((picture, index) => (
        <figure className={styles.figure} key={picture._id} data-discovery-motion>
          <SpotLink href={`/restaurant/${picture.slug}`} className={styles.photoLink}>
          <span className={styles.photo} data-spot-photo>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-discovery-hero={index === 0 ? '' : undefined}
            src={picture.photo}
            srcSet={sanitySrcSet(picture.photo, [480, 800, 1200])}
            sizes="(max-width: 767px) 60vw, 360px"
            alt=""
            loading="eager"
          />
          </span>
          <span className={styles.caption}>{normalizeName(picture.name)}</span>
          </SpotLink>
        </figure>
      ))}
      </div>}
    </header>
  );
}

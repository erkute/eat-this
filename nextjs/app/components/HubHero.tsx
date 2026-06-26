import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { normalizeName } from '@/lib/normalizeName';
import HubMapCTA from './HubMapCTA';
import { formatHeroDate } from '@/lib/home/formatHeroDate';
import type { HomeSpot } from '@/lib/home/getHomeData';
import styles from './HubHero.module.css';

interface Props {
  spot: HomeSpot;
  /** ISO date (YYYY-MM-DD) for the kicker. */
  today: string;
}

export default function HubHero({ spot, today }: Props) {
  const t = useTranslations('hub.hero');
  const locale = useLocale() as 'de' | 'en';
  const dateLabel = formatHeroDate(today, locale);
  const labels =
    locale === 'en'
      ? {
          berlin: 'Berlin',
          district: 'District',
          mustEats: 'Must Eats',
          today: 'Today',
          menu: 'Menu',
          item: 'Spot of the day',
        }
      : {
          berlin: 'Berlin',
          district: 'Bezirk',
          mustEats: 'Must Eats',
          today: 'Heute',
          menu: 'Menü',
          item: 'Spot des Tages',
        };

  return (
    <section className={styles.hero} data-hub-hero="">
      <div className={styles.frame}>
        <h1 className={styles.srTitle}>EAT THIS</h1>

        <div className={styles.dateRail} aria-hidden="true">
          <span>{labels.today}</span>
          <strong>{dateLabel || labels.item}</strong>
        </div>

        <div className={styles.visual}>
          {spot.image ? (
            <div className={styles.photo} aria-hidden="true">
              <Image src={spot.image} alt="" fill sizes="(min-width: 900px) 58vw, 100vw" priority />
            </div>
          ) : (
            <div className={styles.photoEmpty} aria-hidden="true" />
          )}
        </div>

        <div className={styles.panel}>
          <p className={styles.kicker}>{t('kicker')}</p>
          <h2 className={styles.headline}>{normalizeName(spot.name)}</h2>
          {spot.sub && <p className={styles.sub}>{normalizeName(spot.sub)}</p>}
        </div>

        <div className={styles.menuPanel}>
          <div className={styles.panelTop} aria-hidden="true">
            <span>{labels.item}</span>
            <span>{labels.berlin}</span>
          </div>
          <dl className={styles.rows}>
            <div>
              <dt>{labels.district}</dt>
              <dd>{spot.district || labels.berlin}</dd>
            </div>
            <div>
              <dt>{labels.mustEats}</dt>
              <dd>{spot.mustEatCount}</dd>
            </div>
            <div>
              <dt>{labels.today}</dt>
              <dd>{dateLabel || labels.item}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <HubMapCTA href={`/map?r=${spot.slug}`} title={t('toMap')} variant="chip" />
            <Link href={`/restaurant/${spot.slug}`} className={styles.read}>
              {t('read')} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className={styles.footerLeft} aria-hidden="true">
          Eat This Berlin
        </div>
        <div className={styles.footerMid} aria-hidden="true">
          {labels.menu}
        </div>
        <div className={styles.footerRight} aria-hidden="true">
          {spot.district || labels.berlin}
        </div>
      </div>
    </section>
  );
}

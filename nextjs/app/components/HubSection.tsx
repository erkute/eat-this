import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { normalizeName } from '@/lib/normalizeName'
import type { HomeData } from '@/lib/home/getHomeData'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import HubFaq from './HubFaq'
import HubDeineWelt from './HubDeineWelt'
import HubFragRemy from './HubFragRemy'
import HubHashScroll from './HubHashScroll'
import HubMustEatsTeaser from './HubMustEatsTeaser'
import MapIntentLink from './MapIntentLink'
import SiteFooter from './SiteFooter'
import styles from './HubSection.module.css'

interface Props {
  initialData: HomeData
  initialMapData: InitialMapData
  locale: 'de' | 'en'
}

const copy = {
  de: {
    nav: ['Spots', 'Must Eats', 'Map'],
    heroCta: 'Zur Map',
    spotDay: 'Spot des Tages',
    openSpot: 'Lesen',
    track: 'Spot',
    latest: 'Neu auf der Map',
    latestSub: 'Neue Spots, frisch auf deiner Map.',
    eatTitle: 'Das willst du essen.',
    eatSub: 'Jede Karte ist ein Gericht, das wir dir ans Herz legen: unsere klare Empfehlung für genau dieses Restaurant.',
    districts: 'Bezirke',
    districtsSub: 'Spots nach Bezirk.',
    magazine: 'Auf den Teller',
    readArticle: 'Lesen',
  },
  en: {
    nav: ['Spots', 'Must Eats', 'Map'],
    heroCta: 'Open map',
    spotDay: 'Spot of the day',
    openSpot: 'Read',
    track: 'Spot',
    latest: 'New on the map',
    latestSub: 'New spots, fresh on your map.',
    eatTitle: 'This is what to eat.',
    eatSub: 'Every card is a dish we stand behind: our clear recommendation for that exact restaurant.',
    districts: 'Districts',
    districtsSub: 'Spots by district.',
    magazine: 'On the plate',
    readArticle: 'Read',
  },
}

const homeDishCutouts = [
  {
    dish: 'Burger',
    restaurant: 'All In',
    src: '/pics/home-dishes/allin-single-burger.webp',
    href: '/map?cat=fast-food',
    restaurantHref: '/map?r=all-in',
  },
  {
    dish: 'Pizza',
    restaurant: 'Gazzo',
    src: '/pics/home-dishes/gazzo-aubergine.webp',
    href: '/map?cat=pizza',
    restaurantHref: '/map?r=gazzo',
  },
  {
    dish: 'Sardinen',
    restaurant: 'Fischladen',
    src: '/pics/home-dishes/sardinen-print.webp',
    href: '/map?cat=lunch',
    restaurantHref: '/map?r=sardinen-bar',
  },
  {
    dish: 'Rinderschaufel',
    restaurant: 'Schüsseldienst',
    src: '/pics/home-dishes/rinderschaufel-print.webp',
    href: '/map?cat=dinner',
    restaurantHref: '/map?r=schuesseldienst',
  },
  {
    dish: 'Döner',
    restaurant: 'Uludag',
    src: '/pics/home-dishes/uludag-doener-print.webp',
    href: '/map?cat=fast-food',
    restaurantHref: '/map?r=bursa-uludag-kebapcisi',
  },
  {
    dish: 'Galette',
    restaurant: 'Bubar',
    src: '/pics/home-dishes/bubar-galette-print.webp',
    href: '/map?cat=lunch',
    restaurantHref: '/map?r=bubar-crepes-und-galettes',
  },
  {
    dish: 'Grilled Cheese',
    restaurant: 'AERA',
    src: '/pics/home-dishes/grilled-cheese-print.webp',
    href: '/map?cat=lunch',
    restaurantHref: '/map?r=aera',
  },
  {
    dish: 'Pizza',
    restaurant: 'The Grain',
    src: '/pics/home-dishes/the-grain-pizza-print.webp',
    href: '/map?cat=dinner',
    restaurantHref: '/map?r=the-grain',
  },
]

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const t = copy[locale]
  const spot = initialData.spotOfDay
  const latest = initialData.newOnMap.slice(0, 4)
  const districts = initialData.districts.slice(0, 5)
  const articles = initialData.magazine.slice(0, 6)

  return (
    <div className={`page ${styles.page}`} data-hub="" data-cassette-home="">
      <HubHashScroll />

      <HubDeineWelt initialMapData={initialMapData} />

      <section className={styles.hero}>
        <div className={styles.heroBody}>
          {!spot && (
            <div className={styles.heroCopy}>
              <div className={styles.heroActions}>
                <MapIntentLink href="/map" rel="nofollow" className={styles.redButton}>
                  {t.heroCta}
                </MapIntentLink>
              </div>
            </div>
          )}

          {spot && (
            <aside className={styles.heroSpot} aria-label={t.spotDay}>
              <div className={styles.heroSpotFrame}>
                {spot.image && (
                  <div className={styles.heroSpotPhoto}>
                    <Image src={spot.image} alt="" fill sizes="(min-width: 960px) 48vw, 92vw" />
                  </div>
                )}
                <div className={`${styles.heroSpotOverlay} ${!spot.image ? styles.heroSpotOverlayStatic : ''}`}>
                  <span className={styles.heroSpotLabel}>{t.spotDay}</span>
                  <strong>{normalizeName(spot.name)}</strong>
                  {spot.sub && <p>{normalizeName(spot.sub)}</p>}
                  <div className={styles.heroSpotActions}>
                    <MapIntentLink href={`/map?r=${spot.slug}`} rel="nofollow" className={styles.redButton}>
                      {t.heroCta}
                    </MapIntentLink>
                    <Link href={`/restaurant/${spot.slug}`} className={styles.whiteButton}>
                      {t.openSpot}
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

      <HubFragRemy />

      <section className={styles.latest}>
        <div className={styles.sectionHead}>
          <h2>{t.latest}</h2>
          <p>{t.latestSub}</p>
        </div>
        <div className={styles.latestGrid}>
          {latest.map((card) => (
            <MapIntentLink key={card._id} href={`/map?r=${card.slug}`} rel="nofollow" className={styles.spotCard}>
              <span className={styles.cardImage}>
                {card.image && (
                  <Image src={card.image} alt="" fill sizes="(max-width: 760px) 50vw, 25vw" />
                )}
              </span>
              <strong>{normalizeName(card.name)}</strong>
              <span>{card.district || card.category}</span>
            </MapIntentLink>
          ))}
        </div>
      </section>

      <HubMustEatsTeaser initialMapData={initialMapData} />

      <section className={styles.indexBlock}>
        <div className={styles.redPanel}>
          <p className={styles.smallCaps}>Auf dem Teller</p>
          <h2>{t.eatTitle}</h2>
          <p>{t.eatSub}</p>
        </div>
        <div className={styles.foodStrip}>
          {homeDishCutouts.map((item) => {
            const restaurantHref = item.restaurantHref ?? item.href
            return (
              <article key={item.src} className={styles.foodCard}>
                <MapIntentLink href={item.href} rel="nofollow" className={styles.foodImageLink} aria-label={`${item.dish} auf der Map anzeigen`}>
                  <span className={styles.foodImage}>
                    <Image src={item.src} alt="" fill sizes="(max-width: 760px) 50vw, 20vw" />
                  </span>
                </MapIntentLink>
                <span className={styles.foodMeta}>
                  <MapIntentLink href={item.href} rel="nofollow" className={styles.foodDishLink}>
                    <strong>{item.dish}</strong>
                  </MapIntentLink>
                  <MapIntentLink href={restaurantHref} rel="nofollow" className={styles.foodRestaurantLink}>
                    {item.restaurant}
                  </MapIntentLink>
                </span>
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.districtSection}>
        <div className={styles.districtPanel}>
          <div className={styles.sectionHead}>
            <h2>{t.districts}</h2>
            <p>{t.districtsSub}</p>
          </div>
          <div className={styles.districtRows}>
            {districts.map((district, index) => (
              <div key={district.slug} className={styles.listRow}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.districtCopy}>
                  <MapIntentLink href={`/map?bezirk=${district.slug}`} rel="nofollow" className={styles.districtName}>
                    <strong>{district.name}</strong>
                  </MapIntentLink>
                  <span className={styles.districtSpots}>
                    {district.spots.slice(0, 3).map((spot) => (
                      <MapIntentLink key={spot.slug} href={`/map?r=${spot.slug}`} rel="nofollow" className={styles.districtSpotLink}>
                        {normalizeName(spot.name)}
                      </MapIntentLink>
                    ))}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.magSection}>
        <div className={styles.magPanel}>
          <div className={styles.sectionHead}>
            <h2>{t.magazine}</h2>
          </div>
          <div className={styles.articleRows}>
            {articles.map((article) => (
              <Link key={article.slug} href={`/news/${article.slug}`} className={styles.articleRow}>
                {article.image && <Image src={article.image} alt="" width={440} height={340} />}
                <span className={styles.articleCopy}>
                  <em>{article.kicker}</em>
                  <strong>{article.title}</strong>
                  <span className={styles.articleCta}>{t.readArticle}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HubFaq locale={locale} />
      <SiteFooter />
    </div>
  )
}

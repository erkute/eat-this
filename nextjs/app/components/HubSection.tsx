import HubHero from './HubHero'
import HubNewOnMap from './HubNewOnMap'
import HubMustEatsTeaser from './HubMustEatsTeaser'
import HubDishPoster from './HubDishPoster'
import HubCategories from './HubCategories'
import HubBezirke from './HubBezirke'
import HubMagazine from './HubMagazine'
import HubPacks from './HubPacks'
import HubAllBerlin from './HubAllBerlin'
import HubFaq from './HubFaq'
import HubNearby from './HubNearby'
import HubDeineWelt from './HubDeineWelt'
import HubFragRemy from './HubFragRemy'
import HubHashScroll from './HubHashScroll'
import SiteFooter from './SiteFooter'
import styles from './HubSection.module.css'
import { UserLocationProvider } from '@/lib/map/UserLocationContext'
import type { HomeData } from '@/lib/home/getHomeData'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

interface Props {
  initialData: HomeData
  initialMapData: InitialMapData
  locale: 'de' | 'en'
}

export default function HubSection({ initialData, initialMapData, locale }: Props) {
  const spot = initialData.spotOfDay
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className={`page ${styles.collage}`} style={{ display: 'flow-root' }} data-hub="">
      <UserLocationProvider>
        <HubHashScroll />
        <HubDeineWelt initialMapData={initialMapData} />
        {spot ? <HubHero spot={spot} today={today} /> : <h1>Eat This</h1>}
        <HubDishPoster />
        <HubFragRemy />
        <HubNearby initialMapData={initialMapData} />
        <HubNewOnMap cards={initialData.newOnMap} />
        <HubMustEatsTeaser initialMapData={initialMapData} />
        <HubMagazine articles={initialData.magazine} />
        <HubCategories categories={initialData.categories} />
        <HubBezirke districts={initialData.districts} />
        <HubAllBerlin />
        <HubPacks categoryNames={initialData.categoryNames} />
        <HubFaq locale={locale} />
        <SiteFooter />
      </UserLocationProvider>
    </div>
  )
}

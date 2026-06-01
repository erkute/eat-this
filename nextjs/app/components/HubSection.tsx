import HubHero from './HubHero'
import HubNewOnMap from './HubNewOnMap'
import HubCategories from './HubCategories'
import HubBezirkOfWeek from './HubBezirkOfWeek'
import HubMagazine from './HubMagazine'
import HubPacks from './HubPacks'
import HubAllBerlin from './HubAllBerlin'
import HubFaq from './HubFaq'
import HubNearby from './HubNearby'
import HubDeineWelt from './HubDeineWelt'
import SiteFooter from './SiteFooter'
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
    <div className="page" style={{ display: 'flow-root' }} data-hub="">
      <UserLocationProvider>
        <HubDeineWelt initialMapData={initialMapData} />
        {spot ? <HubHero spot={spot} today={today} /> : <h1>Eat This</h1>}
        <HubNearby initialMapData={initialMapData} />
        <HubNewOnMap cards={initialData.newOnMap} />
        <HubCategories categories={initialData.categories} />
        <HubBezirkOfWeek bezirk={initialData.bezirkOfWeek} />
        <HubMagazine articles={initialData.magazine} />
        <HubPacks categoryNames={initialData.categoryNames} />
        <HubAllBerlin />
        <HubFaq locale={locale} />
        <SiteFooter />
      </UserLocationProvider>
    </div>
  )
}

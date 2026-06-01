import type { HomeData } from '@/lib/home/getHomeData'

interface Props {
  initialData: HomeData
  locale: 'de' | 'en'
}

export default function HubSection({ initialData }: Props) {
  const spot = initialData.spotOfDay
  return (
    <div className="page" style={{ display: 'flow-root' }} data-hub="">
      <section data-hub-hero="">
        {spot ? (
          <>
            <p>Spot des Tages</p>
            <h1>{spot.name}</h1>
            {spot.district ? <p>{spot.district}</p> : null}
          </>
        ) : (
          <h1>Eat This</h1>
        )}
      </section>
    </div>
  )
}

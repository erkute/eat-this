'use client';

/**
 * BridgeCMSData — fetches must-eats + restaurants from Sanity and writes
 * them into window._albumCards / window._allSpots for legacy consumers
 * (favourites.min.js reads _allSpots in the profile-favs grid).
 *
 * Replaces the IIFE in app.min.js that called window.CMS.fetchMustEats /
 * fetchRestaurants. Direct @sanity/client fetch removes the dependency on
 * cms.min.js loading first.
 *
 * Remove once favourites.min.js is migrated and no consumer reads the globals.
 */

import { useEffect } from 'react';
import { client } from '@/lib/sanity';

const MUST_EATS_QUERY = `*[_type == "mustEat"] | order(order asc) {
  _id,
  dish,
  restaurant,
  district,
  price,
  "imageUrl": image.asset->url + "?w=600&auto=format&q=80",
  order
}`;

const RESTAURANTS_QUERY = `*[_type == "restaurant"] | order(name asc) {
  _id,
  name,
  district,
  address,
  categories,
  price,
  lat,
  lng,
  mapsUrl,
  website,
  reservationUrl,
  openingHours,
  tip,
  "photo": image.asset->url + "?w=800&auto=format&q=80",
  "mustEats": *[_type == "mustEat" && restaurantRef._ref == ^._id] | order(order asc)[0...3]{dish,"photo":image.asset->url + "?w=300&auto=format&q=80"}
}`;

type Spot = Record<string, unknown> & { categories?: string[]; type?: string };

declare global {
  interface Window {
    _albumCards?: unknown[];
    _allSpots?: Spot[];
  }
}

export default function BridgeCMSData() {
  useEffect(() => {
    let cancelled = false;

    client
      .fetch<unknown[]>(MUST_EATS_QUERY)
      .then((data) => {
        if (cancelled) return;
        window._albumCards = data || [];
      })
      .catch((e: Error) => console.warn('[CMS] Must-Eats fetch failed:', e.message));

    client
      .fetch<Spot[]>(RESTAURANTS_QUERY)
      .then((data) => {
        if (cancelled) return;
        if (data && data.length) {
          window._allSpots = data.map((r) => ({ ...r, type: (r.categories || []).join(' · ') }));
        }
      })
      .catch((e: Error) => console.warn('[CMS] Restaurants fetch failed:', e.message));

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

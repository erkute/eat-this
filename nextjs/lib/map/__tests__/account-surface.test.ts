import { describe, expect, it, vi } from 'vitest';
import type { MapMustEat, MapRestaurant } from '@/lib/types';

/* Der Spot-des-Tages zieht Sanity — hier zaehlt nur die Ableitung darum
   herum, also ein fester Wert. */
vi.mock('@/lib/home/spotOfDay.server', () => ({
  getSpotOfDayId: async () => null,
}));

import { composeAccountSurface } from '../visible-restaurants.server';
import { REVEALED_TARGET } from '../revealed-must-eats';

function restaurant(id: string, categories?: { slug: string }[]): MapRestaurant {
  return {
    _id: id,
    _createdAt: '2026-01-01',
    name: `Spot ${id}`,
    slug: `spot-${id}`,
    lat: 52.5,
    lng: 13.4,
    mustEatCount: 1,
    ...(categories ? { categories: categories as MapRestaurant['categories'] } : {}),
  } as MapRestaurant;
}

function mustEat(id: string, restaurantId: string): MapMustEat {
  return {
    _id: id,
    restaurant: {
      _id: restaurantId,
      name: `Spot ${restaurantId}`,
      slug: `spot-${restaurantId}`,
      lat: 52.5,
      lng: 13.4,
    },
  };
}

/* Zwoelf Spots mit je einer Karte: mehr als das Schaufenster (zehn) fasst,
   damit „verdeckt" ueberhaupt ein Zustand ist, den dieser Test sehen kann. */
const IDS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const ALL = IDS.map((n) => restaurant(`r${n}`));
const ALL_MUST_EATS = IDS.map((n) => mustEat(`m${n}`, `r${n}`));
/** Was das Schaufenster nicht mehr fasst (stabile _id-Ordnung). */
const COVERED = ['m06', 'm07', 'm08', 'm09', 'm10', 'm11', 'm12'];

const EMPTY_ENT = {
  isAdmin: false,
  hasAllBerlin: false,
  categorySlugs: new Set<string>(),
  mustEatIds: new Set<string>(),
  coveredMustEatIds: new Set<string>(),
};

function compose(over: Record<string, unknown> = {}) {
  return composeAccountSurface({
    all: ALL,
    allMustEats: ALL_MUST_EATS,
    ent: EMPTY_ENT,
    unlockedIds: new Set<string>(),
    today: '2026-08-31',
    ...over,
  } as Parameters<typeof composeAccountSurface>[0]);
}

/* Diese Ableitung stand bis zum 31.08.2026 zweimal da — in /api/map-data und
   in publicDeck.server.ts — und ist auseinandergelaufen: der Admin-Zweig
   fehlte in der zweiten Kopie, das geteilte Deck meldete „0 von 24", waehrend
   das Profil desselben Kontos „24 von 24" zeigte. Kein Test hielt die beiden
   zusammen. Jetzt gibt es nur noch eine Definition, und hier steht sie fest. */
describe('composeAccountSurface', () => {
  /* Die eine Zeile, an der der ganze Umbau vom 06.09.2026 haengt: es gibt
     keine gesperrten SPOTS mehr, fuer niemanden. Gestaffelt ist nur der
     Kartenstapel. */
  it('gibt jedem jeden Spot — auch ohne Konto', async () => {
    const s = await compose();

    expect(s.restaurants).toHaveLength(ALL.length);
    expect(s.fullCatalog).toBe(false);
  });

  /* Ein Konto ohne alles (frisch, das Starter Pack noch nicht da) sieht das
     Schaufenster und sonst nichts — das Deck zeigt, was einem gehoert. */
  it('zeigt einem Konto ohne alles nur das Schaufenster, und das ganz offen', async () => {
    const s = await compose();

    expect(s.faceUpIds.size).toBe(REVEALED_TARGET);
    expect(s.mustEats).toHaveLength(REVEALED_TARGET);
    for (const id of COVERED) expect(s.faceUpIds.has(id)).toBe(false);
  });

  /* Ein GAST dagegen sieht jeden Ruecken (Betreiber, 07.09.2026): jeder ist
     die Frage „was liegt darunter?", und die Antwort ist die Anmeldung. Offen
     bleibt trotzdem nur das Schaufenster. */
  it('zeigt einem Gast den ganzen Stapel, offen aber nur das Schaufenster', async () => {
    const s = await compose({ guest: true });

    expect(s.mustEats).toHaveLength(ALL_MUST_EATS.length);
    expect(s.faceUpIds.size).toBe(REVEALED_TARGET);
    for (const id of COVERED) expect(s.faceUpIds.has(id)).toBe(false);
    expect(s.fullCatalog).toBe(false);
  });

  /* Das Starter Pack: was es verdeckt vergibt, ist SICHTBAR (Ruecken im
     Album), aber nicht offen. Genau dieser Unterschied traegt die halbe
     Mechanik — ohne ihn waere die verdeckte Haelfte unsichtbar und wertlos. */
  it('zeigt verdeckt vergebene Karten als Ruecken, nicht als offen', async () => {
    const s = await compose({
      ent: { ...EMPTY_ENT, coveredMustEatIds: new Set(['m11', 'm12']) },
    });

    expect(s.mustEats.map((m) => m._id)).toContain('m11');
    expect(s.faceUpIds.has('m11')).toBe(false);
    expect(s.mustEats).toHaveLength(REVEALED_TARGET + 2);
  });

  it('gibt dem Admin den ganzen Katalog, und zwar offen', async () => {
    const s = await compose({ ent: { ...EMPTY_ENT, isAdmin: true } });

    expect(s.fullCatalog).toBe(true);
    expect(s.restaurants).toHaveLength(ALL.length);
    expect(s.faceUpIds.size).toBe(ALL_MUST_EATS.length);
  });

  /* All-Berlin ist gekauft, nicht vergeben — muss aber dasselbe ergeben.
     Genau diese zweite Bedingung ist beim Kopieren verloren gegangen. */
  it('behandelt all-berlin wie den Admin', async () => {
    const admin = await compose({ ent: { ...EMPTY_ENT, isAdmin: true } });
    const allBerlin = await compose({ ent: { ...EMPTY_ENT, hasAllBerlin: true } });

    expect(allBerlin.fullCatalog).toBe(admin.fullCatalog);
    expect([...allBerlin.faceUpIds].sort()).toEqual([...admin.faceUpIds].sort());
    expect(allBerlin.restaurants.length).toBe(admin.restaurants.length);
  });

  /* Ein leeres Face-up-Set waere hier still falsch: die Sammlung faellt sonst
     auf `m.image` zurueck, und das haengt an einer Hydration, die nicht jeder
     Aufrufer macht. */
  it('laesst das Face-up-Set des Admins nie leer', async () => {
    const s = await compose({ ent: { ...EMPTY_ENT, isAdmin: true } });

    expect(s.faceUpIds.size).toBe(ALL_MUST_EATS.length);
  });

  it('vereinigt eigene Aufdeckungen und gekaufte Karten', async () => {
    const s = await compose({
      ent: { ...EMPTY_ENT, mustEatIds: new Set(['m11']) },
      unlockedIds: new Set(['m12']),
    });

    expect(s.fullCatalog).toBe(false);
    expect(s.faceUpIds.has('m11')).toBe(true); // gekauft
    expect(s.faceUpIds.has('m12')).toBe(true); // vor Ort aufgedeckt
  });

  /* Ein Kategorie-Pack wird live gegen den Katalog aufgeloest, nicht aus dem
     Schnappschuss im Entitlement gelesen: wer das Pizza-Pack kauft und drei
     Wochen spaeter eine neue Pizza-Karte erscheinen sieht, hat sie mitgekauft.
     `mustEatIds` ist hier bewusst leer — genau das ist der Fall, den ein
     Schnappschuss nicht abdeckt. */
  it('loest ein gekauftes Kategorie-Pack gegen den heutigen Katalog auf', async () => {
    const all = [...ALL.slice(0, 11), restaurant('r12', [{ slug: 'pizza' }])];
    const s = await compose({
      all,
      ent: { ...EMPTY_ENT, categorySlugs: new Set(['pizza']) },
    });

    expect(s.faceUpIds.has('m12')).toBe(true);
    // Die Kategorie oeffnet NUR ihre eigenen Karten.
    expect(s.faceUpIds.has('m11')).toBe(false);
  });

  it('meldet fuer ein Konto ohne alles keinen vollen Katalog', async () => {
    expect((await compose()).fullCatalog).toBe(false);
  });
});

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { INSIGHT_PAGE_BUDGET, type InsightBeacon } from './engagement';

let cache: { day: string; keys: Set<string> } | null = null;
export const insightHeatId = (path: string) => Buffer.from(path).toString('base64url');
export async function writeInsight(
  db: Firestore,
  day: string,
  beacon: InsightBeacon
): Promise<void> {
  const ref = db.collection('analytics_engagement').doc(day);
  if (!cache || cache.day !== day) cache = { day, keys: new Set() };
  // Neue Seitenschlüssel instanzübergreifend reservieren. Erst nach erfolgreichem
  // Commit lokal merken; ein fehlgeschlagener Schreibversuch verbraucht kein Budget.
  const allowed =
    cache.keys.has(beacon.path) ||
    (await db.runTransaction(async (transaction) => {
      const data = (await transaction.get(ref)).data();
      const pages = data?.pages ?? {};
      if (Object.hasOwn(pages, beacon.path)) return true;
      if (
        Object.keys(pages).filter((key) => !key.startsWith('_other_')).length >= INSIGHT_PAGE_BUDGET
      )
        return false;
      transaction.set(
        ref,
        { day, pages: { [beacon.path]: { surface: beacon.surface } } },
        { merge: true }
      );
      return true;
    }));
  if (allowed) cache.keys.add(beacon.path);
  const path = allowed ? beacon.path : `_other_${beacon.surface}`;
  const inc = FieldValue.increment(1);
  const counts = Object.fromEntries(beacon.signals.map((signal) => [signal, inc]));
  const batch = db.batch();
  batch.set(
    ref,
    {
      day,
      surfaces: { [beacon.surface]: { [beacon.device]: counts } },
      pages: { [path]: { surface: beacon.surface, devices: { [beacon.device]: counts } } },
    },
    { merge: true }
  );
  if (beacon.click && path === beacon.path) {
    const heatRef = db
      .collection('analytics_heat')
      .doc(insightHeatId(path))
      .collection('days')
      .doc(day);
    batch.set(
      heatRef,
      {
        day,
        path,
        heat: { [beacon.device]: { [beacon.click.section]: { [beacon.click.cell]: inc } } },
        targets: { [beacon.device]: { [beacon.click.target]: inc } },
      },
      { merge: true }
    );
  }
  await batch.commit();
}
export function resetInsightCache() {
  cache = null;
}

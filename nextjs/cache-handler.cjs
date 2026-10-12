'use strict';

// ISR-Cache für mehrere Cloud-Run-Instanzen.
//
// Nexts eingebauter FileSystemCache hält, welcher Tag wann invalidiert wurde,
// in einer Map im Prozess. Auf App Hosting laufen aber mehrere Instanzen
// nebeneinander (am 09.10.2026 bis zu vier gleichzeitig), und der Sanity-Webhook
// auf /api/revalidate landet auf genau einer davon. Alle anderen zeigten den
// alten Stand weiter, bis die 24-Stunden-Frist ablief. Dieser Handler schreibt
// jede Invalidierung zusätzlich nach Firestore und gleicht den Stand vor jedem
// Cache-Zugriff ab, höchstens alle SYNC_INTERVAL_MS.
//
// Zweitens: Next 15.5 setzt einen Tag nur, wenn er noch NICHT in der Map steht
// (`if (!tagsManifest.has(tag)) tagsManifest.set(tag, Date.now())`). Pro
// Instanz griff damit nur die erste Invalidierung eines Tags; jede weitere –
// etwa die zweite Änderung am selben Spot oder jede Änderung an einem anderen
// Spot über den Sammel-Tag `restaurant` – lief ins Leere. Hier wird der
// Zeitpunkt bei jedem Aufruf neu gesetzt.
//
// Seiten und Daten liegen weiter im FileSystemCache der Instanz; geteilt wird
// nur die kleine Tabelle Tag → Zeitpunkt.

const FileSystemCache =
  require('next/dist/server/lib/incremental-cache/file-system-cache').default;
const { tagsManifest } = require('next/dist/server/lib/incremental-cache/tags-manifest.external');

const COLLECTION = '_revalidatedTags';
const DOC_ID = 'shared';
const SYNC_INTERVAL_MS = 15_000;
const SYNC_TIMEOUT_MS = 1_000;
// Ältere Einträge braucht niemand mehr: nach 24 Stunden ist jede Seite über
// die ISR-Frist ohnehin abgelaufen (SANITY_REVALIDATE_SECONDS).
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;

// Firestore-Feldnamen dürfen keine Punkte tragen und `__…__` ist reserviert;
// Tags wie `_N_T_/de/restaurant/comedor` laufen deshalb kodiert.
const encodeTag = (tag) => encodeURIComponent(tag).replace(/\./g, '%2E').replace(/_/g, '%5F');
const decodeTag = (key) => decodeURIComponent(key);

/**
 * @param {{
 *   read: () => Promise<Record<string, number>>,
 *   write: (entries: Record<string, number>, cutoff: number) => Promise<void>,
 * }} store
 */
function createSharedTags(store, { now = Date.now, manifest = tagsManifest } = {}) {
  let lastSync = 0;
  let inFlight = null;

  function apply(entries) {
    for (const [key, ts] of Object.entries(entries || {})) {
      if (typeof ts !== 'number') continue;
      const tag = decodeTag(key);
      const local = manifest.get(tag);
      if (local === undefined || ts > local) manifest.set(tag, ts);
    }
  }

  async function sync() {
    if (now() - lastSync < SYNC_INTERVAL_MS) return;
    if (!inFlight) {
      inFlight = store
        .read()
        .then((entries) => {
          apply(entries);
          lastSync = now();
        })
        .catch((err) => {
          // Fällt Firestore aus, bleibt es beim Verhalten ohne Abgleich –
          // die Seite wird trotzdem ausgeliefert. Erst nach dem Intervall neu
          // versuchen, sonst hängt jede Anfrage an einem toten Backend.
          lastSync = now();
          console.error('[cache-handler] Tag-Abgleich fehlgeschlagen', err);
        })
        .finally(() => {
          inFlight = null;
        });
    }
    let timer;
    await Promise.race([
      inFlight,
      new Promise((resolve) => {
        timer = setTimeout(resolve, SYNC_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
  }

  async function publish(tags, ts) {
    const entries = {};
    for (const tag of tags) entries[encodeTag(tag)] = ts;
    try {
      await store.write(entries, ts - KEEP_MS);
    } catch (err) {
      console.error('[cache-handler] Tag-Invalidierung nicht geteilt', err);
    }
  }

  return { sync, publish, apply };
}

// Neuer Stand gewinnt, alte Einträge fallen raus – die Tabelle bleibt klein.
function mergeTags(existing, entries, cutoff) {
  const tags = {};
  for (const [key, ts] of Object.entries(existing)) {
    if (typeof ts === 'number' && ts >= cutoff) tags[key] = ts;
  }
  for (const [key, ts] of Object.entries(entries)) {
    if (!(tags[key] >= ts)) tags[key] = ts;
  }
  return tags;
}

function createFirestoreStore() {
  // Eigener Client statt firebase-admin-App: eine zusätzliche App in
  // getApps() würde lib/firebase/admin.ts als „bestehende“ App aufgreifen –
  // ohne storageBucket. Der Client nutzt die Standard-Anmeldedaten der
  // Instanz (App Hosting: das Dienstkonto des Backends).
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({
    projectId: process.env.FIREBASE_EXPECTED_PROJECT_ID || undefined,
    ignoreUndefinedProperties: true,
  });
  const ref = db.collection(COLLECTION).doc(DOC_ID);

  return {
    async read() {
      const snap = await ref.get();
      return (snap.exists && snap.get('tags')) || {};
    },
    async write(entries, cutoff) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        tx.set(ref, { tags: mergeTags((snap.exists && snap.get('tags')) || {}, entries, cutoff) });
      });
    },
  };
}

// Nur auf Cloud Run (K_SERVICE), nicht im Build und nicht lokal: ein lokaler
// Produktionslauf mit den Admin-Schlüsseln aus .env.local schriebe sonst in
// die Prod-Datenbank.
function sharedEnabled() {
  return (
    Boolean(process.env.K_SERVICE) &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.REVALIDATE_SHARED_TAGS !== 'off'
  );
}

// Next erzeugt den Handler pro Anfrage neu; der Abgleich lebt pro Prozess.
let shared;
function getShared() {
  if (shared === undefined) shared = sharedEnabled() ? createSharedTags(createFirestoreStore()) : null;
  return shared;
}

class CacheHandler extends FileSystemCache {
  async revalidateTag(...args) {
    let [tags] = args;
    tags = typeof tags === 'string' ? [tags] : tags || [];
    if (tags.length === 0) return;
    const ts = Date.now();
    for (const tag of tags) tagsManifest.set(tag, ts);
    const s = getShared();
    if (s) await s.publish(tags, ts);
  }

  async get(...args) {
    const s = getShared();
    if (s) await s.sync();
    return super.get(...args);
  }
}

module.exports = CacheHandler;
module.exports.createSharedTags = createSharedTags;
module.exports.mergeTags = mergeTags;
module.exports.encodeTag = encodeTag;
module.exports.decodeTag = decodeTag;
module.exports.SYNC_INTERVAL_MS = SYNC_INTERVAL_MS;

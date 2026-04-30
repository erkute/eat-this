# Map Session Handoff — 2026-04-30

> Übergabe nach der Google-Maps-Gesture-Session. Alles deployed auf `main`.

## Was diese Session erledigt hat

### Shipped (Commit `8817909`)

| Was | Datei |
|---|---|
| Google Maps-Style Gesture-Zones: CategoryFilter (Zone C) aus Header-Drag-Zone herausgezogen | `MapSection.tsx`, `map.module.css` |
| CORS-Fix: Server-Side Sanity-Proxy `/api/map-data` | `nextjs/app/api/map-data/route.ts`, `useMapData.ts` |
| FilterDropdown native Scroll fix (`touchmove` stopPropagation) | `FilterDropdown.tsx` |
| Unlock-Radius 200m → 250m | `MustEatDetail.tsx` |
| `uid` reaktiv via `onAuthStateChanged` | `MapSection.tsx` |
| Login-Modal öffnet bei Tap auf gesperrte Must-Eat-Karte (nicht eingeloggt) | `MapSection.tsx` |
| Carto Attribution kleiner (20px / opacity 0.4) | `map.module.css` |
| Letztes Listenelement nicht mehr abgeschnitten (padding-bottom fix) | `map.module.css` |

### Warum die Gesture-Zones jetzt funktionieren

`useBottomSheet` hatte `setHeaderRef` bereits implementiert. Die einzige Änderung war JSX-Restrukturierung in `MapSection.tsx`:
- Header-Row (`listHeaderTopRow`) bleibt in `setHeaderRef`
- CategoryFilter-Chips (`listHeaderTabs`) bekommt **keine** drag-ref → native horizontaler Scroll, kein Sheet-Konflikt

## Offene Punkte

### 1. Google OAuth auf lokalem Dev-Server

Google Sign-In funktioniert nicht auf `192.168.x.x:3000` (HTTP + nicht-autorisierte Domain). Für Handy-Tests:
- **Magic Link** nutzen — funktioniert überall
- Oder direkt auf Production testen (nach Deploy)

Keine Code-Änderung nötig.

### 2. "Zweite Sache" Must-Eats

User hatte "zwei Sachen vornehmen" angekündigt — Punkt 1 war der Radius (250m). **Punkt 2 wurde nie genannt.** In neuer Session nachfragen.

## Wie der lokale Server gestartet wird (für Phone-Testing)

```bash
cd nextjs
npm run dev -- --hostname 0.0.0.0
```

**Wichtig:** Erst nach dem Server-Start ~20 Sekunden warten und einen Seiten-Aufruf von localhost machen, bevor das Handy verbindet. Sonst crasht der `static-paths-worker` (Race Condition beim ersten Chunk-Write).

Für Magic Link Login: `http://192.168.178.49:3000` → Profil-Icon oder Burger-Menü → E-Mail eingeben → Link im Postfach antippen.

## App-Stand (was funktioniert, nicht anfassen)

| Feature | Status |
|---|---|
| Sheet-Snap (peek/mid/full) + Handle-Drag | ✅ |
| Header-Drag (count-row, 8px-Threshold) | ✅ |
| CategoryFilter Chip-Scroll (keine Sheet-Konflikte) | ✅ |
| FilterDropdown (sort, Geöffnete, Bezirk) + nativer Scroll | ✅ |
| Must-Eat Unlock bei 250m (Tap → reveal oder Login-Modal) | ✅ |
| Firestore Unlock-Persistenz | ✅ |
| Restaurant-Liste (Distanz, Walking-Time, Open-Status) | ✅ |
| Marker + Cluster + Must-Eat-Marker + Fan-Spread | ✅ |
| GPS-Button, auto-locate on tab-activate | ✅ |
| Carto Attribution (minimiert, ToS-konform) | ✅ |
| Sanity-Daten via `/api/map-data` Proxy | ✅ |
| Loading-Animation 1,6s | ✅ |
| snapDetailToContent (Sheet auto-fit) | ✅ |

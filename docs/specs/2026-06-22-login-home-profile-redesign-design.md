# Login-Home & Profil Redesign — Design

**Datum:** 2026-06-22
**Status:** Entwurf (zur Review)
**Scope:** Personalisierter Kopf der eingeloggten Home + Reihenfolge der Hub-Module + komplettes Profil-Redesign.

---

## 1. Ziel & Leitprinzip

Heute überschneiden sich Home-Dock („Deine Welt") und Profil: beide zeigen Stats
(entdeckt / Spots auf Map), beide verlinken Map/Profil, beide zeigen
Empfehlungen bzw. Sammlung. Das verwischt die Rollen.

**Klare Rollenteilung — „was zeigen wir wo und warum":**

- **Home (eingeloggt) = Entdeckungs-Launcher.** Beantwortet „Was esse ich
  jetzt?". Schneller Sprung auf die Map + frische, standortbezogene
  Empfehlungen. **Keine** Stats, **keine** Sammlung, **keine** Identität.
- **Profil = Sammler-Cockpit.** Identität, Fortschritt, Sammlung. Hierhin
  wandert alles „Deine Sachen / wer bin ich / wie weit bin ich".

Visuelle Sprache bleibt die bestehende Eat-This-Marke (Brush-Display-Font,
Creme/Dunkel, Rot-Akzent, Sammelkarten-/Sticker-Gefühl). Kein Rebrand.

---

## 2. Informationsarchitektur — was wandert wohin

| Element                            | heute                    | künftig                   |
| ---------------------------------- | ------------------------ | ------------------------- |
| Begrüßung + „Was essen wir heute?" | Home-Dock                | **Home** (bleibt, führt)  |
| Stats (entdeckt / Spots)           | Home-Dock **und** Profil | **nur Profil**            |
| Bezirks-Auswahl (Dropdown)         | Home-Dock                | **entfällt** → Standort   |
| Spot/​Must-Eat-Picks „für dich"    | Home-Dock                | **Home** (bleibt)         |
| Fortschritt / Level                | —                        | **Profil** (Held)         |
| Sammlung (Must-Eats, Spots, Packs) | Profil                   | **Profil** (Panini-Album) |
| Avatar / Charakter-Wahl            | Profil                   | **Profil** (Hero)         |

---

## 3. Home (eingeloggt) — Launcher

### 3.1 Kopf (above the fold)

- **Begrüßung** (rote Kicker-Zeile): „Hey {Vorname}." / ohne Name „Hey."
- **Titel** (Brush-Display, groß): „Was essen wir heute?"
- **Aktionen:** großer roter **„Map öffnen →"** + **Standort-Chip**.
  - Standort-Chip ist **kein** Selector. Er zeigt den per Geolocation
    erkannten Bereich („📍 Kreuzberg"). Ohne Freigabe → „📍 Standort
    aktivieren" (tippen löst den Permission-Prompt aus).
  - Reverse-Geocoding wie bisher via `/api/bezirk` (Ortsteil aus lat/lng).
- **2 Picks** rechts (Desktop) / darunter (Mobile):
  - **„Spot für dich"** — Foto-Karte eines Restaurants in der Nähe.
  - **„Must Eat für dich"** — Spotlight-Karte (bereits umgesetzt, 2026-06-22):
    Sammelkarte als Held mit warmem Glow, rote Eyebrow, kompakt.
  - Picks sind standortbezogen (Nähe), nicht aus der Sammlung.

### 3.2 Auth-Split (wichtig)

- **Eingeloggt:** Launcher-Kopf führt (mit „Spot für dich").
- **Nicht eingeloggt:** **„Spot des Tages" bleibt** der Held der öffentlichen
  Home (unverändert). Der redaktionelle „Spot des Tages" entfällt also nur in
  der **eingeloggten** Ansicht (redundant zu „Spot für dich").

### 3.3 Modul-Reihenfolge darunter (Dramaturgie, eingeloggt)

1. **In deiner Nähe** — verdeckte Karten in Laufnähe („jetzt aufdecken"). Sofort handeln.
2. **Neu auf der Map** — frische Spots seit letztem Besuch.
3. **Frag Rémy** — Chat-Einstieg.
4. **Must Eats** — Galerie.
5. **Stöbern & Tiefe** — Magazin · Kategorien · Bezirke · Packs · Ganz Berlin · FAQ.

Module bleiben **optisch unverändert**; nur Reihenfolge/Sichtbarkeit ändern sich.
„Spot des Tages"-Hero (`HubHero`) wird in der eingeloggten Ansicht nicht oben
gerendert (optional später als Magazin-Einstieg; nicht in diesem Scope).

---

## 4. Profil — Sammler-Cockpit

### 4.1 Hero (dunkel, gleiche Welt wie der Launcher)

- **Avatar** als Charakter-Sticker (gerahmt, leicht gekippt).
- **Kicker:** „Mitglied seit {Monat Jahr}".
- **Name** (Brush-Display): Vorname des Users.
- **Fortschritt als Held:** „**{n}/{total}** Must-Eats aufgedeckt" + Balken.
- **Level/Rang-Chip** neben dem Fortschritt (s. §6).
- **Quick-Actions:** „Map öffnen →", „Packs entdecken".
- **Charakter-Wahl:** im Hero nur der **aktuelle** Avatar + „✎ Ändern".
  Die Auswahl der 3 Avatare passiert in einem **eigenen Modal-Layer**
  („Charakter wählen", abgedunkelter Hintergrund) — **nicht** alle drei inline
  im Profil sichtbar.

### 4.2 Sammlung (hell/Creme) — Kontrast dunkel→hell = „Vitrine"

1. **Deine Sammlung (Panini-Album)** — s. §5. Headline mit „{n}/{total} eingeklebt".
2. **Gespeicherte Spots** — bleibt als eigener Block (Restaurant-Karten). Nicht
   mit dem Album zusammenlegen: Spots = gemerkte Orte, Album = gesammelte Gerichte.
3. **Deine Packs** — Besitz.
4. **Abmelden**.

---

## 5. Panini-Album (Kern der Sammlung)

Die gesammelten Must-Eats werden als **Sammelalbum** dargestellt: jede Karte
hat einen **festen, nummerierten Platz**. Gesammelte Karten sind „eingeklebt",
fehlende bleiben als leere Slots sichtbar — das treibt das Weitersammeln an.

- **Gruppierung nach Kategorie** (Album-Kapitel/-Seiten), z. B. „Frühstück &
  Süßes", „Fast Food", „Dinner". Pro Kapitel ein Seitenkopf + Seitenzähler.
- **Slot (leer):** vertiefte „Tasche" (inset shadow), gestrichelter Rand, faint
  Nummer + „?". Reihenfolge/Nummer ist **stabil** (deterministisch pro Karte).
- **Slot (gefüllt):** Karte mit **Foto-Ecken** (Album-Mounts) + **Nummer-Badge**
  (rot). Reads als „eingeklebt".
- **Optik:** Creme-Papier mit dezenter Linierung + Mittel-Bindung (Spine).
- **Fortschritt** pro Album + gesamt sichtbar.

### Datenmodell / Nummerierung

- Voller Set = alle Must-Eats der Map (für den Owned-Tier des Users sichtbar;
  dieselbe `/api/map-data`-Quelle wie heute).
- **Stabile Nummer pro Karte:** abgeleitet aus einer deterministischen
  Sortierung (Kategorie → stabiler Tiebreak, z. B. `_id`/`_createdAt`), 1-basiert
  pro Kapitel. Nummer ändert sich nicht, wenn der User Karten aufdeckt.
- **Aufgedeckt-Set** = wie heute: `storedUnlockedIds ∪ revealedMustEatIds ∪
publicFaceUpIds` (siehe `resolveUnlockedMustEatIds`).
- Aufgedeckt → Karte im Slot; sonst → leerer Slot mit Nummer.

---

## 6. Level / Rang-System

Gamification-Anreiz im Profil-Hero, abgeleitet aus der Anzahl aufgedeckter
Must-Eats (Schwellen prozentual zum Gesamtset, damit es mit dem Katalog skaliert).

| Rang (Arbeitstitel) | Schwelle (aufgedeckt) |
| ------------------- | --------------------- |
| Frischling          | 0                     |
| Entdecker           | ≥ 1                   |
| Kenner              | ≥ 25 %                |
| Local               | ≥ 50 %                |
| Stadtbekannt        | ≥ 80 %                |
| Komplett            | 100 %                 |

- Anzeige: „Level {n} · {Rang}" Chip neben Zahl + Balken.
- Ränge/Schwellen sind i18n (DE/EN) und zentral konfigurierbar (eine Tabelle).
- Reine Anzeige-Logik, keine serverseitige Persistenz nötig (aus Aufgedeckt-Zahl
  abgeleitet).

---

## 7. Betroffene Komponenten (Implementierungs-Landkarte)

- `app/components/HubDeineWelt.tsx` + `.module.css`
  - Stats-/Progress-Block **raus**, Bezirks-Picker **raus**.
  - Standort-Chip (Geolocation-Anzeige, kein Selector).
  - Launcher-Kopf (Begrüßung, Titel, Map-CTA, Chip) + 2 Picks behalten.
- `app/components/HubSection.tsx`
  - Modul-Reihenfolge neu; `HubHero` (Spot des Tages) in eingeloggter Ansicht
    nicht oben rendern. Logged-out: unverändert (Spot des Tages bleibt Held).
- `app/components/profile/ProfileShell.tsx`
  - Neuer dunkler Hero (Avatar + „Ändern", Name, Mitglied seit, Fortschritt,
    Level, Actions).
- **Neu:** `AvatarPickerModal` — Charakter-Wahl als eigener Layer (Portal-Modal,
  Body-Scroll-Lock, Escape schließt), öffnet aus dem Hero. Übernimmt die
  bestehende `setAvatar`-Logik aus `useUserProfile`.
- **Neu:** `ProfileAlbum` (Panini-Album) — ersetzt das heutige
  `ProfileMustEats`-Grid; Gruppierung nach Kategorie, Slots, Mounts, Nummern.
- `ProfileSpots`, `ProfilePacks` — bleiben weitgehend, nur Einbettung/Styling.
- `lib/`: Helfer für stabile Karten-Nummerierung + Album-Gruppierung + Rang-Logik
  (+ i18n-Strings in `lib/i18n/translations.ts`).

---

## 8. Non-Goals (bewusst draußen)

- Kein neues Avatar-/Charakter-System (bleibt bei 3).
- Keine serverseitige Level-Persistenz / Achievements-Backend.
- Keine optischen Änderungen an den einzelnen Hub-Modulen (nur Reihenfolge).
- Kein Rebrand, keine neue Typo/Palette.
- „Spot des Tages" ins Magazin verschieben: optional, späterer Scope.

---

## 9. Offene Punkte

- Finale Rang-Namen (Arbeitstitel oben) — vor Launch redaktionell abnehmen.
- Album-Kategorien-Mapping: welche Kategorien werden zu Album-Kapiteln
  zusammengefasst (1:1 zu bestehenden Kategorien oder kuratierte Gruppen?).

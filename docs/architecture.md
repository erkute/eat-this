# Produktlogik im aktuellen Code

Stand: 30.09.2026. Diese Referenz bewahrt die weiterhin wichtigen Entscheidungen
aus den entfernten Entwürfen; sie ist kein Backlog.

## Herzen und Favoriten

Ein Herz ist ein gespeicherter Spot, kein zweites privates Lesezeichen.
`users/{uid}/favorites/{restaurantId}` verwendet die Sanity-ID des Restaurants.
Der öffentliche Zähler liegt in `restaurants/{restaurantId}.heartCount`.

`nextjs/app/api/heart/route.ts` schreibt Favorit und Zähler gemeinsam in einer
Admin-SDK-Transaktion. Der bestehende Favoritenzustand entscheidet über die
Zähleränderung; wiederholte Anfragen dürfen nicht mehrfach zählen. Der Client
darf den öffentlichen Zähler nicht selbst schreiben. Die früheren
Cloud-Function-Trigger existieren nicht mehr.

`nextjs/lib/map/useHeartCount.ts` liest den Zähler per Firestore-Subscription.
`nextjs/lib/map/heartLabel.ts` liefert die lokalisierte Beschriftung und
Kurzform; unter eins bleibt die Beschriftung leer. Herzen schaffen keine
Berechtigung für kostenpflichtige Karten. Firestore-Regeln werden separat
vom App-Hosting-Deployment veröffentlicht.

## Redaktionelle Reihenfolge

Kategorie- und Bezirksseiten nutzen `topSpots` aus Sanity. Die Reihenfolge
kommt aus der Redaktion: gefüllte Importtexte oder die bloße Existenz von
Fotos sind kein verlässliches Qualitätssignal für eine Bestenliste.

`nextjs/lib/curated-ranking.ts` trennt über `rankCurated` die kuratierte
Auswahl vom vollständigen Verzeichnis. Ungültige und doppelte Referenzen
werden übersprungen. Unter drei gültigen kuratierten Spots entfällt die
Bestenliste. Der Rest wird mit deutscher, numerischer Sortierung geordnet;
Namen mit Ziffern am Anfang stehen hinten.

Die Query projiziert bei `topSpots` nur Slugs: die vollständigen Restaurantdaten
lädt die Seite bereits. Ein zweiter Karten-Payload wäre redundant.
`pickShelf` füllt dagegen ein Bilderregal und braucht keine Mindestanzahl von
drei kuratierten Spots, weil es keine Bestenliste behauptet.

## Verdeckte Must-Eat-Karten

Die Restaurant-Map ist frei; Kartenbilder haben eigene Zugriffsregeln.
Die maßgeblichen Regeln stehen im aktuellen Code und in den Firestore- und
Storage-Regeln, nicht in alten Preis- oder Stapelgrößen aus den Entwürfen.

Der Gast-Tipp auf eine verdeckte Karte führt nach dem kurzen Zittern zu
`openLoginModal({ kind: 'card', mustEatId })`. Der Login-Kontext merkt sich
die gewünschte Starter-Karte selbst. Die Details zu Bewegung, Reduced Motion
und Darstellung stehen in [den Projektregeln](../AGENTS.md).

Betrieb: [Staging](runbooks/staging.md). Arbeitsbasis und Bereinigung:
[Projektstand](status.md).

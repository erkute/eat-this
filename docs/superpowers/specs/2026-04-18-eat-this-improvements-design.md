# Eat This — Improvements Design Spec
**Date:** 2026-04-18  
**Status:** Approved

---

## Overview

Five improvements to eatthisdot.com targeting first-time visitors with no prior user base. Goal: lower bounce rate, communicate value instantly, and build the card-collecting loop from day one.

---

## Point 1 — Hero CTA

**Change:** Add a primary CTA button to the hero section.  
**Label:** "Explore the Album" or similar — links directly to the Must-Eat Album view.  
**Rationale:** Current hero has no action. Visitors have nowhere to go.

---

## Point 2 — Must-Eat Album

Replaces the current Must-Eats grid entirely.

### Card States
| State | Count | Description |
|-------|-------|-------------|
| Sharp | 11 | Always visible — no login required |
| Blurred | 10 | Visible but obscured — revealed after login |
| Empty | 135 | Gray placeholder slots — require Booster Packs |

Total: 156 cards across 18 pages (9 cards per page, 3 columns).

### Layout
- Swipeable pages (touch + mouse drag)
- Dot navigation below (active dot = orange pill, visited = faded orange, future = gray)
- Each page has a footer: page counter ("1 / 18") + CTA button
- Guest CTA: "Collect Them All" — Logged-in CTA: "Get More Packs"

### Header
Matches existing must-eats section exactly:
- Orange uppercase label: "BERLIN"
- "EAT THIS" wordmark (26px, bold)
- Progress bar: "X / 156" in orange

### Login reveal
On login: blurred cards animate to sharp with staggered CSS transition (80ms delay between cards).

### Card design
- Aspect ratio: 1449/2163
- `clip-path: inset(0 round 6%)`
- Blurred state: `filter: blur(9px); transform: scale(1.15); opacity: 0.55`
- Empty state: plain `#ebebeb` fill, no numbers or icons

### City architecture
Each city is its own card deck. Berlin is the only deck for now. No city selector UI.

---

## Point 3 — Newsletter / Email Capture

**Placement:** Bottom of the landing page (above footer).  
**Form:** Email input + "Subscribe" button.  
**Copy:**
- Eyebrow: "Stay in the loop"
- Title: "New Must-Eats, every week."
- Subtitle: "Get the latest Berlin spots delivered to your inbox — plus a free bonus card pack."
- Fine print: "No spam. Unsubscribe anytime."

**Backend:** The newsletter Booster Pack slug already exists in Sanity. On subscribe: add email to list, trigger newsletter pack grant.

---

## Point 4 — Onboarding (Post-Signup)

4-step overlay shown once after registration. Skippable from steps 1–3.

| Step | Title | Body | Visual |
|------|-------|------|--------|
| 1 | Berlin food news | New openings, hidden gems, guides. | Mini news feed |
| 2 | Spots on the map | Berlin's best food map. Filter by category. | Mini map with pins |
| 3 | Must-Eat Album | 156 dishes. Collect them all. | Mini album grid |
| 4 | Your Booster Pack is ready. | 10 free cards are waiting for you. | Booster Pack visual |

**Step 4 CTA:** "Open Starter Pack" — navigates to pack opening flow.  
**Navigation:** Dot indicator (orange pill for active), Next button, "Skip intro" link on steps 1–3.

### Booster Pack Visual (Step 4)
- Stacked card effect (3 layers, slight rotation)
- Black pack body, orange stripe header
- "EAT THIS" brand label
- Large "10" + "Cards" + "Booster Pack" type

---

## Point 5 — Navbar Labels

Add text labels below the 4 nav icons for first-time visitor clarity.

| Icon | Label |
|------|-------|
| Document | News |
| Map | Map |
| Album | Album |
| Person | Profile |

Active state: icon + label both turn orange (#FF3B00).

---

## Implementation Order

1. Navbar labels (30 min, pure CSS/HTML)
2. Newsletter section (landing page + backend hook)
3. Must-Eat Album (replaces must-eats grid)
4. Hero CTA (links to album)
5. Onboarding flow (post-signup trigger)

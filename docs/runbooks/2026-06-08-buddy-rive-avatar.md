# Buddy Rive Avatar — Swap-In Runbook

**Feature:** KI-Buddy floating chat widget  
**Branch at time of writing:** `feature/ki-buddy`  
**Relevant component:** `nextjs/app/components/buddy/BuddyAvatar.tsx`

---

## Current state

Until `NEXT_PUBLIC_BUDDY_RIVE_SRC` is set, `BuddyAvatar` renders an animated
CSS-mouth fallback (`BuddyAvatarFallback`). This is expected behaviour — the
real `.riv` artwork is supplied by the designer at a later point. The chat,
streaming, rate-limiting, and all other feature logic work fully in the
meantime.

---

## Env knobs

All four variables are optional. The feature runs without any of them.

| Variable | Default | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(must be set — already present in the repo)* | Authenticates calls to the Anthropic API. Required. |
| `BUDDY_MODEL` | `claude-haiku-4-5` | The Anthropic model used for chat. Set to `claude-sonnet-4-6` to trade cost for higher response quality. |
| `BUDDY_RATE_LIMIT_PER_MIN` | `10` | Max chat requests per session per 60-second window. |
| `BUDDY_RATE_LIMIT_PER_DAY` | `100` | Max chat requests per session per 24-hour window. |
| `NEXT_PUBLIC_BUDDY_RIVE_SRC` | *(unset)* | Public URL of the published `.riv` asset. When unset the component renders the CSS fallback. Set this once the designer delivers the artwork. |

To override a non-default value, add it to `nextjs/apphosting.yaml` (or the
corresponding Firebase App Hosting environment config for staging/production).
Do not add these to `.env.local` for production; use the Firebase Console or
CLI so secrets stay out of the repo.

---

## Rive swap-in steps

Once the designer delivers the mascot artwork:

1. Receive avatar artwork as separable layers (SVG/PNG), mouth as its own
   layer.

2. In the Rive editor, build a State Machine named exactly **`Buddy`** with:
   - A boolean input named exactly **`isTalking`**.
   - Idle animation (blink/sway) as the default state.
   - A talking state that flaps the mouth while `isTalking == true`.

3. Export/publish the `.riv` and host it. Two options:
   - Local static asset: place at `nextjs/public/buddy/buddy.riv` and set
     `NEXT_PUBLIC_BUDDY_RIVE_SRC=/buddy/buddy.riv`.
   - CDN URL: upload to a CDN and set `NEXT_PUBLIC_BUDDY_RIVE_SRC` to the
     full `https://` URL.

4. Set `NEXT_PUBLIC_BUDDY_RIVE_SRC` to that URL/path in the relevant
   environment (local `.env.local`, staging env config, production env config).

5. Verify the swap-in with the smoke test below.

> **Note:** The state-machine name (`Buddy`) and boolean input name
> (`isTalking`) are hard-coded in `BuddyAvatar.tsx` — keep them in sync with
> whatever the designer names them in the Rive editor, or update both the
> editor and the component.

---

## Smoke test

Run locally: `cd nextjs && npm run dev`, then open `http://localhost:3000/de`.

This checklist documents how a human verifies the feature. It is **not**
automated — execute it manually after any significant change to the buddy
feature or after the Rive artwork swap-in.

- [ ] Launcher bubble appears bottom-right; click opens the panel.
- [ ] Ask "Ich hab Bock auf Pizza, was empfiehlst du?" → streamed answer
      + spot card(s) linking to `/de/restaurant/<slug>`.
- [ ] Ask "Ich bin in Schöneberg, brauch einen Kaffee-Spot." → spots filtered
      to the district.
- [ ] Ask "Was macht Berliner Kaffee besonders?" → editorial answer (may cite
      an article).
- [ ] Ask "bestes Sushi in München" → honest deflection, no invented spot.
- [ ] Switch to `/en` → answers come back in English.
- [ ] Spam the input → after the per-minute cap, a friendly throttle message
      appears (HTTP 429).
- [ ] *(After Rive swap-in only)* Send a message and confirm the mascot mouth
      animates during streaming, then returns to idle when the response is
      complete.

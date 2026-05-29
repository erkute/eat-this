# Magic-Link Email — Redesign & Deliverability

**Date:** 2026-05-29
**Status:** Design (approved, pre-implementation)
**Epic:** Plan 4 smoke follow-up (signup funnel)

## Problem

During the Plan 4 referral smoke a fresh email signup surfaced two issues with the magic-link email (`emails/MagicLinkEmail.tsx` + the plain-text body in `app/api/auth/send-magic-link/route.ts`):

1. **Stale content & design.** The whole email is built around the retired pack-open onboarding flow: "Dein Booster Pack wartet — 20 zufällige Must Eat Cards", a random booster image, CTA "Bestätigen & Pack öffnen", a 3-step script ("Klick → Namen sagen → Pack öffnen, 20 Karten enthüllt") and a pixel-art crew row. The old logo (`logo2-white.png`) is used. None of this matches the current product or brand direction.
2. **Lands in spam.** Recipient sees it in the spam folder.

## Goals

- Replace the email with a lean, current, on-brand **transactional login email** using the new brand assets.
- Remove every trace of the onboarding script (pack-open steps, "say your name", "20 Karten enthüllt", pixel crew).
- Reduce spam-trigger surface (lower image weight, less marketing hype, better text-to-image ratio).

## Non-Goals

- DNS/Resend domain authentication changes — already correctly configured (see Deliverability).
- The friend "invited" modal and the env-correct referral link — separate parked specs.
- Touching the Google sign-in path (it sends no email).

## Brand assets (already in repo, public-served)

- **Logo:** `public/pics/eat-this-logo.webp` — yellow "EAT THIS" wordmark, black outline.
- **Slogan:** `public/pics/slogan.webp` — "WE TELL YOU WHAT TO EAT." (black marker script).
- **Starter pack hero:** `public/pics/booster/booster_free.webp` — silver-foil trading-card pack ("EAT THIS / WE TELL YOU WHAT TO EAT / 20 MUST EATS / EDITION ONE").

Emails need absolute URLs; all three are referenced as `${appUrl}/pics/...`. The old `/pics/email/*` assets (booster jpgs, char pngs, logo2) are no longer referenced.

> Note: the starter-pack art carries a baked-in "20 MUST EATS" — that is brand artwork, not body copy, so it does not conflict with the "no concrete spot counts in UI copy" rule. Body copy stays count-free and qualitative.

## Design

Cream surface (`#f7f2e8`), black ink, yellow accent — the current mockup direction. Brand display type comes from the image assets (the hand-drawn look is baked in); body text stays in the email-safe system sans already used.

**Layout (single column, ~560px):**

1. **Header** — EAT THIS logo, slogan beneath it, centered on cream. (Replaces the black stats band + old logo.)
2. **Hero** — the starter-pack visual (`booster_free.webp`), centered. The one eye-catcher.
3. **Headline + one line** — brand voice, no onboarding steps. e.g. *"Dein Login-Link."* / *"Tipp drauf — du bist drin."*
4. **CTA button** — black pill, label **"Anmelden"** (not "Pack öffnen"), linking to `magicLink`.
5. **Expiry note** — "Der Link ist 1 Stunde gültig und nur für diese Adresse bestimmt."
6. **Footer** — "Du bekommst diese Mail, weil du dich bei eatthisdot.com angemeldet hast. Nicht angefordert? Ignorieren." (kept lean).

**Removed sections:** stats band, "Dein Booster Pack wartet" hero copy, random booster image, "So geht's weiter" 3-step block, pixel-art crew row, "Die Crew freut sich auf dich."

**Plain-text body** (the `text` field in the route) is rewritten to mirror the new email: greeting line, the magic link, the expiry note, the footer line. No onboarding steps.

**Route change:** drop `pickBoosterPack()` + the `BOOSTER_PACKS` jpg list; the hero is the fixed starter pack. `MagicLinkEmailProps` loses `boosterPack`.

> Nuance: the magic-link email is sent on every email login, not only first signup, so a "starter pack" hero leans new-user. This is accepted per product direction (show the starter pack); it reads as brand presence rather than a literal onboarding promise, since the onboarding copy is gone.

## Deliverability (diagnosis + recommendation)

DNS for `eatthisdot.com` checked live:
- DKIM (`resend._domainkey`) present & valid; SPF includes `amazonses.com`; DMARC present (`p=none`); `send.eatthisdot.com` MAIL-FROM subdomain correctly set. **Resend domain auth is correct** — not the spam cause.
- MX = IONOS. The `hello_at_eatthisdot_com_…@icloud.com` reply-to the user observed is a personal iCloud forwarding artifact in the recipient client, not our sending config (the route sets `replyTo: hello@eatthisdot.com`).
- Likely spam cause: **content hygiene + cold-domain reputation** — image-heavy, hype-toned email from a young domain. The lean redesign is the primary code-side lever.

Recommendations (no code dependency on these): keep the email lean/transactional; optionally tighten DMARC to `p=quarantine` after a warm-up period; optionally clean up the iCloud reply-to forwarding so recipients see `hello@eatthisdot.com`.

## Testing

- **Render test:** `render(MagicLinkEmail({...}))` produces HTML without throwing, with the new asset URLs and CTA, and contains none of the retired strings ("Pack öffnen", "20 Karten", "Namen sagen", "So geht's weiter").
- **Route text body:** asserts the plain-text body contains the magic link + expiry line and none of the retired onboarding lines.
- Existing send-magic-link error-path tests (invalid email, missing key) stay green.

## Files

- `nextjs/emails/MagicLinkEmail.tsx` — rewrite (new layout/assets/copy, drop `boosterPack` prop).
- `nextjs/app/api/auth/send-magic-link/route.ts` — rewrite `text` body, drop `pickBoosterPack`/`BOOSTER_PACKS`, drop `boosterPack` arg.
- Tests for the above.

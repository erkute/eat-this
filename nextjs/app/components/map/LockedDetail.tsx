'use client';
import { useId, useState, type CSSProperties, type FormEvent, type Ref } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { MapRestaurant } from '@/lib/types';
import { abbreviateBezirk } from '@/lib/map';
import { packUrlSlug, resolvePackByUrlSlug } from '@/lib/pack/packDetail';
import { categoryArt } from '@/lib/categoryArt';
import { CATALOG } from '@/lib/stripe-catalog';
import { normalizeName } from '@/lib/normalizeName';
import { useAuth, useMagicLink } from '@/lib/auth';
import { GoogleMark } from '@/app/components/GoogleMark';
import { useRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { hasAmbiguousDropCap } from '@/lib/dropCap';
import { useTranslation } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import { CloseIcon } from './icons';
import styles from './MapDetails.module.css';
import lockedStyles from './LockedDetail.module.css';

interface Props {
  restaurant: MapRestaurant;
  /** Whole-catalog spot count, not the filtered map — the all-Berlin offer's
   *  size must not move when the user ticks a chip. */
  totalSpots: number;
  /** This spot sits in the signed tier: an account alone opens it, no purchase.
   *  Decides which of the two offers this sheet makes. */
  unlocksWithAccount: boolean;
  contentRef: Ref<HTMLDivElement | null>;
  onClose: () => void;
}

/**
 * What a locked spot opens instead of a detail sheet.
 *
 * Tapping a grey dot used to navigate straight to /pack/all-berlin. That threw
 * away the map, the filter and the search for what is usually a "what is this?"
 * tap — and with a 28px target among 194 dots, a fair share of those taps are
 * mistakes. This answers the question in place and leaves both routes open.
 *
 * It names the restaurant, because the name is not a secret: the same spot is
 * readable on its district list and on /restaurant/<slug>. Only the map layer
 * is paid, so hiding the name here would protect nothing and would make the
 * paywall look like it covers more than it does.
 *
 * For the same reason it opens with the spot's own story before it asks for
 * anything (user decision, 2026-08-23) — the same prose, the same drop cap,
 * the same typography a free spot's sheet renders, cut off partway down under
 * a mask. That cut is the message: this sheet is the real one, it simply stops
 * here. Nothing is hidden that isn't already public on the indexed restaurant
 * page; what the cut sells is the rest of THIS surface — the tip, the contact
 * rows, the must-eats — which an account or a pack does open.
 *
 * The mask is a static gradient, not an opacity animation: the project rule
 * bans opacity for appear/disappear MOVEMENT, and names clip-path as the tool
 * of choice. A mask is that same family, standing still.
 *
 * It costs one lazy fetch, the same /api/restaurant-detail call a free spot
 * already makes.
 *
 * It does NOT link to that page. Those restaurant articles exist for search,
 * and pointing a paying-curious visitor at "read this one for free" sells
 * against the pack sitting right above it (user decision, 2026-08-19).
 *
 * Which offer it makes depends on the tier the spot sits in. The map draws
 * both kinds as the same grey dot on purpose (user decision, 2026-08-23) —
 * three marker states would turn the map into a legend. So the distinction
 * lives here, where there is room to say it in words:
 *
 *   signed tier   → sign in, it's free, and it is THIS spot that opens
 *   beyond that   → the packs that contain it
 *
 * Never both. A 2,99 € pack printed under a spot the reader can have for free
 * argues against itself, and the all-Berlin offer is already standing at the
 * end of the list on every view of this map.
 *
 * The pack offer leads with the pack this spot is actually in — the 2,99 € one
 * that unlocks it — and puts all-Berlin underneath.
 *
 * Only all-Berlin states a spot count. A category pack's count invites exactly
 * the comparison that sinks the bundle: Lunch alone is 205 of 345 spots, so
 * "205 Spots · 2,99 €" next to "340 Spots · 20 €" argues against the 20 €
 * every time (user decision, 2026-08-19).
 */
export default function LockedDetail({
  restaurant: r,
  totalSpots,
  unlocksWithAccount,
  contentRef,
  onClose,
}: Props) {
  const locale = useLocale();
  const { t } = useTranslation();
  const de = locale !== 'en';
  /* Usually already cached: MapSection prefetches on the tap that opens this.
     Until it lands there is simply no excerpt — the offer moves up, and a
     skeleton would promise a length the cut deliberately does not commit to. */
  const { detail } = useRestaurantDetail(r.slug);
  const loc = de ? 'de' : 'en';
  /* Same source and same fallback order as the unlocked sheet, so the cut
     lands in the middle of the very text that sheet would show. */
  const storyText =
    pickLocale(detail?.description, detail?.descriptionEn, loc) ??
    pickLocale(detail?.shortDescription, detail?.shortDescriptionEn, loc) ??
    '';
  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);
  const cuisine = r.cuisineType ?? null;
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  /* First category that maps to a real pack. A spot can carry several; the
     first is the one its card already shows. */
  const categoryPack = (r.categories ?? [])
    .map((c) => resolvePackByUrlSlug(c.slug))
    .find((pack) => pack !== null && pack.slug !== null);
  const allBerlin = resolvePackByUrlSlug('all-berlin');
  const spotsWord = de ? 'Spots' : 'spots';
  /* All-Berlin has no art of its own. /packs answers that by fanning out every
     category pack, and this does the same — nine bags say "everything" in a way
     one generic bag cannot. */
  const allBerlinArt = Object.values(CATALOG)
    .filter((pack) => pack.type === 'category' && pack.slug)
    .map((pack) => categoryArt(pack.slug as string))
    .filter((src): src is string => Boolean(src));
  const heroStyle = r.photo ? ({ backgroundImage: `url(${r.photo})` } as CSSProperties) : undefined;

  return (
    <div
      className={styles.detailV13}
      data-detail-root="locked"
      role="dialog"
      aria-label={normalizeName(r.name)}
    >
      <div className={styles.detailV13Scroll} data-detail-scroll ref={contentRef}>
        <header className={styles.rdHero} data-detail-hero style={heroStyle}>
          <button
            type="button"
            className={styles.rdCloseGlass}
            aria-label={de ? 'Schließen' : 'Close'}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
          <div className={styles.rdOverlay}>
            <h1 className={styles.rdNameOv}>{normalizeName(r.name)}</h1>
            <div className={styles.rdTagsOv}>
              {district && <span className={styles.rdTag}>{district}</span>}
              {cuisine && <span className={styles.rdTagAlt}>{cuisine}</span>}
            </div>
          </div>
        </header>

        <div className={lockedStyles.body}>
          {storyText && (
            <div className={lockedStyles.excerpt} aria-hidden="false">
              <div className={styles.rdBody}>
                {storyText.split('\n\n').map((para, idx) =>
                  idx === 0 && para.length > 0 ? (
                    <p
                      key={idx}
                      className={`${styles.rdStoryLead} ${
                        hasAmbiguousDropCap(para) ? styles.rdStoryLeadPlain : ''
                      }`}
                    >
                      {para}
                    </p>
                  ) : (
                    <p key={idx}>{para}</p>
                  )
                )}
              </div>
            </div>
          )}
          {/* The kicker heads the paywall, not the sheet — it comes after the
              spot's own story so the reader meets the restaurant first, and it
              is the only place either branch names the STATE. It was briefly
              dropped from the free branch on the theory that the "Gratis"
              badge covers the same beat; it does not (user, 2026-08-23). The
              badge prices the offer, the kicker says the spot is still face
              down, and without it the free branch never said so at all. */}
          <p className={lockedStyles.kicker}>{t('map.lockedDetailKicker')}</p>
          {unlocksWithAccount ? (
            <SignupOffer restaurant={r} prefix={prefix} de={de} />
          ) : (
            <p className={lockedStyles.sub}>
              {/* No headline above this: the kicker already says the spot is
                  face down, and "Liegt noch nicht auf deiner Map." said the
                  same thing again one type step larger (user, 2026-08-23).
                  What is left is the one line the kicker does NOT cover — what
                  opens it — and under that the cards carry the weight. */}
              {de
                ? 'Ein Pack schaltet diesen Spot frei. Und jeden anderen darin.'
                : 'One pack unlocks this spot. And every other one in it.'}
            </p>
          )}
          {!unlocksWithAccount && categoryPack?.slug && categoryArt(categoryPack.slug) && (
            <a
              className={`${lockedStyles.offer} ${lockedStyles.offerRow}`}
              href={`${prefix}/pack/${packUrlSlug(categoryPack)}`}
              onClick={() =>
                trackEvent('locked_spot_pack_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                  pack_id: categoryPack.packId,
                })
              }
            >
              <span className={lockedStyles.offerArt}>
                <Image
                  className={lockedStyles.offerPack}
                  src={categoryArt(categoryPack.slug)!}
                  alt=""
                  width={420}
                  height={630}
                  sizes="88px"
                />
              </span>
              <span className={lockedStyles.offerText}>
                <span className={lockedStyles.offerLabel}>{categoryPack.displayName}</span>
                <span className={lockedStyles.offerSpectrum}>
                  {categoryPack.spectrum[de ? 'de' : 'en']}
                </span>
                <span className={lockedStyles.offerCta}>
                  <span>
                    {de ? `${categoryPack.displayName} holen` : `Get ${categoryPack.displayName}`}
                  </span>
                  <OfferArrow />
                </span>
              </span>
            </a>
          )}
          {!unlocksWithAccount && allBerlin && allBerlinArt.length > 0 && (
            <a
              className={lockedStyles.offer}
              href={`${prefix}/pack/all-berlin`}
              onClick={() =>
                trackEvent('locked_spot_pack_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                  pack_id: allBerlin.packId,
                })
              }
            >
              <span className={`${lockedStyles.offerArt} ${lockedStyles.offerFan}`}>
                {allBerlinArt.map((src) => (
                  <Image
                    key={src}
                    className={lockedStyles.offerPack}
                    src={src}
                    alt=""
                    width={420}
                    height={630}
                    sizes="56px"
                  />
                ))}
              </span>
              <span className={lockedStyles.offerText}>
                <span className={lockedStyles.offerLabel}>
                  {`${de ? 'Ganz Berlin' : 'All Berlin'} · ${totalSpots} ${spotsWord}`}
                </span>
                <span className={lockedStyles.offerSpectrum}>
                  {allBerlin.spectrum[de ? 'de' : 'en']}
                </span>
                <span className={lockedStyles.offerCta}>
                  <span>{t('map.listEndCta')}</span>
                  <OfferArrow />
                </span>
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Same arrow the end-of-list offer uses — one motion, one shape. */
function OfferArrow() {
  return (
    <svg
      viewBox="0 0 14 10"
      width="15"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M1 5h11M8 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const signupCopy = {
  de: {
    kicker: 'Gratis',
    title: 'Starter Pack',
    lead: 'Schaltet diesen Spot frei. Und viele weitere.',
    emailAria: 'E-Mail Adresse',
    emailPlaceholder: 'deine@email.com',
    submit: 'Starter Pack holen',
    sending: 'Sende…',
    sent: 'Check deine Mail',
    sentLead:
      'Wir haben dir den Link geschickt. Ein Klick, und du landest wieder hier — mit dem Spot offen.',
    google: 'Mit Google anmelden',
    hint: 'Wir schicken dir einen Link zum Einloggen.',
    emptyEmail: 'Bitte gib deine E-Mail ein.',
    invalidEmail: 'Das sieht noch nicht nach einer E-Mail aus.',
    imgAlt: 'Eat This Starter Pack',
  },
  en: {
    kicker: 'Free',
    title: 'Starter Pack',
    lead: 'Unlocks this spot. And many more.',
    emailAria: 'Email address',
    emailPlaceholder: 'your@email.com',
    submit: 'Get the Starter Pack',
    sending: 'Sending…',
    sent: 'Check your mail',
    sentLead: "We've sent your link. One click and you are back here, with the spot open.",
    google: 'Sign in with Google',
    hint: 'We send you a sign-in link.',
    emptyEmail: 'Add your email first.',
    invalidEmail: 'That does not look like an email yet.',
    imgAlt: 'Eat This Starter Pack',
  },
} as const;

/**
 * The free rung of the ladder, offered in place of a pack.
 *
 * Built to the home page's Starter Pack section (user decision, 2026-08-23):
 * same free-pack art, same "Gratis" badge, same product name, same centred
 * form. Someone who saw the offer on the home page and meets it again here has
 * to recognise it as the same thing — two different-looking asks for the same
 * free account read as two different products.
 *
 * The home page's own copy does NOT come along. It sells the pack in general;
 * here the reader is holding one particular spot, and leading with THAT one is
 * the whole reason this beats the packs at this moment. The second half keeps
 * it from undershooting — an account opens roughly fifty more, so promising
 * only the tapped spot would sell the tier short.
 *
 * Same shape as the pack branch's line: same verb, same rhythm, and the only
 * thing that changes between the two rungs is how many spots come along. The
 * verb is `freischalten` because that is the word the rest of the app uses;
 * the subject is dropped because the pack it belongs to is named in 30px type
 * directly above, and repeating it there read as a stutter.
 *
 * Signs in WITHOUT the login modal, on purpose: BridgeAuth sends every
 * modal-completed sign-in to the home page, which would throw away the map,
 * the filter and the very spot the user just asked about. An inline sign-in
 * never opens the modal, so that redirect never fires.
 *
 * Google therefore needs no return trip at all — the uid changes, useMapData
 * refetches, the spot leaves the locked set, and this sheet is replaced by the
 * real detail underneath the user's finger.
 *
 * Email cannot avoid the round trip through the inbox, so it carries the way
 * back in the continue URL: the map, with `?r=` re-opening this spot.
 */
function SignupOffer({
  restaurant: r,
  prefix,
  de,
}: {
  restaurant: MapRestaurant;
  prefix: string;
  de: boolean;
}) {
  const t = signupCopy[de ? 'de' : 'en'];
  const { signInWithGoogle } = useAuth();
  const { sendLink, state, errorMessage, reset } = useMagicLink();
  const emailId = useId();
  const errorId = `${emailId}-error`;
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const feedback = validationError || errorMessage;
  const sent = state === 'sent';

  const track = (method: 'email_link' | 'google') =>
    trackEvent('locked_spot_login_start', {
      method,
      restaurant_id: r._id,
      restaurant_slug: r.slug,
    });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'sending') return;
    const trimmed = email.trim();
    if (!trimmed) {
      setValidationError(t.emptyEmail);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setValidationError(t.invalidEmail);
      return;
    }
    setValidationError('');
    track('email_link');
    void sendLink(
      trimmed,
      `${window.location.origin}${prefix}/map?r=${encodeURIComponent(r.slug)}`
    );
  };

  const handleGoogle = async () => {
    if (googleBusy) return;
    track('google');
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      // No state reset on success: the refetched map drops this spot from the
      // locked set and unmounts this sheet.
    } catch {
      setGoogleBusy(false);
    }
  };

  return (
    <div className={lockedStyles.starter}>
      {/* Pack and its copy pair up; the form is a full-width row of its own
          underneath. On desktop that pairing goes side by side, which is what
          keeps the whole offer inside the panel without scrolling — but the
          fields stay the full width of the panel either way (user, 2026-08-23).
          A 213px field in a column beside the pack looked like an afterthought
          next to the thing it is actually asking for. */}
      <div className={lockedStyles.starterHead}>
        <span className={lockedStyles.starterArt}>
          <Image
            src="/pics/booster/booster_free.webp"
            alt={t.imgAlt}
            fill
            sizes="150px"
            priority={false}
          />
        </span>
        <div className={lockedStyles.starterBody}>
          <span className={lockedStyles.starterKicker}>{t.kicker}</span>
          <p className={lockedStyles.starterTitle}>{t.title}</p>
          <p className={lockedStyles.starterLead}>{sent ? t.sentLead : t.lead}</p>
        </div>
      </div>

      <form className={lockedStyles.form} onSubmit={handleSubmit} noValidate>
        <label className={lockedStyles.srOnly} htmlFor={emailId}>
          {t.emailAria}
        </label>
        <input
          id={emailId}
          className={lockedStyles.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setValidationError('');
            if (state !== 'idle') reset();
          }}
          aria-invalid={Boolean(feedback)}
          aria-describedby={feedback ? errorId : undefined}
          required
        />
        <button className={lockedStyles.button} type="submit" disabled={state === 'sending'}>
          {sent ? t.sent : state === 'sending' ? t.sending : t.submit}
        </button>
      </form>

      {feedback ? (
        <span id={errorId} className={lockedStyles.error} role="alert">
          {feedback}
        </span>
      ) : (
        !sent && <span className={lockedStyles.hint}>{t.hint}</span>
      )}

      <button
        type="button"
        className={lockedStyles.google}
        onClick={handleGoogle}
        disabled={googleBusy}
      >
        <GoogleMark size={17} />
        <span>{t.google}</span>
      </button>
    </div>
  );
}

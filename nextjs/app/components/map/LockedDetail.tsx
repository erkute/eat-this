'use client';
import { useId, useState, type CSSProperties, type FormEvent, type Ref } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import type { MapRestaurant } from '@/lib/types';
import { abbreviateBezirk } from '@/lib/map';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { categoryArt } from '@/lib/categoryArt';
import { CATALOG } from '@/lib/stripe-catalog';
import { normalizeName } from '@/lib/normalizeName';
import { useAuth, useMagicLink } from '@/lib/auth';
import { GoogleMark } from '@/app/components/GoogleMark';
import { useRestaurantDetail } from '@/lib/map/useRestaurantDetail';
import { claimSignupSpot } from '@/lib/map/claimSignupSpot';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { hasAmbiguousDropCap } from '@/lib/dropCap';
import { useTranslation } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import { CloseIcon } from './icons';
import styles from './MapDetails.module.css';
import lockedStyles from './LockedDetail.module.css';

interface Props {
  restaurant: MapRestaurant;
  /** Whether the viewer has an account. The only thing that decides which of
   *  the two offers this sheet makes — see the header comment. */
  signedIn: boolean;
  /** A sign-up claim for THIS spot is still in flight — the reader followed a
   *  magic link back onto it and the grant has not landed yet. Holds the sheet
   *  on the sign-up branch so the promised spot doesn't turn into a price tag
   *  for the last second of the wait. */
  claimPending: boolean;
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
 * Which offer it makes depends on one thing only: whether the reader has an
 * account (user decision, 2026-08-26).
 *
 *   no account → sign in, it's free, and it is THIS spot that opens
 *   signed in  → the packs that contain it
 *
 * It used to depend on the tier the spot sits in — the ~50 spots between rank
 * 100 and 150 offered the account, everything beyond offered a pack. That put
 * a price tag under three of every four grey dots an anonymous visitor tapped,
 * and asked for money from someone who had not so much as left an email. The
 * ladder now runs one rung at a time: nobody is asked to pay before they are
 * asked to sign up.
 *
 * What made the old split necessary was the promise. "Schaltet diesen Spot
 * frei" is false for a pack-tier spot, and the magic link lands the reader
 * back on that very spot — still grey — which is a bait-and-switch at the
 * worst possible moment. So the promise was made true instead: signing up from
 * a locked spot CLAIMS it, one spot per account, forever (see
 * app/api/claim-spot/route.ts). Every grey dot is now a spot an account opens.
 *
 * Never both offers at once. A 2,99 € pack printed under a spot the reader can
 * have for free argues against itself, and the all-Berlin offer is already
 * standing at the end of the list on every view of this map.
 *
 * The pack branch makes exactly ONE offer, and it is the packs as a whole:
 * their art, one sentence, one way to /packs. It went through two cards plus
 * an overview link, then a single named pack with spot counts — both asked the
 * reader to compare products before he knew what this one spot costs him
 * (user decision, 2026-08-24). Selection, sizes and prices live on the pack
 * page; this sheet only has to make him want the spot.
 */
export default function LockedDetail({
  restaurant: r,
  signedIn,
  claimPending,
  contentRef,
  onClose,
}: Props) {
  const locale = useLocale();
  const { t } = useTranslation();
  const de = locale !== 'en';
  /* Usually already cached: MapSection prefetches on the tap that opens this.
     Auf einem kalten Cache dauert der Fetch aber sichtbar, und solange er
     läuft, stand die ganze Paywall dort, wo später der Anriss steht — mit dem
     Text sprang sie dann nach unten. Der Platz wird jetzt reserviert (kein
     Skelett, das eine Länge verspräche, die der Anschnitt bewusst offen
     lässt), damit "Noch verdeckt" und die Packs von Anfang an sitzen. */
  const { detail, loading } = useRestaurantDetail(r.slug);
  /* Google signs in inside this sheet, so `signedIn` flips a beat BEFORE the
     spot actually opens: the map refetch that rides the new uid still lists it
     as locked (the claim has not been written yet), and the branch below would
     drop the reader onto a pack offer for the spot they were just promised.
     This holds the sign-up branch until the claim lands and the refetched map
     unmounts the whole sheet. Reset only if the claim fails. `claimPending` is
     the same hold for the email rung, where the wait starts before this
     component even mounts. */
  const [unlocking, setUnlocking] = useState(false);
  const awaitingSpot = unlocking || claimPending;
  const loc = de ? 'de' : 'en';
  /* Same source and same fallback order as the unlocked sheet, so the cut
     lands in the middle of the very text that sheet would show. */
  const storyText =
    pickLocale(detail?.description, detail?.descriptionEn, loc) ??
    pickLocale(detail?.shortDescription, detail?.shortDescriptionEn, loc) ??
    '';
  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);
  const cuisine = r.cuisineType ? localizedCuisine(r.cuisineType, loc) : null;
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  /* Die Packs als Bild — dieselbe Auffächerung, mit der /packs sie zeigt.
     Ein generischer Beutel sagt nicht "davon gibt es mehrere". Neun schon. */
  const packArt = Object.values(CATALOG)
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
      <div
        className={`${styles.detailV13Scroll} ${lockedStyles.scroll}`}
        data-detail-scroll
        ref={contentRef}
      >
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
          {!storyText && loading && (
            <div className={lockedStyles.excerptReserve} aria-hidden="true" />
          )}
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
          {!signedIn || awaitingSpot ? (
            <SignupOffer
              restaurant={r}
              prefix={prefix}
              de={de}
              onUnlocking={setUnlocking}
              claimPending={claimPending}
            />
          ) : (
            packArt.length > 0 && (
              /* EIN Angebot, EIN Weg: die Packs. Hier stand zuletzt die Karte
                 des Kategorie-Packs mit Spotzahlen und Produktnamen — das ist
                 mehr Information, als jemand an dieser Stelle sortieren will
                 (User, 2026-08-24). Was bleibt: ein paar Packs als Bild, der
                 Satz, dass sie diesen Spot und viele weitere öffnen, und ein
                 Weg zur Pack-Seite, wo Auswahl und Preise hingehören. */
              <a
                className={lockedStyles.offer}
                href={`${prefix}/packs`}
                onClick={() =>
                  trackEvent('locked_spot_pack_clicked', {
                    restaurant_id: r._id,
                    restaurant_slug: r.slug,
                    pack_id: 'packs_overview',
                  })
                }
              >
                <span className={`${lockedStyles.offerArt} ${lockedStyles.offerFan}`}>
                  {packArt.map((src) => (
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
                    {de ? 'Diesen Spot freischalten' : 'Unlock this spot'}
                  </span>
                  <span className={lockedStyles.offerSpectrum}>
                    {de
                      ? 'Ein Pack öffnet ihn — und viele weitere dazu.'
                      : 'One pack opens it — and plenty more with it.'}
                  </span>
                  <span className={lockedStyles.offerCta}>
                    {de ? 'Packs ansehen' : 'See the packs'}
                  </span>
                </span>
              </a>
            )
          )}
        </div>
      </div>
    </div>
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
    unlocking: 'Wir schliessen auf …',
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
    unlocking: 'Opening it up …',
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
 * "Schaltet diesen Spot frei" is a literal promise, and both rungs keep it by
 * claiming the spot: Google inline once the popup resolves, email after the
 * link returns (`claim=1` in the continue URL, picked up by useSignupSpotClaim
 * on the map). One spot per account, forever — see app/api/claim-spot.
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
 * Google therefore needs no return trip at all — the popup resolves, the spot
 * is claimed, the entitlement write wakes MapSection's `entitlements` listener,
 * the map refetches, and this sheet is replaced by the real detail underneath
 * the user's finger. The lead reads "Wir schliessen auf …" for that beat, so
 * the wait is the spot opening rather than a form going quiet.
 *
 * Email cannot avoid the round trip through the inbox, so it carries the way
 * back in the continue URL: the map, with `?r=` re-opening this spot and
 * `claim=1` telling it to take the spot along.
 */
function SignupOffer({
  restaurant: r,
  prefix,
  de,
  onUnlocking,
  claimPending,
}: {
  restaurant: MapRestaurant;
  prefix: string;
  de: boolean;
  /** Pins the sheet to this branch while Google's sign-in-then-claim runs —
   *  see the `unlocking` state in LockedDetail. */
  onUnlocking: (busy: boolean) => void;
  /** Same wait, arriving from the inbox instead of from the Google popup. */
  claimPending: boolean;
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
      `${window.location.origin}${prefix}/map?r=${encodeURIComponent(r.slug)}&claim=1`
    );
  };

  const handleGoogle = async () => {
    if (googleBusy) return;
    track('google');
    setGoogleBusy(true);
    onUnlocking(true);
    try {
      await signInWithGoogle();
    } catch {
      setGoogleBusy(false);
      onUnlocking(false);
      return;
    }
    // Claim before the sheet is allowed to fall through: the refetch that
    // rides the new uid still has this spot locked, and without the hold the
    // reader would watch the promised spot turn into a pack offer.
    if (await claimSignupSpot(r.slug)) return;
    // Claim failed — the sign-in stands, so let the sheet resolve normally
    // into the signed-in (pack) offer rather than stranding it here.
    setGoogleBusy(false);
    onUnlocking(false);
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
          <p className={lockedStyles.starterLead}>
            {googleBusy || claimPending ? t.unlocking : sent ? t.sentLead : t.lead}
          </p>
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

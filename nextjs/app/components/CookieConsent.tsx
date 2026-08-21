'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslation } from '@/lib/i18n';
import { MODAL_CONTACT_EMAIL, type ModalBodySection } from '@/lib/i18n/translations';
import { getAnalyticsPageLocation, loadAnalytics, trackEvent } from '@/lib/analytics';
import { clearConsent, readConsent, recordConsent, writeConsent } from '@/lib/consent';

// Cookie info sections — kept here (not in MODAL_BODIES) so the banner copy
// stays close to what's actually loaded by the site, and DE is properly
// translated rather than falling back to English.
const COOKIE_SECTIONS_DE: ModalBodySection[] = [
  {
    h: 'Notwendig',
    p: 'Damit die Seite funktioniert, speichern wir ein paar Daten in deinem Browser — kein Tracking. Nur beim letzten Punkt liegt zusätzlich ein Eintrag bei uns:',
    list: [
      { strong: 'Login-Session', text: ' — hält dich eingeloggt (Firebase Auth)' },
      { strong: 'Sprache', text: ' — merkt sich DE/EN' },
      { strong: 'Cookie-Auswahl', text: ' — damit wir dich nicht nochmal fragen' },
      {
        strong: 'Einwilligungs-Nachweis',
        text: ' — eine zufällige Kennung plus ein Eintrag bei uns mit deiner Antwort, dem Zeitpunkt und der Version dieses Textes. Dazu sind wir verpflichtet: wir müssen belegen können, dass wir gefragt haben. Kein Name, keine IP.',
      },
    ],
  },
  {
    h: 'Statistik (nur bei Akzeptieren)',
    p: 'Google Analytics 4 (Google Ireland Ltd.) — Seitenaufrufe, grobe Geräte-Infos und eine zufällige Kennung, die in einem Cookie liegt. Kein Name, keine E-Mail, keine genaue Position, aber es ist keine Anonymisierung: über die Kennung sind deine Aufrufe innerhalb dieser Seite verknüpfbar. Die Daten werden bei Google verarbeitet, auch in den USA. Lädt erst nach deinem Klick auf „Ja, gerne"; bei „Nein, danke" wird nichts davon geladen und die Kennung entsteht gar nicht erst.',
  },
  {
    h: 'Drittanbieter',
    p: 'Diese Dienste werden eingebunden, setzen aber keine Tracking-Cookies bei dir:',
    list: [
      { strong: 'Carto / MapLibre', text: ' — Kartenkacheln für die Food Map' },
      { strong: 'Sanity CDN', text: ' — Bilder und Inhalte' },
      {
        strong: 'Google Sign-In',
        text: ' — nur wenn du es nutzt; Google-Cookies liegen auf Googles Domain, nicht bei uns',
      },
    ],
  },
  {
    h: 'Cookies verwalten',
    p: 'Im Browser jederzeit löschbar. Frage zurückholen: unten im Footer auf „Cookies verwalten" tippen — oder die Cookies „cookieConsent" und „consentId" löschen und neu laden. Ändert sich dieser Text, fragen wir von selbst nochmal.',
  },
  { h: 'Kontakt', p: 'Fragen? {mail}' },
];

const COOKIE_SECTIONS_EN: ModalBodySection[] = [
  {
    h: 'Necessary',
    p: 'So the site works as expected, we store small bits of data in your browser — no tracking. Only the last one also leaves a record on our side:',
    list: [
      { strong: 'Login session', text: ' — keeps you signed in (Firebase Auth)' },
      { strong: 'Language', text: ' — remembers DE/EN' },
      { strong: 'Cookie choice', text: " — so we don't ask you again" },
      {
        strong: 'Proof of consent',
        text: ' — a random identifier plus a record on our side holding your answer, when you gave it and which version of this text you read. We are required to keep it: we have to be able to show that we asked. No name, no IP.',
      },
    ],
  },
  {
    h: 'Analytics (only if you accept)',
    p: 'Google Analytics 4 (Google Ireland Ltd.) — page views, basic device info and a random identifier stored in a cookie. No name, no email, no precise location — but it is not anonymisation: that identifier links your visits within this site. The data is processed by Google, including in the US. Loaded only after you say yes; "No, thanks" means none of it loads and the identifier is never created.',
  },
  {
    h: 'Third-party services',
    p: "These are loaded by the page but don't drop tracking cookies on you:",
    list: [
      { strong: 'Carto / MapLibre', text: ' — map tiles for the Food Map' },
      { strong: 'Sanity CDN', text: ' — photos and content' },
      {
        strong: 'Google Sign-In',
        text: " — only when you choose it; Google's cookies live on its domain, not ours",
      },
    ],
  },
  {
    h: 'Managing cookies',
    p: 'You can clear them in your browser any time. To see this question again, use "Cookie settings" in the footer — or delete the cookieConsent and consentId cookies and reload. If this text changes, we ask again on our own.',
  },
  { h: 'Contact', p: 'Questions? {mail}' },
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Best-effort removal of GA's first-party cookies when consent is withdrawn.
// The injected GA script can't be "unloaded" in-place, so handleDecline also
// reloads the page after calling this — next load sees 'declined' and never
// re-injects GA.
function clearGaCookies() {
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga') || n === '_gid');
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}`;
  }
}

// Renders a paragraph string, substituting {mail} with a mailto anchor.
function Paragraph({ text }: { text: string }) {
  if (!text.includes('{mail}')) return <p>{text}</p>;
  const [before, after] = text.split('{mail}');
  return (
    <p>
      {before}
      <a href={`mailto:${MODAL_CONTACT_EMAIL}`}>{MODAL_CONTACT_EMAIL}</a>
      {after}
    </p>
  );
}

function ModalBody({ sections }: { sections: ModalBodySection[] }) {
  return (
    <div className="cookie-info-body">
      {sections.map((s, i) => (
        <section className="cookie-info-card" key={i}>
          <h3>{s.h}</h3>
          <Paragraph text={s.p} />
          {s.list && (
            <ul>
              {s.list.map((item, j) => (
                <li key={j}>
                  <strong>{item.strong}</strong>
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/* Consent gate — a blocking dialog, not a bottom bar.
 *
 * The bar it replaced was fixed to the bottom edge, white on a white page and
 * dismissable by simply ignoring it, and almost nobody ever answered. An
 * unanswered question counts as a refusal, so the analytics were built on a
 * fraction of the traffic.
 *
 * So: a scrim, a centred ink card, no Escape, no outside-click, no close
 * button. The only way past it is one of the two answers — which is what the
 * GDPR permits and no more than that.
 *
 * "Accept" is the primary button and comes first; "decline" is the outlined
 * secondary next to it. That is as far as the emphasis may go: both answers
 * keep the same box, the same type, the same weight and the same single
 * click, and the decline label stays full-contrast white. Forcing the
 * decision is legal; making the refusal cost more than the yes is not — and
 * consent obtained that way is void, which would make the analytics it buys
 * unusable.
 */
export default function CookieConsent() {
  const { t, lang } = useTranslation();
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // After the dismiss transition finishes we UNMOUNT the gate (closed=true).
  // The gate is position:fixed; on iOS Safari the promoted GPU layer can
  // linger in the bottom-URL-bar zone until a reload. Dropping it from the DOM
  // clears that layer immediately. Reset when the gate reopens.
  const [closed, setClosed] = useState(false);
  const sections = lang === 'de' ? COOKIE_SECTIONS_DE : COOKIE_SECTIONS_EN;
  const cardRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(() => {
    setClosed(false);
    // Two frames: mount at the off-screen transform, then transition in. One
    // frame is not enough — the style would be coalesced with the insertion
    // and the card would simply appear.
    requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
  }, []);

  // On mount: if the user already answered, load GA (or don't) and stay out of
  // the way. If they haven't, put the question up immediately — the old bar
  // waited 1.5s, which only gave the eye time to settle somewhere else.
  //
  // The answer lives in a cookie (lib/consent.ts); an answer given before that
  // shipped is migrated out of localStorage here, once.
  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      setClosed(true);
      if (stored === 'accepted') loadAnalytics();
      return;
    }
    open();
  }, [open]);

  // Lock the page behind the gate. `touch-action: none` on the scrim is what
  // stops iOS Safari scrolling the page under it; the attribute below carries
  // the overflow lock for everyone else (app/globals.css).
  useEffect(() => {
    if (closed || !show) return;
    document.documentElement.setAttribute('data-consent-gate', 'open');
    return () => document.documentElement.removeAttribute('data-consent-gate');
  }, [closed, show]);

  // Focus goes into the card and stays there: Tab cycles, Escape collapses the
  // details panel but never closes the gate.
  useEffect(() => {
    if (closed || !show) return;
    const card = cardRef.current;
    if (!card) return;
    card.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExpanded(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [closed, show]);

  const handleAccept = () => {
    writeConsent('accepted');
    recordConsent('accepted', lang);
    setShow(false);
    setExpanded(false);
    setTimeout(() => {
      loadAnalytics();
      const { pageLocation, pagePath } = getAnalyticsPageLocation(window.location.href);
      // The route-level page-view effect ran before consent and correctly
      // dropped that event. Count the page where consent was granted now.
      trackEvent('page_view', {
        page_location: pageLocation,
        page_path: pagePath,
        page_title: document.title,
      });
    }, 600);
  };

  const handleDecline = () => {
    const gaWasLoaded = !!(window as Window & { __gaLoaded?: boolean }).__gaLoaded;
    writeConsent('declined');
    recordConsent('declined', lang);
    setShow(false);
    setExpanded(false);
    // Consent withdrawn while GA was already running this session (reopened via
    // the footer "Cookies verwalten" link): drop the GA cookies and reload so
    // the script stops — on reload, 'declined' prevents re-injection.
    if (gaWasLoaded) {
      clearGaCookies();
      setTimeout(() => window.location.reload(), 200);
    }
  };

  // Reopen from anywhere (footer "Cookies verwalten") so users can withdraw or
  // change consent as easily as they granted it.
  useEffect(() => {
    const reopen = () => {
      clearConsent();
      setExpanded(true);
      open();
    };
    window.addEventListener('eatthis:open-cookie-settings', reopen);
    return () => window.removeEventListener('eatthis:open-cookie-settings', reopen);
  }, [open]);

  if (closed) return null;

  return (
    <div className={`cookie-gate${show ? ' show' : ''}`}>
      {/* Not a dismiss target: clicking the scrim does nothing on purpose. */}
      <div className="cookie-scrim" aria-hidden="true" />
      <div
        ref={cardRef}
        className={`cookie-consent${expanded ? ' expanded' : ''}`}
        id="cookieConsent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookieTitle"
        aria-describedby="cookieText"
        tabIndex={-1}
        onTransitionEnd={(e) => {
          // When the dismiss transition (the card's own transform) finishes,
          // drop the gate from the DOM so its fixed compositing layer can't
          // keep iOS Safari's bottom bar painted solid. Guard to the card
          // itself (not a child like the chevron) and only on the way out.
          if (e.target === e.currentTarget && e.propertyName === 'transform' && !show) {
            setClosed(true);
          }
        }}
      >
        <div className="cookie-content">
          <div className="cookie-copy">
            <span className="cookie-mark" aria-hidden="true" />
            <div className="cookie-copy-main">
              <h2 className="cookie-title" id="cookieTitle">
                {t('cookie.title')}
              </h2>
              <p className="cookie-text" id="cookieText">
                {t('cookie.text')}
              </p>
              <button
                type="button"
                className="cookie-info-trigger"
                id="cookieInfoTrigger"
                aria-expanded={expanded}
                aria-controls="cookieInfoPanel"
                onClick={() => setExpanded((e) => !e)}
              >
                {t('cookie.moreInfo')}
                <svg
                  className="cookie-info-chevron"
                  width={10}
                  height={10}
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  aria-hidden="true"
                >
                  <path d="M2 3.5L5 6.5L8 3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          {expanded && (
            <div className="cookie-expand" id="cookieInfoPanel">
              <ModalBody sections={sections} />
            </div>
          )}
          <div className="cookie-buttons">
            <button
              type="button"
              className="cookie-btn cookie-btn-accept"
              id="cookieAccept"
              onClick={handleAccept}
            >
              {t('cookie.accept')}
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-decline"
              id="cookieDecline"
              onClick={handleDecline}
            >
              {t('cookie.decline')}
            </button>
          </div>
          {/* Datenschutzerklärung and Impressum have to be reachable at all
              times, and this dialog is over everything. Without these two the
              only way to the policy would be to answer the question first —
              which is exactly the pressure that voids the consent. */}
          <nav className="cookie-legal" aria-label={lang === 'de' ? 'Rechtliches' : 'Legal'}>
            <Link href="/datenschutz">{t('footer.datenschutz')}</Link>
            <span aria-hidden="true">·</span>
            <Link href="/impressum">{t('burger.impressum')}</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

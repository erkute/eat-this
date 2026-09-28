'use client';
// Home-hub section for Remy, the KI buddy — restyled into the homeV2 white
// vocabulary. Yellow is kept as Remy's accent (avatar circle, chip hover),
// NOT as a full-section background band.
// Behavior unchanged: daypart greeting, IntersectionObserver "talk" effect,
// and chat/quick-ask dispatch via dispatchBuddyAsk.
import { useEffect, useRef, useState } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale, useTranslations } from 'next-intl';
import { stageFor } from '@/lib/buddy/greeting';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import type { Locale } from '@/lib/buddy/types';
import styles from './HubFragRemy.module.css';

/* Remys Hand — im Bild ist er nur Büste, die Hand ist dazugezeichnet: dieselbe
   Hautfarbe wie im Asset (#ffbb90, aus buddy.webp gemessen), dieselbe dicke
   schwarze Kontur. Erst die Finger, dann der Handballen darüber — seine
   Kontur zieht die Knöchellinie quer über die Fingerwurzeln, wie gezeichnet.
   Sie kommt von unten ins Bild, winkt und zeigt dann zum Chat (HubMotion);
   ohne Bewegung steht sie schon zum Chat gedreht da. */
function RemyHand() {
  return (
    <svg viewBox="0 0 100 210" width="100" height="210">
      <g fill="#ffbb90" stroke="#111" strokeWidth="5" strokeLinejoin="round">
        <rect x="29" y="20" width="15" height="58" rx="7.5" />
        <rect x="44" y="9" width="15" height="68" rx="7.5" />
        <rect x="59" y="15" width="15" height="62" rx="7.5" />
        <rect x="73" y="30" width="13" height="50" rx="6.5" transform="rotate(8 79 55)" />
        <rect x="16" y="60" width="16" height="44" rx="8" transform="rotate(-34 30 100)" />
        <path d="M26 66h62v26c0 16-12 26-28 26h-6c-16 0-28-10-28-26z" />
        <path d="M40 112h36v100H40z" />
      </g>
    </svg>
  );
}

export default function HubFragRemy() {
  const locale = useLocale() as Locale;
  const t = useTranslations('hub.fragRemy');
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<{
    line: string;
    lead: string;
    answers: [string, string];
  } | null>(null);
  const [talking, setTalking] = useState(false);
  const [draft, setDraft] = useState('');
  const spoke = useRef(false);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Daypart copy is client-only (the server's clock isn't the user's): SSR shows
  // the generic sub, the daypart lead + answers land after hydration.
  useEffect(() => {
    setStage(stageFor(new Date().getHours(), locale));
  }, [locale]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        // First appearance: Remy's mouth flaps briefly, as if he greets you.
        if (entry.isIntersecting && !spoke.current) {
          spoke.current = true;
          setTalking(true);
          moodTimer.current = setTimeout(() => setTalking(false), 2500);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(moodTimer.current);
    };
  }, []);

  const lead = stage ? stage.lead : t('sub');
  const fallbackAnswers: [string, string] =
    locale === 'de'
      ? ['Richtig gute Pizza', 'Schönes Dinner für zwei']
      : ['Really good pizza', 'A nice dinner for two'];
  const answers = stage?.answers ?? fallbackAnswers;

  function submitDraft() {
    const q = draft.trim();
    if (!q) return;
    dispatchBuddyAsk({ question: q });
    setDraft('');
  }

  return (
    <section
      className={`homeV2 hv-section hv-wrap ${styles.section}`}
      id="hub-fragremy"
      data-hub-fragremy=""
    >
      {/* Body: Remy avatar, headline, copy + actions as one stage */}
      <div className={styles.body}>
        <div className={styles.ask}>
          <div className={`hv-head ${styles.panelHead}`}>
            <h2 className="hv-title">
              <span className={styles.titleLine}>
                {locale === 'de' ? 'Keine Idee?' : 'No idea?'}
              </span>
              <span className={styles.titleLine}>
                {locale === 'de' ? 'Frag Remy.' : 'Ask Remy.'}
              </span>
            </h2>
          </div>

          {/* Copy + interactions */}
          <div className={styles.copy}>
            <p className={styles.lead} data-fragremy-lead="">
              {lead}
            </p>

            <div className={styles.actions}>
              <div className={styles.chips} data-fragremy-chips="">
                {answers.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`hv-chip ${styles.chip}`}
                    onClick={() => dispatchBuddyAsk({ question: a })}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <form
                className={styles.chatin}
                data-fragremy-form=""
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDraft();
                }}
              >
                <input
                  className={styles.input}
                  data-fragremy-input=""
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('inputPlaceholder')}
                  aria-label={t('inputPlaceholder')}
                />
                <button
                  className={`hv-btn ${styles.send}`}
                  type="submit"
                  aria-label={t('sendAria')}
                >
                  <span aria-hidden="true">{t('sendAria')}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Remy avatar */}
        <div className={styles.avatarWrap} ref={stageRef} data-fragremy-avatar="">
          <span className={styles.hand} data-fragremy-hand="" aria-hidden="true">
            <RemyHand />
          </span>
          <div className={styles.avatar} data-talking={talking ? '' : undefined}>
            <Image
              className={styles.face}
              src="/buddy/buddy.webp"
              alt="Remy"
              fill
              sizes="(max-width: 899px) min(92vw, 560px), (max-width: 1360px) 38vw, 520px"
              loading="lazy"
            />
            <Image
              className={styles.faceOpen}
              src="/buddy/buddy-open.webp"
              alt=""
              fill
              sizes="(max-width: 899px) min(92vw, 560px), (max-width: 1360px) 38vw, 520px"
              loading="lazy"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

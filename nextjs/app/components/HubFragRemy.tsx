'use client';
// Home-hub section for Remy, the KI buddy — restyled into the homeV2 white
// vocabulary. Yellow is kept as Remy's accent (avatar circle, chip hover),
// NOT as a full-section background band.
// Daypart greeting and chat/quick-ask dispatch via dispatchBuddyAsk. Der
// Auftritt (Fragezeichen, „Frag Remy.", Remy schießt hoch und redet), sein
// Lachen und das Reden beim Scrollen gehören HubMotion — über
// `data-fragremy-*`-Haken und Attribute, die React nicht verwaltet.
import { useEffect, useState, type ReactNode } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale, useTranslations } from 'next-intl';
import { stageFor } from '@/lib/buddy/greeting';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import type { Locale } from '@/lib/buddy/types';
import styles from './HubFragRemy.module.css';

const REMY_SIZES = '(max-width: 899px) min(92vw, 560px), (max-width: 1360px) 38vw, 520px';

interface Props {
  /** Die erste Hälfte der Tafel: „Worauf hast du Lust?" mit den Kategorien
   *  (CategoriesRail, vom Server gerendert). Remy beantwortet darunter
   *  dieselbe Frage im Gespräch — eine Tafel, eine Frage, zwei Wege. */
  choices?: ReactNode;
}

export default function HubFragRemy({ choices }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations('hub.fragRemy');
  const [stage, setStage] = useState<{
    line: string;
    lead: string;
    answers: [string, string];
  } | null>(null);
  const [draft, setDraft] = useState('');

  // Daypart copy is client-only (the server's clock isn't the user's): SSR shows
  // the generic sub, the daypart lead + answers land after hydration.
  useEffect(() => {
    setStage(stageFor(new Date().getHours(), locale));
  }, [locale]);

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
          {choices}
          <div className={`hv-head ${styles.panelHead}`}>
            <h3 className="hv-title">
              <span className={styles.titleLine}>
                {locale === 'de' ? 'Keine Idee' : 'No idea'}
                <span className={styles.titleMark} data-fragremy-q="">
                  ?
                </span>
              </span>
              <span className={styles.titleLine} data-fragremy-ask="">
                {locale === 'de' ? 'Frag Remy.' : 'Ask Remy.'}
              </span>
            </h3>
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

        {/* Remys Platz, unbewegt: daran misst HubMotion, wann die leere
            Fläche im Bild ist und er hochschießt. */}
        <span className={styles.avatarSpot} data-fragremy-spot="" aria-hidden="true" />

        {/* Remy avatar */}
        <div className={styles.avatarWrap} data-fragremy-avatar="">
          <div className={styles.avatar}>
            {/* Das Quadrat, in dem die Zeichnung steht, unten in `.avatar`. */}
            <div className={styles.head}>
              <Image
                className={styles.face}
                src="/buddy/buddy.webp"
                alt="Remy"
                fill
                sizes={REMY_SIZES}
                loading="lazy"
              />
              <Image
                className={styles.faceOpen}
                src="/buddy/buddy-open.webp"
                alt=""
                fill
                sizes={REMY_SIZES}
                loading="lazy"
                aria-hidden="true"
              />
              <Image
                className={styles.faceLaugh}
                src="/buddy/buddy-laugh.webp"
                alt=""
                fill
                sizes={REMY_SIZES}
                loading="lazy"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

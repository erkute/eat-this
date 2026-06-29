'use client';
// Home-hub section for Remy, the KI buddy — restyled into the homeV2 white
// vocabulary. Yellow is kept as Remy's accent (avatar circle, chip hover),
// NOT as a full-section background band.
// Behavior unchanged: daypart greeting, IntersectionObserver "talk" effect,
// and chat/quick-ask dispatch via dispatchBuddyAsk.
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { stageFor } from '@/lib/buddy/greeting';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import type { Locale } from '@/lib/buddy/types';
import styles from './HubFragRemy.module.css';

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
      {/* Section header — homeV2 pattern */}
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {locale === 'de' ? 'Keine Idee? Frag Remy.' : 'No idea? Ask Remy.'}
        </h2>
        <span className="hv-link">{t('title')}</span>
      </div>

      {/* Body: Remy avatar (yellow) left, copy + actions right */}
      <div className={styles.body}>
        {/* Yellow avatar — Remy's signature colour lives here */}
        <div className={styles.avatarWrap} ref={stageRef} data-fragremy-avatar="">
          <div className={styles.avatar} data-talking={talking ? '' : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.face}
              src="/buddy/buddy.webp"
              alt="Remy"
              width={200}
              height={200}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.faceOpen}
              src="/buddy/buddy-open.webp"
              alt=""
              width={200}
              height={200}
              aria-hidden="true"
            />
          </div>
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
              <button className={`hv-btn ${styles.send}`} type="submit" aria-label={t('sendAria')}>
                <span aria-hidden="true">{t('sendAria')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

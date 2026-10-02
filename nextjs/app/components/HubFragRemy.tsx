'use client';
// Remys Tafel auf der Startseite (Variante A „Remy erzählt", gewählt am
// 02.10.2026): eine Frage statt zwei. Remy fragt „Worauf hast du Lust?", die
// Kategorien sind die Antworten (CategoriesRail), darunter zwei
// Beispiel-Fragen zur Tageszeit und das Feld für die freie Antwort — beide
// gehen in seinen Chat. Darüber steht, was Remy gerade
// sagt: erst ein Satz zur Tageszeit, dann zu der Kategorie, auf die man zeigt
// oder die er selbst durchgeht. Auftritt, Reden, Satzwechsel und Lachen
// gehören HubMotion (`armFragRemy`, `armRemySays`) — über
// `data-fragremy-*`/`data-remy-say`-Haken und Attribute, die React nach dem
// ersten Rendern nicht mehr anfasst.
import { useEffect, useState } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale, useTranslations } from 'next-intl';
import { categoryLine, stageFor } from '@/lib/buddy/greeting';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import type { Locale } from '@/lib/buddy/types';
import CategoriesRail from './CategoriesRail';
import styles from './HubFragRemy.module.css';

const REMY_SIZES = '(max-width: 899px) min(92vw, 560px), (max-width: 1360px) 38vw, 520px';

interface Props {
  /** Die Kategorien (Slug → Name): Remys Antworten auf seine Frage, und zu
   *  jeder sagt er einen Satz. */
  categoryNames: Record<string, string>;
}

export default function HubFragRemy({ categoryNames }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations('hub.fragRemy');
  const [stage, setStage] = useState<{ lead: string; answers: [string, string] } | null>(null);
  const [draft, setDraft] = useState('');

  // Die Tageszeit kennt nur der Browser (die Uhr des Servers ist nicht die des
  // Besuchers): der Server rendert den allgemeinen Satz und zwei Fragen, die
  // immer passen.
  useEffect(() => {
    setStage(stageFor(new Date().getHours(), locale));
  }, [locale]);
  const lead = stage?.lead ?? null;
  const answers: [string, string] =
    stage?.answers ??
    (locale === 'de'
      ? ['Richtig gute Pizza', 'Schönes Dinner für zwei']
      : ['Really good pizza', 'A nice dinner for two']);

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
      <div className={styles.body}>
        <h2 className={`hv-title ${styles.title}`} data-fragremy-title="">
          {locale === 'en' ? 'What are you craving?' : 'Worauf hast du Lust?'}
        </h2>

        {/* Was Remy sagt: über allem nur „Remy" (Ansage 02.10.2026), darunter
            liegen alle seine Sätze übereinander in einer Box, so hoch wie
            der längste — wechselt er, springt darunter nichts (bis
            02.10.2026 schob ein fünfzeiliger Satz am Desktop Kategorien und
            Feld um bis zu 70px). Zu sehen ist der mit `data-on`; den Wechsel
            rollt HubMotion (`armRemySays`). Kein `aria-live`: er geht die
            Kategorien von selbst durch, alle drei Sekunden ein neuer Satz
            wäre im Screenreader nur Lärm. */}
        <div className={styles.say} data-fragremy-say="">
          <span className={styles.kicker}>
            <span className={styles.mk} aria-hidden="true" />
            Remy
          </span>
          <div className={styles.lines}>
            <p className={styles.said} data-remy-say="lead" data-on="">
              {lead ?? t('sub')}
            </p>
            {Object.entries(categoryNames).map(([slug, name]) => (
              <p key={slug} className={styles.said} data-remy-say={slug}>
                {categoryLine(locale, slug, name)}
              </p>
            ))}
            <p className={styles.said} data-remy-say="listen">
              {locale === 'en' ? "Go on, I'm listening." : 'Schieß los, ich hör zu.'}
            </p>
          </div>
        </div>

        <CategoriesRail categoryNames={categoryNames} locale={locale} />

        {/* Zwei Beispiel-Fragen wie auf main (Ansage 02.10.2026): wer nichts
            Passendes unter den Kategorien findet, fragt Remy mit einem Tipp. */}
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

        {/* Remys Platz, unbewegt: daran misst HubMotion, wann die leere
            Fläche im Bild ist und er hochschießt. */}
        <span className={styles.avatarSpot} data-fragremy-spot="" aria-hidden="true" />

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

'use client';
// Remys Tafel auf der Startseite (Variante A „Remy erzählt", gewählt am
// 02.10.2026): eine Frage statt zwei. Remy fragt „Worauf hast du Lust?", die
// Kategorien sind die Antworten (`choices`, CategoriesRail), das Feld darunter
// die freie Antwort — die geht in seinen Chat. Darüber steht, was Remy gerade
// sagt: erst ein Satz zur Tageszeit, dann zu der Kategorie, auf die man zeigt
// oder die er selbst durchgeht. Auftritt, Reden und Lachen gehören HubMotion
// (`armFragRemy`, `armRemySays`) — über `data-fragremy-*`-Haken und
// Attribute, die React nicht verwaltet.
import { useEffect, useState, type ReactNode } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale, useTranslations } from 'next-intl';
import { stageLeadFor } from '@/lib/buddy/greeting';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import type { Locale } from '@/lib/buddy/types';
import styles from './HubFragRemy.module.css';

const REMY_SIZES = '(max-width: 899px) min(92vw, 560px), (max-width: 1360px) 38vw, 520px';

interface Props {
  /** Die Antworten auf Remys Frage: die Kategorien (CategoriesRail, vom
   *  Server gerendert, jede mit Remys Satz in `data-remy-line`). */
  choices?: ReactNode;
}

export default function HubFragRemy({ choices }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations('hub.fragRemy');
  const [lead, setLead] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Die Tageszeit kennt nur der Browser (die Uhr des Servers ist nicht die des
  // Besuchers): der Server rendert den allgemeinen Satz.
  useEffect(() => {
    setLead(stageLeadFor(new Date().getHours(), locale));
  }, [locale]);

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

        {/* Was Remy gerade sagt. Den Satz tauscht HubMotion im Textknoten
            aus, den React hier anlegt — React setzt ihn nur einmal, wenn die
            Tageszeit feststeht. */}
        <p className={styles.say} data-fragremy-say="" aria-live="polite">
          <span className={styles.kicker}>
            <span className={styles.mk} aria-hidden="true" />
            Remy
          </span>
          <span className={styles.line} data-fragremy-line="">
            {lead ?? t('sub')}
          </span>
        </p>

        {choices}

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
            data-remy-line={locale === 'en' ? "Go on, I'm listening." : 'Schieß los, ich hör zu.'}
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

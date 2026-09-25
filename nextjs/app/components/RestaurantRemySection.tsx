// "Frag Remy" auf der Restaurant-Seite. Die Tafel selbst ist RemyAskPanel;
// hier stehen nur die Fragen, die auf DIESEN Spot gebunden sind: das Widget
// schickt den Seiten-Slug, die API löst ihn serverseitig auf, Remy antwortet
// über das Restaurant, das der Nutzer gerade liest — ohne Rückfrage.

import RemyAskPanel from './RemyAskPanel';
import styles from './RestaurantRemySection.module.css';

interface Props {
  locale: 'de' | 'en';
  /** Restaurant display name, already normalized by the page. */
  name: string;
  /** Bezirk name for the "something similar" chip; chip is dropped without it. */
  bezirk?: string;
}

export default function RestaurantRemySection({ locale, name, bezirk }: Props) {
  const de = locale === 'de';

  const chips: string[] = [
    de ? 'Was bestell ich hier am besten?' : 'What should I order here?',
    ...(bezirk ? [de ? `Was Ähnliches in ${bezirk}?` : `Something similar in ${bezirk}?`] : []),
    de ? 'Lohnt sich der Weg?' : 'Is it worth the trip?',
  ];

  return (
    <RemyAskPanel
      locale={locale}
      className={styles.section}
      /* „Noch was offen?" stand hier und las sich auf einer Restaurantseite
         wie die Frage nach den Öffnungszeiten. */
      titleLines={de ? ['Unsicher?', 'Frag Remy.'] : ['Not sure?', 'Ask Remy.']}
      /* Ein Satz, der den Markenclaim aufnimmt („We tell you what to eat") und
         ihn auf diesen Spot zieht. Hier stand vorher ein Feature-Absatz im
         Werbeton — der erklärte den Dienst, statt Lust zu machen. */
      lead={
        de
          ? `Er war schon da und weiß, was du bei ${name} bestellen musst.`
          : `He's been there. He knows what to order at ${name}.`
      }
      chips={chips}
      placeholder={de ? `Frag mich was zu ${name}…` : `Ask me about ${name}…`}
    />
  );
}

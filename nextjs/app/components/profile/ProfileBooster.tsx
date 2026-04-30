'use client';

import styles from './ProfileBooster.module.css';

// Image picks (1, 2, 5) are intentional design selection — booster3.webp exists
// but isn't shown here, booster4.webp doesn't exist. Don't "fix" the gap.
const PACKS = [
  {
    id: 'classic',
    image: '/pics/booster/booster1.webp',
    name: 'Klassik Pack',
    desc: '10 zufällige Must-Eats aus ganz Berlin',
    price: '€1,99',
  },
  {
    id: 'kiez',
    image: '/pics/booster/booster2.webp',
    name: 'Kiez Pack',
    desc: '10 Must-Eats aus deinem Lieblings-Bezirk',
    price: '€2,49',
  },
  {
    id: 'premium',
    image: '/pics/booster/booster5.webp',
    name: 'Premium Pack',
    desc: '15 Must-Eats inkl. exklusiver Geheim-Tipps',
    price: '€4,99',
  },
];

export default function ProfileBooster() {
  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <p className={styles.label}>Booster Packs — Coming Soon</p>
        <h2 className={styles.title}>Mehr Karten freischalten</h2>
        <p className={styles.intro}>
          Booster Packs bringen dir neue zufällige Must-Eats zu deinem Deck. Sei einer der Ersten, die sie öffnen.
        </p>
      </div>

      <div className={styles.grid}>
        {PACKS.map((pack) => (
          <div key={pack.id} className={styles.pack}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pack.image} alt="" className={styles.packImg} loading="lazy" />
            <div className={styles.packInfo}>
              <h3 className={styles.packName}>{pack.name}</h3>
              <p className={styles.packDesc}>{pack.desc}</p>
              <div className={styles.packFooter}>
                <span className={styles.packPrice}>{pack.price}</span>
                <button type="button" className={styles.packBtn} disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className={styles.footnote}>
        Wir benachrichtigen dich, sobald die Packs live sind.
      </p>
    </div>
  );
}

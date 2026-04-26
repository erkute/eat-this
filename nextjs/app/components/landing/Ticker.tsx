import styles from './landing.module.css';

const RESTAURANTS = [
  '893 Ryōtei', 'Barra', 'Borchardt', 'Buya Ramen Factory', 'CODA Dessert Dining',
  'Cocolo Ramen Mitte', 'Concierge Coffee', 'Diener Tattersall', 'Father Carpenter',
  'Five Elephant', 'GEMELLO', 'Gazzo', 'Julius', 'Le Balto',
  'ORA Restaurant & Wine Bar', 'Pinci', 'Pluto', 'Sardinen Bar',
  'Saveur de Bánh Mì', 'Spumante', 'St. Bart', 'Taktil',
  'The Barn Café', 'westberlin', 'Österelli',
];

export default function Ticker() {
  // Duplicate the list so the marquee animation can loop seamlessly.
  const items = [...RESTAURANTS, ...RESTAURANTS];
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack}>
        {items.map((name, i) => (
          <span key={i}>
            <span className={styles.tickerItem}>{name}</span>
            <span className={styles.tickerSep}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

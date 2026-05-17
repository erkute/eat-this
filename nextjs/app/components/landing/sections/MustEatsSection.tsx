import Image from 'next/image'
import styles from './MustEatsSection.module.css'

interface Props {
  headline: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  locale?: 'de' | 'en'
}

type MenuItem = {
  slug:        string
  dish:        string
  restaurant:  string
  district:    string
  description: string
}

type MenuGroup = {
  id:    string
  title: { de: string; en: string }
  items: MenuItem[]
}

const MENU: MenuGroup[] = [
  {
    id: 'coffee',
    title: { de: 'Coffee', en: 'Coffee' },
    items: [
      { slug: 'jules-cappuccino', dish: 'Cappuccino', restaurant: 'Jules Geisberg', district: 'Schöneberg',
        description: 'Not your average coffee' },
    ],
  },
  {
    id: 'breakfast',
    title: { de: 'Breakfast', en: 'Breakfast' },
    items: [
      { slug: 'bubar-galette', dish: 'Galette', restaurant: 'Bubar', district: 'Charlottenburg',
        description: 'Authentic Breton buckwheat galette with a fried egg' },
      { slug: 'aera-grilled-cheese', dish: 'Grilled Cheese', restaurant: 'AERA', district: 'Charlottenburg',
        description: 'Fresh bread, with butter, cheese and egg' },
    ],
  },
  {
    id: 'lunch',
    title: { de: 'Lunch', en: 'Lunch' },
    items: [
      { slug: 'romeos-sandwich', dish: 'Sandwich', restaurant: 'Romeo’s Sandwiches', district: 'Kreuzberg',
        description: 'Vegan Szechuan tofu, chili crisp, coriander mayo' },
      { slug: 'kitten-deli-sabich', dish: 'Sabich', restaurant: 'Kitten Deli', district: 'Kreuzberg',
        description: 'Roasted eggplant with tahini, soft-boiled egg' },
      { slug: 'schuesseldienst-rinder-schaufel', dish: 'Rinder Schaufel', restaurant: 'Schüsseldienst', district: 'Schöneberg',
        description: '18hr slow-cooked, potato-leek mash, chili pearls' },
      { slug: 'wen-cheng-biang-biang-lamb', dish: 'Biang Biang Lamb', restaurant: 'Wen Cheng', district: 'Prenzlauer Berg',
        description: 'Lamb, Wencheng sauce, cumin, scallions, cilantro' },
    ],
  },
  {
    id: 'dinner',
    title: { de: 'Dinner', en: 'Dinner' },
    items: [
      { slug: 'bar-basta-spicy-thai-sausage', dish: 'Thai Sausage', restaurant: 'Bar Basta', district: 'Mitte',
        description: 'With mashed potatoes & ginger jus' },
      { slug: 'bar-basta-odb-sandwich', dish: 'ODB Sandwich', restaurant: 'Bar Basta', district: 'Mitte',
        description: 'Meatball, melting onions, kale, ricotta salata' },
    ],
  },
  {
    id: 'pizza',
    title: { de: 'Pizza', en: 'Pizza' },
    items: [
      { slug: 'gemello-pizza', dish: 'Pizza', restaurant: 'GEMELLO', district: 'Prenzlauer Berg',
        description: 'Pumpkin cream, vegan Salsicia, mushrooms' },
      { slug: 'slice-society-tomate', dish: 'Tomate Slice', restaurant: 'Slice Society', district: 'Mitte',
        description: 'Tomato sauce, garlic butter breadcrumbs, chili oil' },
      { slug: 'gazzo-pizza-aubergine', dish: 'Pizza Aubergine', restaurant: 'Gazzo', district: 'Neukölln',
        description: 'Geröstete Auberginen, Mozzarella, Tomatensauce' },
    ],
  },
  {
    id: 'fastfood',
    title: { de: 'Fast Food', en: 'Fast Food' },
    items: [
      { slug: 'all-in-single-burger', dish: 'Single Burger', restaurant: 'ALL IN.', district: 'Prenzlauer Berg',
        description: 'Beef patty, american cheese, secret sauce' },
      { slug: 'hasir-doener', dish: 'Döner', restaurant: 'Hasir', district: 'Kreuzberg',
        description: 'Juicy veal, fresh salad, signature sauces' },
      { slug: 'uludag-doener', dish: 'Döner', restaurant: 'Bursa Uludağ', district: 'Schöneberg',
        description: 'Saftiges Lamm, knuspriges Brot, hauseigene Soßen' },
      { slug: 'saveur-banh-mi', dish: 'Banh Mi', restaurant: 'Saveur de Bánh Mì', district: 'Schöneberg',
        description: 'Baguette, tofu, vegan pâté, mayo, marinated radish' },
    ],
  },
  {
    id: 'sweets',
    title: { de: 'Sweets', en: 'Sweets' },
    items: [
      { slug: 'sofi-morning-bun', dish: 'Morning Bun', restaurant: 'SOFI', district: 'Mitte',
        description: 'Croissant dough infused with cardamom and orange' },
      { slug: 'atelier-dough-donut', dish: 'Donut', restaurant: 'Atelier Dough', district: 'Kreuzberg',
        description: 'Not so plain donut' },
    ],
  },
]

export default function MustEatsSection({ headline, body, locale = 'de' }: Props) {
  void headline
  void body

  const mastheadTitle = locale === 'de' ? 'Unsere Must Eats.' : 'Our Must Eats.'

  return (
    <section className={styles.section} aria-labelledby="musteats-menu-header">
      <div className={styles.inner}>

        <header className={styles.masthead}>
          <h2 id="musteats-menu-header" className={styles.wordmark}>
            {mastheadTitle}
          </h2>
        </header>

        {MENU.map((group) => (
          <div key={group.id} className={styles.menuBlock}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{group.title[locale]}</h3>
              <span className={styles.sectionRule} aria-hidden="true" />
            </div>

            <ul className={styles.grid}>
              {group.items.map((item, i) => {
                // Cheeky alternating tilt + small vertical stagger so the
                // cards read as hand-laid posters, not a delivery-app grid.
                // Deterministic by index so re-renders don't reshuffle.
                const tilts  = [-2.2,  1.6, -1.2,  2.4]
                const drops  = [   0,   14,    8,   22]
                const rot    = tilts[i % tilts.length]
                const dropY  = drops[i % drops.length]
                return (
                <li
                  key={item.slug}
                  className={styles.card}
                  style={{
                    ['--rot'   as string]: `${rot}deg`,
                    ['--drop'  as string]: `${dropY}px`,
                  }}
                >
                  <div className={styles.photoFrame}>
                    <Image
                      src={`/pics/food/${item.slug}.webp`}
                      alt={`${item.dish} — ${item.restaurant}`}
                      width={720}
                      height={720}
                      className={styles.photo}
                      sizes="(max-width: 768px) 44vw, 30vw"
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <h4 className={styles.restaurantName}>{item.restaurant}.</h4>
                    <p className={styles.meta}>
                      <span className={styles.metaDish}>{item.dish}</span>
                      <span className={styles.metaDistrict}>{item.district}</span>
                    </p>
                  </div>
                </li>
              )})}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

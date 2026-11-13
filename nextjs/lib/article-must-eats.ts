import type { MapMustEat, MustEatCardBlock, PortableTextBlock } from './types';
import { normalizeName } from './normalizeName';

function linkedSlugs(block: PortableTextBlock): Set<string> {
  const slugs = new Set<string>();
  if (typeof block.restaurantSlug === 'string') slugs.add(block.restaurantSlug);
  if (Array.isArray(block.markDefs)) for (const mark of block.markDefs) {
    if (!mark || typeof mark.href !== 'string') continue;
    try {
      const url = new URL(mark.href, 'https://www.eatthisdot.com');
      if (url.origin !== 'https://www.eatthisdot.com') continue;
      const restaurant = url.pathname.match(/^\/(?:en\/)?restaurant\/([^/]+)\/?$/)?.[1];
      if (restaurant) slugs.add(decodeURIComponent(restaurant));
      if (/^\/(?:en\/)?map$/.test(url.pathname) && url.searchParams.has('r')) slugs.add(url.searchParams.get('r')!);
    } catch { /* Malformed editorial links carry no restaurant reference. */ }
  }
  return slugs;
}

/** Was die Auswahl braucht. Das Studio rechnet mit derselben Funktion vor. */
type ArticleMustEatCandidate = Pick<MapMustEat, '_id'> & { restaurant: Pick<MapMustEat['restaurant'], 'name' | 'slug' | 'district'> };

/** One card per article. Explicit placements win; prose needs a complete name. */
export function addArticleMustEats(content: PortableTextBlock[], cards: ArticleMustEatCandidate[], title = ''): PortableTextBlock[] {
  const placed = new Set(content.filter(b => b._type === 'mustEatCard').map(b => b.mustEatId));
  const referenced = new Set(content.flatMap(b => b._type === 'mustEatCard' ? [] : [...linkedSlugs(b)]));
  const names = cards.filter(card => card.restaurant.name.trim() && card.restaurant.slug).map(card => {
    const name = normalizeName(card.restaurant.name);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u');
    // Einwortnamen wie „Theke“ sind auch gewöhnliche Wörter. Ohne expliziten
    // Spot-Verweis brauchen sie einen Besuchskontext oder den Artikeltitel.
    const topic = new RegExp(`^${escaped}(?:[:.!?]|\\s+[–—-])`, 'iu').test(normalizeName(title));
    const contextual = new RegExp(`(?:\\b(?:[Bb]ei|[Vv]on|[Vv]om|[Ii]m|[Zz]u|[Aa]t|[Ff]rom|[Vv]isit)\\s+${escaped}(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])${escaped}\\s+(?:ist|hat|serviert|bietet|nennt|macht|is|has|serves|offers|makes)\\b)`, 'u');
    return { card, pattern, contextual, distinctive: /\s|\d/.test(name) || topic };
  });
  const output: PortableTextBlock[] = [];
  for (const block of content) {
    output.push(block);
    if (block._type === 'mustEatCard' || block._type === 'articleCard') continue;
    const slugs = linkedSlugs(block);
    const prose = block._type === 'block' && (!block.style || block.style === 'normal') && !block.listItem;
    const text = prose && Array.isArray(block.children)
      ? normalizeName(block.children.map(c => typeof c.text === 'string' ? c.text : '').join(''))
      : '';
    for (const { card, pattern, contextual, distinctive } of names) {
      if (placed.has(card._id)) continue;
      if (!slugs.has(card.restaurant.slug) && (referenced.has(card.restaurant.slug) || !text || !pattern.test(text) || (!distinctive && !contextual.test(text)))) continue;
      const teaser: MustEatCardBlock = {
        _type: 'mustEatCard', _key: `auto-must-eat-${card._id}`, mustEatId: card._id,
        restaurantName: card.restaurant.name, restaurantSlug: card.restaurant.slug,
        district: card.restaurant.district,
      };
      output.push({ ...teaser });
      placed.add(card._id);
    }
  }
  return moveTrailingCardsToMiddle(output);
}

/**
 * Steht der Spot erst am Schluss (Einzelporträts), landeten seine Karten
 * direkt über „Teilen“. Sie rücken dann an den Abschnittswechsel, der der
 * Mitte am nächsten liegt — gesucht wird nur in der mittleren Hälfte; ohne
 * Abschnittswechsel dort bleiben sie stehen.
 */
function moveTrailingCardsToMiddle(blocks: PortableTextBlock[]): PortableTextBlock[] {
  let tail = blocks.length;
  while (tail > 0 && blocks[tail - 1]._type === 'mustEatCard' && blocks[tail - 1]._key?.startsWith('auto-must-eat-')) tail--;
  if (tail === blocks.length) return blocks;
  const rest = blocks.slice(0, tail);
  const middle = rest.length / 2;
  const breaks = rest.flatMap((block, i) => block._type === 'block' && block.style === 'h2'
    && i >= rest.length / 4 && i <= (rest.length * 3) / 4 ? [i] : []);
  if (!breaks.length) return blocks;
  const at = breaks.reduce((best, i) => (Math.abs(i - middle) < Math.abs(best - middle) ? i : best));
  return [...rest.slice(0, at), ...blocks.slice(tail), ...rest.slice(at)];
}

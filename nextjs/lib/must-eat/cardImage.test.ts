import { describe, expect, it } from 'vitest';

import { mustEatCardSrc, mustEatCardSrcSet, mustEatImageUrl } from './cardImage';

describe('mustEatCardSrc', () => {
  it('haengt eine Breite der Routen-Leiter an', () => {
    expect(mustEatCardSrc('/api/must-eat-image/mustead-main-4', 360)).toBe(
      '/api/must-eat-image/mustead-main-4?w=360&auto=format&q=80'
    );
  });

  it('laesst die Kartenrueckseite und schon skalierte URLs in Ruhe', () => {
    expect(mustEatCardSrc('/pics/card-back.webp?v=7', 360)).toBe('/pics/card-back.webp?v=7');
    expect(mustEatCardSrc('/api/must-eat-image/x?w=180', 360)).toBe('/api/must-eat-image/x?w=180');
    expect(mustEatCardSrc(undefined, 360)).toBeUndefined();
  });

  it('haengt die Breite hinter eine Version', () => {
    expect(mustEatCardSrc('/api/must-eat-image/a?v=0123456789ab', 360)).toBe(
      '/api/must-eat-image/a?v=0123456789ab&w=360&auto=format&q=80'
    );
    expect(mustEatCardSrc('/api/must-eat-image/a?v=0123456789ab&w=180', 360)).toBe(
      '/api/must-eat-image/a?v=0123456789ab&w=180'
    );
  });
});

describe('mustEatImageUrl', () => {
  it('versioniert mit dem Hash aus dem Objektpfad', () => {
    expect(
      mustEatImageUrl(
        'mustead-main-4',
        `premium/must-eats/mustead-main-4/${'ab12'.repeat(16)}.webp`
      )
    ).toBe('/api/must-eat-image/mustead-main-4?v=ab12ab12ab12');
  });

  it('ein neues Motiv gibt eine neue Adresse', () => {
    const before = mustEatImageUrl('x', `premium/must-eats/x/${'a'.repeat(64)}.webp`);
    const after = mustEatImageUrl('x', `premium/must-eats/x/${'b'.repeat(64)}.webp`);
    expect(before).not.toBe(after);
  });
});

describe('mustEatCardSrcSet', () => {
  it('nennt nur Sprossen, die die Route kennt', () => {
    const widths = mustEatCardSrcSet('/api/must-eat-image/a')!
      .split(', ')
      .map((c) => Number(c.split(' ')[1].replace('w', '')));
    expect(widths).toEqual([180, 360, 440, 720]);
  });

  it('gibt fuer fremde Bilder kein srcset', () => {
    expect(mustEatCardSrcSet('/pics/card-back.webp?v=7')).toBeUndefined();
  });
});

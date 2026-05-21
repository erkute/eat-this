// Bowlby One (brand display) hat keine Turkish/Polish-Glyphen, also fallen
// Namen wie „Bursa Uludağ Kebapçısı" auf eine Fallback-Font zurück und
// stechen typografisch heraus. Hier nur die Letter mappen, die Berliner
// Restaurants tatsächlich tragen — deutsche Umlaute (Ä/Ö/Ü/ß) MÜSSEN
// erhalten bleiben, die rendert Bowlby sauber.
const SPECIAL: Record<string, string> = {
  ğ: 'g', Ğ: 'G',
  ş: 's', Ş: 'S',
  ç: 'c', Ç: 'C',
  ı: 'i', İ: 'I',
  ł: 'l', Ł: 'L',
  ø: 'o', Ø: 'O',
}

export function normalizeName(name: string): string {
  return name.replace(/[ğĞşŞçÇıİłŁøØ]/g, (c) => SPECIAL[c] ?? c)
}

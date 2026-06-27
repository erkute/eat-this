// Die Brand-Display-Fonts haben nicht alle Restaurant-Diakritika, also fallen
// Namen wie „Bursa Uludağ Kebapçısı" auf eine Fallback-Font zurück und
// stechen typografisch heraus. Hier nur die Letter mappen, die Berliner
// Restaurants tatsächlich tragen — deutsche Umlaute (Ä/Ö/Ü/ß) MÜSSEN
// erhalten bleiben, die rendert die Display-Font sauber.
const SPECIAL: Record<string, string> = {
  ğ: 'g', Ğ: 'G',
  ş: 's', Ş: 'S',
  ç: 'c', Ç: 'C',
  ı: 'i', İ: 'I',
  ł: 'l', Ł: 'L',
  ø: 'o', Ø: 'O',
  ō: 'o', Ō: 'O',
}

export function normalizeName(name: string): string {
  return name.replace(/[ğĞşŞçÇıİłŁøØōŌ]/g, (c) => SPECIAL[c] ?? c)
}

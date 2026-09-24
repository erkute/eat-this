// nextjs/lib/buddy/outOfCredit.ts
//
// Ist Remy gescheitert, weil das Anthropic-Guthaben leer ist? Am 23.09.2026
// war genau das der Fall: jede Antwort brach mit „Your credit balance is too
// low to access the Anthropic API" ab (HTTP 400, invalid_request_error), und
// der Chat sagte „Sorry — da ist was schiefgelaufen. Nochmal?" — eine
// Einladung, die bis zum Aufladen ins Leere lief. Die Route meldet diesen Fall
// deshalb eigens, und der Chat sagt „für heute ausgebucht".
//
// Erkannt am Wortlaut der Fehlermeldung: die SDK-Fehlerklasse allein sagt nur
// „400", und das ist auch jede kaputte Anfrage.
const CREDIT = /credit balance is too low/i;

export function isOutOfCredit(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { message?: unknown; error?: { error?: { message?: unknown } } };
  const nested = e.error?.error?.message;
  return (
    (typeof e.message === 'string' && CREDIT.test(e.message)) ||
    (typeof nested === 'string' && CREDIT.test(nested))
  );
}

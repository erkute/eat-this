/**
 * Where a completed sign-in lands.
 *
 * Home, unless the magic link carries somewhere better. A sign-in that started
 * mid-task — on a locked spot on the map, say — has a place it belongs back
 * in, and the continue URL is the only carrier that survives the trip through
 * the inbox. sessionStorage cannot do this job: the link routinely opens in a
 * different browser than the one that requested it (Gmail app → Chrome).
 *
 * Own origin only. The send endpoint allow-lists the value before it mints the
 * link, but by the time it reaches this function it has been through a URL bar
 * and is user-editable, so it is checked again rather than trusted twice over.
 * Anything else — a foreign origin, a protocol-relative `//evil.example`, an
 * unparseable string — falls back to home rather than failing loudly, because
 * the sign-in itself has already succeeded at this point.
 */
export function postSignInTarget(search: string, origin: string, home: string): string {
  try {
    const raw = new URLSearchParams(search).get('continueUrl');
    if (!raw) return home;
    const url = new URL(raw, origin);
    if (url.origin !== origin) return home;
    // `e` is the email carrier the mail added — it has done its job by now and
    // has no business in the address bar of the page we land on.
    url.searchParams.delete('e');
    const target = `${url.pathname}${url.search}`;
    // A continue URL pointing back at the sign-in handler would bounce the
    // user through it a second time, with a code that is already spent.
    return url.pathname === '/welcome' ? home : target;
  } catch {
    return home;
  }
}

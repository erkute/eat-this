/** Retry transient failures without consuming the per-account session flag. */
export async function confirmReferral(
  getToken: () => Promise<string>,
  signal: AbortSignal
): Promise<boolean> {
  for (let attempt = 0; attempt < 8 && !signal.aborted; attempt++) {
    try {
      const idToken = await getToken();
      if (signal.aborted) return false;
      const response = await fetch('/api/referral/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal,
      });
      if (response.ok && (await response.json()).completed === true) return true;
    } catch {
      if (signal.aborted) return false;
    }
    if (attempt === 7) break;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, Math.min(1000 * 2 ** attempt, 30_000));
      signal.addEventListener('abort', finish, { once: true });
      if (signal.aborted) finish();
    });
  }
  return false;
}

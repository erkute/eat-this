'use client';

let mapSurfacePromise: Promise<void> | null = null;

/**
 * Warm the ~800 KB MapLibre canvas chunk when the user shows intent — hover,
 * focus or touch on a map link (see MapIntentLink).
 *
 * Resolves when the attempt is over, successfully or not, and never rejects.
 * A preload is a bet: if the chunk request dies — a flaky connection, or a
 * deploy that rotated the chunk hashes while this document stayed open — the
 * navigation imports MapCanvasLayer again and IS the right place to fail
 * loudly. Two things must not happen here, and both did:
 *
 *   - The rejection escaping. The caller fires and forgets with `void`, which
 *     attaches no handler, so a dead chunk request became an unhandled
 *     rejection: a ChunkLoadError overlay in dev and Sentry noise in
 *     production, for a fetch nobody was waiting on.
 *   - The failure being cached. `??=` only tests for null, so one dead request
 *     pinned a rejected promise here and every later hover got that same
 *     rejection back — preloading stayed broken for the rest of the session,
 *     long after the network recovered. On failure the slot is cleared so the
 *     next intent retries; on success it stays, and the webpack runtime holds
 *     the module anyway.
 *
 * Deliberately `Promise<void>`: nothing is handed back, so no later caller can
 * mistake "the attempt finished" for "the module is here".
 */
export function preloadMapSurface(): Promise<void> {
  mapSurfacePromise ??= import('./MapCanvasLayer').then(
    () => undefined,
    () => {
      mapSurfacePromise = null;
    }
  );
  return mapSurfacePromise;
}

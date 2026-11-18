'use client';

let mapSurfacePromise: Promise<void> | null = null;

/**
 * Warm the MapLibre canvas chunk when the user shows intent: hover, focus or
 * touch on a map link (see MapIntentLink).
 *
 * Resolves when the attempt is over, successfully or not, and never rejects. A
 * preload is a bet: if the chunk request dies (a flaky connection, or a deploy
 * that rotated the chunk hashes while this document stayed open), the
 * navigation imports MapCanvasLayer again and is the right place to fail
 * loudly. Two things must not happen here:
 *
 *   - The rejection escaping. The caller fires and forgets with `void`, so a
 *     dead chunk request would be an unhandled rejection: a ChunkLoadError
 *     overlay in dev and Sentry noise in production, for a fetch nobody was
 *     waiting on.
 *   - The failure being cached. `??=` only tests for null, so one dead
 *     request would pin a rejected promise here for the rest of the session.
 *     On failure the slot is cleared so the next intent retries; on success
 *     it stays, and the webpack runtime holds the module anyway.
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

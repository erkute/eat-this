type Client = typeof import('./client-sdk');
let client: Promise<Client> | undefined;
let ready = false;
let started = false;
let detachEarlyListeners = () => {};

function loadClient(): Promise<Client> {
  return client ??= import('./client-sdk').then((sdk) => {
    ready = true;
    detachEarlyListeners();
    return sdk;
  }).catch(error => {
    client = undefined;
    throw error;
  });
}

/** Explicit errors start reporting immediately, including failures before the first paint. */
export function captureException(...args: Parameters<Client['captureException']>): void {
  void loadClient().then(sdk => sdk.captureException(...args)).catch(() => {});
}

export function captureMessage(...args: Parameters<Client['captureMessage']>): void {
  void loadClient().then(sdk => sdk.captureMessage(...args)).catch(() => {});
}

/** Keep native startup errors covered while the visible page gets the first network/CPU turn. */
export function startClientErrorReporting(): void {
  if (started || ready || typeof window === 'undefined') return;
  started = true;
  const onError = (event: ErrorEvent) => {
    if (!event.error && !event.message) return;
    captureException(event.error ?? new Error(event.message), {
      mechanism: { handled: false, type: 'onerror' },
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    captureException(event.reason, {
      mechanism: { handled: false, type: 'onunhandledrejection' },
    });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  detachEarlyListeners = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
  const afterPaint = () => window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => { void loadClient().catch(() => {}); });
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afterPaint, { once: true });
  } else {
    afterPaint();
  }
}

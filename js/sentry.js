// js/sentry.js — Error tracking via Sentry
// Setup: https://sentry.io → New Project → Browser JS → copy DSN below

const SENTRY_DSN = 'https://8263bedea4ad73eab1d9c910ab4247eb@o4511200513818624.ingest.de.sentry.io/4511200529285200';
const ENVIRONMENT = window.location.hostname === 'localhost' ? 'development' : 'production';

// Only load Sentry in production and when DSN is configured
if (SENTRY_DSN && ENVIRONMENT === 'production') {
  import('https://browser.sentry-cdn.com/7.120.3/bundle.tracing.min.js')
    .then(({ init, browserTracingIntegration }) => {
      init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        release: 'eat-this@1.0.0',
        integrations: [browserTracingIntegration()],
        tracesSampleRate: 0.2,   // 20% of transactions for performance data
        replaysSessionSampleRate: 0,
        ignoreErrors: [
          // Browser extensions & network noise
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          /^Loading chunk \d+ failed/,
          /NetworkError/,
        ],
      });
    })
    .catch(() => {}); // Silently ignore if Sentry CDN is unavailable
}

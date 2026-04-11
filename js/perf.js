// js/perf.js — Firebase Performance Monitoring
// Tracks page load times and custom traces automatically.

import { getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getPerformance, trace } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-performance.js';

const app  = getApps()[0];
const perf = getPerformance(app);

// ─── Custom trace: CMS data load time ────────────────────────────────────────
// Called from cms.js via window hooks — measures how long CMS fetches take.
window._perfCmsStart = function perfCmsStart(name) {
  try {
    const t = trace(perf, 'cms_fetch_' + name);
    t.start();
    return t;
  } catch {
    return null;
  }
};

window._perfCmsStop = function perfCmsStop(t) {
  try { t?.stop(); } catch { /* ignore */ }
};

// ─── Custom trace: page navigation ───────────────────────────────────────────
// Wraps hash-based page transitions to measure render time per page.
window._perfTrackNavigation = function perfTrackNavigation(pageName) {
  try {
    const t = trace(perf, 'navigate_to_' + pageName);
    t.start();
    requestAnimationFrame(() => { try { t.stop(); } catch { /* ignore */ } });
  } catch { /* ignore */ }
};

// Firebase Performance automatically tracks:
// - First Contentful Paint (FCP)
// - DOM Interactive
// - Page load time
// No further setup needed for automatic metrics.

export { perf };

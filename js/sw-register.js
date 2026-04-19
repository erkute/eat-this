if ('serviceWorker' in navigator) {
  let refreshing = false;
  // When a new SW takes control of the page, auto-reload so the user gets
  // the freshly-cached HTML/CSS/JS without needing to clear cache manually.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

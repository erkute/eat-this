/* ============================================
   EAT THIS — Interactions & Animations
   ============================================ */

const CONFIG = {
  MOBILE_BREAKPOINT: 767, // px — matches CSS @media (max-width: 767px)
  SLIDE_INTERVAL: 4000, // ms — hero carousel speed
  NOTIFICATION_DURATION: 3000, // ms — toast auto-dismiss
  SEARCH_DEBOUNCE: 200, // ms — keyup debounce
  SEARCH_FOCUS_DESKTOP: 100, // ms — focus delay on desktop
  SEARCH_FOCUS_MOBILE: 400, // ms — focus delay on mobile (wait for keyboard)
  GEO_TIMEOUT: 5000, // ms — GPS timeout
  GEO_FALLBACK_DELAY: 0, // ms — show Berlin immediately, GPS overrides if available
  GEO_MAX_AGE: 60000, // ms — reuse cached GPS position (1 min only)
  BERLIN_CENTER: [52.52, 13.405],
};

// Lock to portrait mode on mobile
if (window.innerWidth <= CONFIG.MOBILE_BREAKPOINT && screen.orientation?.lock) {
  screen.orientation.lock('portrait').catch(() => {});
}

const STATIC_PAGE_SLUGS = ['about', 'contact', 'press', 'impressum', 'datenschutz', 'agb'];

/**
 * Render Sanity Portable Text blocks to a DocumentFragment.
 * Handles: h2, h3, paragraph, bullet list, numbered list, strong, em.
 * All text content set via textContent (XSS-safe).
 */
function renderPortableText(blocks) {
  if (!blocks || !blocks.length) return document.createDocumentFragment();

  const fragment = document.createDocumentFragment();
  let currentList = null;
  let currentListType = null;

  const closeList = () => {
    if (currentList) { fragment.appendChild(currentList); currentList = null; currentListType = null; }
  };

  const buildInline = (children) => {
    const span = document.createElement('span');
    (children || []).forEach(child => {
      const marks = child.marks || [];
      let node = document.createTextNode(child.text || '');
      marks.slice().reverse().forEach(mark => {
        const wrapper = document.createElement(
          mark === 'strong' ? 'strong' : mark === 'em' ? 'em' : 'span'
        );
        wrapper.appendChild(node);
        node = wrapper;
      });
      span.appendChild(node);
    });
    return span;
  };

  blocks.forEach(block => {
    if (block._type !== 'block') { closeList(); return; }

    if (block.listItem) {
      const listTag = block.listItem === 'number' ? 'ol' : 'ul';
      if (currentListType !== listTag) {
        closeList();
        currentList = document.createElement(listTag);
        currentListType = listTag;
      }
      const li = document.createElement('li');
      li.appendChild(buildInline(block.children));
      currentList.appendChild(li);
      return;
    }

    closeList();

    const tag = block.style === 'h2' ? 'h2' : block.style === 'h3' ? 'h3' : 'p';
    const el = document.createElement(tag);
    el.appendChild(buildInline(block.children));
    fragment.appendChild(el);
  });

  closeList();
  return fragment;
}

// Prevent browser from auto-restoring scroll position on hash navigation
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

document.addEventListener('DOMContentLoaded', () => {
  // ============================================
  // BODY OVERFLOW MANAGER
  // Prevents scroll-state conflicts when multiple modals are used.
  // On mobile (window-scroll): uses position:fixed trick so iOS Safari
  // scroll is reliably restored after any modal closes.
  // On desktop (app-pages scroll): sets overflow:hidden on body.
  // ============================================
  const bodyOverflow = (() => {
    let count = 0;
    let savedScrollY = 0;
    const isMobile = () => window.innerWidth < 768;
    return {
      lock() {
        count++;
        if (count > 1) return; // already locked
        if (isMobile()) {
          savedScrollY = window.scrollY;
          document.body.style.position = 'fixed';
          document.body.style.top = `-${savedScrollY}px`;
          document.body.style.width = '100%';
        } else {
          document.body.style.overflow = 'hidden';
        }
      },
      unlock() {
        count = Math.max(0, count - 1);
        if (count) return; // still locked by another modal
        if (isMobile()) {
          const restoreY = savedScrollY;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          // rAF ensures iOS Safari reflow is complete before restoring scroll
          requestAnimationFrame(() => window.scrollTo(0, restoreY));
        } else {
          document.body.style.overflow = '';
        }
      },
    };
  })();
  window.bodyOverflow = bodyOverflow;

  // ============================================
  // SYNC NAVBAR OFFSET
  // CSS calc(60px + env(safe-area-inset-top, 0px)) can use the 0px fallback on
  // iOS while @supports correctly adds the real safe-area (~59px on iPhone 16)
  // to the navbar padding.  Measuring offsetHeight after render is the only
  // reliable way to get the true navbar height and push content below it.
  // ============================================
  function syncNavbarOffset() {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    const navbar    = document.querySelector('.navbar');
    const appPages  = document.querySelector('.app-pages');
    const mapPage   = document.querySelector('.app-page[data-page="map"]');
    if (!navbar || !appPages) return;
    const h = navbar.offsetHeight;
    appPages.style.marginTop = h + 'px';
    if (mapPage) mapPage.style.top = h + 'px';
  }
  syncNavbarOffset();
  // Re-run after iOS Safari has finished resolving env(safe-area-inset-top).
  // The first call at DOMContentLoaded may still read 0px for the safe area.
  setTimeout(syncNavbarOffset, 80);
  setTimeout(syncNavbarOffset, 400);
  window.addEventListener('resize', syncNavbarOffset);

  // ============================================
  // THEME — Dark / Light mode
  // ============================================
  function initTheme() {
    const root = document.documentElement;

    function applyTheme(dark, persist) {
      if (dark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
      if (persist) {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      }
      syncToggles(dark);
      document.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
    }

    function syncToggles(dark) {
      const burger = document.getElementById('themeToggleBurger');
      if (burger) burger.setAttribute('aria-pressed', dark ? 'true' : 'false');
      document.querySelectorAll('.site-footer .theme-toggle').forEach(function (el) {
        el.setAttribute('aria-pressed', dark ? 'true' : 'false');
      });
    }

    function isDark() {
      return root.getAttribute('data-theme') === 'dark';
    }

    // Wire burger toggle (always in DOM)
    const burgerToggle = document.getElementById('themeToggleBurger');
    if (burgerToggle) {
      burgerToggle.addEventListener('click', function () {
        applyTheme(!isDark(), true);
      });
    }

    // Footer toggles are stamped from a template into multiple pages — use event delegation
    document.addEventListener('click', function (e) {
      if (e.target.closest('.site-footer .theme-toggle')) {
        applyTheme(!isDark(), true);
      }
    });

    // React to OS preference change (only when no explicit user choice saved)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches, false);
      }
    });

    // Sync toggle visual state to whatever the no-flash script already set
    syncToggles(isDark());
  }

  initTheme();

  // ============================================
  // LOGIN MODAL — Firebase-independent open/close
  // auth.js sets the same handlers but may fail in CI due to external imports.
  // These handlers run unconditionally so the modal always works.
  // ============================================
  const _loginModal = document.getElementById('loginModal');
  const _loginClose = document.getElementById('loginClose');

  function _openLoginModal() {
    if (_loginModal) {
      _loginModal.classList.add('active');
      // No bodyOverflow.lock() — modal is position:fixed inset:0, full viewport,
      // so background scroll is invisible. Lock causes iOS position:fixed jump.
    }
  }
  function _closeLoginModal() {
    if (_loginModal) {
      _loginModal.classList.remove('active');
    }
  }
  // Prevent scroll-through while modal is open (same pattern as must-eat lightbox)
  if (_loginModal) {
    _loginModal.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  }

  // loginBtn is handled by auth.js (navigates to profile or opens modal)
  if (_loginClose) _loginClose.addEventListener('click', _closeLoginModal);
  // Click on modal overlay (outside content) closes it — works reliably in both
  // production and automated tests (no force:true needed)
  if (_loginModal)
    _loginModal.addEventListener('click', (e) => {
      const insideContent = e.composedPath().some(el => el.classList?.contains('login-modal-content'));
      if (!insideContent) _closeLoginModal();
    });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _loginModal?.classList.contains('active')) _closeLoginModal();
  });

  // Expose so auth.js can delegate if needed
  window.openLoginModal = window.openLoginModal || _openLoginModal;
  window.closeLoginModal = window.closeLoginModal || _closeLoginModal;


  const heroExploreBtn = document.getElementById('heroExploreBtn');
  if (heroExploreBtn) {
    heroExploreBtn.addEventListener('click', () => navigateToPage('musts'));
  }

  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletterEmail');
      const errorEl    = document.getElementById('newsletterError');
      const successEl  = document.getElementById('newsletterSuccess');
      const submitBtn  = document.getElementById('newsletterSubmit');
      const email      = emailInput ? emailInput.value.trim() : '';

      errorEl.hidden   = true;
      successEl.hidden = true;

      if (!email || !EMAIL_RE.test(email)) {
        errorEl.hidden = false;
        return;
      }

      submitBtn.disabled = true;
      try {
        const { httpsCallable } = await import(
          'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js'
        );
        if (!window._functionsEU) throw new Error('Newsletter service not ready. Please reload the page.');
        const fn = httpsCallable(window._functionsEU, 'subscribeNewsletter');
        await fn({ email });
        successEl.hidden = false;
        if (emailInput) emailInput.value = '';
      } catch (err) {
        console.error('[newsletter] subscription failed:', err?.code, err?.message, err);
        errorEl.textContent = err?.message ?? 'Something went wrong. Please try again.';
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ── Onboarding ──
  window._obGoTo = function(step) {
    [1, 2, 3, 4].forEach(n => {
      const el = document.getElementById('obStep' + n);
      if (el) el.hidden = (n !== step);
    });
  };

  window.showOnboarding = function() {
    if (localStorage.getItem('onboardingComplete')) return;
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
      overlay.hidden = false;
      overlay.querySelector('.ob-next-btn')?.focus();
      window._obGoTo(1);
    }
  };

  const obNext1 = document.getElementById('obNext1');
  const obNext2 = document.getElementById('obNext2');
  const obNext3 = document.getElementById('obNext3');
  const obSkip1 = document.getElementById('obSkip1');
  const obSkip2 = document.getElementById('obSkip2');
  const obSkip3 = document.getElementById('obSkip3');
  const obOpenPackBtn = document.getElementById('obOpenPackBtn');

  if (obNext1) obNext1.addEventListener('click', () => window._obGoTo(2));
  if (obNext2) obNext2.addEventListener('click', () => window._obGoTo(3));
  if (obNext3) obNext3.addEventListener('click', () => window._obGoTo(4));
  if (obSkip1) obSkip1.addEventListener('click', () => { localStorage.setItem('onboardingComplete', '1'); window._obGoTo(4); });
  if (obSkip2) obSkip2.addEventListener('click', () => { localStorage.setItem('onboardingComplete', '1'); window._obGoTo(4); });
  if (obSkip3) obSkip3.addEventListener('click', () => { localStorage.setItem('onboardingComplete', '1'); window._obGoTo(4); });

  if (obOpenPackBtn) {
    obOpenPackBtn.addEventListener('click', () => {
      const overlay = document.getElementById('onboardingOverlay');
      if (overlay) overlay.hidden = true;
      localStorage.setItem('onboardingComplete', '1');
      navigateToPage('musts');
    });
  }

  // ============================================
  // HERO SLIDER
  // ============================================
  const heroSlides = document.querySelectorAll('.hero-slide');
  let heroInterval = null;
  let currentSlide = 0;
  const slideInterval = CONFIG.SLIDE_INTERVAL;
  let altImgIntervals = [];

  function nextSlide() {
    if (!heroSlides.length) return;
    heroSlides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % heroSlides.length;
    const next = heroSlides[currentSlide];
    // Lazy-load: set background-image from data-src on first show
    if (next.dataset.src) {
      next.style.backgroundImage = `url('${next.dataset.src}')`;
      delete next.dataset.src;
    }
    next.classList.add('active');
  }

  if (heroSlides.length > 0) {
    // Preload the second slide immediately so first transition is seamless
    const second = heroSlides[1];
    if (second?.dataset.src) {
      second.style.backgroundImage = `url('${second.dataset.src}')`;
      delete second.dataset.src;
    }
    heroInterval = setInterval(nextSlide, slideInterval);
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================
  function showNotification(message, duration = CONFIG.NOTIFICATION_DURATION) {
    let notification = document.querySelector('.notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
  }
  window.showNotification = showNotification;

  // Notification styles live in css/style.css (keeps CSP style-src strict)

  // ============================================
  // SEARCH
  // ============================================
  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchClose = document.getElementById('searchClose');
  const searchTrigger = document.getElementById('searchTrigger');

  let mustEatsData = [];

  const newsData = Array.from(document.querySelectorAll('.news-card')).map((card) => ({
    title: card.dataset.title || '',
    category: card.dataset.categoryLabel || '',
    date: card.dataset.date || '',
    img: card.dataset.img || '',
    type: 'news',
  }));

  function openSearch() {
    if (searchOverlay) {
      searchOverlay.classList.add('active');
      bodyOverflow.lock();
      // On desktop focus immediately; on mobile wait for slide-up animation
      // to finish before focusing so the iOS keyboard doesn't hide the sheet
      setTimeout(
        () => {
          if (searchInput) searchInput.focus();
        },
        window.innerWidth > CONFIG.MOBILE_BREAKPOINT
          ? CONFIG.SEARCH_FOCUS_DESKTOP
          : CONFIG.SEARCH_FOCUS_MOBILE
      );
    }
  }

  function closeSearch() {
    if (searchOverlay) {
      searchOverlay.classList.remove('active');
      bodyOverflow.unlock();
      if (searchInput) searchInput.value = '';
      if (searchResults) {
        searchResults.innerHTML = `<div class="search-hint">${window.i18n ? window.i18n.t('search.hint') : 'Start typing to search...'}</div>`; // i18n: static translation key, safe
      }
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function search(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
      searchResults.innerHTML = `<div class="search-hint">${window.i18n ? window.i18n.t('search.hint') : 'Start typing to search...'}</div>`;
      return;
    }

    const results = [];
    const queryWords = q.split(' ').filter((w) => w.length > 1);

    mustEatsData.forEach((item) => {
      const searchable = `${item.dish} ${item.restaurant} ${item.district}`.toLowerCase();
      const matchScore = queryWords.filter((word) => searchable.includes(word)).length;
      if (matchScore === queryWords.length) {
        results.push({ ...item, matchScore });
      }
    });

    newsData.forEach((item) => {
      const searchable = `${item.title} ${item.category} ${item.date}`.toLowerCase();
      const matchScore = queryWords.filter((word) => searchable.includes(word)).length;
      if (matchScore === queryWords.length) {
        results.push({ ...item, matchScore });
      }
    });

    spots.forEach((item) => {
      const searchable =
        `${item.name} ${item.type} ${item.district} ${(item.categories || []).join(' ')}`.toLowerCase();
      const matchScore = queryWords.filter((word) => searchable.includes(word)).length;
      if (matchScore === queryWords.length) {
        results.push({
          type: 'spot',
          name: item.name,
          district: item.district,
          categories: item.categories || [],
          matchScore,
          spotData: item,
        });
      }
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    if (results.length === 0) {
      const _noRes = window.i18n ? window.i18n.t('search.noResults') : 'No results for';
      const _noResSub = window.i18n
        ? window.i18n.t('search.noResultsSub')
        : 'Try a different search term';
      searchResults.innerHTML = `<div class="search-no-results"><p>${_noRes} &ldquo;${escapeHtml(query)}&rdquo;</p><span>${_noResSub}</span></div>`;
      return;
    }

    let html = '';
    const mustEatsResults = results.filter((r) => r.type === 'must-eat');
    const newsResults_arr = results.filter((r) => r.type === 'news');
    const spotResults = results.filter((r) => r.type === 'spot');

    if (mustEatsResults.length > 0) {
      html += `<div class="search-section-title">${window.i18n.t('search.mustEats')}</div>`;
      mustEatsResults.slice(0, 5).forEach((item) => {
        html += `
          <div class="search-result-item" data-type="must-eat" data-dish="${escapeHtml(item.dish)}" data-restaurant="${escapeHtml(item.restaurant)}">
            <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.dish)}" class="search-result-img">
            <div class="search-result-content">
              <div class="search-result-dish">${escapeHtml(item.dish)}</div>
              <div class="search-result-restaurant">${escapeHtml(item.restaurant)} · ${escapeHtml(item.district)} · ${escapeHtml(item.price)}</div>
            </div>
          </div>
        `;
      });
    }

    if (newsResults_arr.length > 0) {
      html += `<div class="search-section-title">${window.i18n.t('search.news')}</div>`;
      newsResults_arr.slice(0, 3).forEach((item) => {
        html += `
          <div class="search-result-item" data-type="news" data-title="${escapeHtml(item.title)}">
            <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}" class="search-result-img">
            <div class="search-result-content">
              <div class="search-result-title">${escapeHtml(item.title)}</div>
              <div class="search-result-meta">${escapeHtml(item.category)} · ${escapeHtml(item.date)}</div>
            </div>
            <span class="search-result-type">News</span>
          </div>
        `;
      });
    }

    if (spotResults.length > 0) {
      html += `<div class="search-section-title">${window.i18n.t('search.restaurants')}</div>`;
      spotResults.slice(0, 5).forEach((item) => {
        html += `
          <div class="search-result-item" data-type="spot" data-name="${escapeHtml(item.name)}">
            <div class="search-result-content">
              <div class="search-result-dish">${escapeHtml(item.name)}</div>
              <div class="search-result-restaurant">${escapeHtml(item.district)} · ${(item.categories || []).map((c) => escapeHtml(c)).join(', ')}</div>
            </div>
            <span class="search-result-type">Map</span>
          </div>
        `;
      });
    }

    searchResults.innerHTML = html;

    searchResults.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        if (type === 'must-eat') {
          closeSearch();
          setTimeout(() => {
            navigateToPage('musts');
            _pushPage('musts');
            setTimeout(() => {
              const dish = item.dataset.dish;
              const restaurant = item.dataset.restaurant;
              const slot = Array.from(document.querySelectorAll('.album-slot[data-dish]')).find(
                (s) => s.dataset.dish === dish && s.dataset.restaurant === restaurant
              );
              if (slot) {
                const srcIdx = parseInt(slot.dataset.sourceIndex, 10);
                slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const albumCard = (window._albumCards || [])[srcIdx];
                if (albumCard && typeof window._openMustCard === 'function') {
                  setTimeout(() => window._openMustCard(slot, albumCard.imageUrl || '', albumCard.dish || ''), 400);
                }
              }
            }, 400);
          }, 100);
        } else if (type === 'news') {
          closeSearch();
          setTimeout(() => {
            navigateToPage('news');
            _pushPage('news');
            setTimeout(() => {
              const title = item.dataset.title;
              const article = Array.from(
                document.querySelectorAll('.news-featured, .news-card')
              ).find((a) => a.dataset.title === title);
              if (article) {
                const link = article.querySelector('a');
                if (link) link.click();
              }
            }, 500);
          }, 100);
        } else if (type === 'spot') {
          closeSearch();
          setTimeout(() => {
            navigateToPage('map');
            _pushPage('map');
            setTimeout(() => {
              const spotName = item.dataset.name;
              const spot = spots.find((s) => s.name === spotName);
              if (spot && typeof window._showSpotDetail === 'function')
                window._showSpotDetail(spot);
            }, 800);
          }, 100);
        }
      });
    });
  }

  if (searchTrigger) {
    searchTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }

  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        search(e.target.value);
      }, CONFIG.SEARCH_DEBOUNCE);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearch();
      closeCookieSettings();
      closeCookieInfoModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  // --- Navbar scroll state (disabled for app mode) ---
  const navbar = document.getElementById('navbar');

  function updateNavbar() {
    if (window.innerWidth > CONFIG.MOBILE_BREAKPOINT) {
      window.addEventListener(
        'scroll',
        () => {
          if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
          } else {
            navbar.classList.remove('scrolled');
          }
        },
        { passive: true }
      );
    }
  }
  updateNavbar();

  // --- Anchor links for non-app navigation (desktop) ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const targetPage = anchor.closest('.app-page');
      if (targetPage) return;

      if (window.innerWidth > CONFIG.MOBILE_BREAKPOINT) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const offset = 80;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  // --- Poster Card: zoom to center + flip on click, no idle tilt ---
  const eatCards = document.querySelectorAll('.eat-card');
  const eatBackdrop = document.createElement('div');
  eatBackdrop.className = 'eat-card-backdrop';
  document.body.appendChild(eatBackdrop);

  let activeCard = null,
    activePortal = null;

  function collapseCard() {
    if (!activeCard || !activePortal) return;
    const card = activeCard,
      portal = activePortal;
    portal.style.transition =
      'transform 0.42s cubic-bezier(0.32, 0, 0.67, 0), box-shadow 0.42s ease';
    portal.style.transform = 'translate(0,0) scale(1)';
    portal.style.boxShadow = 'none';
    eatBackdrop.classList.remove('active');
    activeCard = null;
    activePortal = null;
    setTimeout(() => {
      const scene = portal.querySelector('.eat-card-scene');
      if (scene) card.appendChild(scene);
      card.style.opacity = '';
      card.style.visibility = '';
      portal.remove();
    }, 430);
  }

  eatBackdrop.addEventListener('click', collapseCard);
  eatBackdrop.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      collapseCard();
    },
    { passive: false }
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') collapseCard();
  });

  function expandCard(card) {
    const rect = card.getBoundingClientRect();
    const targetW = Math.min(340, window.innerWidth * 0.85);
    const scale = targetW / rect.width;
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);

    const scene = card.querySelector('.eat-card-scene');
    const port = document.createElement('div');
    port.className = 'eat-card-portal';
    port.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:9997;cursor:pointer;transform-origin:center center;transform:translate(0,0) scale(1);transition:none;transform-style:preserve-3d;`;
    port.appendChild(scene);
    document.body.appendChild(port);
    card.style.opacity = '0';
    card.style.visibility = 'hidden';
    activeCard = card;
    activePortal = port;

    port.offsetHeight;
    port.style.transition = 'transform 0.48s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.48s ease';
    port.style.transform = `translate(${dx}px,${dy}px) scale(${scale})`;
    port.style.boxShadow = '0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)';
    eatBackdrop.classList.add('active');

    port.addEventListener('click', (pe) => {
      if (pe.target.closest('a')) return;
      pe.stopPropagation();
      collapseCard();
    });
    port.addEventListener(
      'touchend',
      (pe) => {
        if (pe.target.closest('a')) return;
        pe.preventDefault();
        pe.stopPropagation();
        collapseCard();
      },
      { passive: false }
    );
  }

  eatCards.forEach((card) => {
    let touchStartX = 0,
      touchStartY = 0,
      touchMoved = false;
    card.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
      },
      { passive: true }
    );
    card.addEventListener(
      'touchmove',
      (e) => {
        if (
          Math.abs(e.touches[0].clientX - touchStartX) > 8 ||
          Math.abs(e.touches[0].clientY - touchStartY) > 8
        ) {
          touchMoved = true;
        }
      },
      { passive: true }
    );
    card.addEventListener(
      'touchend',
      (e) => {
        if (touchMoved) return;
        if (e.target.closest('a')) return;
        e.preventDefault();
        if (activeCard) {
          collapseCard();
          return;
        }
        expandCard(card);
      },
      { passive: false }
    );

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (activeCard && activeCard !== card) {
        collapseCard();
        return;
      }
      if (activeCard) {
        collapseCard();
        return;
      }
      expandCard(card);
    });
  });

  // --- Must Eat Modal (kept for other potential uses) ---
  const modal = document.getElementById('eatModal');
  const modalClose = document.getElementById('modalClose');

  function closeModal() {
    modal.classList.remove('active');
    bodyOverflow.unlock();
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // --- Food Map (Leaflet) ---
  let foodMap = null;
  let mapInitialized = false;

  let spots = []; // populated from Sanity CMS on page load

  // ─── JSON-LD: inject fresh BlogPosting entries from Sanity ──────────────────
  async function updateNewsJsonLd() {
    const el = document.getElementById('siteJsonLd');
    if (!el || !window.CMS) return;
    try {
      const articles = await window.CMS.fetchNews('de');
      if (!articles || !articles.length) return;
      const data = JSON.parse(el.textContent);
      // Remove any stale BlogPosting entries
      data['@graph'] = data['@graph'].filter(n => n['@type'] !== 'BlogPosting');
      // Add latest 5 articles
      const lang = document.documentElement.lang || 'en';
      const postings = articles.slice(0, 5).map(a => ({
        '@type': 'BlogPosting',
        headline: a.title,
        description: a.excerpt || '',
        image: a.imageUrl || '',
        datePublished: a.dateISO || a.date,
        dateModified: a.dateISO || a.date,
        author: { '@id': 'https://www.eatthisdot.com/#organization' },
        publisher: { '@id': 'https://www.eatthisdot.com/#organization' },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://www.eatthisdot.com/#article/${a.id}`,
        },
        inLanguage: lang === 'de' ? 'de-DE' : 'en-US',
      }));
      data['@graph'].push(...postings);
      el.textContent = JSON.stringify(data);
    } catch { /* non-critical */ }
  }

  // ─── Restaurant schema helpers ─────────────────────────────────────────────
  function _normalizeOpeningHours(slots) {
    // Sanity: [{ days: "Mo–Fr", hours: "12:00–22:00" }, …]
    // Schema.org: ["Mo-Fr 12:00-22:00", …] — dashes must be ASCII hyphens
    if (!Array.isArray(slots)) return [];
    return slots
      .map(s => {
        const days  = String(s?.days  || '').replace(/[–—−]/g, '-').trim();
        const hours = String(s?.hours || '').replace(/[–—−]/g, '-').trim();
        if (!days || !hours || /closed|geschlossen/i.test(hours)) return null;
        return `${days} ${hours}`;
      })
      .filter(Boolean);
  }

  function _restaurantToSchema(r) {
    const id = `https://www.eatthisdot.com/#restaurant/${encodeURIComponent(r._id || r.name || '')}`;
    const cuisines = Array.isArray(r.categories) ? r.categories : [];
    const out = {
      '@type': 'Restaurant',
      '@id': id,
      name: r.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: r.address || '',
        addressLocality: 'Berlin',
        addressCountry: 'DE',
      },
    };
    if (typeof r.lat === 'number' && typeof r.lng === 'number') {
      out.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng };
    }
    if (r.photo)          out.image = r.photo;
    if (r.website)        out.url = r.website;
    if (r.mapsUrl)        out.hasMap = r.mapsUrl;
    if (r.reservationUrl) out.acceptsReservations = true;
    if (r.price)          out.priceRange = r.price;
    if (cuisines.length)  out.servesCuisine = cuisines;
    const oh = _normalizeOpeningHours(r.openingHours);
    if (oh.length)        out.openingHours = oh;
    return out;
  }

  function updateRestaurantsJsonLd(restaurants) {
    const el = document.getElementById('siteJsonLd');
    if (!el || !Array.isArray(restaurants) || !restaurants.length) return;
    try {
      const data = JSON.parse(el.textContent);
      if (!Array.isArray(data['@graph'])) return;
      data['@graph'] = data['@graph'].filter(n => n['@type'] !== 'ItemList' && n['@type'] !== 'Restaurant');

      // Embed up to 50 restaurants as first-class entities for rich results
      const entries = restaurants.slice(0, 50).map(_restaurantToSchema);
      data['@graph'].push(...entries);

      // Plus an ItemList that points at them — gives Google a ranked list
      data['@graph'].push({
        '@type': 'ItemList',
        '@id': 'https://www.eatthisdot.com/#restaurant-list',
        name: 'Curated Berlin Restaurants — EAT THIS',
        numberOfItems: entries.length,
        itemListElement: entries.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@id': e['@id'] },
        })),
      });
      el.textContent = JSON.stringify(data);
    } catch { /* non-critical */ }
  }

  function setActiveRestaurantSchema(r) {
    // Remove any previous active-restaurant block
    const prev = document.getElementById('activeRestaurantLd');
    if (prev) prev.remove();
    if (!r) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'activeRestaurantLd';
    script.textContent = JSON.stringify(_restaurantToSchema(r));
    document.head.appendChild(script);
  }

  // ─── CMS Bootstrap (inside DOMContentLoaded so spots is in scope) ─────────
  const cmsReady = (async () => {
    if (!window.CMS) return;

    // Hero settings — runs first so images load early
    try {
      const hero = await window.CMS.fetchHeroSettings();
      if (hero) {
        if (hero.tagline) {
          const taglineEl = document.querySelector('.hero-desktop-tagline');
          if (taglineEl) taglineEl.textContent = hero.tagline;
        }
        if (hero.desktopImageUrl || hero.mobileImageUrl) {
          const style = document.createElement('style');
          style.textContent =
            `.hero { background-image: url('${hero.desktopImageUrl || ''}'); }\n` +
            `@media (max-width: 1023px) { .hero { background-image: url('${hero.mobileImageUrl || hero.desktopImageUrl || ''}'); } }`;
          document.head.appendChild(style);
        }
      }
    } catch (err) {
      console.warn('[CMS] Hero settings fetch failed:', err.message); // eslint-disable-line no-console
    }

    // Start page content
    try {
      const startData = await window.CMS.fetchStartContent();
      if (startData) {
        if (window.i18n) window.i18n.applyStartContent(startData);
        [['s1ImageUrl', 'startImg1'], ['s2ImageUrl', 'startImg2'], ['s5ImageUrl', 'startImg5']].forEach(([key, id]) => {
          if (startData[key]) {
            const el = document.getElementById(id);
            if (el) el.src = startData[key];
          }
        });
      }
    } catch (err) {
      console.warn('[CMS] Start content fetch failed:', err.message); // eslint-disable-line no-console
    }

    // Must-Eat Album
    const ALBUM_TOTAL = 150;
    const ALWAYS_VISIBLE = 11;
    window._albumCards = [];

    try {
      const cards = await window.CMS.fetchMustEats(); // ordered by `order asc`
      window._albumCards = cards || [];
      mustEatsData = (cards || []).map(c => ({
        type: 'must-eat',
        dish: c.dish || '',
        restaurant: c.restaurant || '',
        district: c.district || '',
        price: c.price || '',
        img: c.imageUrl || '',
      }));
      renderAlbum();
    } catch (err) {
      console.warn('[CMS] Must-Eats fetch failed:', err.message); // eslint-disable-line no-console
    }

    function renderAlbum() {
      const gridEl = document.getElementById('albumGrid');
      if (!gridEl) return;

      const cards = window._albumCards || [];
      const available = Math.min(cards.length, ALBUM_TOTAL);

      gridEl.textContent = '';

      // Distribute the `available` cards evenly across the first TOP_BAND slots
      const TOP_BAND = 50;
      const spread = available > 0 ? Math.min(TOP_BAND, ALBUM_TOTAL) : 0;
      const cardPositions = {}; // slotIndex -> cardIndex
      if (available > 0) {
        for (let k = 0; k < available; k++) {
          const pos = Math.min(spread - 1, Math.round((k + 0.5) * spread / available));
          // if collision, shift forward until free
          let p = pos;
          while (cardPositions[p] !== undefined && p < spread) p++;
          cardPositions[p] = k;
        }
      }

      for (let i = 0; i < ALBUM_TOTAL; i++) {
        const cardIdx = cardPositions[i];
        const card = cardIdx !== undefined ? cards[cardIdx] : null;
        const slotEl = document.createElement('div');
        slotEl.className = 'album-slot ' + (card ? 'sharp' : 'empty');
        slotEl.dataset.cardIndex = String(i);
        if (card) {
          slotEl.dataset.dish       = card.dish || '';
          slotEl.dataset.restaurant = card.restaurant || '';
          slotEl.dataset.sourceIndex = String(cardIdx);
        }

        const inner = document.createElement('div');
        inner.className = 'album-slot-inner';

        if (card) {
          const bg = document.createElement('div');
          bg.className = 'album-slot-bg';
          bg.style.backgroundImage = 'url(' + card.imageUrl + ')';
          inner.appendChild(bg);
        } else {
          const back = document.createElement('div');
          back.className = 'album-slot-back';
          inner.appendChild(back);
        }

        slotEl.appendChild(inner);
        bindAlbumSlotTap(slotEl);
        gridEl.appendChild(slotEl);
      }

      updateAlbumProgress(available);
    }

    function bindAlbumSlotTap(slotEl) {
      let sx = 0, sy = 0, moved = false;
      slotEl.addEventListener('touchstart', (e) => {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false;
      }, { passive: true });
      slotEl.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
        if (Math.sqrt(dx * dx + dy * dy) > 10) moved = true;
      }, { passive: true });
      slotEl.addEventListener('touchend', (e) => {
        if (moved) return;
        e.preventDefault();
        handleAlbumSlotActivate(slotEl);
      }, { passive: false });
      slotEl.addEventListener('click', () => handleAlbumSlotActivate(slotEl));
    }

    function handleAlbumSlotActivate(slotEl) {
      if (slotEl.classList.contains('sharp')) {
        const srcIdx = parseInt(slotEl.dataset.sourceIndex, 10);
        const card = (window._albumCards || [])[srcIdx];
        if (card && typeof window._openMustCard === 'function') {
          window._openMustCard(slotEl, card.imageUrl || '', card.dish || '');
          return;
        }
      }
      shakeSlot(slotEl);
    }

    function shakeSlot(slotEl) {
      slotEl.classList.remove('shake');
      void slotEl.offsetWidth;
      slotEl.classList.add('shake');
      setTimeout(() => {
        slotEl.classList.remove('shake');
        if (!window._currentUser) {
          (window.openWelcomeModal || window.openLoginModal)?.();
        }
      }, 1000);
    }

function updateAlbumProgress(count) {
      const countEl = document.getElementById('albumProgCount');
      if (countEl) countEl.textContent = String(count);
    }

    function revealBlurredCards() { /* no-op: all cards render sharp */ }

    window._renderAlbum        = renderAlbum;
    window._revealBlurredCards = revealBlurredCards;

    // Restaurants
    try {
      const restaurants = await window.CMS.fetchRestaurants();
      if (restaurants && restaurants.length) {
        spots = restaurants.map((r) => ({
          ...r,
          type: (r.categories || []).join(' · '),
        }));
        window._allSpots = spots;
        updateRestaurantsJsonLd(restaurants);
      }
    } catch (err) {
      console.warn('[CMS] Restaurants fetch failed:', err.message); // eslint-disable-line no-console
    }

    // Bind must-card lightbox handlers now that cards are in the DOM
    bindMustCards();

    // Update JSON-LD with fresh news from Sanity (non-blocking)
    updateNewsJsonLd();
  })();
  // ─────────────────────────────────────────────────────────────────────────

  let globeShown = false;

  // Shared-state bridge — exposes closure vars to js/map-init.js (lazy loaded)
  window._eatMap = Object.create(null);
  Object.defineProperty(window._eatMap, 'spots',          { get: () => spots,          set: v => { spots = v; },          configurable: true });
  Object.defineProperty(window._eatMap, 'foodMap',        { get: () => foodMap,        set: v => { foodMap = v; },        configurable: true });
  Object.defineProperty(window._eatMap, 'mapInitialized', { get: () => mapInitialized, set: v => { mapInitialized = v; }, configurable: true });
  Object.defineProperty(window._eatMap, 'globeShown',     { get: () => globeShown,     set: v => { globeShown = v; },     configurable: true });
  window._eatMap.showNotification = showNotification;
  window._eatMap.cmsReady = cmsReady;
  window._eatMap.config = CONFIG;
  window._eatMap.navigateToPage = navigateToPage;
  window._eatMap.setActiveRestaurantSchema = setActiveRestaurantSchema;
  window._eatMap.updateRestaurantsJsonLd = updateRestaurantsJsonLd;

  // --- News Article Modal ---
  const newsModal = document.getElementById('newsModal');
  const newsModalClose = document.getElementById('newsModalClose');
  document.querySelectorAll('.news-featured, .news-card');
  let currentShareData = { title: '', text: '', url: window.location.href };

  // --- Meta tag helpers for SEO ---
  const _defaultMeta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
    ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
    ogUrl: document.querySelector('meta[property="og:url"]')?.content || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
  };

  function _updateArticleMeta(title, excerpt, imgUrl, slug) {
    document.title = `${title} — EAT THIS`;
    const desc = excerpt || title;
    const pageUrl = `https://www.eatthisdot.com/news/${slug}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${title} — EAT THIS`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', pageUrl);
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && imgUrl) ogImage.setAttribute('content', imgUrl);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', pageUrl);
  }

  function _restoreDefaultMeta() {
    document.title = _defaultMeta.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', _defaultMeta.description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', _defaultMeta.ogTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', _defaultMeta.ogDescription);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', _defaultMeta.ogUrl);
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', _defaultMeta.ogImage);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', _defaultMeta.canonical);
  }

  function portableTextToHtml(blocks) {
    if (!Array.isArray(blocks)) return String(blocks || '');
    const esc = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return blocks
      .map((block) => {
        if (block._type !== 'block' || !block.children) return '';
        const inner = block.children
          .map((span) => {
            let text = esc(span.text || '');
            const marks = span.marks || [];
            if (marks.includes('strong')) text = `<strong>${text}</strong>`;
            if (marks.includes('em')) text = `<em>${text}</em>`;
            if (marks.includes('underline')) text = `<u>${text}</u>`;
            return text;
          })
          .join('');
        switch (block.style) {
          case 'h2': return inner ? `<h2>${inner}</h2>` : '';
          case 'h3': return inner ? `<h3>${inner}</h3>` : '';
          case 'blockquote': return inner ? `<blockquote>${inner}</blockquote>` : '';
          default: return inner ? `<p>${inner}</p>` : '';
        }
      })
      .join('');
  }

  function buildRecCardEl(card, _allCards) {
    const art = document.createElement('article');
    art.className = 'news-rec-card';
    const a = document.createElement('a');
    a.href = '/news/' + (card.dataset.slug || '#');
    const imgWrap = document.createElement('div');
    imgWrap.className = 'news-rec-img';
    const img = document.createElement('img');
    img.src = card.dataset.img || '';
    img.alt = card.dataset.title || '';
    img.loading = 'lazy';
    imgWrap.appendChild(img);
    const body = document.createElement('div');
    body.className = 'news-rec-body';
    const cat = document.createElement('span');
    cat.className = 'news-rec-category';
    cat.textContent = card.dataset.categoryLabel || '';
    const hl = document.createElement('h4');
    hl.className = 'news-rec-headline';
    hl.textContent = card.dataset.title || '';
    body.appendChild(cat);
    body.appendChild(hl);
    a.appendChild(imgWrap);
    a.appendChild(body);
    art.appendChild(a);
    // Force a full page navigation so scroll starts at top and analytics
    // records a new page impression — no SPA swap for rec cards.
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = a.href;
    });
    return art;
  }

  function _applyNewsArticleContent(article) {
    const title = article.dataset.title;
    const img = article.dataset.img;
    const category = article.dataset.categoryLabel;
    const date = article.dataset.date;
    const rawContent = article.dataset.content || '';

    let contentHtml;
    try {
      const parsed = JSON.parse(rawContent);
      contentHtml = portableTextToHtml(parsed);
    } catch {
      contentHtml = rawContent.includes('<')
        ? rawContent
        : rawContent.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }

    document.getElementById('newsModalImg').src = img;
    document.getElementById('newsModalImg').alt = title;
    document.getElementById('newsModalCategory').textContent = category;
    document.getElementById('newsModalTitle').textContent = title;
    document.getElementById('newsModalDate').textContent = date;
    // safe: portableTextToHtml escapes all user data
    document.getElementById('newsModalContent').innerHTML = contentHtml; // safe-html

    const allCards = [...document.querySelectorAll('.news-card')];
    const others = allCards.filter((c) => c.dataset.title !== title).slice(0, 3);
    const moreSection = document.getElementById('newsArticleMore');
    const moreGrid = document.getElementById('newsArticleMoreGrid');
    if (moreSection && moreGrid) {
      moreGrid.textContent = '';
      if (others.length) {
        others.forEach((c) => moreGrid.appendChild(buildRecCardEl(c, allCards)));
        moreSection.hidden = false;
      } else {
        moreSection.hidden = true;
      }
    }

    currentShareData = {
      title: title,
      text: article.dataset.excerpt || title,
      url: window.location.href,
    };
  }

  function openNewsModal(article) {
    const articleEl = newsModal.querySelector('.news-article');
    // Only treat as "already open" if the page is showing real content —
    // on init the page is blank, so skip the leave animation.
    const hasContent = !!document.getElementById('newsModalTitle')?.textContent?.trim();
    const isAlreadyOpen = currentPage === 'news-article' && hasContent;

    const doOpen = () => {
      // Reset scroll BEFORE swapping content — this clears any scroll-anchor
      // reference point so the browser doesn't try to hold position.
      newsModal.scrollTop = 0;
      window.scrollTo(0, 0);

      _applyNewsArticleContent(article);

      // Navigate (no-op if already on this page, but sets scroll + activates page)
      if (!isAlreadyOpen) navigateToPage('news-article');

      // Reset again after display/content change — rAF catches post-paint
      // browser scroll restoration; setTimeout(0) catches anything after that.
      newsModal.scrollTop = 0;
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        newsModal.scrollTop = 0;
        window.scrollTo(0, 0);
      });
      setTimeout(() => {
        newsModal.scrollTop = 0;
        window.scrollTo(0, 0);
      }, 0);

      // Update URL + meta
      const slug = article.dataset.slug || '';
      if (slug) {
        history.pushState({ page: 'news-article', slug }, '', '/news/' + slug);
        _updateArticleMeta(
          article.dataset.title || '',
          article.dataset.excerpt || '',
          article.dataset.img || '',
          slug
        );
      }

      // Fade-in animation
      if (articleEl) {
        articleEl.classList.remove('news-article--leaving', 'news-article--entering');
        requestAnimationFrame(() => {
          articleEl.classList.add('news-article--entering');
          setTimeout(() => articleEl.classList.remove('news-article--entering'), 300);
        });
      }
    };

    // Already reading → brief fade-out, then swap
    if (isAlreadyOpen && articleEl) {
      articleEl.classList.add('news-article--leaving');
      setTimeout(doOpen, 160);
    } else {
      doOpen();
    }
  }

  function closeNewsModal() {
    _restoreDefaultMeta();
    navigateToPage('news');
    if (window.location.pathname !== '/news') {
      history.pushState({ page: 'news' }, '', '/news');
    }
  }

  async function _openArticleBySlugFromCMS(slug) {
    // Clear pending slug immediately so _bindNewsCards doesn't also open it
    if (window._pendingArticleSlug === slug) window._pendingArticleSlug = null;
    const lang = window.i18n?.currentLang?.() || 'en';
    const article = await window.CMS.fetchArticleBySlug(slug, lang);
    if (!article) return;
    const fakeCard = document.createElement('div');
    fakeCard.dataset.title = article.title || '';
    fakeCard.dataset.img = article.imageUrl || '';
    fakeCard.dataset.categoryLabel = article.categoryLabel || '';
    fakeCard.dataset.date = article.date || '';
    fakeCard.dataset.content = Array.isArray(article.content) ? JSON.stringify(article.content) : (article.content || '');
    fakeCard.dataset.excerpt = article.excerpt || '';
    fakeCard.dataset.slug = article.id || slug;
    openNewsModal(fakeCard);
  }

  function bindNewsCards() {
    document.querySelectorAll('.news-card, .news-featured').forEach((card) => {
      const link = card.querySelector('a');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const slug = card.dataset.slug;
          // Full page navigation — browser handles scroll-to-top, analytics
          // gets a real page impression, no SPA scroll issues.
          if (slug) {
            window.location.href = '/news/' + slug;
          } else {
            openNewsModal(card); // fallback for cards without a slug
          }
        });
      }
    });
  }
  function populateTicker() {
    const ticker = document.querySelector('.news-ticker');
    if (!ticker) return;
    const titles = Array.from(document.querySelectorAll('.news-card[data-title]'))
      .map((c) => c.dataset.title)
      .filter(Boolean);
    if (!titles.length) return;
    const track = document.createElement('div');
    track.className = 'news-ticker-track';
    [...titles, ...titles].forEach((t) => {
      const span = document.createElement('span');
      span.textContent = t;
      track.appendChild(span);
    });
    ticker.textContent = '';
    ticker.appendChild(track);
  }

  bindNewsCards();
  populateTicker();
  window._bindNewsCards = () => {
    bindNewsCards();
    populateTicker();
    if (window._pendingArticleSlug) {
      const slug = window._pendingArticleSlug;
      window._pendingArticleSlug = null;
      const card = document.querySelector(`.news-card[data-slug="${slug}"]`);
      if (card) {
        setTimeout(() => openNewsModal(card), 50);
      } else {
        _openArticleBySlugFromCMS(slug);
      }
    }
  };

  if (newsModalClose) {
    newsModalClose.addEventListener('click', closeNewsModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNewsModal();
  });

  // --- Share Buttons ---
  const shareTwitter = document.getElementById('shareTwitter');
  const shareWhatsapp = document.getElementById('shareWhatsapp');
  const shareNative = document.getElementById('shareNative');

  if (shareTwitter) {
    shareTwitter.addEventListener('click', () => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentShareData.title)}&url=${encodeURIComponent(currentShareData.url)}`;
      window.open(url, '_blank', 'noopener');
    });
  }

  if (shareWhatsapp) {
    shareWhatsapp.addEventListener('click', () => {
      const url = `https://wa.me/?text=${encodeURIComponent(currentShareData.title + ' ' + currentShareData.url)}`;
      window.open(url, '_blank', 'noopener');
    });
  }

  if (shareNative) {
    shareNative.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share(currentShareData);
        } catch {
          // User cancelled or error
        }
      } else {
        navigator.clipboard.writeText(currentShareData.url);
      }
    });
  }

  // --- Lazy Script Loader (with optional SRI integrity check) ---
  function loadScript(src, integrity) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      if (integrity) {
        s.integrity = integrity;
        s.crossOrigin = 'anonymous';
      }
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Load a stylesheet on demand — used to defer leaflet.css until the map page opens.
  function loadStylesheet(href) {
    if (document.querySelector(`link[rel="stylesheet"][href^="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  // --- App Page Navigation ---
  const appPages = document.querySelectorAll('.app-page');
  const navbarBrand = document.querySelector('.navbar-brand');

  let currentPage = 'start';

  async function loadStaticPage(slug) {
    // Build element IDs: "datenschutz" → "staticPageDatenschutz"
    const idBase  = 'staticPage' + slug.charAt(0).toUpperCase() + slug.slice(1);
    const titleEl = document.getElementById(idBase + '-title');
    const bodyEl  = document.getElementById(idBase + '-body');
    if (!titleEl || !bodyEl) return;

    // Show loading state
    bodyEl.textContent = '';
    const loading = document.createElement('span');
    loading.className = 'static-page-loading';
    loading.textContent = 'Loading\u2026';
    bodyEl.appendChild(loading);

    const lang = (window.i18n && window.i18n.currentLang) ? window.i18n.currentLang() : 'de';
    const page = await window.CMS.fetchStaticPage(slug);

    bodyEl.textContent = ''; // clear loading

    if (!page) {
      const err = document.createElement('p');
      err.style.color = '#999';
      err.textContent = 'Inhalt konnte nicht geladen werden.';
      bodyEl.appendChild(err);
      return;
    }

    titleEl.textContent = (lang === 'de' && page.titleDe) ? page.titleDe : (page.title || '');
    const blocks = (lang === 'de' && page.bodyDe && page.bodyDe.length) ? page.bodyDe : (page.body || []);
    bodyEl.appendChild(renderPortableText(blocks));
  }

  // Track active page on <html> for CSS (transparent navbar over hero, etc.)
  function setActivePage(pageName) {
    document.documentElement.setAttribute('data-active-page', pageName);
    const navbar = document.querySelector('.navbar');
    const isMobile = !window.matchMedia('(min-width: 768px)').matches;
    if (pageName === 'start') {
      if (isMobile) {
        const updateNav = () => navbar && navbar.classList.toggle('scrolled', window.scrollY > 60);
        updateNav();
        window._startScrollHandler = updateNav;
        window.addEventListener('scroll', updateNav, { passive: true });
      } else {
        const startEl = document.querySelector('.app-page[data-page="start"]');
        if (startEl && navbar) {
          navbar.classList.toggle('scrolled', startEl.scrollTop > 60);
          startEl._navScrollHandler = () => navbar.classList.toggle('scrolled', startEl.scrollTop > 60);
          startEl.addEventListener('scroll', startEl._navScrollHandler, { passive: true });
        }
      }
    } else {
      if (isMobile) {
        if (window._startScrollHandler) {
          window.removeEventListener('scroll', window._startScrollHandler);
          window._startScrollHandler = null;
        }
      } else {
        const prevStart = document.querySelector('.app-page[data-page="start"]');
        if (prevStart && prevStart._navScrollHandler) {
          prevStart.removeEventListener('scroll', prevStart._navScrollHandler);
        }
      }
      if (navbar) navbar.classList.remove('scrolled');
    }
  }

  function navigateToPage(pageName) {
    if (pageName === currentPage) return;

    // Clear start-page intervals when leaving
    if (currentPage === 'start' && pageName !== 'start') {
      if (heroInterval) {
        clearInterval(heroInterval);
        heroInterval = null;
      }
      altImgIntervals.forEach((id) => clearInterval(id));
      altImgIntervals = [];
    }

    // Restart hero slider when returning to start
    if (pageName === 'start' && heroSlides.length > 0 && !heroInterval) {
      heroInterval = setInterval(nextSlide, slideInterval);
    }

    const targetPage = document.querySelector(`.app-page[data-page="${pageName}"]`);
    if (!targetPage) return;

    appPages.forEach((page) => {
      if (page.dataset.page === pageName) {
        page.classList.add('active');
        page.classList.remove('hidden');

        // Globe intro → then init map (lazy-load Leaflet + Three.js on first visit)
        if (pageName === 'map') {
          // Load Leaflet first — required for map, must finish before initFoodMap.
          // Three.js is only needed for the globe (currently disabled) so load it
          // in the background without blocking map startup. On slow mobile networks
          // Three.js (644 KB) was delaying the map by several seconds.
          // leaflet.css and map.css are deferred out of <head> and injected here so
          // they don't render-block the start / news / album pages.
          loadStylesheet('css/map.min.css');
          loadStylesheet('css/leaflet.min.css');
          loadScript(
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH'
          )
            .then(() => loadScript('js/map-init.min.js'))
            .then(() => {
              cmsReady.then(() => {
                if (typeof window._mapFn?.initFoodMap === 'function') window._mapFn.initFoodMap();
              });
              const fm = window._eatMap.foodMap;
              if (fm) {
                fm.invalidateSize();
                setTimeout(() => { window._eatMap.foodMap?.invalidateSize(); }, 300);
                if (window._mapSnapSheet) {
                  requestAnimationFrame(() => window._mapSnapSheet('mid', false));
                }
              }
            })
            .catch(() => {
              cmsReady.then(() => {
                if (typeof window._mapFn?.initFoodMap === 'function') window._mapFn.initFoodMap();
              });
            });
        }
      } else {
        page.classList.remove('active');
        page.classList.add('hidden');
      }
    });

    // Scroll back to top on every navigation.
    // Reset both the container and the window — mobile uses window scroll,
    // desktop uses the app-page container, but resetting both is harmless and
    // avoids edge cases (zoom levels, viewport size near breakpoint, etc.).
    if (targetPage && pageName !== 'map') {
      targetPage.scrollTop = 0;
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        targetPage.scrollTop = 0;
        window.scrollTo(0, 0);
      });
      // setTimeout(0) fires after the browser renders the display change,
      // catching any scroll restoration the browser applies post-paint.
      setTimeout(() => {
        targetPage.scrollTop = 0;
        window.scrollTo(0, 0);
      }, 0);
    }

    // Update header icon button active states
    const navNewsBtn = document.getElementById('navNewsBtn');
    const navMapBtn = document.getElementById('navMapBtn');
    const navMustsBtn = document.getElementById('navMustsBtn');
    if (navNewsBtn) navNewsBtn.classList.toggle('active', pageName === 'news');
    if (navMapBtn) navMapBtn.classList.toggle('active', pageName === 'map');
    if (navMustsBtn) navMustsBtn.classList.toggle('active', pageName === 'musts');
    const navProfileBtnEl = document.getElementById('navProfileBtn');
    if (navProfileBtnEl) navProfileBtnEl.classList.toggle('active', pageName === 'profile');

    currentPage = pageName;
    setActivePage(pageName);
    // Re-sync after navbar state change (scrolled class removed/added by setActivePage)
    syncNavbarOffset();

    // Update theme-color so Safari URL bar matches page background.
    // Map has light Leaflet tiles → force dark bar. All other pages use
    // transparent so Safari auto-adapts to the hero/page background.
    const _tcMeta = document.querySelector('meta[name="theme-color"]');
    if (_tcMeta) _tcMeta.setAttribute('content', pageName === 'map' ? '#0d0d0d' : 'transparent');

    // Track navigation history for back button
    window._prevPage    = window._currentPage || 'start';
    window._currentPage = pageName;

    // Load CMS content for static pages
    if (STATIC_PAGE_SLUGS.includes(pageName)) {
      loadStaticPage(pageName);
    }
  }

  const _MAIN_PAGES = ['start', 'news', 'musts', 'map', 'profile'];

  // Push a clean URL for a main section (e.g. /news, /map). history.pushState
  // always sets the full path so there's no risk of hash-appending to slug URLs.
  function _pushPage(page) {
    history.pushState({ page }, '', page === 'start' ? '/' : '/' + page);
  }

  // Kept for call-site compatibility — no longer needs to reset article paths
  // because _pushPage uses absolute paths via pushState.
  function _resetArticlePath() {}

  if (appPages.length) {
    if (navbarBrand) {
      navbarBrand.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('start');
        history.replaceState(null, '', '/');
      });
    }

    // Header icon buttons
    const navNewsBtn = document.getElementById('navNewsBtn');
    const navMapBtn = document.getElementById('navMapBtn');
    const navMustsBtn = document.getElementById('navMustsBtn');

    if (navNewsBtn) {
      navNewsBtn.addEventListener('click', () => {
        navigateToPage('news');
        _pushPage('news');
      });
    }
    if (navMapBtn) {
      navMapBtn.addEventListener('click', () => {
        navigateToPage('map');
        _pushPage('map');
      });
    }
    if (navMustsBtn) {
      navMustsBtn.addEventListener('click', () => {
        navigateToPage('musts');
        _pushPage('musts');
      });
    }

    const navProfileBtn = document.getElementById('navProfileBtn');
    if (navProfileBtn) {
      navProfileBtn.addEventListener('click', () => {
        if (window._currentUser) {
          navigateToPage('profile');
          _pushPage('profile');
        } else {
          (window.openWelcomeModal || window.openLoginModal)?.();
        }
      });
    }

    // Burger menu page navigation
    document.querySelectorAll('.burger-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeBurger?.();
        const page = btn.dataset.page;
        navigateToPage(page);
        _pushPage(page);
      });
    });

    // Burger search trigger
    const burgerSearchTrigger = document.getElementById('burgerSearchTrigger');
    if (burgerSearchTrigger) {
      burgerSearchTrigger.addEventListener('click', () => {
        closeBurger?.();
        setTimeout(() => openSearch?.(), 200);
      });
    }

    function checkPath() {
      // Backwards compat: redirect old /#hash URLs to clean paths
      const hash = window.location.hash.replace('#', '');
      if (hash && _MAIN_PAGES.includes(hash)) {
        history.replaceState({ page: hash }, '', hash === 'start' ? '/' : '/' + hash);
        navigateToPage(hash);
        return;
      }
      const path = window.location.pathname;
      const page = path === '/' ? 'start' : path.replace(/^\//, '').split('/')[0];
      if (_MAIN_PAGES.includes(page)) navigateToPage(page);
    }

    // Keep hashchange for backwards compat — old shared /#news links still work
    window.addEventListener('hashchange', checkPath);

    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path.startsWith('/news/') && path.length > 6) {
        const slug = path.slice(6);
        const card = document.querySelector(`.news-card[data-slug="${slug}"]`);
        if (card) openNewsModal(card);
        else _openArticleBySlugFromCMS(slug);
      } else {
        _restoreDefaultMeta();
        const page = path === '/' ? 'start' : path.replace(/^\//, '').split('/')[0];
        if (_MAIN_PAGES.includes(page)) navigateToPage(page);
      }
    });

    checkPath();
    if (currentPage === 'start') setActivePage('start');

    // Handle direct URL navigation — /news/[slug], main sections, and static pages
    const _initPath = window.location.pathname;
    if (_initPath.startsWith('/news/') && _initPath.length > 6) {
      const _initSlug = _initPath.slice(6);
      window._pendingArticleSlug = _initSlug;
      navigateToPage('news-article');
      _openArticleBySlugFromCMS(_initSlug);
    } else {
      const _pathPage = _initPath === '/' ? null : _initPath.replace(/^\//, '').split('/')[0];
      if (_pathPage && ['news', 'musts', 'map', 'profile'].includes(_pathPage)) {
        navigateToPage(_pathPage);
      } else {
        const _staticSlug = STATIC_PAGE_SLUGS.find(s => _initPath === '/' + s);
        if (_staticSlug) navigateToPage(_staticSlug);
      }
    }

    // Allow any module (auth.js etc.) to navigate by dispatching this event
    window.addEventListener('navigate', (e) => {
      if (e.detail?.page) navigateToPage(e.detail.page);
    });

    let resizeTimer;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        navigateToPage(currentPage);
      }, 150);
    }

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  // ============================================
  // MODAL FACTORY
  // Creates open/close for any modal with consistent bodyOverflow handling
  // ============================================
  function createModal(modalEl, opts = {}) {
    if (!modalEl) return { open: () => {}, close: () => {} };
    function open() {
      modalEl.classList.add('active');
      bodyOverflow.lock();
    }
    function close() {
      modalEl.classList.remove('active');
      bodyOverflow.unlock();
    }
    if (opts.closeBtn) opts.closeBtn.addEventListener('click', close);
    if (opts.backdrop) opts.backdrop.addEventListener('click', close);
    if (opts.trigger) opts.trigger.addEventListener('click', open);
    return { open, close };
  }

  // Burger Menu
  const burgerDrawer = document.getElementById('burgerDrawer');
  const burger = createModal(burgerDrawer, {
    trigger: document.getElementById('burgerBtn'),
    closeBtn: document.getElementById('burgerClose'),
    backdrop: document.getElementById('burgerBackdrop'),
  });
  function closeBurger() {
    burger.close();
  }
  window._closeBurger = closeBurger;

  // Static page back buttons — use browser back so the user returns to
  // wherever they came from; fall back to home if there's no history.
  document.querySelectorAll('.static-page-back[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    });
  });

  // Cookie Info Modal
  const cookieInfoModalEl = document.getElementById('cookieInfoModal');
  const cookieInfoModal = createModal(cookieInfoModalEl, {
    trigger: document.getElementById('cookieInfoTrigger'),
    closeBtn: document.getElementById('cookieInfoClose'),
    backdrop: document.getElementById('cookieInfoBackdrop'),
  });
  function closeCookieInfoModal() {
    cookieInfoModal.close();
  }

  // AGB Modal
  createModal(document.getElementById('agbModal'), {
    trigger: document.getElementById('agbTrigger'),
    closeBtn: document.getElementById('agbClose'),
    backdrop: document.getElementById('agbBackdrop'),
  });
  const agbFromBurger = document.getElementById('openAgbFromBurger');
  if (agbFromBurger)
    agbFromBurger.addEventListener('click', () => {
      closeBurger();
      window.location.href = '/agb';
    });

  const datenschutzFromBurger = document.getElementById('openDatenschutzFromBurger');
  if (datenschutzFromBurger)
    datenschutzFromBurger.addEventListener('click', () => {
      closeBurger();
      window.location.href = '/datenschutz';
    });

  // Static page navigation from burger drawer (about/contact/press/impressum)
  ['about', 'contact', 'press', 'impressum'].forEach((slug) => {
    const cap = slug.charAt(0).toUpperCase() + slug.slice(1);
    const trigger = document.getElementById('open' + cap);
    if (trigger) {
      trigger.addEventListener('click', () => {
        closeBurger();
        window.location.href = '/' + slug;
      });
    }
  });

  // ============================================
  // MUST-EAT CARD LIGHTBOX (flying card)
  // ============================================
  const mustLightbox = document.createElement('div');
  mustLightbox.className = 'must-card-lightbox';
  const mustLightboxInner = document.createElement('div');
  mustLightboxInner.className = 'must-card-lightbox-inner';
  const mustLightboxImg = document.createElement('img');
  mustLightboxImg.className = 'must-card-lightbox-img';
  mustLightboxImg.alt = ''; // real alt is set when lightbox opens
  mustLightboxInner.appendChild(mustLightboxImg);
  mustLightbox.appendChild(mustLightboxInner);
  document.body.appendChild(mustLightbox);

  let mustActiveCard = null;

  function openMustCard(cardEl, src, alt) {
    // Guard: touchend + click both fire on iOS → prevent double-open which would
    // increment bodyOverflow.count to 2 and leave scroll permanently locked.
    if (mustLightbox.classList.contains('active') || mustClosing) return;
    mustActiveCard = cardEl;
    mustLightboxImg.src = src;
    mustLightboxImg.alt = alt;

    // Hide the original card so it doesn't show through during animation
    cardEl.style.visibility = 'hidden';

    const rect = cardEl.getBoundingClientRect();
    const cardRatio = 1449 / 2163;
    const targetW = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9 * cardRatio);
    const startX = rect.left + rect.width / 2 - window.innerWidth / 2;
    const startY = rect.top + rect.height / 2 - window.innerHeight / 2;
    const startScale = rect.width / targetW;

    // Set start position before making visible
    mustLightboxInner.style.transition = 'none';
    mustLightboxInner.style.transform = `translate(${startX}px, ${startY}px) scale(${startScale}) rotate(-14deg)`;
    mustLightboxInner.style.opacity = '0';

    mustLightbox.classList.add('active');
    // No bodyOverflow.lock() — lightbox covers the full viewport so background
    // scroll is invisible. Locking causes the position:fixed jump on iOS.

    // offsetHeight read forces synchronous reflow so the start state is committed
    mustLightboxInner.offsetHeight; // force reflow so start state commits before transition

    mustLightboxInner.style.transition =
      'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease';
    mustLightboxInner.style.transform = 'translate(0,0) scale(1) rotate(3deg)';
    mustLightboxInner.style.opacity = '1';

    setTimeout(() => {
      mustLightboxInner.style.transition = 'transform 0.16s ease-out';
      mustLightboxInner.style.transform = 'translate(0,0) scale(1) rotate(0deg)';
    }, 520);
  }
  window._openMustCard = openMustCard;

  let mustClosing = false;

  function closeMustCard() {
    if (!mustLightbox.classList.contains('active') || mustClosing) return;
    mustClosing = true;
    const cardEl = mustActiveCard;

    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const cardRatio = 1449 / 2163;
      const targetW = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9 * cardRatio);
      const endX = rect.left + rect.width / 2 - window.innerWidth / 2;
      const endY = rect.top + rect.height / 2 - window.innerHeight / 2;
      const endScale = rect.width / targetW;

      // Reflow to commit current state before starting close transition
      mustLightboxInner.offsetHeight; // force reflow so start state commits before transition

      // Fade backdrop out and fly card back simultaneously (no opacity on inner — card stays visible)
      mustLightbox.classList.add('closing');
      mustLightboxInner.style.transition = 'transform 0.36s cubic-bezier(0.55, 0, 1, 0.45)';
      mustLightboxInner.style.transform = `translate(${endX}px, ${endY}px) scale(${endScale}) rotate(10deg)`;

      setTimeout(() => {
        mustLightbox.classList.remove('active', 'closing');
        mustLightboxInner.style.cssText = '';
        if (cardEl) cardEl.style.visibility = '';
        mustActiveCard = null;
        mustClosing = false;
      }, 380);
    } else {
      mustLightbox.classList.remove('active');
      mustLightboxInner.style.cssText = '';
      mustActiveCard = null;
      mustClosing = false;
    }
  }

  function bindMustCards() {
    document.querySelectorAll('.must-card').forEach((card) => {
      // Wrap img in clip div (iOS Safari: clip-path on interactive element blocks touch)
      const img = card.querySelector('.must-card-img');
      if (!img) return;
      // Only wrap if not already inside a clip
      if (!img.parentElement.classList.contains('must-card-clip')) {
        const clip = document.createElement('div');
        clip.className = 'must-card-clip';
        card.insertBefore(clip, img);
        clip.appendChild(img);
      }

      let touchStartX = 0,
        touchStartY = 0,
        touchMoved = false;
      card.addEventListener(
        'touchstart',
        (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchMoved = false;
        },
        { passive: true }
      );
      card.addEventListener(
        'touchmove',
        (e) => {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          if (Math.sqrt(dx * dx + dy * dy) > 10) touchMoved = true;
        },
        { passive: true }
      );
      card.addEventListener(
        'touchend',
        (e) => {
          if (touchMoved) return;
          e.preventDefault();
          const img = card.querySelector('.must-card-img');
          openMustCard(card, img.src, img.alt);
        },
        { passive: false }
      );
      card.addEventListener('click', () => {
        const img = card.querySelector('.must-card-img');
        openMustCard(card, img.src, img.alt);
      });
    });
  }
  window._bindMustCards = bindMustCards;

  // Prevent scroll-through while lightbox is open (no body lock needed — lightbox
  // covers the full viewport, so background scroll is invisible anyway)
  mustLightbox.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  mustLightbox.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMustCard();
    },
    { passive: false }
  );
  mustLightbox.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMustCard();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMustCard();
  });

  // ── Analytics (DSGVO-konform: nur nach Zustimmung) ───────────────────────────
  let analyticsLoaded = false;
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-8EWFYGPNTT';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    const gtag = function() { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', 'G-8EWFYGPNTT');
  }
  // If already consented on a previous visit, load immediately
  if (localStorage.getItem('cookieConsent') === 'accepted') loadAnalytics();

  // Cookie Consent
  const cookieConsent = document.getElementById('cookieConsent');
  const cookieAccept = document.getElementById('cookieAccept');
  const cookieDecline = document.getElementById('cookieDecline');

  function closeCookieSettings() {
    if (!cookieConsent) return;
    cookieConsent.classList.remove('show');
    // After slide-out: force Safari to re-evaluate URL-bar chrome color by
    // toggling theme-color. More reliable than scroll +1/-1 repaint trick.
    setTimeout(() => {
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) {
        tc.setAttribute('content', '#000000');
        requestAnimationFrame(() => tc.setAttribute('content', 'transparent'));
      }
      const navbar = document.querySelector('.navbar');
      if (!navbar) return;
      if (document.documentElement.getAttribute('data-active-page') === 'start') {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
      }
    }, 350);
  }

  if (cookieConsent && !localStorage.getItem('cookieConsent')) {
    setTimeout(() => {
      cookieConsent.classList.add('show');
    }, 1500);
  }

  if (cookieAccept) {
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      closeCookieSettings();
      // Delay analytics load slightly so the banner finishes closing before
      // cross-site scripts load — reduces chance of iOS Safari privacy banner
      // appearing immediately on top of the start page.
      setTimeout(loadAnalytics, 600);
    });
  }

  if (cookieDecline) {
    cookieDecline.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'declined');
      closeCookieSettings();
    });
  }

  // ── Stamp footer into every non-map page ──
  const siteFooterTpl = document.getElementById('siteFooterTpl');
  if (siteFooterTpl) {
    document.querySelectorAll('.app-page:not([data-page="map"])').forEach(page => {
      const clone = siteFooterTpl.content.cloneNode(true);
      // Start page: footer goes inside the scroll content div
      const target = page.dataset.page === 'start'
        ? page.querySelector('.start-scroll-content')
        : page;
      if (target) target.appendChild(clone);
    });
    // Apply translations to newly stamped footer elements
    window.i18n && window.i18n.applyTranslations();
  }

  // ── Footer event delegation (handles all stamped instances) ──
  document.addEventListener('click', (e) => {
    // Nav links — static pages and main sections
    const navBtn = e.target.closest('.site-footer-link[data-page]');
    if (navBtn) {
      const page = navBtn.dataset.page;
      // Static pages get their own URL; main sections use hash on root
      if (STATIC_PAGE_SLUGS.includes(page)) {
        window.location.href = '/' + page;
      } else {
        navigateToPage(page);
        _pushPage(page);
      }
      return;
    }

    // Logo link — always go home
    const logoLink = e.target.closest('.site-footer-logo-link[data-page]');
    if (logoLink) { e.preventDefault(); window.location.href = '/'; return; }

    // Language buttons
    const langBtn = e.target.closest('.site-footer-lang-btn[data-lang]');
    if (langBtn) {
      const lang = langBtn.dataset.lang;
      window.i18n && window.i18n.setLang(lang);
      updateFooterLangButtons(lang);
      if (window._currentPage && STATIC_PAGE_SLUGS.includes(window._currentPage)) {
        loadStaticPage(window._currentPage);
      }
    }
  });

  function updateFooterLangButtons(lang) {
    document.querySelectorAll('.site-footer-lang-btn[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  // Sync footer lang buttons with current language on page load
  updateFooterLangButtons(window.i18n ? window.i18n.currentLang() : 'en');

  // Parallax effect for start section images
  (function initStartParallax() {
    const startPage = document.querySelector('.app-page[data-page="start"]');
    if (!startPage) return;

    let rafId = null;

    function applyParallax() {
      rafId = null;
      startPage.querySelectorAll('.start-img-wrap').forEach(wrap => {
        const img = wrap.querySelector('.start-img');
        if (!img) return;
        // Desktop editorial rows use contain — no parallax needed
        if (window.innerWidth >= 768 && wrap.closest('.start-editorial-row')) {
          img.style.transform = '';
          return;
        }
        const rect = wrap.getBoundingClientRect();
        const pos = (rect.top + rect.height * 0.5 - window.innerHeight * 0.5) / window.innerHeight;
        img.style.transform = `translateY(${pos * 40}px)`;
      });
    }

    function scheduleParallax() {
      if (!rafId) rafId = requestAnimationFrame(applyParallax);
    }

    window.addEventListener('scroll', scheduleParallax, { passive: true });
    startPage.addEventListener('scroll', scheduleParallax, { passive: true });
    applyParallax();
  })();
});

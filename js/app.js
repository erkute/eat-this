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

document.addEventListener('DOMContentLoaded', () => {
  // ============================================
  // BODY OVERFLOW MANAGER
  // Prevents scroll-state conflicts when multiple modals are used
  // ============================================
  const bodyOverflow = (() => {
    let count = 0;
    return {
      lock() {
        count++;
        document.body.style.overflow = 'hidden';
      },
      unlock() {
        count = Math.max(0, count - 1);
        if (!count) document.body.style.overflow = '';
      },
    };
  })();
  window.bodyOverflow = bodyOverflow;

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
    }

    function syncToggles(dark) {
      ['themeToggleBurger', 'themeToggleFooter'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.setAttribute('aria-pressed', dark ? 'true' : 'false');
      });
    }

    function isDark() {
      return root.getAttribute('data-theme') === 'dark';
    }

    function wireToggle(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function () {
        applyTheme(!isDark(), true);
      });
    }

    // Wire burger toggle (always in DOM)
    wireToggle('themeToggleBurger');

    // Footer toggle is inside a <template> stamped later — wire on first stamp
    const footerObserver = new MutationObserver(function () {
      const footerToggle = document.getElementById('themeToggleFooter');
      if (footerToggle) {
        wireToggle('themeToggleFooter');
        footerObserver.disconnect();
      }
    });
    footerObserver.observe(document.body, { childList: true, subtree: true });

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
      bodyOverflow.lock();
    }
  }
  function _closeLoginModal() {
    if (_loginModal) {
      _loginModal.classList.remove('active');
      bodyOverflow.unlock();
    }
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

  // Hero CTA button — replaces inline onclick (CSP compliance)
  const heroRegisterBtn = document.getElementById('heroRegisterBtn');
  if (heroRegisterBtn) heroRegisterBtn.addEventListener('click', _openLoginModal);

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

  // Add notification styles
  const notificationStyle = document.createElement('style');
  notificationStyle.textContent = `
    .notification {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--black);
      color: var(--white);
      padding: 14px 24px;
      border-radius: 100px;
      font-size: 0.9rem;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: none;
    }
    .notification.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(notificationStyle);

  // ============================================
  // SEARCH
  // ============================================
  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchClose = document.getElementById('searchClose');
  const searchTrigger = document.getElementById('searchTrigger');

  const mustEatsData = Array.from(document.querySelectorAll('.eat-card')).map((card) => ({
    dish: card.dataset.dish || '',
    restaurant: card.dataset.restaurant || '',
    district: card.dataset.district || '',
    price: card.dataset.price || '',
    img: card.dataset.img || '',
    type: 'must-eat',
  }));

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
            window.location.hash = 'musts';
            setTimeout(() => {
              const dish = item.dataset.dish;
              const restaurant = item.dataset.restaurant;
              const card = Array.from(document.querySelectorAll('.eat-card')).find(
                (c) => c.dataset.dish === dish && c.dataset.restaurant === restaurant
              );
              if (card) card.click();
            }, 400);
          }, 100);
        } else if (type === 'news') {
          closeSearch();
          setTimeout(() => {
            navigateToPage('news');
            window.location.hash = 'news';
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
            window.location.hash = 'map';
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

  // ─── CMS Bootstrap (inside DOMContentLoaded so spots is in scope) ─────────
  const cmsReady = (async () => {
    if (!window.CMS) return;

    // Must-Eat cards
    try {
      const cards = await window.CMS.fetchMustEats();
      const grid = document.getElementById('mustEatsGrid');
      if (grid && cards && cards.length) {
        const fragment = document.createDocumentFragment();
        cards.forEach((c) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'must-card eat-card';
          wrapper.dataset.dish = c.dish || '';
          wrapper.dataset.restaurant = c.restaurant || '';
          wrapper.dataset.district = c.district || '';
          wrapper.dataset.price = c.price || '';
          wrapper.dataset.img = c.imageUrl || '';

          const img = document.createElement('img');
          img.src = c.imageUrl || '';
          img.alt = c.dish || '';
          img.className = 'must-card-img';
          img.loading = 'lazy';
          img.decoding = 'async';

          wrapper.appendChild(img);
          fragment.appendChild(wrapper);
        });
        grid.appendChild(fragment);
      }
    } catch (err) {
      console.warn('[CMS] Must-Eats fetch failed:', err.message); // eslint-disable-line no-console
    }

    // Restaurants
    try {
      const restaurants = await window.CMS.fetchRestaurants();
      if (restaurants && restaurants.length) {
        spots = restaurants.map((r) => ({
          ...r,
          type: (r.categories || []).join(' · '),
        }));
        window._allSpots = spots;
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

  function showGlobeIntro(onComplete) {
    // TEMPORARILY DISABLED — re-enable by removing this early return
    onComplete();
    return;
    /* eslint-disable no-unreachable */
    if (typeof THREE === 'undefined' || globeShown) {
      onComplete();
      return;
    }
    globeShown = true;

    const mapEl = document.getElementById('foodMap');
    if (!mapEl) {
      onComplete();
      return;
    }

    const w = window.innerWidth || 390;
    const h = window.innerHeight || 520;

    // Overlay — space background
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:absolute;inset:0;z-index:500;background:#000000;overflow:hidden;cursor:pointer';

    const glCanvas = document.createElement('canvas');
    overlay.appendChild(glCanvas);

    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
      @keyframes globeMeteor1 {
        0%   { transform:translate(0,0) rotate(-42deg); opacity:0; }
        4%   { opacity:1; }
        20%  { opacity:0.85; }
        28%  { opacity:0; }
        100% { transform:translate(-520px,380px) rotate(-42deg); opacity:0; }
      }
      @keyframes globeMeteor2 {
        0%   { transform:translate(0,0) rotate(-38deg); opacity:0; }
        5%   { opacity:0.8; }
        24%  { opacity:0.7; }
        32%  { opacity:0; }
        100% { transform:translate(-380px,280px) rotate(-38deg); opacity:0; }
      }
      @keyframes globeMeteor3 {
        0%   { transform:translate(0,0) rotate(-45deg); opacity:0; }
        3%   { opacity:0.9; }
        16%  { opacity:0.8; }
        22%  { opacity:0; }
        100% { transform:translate(-300px,220px) rotate(-45deg); opacity:0; }
      }
    `;
    document.head.appendChild(pulseStyle);

    // Meteors — moving across the globe overlay
    [
      {
        top: '8%',
        left: '82%',
        w: '130px',
        h: '2px',
        delay: '0.8s',
        dur: '7s',
        anim: 'globeMeteor1',
      },
      {
        top: '22%',
        left: '90%',
        w: '85px',
        h: '1.5px',
        delay: '4s',
        dur: '9s',
        anim: 'globeMeteor2',
      },
      {
        top: '58%',
        left: '76%',
        w: '65px',
        h: '1.5px',
        delay: '2.5s',
        dur: '11s',
        anim: 'globeMeteor3',
      },
    ].forEach((m) => {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${m.top};left:${m.left};width:${m.w};height:${m.h};border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,0.95),rgba(255,255,255,0));opacity:0;pointer-events:none;animation:${m.anim} ${m.dur} linear ${m.delay} infinite;`;
      overlay.appendChild(el);
    });

    const logoImg = document.createElement('img');
    logoImg.src = 'pics/logo.webp';
    logoImg.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(60vw,280px);height:auto;pointer-events:none;z-index:501;opacity:0;transition:opacity 0.8s ease 0.3s;';
    overlay.appendChild(logoImg);

    const logoText = document.createElement('div');
    logoText.textContent = 'Press Start';
    const mobileOffset = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT ? '90px' : '100px';
    logoText.style.cssText = `position:absolute;top:calc(50% + min(30vw,140px) - ${mobileOffset});left:50%;transform:translateX(-50%);color:#fff;font-family:Inter,system-ui,sans-serif;font-size:clamp(18px,4.5vw,24px);font-weight:700;letter-spacing:0.5px;pointer-events:none;z-index:501;opacity:0;transition:opacity 0.8s ease 0.3s;white-space:nowrap;`;
    overlay.appendChild(logoText);
    setTimeout(() => {
      logoImg.style.opacity = '1';
      logoText.style.opacity = '1';
    }, 100);

    // Hide location button, zoom control and filters during globe; expand foodMap to full screen
    mapEl.classList.add('globe-active');
    mapEl.style.cssText =
      'position:fixed;inset:0;z-index:9990;width:100%!important;height:100%!important;min-height:0!important';
    const mapPage = document.querySelector('.app-page[data-page="map"]');
    if (mapPage) mapPage.classList.add('globe-active');
    const locBtn = document.getElementById('mapLocationBtnFixed');
    if (locBtn) locBtn.style.display = 'none';
    const zoomCtrl = document.querySelector('.leaflet-control-zoom');
    if (zoomCtrl) zoomCtrl.style.display = 'none';

    mapEl.appendChild(overlay);

    const aspect = w / h;
    // Portrait (mobile): keep globe just inside horizontal FOV
    // Landscape (desktop/tablet): bring globe much closer to fill screen height
    const globeStartZ = aspect >= 1 ? 5.5 : 6.8;
    const globeEndZ = aspect >= 1 ? 2.5 : 2.5;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
    camera.position.z = globeStartZ;

    const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);

    // Globe sphere — Lambert material + satellite texture
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.MeshLambertMaterial({ color: 0x2266aa });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.rotation.x = 0.3;
    scene.add(globe);

    // Stars — random points in space
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(18000);
    for (let i = 0; i < 18000; i += 3) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 70 + Math.random() * 30;
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22 })));

    // Subtle lighting — no harsh highlights, just enough for depth
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0e0, 0.8);
    sun.position.set(5, 2, 4);
    scene.add(sun);

    // Load NASA Blue Marble satellite texture
    new THREE.TextureLoader().load('pics/globe.webp', (tex) => {
      globeMat.map = tex;
      globeMat.color.set(0xffffff);
      globeMat.needsUpdate = true;
    });

    let phase = 'idle';
    let phaseStart = null;
    let rotY = 0;
    let animFrame;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    function easeOut3(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function easeOut5(t) {
      return 1 - Math.pow(1 - t, 5);
    }
    function shortestDelta(from, to) {
      let d = (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (d > Math.PI) d -= 2 * Math.PI;
      return d;
    }

    let alignStartY, alignTargetY, alignStartX, userLat, userLng;

    function startZoom() {
      if (phase !== 'idle') return;
      phase = 'zoom';
      phaseStart = Date.now();

      const targetLng = ((userLng !== undefined ? userLng : 13.4) * Math.PI) / 180;
      const targetLat = ((userLat !== undefined ? userLat : 52.5) * Math.PI) / 180;

      alignStartY = rotY;
      // Three.js SphereGeometry UV offset: front at rotY=0 shows lng -90°W.
      // To show longitude L: rotY = -(π/2 + L_rad)
      alignTargetY = rotY + shortestDelta(rotY, -(Math.PI / 2 + targetLng));
      alignStartX = globe.rotation.x;
      // Positive rotX tilts north pole toward camera → shows northern latitudes
      globe._targetX = targetLat;

      cmsReady.then(() => {
        setTimeout(() => {
          if (typeof initFoodMap === 'function') initFoodMap();
        }, 50);
      });
    }

    overlay.addEventListener('click', startZoom);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && phase === 'idle') startZoom();
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLat = pos.coords.latitude;
          userLng = pos.coords.longitude;
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    }

    function tick() {
      animFrame = requestAnimationFrame(tick);

      if (phase === 'idle') {
        rotY += 0.004;
        globe.rotation.y = rotY;
      } else if (phase === 'zoom') {
        const duration = 1800;
        const p = Math.min((Date.now() - phaseStart) / duration, 1);
        globe.rotation.y = lerp(alignStartY, alignTargetY, easeOut5(p));
        globe.rotation.x = lerp(alignStartX, globe._targetX || 0.3, easeOut5(p));
        rotY = globe.rotation.y;
        // Zoom in close to globe surface (responsive start/end)
        camera.position.z = globeStartZ - easeOut3(p) * (globeStartZ - globeEndZ);
        if (p >= 1) {
          phase = 'fade';
          phaseStart = Date.now();
        }
      } else if (phase === 'fade') {
        const p = Math.min((Date.now() - phaseStart) / 700, 1);
        overlay.style.opacity = String(1 - p);
        logoImg.style.opacity = String(1 - p);
        logoText.style.opacity = String(1 - p);
        if (p >= 1) {
          cancelAnimationFrame(animFrame);
          overlay.remove();
          pulseStyle.remove();
          renderer.dispose();
          mapEl.classList.remove('globe-active');
          mapEl.style.cssText = '';
          if (mapPage) mapPage.classList.remove('globe-active');
          if (locBtn) locBtn.style.display = '';
          if (zoomCtrl) zoomCtrl.style.display = '';
          onComplete();
          return;
        }
      }
      renderer.render(scene, camera);
    }
    tick();
    /* eslint-enable no-unreachable */
  }

  function initFoodMap() {
    if (mapInitialized || typeof L === 'undefined') return;
    const mapEl = document.getElementById('foodMap');
    if (!mapEl) return;

    // Ensure the container is visible and has dimensions before initializing
    const rect = mapEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(initFoodMap, 100);
      return;
    }

    // Sheet size constants — used throughout initFoodMap (must be declared before use)
    const PEEK_PX = 96;     // handle + toolbar always visible — minimum state
    const MID_PX = 370;     // 3 list rows + toolbar visible on mobile
    const EXPANDED_PX = 600; // 3+ rows visible (capped dynamically to leave map visible)

    try {
      foodMap = L.map('foodMap', {
        zoomControl: false,
        attributionControl: false,
      }).setView([52.505, 13.41], 11);
    } catch {
      showNotification(window.i18n ? window.i18n.t('map.errorMapLoad') : 'Could not load map');
      return;
    }
    mapInitialized = true;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(foodMap);

    document.getElementById('mapZoomIn').addEventListener('click', () => foodMap.zoomIn());
    document.getElementById('mapZoomOut').addEventListener('click', () => foodMap.zoomOut());

    // Pre-position zoom buttons above the sheet (mobile only — desktop uses CSS)
    const zoomBtnsInit = document.querySelector('.map-zoom-btns');
    if (zoomBtnsInit && !window.matchMedia('(min-width: 768px)').matches) {
      zoomBtnsInit.style.transition = 'none';
      zoomBtnsInit.style.bottom = (MID_PX + 8) + 'px';
    }

    // User location
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-location-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Try to get user location
    const defaultCenter = CONFIG.BERLIN_CENTER;
    let locationFound = false;
    let userMarker = null;

    function setDefaultView() {
      if (!locationFound) {
        locationFound = true;
        foodMap.setView(defaultCenter, 13);
        showNearbyStrip(defaultCenter[0], defaultCenter[1]);
      }
    }

    const fallbackTimer = setTimeout(() => {
      setDefaultView();
    }, CONFIG.GEO_FALLBACK_DELAY);

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(fallbackTimer);
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const inBerlin = userLat > 52.3 && userLat < 52.7 && userLng > 13.1 && userLng < 13.8;

            // Check if location is in Berlin area (rough check)
            if (inBerlin) {
              locationFound = true;
              userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(foodMap);
              foodMap.setView([userLat, userLng], 13);
              showNearbyStrip(userLat, userLng);
              // After the sheet snaps to mid (double rAF in showNearbyStrip), fly with sheet offset
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    flyToWithSheetOffset(userLat, userLng, 13);
                  })
                )
              );
            } else {
              // User is outside Berlin — locationFound is still false, so setDefaultView works
              setDefaultView();
            }
          },
          (err) => {
            clearTimeout(fallbackTimer);
            const msgs = {
              1: window.i18n ? window.i18n.t('map.locationDenied') : 'Location access denied',
              2: window.i18n ? window.i18n.t('map.locationUnavailable') : 'Location unavailable',
              3: window.i18n ? window.i18n.t('map.locationTimeout') : 'Location timeout',
            };
            showNotification(
              msgs[err.code] ||
                (window.i18n ? window.i18n.t('map.locationError') : 'Could not get location')
            );
            setDefaultView();
          },
          {
            enableHighAccuracy: true,
            timeout: CONFIG.GEO_TIMEOUT,
            maximumAge: CONFIG.GEO_MAX_AGE,
          }
        );
      } else {
        setDefaultView();
      }
    } catch {
      setDefaultView();
    }

    const logoIcon = L.icon({
      iconUrl: 'pics/eat.webp',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });

    const markers = [];
    window._mapMarkers = markers;
    const mapSpotOverlay = document.getElementById('mapSpotOverlay');
    const mapSpotContent = document.getElementById('mapSpotContent');
    const mapSpotClose = document.getElementById('mapSpotClose');

    function getSpotPhoto() {
      return 'pics/eat.webp';
    }

    function flyToWithSheetOffset(lat, lng, zoom) {
      if (!foodMap) return;
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;

      if (isDesktop) {
        // The map is full-width (sidebar overlaps the right 360px).
        // To centre the spot in the visible map area (left of sidebar),
        // shift the Leaflet centre 180px to the RIGHT of the target —
        // so the target appears 180px LEFT of the map centre = visual centre.
        const targetPoint = foodMap.project([lat, lng], zoom);
        const adjustedPoint = L.point(targetPoint.x + 180, targetPoint.y);
        const adjustedLatLng = foodMap.unproject(adjustedPoint, zoom);
        foodMap.flyTo(adjustedLatLng, zoom, { animate: true, duration: 1 });
        return;
      }

      // Mobile: offset upward for the bottom sheet
      const sheetVisible =
        _sheetState === 'expanded'
          ? Math.min(EXPANDED_PX, (document.getElementById('mapNearby')?.offsetHeight || 600) - 140)
          : _sheetState === 'mid'
            ? MID_PX
            : PEEK_PX;
      if (sheetVisible > 20) {
        const targetPoint = foodMap.project([lat, lng], zoom);
        const adjustedPoint = L.point(targetPoint.x, targetPoint.y + sheetVisible / 2);
        const adjustedLatLng = foodMap.unproject(adjustedPoint, zoom);
        foodMap.flyTo(adjustedLatLng, zoom, { animate: true, duration: 1 });
      } else {
        foodMap.flyTo([lat, lng], zoom, { animate: true, duration: 1 });
      }
    }

    function showSpotDetail(spot) {
      if (foodMap) {
        flyToWithSheetOffset(spot.lat, spot.lng, 15);
      }

      const mapsUrl =
        spot.mapsUrl ||
        'https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent(spot.name + ', ' + spot.address);
      const photo = spot.photo || getSpotPhoto(spot.type);

      while (mapSpotContent.firstChild) mapSpotContent.removeChild(mapSpotContent.firstChild);

      // Image wrapper with district badge
      const imgWrap = document.createElement('div');
      imgWrap.className = 'map-spot-img-wrap';

      const img = document.createElement('img');
      img.src = photo;
      img.className = 'map-spot-photo';
      img.alt = spot.name;
      img.loading = 'lazy';

      const districtBadge = document.createElement('div');
      districtBadge.className = 'map-spot-district-badge';
      districtBadge.textContent = spot.district;

      imgWrap.appendChild(img);
      imgWrap.appendChild(districtBadge);

      // Card body
      const body = document.createElement('div');
      body.className = 'map-spot-body';

      const metaRow = document.createElement('div');
      metaRow.className = 'map-spot-meta-row';

      const typeBadge = document.createElement('span');
      typeBadge.className = 'map-spot-type-badge';
      typeBadge.textContent = spot.type;
      metaRow.appendChild(typeBadge);

      if (spot.price) {
        const priceBadge = document.createElement('span');
        priceBadge.className = 'map-spot-price-badge';
        priceBadge.textContent = spot.price;
        metaRow.appendChild(priceBadge);
      }

      const openStatus = isOpenNow(spot.openingHours);
      if (openStatus !== null) {
        const statusBadge = document.createElement('span');
        statusBadge.className =
          'map-spot-status-badge' +
          (openStatus ? ' map-spot-status-badge--open' : ' map-spot-status-badge--closed');
        statusBadge.textContent = openStatus ? window.i18n.t('map.open') : window.i18n.t('map.closed');
        metaRow.appendChild(statusBadge);
      }

      const name = document.createElement('h3');
      name.className = 'map-spot-name';
      name.textContent = spot.name;

      const addressEl = document.createElement('div');
      addressEl.className = 'map-spot-address';
      addressEl.textContent = spot.address;

      const btnRow = document.createElement('div');
      btnRow.className = 'map-spot-btn-row';

      const btn = document.createElement('a');
      btn.href = mapsUrl;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.className = 'map-spot-btn';
      btn.textContent = window.i18n.t('map.openInMaps');
      btnRow.appendChild(btn);

      if (spot.website) {
        const webBtn = document.createElement('a');
        webBtn.href = spot.website;
        webBtn.target = '_blank';
        webBtn.rel = 'noopener';
        webBtn.className = 'map-spot-btn map-spot-btn--secondary';
        webBtn.textContent = 'Website';
        btnRow.appendChild(webBtn);
      }

      if (spot.reservationUrl) {
        const resBtn = document.createElement('a');
        resBtn.href = spot.reservationUrl;
        resBtn.target = '_blank';
        resBtn.rel = 'noopener';
        resBtn.className = 'map-spot-btn map-spot-btn--reservation';
        resBtn.textContent = window.i18n.t('map.reserve');
        btnRow.appendChild(resBtn);
      }

      body.appendChild(metaRow);
      body.appendChild(name);
      body.appendChild(addressEl);

      if (spot.tip) {
        const tipEl = document.createElement('div');
        tipEl.className = 'map-spot-tip';
        tipEl.textContent = '✦ ' + spot.tip;
        body.appendChild(tipEl);
      }

      if (spot.openingHours && spot.openingHours.length) {
        const hoursEl = document.createElement('div');
        hoursEl.className = 'map-spot-hours';
        spot.openingHours.forEach((h) => {
          const row = document.createElement('span');
          row.className = 'map-spot-hours-row';
          const bold = document.createElement('b');
          bold.textContent = h.days || '';
          row.appendChild(bold);
          row.appendChild(document.createTextNode(h.hours || ''));
          hoursEl.appendChild(row);
        });
        body.appendChild(hoursEl);
      }

      // Favourite button
      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'map-spot-fav-btn';
      favBtn.setAttribute('aria-label', 'Save to favourites');
      const spotId = spot._id || spot.name.replace(/\s+/g, '-').toLowerCase();
      favBtn.dataset.favId = spotId;
      const isFaved = window._favSpots?.has(spotId);
      favBtn.textContent = isFaved ? '\u2665' : '\u2661';
      favBtn.classList.toggle('map-spot-fav-btn--active', !!isFaved);
      favBtn.addEventListener('click', () => window._toggleFav(spotId, spot.name, favBtn));
      imgWrap.appendChild(favBtn);

      body.appendChild(btnRow);

      mapSpotContent.appendChild(imgWrap);
      mapSpotContent.appendChild(body);

      mapSpotOverlay.classList.add('active');
      bodyOverflow.lock();
    }
    window._showSpotDetail = showSpotDetail;
    window._navigateToPage = navigateToPage;
    window._mapSnapSheet = _snapSheet;

    // Handle spot pending from favourites navigation (map wasn't ready yet)
    if (window._pendingFavSpot) {
      const pending = window._pendingFavSpot;
      window._pendingFavSpot = null;
      setTimeout(() => showSpotDetail(pending), 50);
    }

    function haversineDistance(lat1, lng1, lat2, lng2) {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ---- Bottom Sheet: Nearby ----
    let _nearbyLat = null,
      _nearbyLng = null;
    let _sheetState = 'peek'; // 'peek' | 'mid' | 'expanded'
    let _sheetReady = false;
    let _mapSearchQuery = '';
    let _mapOpenOnly = false;
    let _mapActiveFilter = 'all';

    function isOpenNow(openingHours) {
      if (!openingHours || !openingHours.length) return null;
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const dayMap = {
        so: 0,
        sun: 0,
        sunday: 0,
        sonntag: 0,
        mo: 1,
        mon: 1,
        monday: 1,
        montag: 1,
        di: 2,
        tue: 2,
        tuesday: 2,
        dienstag: 2,
        mi: 3,
        wed: 3,
        wednesday: 3,
        mittwoch: 3,
        do: 4,
        thu: 4,
        thursday: 4,
        donnerstag: 4,
        fr: 5,
        fri: 5,
        friday: 5,
        freitag: 5,
        sa: 6,
        sat: 6,
        saturday: 6,
        samstag: 6,
      };
      function toDayNum(s) {
        return dayMap[s.toLowerCase().trim()] ?? null;
      }
      function toMins(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
      }
      for (const slot of openingHours) {
        const days = (slot.days || '').trim();
        const hours = (slot.hours || '').toLowerCase().trim();
        let match = false;
        const dl = days.toLowerCase().replace(/\s/g, '');
        if (['täglich', 'daily', 'mo–so', 'mo-so', 'mon–sun', 'mon-sun', '7days'].includes(dl)) {
          match = true;
        } else if (days.includes('–') || (days.includes('-') && days.length > 3)) {
          const sep = days.includes('–') ? '–' : '-';
          const [s, e] = days.split(sep).map((p) => toDayNum(p));
          if (s !== null && e !== null) {
            match = s <= e ? dayOfWeek >= s && dayOfWeek <= e : dayOfWeek >= s || dayOfWeek <= e;
          }
        } else {
          match = days.split(',').some((d) => toDayNum(d) === dayOfWeek);
        }
        if (!match) continue;
        if (hours === 'closed' || hours === 'geschlossen' || hours === 'ruhetag') continue;
        // Support comma-separated time windows e.g. "12:00-15:00, 18:00-22:00"
        const timeWindows = hours.split(',').map((w) => w.trim()).filter(Boolean);
        for (const tw of timeWindows) {
          const sep = tw.includes('–') ? '–' : '-';
          const parts = tw.split(sep).map((p) => p.trim());
          if (parts.length === 2) {
            const open = toMins(parts[0]);
            // 00:00 closing = midnight = end of day (1440), not start of day (0)
            const close = toMins(parts[1]) || 24 * 60;
            const isOpen =
              close > open
                ? currentMinutes >= open && currentMinutes < close
                : currentMinutes >= open || currentMinutes < close;
            if (isOpen) return true;
          }
        }
      }
      return false;
    }

    function _renderNearbyGrid() {
      const gridEl = document.getElementById('mapNearbyGrid');
      if (!gridEl || _nearbyLat === null) return;

      const activeFilter = _mapActiveFilter;

      const searchQ = _mapSearchQuery.toLowerCase().trim();
      const sorted = spots
        .map((s) => ({ ...s, dist: haversineDistance(_nearbyLat, _nearbyLng, s.lat, s.lng) }))
        .filter((s) => activeFilter === 'all' || (s.categories || []).includes(activeFilter))
        .filter((s) => {
          if (!searchQ) return true;
          const haystack = `${s.name} ${s.district} ${s.type} ${(s.categories || []).join(' ')}`.toLowerCase();
          return searchQ.split(' ').filter(Boolean).every((w) => haystack.includes(w));
        })
        .filter((s) => {
          if (!_mapOpenOnly) return true;
          return isOpenNow(s.openingHours) === true;
        })
        .sort((a, b) => a.dist - b.dist);

      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
      const isMobileView = !window.matchMedia('(min-width: 768px)').matches;
      gridEl.classList.toggle('map-nearby-grid--list', isMobileView);

      sorted.forEach((spot) => {
        const distM = Math.round(spot.dist);
        const distLabel = distM < 1000 ? distM + 'm' : (spot.dist / 1000).toFixed(1) + 'km';
        const photo = spot.photo || getSpotPhoto(spot.type);
        const spotId = spot._id || spot.name.replace(/\s+/g, '-').toLowerCase();

        const openStatus = isOpenNow(spot.openingHours);

        const card = document.createElement('div');
        card.className = isMobileView ? 'map-nearby-list-row' : 'map-nearby-grid-card';

        if (isMobileView) {
          // List row: thumbnail left, text right
          const thumb = document.createElement('div');
          thumb.className = 'map-list-thumb';
          const thumbImg = document.createElement('img');
          thumbImg.src = photo;
          thumbImg.alt = spot.name;
          thumbImg.loading = 'lazy';
          thumb.appendChild(thumbImg);

          const info = document.createElement('div');
          info.className = 'map-list-info';

          const topRow = document.createElement('div');
          topRow.className = 'map-list-top';

          const nameEl = document.createElement('span');
          nameEl.className = 'map-list-name';
          nameEl.textContent = spot.name;
          topRow.appendChild(nameEl);

          if (openStatus !== null) {
            const badge = document.createElement('span');
            badge.className = 'map-list-status' + (openStatus ? ' map-list-status--open' : ' map-list-status--closed');
            badge.textContent = openStatus
              ? (window.i18n ? window.i18n.t('map.open') : 'Open')
              : (window.i18n ? window.i18n.t('map.closed') : 'Closed');
            topRow.appendChild(badge);
          }

          const metaEl = document.createElement('div');
          metaEl.className = 'map-list-meta';
          metaEl.textContent = spot.type + (spot.price ? ' · ' + spot.price : '') + ' · ' + distLabel;

          info.appendChild(topRow);
          info.appendChild(metaEl);

          const favBtn = document.createElement('button');
          favBtn.type = 'button';
          favBtn.className = 'map-list-fav';
          favBtn.setAttribute('aria-label', 'Speichern');
          const isFaved = window._favSpots?.has(spotId);
          favBtn.textContent = isFaved ? '\u2665' : '\u2661';
          if (isFaved) favBtn.classList.add('map-nearby-grid-card-fav--active');
          favBtn.addEventListener('click', (e) => { e.stopPropagation(); window._toggleFav(spotId, spot.name, favBtn); });

          card.appendChild(thumb);
          card.appendChild(info);
          card.appendChild(favBtn);
        } else {
          // Desktop grid card (unchanged)
          const imgWrap = document.createElement('div');
          imgWrap.className = 'map-nearby-grid-card-img-wrap';
          const img = document.createElement('img');
          img.className = 'map-nearby-grid-card-img';
          img.src = photo; img.alt = spot.name; img.loading = 'lazy';
          const distBadge = document.createElement('span');
          distBadge.className = 'map-nearby-grid-card-dist';
          distBadge.textContent = distLabel;
          imgWrap.appendChild(img); imgWrap.appendChild(distBadge);

          const body = document.createElement('div');
          body.className = 'map-nearby-grid-card-body';
          const nameRow = document.createElement('div');
          nameRow.className = 'map-nearby-grid-card-name-row';
          const name = document.createElement('div');
          name.className = 'map-nearby-grid-card-name';
          name.textContent = spot.name;
          const favBtn = document.createElement('button');
          favBtn.type = 'button';
          favBtn.className = 'map-nearby-grid-card-fav';
          favBtn.setAttribute('aria-label', 'Speichern');
          const isFaved = window._favSpots?.has(spotId);
          favBtn.textContent = isFaved ? '\u2665' : '\u2661';
          if (isFaved) favBtn.classList.add('map-nearby-grid-card-fav--active');
          favBtn.addEventListener('click', (e) => { e.stopPropagation(); window._toggleFav(spotId, spot.name, favBtn); });
          nameRow.appendChild(name); nameRow.appendChild(favBtn);
          const meta = document.createElement('div');
          meta.className = 'map-nearby-grid-card-meta';
          meta.textContent = spot.type + (spot.price ? ' · ' + spot.price : '');
          body.appendChild(nameRow); body.appendChild(meta);
          if (openStatus !== null) {
            const badge = document.createElement('span');
            badge.className = 'map-nearby-grid-card-status' + (openStatus ? ' map-nearby-grid-card-status--open' : ' map-nearby-grid-card-status--closed');
            badge.textContent = openStatus ? (window.i18n ? window.i18n.t('map.open') : 'Open') : (window.i18n ? window.i18n.t('map.closed') : 'Closed');
            body.appendChild(badge);
          }
          card.appendChild(imgWrap); card.appendChild(body);
        }

        card.addEventListener('click', () => {
          flyToWithSheetOffset(spot.lat, spot.lng, 15);
          showSpotDetail(spot);
        });
        gridEl.appendChild(card);
      });

    }

    function _snapSheet(state, animate = true) {
      const sheet = document.getElementById('mapNearby');
      if (!sheet) return;
      _sheetState = state;
      sheet.classList.toggle('sheet--expanded', state === 'expanded');
      const h = sheet.offsetHeight;
      // Cap expanded so at least 140px of map is always visible above the sheet
      const expandedPx = Math.min(EXPANDED_PX, h - 140);
      const y =
        state === 'mid'
          ? h - MID_PX
          : state === 'expanded'
            ? h - expandedPx
            : h - PEEK_PX; // peek — handle always visible, never fully hidden
      sheet.style.transition = animate ? 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)' : 'none';
      sheet.style.transform = `translateY(${Math.max(0, y)}px)`;

      // Keep zoom buttons above visible sheet edge (mobile only — desktop uses CSS)
      const zoomBtns = document.querySelector('.map-zoom-btns');
      if (zoomBtns && !window.matchMedia('(min-width: 768px)').matches) {
        const visible =
          state === 'mid' ? MID_PX : state === 'expanded' ? expandedPx : PEEK_PX;
        zoomBtns.style.transition = animate ? 'bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)' : 'none';
        zoomBtns.style.bottom = visible + 8 + 'px';
      }
    }

    function _initSheetDrag() {
      const sheet = document.getElementById('mapNearby');
      const handle = document.getElementById('mapNearbyHandle');
      if (!sheet || !handle) return;

      let startY = 0,
        startTranslate = 0,
        lastY = 0,
        lastT = 0,
        vel = 0,
        dragging = false;

      function dragStart(clientY) {
        dragging = true;
        startY = clientY;
        startTranslate = new DOMMatrix(getComputedStyle(sheet).transform).m42;
        lastY = startY;
        lastT = Date.now();
        vel = 0;
        sheet.style.transition = 'none';
      }

      function dragMove(clientY) {
        if (!dragging) return;
        const newY = Math.max(0, startTranslate + (clientY - startY));
        sheet.style.transform = `translateY(${newY}px)`;
        const now = Date.now(),
          dt = now - lastT;
        if (dt > 0) vel = (clientY - lastY) / dt;
        lastY = clientY;
        lastT = now;
      }

      function dragEnd() {
        if (!dragging) return;
        dragging = false;
        const curY = new DOMMatrix(getComputedStyle(sheet).transform).m42;
        const h = sheet.offsetHeight;

        let next;
        if (vel > 0.5) {
          // fast swipe down → step down
          next = _sheetState === 'expanded' ? 'mid' : 'peek';
        } else if (vel < -0.5) {
          // fast swipe up → step up
          next = _sheetState === 'peek' ? 'mid' : 'expanded';
        } else if (_sheetState === 'expanded') {
          // In expanded: h is the full expanded height — snap points are reliable
          const expandedPx = Math.min(EXPANDED_PX, h - 140);
          const pts = { peek: h - PEEK_PX, mid: h - MID_PX, expanded: h - expandedPx };
          next = Object.entries(pts).sort(
            (a, b) => Math.abs(curY - a[1]) - Math.abs(curY - b[1])
          )[0][0];
        } else {
          // In mid or peek: h is the non-expanded height.
          // expanded snap point from h would be wrong (h changes when class is added),
          // so use positional heuristic: if user dragged above mid position → expand.
          const midY = h - MID_PX;   // e.g. ~9px when h≈249
          const peekY = h - PEEK_PX; // e.g. ~217px
          if (curY <= midY) {
            next = 'expanded';                        // dragged to/above mid → expand
          } else if (curY >= (midY + peekY) / 2) {
            next = 'peek';
          } else {
            next = 'mid';
          }
        }
        _snapSheet(next);
      }

      // Touch events — full sheet is draggable
      sheet.addEventListener(
        'touchstart',
        (e) => {
          if (e.target.closest('#mapNearbyGrid') || e.target.closest('.map-nearby-toolbar')) return;
          dragStart(e.touches[0].clientY);
        },
        { passive: true }
      );
      sheet.addEventListener(
        'touchmove',
        (e) => {
          if (e.target.closest('#mapNearbyGrid') || e.target.closest('.map-nearby-toolbar')) return;
          dragMove(e.touches[0].clientY);
        },
        { passive: true }
      );
      sheet.addEventListener('touchend', (e) => {
        if (e.target.closest('.map-nearby-toolbar')) return;
        dragEnd();
      });

      // Also allow swipe-up from the map container itself
      const mapContainer = document.getElementById('foodMap');
      if (mapContainer) {
        mapContainer.addEventListener('touchstart', (e) => {
          dragStart(e.touches[0].clientY);
        }, { passive: true });
        mapContainer.addEventListener('touchmove', (e) => {
          dragMove(e.touches[0].clientY);
        }, { passive: true });
        mapContainer.addEventListener('touchend', () => dragEnd());
      }

      // Mouse events (desktop) — full sheet
      sheet.addEventListener('mousedown', (e) => {
        if (e.target.closest('#mapNearbyGrid')) return;
        e.preventDefault();
        dragStart(e.clientY);
      });
      document.addEventListener('mousemove', (e) => {
        if (dragging) dragMove(e.clientY);
      });
      document.addEventListener('mouseup', dragEnd);
    }

    function showNearbyStrip(lat, lng) {
      _nearbyLat = lat;
      _nearbyLng = lng;
      // Apply i18n label
      const nearbyTitle = document.getElementById('mapNearbyTitle');
      if (nearbyTitle && window.i18n) nearbyTitle.textContent = window.i18n.t('map.nearby');
      _renderNearbyGrid();
      // Safety net: if CMS data didn't arrive yet (e.g. slow mobile network),
      // re-render once cmsReady resolves and spots become available.
      if (!spots.length) {
        cmsReady.then(() => {
          if (spots.length > 0 && _nearbyLat !== null) {
            _renderNearbyGrid();
            _snapSheet('mid', true);
          }
        });
      }

      const _isDesktop = window.matchMedia('(min-width: 768px)').matches;

      if (_isDesktop) {
        // Desktop sidebar: always visible, no snap/drag needed
        const sheet = document.getElementById('mapNearby');
        if (sheet) sheet.style.transform = 'none';
        return;
      }

      // Mobile: bottom sheet behavior
      if (!_sheetReady) {
        _sheetReady = true;
        const sheet = document.getElementById('mapNearby');
        if (sheet) sheet.style.transform = `translateY(${sheet.offsetHeight - PEEK_PX}px)`;
        _initSheetDrag();
      }
      // Double rAF: first frame lets grid paint, second measures correct height
      requestAnimationFrame(() => requestAnimationFrame(() => {
        _snapSheet('mid', true);
        // Register map click → peek only after sheet is settled (800ms safety window)
        if (foodMap && !foodMap._eatThisClickBound) {
          foodMap._eatThisClickBound = true;
          setTimeout(() => {
            foodMap.on('click', () => {
              if (_sheetState === 'mid' || _sheetState === 'expanded') {
                _snapSheet('peek');
              }
            });
          }, 800);
        }
      }));
      // Belt-and-suspenders: rAF can be throttled on mobile Safari during Leaflet tile-load.
      // If the sheet is still at peek after 300ms, force it to mid.
      setTimeout(() => {
        if (_sheetState === 'peek') _snapSheet('mid', true);
      }, 300);
    }

    function hideSpotDetail() {
      mapSpotOverlay.classList.remove('active');
      bodyOverflow.unlock();
    }

    if (mapSpotClose) {
      mapSpotClose.addEventListener('click', hideSpotDetail);
    }

    if (mapSpotOverlay) {
      mapSpotOverlay.addEventListener('click', (e) => {
        if (e.target === mapSpotOverlay) {
          hideSpotDetail();
        }
      });
    }

    function addSpotMarker(spot) {
      const marker = L.marker([spot.lat, spot.lng], { icon: logoIcon }).addTo(foodMap);
      marker.spotType = spot.type;
      marker.spotDistrict = spot.district;
      marker.spotData = spot;
      marker.spotCategories = spot.categories || [];
      marker.on('click', () => showSpotDetail(spot));
      markers.push(marker);
    }

    spots.forEach(addSpotMarker);

    // Fallback: if CMS data wasn't ready when initFoodMap ran (e.g. slow mobile
    // network caused cmsReady to resolve with an empty restaurants response),
    // try fetching restaurants directly and inject them after the fact.
    if (spots.length === 0 && window.CMS) {
      window.CMS.fetchRestaurants().then((restaurants) => {
        if (!restaurants || !restaurants.length) return;
        spots = restaurants.map((r) => ({ ...r, type: (r.categories || []).join(' · ') }));
        window._allSpots = spots;
        spots.forEach(addSpotMarker);
        // Update filter counts
        const countAllEl = document.getElementById('count-all');
        if (countAllEl) countAllEl.textContent = spots.length;
        // Re-render grid if the nearby strip is already showing
        if (_nearbyLat !== null) {
          _renderNearbyGrid();
          const isDesktop = window.matchMedia('(min-width: 768px)').matches;
          if (!isDesktop) _snapSheet('mid', true);
        }
      }).catch(() => {});
    }

    // Close spot detail when clicking on map background
    const mapContainer = document.getElementById('foodMap');
    if (mapContainer) {
      mapContainer.addEventListener('click', (e) => {
        if (
          e.target === mapContainer ||
          e.target.classList.contains('leaflet-pane') ||
          e.target.classList.contains('leaflet-map-pane')
        ) {
          hideSpotDetail();
        }
      });
    }

    // Custom filter dropdown
    const filterBtn = document.getElementById('mapFilterBtn');
    const filterMenu = document.getElementById('mapFilterMenu');
    const filterLabel = document.getElementById('mapFilterLabel');
    const filterOptions = document.querySelectorAll('.map-filter-option');

    function _applyFilter(value) {
      _mapActiveFilter = value;
      // Update label
      const chosen = document.querySelector(`.map-filter-option[data-value="${value}"]`);
      if (filterLabel && chosen) filterLabel.textContent = chosen.textContent.trim();
      // Update active state
      filterOptions.forEach((o) => o.classList.toggle('active', o.dataset.value === value));
      // Close menu
      if (filterMenu) filterMenu.classList.remove('open');
      // Filter markers
      markers.forEach((marker) => {
        const cats = marker.spotCategories || [];
        const show = value === 'all' || cats.includes(value);
        if (show) { if (!foodMap.hasLayer(marker)) marker.addTo(foodMap); }
        else { foodMap.removeLayer(marker); }
      });
      // Re-render grid
      if (_nearbyLat !== null) {
        _renderNearbyGrid();
        requestAnimationFrame(() => {
          const wrapper = document.querySelector('.map-nearby-grid-wrapper');
          if (wrapper) wrapper.scrollTop = 0;
        });
      }
    }

    if (filterBtn && filterMenu) {
      // Move menu to body so it floats above all sheet overflow/reflow
      document.body.appendChild(filterMenu);

      function _positionMenu() {
        const r = filterBtn.getBoundingClientRect();
        filterMenu.style.position = 'fixed';
        filterMenu.style.top = (r.bottom + 6) + 'px';
        filterMenu.style.left = r.left + 'px';
        filterMenu.style.bottom = 'auto';
      }

      function _openMenu() {
        _positionMenu();
        filterMenu.classList.add('open');
      }
      function _closeMenu() {
        filterMenu.classList.remove('open');
      }

      filterBtn.addEventListener('click', (e) => { e.stopPropagation(); filterMenu.classList.contains('open') ? _closeMenu() : _openMenu(); });
      filterBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
      filterBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); filterMenu.classList.contains('open') ? _closeMenu() : _openMenu(); });

      filterOptions.forEach((opt) => {
        opt.addEventListener('click', (e) => { e.stopPropagation(); _applyFilter(opt.dataset.value); });
        opt.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
        opt.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); _applyFilter(opt.dataset.value); });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#mapFilterDropdown') && !e.target.closest('#mapFilterMenu')) _closeMenu();
      });
      document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('#mapFilterDropdown') && !e.target.closest('#mapFilterMenu')) _closeMenu();
      }, { passive: true });
    }


    // Map search input
    const mapSearchInput = document.getElementById('mapSearchInput');
    if (mapSearchInput) {
      mapSearchInput.addEventListener('input', () => {
        _mapSearchQuery = mapSearchInput.value;
        if (_nearbyLat !== null) _renderNearbyGrid();
      });
      // iOS Safari: touch-action:none on the sheet blocks input focus — force it
      mapSearchInput.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });
      mapSearchInput.addEventListener('touchend', (e) => {
        e.stopPropagation();
        mapSearchInput.focus();
      });
    }

    // Open-now toggle
    const mapOpenToggle = document.getElementById('mapOpenToggle');
    if (mapOpenToggle) {
      mapOpenToggle.addEventListener('click', () => {
        _mapOpenOnly = !_mapOpenOnly;
        mapOpenToggle.classList.toggle('map-open-toggle--active', _mapOpenOnly);
        if (_nearbyLat !== null) {
          _renderNearbyGrid();
          requestAnimationFrame(() => {
            const wrapper = document.querySelector('.map-nearby-grid-wrapper');
            if (wrapper) wrapper.scrollTop = 0;
          });
        }
      });
    }

    // Location button
    const mapLocationBtn = document.getElementById('mapLocationBtnFixed');

    if (mapLocationBtn) {
      mapLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          showNotification('Geolocation wird von diesem Gerät nicht unterstützt');
          return;
        }

        mapLocationBtn.classList.add('loading');

        navigator.geolocation.getCurrentPosition(
          (position) => {
            mapLocationBtn.classList.remove('loading');
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            if (userMarker) {
              userMarker.setLatLng([userLat, userLng]);
            } else {
              userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(foodMap);
            }

            showNearbyStrip(userLat, userLng);
            requestAnimationFrame(() =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  flyToWithSheetOffset(userLat, userLng, 14);
                })
              )
            );
          },
          (error) => {
            mapLocationBtn.classList.remove('loading');
            let msg = 'Standort konnte nicht ermittelt werden';
            if (error.code === 1) {
              msg = 'Standortzugriff erlauben in den Einstellungen';
            } else if (error.code === 2) {
              msg = 'Standort nicht verfügbar';
            }
            showNotification(msg);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      });
    }

    setTimeout(() => foodMap.invalidateSize(), 100);
  }

  // --- News Article Modal ---
  const newsModal = document.getElementById('newsModal');
  const newsModalClose = document.getElementById('newsModalClose');
  document.querySelectorAll('.news-featured, .news-card');
  let currentShareData = { title: '', text: '', url: window.location.href };

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
    a.href = '#';
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
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openNewsModal(card);
    });
    return art;
  }

  function openNewsModal(article) {
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
    document.getElementById('newsModalContent').innerHTML = contentHtml; // safe: portableTextToHtml escapes all user data

    // Recommendations
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

    navigateToPage('news-article');
    newsModal.scrollTop = 0;
  }

  function closeNewsModal() {
    navigateToPage('news');
  }

  function bindNewsCards() {
    document.querySelectorAll('.news-card, .news-featured').forEach((card) => {
      const link = card.querySelector('a');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          openNewsModal(card);
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
  window._bindNewsCards = () => { bindNewsCards(); populateTicker(); };

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
          loadScript(
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH'
          )
            .then(() => {
              // Three.js: load in background so globe is ready when re-enabled.
              // showGlobeIntro already guards against THREE being undefined.
              loadScript(
                'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
                'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu'
              ).catch(() => {}); // non-critical — globe handles missing THREE

              showGlobeIntro(() => {
                cmsReady.then(() => {
                  if (typeof initFoodMap === 'function') initFoodMap();
                });
                if (foodMap) {
                  foodMap.invalidateSize();
                  setTimeout(() => {
                    if (foodMap) foodMap.invalidateSize();
                  }, 300);
                  // Re-snap sheet to mid when returning to map (mobile only)
                  if (!window.matchMedia('(min-width: 768px)').matches && window._mapSnapSheet) {
                    requestAnimationFrame(() => window._mapSnapSheet('mid', false));
                  }
                }
              });
            })
            .catch(() => {
              // Fallback: try map without globe
              cmsReady.then(() => {
                if (typeof initFoodMap === 'function') initFoodMap();
              });
            });
        }
      } else {
        page.classList.remove('active');
        page.classList.add('hidden');
      }
    });

    // Scroll target page back to top on every navigation.
    // rAF needed: browser may restore the old scrollTop after display:none→block.
    if (targetPage && pageName !== 'map') {
      targetPage.scrollTop = 0;
      requestAnimationFrame(() => { targetPage.scrollTop = 0; });
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

    // Track navigation history for back button
    window._prevPage    = window._currentPage || 'start';
    window._currentPage = pageName;

    // Load CMS content for static pages
    if (STATIC_PAGE_SLUGS.includes(pageName)) {
      loadStaticPage(pageName);
    }
  }

  if (appPages.length) {
    if (navbarBrand) {
      navbarBrand.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('start');
        window.location.hash = 'start';
      });
    }

    // Header icon buttons
    const navNewsBtn = document.getElementById('navNewsBtn');
    const navMapBtn = document.getElementById('navMapBtn');
    const navMustsBtn = document.getElementById('navMustsBtn');
    if (navNewsBtn) {
      navNewsBtn.addEventListener('click', () => {
        navigateToPage('news');
        window.location.hash = 'news';
      });
    }
    if (navMapBtn) {
      navMapBtn.addEventListener('click', () => {
        navigateToPage('map');
        window.location.hash = 'map';
      });
    }
    if (navMustsBtn) {
      navMustsBtn.addEventListener('click', () => {
        navigateToPage('musts');
        window.location.hash = 'musts';
      });
    }

    const navProfileBtn = document.getElementById('navProfileBtn');
    if (navProfileBtn) {
      navProfileBtn.addEventListener('click', () => {
        if (window._currentUser) {
          navigateToPage('profile');
          window.location.hash = 'profile';
        } else {
          window.openLoginModal?.();
        }
      });
    }

    // Burger menu page navigation (News)
    document.querySelectorAll('.burger-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeBurger?.();
        const page = btn.dataset.page;
        navigateToPage(page);
        window.location.hash = page;
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

    function checkHash() {
      const hash = window.location.hash.replace('#', '') || 'start';
      const validPages = ['start', 'news', 'musts', 'map', 'profile'];
      if (validPages.includes(hash)) {
        navigateToPage(hash);
      }
    }

    window.addEventListener('hashchange', checkHash);
    checkHash();

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

  // Static page back buttons
  document.querySelectorAll('.static-page-back[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateToPage(window._prevPage || 'start');
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
      navigateToPage('agb');
    });

  // Datenschutz Modal
  createModal(document.getElementById('datenschutzModal'), {
    trigger: document.getElementById('datenschutzTrigger'),
    closeBtn: document.getElementById('datenschutzClose'),
    backdrop: document.getElementById('datenschutzBackdrop'),
  });
  const datenschutzFromBurger = document.getElementById('openDatenschutzFromBurger');
  if (datenschutzFromBurger)
    datenschutzFromBurger.addEventListener('click', () => {
      closeBurger();
      navigateToPage('datenschutz');
    });

  // Static page navigation from burger drawer (about/contact/press/impressum)
  // Modal HTML for these slugs still exists but is no longer opened — removed in Task 16.
  ['about', 'contact', 'press', 'impressum'].forEach((slug) => {
    const cap = slug.charAt(0).toUpperCase() + slug.slice(1);
    const trigger = document.getElementById('open' + cap);
    if (trigger) {
      trigger.addEventListener('click', () => {
        closeBurger();
        navigateToPage(slug);
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
  mustLightboxInner.appendChild(mustLightboxImg);
  mustLightbox.appendChild(mustLightboxInner);
  document.body.appendChild(mustLightbox);

  let mustActiveCard = null;

  function openMustCard(cardEl, src, alt) {
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
    bodyOverflow.lock();

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
        bodyOverflow.unlock();
      }, 380);
    } else {
      mustLightbox.classList.remove('active');
      mustLightboxInner.style.cssText = '';
      mustActiveCard = null;
      mustClosing = false;
      bodyOverflow.unlock();
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
    if (cookieConsent) {
      cookieConsent.classList.remove('show');
    }
  }

  if (cookieConsent && !localStorage.getItem('cookieConsent')) {
    setTimeout(() => {
      cookieConsent.classList.add('show');
    }, 1000);
  }

  if (cookieAccept) {
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      loadAnalytics();
      closeCookieSettings();
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
    // Nav links
    const navBtn = e.target.closest('.site-footer-link[data-page]');
    if (navBtn) { navigateToPage(navBtn.dataset.page); return; }

    // Logo link
    const logoLink = e.target.closest('.site-footer-logo-link[data-page]');
    if (logoLink) { e.preventDefault(); navigateToPage(logoLink.dataset.page); return; }

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
});

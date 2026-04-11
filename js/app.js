/* ============================================
   EAT THIS — Interactions & Animations
   ============================================ */

// Lock to portrait mode on mobile
if (window.innerWidth <= 767 && screen.orientation?.lock) {
  screen.orientation.lock('portrait').catch(() => {});
}


document.addEventListener('DOMContentLoaded', () => {

  // ============================================
  // BODY OVERFLOW MANAGER
  // Prevents scroll-state conflicts when multiple modals are used
  // ============================================
  const bodyOverflow = (() => {
    let count = 0;
    return {
      lock()   { count++; document.body.style.overflow = 'hidden'; },
      unlock() { count = Math.max(0, count - 1); if (!count) document.body.style.overflow = ''; }
    };
  })();
  window.bodyOverflow = bodyOverflow;

  // ============================================
  // HERO SLIDER
  // ============================================
  const heroSlides = document.querySelectorAll('.hero-slide');
  let heroInterval = null;
  let currentSlide = 0;
  const slideInterval = 4000;
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
  function showNotification(message, duration = 3000) {
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

  const mustEatsData = Array.from(document.querySelectorAll('.eat-card')).map(card => ({
    dish: card.dataset.dish || '',
    restaurant: card.dataset.restaurant || '',
    district: card.dataset.district || '',
    price: card.dataset.price || '',
    img: card.dataset.img || '',
    type: 'must-eat'
  }));

  const newsData = Array.from(document.querySelectorAll('.news-card')).map(card => ({
    title: card.dataset.title || '',
    category: card.dataset.categoryLabel || '',
    date: card.dataset.date || '',
    img: card.dataset.img || '',
    type: 'news'
  }));

  function openSearch() {
    if (searchOverlay) {
      searchOverlay.classList.add('active');
      bodyOverflow.lock();
      // On desktop focus immediately; on mobile wait for slide-up animation
      // to finish before focusing so the iOS keyboard doesn't hide the sheet
      setTimeout(() => {
        if (searchInput) searchInput.focus();
      }, window.innerWidth > 767 ? 100 : 400);
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function search(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
      searchResults.innerHTML = `<div class="search-hint">${window.i18n ? window.i18n.t('search.hint') : 'Start typing to search...'}</div>`;
      return;
    }

    const results = [];
    const queryWords = q.split(' ').filter(w => w.length > 1);

    mustEatsData.forEach(item => {
      const searchable = `${item.dish} ${item.restaurant} ${item.district}`.toLowerCase();
      const matchScore = queryWords.filter(word => searchable.includes(word)).length;
      if (matchScore === queryWords.length) {
        results.push({ ...item, matchScore });
      }
    });

    newsData.forEach(item => {
      const searchable = `${item.title} ${item.category} ${item.date}`.toLowerCase();
      const matchScore = queryWords.filter(word => searchable.includes(word)).length;
      if (matchScore === queryWords.length) {
        results.push({ ...item, matchScore });
      }
    });

    spots.forEach(item => {
      const searchable = `${item.name} ${item.type} ${item.district} ${(item.categories || []).join(' ')}`.toLowerCase();
      const matchScore = queryWords.filter(word => searchable.includes(word)).length;
      if (matchScore === queryWords.length) {
        results.push({ type: 'spot', name: item.name, district: item.district, categories: item.categories || [], matchScore, spotData: item });
      }
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    if (results.length === 0) {
      const _noRes = window.i18n ? window.i18n.t('search.noResults') : 'No results for';
      const _noResSub = window.i18n ? window.i18n.t('search.noResultsSub') : 'Try a different search term';
      searchResults.innerHTML = `<div class="search-no-results"><p>${_noRes} &ldquo;${escapeHtml(query)}&rdquo;</p><span>${_noResSub}</span></div>`;
      return;
    }

    let html = '';
    const mustEatsResults = results.filter(r => r.type === 'must-eat');
    const newsResults_arr = results.filter(r => r.type === 'news');
    const spotResults = results.filter(r => r.type === 'spot');

    if (mustEatsResults.length > 0) {
      html += '<div class="search-section-title">Must Eats</div>';
      mustEatsResults.slice(0, 5).forEach(item => {
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
      html += '<div class="search-section-title">News</div>';
      newsResults_arr.slice(0, 3).forEach(item => {
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
      html += '<div class="search-section-title">Restaurants</div>';
      spotResults.slice(0, 5).forEach(item => {
        html += `
          <div class="search-result-item" data-type="spot" data-name="${escapeHtml(item.name)}">
            <div class="search-result-content">
              <div class="search-result-dish">${escapeHtml(item.name)}</div>
              <div class="search-result-restaurant">${escapeHtml(item.district)} · ${(item.categories || []).map(c => escapeHtml(c)).join(', ')}</div>
            </div>
            <span class="search-result-type">Map</span>
          </div>
        `;
      });
    }

    searchResults.innerHTML = html;

    searchResults.querySelectorAll('.search-result-item').forEach(item => {
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
                c => c.dataset.dish === dish && c.dataset.restaurant === restaurant
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
              const article = Array.from(document.querySelectorAll('.news-featured, .news-card')).find(
                a => a.dataset.title === title
              );
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
              const spot = spots.find(s => s.name === spotName);
              if (spot && typeof window._showSpotDetail === 'function') window._showSpotDetail(spot);
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
      }, 200);
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
    if (window.innerWidth > 767) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }, { passive: true });
    }
  }
  updateNavbar();

  // --- Anchor links for non-app navigation (desktop) ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      
      const targetPage = anchor.closest('.app-page');
      if (targetPage) return;
      
      if (window.innerWidth > 767) {
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

  let activeCard = null, activePortal = null;

  function collapseCard() {
    if (!activeCard || !activePortal) return;
    const card = activeCard, portal = activePortal;
    portal.style.transition = 'transform 0.42s cubic-bezier(0.32, 0, 0.67, 0), box-shadow 0.42s ease';
    portal.style.transform = 'translate(0,0) scale(1)';
    portal.style.boxShadow = 'none';
    eatBackdrop.classList.remove('active');
    activeCard = null; activePortal = null;
    setTimeout(() => {
      const scene = portal.querySelector('.eat-card-scene');
      if (scene) card.appendChild(scene);
      card.style.opacity = ''; card.style.visibility = '';
      portal.remove();
    }, 430);
  }

  eatBackdrop.addEventListener('click', collapseCard);
  eatBackdrop.addEventListener('touchend', e => { e.preventDefault(); collapseCard(); }, { passive: false });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') collapseCard(); });

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
    card.style.opacity = '0'; card.style.visibility = 'hidden';
    activeCard = card; activePortal = port;

    port.offsetHeight;
    port.style.transition = 'transform 0.48s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.48s ease';
    port.style.transform = `translate(${dx}px,${dy}px) scale(${scale})`;
    port.style.boxShadow = '0 32px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)';
    eatBackdrop.classList.add('active');

    port.addEventListener('click', pe => {
      if (pe.target.closest('a')) return;
      pe.stopPropagation();
      collapseCard();
    });
    port.addEventListener('touchend', pe => {
      if (pe.target.closest('a')) return;
      pe.preventDefault();
      pe.stopPropagation();
      collapseCard();
    }, { passive: false });
  }

  eatCards.forEach(card => {
    let touchStartX = 0, touchStartY = 0, touchMoved = false;
    card.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      if (Math.abs(e.touches[0].clientX - touchStartX) > 8 ||
          Math.abs(e.touches[0].clientY - touchStartY) > 8) {
        touchMoved = true;
      }
    }, { passive: true });
    card.addEventListener('touchend', e => {
      if (touchMoved) return;
      if (e.target.closest('a')) return;
      e.preventDefault();
      if (activeCard) { collapseCard(); return; }
      expandCard(card);
    }, { passive: false });

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (activeCard && activeCard !== card) { collapseCard(); return; }
      if (activeCard) { collapseCard(); return; }
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

  // ─── CMS Bootstrap (inside DOMContentLoaded so spots is in scope) ─────────
  const cmsReady = (async () => {
    if (!window.CMS) return;

    // Must-Eat cards
    try {
      const cards = await window.CMS.fetchMustEats();
      const grid = document.getElementById('mustEatsGrid');
      if (grid && cards && cards.length) {
        const fragment = document.createDocumentFragment();
        cards.forEach(c => {
          const wrapper = document.createElement('div');
          wrapper.className = 'must-card eat-card';
          wrapper.dataset.dish       = c.dish       || '';
          wrapper.dataset.restaurant = c.restaurant || '';
          wrapper.dataset.district   = c.district   || '';
          wrapper.dataset.price      = c.price      || '';
          wrapper.dataset.img        = c.imageUrl   || '';

          const img = document.createElement('img');
          img.src       = c.imageUrl || '';
          img.alt       = c.dish     || '';
          img.className  = 'must-card-img';
          img.loading    = 'lazy';
          img.decoding   = 'async';

          wrapper.appendChild(img);
          fragment.appendChild(wrapper);
        });
        grid.appendChild(fragment);
      }
    } catch (e) {
      console.warn('[CMS] Must-Eats fetch failed:', e.message);
    }

    // Restaurants
    try {
      const restaurants = await window.CMS.fetchRestaurants();
      if (restaurants && restaurants.length) {
        spots = restaurants.map(r => ({
          ...r,
          type: (r.categories || []).join(' · '),
        }));
      }
    } catch (e) {
      console.warn('[CMS] Restaurants fetch failed:', e.message);
    }

    // Bind must-card lightbox handlers now that cards are in the DOM
    bindMustCards();
  })();
  // ─────────────────────────────────────────────────────────────────────────

  let globeShown = false;

  function showGlobeIntro(onComplete) {
    if (typeof THREE === 'undefined' || globeShown) { onComplete(); return; }
    globeShown = true;

    const mapEl = document.getElementById('foodMap');
    if (!mapEl) { onComplete(); return; }

    const w = window.innerWidth || 390;
    const h = window.innerHeight || 520;

    // Overlay — space background
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:500;background:#000000;overflow:hidden;cursor:pointer';

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
      { top:'8%',  left:'82%', w:'130px', h:'2px',   delay:'0.8s', dur:'7s',  anim:'globeMeteor1' },
      { top:'22%', left:'90%', w:'85px',  h:'1.5px', delay:'4s',   dur:'9s',  anim:'globeMeteor2' },
      { top:'58%', left:'76%', w:'65px',  h:'1.5px', delay:'2.5s', dur:'11s', anim:'globeMeteor3' },
    ].forEach(m => {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:${m.top};left:${m.left};width:${m.w};height:${m.h};border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,0.95),rgba(255,255,255,0));opacity:0;pointer-events:none;animation:${m.anim} ${m.dur} linear ${m.delay} infinite;`;
      overlay.appendChild(el);
    });

    const logoImg = document.createElement('img');
    logoImg.src = 'pics/logo.webp';
    logoImg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(60vw,280px);height:auto;pointer-events:none;z-index:501;opacity:0;transition:opacity 0.8s ease 0.3s;';
    overlay.appendChild(logoImg);

    const logoText = document.createElement('div');
    logoText.textContent = "Press Start";
    const mobileOffset = window.innerWidth <= 768 ? '90px' : '100px';
logoText.style.cssText = `position:absolute;top:calc(50% + min(30vw,140px) - ${mobileOffset});left:50%;transform:translateX(-50%);color:#fff;font-family:Inter,system-ui,sans-serif;font-size:clamp(18px,4.5vw,24px);font-weight:700;letter-spacing:0.5px;pointer-events:none;z-index:501;opacity:0;transition:opacity 0.8s ease 0.3s;white-space:nowrap;`;
    overlay.appendChild(logoText);
    setTimeout(() => { logoImg.style.opacity = '1'; logoText.style.opacity = '1'; }, 100);


    // Hide location button, zoom control and filters during globe; expand foodMap to full screen
    mapEl.classList.add('globe-active');
    mapEl.style.cssText = 'position:fixed;inset:0;z-index:9990;width:100%!important;height:100%!important;min-height:0!important';
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
    const globeEndZ   = aspect >= 1 ? 2.5 : 2.5;

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
      starPos[i]   = r * Math.sin(phi) * Math.cos(theta);
      starPos[i+1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22 })));

    // Subtle lighting — no harsh highlights, just enough for depth
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0e0, 0.8);
    sun.position.set(5, 2, 4);
    scene.add(sun);

    // Load NASA Blue Marble satellite texture
    new THREE.TextureLoader().load(
      'pics/globe.webp',
      tex => { globeMat.map = tex; globeMat.color.set(0xffffff); globeMat.needsUpdate = true; }
    );

    let phase = 'idle';
    let phaseStart = null;
    let rotY = 0;
    let animFrame;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
    function easeOut5(t) { return 1 - Math.pow(1 - t, 5); }
    function shortestDelta(from, to) {
      let d = ((to - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      if (d > Math.PI) d -= 2 * Math.PI;
      return d;
    }

    let alignStartY, alignTargetY, alignStartX, userLat, userLng;

    function startZoom() {
      if (phase !== 'idle') return;
      phase = 'zoom';
      phaseStart = Date.now();

      const targetLng = (userLng !== undefined ? userLng : 13.4) * Math.PI / 180;
      const targetLat = (userLat !== undefined ? userLat : 52.5) * Math.PI / 180;

      alignStartY = rotY;
      // Three.js SphereGeometry UV offset: front at rotY=0 shows lng -90°W.
      // To show longitude L: rotY = -(π/2 + L_rad)
      alignTargetY = rotY + shortestDelta(rotY, -(Math.PI / 2 + targetLng));
      alignStartX = globe.rotation.x;
      // Positive rotX tilts north pole toward camera → shows northern latitudes
      globe._targetX = targetLat;

      cmsReady.then(() => { setTimeout(() => { if (typeof initFoodMap === 'function') initFoodMap(); }, 50); });
    }

    overlay.addEventListener('click', startZoom);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && phase === 'idle') startZoom();
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { userLat = pos.coords.latitude; userLng = pos.coords.longitude; },
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
        if (p >= 1) { phase = 'fade'; phaseStart = Date.now(); }
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

    try {
      foodMap = L.map('foodMap', {
        zoomControl: false,
        attributionControl: false,
      }).setView([52.5050, 13.4100], 11);
    } catch (e) {
      showNotification(window.i18n ? window.i18n.t('map.errorMapLoad') : 'Could not load map');
      return;
    }
    mapInitialized = true;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(foodMap);

    document.getElementById('mapZoomIn').addEventListener('click', () => foodMap.zoomIn());
    document.getElementById('mapZoomOut').addEventListener('click', () => foodMap.zoomOut());

    // User location
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-location-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // Try to get user location
    const defaultCenter = [52.52, 13.405];
    let locationFound = false;
    let userMarker = null;
    
    function setDefaultView() {
      if (!locationFound) {
        foodMap.setView(defaultCenter, 13);
      }
    }
    
    // Set default view after 3 seconds as fallback
    setTimeout(setDefaultView, 3000);
    
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            locationFound = true;
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Check if location is in Berlin area (rough check)
            if (userLat > 52.3 && userLat < 52.7 && userLng > 13.1 && userLng < 13.8) {
              userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(foodMap);
              foodMap.setView([userLat, userLng], 13, { animate: true });
              showNearbyStrip(userLat, userLng);
            } else {
              // User is outside Berlin, show Berlin anyway
              setDefaultView();
            }
          },
          () => {
            setDefaultView();
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        setDefaultView();
      }
    } catch (e) {
      setDefaultView();
    }

    const logoIcon = L.icon({
      iconUrl: 'pics/eat.png',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20]
    });

    const markers = [];
    window._mapMarkers = markers;
    const mapSpotOverlay = document.getElementById('mapSpotOverlay');
    const mapSpotContent = document.getElementById('mapSpotContent');
    const mapSpotClose = document.getElementById('mapSpotClose');

    function getSpotPhoto(type) {
      return 'pics/eat.png';
    }

    function getSpotCategory(type) {
      const t = type.toLowerCase();
      // Dessert
      if (t.includes('dessert') || t.includes('ice cream') || t.includes('donuts')) return 'dessert';
      // Cafe
      if (t.includes('cafe') || t.includes('café') || t.includes('coffee') || t.includes('kaffee') || t.includes('tee') || t.includes('luncheonette')) return 'cafe';
      // Fast Food
      if (t.includes('burger') || t.includes('fast food')) return 'fast-food';
      // Breakfast
      if (t.includes('bakery') || t.includes('bäckerei') || t.includes('brunch') || t.includes('breakfast') || t.includes('patisserie')) return 'breakfast';
      // Fine Dining
      if (t.includes('fine dining') || t.includes('gastropub')) return 'fine-dining';
      // Lunch - Pizza, Pasta, Japanese, Asian
      if (t.includes('pizza') || t.includes('pasta') || t.includes('japanese') || t.includes('ramen') || t.includes('udon') || t.includes('sushi') || t.includes('izakaya') || t.includes('chinese') || t.includes('sichuan') || t.includes('thai') || t.includes('noodles') || t.includes('indian') || t.includes('korean') || t.includes('vietnamese')) return 'lunch';
      // Dinner - Wine, Bars, European, Mediterranean, etc.
      if (t.includes('wine') || t.includes('wein') || t.includes('bar') || t.includes('french') || t.includes('german') || t.includes('european') || t.includes('austrian') || t.includes('swiss') || t.includes('brasserie') || t.includes('bistro') || t.includes('seafood') || t.includes('italian') || t.includes('israeli') || t.includes('middle eastern') || t.includes('mediterranean') || t.includes('greek') || t.includes('african')) return 'dinner';
      return null;
    }

    function showSpotDetail(spot) {
      if (foodMap) {
        foodMap.flyTo([spot.lat, spot.lng], 15, { animate: true, duration: 1 });
      }

      const mapsUrl = spot.mapsUrl || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.name + ', ' + spot.address));
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
      btn.textContent = 'Open in Maps';
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

      body.appendChild(metaRow);
      body.appendChild(name);
      body.appendChild(addressEl);
      body.appendChild(btnRow);

      mapSpotContent.appendChild(imgWrap);
      mapSpotContent.appendChild(body);

      mapSpotOverlay.classList.add('active');
      bodyOverflow.lock();
    }
    window._showSpotDetail = showSpotDetail;

    function haversineDistance(lat1, lng1, lat2, lng2) {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ---- Bottom Sheet: Nearby ----
    let _nearbyLat = null, _nearbyLng = null;
    let _sheetState = 'hidden'; // 'hidden' | 'peek' | 'mid' | 'expanded'
    let _sheetReady = false;

    const PEEK_PX = 56;   // handle (28) + label row (28)
    const MID_PX  = 210;  // header + ~1 card row

    function _renderNearbyGrid() {
      const gridEl = document.getElementById('mapNearbyGrid');
      if (!gridEl || _nearbyLat === null) return;

      const activeFilter = document.querySelector('.map-filter-tab.active')?.dataset.filter || 'all';

      const sorted = spots
        .map(s => ({ ...s, dist: haversineDistance(_nearbyLat, _nearbyLng, s.lat, s.lng) }))
        .filter(s => activeFilter === 'all' || (s.categories || []).includes(activeFilter))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 6);

      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);

      sorted.forEach(spot => {
        const distM = Math.round(spot.dist);
        const distLabel = distM < 1000 ? distM + 'm' : (spot.dist / 1000).toFixed(1) + 'km';
        const photo = spot.photo || getSpotPhoto(spot.type);

        const card = document.createElement('div');
        card.className = 'map-nearby-grid-card';

        const img = document.createElement('img');
        img.className = 'map-nearby-grid-card-img';
        img.src = photo;
        img.alt = spot.name;
        img.loading = 'lazy';

        const body = document.createElement('div');
        body.className = 'map-nearby-grid-card-body';

        const dist = document.createElement('span');
        dist.className = 'map-nearby-grid-card-dist';
        dist.textContent = distLabel;

        const name = document.createElement('div');
        name.className = 'map-nearby-grid-card-name';
        name.textContent = spot.name;

        const meta = document.createElement('div');
        meta.className = 'map-nearby-grid-card-meta';
        meta.textContent = spot.type + (spot.price ? ' · ' + spot.price : '');

        body.appendChild(dist);
        body.appendChild(name);
        body.appendChild(meta);
        card.appendChild(img);
        card.appendChild(body);

        card.addEventListener('click', () => showSpotDetail(spot));
        gridEl.appendChild(card);
      });
    }

    function _snapSheet(state, animate = true) {
      const sheet = document.getElementById('mapNearby');
      if (!sheet) return;
      _sheetState = state;
      const h = sheet.offsetHeight;
      const y = state === 'peek' ? h - PEEK_PX
              : state === 'mid'  ? h - MID_PX
              : state === 'expanded' ? 0
              : h; // hidden
      sheet.style.transition = animate
        ? 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
        : 'none';
      sheet.style.transform = `translateY(${Math.max(0, y)}px)`;

      // Keep zoom buttons above visible sheet edge
      const zoomBtns = document.querySelector('.map-zoom-btns');
      if (zoomBtns) {
        const visible = state === 'peek' ? PEEK_PX : state === 'mid' ? MID_PX : state === 'expanded' ? h : 0;
        zoomBtns.style.bottom = (visible + 12) + 'px';
      }
    }

    function _initSheetDrag() {
      const sheet  = document.getElementById('mapNearby');
      const handle = document.getElementById('mapNearbyHandle');
      if (!sheet || !handle) return;

      let startY = 0, startTranslate = 0, lastY = 0, lastT = 0, vel = 0, dragging = false;

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
        const now = Date.now(), dt = now - lastT;
        if (dt > 0) vel = (clientY - lastY) / dt;
        lastY = clientY; lastT = now;
      }

      function dragEnd() {
        if (!dragging) return;
        dragging = false;
        const curY = new DOMMatrix(getComputedStyle(sheet).transform).m42;
        const h = sheet.offsetHeight;

        let next;
        if (vel > 0.5) {
          // fast swipe down → go to next lower state
          next = _sheetState === 'expanded' ? 'mid' : 'peek';
        } else if (vel < -0.5) {
          // fast swipe up → go to next higher state
          next = _sheetState === 'peek' ? 'mid' : 'expanded';
        } else {
          // snap to nearest snap point
          const pts = { peek: h - PEEK_PX, mid: h - MID_PX, expanded: 0 };
          const nearest = Object.entries(pts).sort((a, b) => Math.abs(curY - a[1]) - Math.abs(curY - b[1]))[0][0];
          next = nearest;
        }
        _snapSheet(next);
      }

      // Touch events
      handle.addEventListener('touchstart', e => dragStart(e.touches[0].clientY), { passive: true });
      handle.addEventListener('touchmove', e => dragMove(e.touches[0].clientY), { passive: true });
      handle.addEventListener('touchend', dragEnd);

      // Mouse events (desktop)
      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        dragStart(e.clientY);
      });
      document.addEventListener('mousemove', e => { if (dragging) dragMove(e.clientY); });
      document.addEventListener('mouseup', dragEnd);
    }

    function showNearbyStrip(lat, lng) {
      _nearbyLat = lat;
      _nearbyLng = lng;
      _renderNearbyGrid();

      if (!_sheetReady) {
        _sheetReady = true;
        // Remove CSS transform so inline style takes full control
        const sheet = document.getElementById('mapNearby');
        if (sheet) sheet.style.transform = `translateY(${sheet.scrollHeight}px)`;
        _initSheetDrag();
      }
      // Double rAF: first frame lets grid paint, second measures correct height
      requestAnimationFrame(() => requestAnimationFrame(() => _snapSheet('mid')));
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

    spots.forEach((spot, i) => {
      const marker = L.marker([spot.lat, spot.lng], { icon: logoIcon }).addTo(foodMap);
      marker.spotType = spot.type;
      marker.spotDistrict = spot.district;
      marker.spotData = spot;
      marker.spotCategories = spot.categories || [];
      marker.on('click', () => {
        showSpotDetail(spot);
      });
      markers.push(marker);
    });
    
    // Close spot detail when clicking on map background
    const mapContainer = document.getElementById('foodMap');
    if (mapContainer) {
      mapContainer.addEventListener('click', (e) => {
        if (e.target === mapContainer || e.target.classList.contains('leaflet-pane') || e.target.classList.contains('leaflet-map-pane')) {
          hideSpotDetail();
        }
      });
    }

    // Filter dropdown — populate counts
    const filterCategories = ['Dinner', 'Lunch', 'Coffee', 'Breakfast', 'Sweets', 'Pizza'];
    const countAll = document.getElementById('count-all');
    if (countAll) countAll.textContent = spots.length;
    filterCategories.forEach(cat => {
      const countId = 'count-' + cat.toLowerCase().replace(/\s+/g, '-');
      const el = document.getElementById(countId);
      if (el) {
        el.textContent = spots.filter(s => s.categories && s.categories.includes(cat)).length;
      }
    });
    // Set "All" count
    const countAllEl = document.getElementById('count-all');
    if (countAllEl) countAllEl.textContent = spots.length;

    // Filter tab selection
    const filterTabs = document.querySelectorAll('.map-filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter;

        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        markers.forEach(marker => {
          const cats = marker.spotCategories || [];
          const show = filter === 'all' || cats.includes(filter);
          if (show) {
            if (!foodMap.hasLayer(marker)) marker.addTo(foodMap);
          } else {
            foodMap.removeLayer(marker);
          }
        });

        // Re-render nearby grid to respect new filter
        if (_nearbyLat !== null) _renderNearbyGrid();
      });
    });

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
            
            foodMap.setView([userLat, userLng], 14, { animate: true });
            showNearbyStrip(userLat, userLng);
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
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    setTimeout(() => foodMap.invalidateSize(), 100);
  }

  // --- News Article Modal ---
  const newsModal = document.getElementById('newsModal');
  const newsModalClose = document.getElementById('newsModalClose');
  const newsArticles = document.querySelectorAll('.news-featured, .news-card');
  let currentShareData = { title: '', text: '', url: window.location.href };

  function portableTextToHtml(blocks) {
    if (!Array.isArray(blocks)) return String(blocks || '');
    const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return blocks.map(block => {
      if (block._type !== 'block' || !block.children) return '';
      const inner = block.children.map(span => {
        let text = esc(span.text || '');
        const marks = span.marks || [];
        if (marks.includes('strong'))    text = `<strong>${text}</strong>`;
        if (marks.includes('em'))        text = `<em>${text}</em>`;
        if (marks.includes('underline')) text = `<u>${text}</u>`;
        return text;
      }).join('');
      switch (block.style) {
        case 'h2':         return `<h2>${inner}</h2>`;
        case 'h3':         return `<h3>${inner}</h3>`;
        case 'blockquote': return `<blockquote>${inner}</blockquote>`;
        default:           return `<p>${inner}</p>`;
      }
    }).join('');
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
      // Portable Text array from new rich-text field
      contentHtml = portableTextToHtml(parsed);
    } catch (_) {
      // Legacy plain-text content (may already contain HTML tags from import)
      contentHtml = rawContent.includes('<') ? rawContent
        : rawContent.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
    }

    document.getElementById('newsModalImg').src = img;
    document.getElementById('newsModalImg').alt = title;
    document.getElementById('newsModalCategory').textContent = category;
    document.getElementById('newsModalTitle').textContent = title;
    document.getElementById('newsModalDate').textContent = date;
    document.getElementById('newsModalContent').innerHTML = contentHtml;

    currentShareData = {
      title: title,
      text: article.dataset.excerpt || title,
      url: window.location.href
    };

    newsModal.classList.add('active');
    bodyOverflow.lock();

    const modalInner = newsModal.querySelector('.news-modal');
    if (modalInner) modalInner.scrollTop = 0;
  }

  function closeNewsModal() {
    newsModal.classList.remove('active');
    bodyOverflow.unlock();
  }

  function bindNewsCards() {
    document.querySelectorAll('.news-card').forEach(card => {
      const link = card.querySelector('a');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          openNewsModal(card);
        });
      }
    });
  }
  bindNewsCards();
  window._bindNewsCards = bindNewsCards;

  if (newsModalClose) {
    newsModalClose.addEventListener('click', closeNewsModal);
  }

  if (newsModal) {
    newsModal.addEventListener('click', (e) => {
      if (e.target === newsModal) closeNewsModal();
    });
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
        } catch (err) {
          // User cancelled or error
        }
      } else {
        navigator.clipboard.writeText(currentShareData.url);
      }
    });
  }

  // --- Lazy Script Loader ---
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // --- App Page Navigation ---
  let isMobile = window.innerWidth <= 767;
  const appFooter = document.getElementById('appFooter');
  const appPages = document.querySelectorAll('.app-page');
  const navbarBrand = document.querySelector('.navbar-brand');

  let currentPage = 'start';

  function navigateToPage(pageName) {
    if (pageName === currentPage) return;

    // Clear start-page intervals when leaving
    if (currentPage === 'start' && pageName !== 'start') {
      if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
      altImgIntervals.forEach(id => clearInterval(id));
      altImgIntervals = [];
    }

    // Restart hero slider when returning to start
    if (pageName === 'start' && heroSlides.length > 0 && !heroInterval) {
      heroInterval = setInterval(nextSlide, slideInterval);
    }
    
    const targetPage = document.querySelector(`.app-page[data-page="${pageName}"]`);
    if (!targetPage) return;
    
    appPages.forEach(page => {
      if (page.dataset.page === pageName) {
        page.classList.add('active');
        page.classList.remove('hidden');
        
        // Globe intro → then init map (lazy-load Leaflet + Three.js on first visit)
        if (pageName === 'map') {
          Promise.all([
            loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'),
          ]).then(() => {
            showGlobeIntro(() => {
              cmsReady.then(() => { if (typeof initFoodMap === 'function') initFoodMap(); });
              if (foodMap) {
                foodMap.invalidateSize();
                setTimeout(() => { if (foodMap) foodMap.invalidateSize(); }, 300);
              }
            });
          }).catch(() => {
            // Fallback: try map without globe
            cmsReady.then(() => { if (typeof initFoodMap === 'function') initFoodMap(); });
          });
        }
      } else {
        page.classList.remove('active');
        page.classList.add('hidden');
      }
    });

    const appFooterItems = document.querySelectorAll('.app-footer-item');
    appFooterItems.forEach(item => {
      item.classList.toggle('active', item.dataset.target === pageName);
    });

    currentPage = pageName;
  }

  if (appFooter && appPages.length) {
    const appFooterItems = document.querySelectorAll('.app-footer-item[data-target]');

    appFooterItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        window.closeLoginModal?.();
        const target = item.dataset.target;
        navigateToPage(target);
        window.location.hash = target;
      });
    });

    if (navbarBrand) {
      navbarBrand.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('start');
        window.location.hash = 'start';
      });
    }

    function checkHash() {
      const hash = window.location.hash.replace('#', '') || 'start';
      const validPages = ['start', 'news', 'musts', 'map'];
      if (validPages.includes(hash)) {
        navigateToPage(hash);
      }
    }

    window.addEventListener('hashchange', checkHash);
    checkHash();

    let resizeTimer;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isMobile = window.innerWidth <= 767;
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
    function open() { modalEl.classList.add('active'); bodyOverflow.lock(); }
    function close() { modalEl.classList.remove('active'); bodyOverflow.unlock(); }
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
  function openBurger() { burger.open(); }
  function closeBurger() { burger.close(); }

  // Cookie Info Modal
  const cookieInfoModalEl = document.getElementById('cookieInfoModal');
  const cookieInfoModal = createModal(cookieInfoModalEl, {
    trigger: document.getElementById('cookieInfoTrigger'),
    closeBtn: document.getElementById('cookieInfoClose'),
    backdrop: document.getElementById('cookieInfoBackdrop'),
  });
  function closeCookieInfoModal() { cookieInfoModal.close(); }

  // AGB Modal
  const agbModal = createModal(document.getElementById('agbModal'), {
    trigger: document.getElementById('agbTrigger'),
    closeBtn: document.getElementById('agbClose'),
    backdrop: document.getElementById('agbBackdrop'),
  });
  const agbFromBurger = document.getElementById('openAgbFromBurger');
  if (agbFromBurger) agbFromBurger.addEventListener('click', () => { closeBurger(); agbModal.open(); });

  // Datenschutz Modal
  const datenschutzModal = createModal(document.getElementById('datenschutzModal'), {
    trigger: document.getElementById('datenschutzTrigger'),
    closeBtn: document.getElementById('datenschutzClose'),
    backdrop: document.getElementById('datenschutzBackdrop'),
  });
  const datenschutzFromBurger = document.getElementById('openDatenschutzFromBurger');
  if (datenschutzFromBurger) datenschutzFromBurger.addEventListener('click', () => { closeBurger(); datenschutzModal.open(); });

  // Info modals (about, contact, press, impressum) — opened from burger
  ['about', 'contact', 'press', 'impressum'].forEach(id => {
    const cap = id.charAt(0).toUpperCase() + id.slice(1);
    const m = createModal(document.getElementById(id + 'Modal'), {
      closeBtn: document.getElementById(id + 'Close'),
      backdrop: document.getElementById(id + 'Backdrop'),
    });
    const trigger = document.getElementById('open' + cap);
    if (trigger) trigger.addEventListener('click', () => { closeBurger(); m.open(); });
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
    const targetW = Math.min(window.innerWidth * 0.90, window.innerHeight * 0.90 * cardRatio);
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
    mustLightboxInner.offsetHeight; // eslint-disable-line no-unused-expressions

    mustLightboxInner.style.transition = 'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease';
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
      const targetW = Math.min(window.innerWidth * 0.90, window.innerHeight * 0.90 * cardRatio);
      const endX = rect.left + rect.width / 2 - window.innerWidth / 2;
      const endY = rect.top + rect.height / 2 - window.innerHeight / 2;
      const endScale = rect.width / targetW;

      // Reflow to commit current state before starting close transition
      mustLightboxInner.offsetHeight; // eslint-disable-line no-unused-expressions

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
    document.querySelectorAll('.must-card').forEach(card => {
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

      let touchStartX = 0, touchStartY = 0, touchMoved = false;
      card.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
      }, { passive: true });
      card.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) touchMoved = true;
      }, { passive: true });
      card.addEventListener('touchend', e => {
        if (touchMoved) return;
        e.preventDefault();
        const img = card.querySelector('.must-card-img');
        openMustCard(card, img.src, img.alt);
      }, { passive: false });
      card.addEventListener('click', () => {
        const img = card.querySelector('.must-card-img');
        openMustCard(card, img.src, img.alt);
      });
    });
  }

  mustLightbox.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); closeMustCard(); }, { passive: false });
  mustLightbox.addEventListener('click', e => { e.stopPropagation(); closeMustCard(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMustCard();
  });

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
      closeCookieSettings();
    });
  }
  
  if (cookieDecline) {
    cookieDecline.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'declined');
      closeCookieSettings();
    });
  }

});

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
  const slideInterval = 800;
  let altImgIntervals = [];

  function nextSlide() {
    if (!heroSlides.length) return;
    heroSlides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % heroSlides.length;
    heroSlides[currentSlide].classList.add('active');
  }

  if (heroSlides.length > 0) {
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') collapseCard(); });

  eatCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (activeCard && activeCard !== card) { collapseCard(); return; }
      if (activeCard) { collapseCard(); return; }

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

  const spots = [
    { name: 'aerde restaurant', district: 'Kreuzberg', type: 'Dinner', address: 'Am Lokdepot 6, 10965 Berlin', lat: 52.487, lng: 13.3736, categories: ['Dinner'], price: '€€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=aerde%20restaurant%2C%20Am%20Lokdepot%206%2C%2010965%20Berlin', website: 'https://www.aerde.de' },
    { name: 'AKKURAT Café', district: 'Kreuzberg', type: 'Coffee · Breakfast', address: 'Besselstraße 13, 10969 Berlin', lat: 52.5048, lng: 13.394, categories: ['Coffee', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=AKKURAT%20Caf%C3%A9%2C%20Besselstra%C3%9Fe%2013%2C%2010969%20Berlin', website: 'https://akkurat.cafe' },
    { name: 'Albatross Bäckerei', district: 'Kreuzberg', type: 'Sweets · Breakfast', address: 'Graefestrasse 66/67, 10967 Berlin', lat: 52.4913, lng: 13.4166, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Albatross%20B%C3%A4ckerei%2C%20Graefestrasse%2066/67%2C%2010967%20Berlin', website: 'https://albatrossberlin.com' },
    { name: 'Alt Berliner Wirtshaus Henne', district: 'Kreuzberg', type: 'Dinner', address: 'Leuschnerdamm 25, 10999 Berlin', lat: 52.4989, lng: 13.4228, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Alt%20Berliner%20Wirtshaus%20Henne%2C%20Leuschnerdamm%2025%2C%2010999%20Berlin', website: 'https://henne-berlin.de' },
    { name: 'Anima', district: 'Friedrichshain', type: 'Dinner · Coffee', address: 'Mühlenstraße 61-63, 10243 Berlin', lat: 52.5056, lng: 13.4381, categories: ['Dinner', 'Coffee'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Anima%2C%20M%C3%BChlenstra%C3%9Fe%2061-63%2C%2010243%20Berlin', website: '' },
    { name: "Ari's", district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Glogauer Str. 2, 10999 Berlin', lat: 52.4970, lng: 13.4225, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ari%E2%80%99s%2C%20Glogauer%20Str.%202%2C%2010999%20Berlin', website: '' },
    { name: 'Atelier Dough', district: 'Kreuzberg', type: 'Sweets', address: 'Glogauer Str. 9, 10999 Berlin', lat: 52.4932, lng: 13.437, categories: ['Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Atelier%20Dough%2C%20Glogauer%20Str.%209%2C%2010999%20Berlin', website: 'https://www.atelierdough.com' },
    { name: 'AVIV 030', district: 'Neukölln', type: 'Lunch · Dinner', address: 'Richardstr. 76, 12043 Berlin', lat: 52.4749, lng: 13.4448, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=AVIV%20030%2C%20Richardstr.%2076%2C%2012043%20Berlin', website: 'https://aviv030.com' },
    { name: 'Babka & Krantz', district: 'Steglitz', type: 'Sweets · Breakfast', address: 'Hackerstraße 1, 12161 Berlin', lat: 52.4671, lng: 13.3253, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Babka%20%26%20Krantz%2C%20Hackerstra%C3%9Fe%201%2C%2012161%20Berlin', website: '' },
    { name: 'Bæst', district: 'Mitte', type: 'Dinner', address: 'Karl-Liebknecht-Str. 29, 10178 Berlin', lat: 52.5215, lng: 13.4085, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=B%C3%A6st%2C%20Karl-Liebknecht-Str.%2029%2C%2010178%20Berlin', website: 'https://beast-berlin.com' },
    { name: 'Bar Basta', district: 'Mitte', type: 'Breakfast · Dinner', address: 'Rosenthaler Str. 53, 10178 Berlin', lat: 52.5255, lng: 13.4030, categories: ['Breakfast', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bar%20Basta%2C%20Rosenthaler%20Str.%2053%2C%2010178%20Berlin', website: '' },
    { name: 'Barra', district: 'Neukölln', type: 'Dinner', address: 'Okerstraße 2, 12049 Berlin', lat: 52.4743, lng: 13.427, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Barra%2C%20Okerstra%C3%9Fe%202%2C%2012049%20Berlin', website: 'https://www.barraberlin.com' },
    { name: 'Bergmanns', district: 'Kreuzberg', type: 'Dinner', address: 'Riemannstraße 13, 10961 Berlin', lat: 52.489, lng: 13.408, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bergmanns%2C%20Riemannstra%C3%9Fe%2013%2C%2010961%20Berlin', website: 'https://www.bergmanns.berlin' },
    { name: 'Berlin Burger International', district: 'Neukölln', type: 'Lunch · Dinner', address: 'Pannierstraße 5, 12047 Berlin', lat: 52.4799, lng: 13.4355, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Berlin%20Burger%20International%2C%20Pannierstra%C3%9Fe%205%2C%2012047%20Berlin', website: 'https://www.bbi-burger.com' },
    { name: 'Berta restaurant', district: 'Kreuzberg', type: 'Dinner · Lunch', address: 'Stresemannstraße 99, 10963 Berlin', lat: 52.5059, lng: 13.3802, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Berta%20restaurant%2C%20Stresemannstra%C3%9Fe%2099%2C%2010963%20Berlin', website: 'https://www.bertarestaurant.com' },
    { name: 'Bertie', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Eberswalder Str. 8, 10437 Berlin', lat: 52.542, lng: 13.409, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bertie%2C%20Eberswalder%20Str.%208%2C%2010437%20Berlin', website: '' },
    { name: 'Beuster', district: 'Neukölln', type: 'Dinner · Lunch', address: 'Weserstraße 32, 12045 Berlin', lat: 52.485, lng: 13.4356, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Beuster%2C%20Weserstra%C3%9Fe%2032%2C%2012045%20Berlin', website: 'https://beusterbar.com' },
    { name: 'Boii Boii', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Lausitzer Str. 25, 10999 Berlin', lat: 52.4975, lng: 13.4230, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Boii%20Boii%2C%20Lausitzer%20Str.%2025%2C%2010999%20Berlin', website: 'https://www.boiiboii.com' },
    { name: 'Bonanza Coffee Heroes', district: 'Prenzlauer Berg', type: 'Coffee', address: 'Oderberger Str. 35, 10435 Berlin', lat: 52.5399, lng: 13.4054, categories: ['Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bonanza%20Coffee%20Heroes%2C%20Oderberger%20Str.%2035%2C%2010435%20Berlin', website: 'https://bonanzacoffee.de' },
    { name: 'Borchardt', district: 'Mitte', type: 'Lunch · Dinner', address: 'Französische Str. 47, 10117 Berlin', lat: 52.515, lng: 13.3904, categories: ['Lunch', 'Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Borchardt%2C%20Franz%C3%B6sische%20Str.%2047%2C%2010117%20Berlin', website: 'https://www.borchardt-restaurant.de' },
    { name: 'Bottega Seppel', district: 'Charlottenburg', type: 'Dinner', address: 'Wielandstraße 38, 10629 Berlin', lat: 52.501, lng: 13.316, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bottega%20Seppel%2C%20Wielandstra%C3%9Fe%2038%2C%2010629%20Berlin', website: '' },
    { name: 'Boutique de LA MAISON', district: 'Kreuzberg', type: 'Sweets · Breakfast', address: 'Urbanstr. 70A, 10967 Berlin', lat: 52.4882, lng: 13.4231, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Boutique%20de%20LA%20MAISON%2C%20Urbanstr.%2070A%2C%2010967%20Berlin', website: '' },
    { name: 'Buya Ramen Factory', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Reichenberger Str. 36, 10999 Berlin', lat: 52.4970, lng: 13.4235, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Buya%20Ramen%20Factory%2C%20Reichenberger%20Str.%2036%2C%2010999%20Berlin', website: '' },
    { name: 'Caligari', district: 'Neukölln', type: 'Dinner', address: 'Kienitzer Str. 110, 12049 Berlin', lat: 52.477, lng: 13.426, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Caligari%2C%20Kienitzer%20Str.%20110%2C%2012049%20Berlin', website: '' },
    { name: 'Capvin Rosenhöfe', district: 'Mitte', type: 'Lunch · Dinner', address: 'Rosenthaler Str. 36, 10178 Berlin', lat: 52.5246, lng: 13.4029, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Capvin%20Rosenh%C3%B6fe%2C%20Rosenthaler%20Str.%2036%2C%2010178%20Berlin', website: '' },
    { name: 'Châlet Suisse', district: 'Dahlem', type: 'Dinner · Lunch', address: 'Clayallee 99, 14195 Berlin', lat: 52.4547, lng: 13.2728, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ch%C3%A2let%20Suisse%2C%20Clayallee%2099%2C%2014195%20Berlin', website: 'https://www.chalet-suisse.de' },
    { name: 'Chipperfield Kantine', district: 'Mitte', type: 'Lunch · Coffee', address: 'Joachimstr. 11, 10119 Berlin', lat: 52.5283, lng: 13.4008, categories: ['Lunch', 'Coffee'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Chipperfield%20Kantine%2C%20Joachimstr.%2011%2C%2010119%20Berlin', website: 'https://chipperfield-kantine.de' },
    { name: 'Chungking Noodles', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Reichenberger Str. 35, 10999 Berlin', lat: 52.4973, lng: 13.4233, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Chungking%20Noodles%2C%20Reichenberger%20Str.%2035%2C%2010999%20Berlin', website: '' },
    { name: 'Clärchens Ballhaus', district: 'Mitte', type: 'Dinner · Lunch', address: 'Auguststraße 24, 10117 Berlin', lat: 52.5266, lng: 13.3969, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cl%C3%A4rchens%20Ballhaus%2C%20Auguststra%C3%9Fe%2024%2C%2010117%20Berlin', website: 'https://www.claerchens-ballhaus.de' },
    { name: 'Cocolo Ramen Mitte', district: 'Mitte', type: 'Lunch · Dinner', address: 'Gipsstraße 3, 10119 Berlin', lat: 52.528, lng: 13.401, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cocolo%20Ramen%20Mitte%2C%20Gipsstra%C3%9Fe%203%2C%2010119%20Berlin', website: '' },
    { name: 'CODA Dessert Dining', district: 'Neukölln', type: 'Sweets · Dinner', address: 'Friedelstraße 47, 12047 Berlin', lat: 52.4847, lng: 13.4312, categories: ['Sweets', 'Dinner'], price: '€€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=CODA%20Dessert%20Dining%2C%20Friedelstra%C3%9Fe%2047%2C%2012047%20Berlin', website: 'https://coda-berlin.com' },
    { name: 'Common', district: 'Neukölln', type: 'Coffee · Breakfast', address: 'Karl-Marx-Straße 176, 12043 Berlin', lat: 52.4744, lng: 13.44, categories: ['Coffee', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Common%2C%20Karl-Marx-Stra%C3%9Fe%20176%2C%2012043%20Berlin', website: '' },
    { name: 'Companion Tee & Kaffee', district: 'Neukölln', type: 'Coffee', address: 'Weserstraße 166, 12045 Berlin', lat: 52.4834, lng: 13.4411, categories: ['Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Companion%20Tee%20%26%20Kaffee%2C%20Weserstra%C3%9Fe%20166%2C%2012045%20Berlin', website: '' },
    { name: 'Concierge Coffee', district: 'Kreuzberg', type: 'Coffee', address: 'Paul-Lincke-Ufer 39-40, 10999 Berlin', lat: 52.4961, lng: 13.4223, categories: ['Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Concierge%20Coffee%2C%20Paul-Lincke-Ufer%2039-40%2C%2010999%20Berlin', website: 'https://www.conciergecoffee.de' },
    { name: 'Crapulix', district: 'Steglitz', type: 'Sweets · Breakfast', address: 'Schildhornstraße 87, 12163 Berlin', lat: 52.4627, lng: 13.3204, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Crapulix%2C%20Schildhornstra%C3%9Fe%2087%2C%2012163%20Berlin', website: '' },
    { name: 'Diener Tattersall', district: 'Charlottenburg', type: 'Dinner', address: 'Grolmanstraße 47, 10623 Berlin', lat: 52.5047, lng: 13.324, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Diener%20Tattersall%2C%20Grolmanstra%C3%9Fe%2047%2C%2010623%20Berlin', website: 'https://www.diener-tattersall.de' },
    { name: 'DONGNAM Coffee Lab', district: 'Charlottenburg', type: 'Coffee · Sweets', address: 'Kurfürstendamm 105, 10711 Berlin', lat: 52.498, lng: 13.2947, categories: ['Coffee', 'Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=DONGNAM%20Coffee%20Lab%2C%20Kurf%C3%BCrstendamm%20105%2C%2010711%20Berlin', website: '' },
    { name: 'DoubleEye', district: 'Schöneberg', type: 'Coffee', address: 'Akazienstraße 22, 10823 Berlin', lat: 52.488, lng: 13.354, categories: ['Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=DoubleEye%2C%20Akazienstra%C3%9Fe%2022%2C%2010823%20Berlin', website: 'https://doubleeye.shop' },
    { name: 'Doyum Restaurant', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Admiralstraße 36, 10999 Berlin', lat: 52.4970, lng: 13.422, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Doyum%20Restaurant%2C%20Admiralstra%C3%9Fe%2036%2C%2010999%20Berlin', website: '' },
    { name: 'Engelsbecken', district: 'Charlottenburg', type: 'Dinner', address: 'Witzlebenstraße 31, 14057 Berlin', lat: 52.514, lng: 13.289, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Engelsbecken%2C%20Witzlebenstra%C3%9Fe%2031%2C%2014057%20Berlin', website: 'https://www.engelsbecken.de' },
    { name: 'Enoiteca Il Calice', district: 'Charlottenburg', type: 'Dinner · Lunch', address: 'Walter-Benjamin-Platz 4, 10629 Berlin', lat: 52.5019, lng: 13.3149, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Enoiteca%20Il%20Calice%2C%20Walter-Benjamin-Platz%204%2C%2010629%20Berlin', website: 'https://enoiteca-il-calice.de' },
    { name: 'Estelle', district: 'Prenzlauer Berg', type: 'Dinner · Lunch', address: 'Kopenhagener Str. 12A, 10437 Berlin', lat: 52.549, lng: 13.4097, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Estelle%2C%20Kopenhagener%20Str.%2012A%2C%2010437%20Berlin', website: 'https://estelle-berlin.com' },
    { name: 'Father Carpenter', district: 'Mitte', type: 'Breakfast · Coffee', address: 'Münzstr 21, 10178 Berlin', lat: 52.5248, lng: 13.4067, categories: ['Breakfast', 'Coffee'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Father%20Carpenter%2C%20M%C3%BCnzstr%2021%2C%2010178%20Berlin', website: 'https://www.fathercarpenter.com' },
    { name: 'File Asto', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Kollwitzstraße 26, 10405 Berlin', lat: 52.535, lng: 13.422, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=File%20Asto%2C%20Kollwitzstra%C3%9Fe%2026%2C%2010405%20Berlin', website: '' },
    { name: 'Five Elephant', district: 'Kreuzberg', type: 'Coffee · Sweets', address: 'Reichenberger Str. 101, 10999 Berlin', lat: 52.4965, lng: 13.424, categories: ['Coffee', 'Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Five%20Elephant%2C%20Reichenberger%20Str.%20101%2C%2010999%20Berlin', website: 'https://www.fiveelephant.com' },
    { name: 'Fourty Years Kitchen', district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Schliemannstraße 21, 10437 Berlin', lat: 52.543, lng: 13.418, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fourty%20Years%20Kitchen%2C%20Schliemannstra%C3%9Fe%2021%2C%2010437%20Berlin', website: '' },
    { name: 'Frau Mittenmang', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Rodenbergstr. 37, 10439 Berlin', lat: 52.5503, lng: 13.4193, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Frau%20Mittenmang%2C%20Rodenbergstr.%2037%2C%2010439%20Berlin', website: '' },
    { name: 'Freundschaft', district: 'Mitte', type: 'Dinner', address: 'Mittelstraße 1, 10117 Berlin', lat: 52.518, lng: 13.388, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Freundschaft%2C%20Mittelstra%C3%9Fe%201%2C%2010117%20Berlin', website: '' },
    { name: 'Frühstück 3000', district: 'Schöneberg', type: 'Breakfast · Lunch', address: 'Bülowstraße 101, 10783 Berlin', lat: 52.4992, lng: 13.3567, categories: ['Breakfast', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fr%C3%BChst%C3%BCck%203000%2C%20B%C3%BClowstra%C3%9Fe%20101%2C%2010783%20Berlin', website: 'https://fruehstueck3000.com' },
    { name: 'Fukagawa Ramen', district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Wörtherstr. 22, 10405 Berlin', lat: 52.5357, lng: 13.4212, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fukagawa%20Ramen%2C%20W%C3%B6rtherstr.%2022%2C%2010405%20Berlin', website: 'https://fukagawa.de' },
    { name: 'Gazzo', district: 'Neukölln', type: 'Lunch · Dinner', address: 'Hobrechtstrasse 57, 12047 Berlin', lat: 52.4911, lng: 13.4259, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Gazzo%2C%20Hobrechtstrasse%2057%2C%2012047%20Berlin', website: '' },
    { name: 'GEMELLO', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Lettestr. 6A, 10437 Berlin', lat: 52.5435, lng: 13.4189, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=GEMELLO%2C%20Lettestr.%206A%2C%2010437%20Berlin', website: '' },
    { name: "Gingi's Izakaya", district: 'Prenzlauer Berg', type: 'Dinner', address: 'Rykestr. 45, 10405 Berlin', lat: 52.5366, lng: 13.4203, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Gingi%27s%20Izakaya%2C%20Rykestr.%2045%2C%2010405%20Berlin', website: '' },
    { name: 'Gnam Pasta Factory', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Kottbusser Damm 6, 10967 Berlin', lat: 52.4944, lng: 13.4209, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Gnam%20Pasta%20Factory%2C%20Kottbusser%20Damm%206%2C%2010967%20Berlin', website: '' },
    { name: 'goldies', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Oranienstr. 6, 10997 Berlin', lat: 52.4999, lng: 13.4251, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=goldies%2C%20Oranienstr.%206%2C%2010997%20Berlin', website: 'https://www.goldies-smashburger.de' },
    { name: 'Hasir', district: 'Schöneberg', type: 'Lunch', address: 'Maaßenstraße 10, 10777 Berlin', lat: 52.497, lng: 13.342, categories: ['Lunch'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hasir%2C%20Maa%C3%9Fenstra%C3%9Fe%2010%2C%2010777%20Berlin', website: 'https://www.hasir.de' },
    { name: 'Imren Grill & Restaurant', district: 'Schöneberg', type: 'Lunch', address: 'Hauptstraße 156, 10827 Berlin', lat: 52.486, lng: 13.361, categories: ['Lunch'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Imren%20Grill%20%26%20Restaurant%2C%20Hauptstra%C3%9Fe%20156%2C%2010827%20Berlin', website: '' },
    { name: 'ITA Bistro', district: 'Prenzlauer Berg', type: 'Dinner · Lunch', address: 'Lettestraße 9, 10437 Berlin', lat: 52.5438, lng: 13.4182, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=ITA%20Bistro%2C%20Lettestra%C3%9Fe%209%2C%2010437%20Berlin', website: '' },
    { name: 'jaja', district: 'Neukölln', type: 'Dinner', address: 'Weichselstraße 7, 12043 Berlin', lat: 52.4842, lng: 13.4331, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=jaja%2C%20Weichselstra%C3%9Fe%207%2C%2012043%20Berlin', website: '' },
    { name: 'JOHANN Bäckerei', district: 'Schöneberg', type: 'Sweets · Breakfast', address: 'Gleditschstraße 47, 10781 Berlin', lat: 52.4925, lng: 13.3553, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=JOHANN%20B%C3%A4ckerei%2C%20Gleditschstra%C3%9Fe%2047%2C%2010781%20Berlin', website: '' },
    { name: 'Jolie Bistrot', district: 'Tiergarten', type: 'Dinner', address: 'Lützowstraße 23, 10785 Berlin', lat: 52.505, lng: 13.363, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Jolie%20Bistrot%2C%20L%C3%BCtzowstra%C3%9Fe%2023%2C%2010785%20Berlin', website: 'https://www.joliebistrot.de' },
    { name: 'Jones Ice Cream', district: 'Schöneberg', type: 'Sweets', address: 'Goltzstr. 3, 10781 Berlin', lat: 52.4904, lng: 13.3535, categories: ['Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Jones%20Ice%20Cream%2C%20Goltzstr.%203%2C%2010781%20Berlin', website: '' },
    { name: 'Jules Geisberg', district: 'Schöneberg', type: 'Coffee · Breakfast', address: 'Geisbergstraße 9, 10777 Berlin', lat: 52.4974, lng: 13.3421, categories: ['Coffee', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Jules%20Geisberg%2C%20Geisbergstra%C3%9Fe%209%2C%2010777%20Berlin', website: 'https://julesgeisberg.de' },
    { name: 'Julius', district: 'Wedding', type: 'Coffee · Dinner', address: 'Gerichtstraße 31, 13347 Berlin', lat: 52.545, lng: 13.3682, categories: ['Coffee', 'Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Julius%2C%20Gerichtstra%C3%9Fe%2031%2C%2013347%20Berlin', website: '' },
    { name: 'Jungbluth', district: 'Steglitz', type: 'Dinner', address: 'Lepsiusstr. 63, 12163 Berlin', lat: 52.4604, lng: 13.3173, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Jungbluth%2C%20Lepsiusstr.%2063%2C%2012163%20Berlin', website: 'https://jungbluth.berlin' },
    { name: 'Kanal61', district: 'Neukölln', type: 'Lunch · Dinner', address: 'Pannierstraße 61, 12047 Berlin', lat: 52.491, lng: 13.429, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kanal61%2C%20Pannierstra%C3%9Fe%2061%2C%2012047%20Berlin', website: '' },
    { name: 'Kitten Deli', district: 'Neukölln', type: 'Breakfast · Lunch', address: 'Friedelstraße 30, 12047 Berlin', lat: 52.4929, lng: 13.4283, categories: ['Breakfast', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kitten%20Deli%2C%20Friedelstra%C3%9Fe%2030%2C%2012047%20Berlin', website: 'https://kittendeli.de' },
    { name: 'Knödelwirtschaft NORD', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Stargarder Str. 3, 10437 Berlin', lat: 52.5474, lng: 13.4143, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kn%C3%B6delwirtschaft%20NORD%2C%20Stargarder%20Str.%203%2C%2010437%20Berlin', website: '' },
    { name: 'Kuréme', district: 'Kreuzberg', type: 'Sweets · Coffee', address: 'Waldemarstraße 48, 10997 Berlin', lat: 52.499, lng: 13.425, categories: ['Sweets', 'Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kur%C3%A9me%2C%20Waldemarstra%C3%9Fe%2048%2C%2010997%20Berlin', website: '' },
    { name: "L'Eustache Restaurant", district: 'Neukölln', type: 'Dinner', address: 'Weisestr. 49, 12049 Berlin', lat: 52.4767, lng: 13.4243, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=L%27Eustache%20Restaurant%2C%20Weisestr.%2049%2C%2012049%20Berlin', website: '' },
    { name: 'La Bolognina', district: 'Neukölln', type: 'Dinner · Lunch', address: 'Donaustraße 107, 12043 Berlin', lat: 52.4825, lng: 13.4356, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=La%20Bolognina%2C%20Donaustra%C3%9Fe%20107%2C%2012043%20Berlin', website: '' },
    { name: "La Cantine d'Augusta", district: 'Schöneberg', type: 'Dinner · Lunch', address: 'Langenscheidtstr. 6, 10827 Berlin', lat: 52.4891, lng: 13.3622, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=La%20Cantine%20d%27Augusta%2C%20Langenscheidtstr.%206%2C%2010827%20Berlin', website: '' },
    { name: 'La Côte', district: 'Neukölln', type: 'Dinner', address: 'Kienitzer Straße 95, 12049 Berlin', lat: 52.4759, lng: 13.426, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=La%20C%C3%B4te%2C%20Kienitzer%20Stra%C3%9Fe%2095%2C%2012049%20Berlin', website: '' },
    { name: 'Lala', district: 'Kreuzberg', type: 'Breakfast · Lunch', address: 'Dieffenbachstraße 11, 10967 Berlin', lat: 52.491, lng: 13.416, categories: ['Breakfast', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lala%2C%20Dieffenbachstra%C3%9Fe%2011%2C%2010967%20Berlin', website: '' },
    { name: 'Larb Koi', district: 'Friedrichshain', type: 'Dinner · Lunch', address: 'Krossener Str. 15, 10245 Berlin', lat: 52.5107, lng: 13.4571, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Larb%20Koi%2C%20Krossener%20Str.%2015%2C%2010245%20Berlin', website: 'https://www.larbkoi.com' },
    { name: 'Le Balto', district: 'Neukölln', type: 'Dinner', address: 'Hobrechtstraße 28, 12047 Berlin', lat: 52.4909, lng: 13.4263, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Le%20Balto%2C%20Hobrechtstra%C3%9Fe%2028%2C%2012047%20Berlin', website: '' },
    { name: 'LIU 成du味道面馆', district: 'Mitte', type: 'Lunch', address: 'Kronenstraße 72, 10117 Berlin', lat: 52.5112, lng: 13.3875, categories: ['Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=LIU%20%E6%88%90du%E5%91%B3%E9%81%93%E9%9D%A2%E9%A6%86%2C%20Kronenstra%C3%9Fe%2072%2C%2010117%20Berlin', website: '' },
    { name: 'Lo Fūfu', district: 'Charlottenburg', type: 'Dinner', address: 'Kantstraße 144, 10623 Berlin', lat: 52.505, lng: 13.319, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lo%20F%C5%ABfu%2C%20Kantstra%C3%9Fe%20144%2C%2010623%20Berlin', website: 'https://www.lofufu.com' },
    { name: 'Lucky Katsu', district: 'Charlottenburg', type: 'Lunch · Dinner', address: 'Leibnizstraße 70B, 10625 Berlin', lat: 52.5066, lng: 13.3137, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lucky%20Katsu%2C%20Leibnizstra%C3%9Fe%2070B%2C%2010625%20Berlin', website: 'https://www.luckykatsuberlin.de' },
    { name: 'Maître Philippe & Filles', district: 'Wilmersdorf', type: 'Lunch · Dinner', address: 'Emser Str. 42, 10719 Berlin', lat: 52.4971, lng: 13.32, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ma%C3%AEtre%20Philippe%20%26%20Filles%2C%20Emser%20Str.%2042%2C%2010719%20Berlin', website: 'https://www.maitrephilippe.de' },
    { name: 'Mamida', district: 'Prenzlauer Berg', type: 'Pizza · Dinner', address: 'Dunckerstraße 80A, 10437 Berlin', lat: 52.5431, lng: 13.4211, categories: ['Pizza', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mamida%2C%20Dunckerstra%C3%9Fe%2080A%2C%2010437%20Berlin', website: '' },
    { name: 'Material', district: 'Prenzlauer Berg', type: 'Coffee · Breakfast', address: 'Schönhauser Allee 156, 10435 Berlin', lat: 52.5374, lng: 13.4118, categories: ['Coffee', 'Breakfast'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Material%2C%20Sch%C3%B6nhauser%20Allee%20156%2C%2010435%20Berlin', website: 'https://material.cafe' },
    { name: 'Momo Mochi Donut', district: 'Prenzlauer Berg', type: 'Sweets', address: 'Heinrich-Roller-Straße 10, 10405 Berlin', lat: 52.5298, lng: 13.4246, categories: ['Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Momo%20Mochi%20Donut%2C%20Heinrich-Roller-Stra%C3%9Fe%2010%2C%2010405%20Berlin', website: '' },
    { name: 'NaNum', district: 'Kreuzberg', type: 'Dinner · Lunch', address: 'Lindenstraße 90, 10969 Berlin', lat: 52.501, lng: 13.397, categories: ['Dinner', 'Lunch'], price: '€€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=NaNum%2C%20Lindenstra%C3%9Fe%2090%2C%2010969%20Berlin', website: '' },
    { name: 'NemNem Restaurant', district: 'Mitte', type: 'Lunch · Dinner', address: 'Linienstraße 134, 10115 Berlin', lat: 52.528, lng: 13.390, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=NemNem%20Restaurant%2C%20Linienstra%C3%9Fe%20134%2C%2010115%20Berlin', website: '' },
    { name: 'NOVEMBER Brasserie', district: 'Prenzlauer Berg', type: 'Dinner · Lunch', address: 'Danziger Str. 26, 10435 Berlin', lat: 52.54, lng: 13.4171, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=NOVEMBER%20Brasserie%2C%20Danziger%20Str.%2026%2C%2010435%20Berlin', website: 'https://november-brasserie.com' },
    { name: 'onette', district: 'Schöneberg', type: 'Dinner', address: 'Grunewaldstraße 11, 10781 Berlin', lat: 52.4902, lng: 13.3553, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=onette%2C%20Grunewaldstra%C3%9Fe%2011%2C%2010781%20Berlin', website: '' },
    { name: 'ORA Restaurant & Wine Bar', district: 'Kreuzberg', type: 'Dinner', address: 'Oranienplatz 14, 10999 Berlin', lat: 52.4995, lng: 13.4206, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=ORA%20Restaurant%20%26%20Wine%20Bar%2C%20Oranienplatz%2014%2C%2010999%20Berlin', website: 'https://ora.berlin' },
    { name: 'Österelli', district: 'Charlottenburg', type: 'Dinner · Lunch', address: 'Bismarckstraße 6, 10625 Berlin', lat: 52.5126, lng: 13.3183, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%C3%96sterelli%2C%20Bismarckstra%C3%9Fe%206%2C%2010625%20Berlin', website: 'https://www.oesterelli.de' },
    { name: 'otto', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Oderberger Str. 56, 10435 Berlin', lat: 52.5382, lng: 13.4102, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=otto%2C%20Oderberger%20Str.%2056%2C%2010435%20Berlin', website: '' },
    { name: 'Pan Africa Restaurant', district: 'Neukölln', type: 'Dinner', address: 'Kirchhofstr. 41, 12055 Berlin', lat: 52.4723, lng: 13.4428, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pan%20Africa%20Restaurant%2C%20Kirchhofstr.%2041%2C%2012055%20Berlin', website: '' },
    { name: "Philomeni's Greek Delicious", district: 'Charlottenburg', type: 'Lunch · Dinner', address: 'Knesebeckstraße 97, 10623 Berlin', lat: 52.5097, lng: 13.3233, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Philomeni%27s%20Greek%20Delicious%2C%20Knesebeckstra%C3%9Fe%2097%2C%2010623%20Berlin', website: '' },
    { name: 'Pinci', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Lindenstraße 1, 10969 Berlin', lat: 52.502, lng: 13.393, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pinci%2C%20Lindenstra%C3%9Fe%201%2C%2010969%20Berlin', website: '' },
    { name: 'Pluto', district: 'Neukölln', type: 'Dinner', address: 'Donaustraße 120, 12043 Berlin', lat: 52.482, lng: 13.436, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pluto%2C%20Donaustra%C3%9Fe%20120%2C%2012043%20Berlin', website: '' },
    { name: 'Restaurant 893 Ryōtei', district: 'Charlottenburg', type: 'Dinner', address: 'Kantstraße 135, 10623 Berlin', lat: 52.5059, lng: 13.3168, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Restaurant%20893%20Ry%C5%8Dtei%2C%20Kantstra%C3%9Fe%20135%2C%2010623%20Berlin', website: 'https://893ryotei.de' },
    { name: 'Restaurant Jolesch', district: 'Kreuzberg', type: 'Dinner · Lunch', address: 'Muskauer Str. 1, 10997 Berlin', lat: 52.498, lng: 13.424, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Restaurant%20Jolesch%2C%20Muskauer%20Str.%201%2C%2010997%20Berlin', website: 'https://www.jolesch.de' },
    { name: 'Ripieno', district: 'Friedrichshain', type: 'Lunch · Dinner', address: 'Oderstraße 1, 10247 Berlin', lat: 52.514, lng: 13.469, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ripieno%2C%20Oderstra%C3%9Fe%201%2C%2010247%20Berlin', website: '' },
    { name: 'SAN', district: 'Mitte', type: 'Dinner', address: 'Weydingerstraße 22, 10178 Berlin', lat: 52.524, lng: 13.408, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SAN%2C%20Weydingerstra%C3%9Fe%2022%2C%2010178%20Berlin', website: '' },
    { name: 'Sardinen Bar', district: 'Schöneberg', type: 'Dinner', address: 'Grunewaldstr. 79, 10823 Berlin', lat: 52.4898, lng: 13.3539, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sardinen%20Bar%2C%20Grunewaldstr.%2079%2C%2010823%20Berlin', website: 'https://www.sardinenbar.de' },
    { name: 'Sasaya', district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Lychener Str. 50, 10437 Berlin', lat: 52.5443, lng: 13.4186, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sasaya%2C%20Lychener%20Str.%2050%2C%2010437%20Berlin', website: 'https://sasaya-berlin.de' },
    { name: 'Sathutu', district: 'Prenzlauer Berg', type: 'Dinner', address: 'Rykestraße 15, 10405 Berlin', lat: 52.535, lng: 13.421, categories: ['Dinner'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sathutu%2C%20Rykestra%C3%9Fe%2015%2C%2010405%20Berlin', website: '' },
    { name: 'Saveur de Bánh Mì', district: 'Schöneberg', type: 'Lunch', address: 'Akazienstraße 24, 10823 Berlin', lat: 52.4876, lng: 13.3543, categories: ['Lunch'], price: '€', mapsUrl: 'https://www.google.com/maps/place/Saveur+de+B%C3%A1nh+M%C3%AC/@52.4876004,13.3543,17z', website: '' },
    { name: 'Schmidt Z & KO', district: 'Steglitz', type: 'Dinner · Lunch', address: 'Rheinstraße 45, 12161 Berlin', lat: 52.467, lng: 13.325, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Schmidt%20Z%20%26%20KO%2C%20Rheinstra%C3%9Fe%2045%2C%2012161%20Berlin', website: '' },
    { name: 'Schüsseldienst', district: 'Schöneberg', type: 'Lunch', address: 'Akazienstraße 7, 10823 Berlin', lat: 52.4873, lng: 13.3551, categories: ['Lunch'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sch%C3%BCsseldienst%2C%20Akazienstra%C3%9Fe%207%2C%2010823%20Berlin', website: '' },
    { name: 'Sfera', district: 'Neukölln', type: 'Breakfast · Lunch', address: 'Schudomastraße 44, 12055 Berlin', lat: 52.4739, lng: 13.4506, categories: ['Breakfast', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sfera%2C%20Schudomastra%C3%9Fe%2044%2C%2012055%20Berlin', website: '' },
    { name: "Shaniu's House of Noodles", district: 'Wilmersdorf', type: 'Lunch · Dinner', address: 'Pariser Straße 58, 10719 Berlin', lat: 52.4962, lng: 13.3278, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Shaniu%E2%80%99s%20House%20of%20Noodles%2C%20Pariser%20Stra%C3%9Fe%2058%2C%2010719%20Berlin', website: '' },
    { name: 'Shōdo Udon Lab', district: 'Friedrichshain', type: 'Lunch · Dinner', address: 'Simon-Dach-Str. 41, 10245 Berlin', lat: 52.5114, lng: 13.4571, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sh%C5%8Ddo%20Udon%20Lab%2C%20Simon-Dach-Str.%2041%2C%2010245%20Berlin', website: '' },
    { name: "Smash'd Eatery x Forn SimSim", district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Husemannstraße 1, 10435 Berlin', lat: 52.540, lng: 13.407, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Smash%E2%80%99d%20Eatery%20x%20Forn%20SimSim%2C%20Husemannstra%C3%9Fe%201%2C%2010435%20Berlin', website: '' },
    { name: 'SOFI', district: 'Mitte', type: 'Sweets · Breakfast', address: 'Sophienstraße 21, 10178 Berlin', lat: 52.5262, lng: 13.4008, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SOFI%2C%20Sophienstra%C3%9Fe%2021%2C%2010178%20Berlin', website: '' },
    { name: 'Soi & Co. Plant-Based Cafe', district: 'Mitte', type: 'Coffee · Sweets', address: 'Linienstraße 205, 10119 Berlin', lat: 52.529, lng: 13.401, categories: ['Coffee', 'Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Soi%20%26%20Co.%20Plant-Based%20Cafe%2C%20Linienstra%C3%9Fe%20205%2C%2010119%20Berlin', website: '' },
    { name: 'soopoollim', district: 'Mitte', type: 'Dinner', address: 'Ackerstraße 149, 10115 Berlin', lat: 52.533, lng: 13.387, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=soopoollim%2C%20Ackerstra%C3%9Fe%20149%2C%2010115%20Berlin', website: '' },
    { name: 'SORI Ramen', district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Wisbyer Str. 3, 10439 Berlin', lat: 52.5533, lng: 13.4157, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SORI%20Ramen%2C%20Wisbyer%20Str.%203%2C%2010439%20Berlin', website: '' },
    { name: 'Sotto', district: 'Wedding', type: 'Pizza', address: 'Neue Hochstraße 25, 13347 Berlin', lat: 52.5428, lng: 13.3764, categories: ['Pizza'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sotto%2C%20Neue%20Hochstra%C3%9Fe%2025%2C%2013347%20Berlin', website: '' },
    { name: 'Spumante', district: 'Kreuzberg', type: 'Bistro', address: 'Reichenberger Str. 73, 10999 Berlin', lat: 52.4970, lng: 13.423, categories: ['Dinner'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Spumante%2C%20Reichenberger%20Str.%2073%2C%2010999%20Berlin', website: '' },
    { name: 'St. Bart', district: 'Kreuzberg', type: 'Dinner · Lunch', address: 'Graefestraße 71, 10967 Berlin', lat: 52.4918, lng: 13.4175, categories: ['Dinner', 'Lunch'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=St.%20Bart%2C%20Graefestra%C3%9Fe%2071%2C%2010967%20Berlin', website: '' },
    { name: 'stoke', district: 'Kreuzberg', type: 'Dinner', address: 'Lindenstraße 34-35, 10969 Berlin', lat: 52.502, lng: 13.394, categories: ['Dinner'], price: '€€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=stoke%2C%20Lindenstra%C3%9Fe%2034-35%2C%2010969%20Berlin', website: '' },
    { name: 'Story Coffee Rösterei P-Berg', district: 'Prenzlauer Berg', type: 'Coffee', address: 'Kollwitzstraße 37, 10405 Berlin', lat: 52.536, lng: 13.422, categories: ['Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Story%20Coffee%20R%C3%B6sterei%20P-Berg%2C%20Kollwitzstra%C3%9Fe%2037%2C%2010405%20Berlin', website: '' },
    { name: 'SWAY', district: 'Neukölln', type: 'Dinner', address: 'Pannierstraße 29, 12047 Berlin', lat: 52.4906, lng: 13.4349, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SWAY%2C%20Pannierstra%C3%9Fe%2029%2C%2012047%20Berlin', website: '' },
    { name: 'Tacos el Rey', district: 'Kreuzberg', type: 'Lunch · Dinner', address: 'Graefestraße 92, 10967 Berlin', lat: 52.490, lng: 13.416, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tacos%20el%20Rey%2C%20Graefestra%C3%9Fe%2092%2C%2010967%20Berlin', website: '' },
    { name: 'Taktil', district: 'Neukölln', type: 'Sweets · Breakfast', address: 'Nogatstr. 38, 12051 Berlin', lat: 52.4694, lng: 13.4337, categories: ['Sweets', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Taktil%2C%20Nogatstr.%2038%2C%2012051%20Berlin', website: '' },
    { name: 'TAKUMI NINE 1', district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Pappelallee 19, 10437 Berlin', lat: 52.543, lng: 13.413, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=TAKUMI%20NINE%201%2C%20Pappelallee%2019%2C%2010437%20Berlin', website: '' },
    { name: 'Teller Berlin', district: 'Wedding', type: 'Dinner', address: 'Burgsdorfstraße 14, 13353 Berlin', lat: 52.540, lng: 13.370, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Teller%20Berlin%2C%20Burgsdorfstra%C3%9Fe%2014%2C%2013353%20Berlin', website: '' },
    { name: 'The Barn Café', district: 'Mitte', type: 'Coffee', address: 'Auguststr. 58, 10119 Berlin', lat: 52.5274, lng: 13.3983, categories: ['Coffee'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=The%20Barn%20Caf%C3%A9%2C%20Auguststr.%2058%2C%2010119%20Berlin', website: 'https://www.thebarn.de' },
    { name: 'The Butterfly Lovers', district: 'Mitte', type: 'Lunch · Dinner', address: 'Marienstraße 30, 10117 Berlin', lat: 52.521, lng: 13.382, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=The%20Butterfly%20Lovers%2C%20Marienstra%C3%9Fe%2030%2C%2010117%20Berlin', website: '' },
    { name: 'The Grain', district: 'Prenzlauer Berg', type: 'Pizza · Dinner', address: 'Gleimstraße 38, 10437 Berlin', lat: 52.5476, lng: 13.4105, categories: ['Pizza', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=The%20Grain%2C%20Gleimstra%C3%9Fe%2038%2C%2010437%20Berlin', website: '' },
    { name: 'Tribeca Ice Cream', district: 'Prenzlauer Berg', type: 'Sweets', address: 'Rykestr. 40, 10405 Berlin', lat: 52.5374, lng: 13.421, categories: ['Sweets'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tribeca%20Ice%20Cream%2C%20Rykestr.%2040%2C%2010405%20Berlin', website: '' },
    { name: 'Trio', district: 'Mitte', type: 'Dinner · Lunch', address: 'Linienstraße 13, 10178 Berlin', lat: 52.524, lng: 13.405, categories: ['Dinner', 'Lunch'], price: '€€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Trio%2C%20Linienstra%C3%9Fe%2013%2C%2010178%20Berlin', website: '' },
    { name: 'W Pizza Mitte', district: 'Mitte', type: 'Lunch · Dinner', address: 'Invalidenstraße 112, 10115 Berlin', lat: 52.531, lng: 13.381, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=W%20Pizza%20Mitte%2C%20Invalidenstra%C3%9Fe%20112%2C%2010115%20Berlin', website: '' },
    { name: 'Weinhandlung Les Climats', district: 'Kreuzberg', type: 'Dinner', address: 'Kottbusser Damm 7, 10967 Berlin', lat: 52.494, lng: 13.421, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Weinhandlung%20Les%20Climats%2C%20Kottbusser%20Damm%207%2C%2010967%20Berlin', website: '' },
    { name: 'Wen Cheng 1', district: 'Prenzlauer Berg', type: 'Lunch · Dinner', address: 'Schönhauser Allee 65, 10437 Berlin', lat: 52.5463, lng: 13.4135, categories: ['Lunch', 'Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Wen%20Cheng%201%2C%20Sch%C3%B6nhauser%20Allee%2065%2C%2010437%20Berlin', website: '' },
    { name: 'westberlin', district: 'Kreuzberg', type: 'Coffee · Breakfast', address: 'Alexandrinenstrasse 118-121, 10969 Berlin', lat: 52.5007, lng: 13.4006, categories: ['Coffee', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=westberlin%2C%20Alexandrinenstrasse%20118-121%2C%2010969%20Berlin', website: 'https://www.westberlin-bar.de' },
    { name: 'ZEIT Café', district: 'Schöneberg', type: 'Coffee · Breakfast', address: 'Bülowstraße 18, 10783 Berlin', lat: 52.499, lng: 13.357, categories: ['Coffee', 'Breakfast'], price: '€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=ZEIT%20Caf%C3%A9%2C%20B%C3%BClowstra%C3%9Fe%2018%2C%2010783%20Berlin', website: '' },
    { name: 'Zum Heiligen Teufel', district: 'Kreuzberg', type: 'Dinner', address: 'Reichenberger Str. 125, 10999 Berlin', lat: 52.496, lng: 13.423, categories: ['Dinner'], price: '€€', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Zum%20Heiligen%20Teufel%2C%20Reichenberger%20Str.%20125%2C%2010999%20Berlin', website: '' },
  ];

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

      setTimeout(() => { if (typeof initFoodMap === 'function') initFoodMap(); }, 50);
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

    L.control.zoom({ position: 'bottomright' }).addTo(foodMap);

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
      iconUrl: 'pics/eat.webp',
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
      const t = (type || '').toLowerCase();
      if (t.includes('coffee') || t.includes('cafe')) return 'pics/glas.webp';
      if (t.includes('sweets') || t.includes('dessert')) return 'pics/dessert.webp';
      if (t.includes('breakfast')) return 'pics/tisch.webp';
      if (t.includes('dinner')) return 'pics/teller.webp';
      return 'pics/teller.webp';
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

    function showNearbyStrip(userLat, userLng) {
      const nearbyEl = document.getElementById('mapNearby');
      const scrollEl = document.getElementById('mapNearbyScroll');
      if (!nearbyEl || !scrollEl) return;

      const sorted = spots
        .map(s => ({ ...s, dist: haversineDistance(userLat, userLng, s.lat, s.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);

      while (scrollEl.firstChild) scrollEl.removeChild(scrollEl.firstChild);

      sorted.forEach(spot => {
        const distM = Math.round(spot.dist);
        const distLabel = distM < 1000 ? distM + 'm' : (spot.dist / 1000).toFixed(1) + 'km';
        const photo = spot.photo || getSpotPhoto(spot.type);

        const card = document.createElement('div');
        card.className = 'map-nearby-card';

        const img = document.createElement('img');
        img.className = 'map-nearby-card-img';
        img.src = photo;
        img.alt = spot.name;
        img.loading = 'lazy';

        const body = document.createElement('div');
        body.className = 'map-nearby-card-body';

        const dist = document.createElement('span');
        dist.className = 'map-nearby-card-dist';
        dist.textContent = distLabel;

        const name = document.createElement('div');
        name.className = 'map-nearby-card-name';
        name.textContent = spot.name;

        const meta = document.createElement('div');
        meta.className = 'map-nearby-card-meta';
        meta.textContent = spot.type + (spot.price ? ' · ' + spot.price : '');

        body.appendChild(dist);
        body.appendChild(name);
        body.appendChild(meta);
        card.appendChild(img);
        card.appendChild(body);

        card.addEventListener('click', () => showSpotDetail(spot));

        scrollEl.appendChild(card);
      });

      nearbyEl.style.display = '';
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
    const triggerCount = document.getElementById('mapFilterCount');
    if (triggerCount) triggerCount.textContent = spots.length;

    // Dropdown toggle
    const filterWrap     = document.getElementById('mapFilterWrap');
    const filterTrigger  = document.getElementById('mapFilterTrigger');
    const filterDropdown = document.getElementById('mapFilterDropdown');
    const filterLabel    = document.getElementById('mapFilterLabel');

    function closeFilterDropdown() {
      if (filterWrap) filterWrap.classList.remove('open');
      if (filterTrigger) filterTrigger.setAttribute('aria-expanded', 'false');
    }

    if (filterTrigger) {
      filterTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = filterWrap.classList.toggle('open');
        filterTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    document.addEventListener('click', (e) => {
      if (filterWrap && !filterWrap.contains(e.target)) closeFilterDropdown();
    });

    // Filter option selection
    const filterOptions = document.querySelectorAll('.map-filter-option');
    filterOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const filter = opt.dataset.filter;

        filterOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        if (filterLabel) filterLabel.textContent = opt.querySelector('span').textContent;
        if (triggerCount) {
          const countEl = opt.querySelector('.map-filter-option-count');
          triggerCount.textContent = countEl ? countEl.textContent : '';
        }

        markers.forEach(marker => {
          const cats = marker.spotCategories || [];
          const show = filter === 'all' || cats.includes(filter);
          if (show) { 
            if (!foodMap.hasLayer(marker)) marker.addTo(foodMap); 
          } else { 
            foodMap.removeLayer(marker); 
          }
        });

        closeFilterDropdown();
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

  function openNewsModal(article) {
    const title = article.dataset.title;
    const img = article.dataset.img;
    const category = article.dataset.categoryLabel;
    const date = article.dataset.date;
    const content = article.dataset.content;

    document.getElementById('newsModalImg').src = img;
    document.getElementById('newsModalImg').alt = title;
    document.getElementById('newsModalCategory').textContent = category;
    document.getElementById('newsModalTitle').textContent = title;
    document.getElementById('newsModalDate').textContent = date;
    document.getElementById('newsModalContent').innerHTML = content;

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
        
        // Globe intro → then init map
        if (pageName === 'map') {
          showGlobeIntro(() => {
            // Called after globe fades (or immediately on repeat visits)
            if (typeof initFoodMap === 'function') initFoodMap();
            if (foodMap) {
              foodMap.invalidateSize();
              setTimeout(() => { if (foodMap) foodMap.invalidateSize(); }, 300);
            }
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

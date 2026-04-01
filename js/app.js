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

  // Alternating images for eat cards — store IDs so they can be cleared
  let altImgIntervals = [];
  const alternatingImages = document.querySelectorAll('.alternating-img');
  alternatingImages.forEach(img => {
    const images = JSON.parse(img.dataset.images || '[]');
    if (images.length > 1) {
      let idx = 0;
      altImgIntervals.push(setInterval(() => {
        idx = (idx + 1) % images.length;
        img.src = images[idx];
      }, 1500));
    }
  });

  // ============================================
  // HERO SLIDER
  // ============================================
  const heroSlides = document.querySelectorAll('.hero-slide');
  let heroInterval = null;
  let currentSlide = 0;
  const slideInterval = 800;

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

  const mustEatsData = [
    { dish: 'Banh Mi', restaurant: 'Saveur de Bánh Mì', district: 'Schöneberg', price: '€', img: 'pics/food/eat/ban.webp', type: 'must-eat' }
  ];

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
        searchResults.innerHTML = '<div class="search-hint">Tippe um zu suchen...</div>';
      }
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function search(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
      searchResults.innerHTML = '<div class="search-hint">Tippe um zu suchen...</div>';
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

    results.sort((a, b) => b.matchScore - a.matchScore);

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="search-no-results">
          <p>Keine Ergebnisse für &ldquo;${escapeHtml(query)}&rdquo;</p>
          <span>Versuche einen anderen Suchbegriff</span>
        </div>
      `;
      return;
    }

    let html = '';
    const mustEatsResults = results.filter(r => r.type === 'must-eat');
    const newsResults_arr = results.filter(r => r.type === 'news');

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
      { name: 'NOVEMBER Brasserie', district: 'Prenzlauer Berg', type: 'Japanese Brasserie', address: 'Danziger Str. 26, 10435 Berlin', lat: 52.54, lng: 13.4171, photo: 'pics/location/november.jpg' },
      { name: 'LIU 成都味道面馆', district: 'Mitte', type: 'Sichuan Chinese', address: 'Kronenstraße 72, 10117 Berlin', lat: 52.5112, lng: 13.3875 },
      { name: 'Father Carpenter', district: 'Mitte', type: 'Cafe/Coffee', address: 'Münzstr 21, 10178 Berlin', lat: 52.5248, lng: 13.4067 },
      { name: 'Berta Restaurant', district: 'Kreuzberg', type: 'Israeli-Mediterranean', address: 'Stresemannstraße 99, 10963 Berlin', lat: 52.5059, lng: 13.3802 },
      { name: 'Clärchens Ballhaus', district: 'Mitte', type: 'German/Dance Hall', address: 'Auguststraße 24, 10117 Berlin', lat: 52.5266, lng: 13.3969 },
      { name: 'Borchardt', district: 'Mitte', type: 'French-German', address: 'Französische Str. 47, 10117 Berlin', lat: 52.515, lng: 13.3904 },
      { name: 'ITA Bistro', district: 'Prenzlauer Berg', type: 'Fusion/Bistro', address: 'Lettestraße 9, 10437 Berlin', lat: 52.5438, lng: 13.4182 },
      { name: 'Sway', district: 'Kreuzberg', type: 'Wine bar/Snacks', address: 'Pannierstraße 29, 12047 Berlin', lat: 52.4906, lng: 13.4349 },
      { name: 'Le Balto', district: 'Kreuzberg', type: 'Wine bar', address: 'Hobrechtstraße 28, 12047 Berlin', lat: 52.4909, lng: 13.4263 },
      { name: 'SOFI', district: 'Mitte', type: 'Bakery', address: 'Sophienstraße 21, 10178 Berlin', lat: 52.5262, lng: 13.4008 },
      { name: 'Capvin Rosenhöfe', district: 'Mitte', type: 'Italian/Pizza', address: 'Rosenthaler Straße 36, 10178 Berlin', lat: 52.5246, lng: 13.4029 },
      { name: 'Atelier Dough', district: 'Kreuzberg', type: 'Bakery/Donuts', address: 'Glogauer Str. 9, 10999 Berlin', lat: 52.4932, lng: 13.437 },
      { name: 'Chipperfield Kantine', district: 'Mitte', type: 'Cafe/Canteen', address: 'Joachimstr. 11, 10119 Berlin', lat: 52.5283, lng: 13.4008 },
      { name: 'Westberlin', district: 'Kreuzberg', type: 'Cafe/Bar', address: 'Alexandrinenstrasse 118-121, 10969 Berlin', lat: 52.5007, lng: 13.4006 },
      { name: 'Gnam Pasta Factory', district: 'Kreuzberg', type: 'Italian/Pasta', address: 'Kottbusser Damm 6, 10967 Berlin', lat: 52.4944, lng: 13.4209 },
      { name: 'Shōdo Udon Lab', district: 'Friedrichshain', type: 'Japanese/Udon', address: 'Simon-Dach-Str. 41, 10245 Berlin', lat: 52.5114, lng: 13.4571 },
      { name: 'Bonanza Coffee Heroes', district: 'Prenzlauer Berg', type: 'Coffee/Cafe', address: 'Oderberger Str. 35, 10435 Berlin', lat: 52.5399, lng: 13.4054 },
      { name: 'Crapulix', district: 'Steglitz', type: 'Patisserie/Cafe', address: 'Schildhornstraße 87, 12163 Berlin', lat: 52.4627, lng: 13.3204 },
      { name: 'The Grain', district: 'Prenzlauer Berg', type: 'Pizza', address: 'Gleimstraße 38, 10437 Berlin', lat: 52.5476, lng: 13.4105 },
      { name: 'GEMELLO', district: 'Prenzlauer Berg', type: 'Vegan Pizza', address: 'Lettestr. 6A, 10437 Berlin', lat: 52.5435, lng: 13.4189 },
      { name: 'Fukagawa Ramen', district: 'Prenzlauer Berg', type: 'Japanese/Ramen', address: 'Wörtherstr. 22, 10405 Berlin', lat: 52.5357, lng: 13.4212 },
      { name: 'Wen Cheng 1', district: 'Prenzlauer Berg', type: 'Chinese/Noodles', address: 'Schönhauser Allee 65, 10437 Berlin', lat: 52.5463, lng: 13.4135 },
      { name: 'otto', district: 'Prenzlauer Berg', type: 'Modern/Seafood', address: 'Oderberger Str. 56, 10435 Berlin', lat: 52.5382, lng: 13.4102 },
      { name: 'Sasaya', district: 'Prenzlauer Berg', type: 'Japanese', address: 'Lychener Str. 50, 10437 Berlin', lat: 52.5443, lng: 13.4186 },
      { name: 'Gazzo', district: 'Kreuzberg', type: 'Pizza', address: 'Hobrechtstrasse 57, 12047 Berlin', lat: 52.4911, lng: 13.4259 },
      { name: 'DONGNAM Coffee Lab', district: 'Charlottenburg', type: 'Coffee', address: 'Kurfürstendamm 105, 10711 Berlin', lat: 52.498, lng: 13.2947 },
      { name: 'Momo Mochi Donut', district: 'Prenzlauer Berg', type: 'Bakery/Donuts', address: 'Heinrich-Roller-Straße 10, 10405 Berlin', lat: 52.5298, lng: 13.4246 },
      { name: 'Kitten Deli', district: 'Kreuzberg', type: 'Israeli', address: 'Friedelstraße 30, 12047 Berlin', lat: 52.4929, lng: 13.4283 },
      { name: 'Estelle', district: 'Prenzlauer Berg', type: 'Modern European', address: 'Kopenhagener Str. 12A, 10437 Berlin', lat: 52.549, lng: 13.4097 },
      { name: 'SORI Ramen', district: 'Prenzlauer Berg', type: 'Japanese/Ramen', address: 'Wisbyer Str. 3, 10439 Berlin', lat: 52.5533, lng: 13.4157 },
      { name: 'Material', district: 'Prenzlauer Berg', type: 'Cafe/Wine', address: 'Schönhauser Allee 156, 10435 Berlin', lat: 52.5374, lng: 13.4118 },
      { name: 'Boutique de LA MAISON', district: 'Kreuzberg', type: 'French Bakery', address: 'Urbanstr. 70A, 10967 Berlin', lat: 52.4882, lng: 13.4231 },
      { name: 'Sfera', district: 'Neukölln', type: 'Vegan Cafe', address: 'Schudomastraße 44, 12055 Berlin', lat: 52.4739, lng: 13.4506 },
      { name: 'AKKURAT Café', district: 'Kreuzberg', type: 'Coffee/Cafe', address: 'Besselstraße 13, 10969 Berlin', lat: 52.5048, lng: 13.394 },
      { name: 'Sotto', district: 'Wedding', type: 'Italian', address: 'Neue Hochstraße 25, 13347 Berlin', lat: 52.5428, lng: 13.3764 },
      { name: 'JOHANN Bäckerei', district: 'Schöneberg', type: 'Bakery', address: 'Gleditschstraße 47, 10781 Berlin', lat: 52.4925, lng: 13.3553 },
      { name: 'Albatross Bäckerei', district: 'Kreuzberg', type: 'Bakery', address: 'Graefestrasse 66/67, 10967 Berlin', lat: 52.4913, lng: 13.4166 },
      { name: 'Larb Koi', district: 'Friedrichshain', type: 'Thai', address: 'Krossener Str. 15, 10245 Berlin', lat: 52.5107, lng: 13.4571 },
      { name: 'Mamida', district: 'Prenzlauer Berg', type: 'Pizza', address: 'Dunckerstraße 80A, 10437 Berlin', lat: 52.5431, lng: 13.4211 },
      { name: 'Cocolo Ramen X-berg', district: 'Kreuzberg', type: 'Japanese/Ramen', address: 'Graefestraße 11, 10967 Berlin', lat: 52.4938, lng: 13.4181 },
      { name: 'Alt Berliner Wirtshaus Henne', district: 'Kreuzberg', type: 'German/Chicken', address: 'Leuschnerdamm 25, 10999 Berlin', lat: 52.4989, lng: 13.4228 },
      { name: 'ORA Restaurant & Wine Bar', district: 'Kreuzberg', type: 'Wine Bar', address: 'Oranienplatz 14, 10999 Berlin', lat: 52.4995, lng: 13.4206 },
      { name: 'St. Bart', district: 'Kreuzberg', type: 'Gastropub', address: 'Graefestraße 71, 10967 Berlin', lat: 52.4918, lng: 13.4175 },
      { name: 'Taktil', district: 'Neukölln', type: 'Bakery', address: 'Nogatstr. 38, 12051 Berlin', lat: 52.4694, lng: 13.4337 },
      { name: 'Companion Tee & Kaffee', district: 'Neukölln', type: 'Cafe', address: 'Weserstraße 166, 12045 Berlin', lat: 52.4834, lng: 13.4411 },
      { name: 'Concierge Coffee', district: 'Kreuzberg', type: 'Coffee', address: 'Paul-Lincke-Ufer 39-40, 10999 Berlin', lat: 52.4961, lng: 13.4223 },
      { name: 'Knödelwirtschaft NORD', district: 'Prenzlauer Berg', type: 'German/Dumplings', address: 'Stargarder Str. 3, 10437 Berlin', lat: 52.5474, lng: 13.4143 },
      { name: 'Tribeca Ice Cream', district: 'Prenzlauer Berg', type: 'Ice Cream', address: 'Rykestr. 40, 10405 Berlin', lat: 52.5374, lng: 13.421 },
      { name: 'Chungking Noodles', district: 'Kreuzberg', type: 'Chinese', address: 'Reichenberger Str. 35, 10999 Berlin', lat: 52.4973, lng: 13.4233 },
      { name: 'Babka & Krantz', district: 'Steglitz', type: 'Jewish Bakery', address: 'Hackerstraße 1, 12161 Berlin', lat: 52.4671, lng: 13.3253 },
      { name: 'Anima', district: 'Friedrichshain', type: 'Bar/Restaurant', address: 'Mühlenstraße 61-63, 10243 Berlin', lat: 52.5056, lng: 13.4381 },
      { name: 'La Côte', district: 'Neukölln', type: 'Wine & Food', address: 'Kienitzer Straße 95, 12049 Berlin', lat: 52.4759, lng: 13.426 },
      { name: 'Barra', district: 'Neukölln', type: 'Italian', address: 'Okerstraße 2, 12049 Berlin', lat: 52.4743, lng: 13.427 },
      { name: 'Beuster', district: 'Neukölln', type: 'Brasserie', address: 'Weserstraße 32, 12045 Berlin', lat: 52.485, lng: 13.4356 },
      { name: 'jaja', district: 'Neukölln', type: 'Wine Bar', address: 'Weichselstraße 7, 12043 Berlin', lat: 52.4842, lng: 13.4331 },
      { name: 'Schüsseldienst', district: 'Schöneberg', type: 'Fast Food', address: 'Akazienstraße 7, 10823 Berlin', lat: 52.4873, lng: 13.3551 },
      { name: 'goldies', district: 'Kreuzberg', type: 'Burgers', address: 'Oranienstr. 6, 10997 Berlin', lat: 52.4999, lng: 13.4251 },
      { name: 'Berlin Burger International', district: 'Kreuzberg', type: 'Burgers', address: 'Pannierstraße 5, 12047 Berlin', lat: 52.4799, lng: 13.4355 },
      { name: 'Lucky Katsu', district: 'Charlottenburg', type: 'Japanese/Chicken', address: 'Leibnizstraße 70B, 10625 Berlin', lat: 52.5066, lng: 13.3137 },
      { name: 'CODA Dessert Dining', district: 'Kreuzberg', type: 'Dessert', address: 'Friedelstraße 47, 12047 Berlin', lat: 52.4847, lng: 13.4312 },
      { name: "L'Eustache", district: 'Neukölln', type: 'French', address: 'Weisestr. 49, 12049 Berlin', lat: 52.4767, lng: 13.4243 },
      { name: 'Common', district: 'Neukölln', type: 'Bakery/Pizza', address: 'Karl-Marx-Straße 176, 12043 Berlin', lat: 52.4744, lng: 13.44 },
      { name: 'Pan Africa Restaurant', district: 'Neukölln', type: 'African', address: 'Kirchhofstr. 41, 12055 Berlin', lat: 52.4723, lng: 13.4428 },
      { name: 'The Barn Café', district: 'Mitte', type: 'Coffee', address: 'Auguststr. 58, 10119 Berlin', lat: 52.5274, lng: 13.3983 },
      { name: 'onette', district: 'Schöneberg', type: 'Luncheonette', address: 'Grunewaldstraße 11, 10781 Berlin', lat: 52.4902, lng: 13.3553 },
      { name: 'La Bolognina', district: 'Neukölln', type: 'Italian', address: 'Donaustraße 107, 12043 Berlin', lat: 52.4825, lng: 13.4356 },
      { name: 'DoubleEye', district: 'Schöneberg', type: 'Coffee/Cafe', address: 'Akazienstraße 22, 10823 Berlin', lat: 52.488, lng: 13.354 },
      { name: 'Frühstück 3000', district: 'Schöneberg', type: 'Breakfast/Brunch', address: 'Bülowstraße 101, 10783 Berlin', lat: 52.4992, lng: 13.3567 },
      { name: 'Sardinen Bar', district: 'Schöneberg', type: 'Seafood', address: 'Grunewaldstr. 79, 10823 Berlin', lat: 52.4898, lng: 13.3539 },
      { name: 'Jones Ice Cream', district: 'Schöneberg', type: 'Ice Cream', address: 'Goltzstr. 3, 10781 Berlin', lat: 52.4904, lng: 13.3535 },
      { name: 'Österelli', district: 'Charlottenburg', type: 'Austrian', address: 'Bismarckstraße 6, 10625 Berlin', lat: 52.5126, lng: 13.3183 },
      { name: 'AVIV 030', district: 'Neukölln', type: 'Middle Eastern', address: 'Richardstr. 76, 12043 Berlin', lat: 52.4749, lng: 13.4448 },
      { name: 'Jules Geisberg', district: 'Schöneberg', type: 'Coffee/Cafe', address: 'Geisbergstraße 9, 10777 Berlin', lat: 52.4974, lng: 13.3421 },
      { name: "Philomeni's Greek Delicious", district: 'Charlottenburg', type: 'Greek', address: 'Knesebeckstraße 97, 10623 Berlin', lat: 52.5097, lng: 13.3233 },
      { name: 'Frau Mittenmang', district: 'Prenzlauer Berg', type: 'Mediterranean', address: 'Rodenbergstr. 37, 10439 Berlin', lat: 52.5503, lng: 13.4193 },
      { name: 'Restaurant 893 Ryōtei', district: 'Charlottenburg', type: 'Japanese', address: 'Kantstraße 135, 10623 Berlin', lat: 52.5059, lng: 13.3168 },
      { name: 'Enoiteca Il Calice', district: 'Charlottenburg', type: 'Italian/Wine', address: 'Walter-Benjamin-Platz 4, 10629 Berlin', lat: 52.5019, lng: 13.3149 },
      { name: "Gingi's Izakaya", district: 'Prenzlauer Berg', type: 'Japanese', address: 'Rykestr. 45, 10405 Berlin', lat: 52.5366, lng: 13.4203 },
      { name: 'Diener Tattersall', district: 'Charlottenburg', type: 'Dive Bar', address: 'Grolmanstraße 47, 10623 Berlin', lat: 52.5047, lng: 13.324 },
      { name: 'Maître Philippe & Filles', district: 'Wilmersdorf', type: 'French Deli', address: 'Emser Str. 42, 10719 Berlin', lat: 52.4971, lng: 13.32 },
      { name: "La Cantine d'Augusta", district: 'Schöneberg', type: 'French', address: 'Langenscheidtstr. 6/6a, 10827 Berlin', lat: 52.4891, lng: 13.3622 },
      { name: 'Châlet Suisse', district: 'Dahlem', type: 'Swiss', address: 'Clayallee 99, 14195 Berlin', lat: 52.4547, lng: 13.2728 },
      { name: 'Spice Junction', district: 'Schöneberg', type: 'Indian', address: 'Bülowstraße 44, 10783 Berlin', lat: 52.4955, lng: 13.3657 },
      { name: 'aerde restaurant', district: 'Kreuzberg', type: 'Modern European', address: 'Am Lokdepot 6, 10965 Berlin', lat: 52.487, lng: 13.3736 },
      { name: "Shaniu's House of Noodles", district: 'Wilmersdorf', type: 'Chinese', address: 'Pariser Str. 58, 10719 Berlin', lat: 52.4962, lng: 13.3278 },
      { name: 'Julius', district: 'Wedding', type: 'German/Fine Dining', address: 'Gerichtstraße 31, 13347 Berlin', lat: 52.545, lng: 13.3682 },
      { name: 'Jungbluth', district: 'Steglitz', type: 'Modern European', address: 'Lepsiusstr. 63, 12163 Berlin', lat: 52.4604, lng: 13.3173 },
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
    logoText.textContent = "u can touch this";
    logoText.style.cssText = 'position:absolute;top:calc(50% + min(30vw,140px) - 65px);left:50%;transform:translateX(-50%);color:#fff;font-family:Inter,system-ui,sans-serif;font-size:clamp(18px,4.5vw,24px);font-weight:700;letter-spacing:0.5px;pointer-events:none;z-index:501;opacity:0;transition:opacity 0.8s ease 0.3s;white-space:nowrap;text-shadow:0 0 8px #ff6600, 0 0 20px #ff4400, 0 0 40px #ff2200, 0 0 80px #ff0000;animation:flamePulse 1.5s ease-in-out infinite;';
    const flameStyle = document.createElement('style');
    flameStyle.textContent = '@keyframes flamePulse{0%,100%{text-shadow:0 0 8px #ff6600,0 0 20px #ff4400,0 0 40px #ff2200,0 0 80px #ff0000}50%{text-shadow:0 0 12px #ffaa00,0 0 30px #ff6600,0 0 60px #ff3300,0 0 100px #ff1100}}';
    document.head.appendChild(flameStyle);
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
      showNotification('Karte konnte nicht geladen werden');
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
    const mapSpotOverlay = document.getElementById('mapSpotOverlay');
    const mapSpotContent = document.getElementById('mapSpotContent');
    const mapSpotClose = document.getElementById('mapSpotClose');

    function getSpotPhoto(type) {
      const t = type.toLowerCase();
      if (t.includes('burger')) return 'pics/burgers.webp';
      if (t.includes('ramen') || t.includes('udon') || t.includes('sushi') || t.includes('japanisch')) return 'pics/spots/ramen.webp';
      if (t.includes('donuts') || t.includes('mochi') || t.includes('süß')) return 'pics/spots/donuts.webp';
      if (t.includes('wein') || t.includes('weinbar') || t.includes('bistro/wein')) return 'pics/wein.webp';
      if (t.includes('café') || t.includes('cafe') || t.includes('coffee') || t.includes('kaffee') || t.includes('tee')) return 'pics/glas.webp';
      if (t.includes('dessert') || t.includes('eis')) return 'pics/dessert.webp';
      if (t.includes('fisch') || t.includes('sardinen') || t.includes('austern') || t.includes('meeresfrüchte')) return 'pics/fisch.webp';
      if (t.includes('bäckerei') || t.includes('brunch') || t.includes('frühstück')) return 'pics/tisch.webp';
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
      const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.name + ', ' + spot.address);
      // spot.photo: optionales individuelles Bild aus pics/location/, z.B. 'pics/location/november.webp'
      const photo = spot.photo || getSpotPhoto(spot.type);

      mapSpotContent.innerHTML = '';

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

      const typeBadge = document.createElement('span');
      typeBadge.className = 'map-spot-type-badge';
      typeBadge.textContent = spot.type;

      const name = document.createElement('h3');
      name.className = 'map-spot-name';
      name.textContent = spot.name;

      const address = document.createElement('div');
      address.className = 'map-spot-address';
      address.textContent = spot.address;

      const btn = document.createElement('a');
      btn.href = mapsUrl;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.className = 'map-spot-btn';
      btn.textContent = 'Open in Maps';

      body.appendChild(typeBadge);
      body.appendChild(name);
      body.appendChild(address);
      body.appendChild(btn);

      mapSpotContent.appendChild(imgWrap);
      mapSpotContent.appendChild(body);

      mapSpotOverlay.classList.add('active');
      bodyOverflow.lock();
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
    const filterCategories = ['all', 'breakfast', 'lunch', 'dinner', 'fine-dining', 'fast-food', 'cafe', 'dessert'];
    filterCategories.forEach(cat => {
      const el = document.getElementById('count-' + cat);
      if (el) {
        el.textContent = cat === 'all'
          ? spots.length
          : spots.filter(s => getSpotCategory(s.type) === cat).length;
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
          const cat = getSpotCategory(marker.spotType);
          const show = filter === 'all' || cat === filter;
          if (show) { 
            if (!foodMap.hasLayer(marker)) marker.addTo(foodMap); 
          } else { 
            marker.removeFrom(foodMap); 
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

  newsArticles.forEach(article => {
    const link = article.querySelector('a');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openNewsModal(article);
      });
    }
  });

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

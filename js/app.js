/* ============================================
   EAT THIS — Interactions & Animations
   ============================================ */

// Lock to portrait mode on mobile
if (window.innerWidth <= 767 && screen.orientation?.lock) {
  screen.orientation.lock('portrait').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {

  // Alternating images for eat cards
  const alternatingImages = document.querySelectorAll('.alternating-img');
  alternatingImages.forEach(img => {
    const images = JSON.parse(img.dataset.images || '[]');
    if (images.length > 1) {
      let idx = 0;
      setInterval(() => {
        idx = (idx + 1) % images.length;
        img.src = images[idx];
      }, 1500);
    }
  });

  // ============================================
  // HERO SLIDER
  // ============================================
  const heroSlides = document.querySelectorAll('.hero-slide');
  if (heroSlides.length > 0) {
    let currentSlide = 0;
    const slideInterval = 800;
    
    function nextSlide() {
      heroSlides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % heroSlides.length;
      heroSlides[currentSlide].classList.add('active');
    }
    
    setInterval(nextSlide, slideInterval);
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
    { dish: 'Banh Mi', restaurant: 'Saveur de Bánh Mì', district: 'Schöneberg', price: '€', img: 'pics/food/eat/ban.png', type: 'must-eat' }
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
      document.body.style.overflow = 'hidden';
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
      document.body.style.overflow = '';
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
      const matches = queryWords.every(word => searchable.includes(word));
      if (matches) {
        results.push({ ...item, matchScore: queryWords.filter(word => searchable.includes(word)).length });
      }
    });

    newsData.forEach(item => {
      const searchable = `${item.title} ${item.category} ${item.date}`.toLowerCase();
      const matches = queryWords.every(word => searchable.includes(word));
      if (matches) {
        results.push({ ...item, matchScore: queryWords.filter(word => searchable.includes(word)).length });
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
          <div class="search-result-item" data-type="must-eat" data-dish="${item.dish}" data-restaurant="${item.restaurant}">
            <img src="${item.img}" alt="${item.dish}" class="search-result-img">
            <div class="search-result-content">
              <div class="search-result-dish">${item.dish}</div>
              <div class="search-result-restaurant">${item.restaurant} · ${item.district} · ${item.price}</div>
            </div>
          </div>
        `;
      });
    }

    if (newsResults_arr.length > 0) {
      html += '<div class="search-section-title">News</div>';
      newsResults_arr.slice(0, 3).forEach(item => {
        html += `
          <div class="search-result-item" data-type="news" data-title="${item.title}">
            <img src="${item.img}" alt="${item.title}" class="search-result-img">
            <div class="search-result-content">
              <div class="search-result-title">${item.title}</div>
              <div class="search-result-meta">${item.category} · ${item.date}</div>
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

  // --- Newsletter form ---
  const form = document.getElementById('newsletterForm');
  const success = document.getElementById('newsletterSuccess');

  if (form && success) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (input.value) {
        form.style.display = 'none';
        success.classList.add('show');
        input.value = '';
      }
    });
  }

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

  // --- Eat card tilt effect on mouse move (desktop) ---
  const eatCards = document.querySelectorAll('.eat-card');

  eatCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (window.innerWidth < 768) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-4px) perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // --- Must Eat Modal ---
  const modal = document.getElementById('eatModal');
  const modalClose = document.getElementById('modalClose');

  eatCards.forEach(card => {
    card.addEventListener('click', () => {
      const dish = card.dataset.dish;
      const restaurant = card.dataset.restaurant;
      const district = card.dataset.district;
      const desc = card.dataset.desc;
      const img = card.dataset.img;
      const address = card.dataset.address || '';

      document.getElementById('modalImg').src = img;
      document.getElementById('modalImg').alt = dish;
      document.getElementById('modalDistrict').textContent = district;
      document.getElementById('modalDish').textContent = dish;
      document.getElementById('modalRestaurant').textContent = restaurant;
      document.getElementById('modalAddress').textContent = address;
      document.getElementById('modalDesc').textContent = desc;
      document.getElementById('modalMapsBtn').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(restaurant + ', ' + address);

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
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
      { name: 'NOVEMBER Brasserie', district: 'Mitte', type: 'Japanisch/Gehoben', mustEat: 'Miso Seabass', address: 'Rosenthaler Str. 68, 10119 Berlin', lat: 52.5272, lng: 13.3988 },
      { name: 'LIU 成都味道面馆', district: 'Mitte', type: 'Sichuan-Nudeln', mustEat: 'Dan Dan Nudeln mit Sichuan-Pfeffer', address: 'Koppenplatz 2, 10115 Berlin', lat: 52.5303, lng: 13.3978 },
      { name: 'Father Carpenter', district: 'Mitte', type: 'Brunch/Café', mustEat: 'Ricotta Hotcakes mit Maple Syrup', address: 'Münzstr. 21, 10178 Berlin', lat: 52.5256, lng: 13.4019 },
      { name: 'Berta Restaurant', district: 'Mitte', type: 'Modern/Israelisch', mustEat: 'Kubaneh mit Schmalz & Za\'atar', address: 'Alte Schönhauser Str. 26, 10119 Berlin', lat: 52.5274, lng: 13.4034 },
      { name: 'Clärchens Ballhaus', district: 'Mitte', type: 'Traditionell', mustEat: 'Wiener Schnitzel mit Kartoffelsalat', address: 'Auguststraße 24, 10117 Berlin', lat: 52.5254, lng: 13.3970 },
      { name: 'Borchardt', district: 'Mitte', type: 'Deutsch/Schnitzel', mustEat: 'Wiener Schnitzel', address: 'Französische Str. 47, 10117 Berlin', lat: 52.5145, lng: 13.3912 },
      { name: 'ITA Bistro', district: 'Mitte', type: 'Bistro', mustEat: 'Cacio e Pepe', address: 'Rochstraße 3, 10178 Berlin', lat: 52.5236, lng: 13.4042 },
      { name: 'Standard', district: 'Mitte', type: 'Pizza', mustEat: 'Pizza', address: 'Torstraße 102, 10119 Berlin', lat: 52.5281, lng: 13.3878 },
      { name: 'Sway', district: 'Mitte', type: 'Weinbar', mustEat: 'Naturweine & Tapas-Platte', address: 'Linienstraße 40, 10119 Berlin', lat: 52.5264, lng: 13.3975 },
      { name: 'Le Balto', district: 'Mitte', type: 'Weinbar', mustEat: 'Französischer Naturwein & Cheese-Board', address: 'Krausnickstr. 10, 10115 Berlin', lat: 52.5307, lng: 13.3956 },
      { name: 'SOFI', district: 'Mitte', type: 'Bäckerei', mustEat: 'Sourdough Croissant', address: 'Sophienstraße 5, 10178 Berlin', lat: 52.5247, lng: 13.3965 },
      { name: 'Capvin Rosenhöfe', district: 'Mitte', type: 'Pizza', mustEat: 'Napoli-Pizza mit Bärlauch', address: 'Rosenthaler Str. 36, 10178 Berlin', lat: 52.5253, lng: 13.4006 },
      { name: 'Atelier Dough', district: 'Kreuzberg', type: 'Donuts', mustEat: 'Matcha Donut', address: 'Alte Schönhauser Str. 40, 10119 Berlin', lat: 52.5282, lng: 13.4030 },
      { name: 'Chipperfield Kantine', district: 'Mitte', type: 'Lunch', mustEat: 'Tagesmenü der Kantine', address: 'Ebertstraße 27, 10117 Berlin', lat: 52.5108, lng: 13.3754 },
      { name: 'Westberlin', district: 'Kreuzberg', type: 'Café', mustEat: 'Flat White & Avocado Toast', address: 'Friedrichstraße 215, 10969 Berlin', lat: 52.4993, lng: 13.3889 },
      { name: 'Gnam Pasta Factory', district: 'Mitte', type: 'Pasta', mustEat: 'Truffle Tagliatelle', address: 'Zimmerstraße 91, 10117 Berlin', lat: 52.5075, lng: 13.3868 },
      { name: 'Shōdo Udon Lab', district: 'Mitte', type: 'Udon', mustEat: 'Handgezogene Udon-Nudeln in Dashi-Brühe', address: 'Rosenthaler Str. 62, 10119 Berlin', lat: 52.5266, lng: 13.3992 },
      { name: 'Bonanza Coffee Heroes', district: 'Prenzlauer Berg', type: 'Café', mustEat: 'Single Origin Espresso', address: 'Oderberger Str. 35, 10435 Berlin', lat: 52.5413, lng: 13.4073 },
      { name: 'Crapulix', district: 'Prenzlauer Berg', type: 'Bäckerei', mustEat: 'Babka & Levain-Brot', address: 'Hufelandstr. 21, 10407 Berlin', lat: 52.5340, lng: 13.4341 },
      { name: 'The Grain', district: 'Prenzlauer Berg', type: 'Pizza', mustEat: 'Sourdough Pizza mit Burrata', address: 'Dunckerstraße 2, 10437 Berlin', lat: 52.5400, lng: 13.4139 },
      { name: 'GEMELLO', district: 'Prenzlauer Berg', type: 'Pizza', mustEat: 'Pizza Marinara', address: 'Kollwitzstraße 33, 10405 Berlin', lat: 52.5380, lng: 13.4192 },
      { name: 'Fukagawa Ramen', district: 'Prenzlauer Berg', type: 'Japanisch', mustEat: 'Tonkotsu Ramen', address: 'Lychener Str. 44, 10437 Berlin', lat: 52.5399, lng: 13.4129 },
      { name: 'Wen Cheng 1', district: 'Prenzlauer Berg', type: 'Nudeln', mustEat: 'Biang Biang Nudeln mit Chili-Öl', address: 'Prenzlauer Allee 27A, 10405 Berlin', lat: 52.5388, lng: 13.4235 },
      { name: 'otto', district: 'Mitte', type: 'Moderne Regionalküche', mustEat: 'Saisonales Tasting Menü', address: 'Lottumstraße 5, 10119 Berlin', lat: 52.5306, lng: 13.4013 },
      { name: 'Sasaya', district: 'Prenzlauer Berg', type: 'Japanisch', mustEat: 'Kaiseki-Abendmenü', address: 'Lychener Str. 50, 10437 Berlin', lat: 52.5402, lng: 13.4125 },
      { name: 'Gazzo', district: 'Prenzlauer Berg', type: 'Pizza', mustEat: 'Pizza mit Nduja & Ricotta', address: 'Schönhauser Allee 50, 10437 Berlin', lat: 52.5427, lng: 13.4133 },
      { name: 'DONGNAM Coffee Lab', district: 'Prenzlauer Berg', type: 'Café', mustEat: 'Pour Over & Matcha Latte', address: 'Knaackstraße 26, 10405 Berlin', lat: 52.5374, lng: 13.4201 },
      { name: 'Momo Mochi Donut', district: 'Prenzlauer Berg', type: 'Süßes', mustEat: 'Mochi Donuts (alle Sorten)', address: 'Kollwitzstraße 36, 10405 Berlin', lat: 52.5382, lng: 13.4190 },
      { name: 'Kitten Deli', district: 'Kreuzberg', type: 'Restaurant', mustEat: 'Reuben Sandwich', address: 'Raumerstraße 31, 10437 Berlin', lat: 52.5410, lng: 13.4126 },
      { name: 'Estelle', district: 'Prenzlauer Berg', type: 'Restaurant', mustEat: 'Tartare & Wein', address: 'Danziger Str. 1, 10435 Berlin', lat: 52.5415, lng: 13.4118 },
      { name: 'SORI Ramen', district: 'Prenzlauer Berg', type: 'Ramen', mustEat: 'Spicy Miso Ramen', address: 'Eberswalder Str. 5, 10437 Berlin', lat: 52.5409, lng: 13.4118 },
      { name: 'Material', district: 'Mitte', type: 'Café', mustEat: 'Specialty Coffee & Kardamom-Bun', address: 'Choriner Str. 18, 10119 Berlin', lat: 52.5294, lng: 13.4021 },
      { name: 'Boutique de LA MAISON', district: 'Prenzlauer Berg', type: 'Bäckerei', mustEat: 'Croissants & Pain au Chocolat', address: 'Knaackstr. 17, 10405 Berlin', lat: 52.5369, lng: 13.4205 },
      { name: 'Sfera', district: 'Prenzlauer Berg', type: 'Pflanzliches Café', mustEat: 'Plant-Based Bowl', address: 'Knaackstraße 46, 10405 Berlin', lat: 52.5385, lng: 13.4195 },
      { name: 'AKKURAT Café', district: 'Prenzlauer Berg', type: 'Café', mustEat: 'Espresso & Carrot Cake', address: 'Eberswalder Str. 25, 10437 Berlin', lat: 52.5418, lng: 13.4115 },
      { name: 'Sotto', district: 'Prenzlauer Berg', type: 'Vegane Pizza', mustEat: 'Vegane Quattro Formaggi', address: 'Dunckerstr. 2, 10437 Berlin', lat: 52.5400, lng: 13.4139 },
      { name: 'JOHANN Bäckerei', district: 'Neukölln', type: 'Bäckerei', mustEat: 'Artisan Sourdough & Croissants', address: 'Oranienstraße 185, 10999 Berlin', lat: 52.4979, lng: 13.4249 },
      { name: 'Albatross Bäckerei', district: 'Neukölln', type: 'Bäckerei', mustEat: 'Pistachio Slice', address: 'Oranienstraße 197, 10999 Berlin', lat: 52.4975, lng: 13.4260 },
      { name: 'Larb Koi', district: 'Kreuzberg', type: 'Thailändisch', mustEat: 'Larb Gai (scharf)', address: 'Fichtestraße 27, 10967 Berlin', lat: 52.4927, lng: 13.4202 },
      { name: 'Mamida', district: 'Kreuzberg', type: 'Pizza', mustEat: 'Sourdough Pizza Diavola', address: 'Graefestraße 79, 10967 Berlin', lat: 52.4905, lng: 13.4200 },
      { name: 'Cocolo Ramen X-berg', district: 'Neukölln', type: 'Ramen', mustEat: 'Tonkotsu Ramen', address: 'Paul-Lincke-Ufer 39, 10999 Berlin', lat: 52.4943, lng: 13.4235 },
      { name: 'Alt Berliner Wirtshaus Henne', district: 'Neukölln', type: 'Deutsch', mustEat: 'Hendl (halbes Hähnchen)', address: 'Leuschnerdamm 25, 10999 Berlin', lat: 52.4989, lng: 13.4228 },
      { name: 'ORA Restaurant & Wine Bar', district: 'Neukölln', type: 'Restaurant/Bar', mustEat: 'Saisonale Teller & Naturwein', address: 'Oranienplatz 14, 10999 Berlin', lat: 52.4995, lng: 13.4206 },
      { name: 'St. Bart', district: 'Kreuzberg', type: 'Gastro-Pub', mustEat: 'Craft Beer & Burger', address: 'Kottbusser Damm 30, 10967 Berlin', lat: 52.4918, lng: 13.4218 },
      { name: 'Taktil', district: 'Kreuzberg', type: 'Bäckerei', mustEat: 'Roggen-Sauerteigbrot', address: 'Bergmannstraße 84, 10961 Berlin', lat: 52.4892, lng: 13.3952 },
      { name: 'Companion Tee & Kaffee', district: 'Kreuzberg', type: 'Café', mustEat: 'Specialty Tee & Matcha', address: 'Graefestraße 80, 10967 Berlin', lat: 52.4905, lng: 13.4203 },
      { name: 'Concierge Coffee', district: 'Neukölln', type: 'Café', mustEat: 'Oat Milk Latte & Cookie', address: 'Paul-Lincke-Ufer 36, 10999 Berlin', lat: 52.4945, lng: 13.4232 },
      { name: 'Knödelwirtschaft NORD', district: 'Neukölln', type: 'Restaurant', mustEat: 'Kartoffelknödel mit Pilzrahm', address: 'Görlitzer Str. 68, 10997 Berlin', lat: 52.4962, lng: 13.4367 },
      { name: 'Tribeca Ice Cream', district: 'Neukölln', type: 'Veganes Eis', mustEat: 'Veganes Erdbeer-Basilikum-Eis', address: 'Kottbusser Str. 17, 10999 Berlin', lat: 52.4982, lng: 13.4215 },
      { name: 'Chungking Noodles', district: 'Neukölln', type: 'Nudeln', mustEat: 'Chongqing Xiao Mian', address: 'Reichenberger Str. 47, 10999 Berlin', lat: 52.4960, lng: 13.4232 },
      { name: 'Babka & Krantz', district: 'Kreuzberg', type: 'Bäckerei', mustEat: 'Schokoladen-Babka', address: 'Fichtestraße 34, 10967 Berlin', lat: 52.4924, lng: 13.4209 },
      { name: 'Anima', district: 'Neukölln', type: 'Hifi-Bar', mustEat: 'Cocktails & Vinyl-Vibes', address: 'Oranienstraße 183, 10999 Berlin', lat: 52.4980, lng: 13.4246 },
      { name: 'La Côte', district: 'Neukölln', type: 'Restaurant', mustEat: 'Austern & Muscheln', address: 'Friedelstraße 15, 12047 Berlin', lat: 52.4845, lng: 13.4278 },
      { name: 'Barra', district: 'Neukölln', type: 'Restaurant', mustEat: 'Saisonale Small Plates', address: 'Weserstraße 21, 12045 Berlin', lat: 52.4853, lng: 13.4343 },
      { name: 'Beuster', district: 'Neukölln', type: 'Brasserie', mustEat: 'Steak Frites', address: 'Weserstraße 32, 12045 Berlin', lat: 52.4850, lng: 13.4356 },
      { name: 'jaja', district: 'Neukölln', type: 'Bistro/Wein', mustEat: 'Naturwein & Snacks', address: 'Lenaustraße 14, 12047 Berlin', lat: 52.4847, lng: 13.4285 },
      { name: 'Schüsseldienst', district: 'Neukölln', type: 'Bowls', mustEat: 'Açaí Bowl', address: 'Weserstraße 59, 12045 Berlin', lat: 52.4841, lng: 13.4385 },
      { name: 'goldies', district: 'Kreuzberg', type: 'Burger', mustEat: 'Double Smashburger', address: 'Graefestraße 93, 10967 Berlin', lat: 52.4905, lng: 13.4200 },
      { name: 'Berlin Burger International', district: 'Neukölln', type: 'Burger', mustEat: 'Classic Cheeseburger', address: 'Pannierstraße 5, 12047 Berlin', lat: 52.4799, lng: 13.4355 },
      { name: 'Lucky Katsu', district: 'Neukölln', type: 'Japanisch', mustEat: 'Tonkatsu Curry', address: 'Weserstraße 45, 12045 Berlin', lat: 52.4845, lng: 13.4370 },
      { name: 'CODA Dessert Dining', district: 'Neukölln', type: 'Fine Dining', mustEat: '7-Gang Dessert-Tasting-Menü', address: 'Friedelstraße 47, 12047 Berlin', lat: 52.4847, lng: 13.4312 },
      { name: "L'Eustache", district: 'Neukölln', type: 'Französisch', mustEat: 'Coq au Vin', address: 'Weserstraße 40, 12045 Berlin', lat: 52.4848, lng: 13.4365 },
      { name: 'Common', district: 'Neukölln', type: 'Café', mustEat: 'Pour Over & Banana Bread', address: 'Friedelstraße 14, 12047 Berlin', lat: 52.4845, lng: 13.4276 },
      { name: 'Pan Africa Restaurant', district: 'Neukölln', type: 'Afrikanisch', mustEat: 'Injera mit Doro Wot', address: 'Karl-Marx-Straße 109, 12043 Berlin', lat: 52.4754, lng: 13.4391 },
      { name: 'The Barn Café', district: 'Neukölln', type: 'Café', mustEat: 'Single Origin Filter Coffee', address: 'Friedelstraße 10, 12047 Berlin', lat: 52.4844, lng: 13.4272 },
      { name: 'onette', district: 'Schöneberg', type: 'Amerikanisch', mustEat: 'Buttermilk Pancakes', address: 'Grunewaldstraße 11, 10781 Berlin', lat: 52.4848, lng: 13.3490 },
      { name: 'La Bolognina', district: 'Neukölln', type: 'Pasta', mustEat: 'Tagliatelle al Ragù', address: 'Friedelstraße 48, 12047 Berlin', lat: 52.4848, lng: 13.4315 },
      { name: 'DoubleEye', district: 'Schöneberg', type: 'Café', mustEat: 'Doppelter Espresso & Kuchen', address: 'Akazienstraße 22, 10823 Berlin', lat: 52.4880, lng: 13.3541 },
      { name: 'Frühstück 3000', district: 'Schöneberg', type: 'Frühstück', mustEat: 'Full English Breakfast', address: 'Bülowstraße 101, 10783 Berlin', lat: 52.4928, lng: 13.3505 },
      { name: 'Sardinen Bar', district: 'Tiergarten', type: 'Restaurant', mustEat: 'Sardinen & Meeresfrüchte-Platte', address: 'Lützowstraße 81, 10785 Berlin', lat: 52.5035, lng: 13.3628 },
      { name: 'Jones Ice Cream', district: 'Schöneberg', type: 'Eis', mustEat: 'Salted Caramel Eis', address: 'Goltzstraße 3, 10781 Berlin', lat: 52.4948, lng: 13.3520 },
      { name: 'Österelli', district: 'Schöneberg', type: 'Österreichisch', mustEat: 'Käsespätzle', address: 'Fuggerstraße 23, 10777 Berlin', lat: 52.4963, lng: 13.3560 },
      { name: 'AVIV 030', district: 'Neukölln', type: 'Levantinisch', mustEat: 'Falafel & Hummus Teller', address: 'Richardstraße 76, 12043 Berlin', lat: 52.4820, lng: 13.4340 },
      { name: "Jules Geisberg", district: 'Schöneberg', type: 'Café', mustEat: 'Café Crème & Tarte Tatin', address: 'Geisbergstraße 9, 10777 Berlin', lat: 52.4933, lng: 13.3500 },
      { name: 'Frau Mittenmang', district: 'Schöneberg', type: 'Deutsch/Modern', mustEat: 'Saisonales 3-Gang-Menü', address: 'Winterfeldtstraße 50, 10781 Berlin', lat: 52.4950, lng: 13.3578 },
      { name: 'Restaurant 893 Ryōtei', district: 'Charlottenburg', type: 'Japanische Fusion', mustEat: 'Omakase-Sushi', address: 'Kantstraße 134, 10625 Berlin', lat: 52.5054, lng: 13.3228 },
      { name: 'Enoiteca Il Calice', district: 'Charlottenburg', type: 'Italienisch', mustEat: 'Pasta mit Trüffel', address: 'Eislebener Str. 2, 10789 Berlin', lat: 52.5017, lng: 13.3358 },
      { name: "Gingi's Izakaya", district: 'Charlottenburg', type: 'Japanisch', mustEat: 'Yakitori & Sake', address: 'Savignyplatz 4, 10623 Berlin', lat: 52.5054, lng: 13.3198 },
      { name: 'Diener Tattersall', district: 'Charlottenburg', type: 'Deutsch/Traditionell', mustEat: 'Eisbein mit Sauerkraut', address: 'Schlüterstraße 49, 10629 Berlin', lat: 52.5080, lng: 13.3218 },
      { name: 'Maître Philippe & Filles', district: 'Charlottenburg', type: 'Feinkost', mustEat: 'Französischer Käse & Charcuterie', address: 'Schlüterstraße 60, 10625 Berlin', lat: 52.5087, lng: 13.3208 },
      { name: "La Cantine d'Augusta", district: 'Charlottenburg', type: 'Käse/Wein', mustEat: 'Raclette & Fondue', address: 'Augustastraße 28, 10629 Berlin', lat: 52.5090, lng: 13.3228 },
      { name: 'Standard', district: 'Charlottenburg', type: 'Pizza', mustEat: 'Pizza', address: 'Schlüterstraße 63, 10625 Berlin', lat: 52.5068, lng: 13.3276 },
      { name: 'Châlet Suisse', district: 'Charlottenburg', type: 'Schweizerisch', mustEat: 'Rösti & Fondue', address: 'Hohenzollerndamm 32, 14199 Berlin', lat: 52.4872, lng: 13.3024 },
      { name: 'Spice Junction', district: 'Kreuzberg', type: 'Indisch', mustEat: 'Butter Chicken & Naan', address: 'Schönleinstraße 33, 10967 Berlin', lat: 52.4930, lng: 13.4218 },
      { name: 'aerde restaurant', district: 'Wedding', type: 'Modern/Regional', mustEat: 'Regionales Tasting-Menü', address: 'Gerichtstraße 31, 13347 Berlin', lat: 52.5472, lng: 13.3572 },
      { name: "Shaniu's House of Noodles", district: 'Wedding', type: 'Chinesisch', mustEat: 'Handgezogene Nudeln', address: 'Karl-Marx-Straße 204, 13353 Berlin', lat: 52.5465, lng: 13.4265 },
      { name: 'Julius', district: 'Wedding', type: 'Gehobene Küche', mustEat: 'Fine Dining Abendmenü', address: 'Lindower Str. 18, 13347 Berlin', lat: 52.5470, lng: 13.3550 },
      { name: 'Jungbluth', district: 'Steglitz', type: 'Gehobene deutsche Küche', mustEat: 'Saisonale Kreationen', address: 'Albrechtstraße 49, 12167 Berlin', lat: 52.4543, lng: 13.3278 },
      { name: 'FOERSTERS FEINE BIERE', district: 'Lichterfelde', type: 'Bier-Spezialitäten', mustEat: 'Craft Beer Tasting', address: 'Königsberger Str. 40, 12207 Berlin', lat: 52.4530, lng: 13.3678 },
    ];

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
      console.error('Map init failed:', e);
      return;
    }
    mapInitialized = true;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
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
              L.marker([userLat, userLng], { icon: userIcon }).addTo(foodMap);
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
      iconUrl: 'pics/logo.webp',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20]
    });

    const markers = [];
    const mapSpotOverlay = document.getElementById('mapSpotOverlay');
    const mapSpotContent = document.getElementById('mapSpotContent');
    const mapSpotClose = document.getElementById('mapSpotClose');

    function showSpotDetail(spot) {
      const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.name + ', ' + spot.address);
      
      mapSpotContent.innerHTML = `
        <div class="map-spot-header">
          <span class="map-spot-district">${spot.district}</span>
          <span class="map-spot-type">${spot.type}</span>
        </div>
        <h3 class="map-spot-name">${spot.name}</h3>
        <div class="map-spot-musteat">
          <span class="map-spot-label">Eat This:</span> ${spot.mustEat}
        </div>
        <div class="map-spot-address">${spot.address}</div>
        <a href="${mapsUrl}" target="_blank" rel="noopener" class="map-spot-btn">
          In Maps öffnen
        </a>
      `;
      
      mapSpotOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function hideSpotDetail() {
      mapSpotOverlay.classList.remove('active');
      document.body.style.overflow = '';
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

    // Filter functionality
    const filterBtns = document.querySelectorAll('.map-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        markers.forEach(marker => {
          const type = marker.spotType;
          const show = filter === 'all' || 
                       type.toLowerCase().includes(filter.toLowerCase()) ||
                       filter.toLowerCase().includes(type.toLowerCase().split('/')[0]);
          
          if (show) {
            marker.addTo(foodMap);
          } else {
            marker.remove();
          }
        });
      });
    });

    // Location button
    const mapLocationBtn = document.getElementById('mapLocationBtnFixed');
    let userMarker = null;
    
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
    document.body.style.overflow = 'hidden';

    const modalInner = newsModal.querySelector('.news-modal');
    if (modalInner) modalInner.scrollTop = 0;
  }

  function closeNewsModal() {
    newsModal.classList.remove('active');
    document.body.style.overflow = '';
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
    
    const targetPage = document.querySelector(`.app-page[data-page="${pageName}"]`);
    if (!targetPage) return;
    
    appPages.forEach(page => {
      if (page.dataset.page === pageName) {
        page.classList.add('active');
        page.classList.remove('hidden');
        
        // Invalidate map size when map page becomes active
        if (pageName === 'map') {
          setTimeout(() => {
            if (typeof initFoodMap === 'function') initFoodMap();
            if (foodMap) {
              foodMap.invalidateSize();
              setTimeout(() => { if (foodMap) foodMap.invalidateSize(); }, 300);
            }
          }, 100);
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
      const validPages = ['start', 'news', 'musts', 'map', 'newsletter'];
      if (validPages.includes(hash)) {
        navigateToPage(hash);
      }
    }

    window.addEventListener('hashchange', checkHash);
    checkHash();

    function handleResize() {
      isMobile = window.innerWidth <= 767;
      navigateToPage(currentPage);
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Login Modal
    const loginModal = document.getElementById('loginModal');
    const loginBackdrop = document.getElementById('loginBackdrop');
    const loginClose = document.getElementById('loginClose');
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const appleLoginBtn = document.getElementById('appleLoginBtn');
    
    function openLoginModal() {
      if (loginModal) {
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }
    
    function closeLoginModal() {
      if (loginModal) {
        loginModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
    
    if (loginBackdrop) {
      loginBackdrop.addEventListener('click', closeLoginModal);
    }
    
    if (loginClose) {
      loginClose.addEventListener('click', closeLoginModal);
    }
    
    // Login button in footer
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', openLoginModal);
    }
    
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('loginName').value;
        const email = document.getElementById('loginEmail').value;
        
        // Store user info (in production, send to backend)
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('isLoggedIn', 'true');
        
        closeLoginModal();
        showNotification('Willkommen, ' + name + '!');
      });
    }
    
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => {
        showNotification('Google Login noch nicht verfügbar.');
        closeLoginModal();
      });
    }

    if (appleLoginBtn) {
      appleLoginBtn.addEventListener('click', () => {
        showNotification('Apple Login noch nicht verfügbar.');
        closeLoginModal();
      });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && loginModal && loginModal.classList.contains('active')) {
        closeLoginModal();
      }
    });
  }

  // Cookie Info Modal
  const cookieInfoModal = document.getElementById('cookieInfoModal');
  const cookieInfoTrigger = document.getElementById('cookieInfoTrigger');
  const cookieInfoClose = document.getElementById('cookieInfoClose');
  const cookieInfoBackdrop = document.getElementById('cookieInfoBackdrop');

  function openCookieInfoModal() {
    if (cookieInfoModal) {
      cookieInfoModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCookieInfoModal() {
    if (cookieInfoModal) {
      cookieInfoModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (cookieInfoTrigger) cookieInfoTrigger.addEventListener('click', openCookieInfoModal);
  if (cookieInfoClose) cookieInfoClose.addEventListener('click', closeCookieInfoModal);
  if (cookieInfoBackdrop) cookieInfoBackdrop.addEventListener('click', closeCookieInfoModal);

  // AGB Modal
  const agbModal = document.getElementById('agbModal');
  const agbTrigger = document.getElementById('agbTrigger');
  const agbClose = document.getElementById('agbClose');
  const agbBackdrop = document.getElementById('agbBackdrop');
  function openAgbModal() { if (agbModal) { agbModal.classList.add('active'); document.body.style.overflow = 'hidden'; } }
  function closeAgbModal() { if (agbModal) { agbModal.classList.remove('active'); document.body.style.overflow = ''; } }
  if (agbTrigger) agbTrigger.addEventListener('click', openAgbModal);
  const agbFromBurger = document.getElementById('openAgbFromBurger');
  if (agbFromBurger) agbFromBurger.addEventListener('click', () => { closeBurger(); openAgbModal(); });
  if (agbClose) agbClose.addEventListener('click', closeAgbModal);
  if (agbBackdrop) agbBackdrop.addEventListener('click', closeAgbModal);

  // Datenschutz Modal
  const datenschutzModal = document.getElementById('datenschutzModal');
  const datenschutzTrigger = document.getElementById('datenschutzTrigger');
  const datenschutzClose = document.getElementById('datenschutzClose');
  const datenschutzBackdrop = document.getElementById('datenschutzBackdrop');
  function openDatenschutzModal() { if (datenschutzModal) { datenschutzModal.classList.add('active'); document.body.style.overflow = 'hidden'; } }
  function closeDatenschutzModal() { if (datenschutzModal) { datenschutzModal.classList.remove('active'); document.body.style.overflow = ''; } }
  if (datenschutzTrigger) datenschutzTrigger.addEventListener('click', openDatenschutzModal);
  const datenschutzFromBurger = document.getElementById('openDatenschutzFromBurger');
  if (datenschutzFromBurger) datenschutzFromBurger.addEventListener('click', () => { closeBurger(); openDatenschutzModal(); });
  if (datenschutzClose) datenschutzClose.addEventListener('click', closeDatenschutzModal);
  if (datenschutzBackdrop) datenschutzBackdrop.addEventListener('click', closeDatenschutzModal);

  // Burger Menu
  const burgerBtn = document.getElementById('burgerBtn');
  const burgerDrawer = document.getElementById('burgerDrawer');
  const burgerClose = document.getElementById('burgerClose');
  const burgerBackdrop = document.getElementById('burgerBackdrop');

  function openBurger() { burgerDrawer.classList.add('active'); document.body.style.overflow = 'hidden'; }
  function closeBurger() { burgerDrawer.classList.remove('active'); document.body.style.overflow = ''; }
  if (burgerBtn) burgerBtn.addEventListener('click', openBurger);
  if (burgerClose) burgerClose.addEventListener('click', closeBurger);
  if (burgerBackdrop) burgerBackdrop.addEventListener('click', closeBurger);

  function makeInfoModal(id) {
    const modal = document.getElementById(id + 'Modal');
    const closeBtn = document.getElementById(id + 'Close');
    const backdrop = document.getElementById(id + 'Backdrop');
    const trigger = document.getElementById('open' + id.charAt(0).toUpperCase() + id.slice(1));
    function open() { closeBurger(); if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; } }
    function close() { if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } }
    if (trigger) trigger.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
  }
  makeInfoModal('about');
  makeInfoModal('contact');
  makeInfoModal('press');
  makeInfoModal('impressum');

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

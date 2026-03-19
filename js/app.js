/* ============================================
   EAT THIS — Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Navbar scroll state ---
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // --- Mobile menu ---
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

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

  // --- Smooth anchor scroll with offset ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
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

  const starSvg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

  function toStars(val) {
    if (val <= 2) return 1;
    if (val <= 3) return 2;
    return 3;
  }

  function createStars(container, rating) {
    container.innerHTML = '';
    const stars = toStars(rating);
    for (let i = 1; i <= 3; i++) {
      const star = document.createElement('span');
      star.className = 'star ' + (i <= stars ? 'filled' : 'empty');
      star.style.transitionDelay = ((i - 1) * 0.08) + 's';
      star.style.transform = 'scale(0)';
      star.innerHTML = starSvg;
      container.appendChild(star);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          star.style.transform = 'scale(1)';
        });
      });
    }
  }

  eatCards.forEach(card => {
    card.addEventListener('click', () => {
      const dish = card.dataset.dish;
      const restaurant = card.dataset.restaurant;
      const district = card.dataset.district;
      const desc = card.dataset.desc;
      const img = card.dataset.img;
      const ratingPrice = parseInt(card.dataset.ratingPrice);
      const ratingPerf = parseInt(card.dataset.ratingPerf);
      const ratingTaste = parseInt(card.dataset.ratingTaste);
      const ratingLook = parseInt(card.dataset.ratingLook);

      document.getElementById('modalImg').src = img;
      document.getElementById('modalImg').alt = dish;
      document.getElementById('modalDistrict').textContent = district;
      document.getElementById('modalDish').textContent = dish;
      document.getElementById('modalRestaurant').textContent = restaurant;
      document.getElementById('modalDesc').textContent = desc;
      document.getElementById('modalMapsBtn').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(restaurant + ', Berlin');

      createStars(document.getElementById('starFlavor'), ratingTaste);
      createStars(document.getElementById('starGram'), ratingLook);
      createStars(document.getElementById('starPocket'), ratingPrice);
      createStars(document.getElementById('starComeback'), ratingPerf);

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
  const mapContainer = document.getElementById('foodMap');

  if (mapContainer && typeof L !== 'undefined') {
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
      { name: 'goldies', district: 'Neukölln', type: 'Burger', mustEat: 'Double Smashburger', address: 'Kienitzer Str. 2, 12047 Berlin', lat: 52.4818, lng: 13.4302 },
      { name: 'Berlin Burger International', district: 'Neukölln', type: 'Burger', mustEat: 'Classic Cheeseburger', address: 'Pannierstraße 5, 12047 Berlin', lat: 52.4799, lng: 13.4355 },
      { name: 'Lucky Katsu', district: 'Neukölln', type: 'Japanisch', mustEat: 'Tonkatsu Curry', address: 'Weserstraße 45, 12045 Berlin', lat: 52.4845, lng: 13.4370 },
      { name: 'CODA Dessert Dining', district: 'Neukölln', type: 'Fine Dining', mustEat: '7-Gang Dessert-Tasting-Menü', address: 'Friedelstraße 47, 12047 Berlin', lat: 52.4847, lng: 13.4312 },
      { name: "L'Eustache", district: 'Neukölln', type: 'Französisch', mustEat: 'Coq au Vin', address: 'Weserstraße 40, 12045 Berlin', lat: 52.4848, lng: 13.4365 },
      { name: 'Common', district: 'Neukölln', type: 'Café', mustEat: 'Pour Over & Banana Bread', address: 'Friedelstraße 14, 12047 Berlin', lat: 52.4845, lng: 13.4276 },
      { name: 'Pan Africa Restaurant', district: 'Neukölln', type: 'Afrikanisch', mustEat: 'Injera mit Doro Wot', address: 'Karl-Marx-Straße 109, 12043 Berlin', lat: 52.4754, lng: 13.4391 },
      { name: 'The Barn Café', district: 'Neukölln', type: 'Café', mustEat: 'Single Origin Filter Coffee', address: 'Friedelstraße 10, 12047 Berlin', lat: 52.4844, lng: 13.4272 },
      { name: 'onette', district: 'Schöneberg', type: 'Amerikanisch', mustEat: 'Buttermilk Pancakes', address: 'Grunewaldstr. 11, 10781 Berlin', lat: 52.4769, lng: 13.4375 },
      { name: 'La Bolognina', district: 'Neukölln', type: 'Pasta', mustEat: 'Tagliatelle al Ragù', address: 'Friedelstraße 48, 12047 Berlin', lat: 52.4848, lng: 13.4315 },
      { name: 'DoubleEye', district: 'Schöneberg', type: 'Café', mustEat: 'Doppelter Espresso & Kuchen', address: 'Hauptstraße 77, 10827 Berlin', lat: 52.4864, lng: 13.3538 },
      { name: 'Frühstück 3000', district: 'Schöneberg', type: 'Frühstück', mustEat: 'Full English Breakfast', address: 'Fuggerstraße 20, 10777 Berlin', lat: 52.4962, lng: 13.3558 },
      { name: 'Sardinen Bar', district: 'Tiergarten', type: 'Restaurant', mustEat: 'Sardinen & Meeresfrüchte-Platte', address: 'Lützowstraße 81, 10785 Berlin', lat: 52.5035, lng: 13.3628 },
      { name: 'Jones Ice Cream', district: 'Schöneberg', type: 'Eis', mustEat: 'Salted Caramel Eis', address: 'Goltzstraße 3, 10781 Berlin', lat: 52.4948, lng: 13.3520 },
      { name: 'Österelli', district: 'Schöneberg', type: 'Österreichisch', mustEat: 'Käsespätzle', address: 'Fuggerstraße 23, 10777 Berlin', lat: 52.4963, lng: 13.3560 },
      { name: 'AVIV 030', district: 'Neukölln', type: 'Levantinisch', mustEat: 'Falafel & Hummus Teller', address: 'Maaßenstraße 12, 10781 Berlin', lat: 52.4960, lng: 13.3536 },
      { name: "Jules Geisberg", district: 'Schöneberg', type: 'Café', mustEat: 'Café Crème & Tarte Tatin', address: 'Geisbergstraße 12, 10777 Berlin', lat: 52.4969, lng: 13.3532 },
      { name: "Philomeni's Greek Delicious", district: 'Schöneberg', type: 'Griechisch', mustEat: 'Souvlaki & Tzatziki', address: 'Hauptstraße 86, 10827 Berlin', lat: 52.4866, lng: 13.3548 },
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

    const foodMap = L.map('foodMap', {
      zoomControl: false,
      attributionControl: false,
    }).setView([52.5050, 13.4100], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(foodMap);

    L.control.zoom({ position: 'bottomright' }).addTo(foodMap);

    spots.forEach((spot, i) => {
      setTimeout(() => {
        const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(spot.name + ', ' + spot.address);
        const popupContent = '<div class="map-popup">' +
          '<div class="map-popup-district">' + spot.district + '</div>' +
          '<div class="map-popup-name">' + spot.name + '</div>' +
          '<div class="map-popup-type">' + spot.type + '</div>' +
          '<div class="map-popup-musteat">\u2192 ' + spot.mustEat + '</div>' +
          '<div class="map-popup-address">' + spot.address + '</div>' +
          '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="map-popup-btn">Open in Maps</a>' +
          '</div>';
        const icon = L.divIcon({ className: 'custom-marker', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -14] });
        const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(foodMap);
        marker.bindPopup(popupContent, { closeButton: false, maxWidth: 260 });
      }, i * 50);
    });
  }

  // --- News Filter ---
  const newsFilters = document.querySelectorAll('.news-filter');
  const newsFeatured = document.querySelector('.news-featured');
  const newsCards = document.querySelectorAll('.news-card');

  if (newsFilters.length) {
    newsFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        newsFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');

        const category = filter.dataset.filter;

        if (newsFeatured) {
          const featuredCat = newsFeatured.dataset.category;
          newsFeatured.style.display = (category === 'all' || featuredCat === category) ? '' : 'none';
        }

        newsCards.forEach(card => {
          const cardCat = card.dataset.category;
          if (category === 'all' || cardCat === category) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  // --- Back to Top ---
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 600) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Instagram Embeds (lazy load) ---
  const instaSection = document.querySelector('.insta-section');
  if (instaSection) {
    const instagramObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const script = document.createElement('script');
          script.src = 'https://www.instagram.com/embed.js';
          script.async = true;
          script.onload = () => {
            if (window.instgrm) window.instgrm.Embeds.process();
          };
          document.body.appendChild(script);
          instagramObserver.unobserve(instaSection);
        }
      });
    }, { rootMargin: '200px' });
    instagramObserver.observe(instaSection);
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

});

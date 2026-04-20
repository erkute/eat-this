// ─── EAT THIS Map + Globe initialiser ─────────────────────────────────────────
// Loaded lazily when user first opens the map page.
// Shared state via window._eatMap (getters/setters wired in app.js).
(function () {
  'use strict';
  const _m = window._eatMap;
  let foodMap; // local Leaflet instance — also written to _m.foodMap at creation

  function showGlobeIntro(onComplete) {
    if (typeof THREE === 'undefined' || _m.globeShown) {
      onComplete();
      return;
    }
    _m.globeShown = true;

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

    // Globe meteor @keyframes live in css/style.css (keeps CSP style-src strict)

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
    const mobileOffset = window.innerWidth <= _m.config.MOBILE_BREAKPOINT ? '90px' : '100px';
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

    // Safety timeout: if globe animation hangs (WebGL stall, low memory),
    // clean up and hand off to the map after 12 s.
    let animFrame, renderer; // hoisted so nested closures can reference them
    const globeTimeout = setTimeout(() => {
      clearTimeout(autoAdvanceTimer);
      if (animFrame) cancelAnimationFrame(animFrame);
      if (renderer) try { renderer.dispose(); } catch (_e) { /* ignore dispose errors */ }
      overlay.remove();
      mapEl.classList.remove('globe-active');
      mapEl.style.cssText = '';
      if (mapPage) mapPage.classList.remove('globe-active');
      if (locBtn) locBtn.style.display = '';
      if (zoomCtrl) zoomCtrl.style.display = '';
      onComplete();
    }, 12000);

    const aspect = w / h;
    // Portrait (mobile): keep globe just inside horizontal FOV
    // Landscape (desktop/tablet): bring globe much closer to fill screen height
    const globeStartZ = aspect >= 1 ? 5.5 : 6.8;
    const globeEndZ = aspect >= 1 ? 2.5 : 2.5;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
    camera.position.z = globeStartZ;

    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000);
    } catch {
      clearTimeout(globeTimeout);
      clearTimeout(autoAdvanceTimer);
      overlay.remove();
      mapEl.classList.remove('globe-active');
      mapEl.style.cssText = '';
      if (mapPage) mapPage.classList.remove('globe-active');
      onComplete();
      return;
    }

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
      clearTimeout(autoAdvanceTimer);
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

      _m.cmsReady.then(() => {
        setTimeout(() => {
          if (typeof initFoodMap === 'function') initFoodMap();
        }, 50);
      });
    }

    overlay.addEventListener('click', startZoom);
    // iOS Safari doesn't fire 'click' on divs — add touchend as fallback
    overlay.addEventListener('touchend', (e) => { e.preventDefault(); startZoom(); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && phase === 'idle') startZoom();
    });
    // Auto-advance after 3.5 s so the globe never blocks the map on slow/Safari devices
    const autoAdvanceTimer = setTimeout(startZoom, 3500);

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
          clearTimeout(globeTimeout);
          cancelAnimationFrame(animFrame);
          overlay.remove();
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
    if (_m.mapInitialized || typeof L === 'undefined') return;
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
      _m.showNotification(window.i18n ? window.i18n.t('map.errorMapLoad') : 'Could not load map');
      return;
    }
    _m.mapInitialized = true;
    _m.foodMap = foodMap;

    function mapTileUrl(dark) {
      return dark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
    const mapTileAttribution =
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>';

    let activeTileLayer = L.tileLayer(
      mapTileUrl(document.documentElement.getAttribute('data-theme') === 'dark'),
      { maxZoom: 19, attribution: mapTileAttribution, subdomains: 'abcd' }
    ).addTo(foodMap);

    document.addEventListener('themechange', (e) => {
      if (!foodMap) return;
      foodMap.removeLayer(activeTileLayer);
      activeTileLayer = L.tileLayer(
        mapTileUrl(e.detail.dark),
        { maxZoom: 19, attribution: mapTileAttribution, subdomains: 'abcd' }
      ).addTo(foodMap);
    });

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
    const defaultCenter = _m.config.BERLIN_CENTER;
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
    }, _m.config.GEO_FALLBACK_DELAY);

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
            _m.showNotification(
              msgs[err.code] ||
                (window.i18n ? window.i18n.t('map.locationError') : 'Could not get location')
            );
            setDefaultView();
          },
          {
            enableHighAccuracy: true,
            timeout: _m.config.GEO_TIMEOUT,
            maximumAge: _m.config.GEO_MAX_AGE,
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

    const logoIconSelected = L.icon({
      iconUrl: 'pics/point_red.webp',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });

    const markers = [];
    window._mapMarkers = markers;
    let _activeMarker = null;
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
        // Desktop map is narrowed to calc(100% - 360px) so the sidebar sits
        // beside it, not over it. The container centre is already the visual
        // centre — no horizontal offset needed.
        foodMap.flyTo([lat, lng], zoom, { animate: true, duration: 1 });
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
      // Highlight the tapped marker; reset the previous one
      const _matchId = spot._id || spot.name;
      const markerForSpot = markers.find(m => (m.spotData._id || m.spotData.name) === _matchId);
      if (_activeMarker && _activeMarker !== markerForSpot) {
        _activeMarker.setIcon(logoIcon);
      }
      if (markerForSpot) {
        markerForSpot.setIcon(logoIconSelected);
        _activeMarker = markerForSpot;
      }

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
      window.bodyOverflow.lock();
      _m.setActiveRestaurantSchema(spot);
    }
    window._showSpotDetail = showSpotDetail;
    window._navigateToPage = _m.navigateToPage;
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

    function minutesUntilOpen(openingHours) {
      if (!openingHours || !openingHours.length) return null;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const dayMap = { so:0,sun:0,sunday:0,sonntag:0,mo:1,mon:1,monday:1,montag:1,di:2,tue:2,tuesday:2,dienstag:2,mi:3,wed:3,wednesday:3,mittwoch:3,do:4,thu:4,thursday:4,donnerstag:4,fr:5,fri:5,friday:5,freitag:5,sa:6,sat:6,saturday:6,samstag:6 };
      function toDayNum(s) { return dayMap[s.toLowerCase().trim()] ?? null; }
      function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); }
      function matchesDay(days, d) {
        const dl = days.toLowerCase().replace(/\s/g, '');
        if (['täglich','daily','mo–so','mo-so','mon–sun','mon-sun','7days'].includes(dl)) return true;
        if (days.includes('–') || (days.includes('-') && days.length > 3)) {
          const sep = days.includes('–') ? '–' : '-';
          const [s, e] = days.split(sep).map((p) => toDayNum(p));
          if (s !== null && e !== null) return s <= e ? d >= s && d <= e : d >= s || d <= e;
        }
        return days.split(',').some((x) => toDayNum(x) === d);
      }
      let earliest = null;
      // Check today and the next 2 days to find next opening window
      for (let offset = 0; offset <= 2; offset++) {
        const checkDay = (dayOfWeek + offset) % 7;
        for (const slot of openingHours) {
          if (!matchesDay((slot.days || '').trim(), checkDay)) continue;
          const hours = (slot.hours || '').toLowerCase().trim();
          if (hours === 'closed' || hours === 'geschlossen' || hours === 'ruhetag') continue;
          const timeWindows = hours.split(',').map((w) => w.trim()).filter(Boolean);
          for (const tw of timeWindows) {
            const sep = tw.includes('–') ? '–' : '-';
            const parts = tw.split(sep).map((p) => p.trim());
            if (parts.length === 2) {
              const openMins = toMins(parts[0]);
              const totalMins = offset * 24 * 60 + openMins - currentMinutes;
              if (totalMins > 0 && (earliest === null || totalMins < earliest)) earliest = totalMins;
            }
          }
        }
        if (earliest !== null) break; // stop at first day with a result
      }
      return earliest;
    }

    function _renderNearbyGrid() {
      const gridEl = document.getElementById('mapNearbyGrid');
      if (!gridEl || _nearbyLat === null) return;

      const activeFilter = _mapActiveFilter;
      const searchQ = _mapSearchQuery.toLowerCase().trim();
      const sorted = _m.spots
        .map((s) => ({ ...s, dist: haversineDistance(_nearbyLat, _nearbyLng, s.lat, s.lng) }))
        .filter((s) => activeFilter === 'all' || (s.categories || []).includes(activeFilter))
        .filter((s) => {
          if (!searchQ) return true;
          const haystack = `${s.name} ${s.district} ${s.type} ${(s.categories || []).join(' ')}`.toLowerCase();
          return searchQ.split(' ').filter(Boolean).every((w) => haystack.includes(w));
        })
        .sort((a, b) => a.dist - b.dist);

      const openLabel = window.i18n ? window.i18n.t('map.open') : 'Open';
      const closedLabel = window.i18n ? window.i18n.t('map.closed') : 'Closed';

      const openCards = [];
      const closedCards = [];

      sorted.forEach((spot, idx) => {
        const distM = Math.round(spot.dist);
        const distLabel = distM < 1000 ? distM + 'm' : (spot.dist / 1000).toFixed(1) + 'km';
        const photo = spot.photo || getSpotPhoto(spot.type);
        const openStatus = isOpenNow(spot.openingHours);

        const card = document.createElement('div');
        card.className = 'map-nearby-card' + (openStatus === false ? ' map-nearby-card--closed' : '');
        card.dataset.idx = String(idx);

        const img = document.createElement('img');
        img.className = 'map-nearby-card-img';
        img.src = photo;
        img.alt = spot.name;
        img.loading = 'lazy';

        const body = document.createElement('div');
        body.className = 'map-nearby-card-body';

        const nameEl = document.createElement('div');
        nameEl.className = 'map-nearby-card-name';
        nameEl.textContent = spot.name;

        const cats = document.createElement('div');
        cats.className = 'map-nearby-card-cats';
        const catList = (spot.categories || []).filter(Boolean);
        cats.textContent = catList.length ? catList.join(' · ') : (spot.type || '');

        const foot = document.createElement('div');
        foot.className = 'map-nearby-card-foot';

        const metaLeft = document.createElement('span');
        metaLeft.className = 'map-nearby-card-meta';
        metaLeft.textContent = (spot.price ? spot.price + ' · ' : '') + distLabel;

        foot.appendChild(metaLeft);

        if (openStatus === true) {
          const statusEl = document.createElement('span');
          statusEl.className = 'map-nearby-card-status map-nearby-card-status--open';
          statusEl.textContent = openLabel;
          foot.appendChild(statusEl);
        } else if (openStatus === false) {
          const statusCol = document.createElement('div');
          statusCol.className = 'map-nearby-card-status-col';
          const closedEl = document.createElement('span');
          closedEl.className = 'map-nearby-card-status map-nearby-card-status--closed';
          closedEl.textContent = closedLabel;
          statusCol.appendChild(closedEl);
          const minsUntil = minutesUntilOpen(spot.openingHours);
          if (minsUntil !== null) {
            const opensEl = document.createElement('span');
            opensEl.className = 'map-nearby-card-opens';
            opensEl.textContent = 'opens in ' + (minsUntil < 60 ? Math.round(minsUntil) + 'min' : Math.round(minsUntil / 60) + 'h');
            statusCol.appendChild(opensEl);
          }
          foot.appendChild(statusCol);
        }

        body.appendChild(nameEl);
        body.appendChild(cats);
        body.appendChild(foot);
        card.appendChild(img);
        card.appendChild(body);

        card.addEventListener('click', () => {
          flyToWithSheetOffset(spot.lat, spot.lng, 15);
          showSpotDetail(spot);
        });

        if (openStatus === false) {
          closedCards.push(card);
        } else {
          openCards.push(card);
        }
      });

      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
      gridEl.classList.remove('map-nearby-grid--list');

      if (_mapOpenOnly && closedCards.length > 0) {
        openCards.forEach((c) => gridEl.appendChild(c));
        const divider = document.createElement('div');
        divider.className = 'map-nearby-divider';
        const line1 = document.createElement('div');
        line1.className = 'map-nearby-divider-line';
        const label = document.createElement('span');
        label.className = 'map-nearby-divider-text';
        label.textContent = 'Geschlossen';
        const line2 = document.createElement('div');
        line2.className = 'map-nearby-divider-line';
        divider.appendChild(line1);
        divider.appendChild(label);
        divider.appendChild(line2);
        gridEl.appendChild(divider);
        closedCards.forEach((c) => gridEl.appendChild(c));
      } else {
        openCards.forEach((c) => gridEl.appendChild(c));
        closedCards.forEach((c) => gridEl.appendChild(c));
      }
    }

    function _snapSheet(state, animate = true) {
      const sheet = document.getElementById('mapNearby');
      if (!sheet) return;
      _sheetState = state;
      sheet.classList.toggle('sheet--expanded', state === 'expanded');
      if (window.matchMedia('(min-width: 768px)').matches) {
        sheet.style.transform = '';
        sheet.style.transition = '';
        return;
      }
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

      // Note: previously we bound touchstart/touchmove on #foodMap to let
      // users swipe up from the map itself to raise the sheet. That broke
      // normal Leaflet panning (sheet moved every time the user panned the
      // map). Removed — users can still drag the sheet via its handle.

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
      // re-render once _m.cmsReady resolves and _m.spots become available.
      if (!_m.spots.length) {
        _m.cmsReady.then(() => {
          if (_m.spots.length > 0 && _nearbyLat !== null) {
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
      window.bodyOverflow.unlock();
      _m.setActiveRestaurantSchema(null);
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

    _m.spots.forEach(addSpotMarker);

    // Fallback: if CMS data wasn't ready when initFoodMap ran (e.g. slow mobile
    // network caused _m.cmsReady to resolve with an empty restaurants response),
    // try fetching restaurants directly and inject them after the fact.
    if (_m.spots.length === 0 && window.CMS) {
      window.CMS.fetchRestaurants().then((restaurants) => {
        if (!restaurants || !restaurants.length) return;
        _m.spots = restaurants.map((r) => ({ ...r, type: (r.categories || []).join(' · ') }));
        window._allSpots = _m.spots;
        _m.updateRestaurantsJsonLd(restaurants);
        _m.spots.forEach(addSpotMarker);
        // Update filter counts
        const countAllEl = document.getElementById('count-all');
        if (countAllEl) countAllEl.textContent = _m.spots.length;
        _updateChipCounts();
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

    // Filter chip strip — visible on both mobile and desktop
    const filterChips = document.getElementById('mapFilterChips');
    if (filterChips && filterChips.childElementCount === 0) {
      filterOptions.forEach((opt) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'map-filter-chip';
        chip.dataset.value = opt.dataset.value;
        if (opt.classList.contains('active')) chip.classList.add('active');
        const i18n = opt.getAttribute('data-i18n');
        if (i18n) chip.setAttribute('data-i18n', i18n);
        const labelEl = document.createElement('span');
        labelEl.className = 'map-filter-chip-label';
        labelEl.textContent = opt.textContent.trim();
        const countEl = document.createElement('span');
        countEl.className = 'map-filter-chip-count';
        countEl.textContent = '·';
        chip.appendChild(labelEl);
        chip.appendChild(countEl);
        chip.addEventListener('click', (e) => { e.stopPropagation(); _applyFilter(opt.dataset.value); });
        chip.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
        chip.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); _applyFilter(opt.dataset.value); });
        filterChips.appendChild(chip);
      });
    }
    const filterChipEls = filterChips ? filterChips.querySelectorAll('.map-filter-chip') : [];

    function _updateChipCounts() {
      if (!filterChips || !_m.spots.length) return;
      filterChipEls.forEach((chip) => {
        const val = chip.dataset.value;
        const count = val === 'all'
          ? _m.spots.length
          : _m.spots.filter((s) => (s.categories || []).includes(val)).length;
        const countEl = chip.querySelector('.map-filter-chip-count');
        if (countEl) countEl.textContent = count > 0 ? count : '';
      });
    }
    _updateChipCounts();

    function _applyFilter(value) {
      _mapActiveFilter = value;
      // Update label
      const chosen = document.querySelector(`.map-filter-option[data-value="${value}"]`);
      if (filterLabel && chosen) filterLabel.textContent = chosen.textContent.trim();
      // Update active state
      filterOptions.forEach((o) => o.classList.toggle('active', o.dataset.value === value));
      filterChipEls.forEach((c) => c.classList.toggle('active', c.dataset.value === value));
      // Auto-scroll active chip into view
      const activeChip = filterChips && filterChips.querySelector('.map-filter-chip.active');
      if (activeChip) activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

    // Open-now toggle switch
    const mapOpenToggle = document.getElementById('mapOpenToggle');
    if (mapOpenToggle) {
      mapOpenToggle.addEventListener('click', () => {
        _mapOpenOnly = !_mapOpenOnly;
        mapOpenToggle.classList.toggle('active', _mapOpenOnly);
        mapOpenToggle.setAttribute('aria-checked', _mapOpenOnly ? 'true' : 'false');
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
          _m.showNotification('Geolocation wird von diesem Gerät nicht unterstützt');
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
            _m.showNotification(msg);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      });
    }

    setTimeout(() => foodMap.invalidateSize(), 100);
  }


  window._mapFn = { showGlobeIntro, initFoodMap };
}());

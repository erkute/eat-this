// Auto-extracted from index.html body — trusted static content, not user input.
// Keep in sync with index.html when the SPA body changes.
export const spaBodyHTML = `    <a href="#appPages" class="skip-link" data-i18n="a11y.skip">Zum Inhalt springen</a>
    <!-- NAVBAR -->
    <nav class="navbar" id="navbar">
      <a href="#" class="navbar-brand" data-page="start">
        <img
          src="pics/eat.webp"
          alt="EAT THIS"
          class="brand-logo"
          width="36"
          height="36"
          decoding="async"
        />
      </a>
      <div class="navbar-actions">
        <button class="navbar-icon-btn" id="navNewsBtn" aria-label="News">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
          </svg>
        </button>
        <button class="navbar-icon-btn" id="navMapBtn" aria-label="Map">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/>
            <line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
        </button>
        <button class="navbar-icon-btn" id="navMustsBtn" aria-label="Eat This">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
            <path d="M7 2v20"/>
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
          </svg>
        </button>
        <button class="navbar-icon-btn" id="navProfileBtn" aria-label="Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <button class="burger-btn" id="burgerBtn" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>

    <!-- APP PAGES CONTAINER -->
    <div class="app-pages" id="appPages">
      <div class="app-page active" data-page="start">
        <header class="hero">
          <div class="hero-overlay"></div>
          <div class="hero-brand-block">
            <img class="hero-mobile-logo" src="pics/logo2.webp" alt="EAT THIS" fetchpriority="high" decoding="sync" width="1815" height="576">
            <p class="hero-desktop-tagline">We tell you what to eat</p>
          </div>
          <div class="hero-scroll-hint">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </header>

        <!-- SCROLL SECTIONS -->
        <div class="start-scroll-content">
          <!-- Scroll hint (mobile only) -->
          <div class="start-scroll-hint">
            <div class="start-scroll-hint-line"></div>
            <div class="start-scroll-hint-text">Scroll</div>
          </div>

          <!-- 1. Intro -->
          <div class="start-section">
            <div class="start-editorial-row">
              <div class="start-editorial-text">
                <span class="start-section-label" data-i18n="start.section1Label">Eat This</span>
                <h2 class="start-section-title" data-i18n="start.section1Title">
                  Probably the BEST food guide you know.
                </h2>
                <p class="start-section-body" data-i18n="start.section1Body">
                  The most curated selection of Must-Eats in Berlin. Discover the city via our
                  interactive map and start building your deck.
                </p>
              </div>
              <div class="start-img-wrap tall">
                <img
                  id="startImg1"
                  src="pics/about/tablecard.webp"
                  alt="Eat This Berlin"
                  class="start-img"
                  style="object-position: center 72%"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          <div class="start-section start-section--alt">
            <div class="start-editorial-row start-editorial-row--reverse">
              <div class="start-editorial-text">
                <span class="start-section-label" data-i18n="start.section2Label">The Concept</span>
                <h2 class="start-section-title" data-i18n="start.section2Title">
                  Just order this.
                </h2>
                <div class="start-section-body">
                  <p data-i18n="start.section2Body1">
                    We hunt down the outstanding dishes. Every Must-Eat Card in your collection
                    represents a recommendation we stand behind—from single iconic plates to entire
                    "Menu Approved" spots.
                  </p>
                  <p data-i18n="start.section2Body2">
                    Register to unlock your first Booster Pack including 10 free Must-Eat Cards.
                    Collect them all, explore the map, and master the Berlin food scene.
                  </p>
                </div>
              </div>
              <div class="start-img-wrap tall">
                <img
                  id="startImg2"
                  src="pics/about/cards.webp"
                  alt="Must-Eat Cards"
                  class="start-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          <div class="start-section">
            <span class="start-section-label" data-i18n="start.section4Label">Our Standards</span>
            <div class="start-philo-list">
              <div class="start-philo-item">
                <div class="start-philo-num">01</div>
                <div>
                  <div class="start-philo-title" data-i18n="start.philo1Title">Pure Curation.</div>
                  <div class="start-philo-text" data-i18n="start.philo1Text">
                    One rule: only the best food. We visit, we taste, we select. If it's not
                    outstanding, it doesn't get a card.
                  </div>
                </div>
              </div>
              <div class="start-philo-item">
                <div class="start-philo-num">02</div>
                <div>
                  <div class="start-philo-title" data-i18n="start.philo2Title">The Deck.</div>
                  <div class="start-philo-text" data-i18n="start.philo2Text">
                    Hundreds of Must-Eats to discover. Build your personal archive of the city's
                    finest restaurants and cafés.
                  </div>
                </div>
              </div>
              <div class="start-philo-item">
                <div class="start-philo-num">03</div>
                <div>
                  <div class="start-philo-title" data-i18n="start.philo3Title">
                    Always Independent.
                  </div>
                  <div class="start-philo-text" data-i18n="start.philo3Text">
                    No paid placements. We tell you what to eat based on quality, nothing else.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="start-section">
            <div class="start-editorial-row">
              <div class="start-editorial-text">
                <span class="start-section-label" data-i18n="start.section5Label">How we choose</span>
                <h2 class="start-section-title" data-i18n="start.section5Title">
                  Only the best makes the deck.
                </h2>
                <p class="start-section-body" data-i18n="start.section5Body1">
                  We visit every place ourselves and talk to the chefs to find the dishes that stand out.
                </p>
              </div>
              <div class="start-img-wrap tall">
                <img
                  id="startImg5"
                  src="pics/about/dinner.webp"
                  alt="Curation process"
                  class="start-img"
                  style="object-position: center 60%"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          <div class="start-section start-section--alt">
            <span class="start-section-label" data-i18n="start.section6Label">What's next</span>
            <h2 class="start-section-title" data-i18n="start.section6Title">
              Berlin is just<br />the first deck.
            </h2>
            <p class="start-section-body" data-i18n="start.section6Body1">
              We are expanding city by city. More decks, more Must-Eats, and exclusive Merch coming
              soon.
            </p>
          </div>

          <!-- NEWSLETTER SECTION -->
          <section class="newsletter-section" id="newsletterSection">
            <p class="newsletter-eyebrow" data-i18n="newsletter.eyebrow">Stay in the loop</p>
            <p class="newsletter-title" data-i18n="newsletter.title">New Must-Eats, every week.</p>
            <p class="newsletter-sub" data-i18n="newsletter.sub">
              Get the latest Berlin spots delivered to your inbox — plus a free bonus card pack.
            </p>
            <form class="newsletter-form" id="newsletterForm" novalidate>
              <input
                class="newsletter-input"
                id="newsletterEmail"
                type="email"
                placeholder="your@email.com"
                data-i18n-placeholder="newsletter.placeholder"
                autocomplete="email"
              />
              <button class="newsletter-btn" id="newsletterSubmit" type="submit" data-i18n="newsletter.cta">Subscribe</button>
            </form>
            <p class="newsletter-error" id="newsletterError" hidden data-i18n="newsletter.error">Please enter a valid email address.</p>
            <p class="newsletter-success" id="newsletterSuccess" hidden data-i18n="newsletter.success">You're in! Check your inbox.</p>
          </section>

        <!-- END SCROLL SECTIONS -->
        </div>
      </div>

      <div class="app-page" data-page="musts">
        <section class="must-eats-section" id="must-eats">
          <div class="must-eats-header">
            <p class="section-label reveal" data-i18n="musts.sectionLabel">Berlin</p>
            <img
              src="pics/logo2.webp"
              alt="EAT THIS"
              class="must-eats-logo-img"
              width="1815"
              height="576"
              loading="lazy"
              decoding="async"
            />
            <div class="album-head-count">
              <span class="album-head-n" id="albumProgCount">0</span>
              <span class="album-head-total">/ 150</span>
            </div>
          </div>

          <div class="album-grid" id="albumGrid">
            <!-- populated by js/app.js -->
          </div>
        </section>
      </div>

      <div class="app-page" data-page="news">
        <section class="news-section" id="news">
          <div class="news-header">
            <div class="news-header-top">
              <p class="section-label reveal" data-i18n="news.sectionLabel">Berlin</p>
              <h2
                class="news-title"
                data-i18n="news.sectionTitle"
              >
                Food News
              </h2>
            </div>
          </div>

          <!-- News ticker — populated by JS after cards load -->
          <div class="news-ticker" aria-hidden="true"></div>

          <!-- News Grid -->
          <div class="news-grid reveal-stagger">
            <!-- populated by js/i18n.js -->
          </div>
        </section>
      </div>
      <!-- /.app-page[news] -->

      <div class="app-page" data-page="map">
        <section class="map-section" id="map">
          <div class="map-container" id="foodMap">
            <button
              class="map-location-btn-fixed"
              id="mapLocationBtnFixed"
              aria-label="My location"
              data-i18n-aria="map.myLocationAriaLabel"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </button>
          </div>
          <div class="map-zoom-btns">
            <button class="map-zoom-btn" id="mapZoomIn" aria-label="Zoom in">+</button>
            <button class="map-zoom-btn" id="mapZoomOut" aria-label="Zoom out">−</button>
          </div>
          <div class="map-nearby" id="mapNearby">
            <div class="map-nearby-handle" id="mapNearbyHandle">
              <div class="map-nearby-handle-bar"></div>
            </div>
            <div class="map-nearby-toolbar">
              <div class="map-search-wrap">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="map-search-icon">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" id="mapSearchInput" class="map-search-input" placeholder="Restaurant, Bezirk, Pizza…" data-i18n-placeholder="map.searchPlaceholder" autocomplete="off" />
              </div>
              <div class="map-filter-chips" id="mapFilterChips" role="tablist" aria-label="Category filters"></div>
              <div class="map-filter-dropdown" id="mapFilterDropdown">
                <button type="button" class="map-filter-dropdown-btn" id="mapFilterBtn">
                  <span id="mapFilterLabel" data-i18n="map.filterAll">All</span>
                  <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 1l4 4 4-4"/></svg>
                </button>
                <div class="map-filter-dropdown-menu" id="mapFilterMenu">
                  <button type="button" class="map-filter-option active" data-value="all" data-i18n="map.filterAll">All</button>
                  <button type="button" class="map-filter-option" data-value="Dinner" data-i18n="map.filterDinner">Dinner</button>
                  <button type="button" class="map-filter-option" data-value="Lunch" data-i18n="map.filterLunch">Lunch</button>
                  <button type="button" class="map-filter-option" data-value="Coffee" data-i18n="map.filterCoffee">Coffee</button>
                  <button type="button" class="map-filter-option" data-value="Breakfast" data-i18n="map.filterBreakfast">Breakfast</button>
                  <button type="button" class="map-filter-option" data-value="Sweets" data-i18n="map.filterSweets">Sweets</button>
                  <button type="button" class="map-filter-option" data-value="Pizza" data-i18n="map.filterPizza">Pizza</button>
                </div>
              </div>
              <div id="mapOpenToggle" class="map-open-switch" role="switch" aria-checked="false" tabindex="0">
                <div class="map-switch-track"><div class="map-switch-thumb"></div></div>
                <span class="map-switch-label" data-i18n="map.openNow">Offen</span>
              </div>
            </div>
            <div class="map-nearby-grid-wrapper">
              <div class="map-nearby-grid" id="mapNearbyGrid"></div>
            </div>
          </div>
          <div class="map-spot-overlay" id="mapSpotOverlay">
            <div class="map-spot-card" id="mapSpotCard">
              <button class="map-spot-close" id="mapSpotClose" aria-label="Close">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div class="map-spot-content" id="mapSpotContent"></div>
            </div>
          </div>
        </section>
      </div>

      <!-- ═══════════════════════════════════════════
           PROFILE PAGE
           ═══════════════════════════════════════════ -->
      <div class="app-page" data-page="profile" id="profilePage">

        <!-- Logged-in state -->
        <div class="profile-content" id="profileContent" hidden>

          <div class="profile-header">
            <div class="profile-avatar" id="profileAvatar">
              <span id="profileAvatarInitial">?</span>
            </div>
            <div class="profile-header-info">
              <h1 class="profile-name" id="profileName">&#8212;</h1>
              <p class="profile-email" id="profileEmail">&#8212;</p>
            </div>
          </div>

          <div class="profile-tabs" role="tablist">
            <button class="profile-tab active" role="tab" data-tab="deck"
                    aria-selected="true" data-i18n="profile.tab.deck">Mein Deck</button>
            <button class="profile-tab" role="tab" data-tab="saved"
                    aria-selected="false" data-i18n="profile.tab.saved">Gespeichert</button>
            <button class="profile-tab" role="tab" data-tab="settings"
                    aria-selected="false" data-i18n="profile.tab.settings">Einstellungen</button>
          </div>

          <!-- Tab: Deck -->
          <div class="profile-tab-panel active" data-panel="deck" role="tabpanel">
            <div id="profilePackList"></div>
            <div class="profile-booster-section" id="profileBoosterSection" hidden>
              <h3 class="profile-booster-section-title" data-i18n="profile.deck.boosterSection">Booster Packs</h3>
              <div class="profile-booster-grid" id="profileBoosterGrid"></div>
            </div>
          </div>

          <!-- Tab: Gespeichert -->
          <div class="profile-tab-panel" data-panel="saved" role="tabpanel" hidden>
            <div class="profile-favs-grid" id="profileFavsGrid"></div>
            <p class="profile-saved-empty" id="profileSavedEmpty" hidden
               data-i18n="profile.saved.empty">Du hast noch keine Restaurants gespeichert.</p>
          </div>

          <!-- Tab: Einstellungen -->
          <div class="profile-tab-panel" data-panel="settings" role="tabpanel" hidden>
            <div class="profile-settings">

              <div class="profile-settings-section">
                <h3 class="profile-settings-section-title">Account</h3>
                <div class="profile-settings-field">
                  <label class="profile-settings-label" data-i18n="profile.settings.displayName">Display name</label>
                  <div class="profile-settings-row">
                    <input type="text" class="profile-settings-input"
                           id="profileDisplayNameInput"
                           placeholder="Your name"
                           data-i18n-placeholder="profile.settings.displayNamePlaceholder"
                           autocomplete="name" />
                    <button class="profile-settings-save-btn" id="profileSaveNameBtn"
                            data-i18n="profile.settings.saveBtn">Save</button>
                  </div>
                  <p class="profile-settings-feedback" id="profileNameFeedback" hidden></p>
                </div>
                <div class="profile-settings-field">
                  <label class="profile-settings-label" data-i18n="profile.settings.email">Email</label>
                  <p class="profile-settings-value" id="profileSettingsEmail">&#8212;</p>
                </div>
              </div>

              <div class="profile-settings-section">
                <h3 class="profile-settings-section-title" data-i18n="profile.settings.security">Security</h3>
                <button class="profile-settings-action-btn"
                        id="profileResetPasswordBtn"
                        data-i18n="profile.settings.resetPassword">Reset password</button>
                <p class="profile-settings-feedback" id="profilePasswordFeedback" hidden></p>
              </div>

              <div class="profile-settings-section profile-settings-section--danger">
                <h3 class="profile-settings-section-title">Danger Zone</h3>
                <button class="profile-settings-signout-btn" id="profileSignOutBtn"
                        data-i18n="profile.settings.signOut">Sign out</button>
                <button class="profile-settings-delete-btn"
                        id="profileDeleteAccountBtn"
                        data-i18n="profile.settings.deleteAccount">Delete account</button>
              </div>

            </div>
          </div>

        </div><!-- /profile-content -->
      </div><!-- /profile page -->

      <!-- ═══════════════════════════════════════════
           STATIC PAGES (CMS-backed)
           ═══════════════════════════════════════════ -->

      <div class="app-page static-page" data-page="about" id="staticPageAbout">
        <div class="static-page-inner">

          <h1 class="static-page-title" id="staticPageAbout-title">Über Eat This</h1>
          <div class="static-page-body" id="staticPageAbout-body">
            <span class="static-page-loading">Loading&#8230;</span>
          </div>
        </div>
      </div>

      <div class="app-page static-page" data-page="contact" id="staticPageContact">
        <div class="static-page-inner">

          <h1 class="static-page-title" id="staticPageContact-title">Kontakt</h1>
          <div class="static-page-body" id="staticPageContact-body">
            <span class="static-page-loading">Loading&#8230;</span>
          </div>
        </div>
      </div>

      <div class="app-page static-page" data-page="press" id="staticPagePress">
        <div class="static-page-inner">

          <h1 class="static-page-title" id="staticPagePress-title">Presse</h1>
          <div class="static-page-body" id="staticPagePress-body">
            <span class="static-page-loading">Loading&#8230;</span>
          </div>
        </div>
      </div>

      <div class="app-page static-page" data-page="impressum" id="staticPageImpressum">
        <div class="static-page-inner">

          <h1 class="static-page-title" id="staticPageImpressum-title">Impressum</h1>
          <div class="static-page-body" id="staticPageImpressum-body">
            <span class="static-page-loading">Loading&#8230;</span>
          </div>
        </div>
      </div>

      <div class="app-page static-page" data-page="datenschutz" id="staticPageDatenschutz">
        <div class="static-page-inner">

          <h1 class="static-page-title" id="staticPageDatenschutz-title">Datenschutz</h1>
          <div class="static-page-body" id="staticPageDatenschutz-body">
            <span class="static-page-loading">Loading&#8230;</span>
          </div>
        </div>
      </div>

      <div class="app-page static-page" data-page="agb" id="staticPageAgb">
        <div class="static-page-inner">

          <h1 class="static-page-title" id="staticPageAgb-title">AGB</h1>
          <div class="static-page-body" id="staticPageAgb-body">
            <span class="static-page-loading">Loading&#8230;</span>
          </div>
        </div>
      </div>

      <!-- NEWS ARTICLE PAGE -->
      <div class="app-page news-article-page" data-page="news-article" id="newsModal">
        <article class="news-article">
          <div class="news-article-hero">
            <img id="newsModalImg" src="" alt="" />
          </div>
          <div class="news-article-body">
            <div class="news-article-meta">
              <span class="news-modal-category" id="newsModalCategory"></span>
              <time class="news-modal-date" id="newsModalDate"></time>
            </div>
            <h1 class="news-modal-title" id="newsModalTitle"></h1>
            <div class="news-modal-share" id="newsModalShare">
              <button class="share-btn share-twitter" id="shareTwitter" aria-label="Share on X">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              <button class="share-btn share-whatsapp" id="shareWhatsapp" aria-label="Share on WhatsApp">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <button class="share-btn share-native" id="shareNative" aria-label="Share">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
            <div class="news-modal-content" id="newsModalContent"></div>
          </div>
          <section class="news-article-more" id="newsArticleMore" hidden>
            <div class="news-article-more-inner">
              <p class="news-article-more-label" data-i18n="news.more">More from Eat This</p>
              <div class="news-article-more-grid" id="newsArticleMoreGrid"></div>
            </div>
          </section>
        </article>
      </div><!-- /news-article-page -->

    </div>

    <!-- SITE FOOTER TEMPLATE — stamped into every non-map page by app.js -->
    <template id="siteFooterTpl">
      <div class="site-footer" role="contentinfo" aria-label="Site footer">
        <a href="#" class="site-footer-logo-link" data-page="start" aria-label="Eat This home">
          <img src="pics/logo2.webp" alt="EAT THIS" class="site-footer-logo-img" width="1815" height="576" loading="lazy" decoding="async" />
        </a>
        <nav class="site-footer-links" aria-label="Footer navigation">
          <button class="site-footer-link" data-page="about" data-i18n="footer.about">About</button>
          <button class="site-footer-link" data-page="contact" data-i18n="footer.contact">Contact</button>
          <button class="site-footer-link" data-page="press" data-i18n="footer.press">Press</button>
          <span class="site-footer-divider" aria-hidden="true"></span>
          <button class="site-footer-link" data-page="impressum" data-i18n="footer.impressum">Impressum</button>
          <button class="site-footer-link" data-page="datenschutz" data-i18n="footer.datenschutz">Privacy</button>
          <button class="site-footer-link" data-page="agb" data-i18n="footer.agb">Terms</button>
        </nav>
        <div class="site-footer-meta">
          <div class="site-footer-meta-row">
            <button type="button" class="theme-toggle" id="themeToggleFooter" aria-label="Toggle dark mode">
              <span class="theme-toggle-track">
                <span class="theme-toggle-thumb"></span>
              </span>
              <span class="theme-toggle-label" data-i18n="theme.darkMode">Dark Mode</span>
            </button>
          </div>
          <div class="site-footer-meta-row">
            <a href="https://www.instagram.com/eatthisdotcom/" target="_blank"
               rel="noopener noreferrer" class="site-footer-ig" aria-label="Instagram @eatthisdotcom">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
              </svg>
              <span>@eatthisdotcom</span>
            </a>
            <div class="site-footer-lang" role="group" aria-label="Language / Sprache">
              <button class="site-footer-lang-btn" data-lang="de" aria-label="Deutsch">DE</button>
              <button class="site-footer-lang-btn" data-lang="en" aria-label="English">EN</button>
            </div>
          </div>
        </div>
        <p class="site-footer-copy" data-i18n="footer.copyright">&copy; 2026 Eat This. All rights reserved.</p>
      </div>
    </template>

    <!-- MUST EAT MODAL -->
    <div class="modal-overlay" id="eatModal">
      <div class="modal">
        <button class="modal-close" id="modalClose" aria-label="Close">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div class="modal-img">
          <img id="modalImg" src="" alt="" />
        </div>
        <div class="modal-body">
          <span class="modal-district" id="modalDistrict"></span>
          <h3 class="modal-dish" id="modalDish"></h3>
          <p class="modal-restaurant" id="modalRestaurant"></p>
          <p class="modal-address" id="modalAddress"></p>
          <p class="modal-desc" id="modalDesc"></p>
          <a class="modal-maps-btn" id="modalMapsBtn" href="#" target="_blank" rel="noopener noreferrer">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Open in Maps
          </a>
        </div>
      </div>
    </div>

    <!-- SEARCH -->
    <div class="search-overlay" id="searchOverlay">
      <div class="search-container">
        <div class="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            class="search-input"
            id="searchInput"
            placeholder="What are you craving?"
            autocomplete="off"
            data-i18n-placeholder="search.placeholder"
          />
          <button class="search-close" id="searchClose" aria-label="Close">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="search-results" id="searchResults">
          <div class="search-hint" data-i18n="search.hint">Start typing to search...</div>
        </div>
      </div>
    </div>

    <!-- BURGER MENU DRAWER -->
    <div class="burger-drawer" id="burgerDrawer">
      <div class="burger-drawer-backdrop" id="burgerBackdrop"></div>
      <div class="burger-drawer-panel">
        <button class="burger-drawer-close" id="burgerClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <nav class="burger-nav">
          <button class="burger-nav-item burger-nav-item--sm" id="openAbout" data-i18n="burger.about">About</button>
          <button class="burger-nav-item burger-nav-item--sm" id="openContact" data-i18n="burger.contact">Contact</button>
          <button class="burger-nav-item burger-nav-item--sm" id="openPress" data-i18n="burger.press">Press</button>
          <button class="burger-nav-item burger-nav-item--sm" id="openImpressum" data-i18n="burger.impressum">Impressum</button>
        </nav>
        <div class="burger-utils">
          <button class="burger-util-btn" id="burgerSearchTrigger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span data-i18n="search.placeholder">Search</span>
          </button>
          <a href="https://www.instagram.com/eatthisdotcom/" target="_blank" rel="noopener noreferrer" class="burger-util-btn burger-util-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            Instagram
          </a>
          <button class="burger-util-btn" id="loginBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span data-i18n="footer.signIn">Sign In</span>
          </button>
        </div>
        <div class="burger-theme-row">
          <button type="button" class="theme-toggle" id="themeToggleBurger" aria-label="Toggle dark mode">
            <span class="theme-toggle-track">
              <span class="theme-toggle-thumb"></span>
            </span>
            <span class="theme-toggle-label" data-i18n="theme.darkMode">Dark Mode</span>
          </button>
        </div>
        <div class="burger-lang-row">
          <div class="lang-switcher" id="langSwitcher" role="group" aria-label="Language / Sprache">
            <button class="lang-btn active" data-lang="en" aria-label="English">EN</button>
            <button class="lang-btn" data-lang="de" aria-label="Deutsch">DE</button>
          </div>
        </div>
        <div class="burger-drawer-footer">
          <button
            class="burger-drawer-footer-btn"
            id="openDatenschutzFromBurger"
            data-i18n="modals.datenschutz.title"
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            class="burger-drawer-footer-btn"
            id="openAgbFromBurger"
            data-i18n="modals.agb.title"
          >
            Terms & Conditions
          </button>
        </div>
      </div>
    </div>

    <!-- ABOUT MODAL -->
    <div class="login-modal" id="aboutModal">
      <div class="login-modal-backdrop" id="aboutBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="aboutClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.about.title">One dish. That's it.</h2>
        <div class="cookie-info-body" data-i18n-html="modals.about.body"></div>
      </div>
    </div>

    <!-- CONTACT MODAL -->
    <div class="login-modal" id="contactModal">
      <div class="login-modal-backdrop" id="contactBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="contactClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.contact.title">Get in touch</h2>
        <div class="cookie-info-body" data-i18n-html="modals.contact.body"></div>
      </div>
    </div>

    <!-- PRESS MODAL -->
    <div class="login-modal" id="pressModal">
      <div class="login-modal-backdrop" id="pressBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="pressClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.press.title">Press & Media</h2>
        <div class="cookie-info-body" data-i18n-html="modals.press.body"></div>
      </div>
    </div>

    <!-- IMPRESSUM MODAL -->
    <div class="login-modal" id="impressumModal">
      <div class="login-modal-backdrop" id="impressumBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="impressumClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.impressum.title">Impressum</h2>
        <div class="cookie-info-body" data-i18n-html="modals.impressum.body"></div>
      </div>
    </div>

    <!-- LOGIN MODAL -->
    <button id="agbTrigger" hidden aria-hidden="true"></button>
    <button id="datenschutzTrigger" hidden aria-hidden="true"></button>

    <!-- COOKIE CONSENT -->
    <div class="cookie-consent" id="cookieConsent">
      <div class="cookie-content">
        <p class="cookie-text">
          <span data-i18n="cookie.text">We use cookies to give you the best experience.</span>
          <button class="cookie-info-trigger" id="cookieInfoTrigger" data-i18n="cookie.moreInfo">
            Learn more
          </button>
        </p>
        <div class="cookie-buttons">
          <button class="cookie-btn cookie-btn-accept" id="cookieAccept" data-i18n="cookie.accept">
            Accept
          </button>
          <button
            class="cookie-btn cookie-btn-decline"
            id="cookieDecline"
            data-i18n="cookie.decline"
          >
            Decline
          </button>
        </div>
      </div>
    </div>

    <!-- COOKIE INFO MODAL -->
    <!-- AGB MODAL -->
    <div class="login-modal" id="agbModal">
      <div class="login-modal-backdrop" id="agbBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="agbClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.agb.title">
          Allgemeine Geschäftsbedingungen
        </h2>
        <div class="cookie-info-body" data-i18n-html="modals.agb.body"></div>
      </div>
    </div>

    <!-- DATENSCHUTZ MODAL -->
    <div class="login-modal" id="datenschutzModal">
      <div class="login-modal-backdrop" id="datenschutzBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="datenschutzClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.datenschutz.title">Datenschutz</h2>
        <div class="cookie-info-body" data-i18n-html="modals.datenschutz.body"></div>
      </div>
    </div>

    <div class="login-modal" id="cookieInfoModal">
      <div class="login-modal-backdrop" id="cookieInfoBackdrop"></div>
      <div class="login-modal-content cookie-info-modal-content">
        <button class="login-modal-close" id="cookieInfoClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 class="cookie-info-title" data-i18n="modals.cookies.title">Cookie Policy</h2>
        <div class="cookie-info-body" data-i18n-html="modals.cookies.body"></div>
      </div>
    </div>

    <!-- ONBOARDING OVERLAY -->
<div class="ob-overlay" id="onboardingOverlay" hidden role="dialog" aria-modal="true" aria-label="Welcome to Eat This">

  <div class="ob-panel">
    <!-- Step 1: News -->
    <div class="ob-step" id="obStep1">
      <p class="ob-step-num">1 of 4</p>
      <div class="ob-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
          <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
        </svg>
      </div>
      <p class="ob-title">Berlin food news</p>
      <p class="ob-body">New openings, hidden gems, guides.</p>
      <div class="ob-dots">
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obNext1">Next</button>
        <button class="ob-skip-btn" id="obSkip1">Skip intro</button>
      </div>
    </div>

    <!-- Step 2: Map -->
    <div class="ob-step" id="obStep2" hidden>
      <p class="ob-step-num">2 of 4</p>
      <div class="ob-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/>
          <line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
      </div>
      <p class="ob-title">Spots on the map</p>
      <p class="ob-body">Berlin's best food map. Filter by category.</p>
      <div class="ob-dots">
        <span class="ob-dot"></span>
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obNext2">Next</button>
        <button class="ob-skip-btn" id="obSkip2">Skip intro</button>
      </div>
    </div>

    <!-- Step 3: Album -->
    <div class="ob-step" id="obStep3" hidden>
      <p class="ob-step-num">3 of 4</p>
      <div class="ob-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M2 9h20"/>
        </svg>
      </div>
      <p class="ob-title">Must-Eat Album</p>
      <p class="ob-body">156 dishes. Collect them all.</p>
      <div class="ob-dots">
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot active"></span>
        <span class="ob-dot"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obNext3">Next</button>
        <button class="ob-skip-btn" id="obSkip3">Skip intro</button>
      </div>
    </div>

    <!-- Step 4: Booster Pack -->
    <div class="ob-step" id="obStep4" hidden>
      <p class="ob-step-num">4 of 4</p>
      <div class="ob-icon ob-icon--star">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <p class="ob-title">Your Booster Pack is ready.</p>
      <p class="ob-body">10 free cards are waiting for you.</p>

      <div class="ob-pack-wrap">
        <div class="ob-pack-stack">
          <div class="ob-pack-shadow ob-pack-shadow--far"></div>
          <div class="ob-pack-shadow ob-pack-shadow--near"></div>
          <div class="ob-pack-body">
            <div class="ob-pack-stripe"></div>
            <div class="ob-pack-brand">Eat This</div>
            <div class="ob-pack-content">
              <div class="ob-pack-num">10</div>
              <div class="ob-pack-cards-lbl">Cards</div>
              <div class="ob-pack-divider"></div>
              <div class="ob-pack-type">Booster Pack</div>
            </div>
          </div>
        </div>
        <p class="ob-pack-tap">Tap to open</p>
      </div>

      <div class="ob-dots">
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot"></span>
        <span class="ob-dot active"></span>
      </div>
      <div class="ob-footer">
        <button class="ob-next-btn" id="obOpenPackBtn">Open Starter Pack</button>
      </div>
    </div>
  </div>

</div>

    <!-- WELCOME MODAL — Neukundenakquise -->
    <div class="wm-overlay" id="welcomeModal" aria-modal="true" role="dialog" aria-label="Welcome to Eat This">
      <div class="wm-backdrop" id="wmBackdrop"></div>
      <div class="wm-dialog">

        <!-- Full-screen hero background -->
        <img src="pics/login/Black screen.webp" alt="" class="wm-hero-img" decoding="async">

        <!-- Close -->
        <button class="wm-close" id="wmClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Logo centred top -->
        <div class="wm-hero-logo-wrap">
          <img src="pics/login/eat 1.webp" alt="Eat This" class="wm-hero-logo">
        </div>

        <!-- Landing: headline + 3 CTAs overlaid on photo -->
        <div class="wm-landing" id="wmLanding">
          <p class="wm-hero-headline">Hundreds of Must Eats<br>to discover</p>
          <button class="wm-cta-primary" id="wmSignupCta" data-i18n="modals.login.landingSignup">Sign up</button>
          <button class="wm-cta-google" id="wmGoogleBtn">
            <img src="pics/login/Google.webp" alt="" class="wm-google-icon" width="18" height="18">
            <span data-i18n="modals.login.googleBtn">Continue with Google</span>
          </button>
          <button class="wm-cta-text" id="wmLoginCta" data-i18n="modals.login.landingLogin">Log in</button>
        </div>

        <!-- Form panel: revealed on Sign up / Log in -->
        <div class="wm-form-panel" id="wmFormPanel" hidden>
          <button class="wm-back" id="wmBackBtn" type="button" data-i18n-aria="modals.login.backBtn" aria-label="Back">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span data-i18n="modals.login.backBtn">Back</span>
          </button>
          <div class="wm-form-wrap">
            <h2 class="wm-form-title" id="wmFormTitle" data-i18n="modals.login.titleRegister">Create account</h2>
            <p class="wm-booster-hint" id="wmBoosterHint" data-i18n="modals.login.subtitleRegister">Get your first Starter Pack — 10 Must-Eat Cards, free.</p>

            <form class="wm-email-form" id="wmEmailForm" novalidate>
              <div class="wm-field" id="wmNameField">
                <input type="text" id="wmName" placeholder="Name" data-i18n-placeholder="modals.login.namePlaceholder" autocomplete="name" aria-label="Name">
              </div>
              <div class="wm-field">
                <input type="email" id="wmEmail" placeholder="Email" required data-i18n-placeholder="modals.login.emailPlaceholder" autocomplete="email" aria-label="Email">
              </div>
              <div class="wm-field" id="wmPasswordField">
                <input type="password" id="wmPassword" placeholder="Password" required data-i18n-placeholder="modals.login.passwordPlaceholder" autocomplete="new-password" minlength="6" aria-label="Password">
              </div>
              <p class="wm-forgot" id="wmForgot" hidden>
                <button type="button" id="wmForgotBtn" data-i18n="modals.login.forgotPassword">Forgot password?</button>
              </p>
              <p class="wm-msg wm-error" id="wmError"></p>
              <p class="wm-msg wm-success" id="wmSuccess"></p>
              <button type="submit" class="wm-submit">
                <span id="wmSubmitText">Create account</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </form>

            <p class="wm-mode-toggle" id="wmModeToggle"></p>

            <p class="wm-terms">
              <span data-i18n="modals.login.termsText">By signing up, you agree to our</span>
              <button class="wm-terms-link" id="wmAgbTrigger" data-i18n="modals.login.termsLink">Terms</button>
              <span data-i18n="modals.login.termsAnd">and</span>
              <button class="wm-terms-link" id="wmDatenschutzTrigger" data-i18n="modals.login.privacyLink">Privacy Policy</button><span>.</span>
            </p>
          </div>
        </div>

      </div>
    </div>

`;

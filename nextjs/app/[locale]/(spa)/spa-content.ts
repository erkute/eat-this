// Auto-extracted from index.html body — trusted static content, not user input.
// Keep in sync with index.html when the SPA body changes.
//
// SiteNav, HeroSection, SiteFooter, StartSections, and NewsSection are React
// components (see app/components/). This file exposes the remaining HTML as
// template strings rendered by SPAShell.

// Profile page shell — populated client-side by auth.min.js after hydration.
// Still raw HTML because the tab panels / saved / settings fields are all
// imperatively filled by legacy JS. Will become <ProfileSection /> when the
// auth.min.js UI is ported.
export const profilePageHTML = `
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

`;

// Modals, drawers, onboarding overlay, welcome modal, and vanilla JS scripts.
// Footer template — app.min.js stamps this into every non-map .app-page that
// does not already contain a .site-footer. Start page uses the React SiteFooter;
// news/static/musts/profile/etc. pages get the stamped template.
export const templatesAndModalsHTML = `
    <template id="siteFooterTpl">
      <div class="site-footer" role="contentinfo" aria-label="Site footer">
        <a href="#" class="site-footer-logo-link" data-page="start" aria-label="Eat This home">
          <img src="/pics/logo2.webp" alt="EAT THIS" class="site-footer-logo-img" width="1815" height="576" loading="lazy" decoding="async" />
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
            <button type="button" class="theme-toggle" aria-label="Toggle dark mode">
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

    <!-- BURGER MENU DRAWER is now rendered by <BurgerDrawer /> React component -->
    <!-- About/Contact/Press/Impressum modals removed in Phase B: the burger
         menu links directly to the full React pages at /about, /contact, etc.
         agbTrigger + datenschutzTrigger stay — the welcome-modal registration
         flow's wmAgbTrigger / wmDatenschutzTrigger click them to open the
         inline Terms/Privacy modals without leaving the signup. -->
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

    <!-- DATENSCHUTZ MODAL — kept for welcome-modal's wmDatenschutzTrigger.
         Full /datenschutz page exists too; this is the inline version for
         signup. -->
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

    <!-- COOKIE INFO MODAL -->
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
        <img src="/pics/login/Black screen.webp" alt="" class="wm-hero-img" decoding="async">

        <!-- Close -->
        <button class="wm-close" id="wmClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Logo centred top -->
        <div class="wm-hero-logo-wrap">
          <img src="/pics/login/eat 1.webp" alt="Eat This" class="wm-hero-logo">
        </div>

        <!-- Landing: headline + 3 CTAs overlaid on photo -->
        <div class="wm-landing" id="wmLanding">
          <p class="wm-hero-headline">Hundreds of Must Eats<br>to discover</p>
          <button class="wm-cta-primary" id="wmSignupCta" data-i18n="modals.login.landingSignup">Sign up</button>
          <button class="wm-cta-google" id="wmGoogleBtn">
            <img src="/pics/login/Google.webp" alt="" class="wm-google-icon" width="18" height="18">
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

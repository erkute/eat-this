'use client';

import { useTranslation } from '@/lib/i18n';
import SiteFooter from './SiteFooter';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/map/useFavorites';

interface Props {
  isActive?: boolean;
}

// Shell for the Profile page. Content (avatar initial, name, email, deck,
// favourites, settings values) is populated imperatively by auth.min.js
// after Firebase auth resolves; this component only owns the static
// scaffolding and its i18n strings. IDs preserved for the legacy binder.
export default function ProfileSection({ isActive = false }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { favorites, favoriteIds, toggle: toggleFavorite } = useFavorites(uid);
  return (
    <div className={`app-page${isActive ? ' active' : ''}`} data-page="profile" id="profilePage" suppressHydrationWarning>
      {/* Logged-in state — auth.min.js unhides this when a user is present */}
      <div className="profile-content" id="profileContent" hidden>
        <div className="profile-header">
          <div className="profile-avatar" id="profileAvatar">
            <span id="profileAvatarInitial">?</span>
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name" id="profileName">—</h1>
            <p className="profile-email" id="profileEmail">—</p>
          </div>
        </div>

        <div className="profile-tabs" role="tablist">
          <button className="profile-tab active" role="tab" data-tab="deck" aria-selected="true">
            {t('profile.tab.deck')}
          </button>
          <button className="profile-tab" role="tab" data-tab="saved" aria-selected="false">
            {t('profile.tab.saved')}
          </button>
          <button className="profile-tab" role="tab" data-tab="settings" aria-selected="false">
            {t('profile.tab.settings')}
          </button>
        </div>

        {/* Tab: Deck */}
        <div className="profile-tab-panel active" data-panel="deck" role="tabpanel">
          <div id="profilePackList"></div>
          <div className="profile-booster-section" id="profileBoosterSection" hidden>
            <h3 className="profile-booster-section-title">{t('profile.deck.boosterSection')}</h3>
            <div className="profile-booster-grid" id="profileBoosterGrid"></div>
          </div>
        </div>

        {/* Tab: Saved */}
        <div className="profile-tab-panel" data-panel="saved" role="tabpanel" hidden>
          {favorites.length === 0 ? (
            <p className="profile-saved-empty">
              {t('profile.saved.empty')}
            </p>
          ) : (
            <div className="profile-favs-grid">
              {favorites.map(f => (
                <div key={f.restaurantId} className="profile-fav-card">
                  {f.photo ? (
                    <img src={f.photo} alt="" className="profile-fav-card-img" loading="lazy" />
                  ) : (
                    <div className="profile-fav-card-placeholder" aria-hidden="true">🍽</div>
                  )}
                  <div className="profile-fav-card-overlay">
                    <span className="profile-fav-name">{f.name}</span>
                    {f.district && <span className="profile-fav-district">{f.district}</span>}
                  </div>
                  <button
                    type="button"
                    className="profile-fav-remove"
                    aria-label="Remove from saved"
                    onClick={() => toggleFavorite({ _id: f.restaurantId, name: f.name, photo: f.photo, district: f.district })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab: Settings */}
        <div className="profile-tab-panel" data-panel="settings" role="tabpanel" hidden>
          <div className="profile-settings">
            <div className="profile-settings-section">
              <h3 className="profile-settings-section-title">Account</h3>
              <div className="profile-settings-field">
                <label className="profile-settings-label">{t('profile.settings.displayName')}</label>
                <div className="profile-settings-row">
                  <input
                    type="text"
                    className="profile-settings-input"
                    id="profileDisplayNameInput"
                    placeholder={t('profile.settings.displayNamePlaceholder')}
                    autoComplete="name"
                  />
                  <button className="profile-settings-save-btn" id="profileSaveNameBtn">
                    {t('profile.settings.saveBtn')}
                  </button>
                </div>
                <p className="profile-settings-feedback" id="profileNameFeedback" hidden></p>
              </div>
              <div className="profile-settings-field">
                <label className="profile-settings-label">{t('profile.settings.email')}</label>
                <p className="profile-settings-value" id="profileSettingsEmail">—</p>
              </div>
            </div>

            <div className="profile-settings-section">
              <h3 className="profile-settings-section-title">{t('profile.settings.security')}</h3>
              <button className="profile-settings-action-btn" id="profileResetPasswordBtn">
                {t('profile.settings.resetPassword')}
              </button>
              <p className="profile-settings-feedback" id="profilePasswordFeedback" hidden></p>
            </div>

            <div className="profile-settings-section profile-settings-section--danger">
              <h3 className="profile-settings-section-title">Danger Zone</h3>
              <button className="profile-settings-signout-btn" id="profileSignOutBtn">
                {t('profile.settings.signOut')}
              </button>
              <button className="profile-settings-delete-btn" id="profileDeleteAccountBtn">
                {t('profile.settings.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

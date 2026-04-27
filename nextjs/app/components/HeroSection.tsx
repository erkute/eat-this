import HeroForm from '@/app/components/landing/HeroForm';
import landingStyles from '@/app/components/landing/landing.module.css';

export default function HeroSection() {
  return (
    <header className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-brand-block">
        <img
          className="hero-mobile-logo"
          src="/pics/logo2.webp"
          alt="EAT THIS"
          fetchPriority="high"
          decoding="sync"
          width={1815}
          height={576}
        />
        <p className="hero-desktop-tagline">We tell you what to eat</p>
        {/* Desktop-only headline + signup form, overlaid on the hero image */}
        <div className={landingStyles.heroDesktopExtra}>
          <h2 className={landingStyles.heroDesktopHeadline}>
            Wahrscheinlich der beste Foodguide, den du kennst.
          </h2>
          <p className={landingStyles.heroDesktopSubtitle}>
            Eine kuratierte Sammlung der besten Berliner Restaurants und Cafés.
          </p>
          <HeroForm />
        </div>
      </div>
      <div className="hero-scroll-hint">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </header>
  );
}

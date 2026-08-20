/* Icons for the restaurant action rows — the public /restaurant/[slug] page
   and the map detail sheet, which share one button system. Same drawing style
   as app/components/map/icons.tsx (24-grid, 2.4 stroke, round joins); that
   module stays separate because its glyphs are map chrome (close, pager,
   heart) with different semantics. Sized by the call site's CSS. */

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Route — the navigation arrow, not a map pin: this opens directions. */
export function RouteIcon() {
  return (
    <Icon>
      <path d="M3 11 21 3l-8 18-2-8-8-2Z" />
    </Icon>
  );
}

export function ReserveIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  );
}

export function PhoneIcon() {
  return (
    <Icon>
      <path d="M6.5 3h-2A1.5 1.5 0 0 0 3 4.6C3 13 11 21 19.4 21A1.5 1.5 0 0 0 21 19.5v-2a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .4l-1 1.4a14 14 0 0 1-6.4-6.4l1.4-1a1 1 0 0 0 .4-1l-.7-3.4a1 1 0 0 0-1-.8Z" />
    </Icon>
  );
}

export function WebsiteIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </Icon>
  );
}

export function MenuCardIcon() {
  return (
    <Icon>
      <path d="M5 3h14v18l-7-3-7 3V3Z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  );
}

export function ShareIcon() {
  return (
    <Icon>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.4 10.8 7.2-4.2M8.4 13.2l7.2 4.2" />
    </Icon>
  );
}

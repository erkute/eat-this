'use client';

// Shell for the Must-Eat lightbox. app.min.js fills #modalImg, #modalDish,
// #modalRestaurant, etc. after a card tap and manages open/close state.
export default function EatModal() {
  return (
    <div className="modal-overlay" id="eatModal">
      <div className="modal">
        <button className="modal-close" id="modalClose" aria-label="Close">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="modal-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="modalImg" src={undefined} alt="" />
        </div>
        <div className="modal-body">
          <span className="modal-district" id="modalDistrict"></span>
          <h3 className="modal-dish" id="modalDish"></h3>
          <p className="modal-restaurant" id="modalRestaurant"></p>
          <p className="modal-address" id="modalAddress"></p>
          <p className="modal-desc" id="modalDesc"></p>
          <a className="modal-maps-btn" id="modalMapsBtn" href="#" target="_blank" rel="noopener noreferrer">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
}

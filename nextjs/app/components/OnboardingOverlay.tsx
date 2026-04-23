'use client';

import { useState, useEffect, useCallback } from 'react';

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);

  const goTo = useCallback((s: number) => setStep(s), []);

  const show = useCallback(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('onboardingComplete')) return;
    setStep(1);
    setVisible(true);
  }, []);

  const skipToFinal = useCallback(() => {
    localStorage.setItem('onboardingComplete', '1');
    setStep(4);
  }, []);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem('onboardingComplete', '1');
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'musts' } }));
  }, []);

  // Override app.min.js globals so WelcomeModal (and legacy callers) use React state.
  useEffect(() => {
    window._obGoTo = goTo;
    window.showOnboarding = show;
  }, [goTo, show]);


  return (
    <div className="ob-overlay" id="onboardingOverlay" hidden={!visible} role="dialog" aria-modal={true} aria-label="Welcome to Eat This">
      <div className="ob-panel">

        <div className="ob-step" id="obStep1" hidden={step !== 1}>
          <p className="ob-step-num">1 of 4</p>
          <div className="ob-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
            </svg>
          </div>
          <p className="ob-title">Berlin food news</p>
          <p className="ob-body">New openings, hidden gems, guides.</p>
          <div className="ob-dots">
            <span className="ob-dot active"></span>
            <span className="ob-dot"></span>
            <span className="ob-dot"></span>
            <span className="ob-dot"></span>
          </div>
          <div className="ob-footer">
            <button className="ob-next-btn" id="obNext1" onClick={() => goTo(2)}>Next</button>
            <button className="ob-skip-btn" id="obSkip1" onClick={skipToFinal}>Skip intro</button>
          </div>
        </div>

        <div className="ob-step" id="obStep2" hidden={step !== 2}>
          <p className="ob-step-num">2 of 4</p>
          <div className="ob-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </div>
          <p className="ob-title">Spots on the map</p>
          <p className="ob-body">{"Berlin's best food map. Filter by category."}</p>
          <div className="ob-dots">
            <span className="ob-dot"></span>
            <span className="ob-dot active"></span>
            <span className="ob-dot"></span>
            <span className="ob-dot"></span>
          </div>
          <div className="ob-footer">
            <button className="ob-next-btn" id="obNext2" onClick={() => goTo(3)}>Next</button>
            <button className="ob-skip-btn" id="obSkip2" onClick={skipToFinal}>Skip intro</button>
          </div>
        </div>

        <div className="ob-step" id="obStep3" hidden={step !== 3}>
          <p className="ob-step-num">3 of 4</p>
          <div className="ob-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 9h20" />
            </svg>
          </div>
          <p className="ob-title">Must-Eat Album</p>
          <p className="ob-body">156 dishes. Collect them all.</p>
          <div className="ob-dots">
            <span className="ob-dot"></span>
            <span className="ob-dot"></span>
            <span className="ob-dot active"></span>
            <span className="ob-dot"></span>
          </div>
          <div className="ob-footer">
            <button className="ob-next-btn" id="obNext3" onClick={() => goTo(4)}>Next</button>
            <button className="ob-skip-btn" id="obSkip3" onClick={skipToFinal}>Skip intro</button>
          </div>
        </div>

        <div className="ob-step" id="obStep4" hidden={step !== 4}>
          <p className="ob-step-num">4 of 4</p>
          <div className="ob-icon ob-icon--star">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <p className="ob-title">Your Booster Pack is ready.</p>
          <p className="ob-body">10 free cards are waiting for you.</p>
          <div className="ob-pack-wrap">
            <div className="ob-pack-stack">
              <div className="ob-pack-shadow ob-pack-shadow--far"></div>
              <div className="ob-pack-shadow ob-pack-shadow--near"></div>
              <div className="ob-pack-body">
                <div className="ob-pack-stripe"></div>
                <div className="ob-pack-brand">Eat This</div>
                <div className="ob-pack-content">
                  <div className="ob-pack-num">10</div>
                  <div className="ob-pack-cards-lbl">Cards</div>
                  <div className="ob-pack-divider"></div>
                  <div className="ob-pack-type">Booster Pack</div>
                </div>
              </div>
            </div>
            <p className="ob-pack-tap">Tap to open</p>
          </div>
          <div className="ob-dots">
            <span className="ob-dot"></span>
            <span className="ob-dot"></span>
            <span className="ob-dot"></span>
            <span className="ob-dot active"></span>
          </div>
          <div className="ob-footer">
            <button className="ob-next-btn" id="obOpenPackBtn" onClick={finish}>Open Starter Pack</button>
          </div>
        </div>

      </div>
    </div>
  );
}

declare global {
  interface Window {
    _obGoTo?: (step: number) => void;
  }
}

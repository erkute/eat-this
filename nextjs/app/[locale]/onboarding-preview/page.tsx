'use client';

import { useState } from 'react';
import OnboardingFlow from '../onboarding/OnboardingFlow';
import { type AvatarChoice } from '@/lib/firebase/useUserProfile';

// Stub deck for the dev preview — repeats the lab's three Sanity samples to
// reach 10 cards so the pack-open choreography has data without needing a
// signed-in Firestore pack.
const PREVIEW_PACK_CARDS = [
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/a12687e545c871243fe9e7648e1d649d03fe4a8a-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/f56c68c3f207f5a62a85ad6dfd2db1eed95c2188-1449x2163.png?w=600&auto=format&q=80',
  'https://cdn.sanity.io/images/ehwjnjr2/production/e74cc8257c7d0d37075e024274bd3a447ce8a6da-1449x2163.png?w=600&auto=format&q=80',
];

// Dev-only design playground for the onboarding flow.
// No auth, no Firestore writes — pure UI iteration.
// `?reset=1` reloads with a fresh state.
export default function OnboardingPreviewPage() {
  const [completed, setCompleted] = useState(false);

  if (completed) {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <p style={kickerStyle}>PREVIEW</p>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, letterSpacing: '-0.02em' }}>
            onFinish() called
          </h2>
          <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            In Prod würde jetzt <code>markOnboarded()</code> laufen + Redirect /profile.
          </p>
          <button onClick={() => setCompleted(false)} style={btnStyle}>Reset</button>
        </div>
      </div>
    );
  }

  return (
    <OnboardingFlow
      initialName=""
      initialAvatar={1 as AvatarChoice}
      packCards={PREVIEW_PACK_CARDS}
      onUpdateName={(name) => console.info('[preview] onUpdateName', name)}
      onSetAvatar={(choice) => console.info('[preview] onSetAvatar', choice)}
      onFinish={() => setCompleted(true)}
    />
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#0a0a0a',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  padding: 24,
};

const panelStyle: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: 360,
};

const kickerStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 11,
  letterSpacing: '0.22em',
  fontWeight: 700,
  color: '#B71C1C',
  textTransform: 'uppercase',
};

const btnStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 999,
  border: 'none',
  background: '#B71C1C',
  color: '#fff',
  fontWeight: 700,
  letterSpacing: '0.02em',
  fontSize: 14,
  cursor: 'pointer',
};

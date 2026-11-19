/* Eigene Pixel-Icons für Remys Desktop, auf 32 × 32 gezeichnet. Bewusst keine
   Windows-Originale: deren Grafiken gehören Microsoft. */

const px = { shapeRendering: 'crispEdges' as const };

export function ComputerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={px}>
      <rect x="4" y="3" width="24" height="19" fill="#000" />
      <rect x="5" y="4" width="22" height="17" fill="#dfdfdf" />
      <rect x="7" y="6" width="18" height="13" fill="#000" />
      <rect x="8" y="7" width="16" height="11" fill="#008080" />
      <rect x="9" y="8" width="6" height="1" fill="#7fd4d4" />
      <rect x="9" y="10" width="9" height="1" fill="#7fd4d4" />
      <rect x="9" y="12" width="4" height="1" fill="#7fd4d4" />
      <rect x="22" y="19" width="2" height="1" fill="#2a8a2a" />
      <rect x="12" y="22" width="8" height="3" fill="#000" />
      <rect x="13" y="22" width="6" height="2" fill="#c0c0c0" />
      <rect x="6" y="25" width="20" height="4" fill="#000" />
      <rect x="7" y="25" width="18" height="3" fill="#dfdfdf" />
      <rect x="9" y="26" width="10" height="1" fill="#808080" />
    </svg>
  );
}

export function BinIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={px}>
      <rect x="7" y="5" width="18" height="3" fill="#000" />
      <rect x="8" y="6" width="16" height="1" fill="#dfdfdf" />
      <rect x="8" y="8" width="16" height="21" fill="#000" />
      <rect x="9" y="8" width="14" height="20" fill="#c0c0c0" />
      <rect x="11" y="10" width="1" height="16" fill="#808080" />
      <rect x="15" y="10" width="1" height="16" fill="#808080" />
      <rect x="19" y="10" width="1" height="16" fill="#808080" />
      <rect x="9" y="8" width="1" height="20" fill="#dfdfdf" />
    </svg>
  );
}

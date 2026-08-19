'use client';
import { useCallback } from 'react';
import { Marker, type MarkerInstance } from 'react-map-gl/maplibre';

interface MarkerButtonProps {
  lat: number;
  lng: number;
  /** Pins hang above their coordinate, dots sit on it. */
  anchor: 'bottom' | 'center';
  /** Classes for the MapLibre wrapper — the stacking band lives here. */
  rootClassName: string;
  /** Classes for the control itself. */
  className: string;
  label: string;
  onActivate: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * One MapLibre marker whose content is a single accessible control — the shell
 * every marker in this folder is built from.
 *
 * It exists because MapLibre fights React on two points, and every marker
 * component had been re-solving both:
 *
 *  - MapLibre stamps `role="button"` + `aria-label="Map marker"` on its own
 *    wrapper (in `Marker.addTo`, i.e. AFTER React has mounted the inner
 *    control), so each pin announced as two nested buttons with the outer one
 *    namelessly generic. The wrapper is demoted to presentation and the inner
 *    control carries the real name, focus ring and Enter/Space handling.
 *  - A tap on a marker must not also register as a tap on the map, which would
 *    close the sheet the tap just opened.
 */
export default function MarkerButton({
  lat,
  lng,
  anchor,
  rootClassName,
  className,
  label,
  onActivate,
  style,
  children,
}: MarkerButtonProps) {
  const demoteWrapper = useCallback((marker: MarkerInstance | null) => {
    const el = marker?.getElement();
    if (!el) return;
    el.setAttribute('role', 'presentation');
    el.removeAttribute('aria-label');
  }, []);

  return (
    <Marker
      ref={demoteWrapper}
      longitude={lng}
      latitude={lat}
      anchor={anchor}
      className={rootClassName}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onActivate();
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={className}
        style={style}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onActivate();
        }}
      >
        {children}
      </div>
    </Marker>
  );
}

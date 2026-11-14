import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Desktop only: the side panel can be folded away to the right so the map
 * fills the viewport. Below desktop width it always comes back.
 */
export function useDesktopPanelHidden() {
  const [desktopPanelHidden, setDesktopPanelHiddenState] = useState(false);
  /* The same, for the camera: the map runs under the panel, and a flight
     started in the handler that unfolds it must already leave the panel's
     strip out — before React has rendered the change. */
  const desktopPanelHiddenRef = useRef(false);
  const setDesktopPanelHidden = useCallback((hidden: boolean) => {
    desktopPanelHiddenRef.current = hidden;
    setDesktopPanelHiddenState(hidden);
  }, []);
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const restorePanelBelowDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setDesktopPanelHidden(false);
    };
    desktopQuery.addEventListener('change', restorePanelBelowDesktop);
    return () => desktopQuery.removeEventListener('change', restorePanelBelowDesktop);
  }, [setDesktopPanelHidden]);
  return { desktopPanelHidden, desktopPanelHiddenRef, setDesktopPanelHidden };
}

import { useEffect } from 'react';
import { isPhoneViewport } from './viewport';

/**
 * Keeps the phone map's viewport CSS variables on <html> in step with the
 * browser chrome and the keyboard: `--map-canvas-height`,
 * `--map-runtime-bar-overhang` and `--map-visual-offset-top`. Removes them
 * again above phone width and when the map is left.
 */
export function useMapViewportVars(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    const root = document.documentElement;
    /* Only changed values invalidate styles during viewport/scroll events. */
    const written = new Map<string, string>();
    let canvasWidth: number | null = null;
    const write = (prop: string, value: string) => {
      if (written.get(prop) === value) return;
      written.set(prop, value);
      root.style.setProperty(prop, value);
    };

    const apply = () => {
      if (!isPhoneViewport()) {
        canvasWidth = null;
        written.clear();
        root.style.removeProperty('--map-canvas-height');
        root.style.removeProperty('--map-runtime-bar-overhang');
        root.style.removeProperty('--map-visual-offset-top');
        return;
      }

      /* Keep the camera's geometry stable through height-only browser chrome
         changes. A width change (rotation or window resize) measures it anew.
         The touch screen bounds cover the area exposed when bars retract,
         even in browsers that report a changing large viewport. */
      const touchViewport = window.matchMedia('(pointer: coarse)').matches;
      if (!touchViewport) {
        canvasWidth = null;
        written.delete('--map-canvas-height');
        root.style.removeProperty('--map-canvas-height');
      } else if (canvasWidth !== window.innerWidth) {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;width:0;height:100lvh;visibility:hidden;pointer-events:none;';
        document.body.appendChild(probe);
        const portrait = window.matchMedia('(orientation: portrait)').matches;
        const screenHeight = (portrait ? Math.max : Math.min)(window.screen.width, window.screen.height);
        const height = Math.max(probe.offsetHeight, window.innerHeight, screenHeight);
        probe.remove();
        write('--map-canvas-height', `${height}px`);
        canvasWidth = window.innerWidth;
      }

      const visualViewport = window.visualViewport;
      const visualHeight = visualViewport?.height ?? window.innerHeight;
      const layoutHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        visualHeight
      );
      const visualOffsetTop = visualViewport?.offsetTop ?? 0;
      const toolbarHeight = Math.max(0, layoutHeight - visualHeight - visualOffsetTop);

      write('--map-runtime-bar-overhang', `${Math.round(Math.max(96, toolbarHeight + 96))}px`);

      /* How far the visual viewport has slid down inside the layout viewport.
         Non-zero only while the iOS keyboard is up: the layout viewport keeps
         its full height, Safari scrolls the visual one to keep the caret clear,
         and anything `position: fixed` (anchored to the layout viewport) rides
         up out of sight with it, the search toolbar included. The phone
         controls add this back onto their `top` (MapControls.module.css), kept
         off `transform`, which those three need for their retreat animation.

         Only while a text field has focus, i.e. while there is a keyboard.
         Safari slides the visual viewport for other reasons too: the burger
         drawer pins the page (body position: fixed), Safari unfolds its bars,
         and the offset it reports would push burger and search down while the
         map stays put. */
      const active = document.activeElement;
      /* Only fields that bring up the keyboard — not a focused checkbox. */
      const typing =
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement &&
          ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(active.type)) ||
        (active instanceof HTMLElement && active.isContentEditable);
      write(
        '--map-visual-offset-top',
        `${typing ? Math.round(Math.max(0, visualOffsetTop)) : 0}px`
      );
    };

    apply();
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('scroll', apply, { passive: true });
    window.visualViewport?.addEventListener('resize', apply, { passive: true });
    window.visualViewport?.addEventListener('scroll', apply, { passive: true });
    /* The keyboard comes and goes with the focus. */
    document.addEventListener('focusin', apply);
    document.addEventListener('focusout', apply);

    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('scroll', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      document.removeEventListener('focusin', apply);
      document.removeEventListener('focusout', apply);
      root.style.removeProperty('--map-canvas-height');
      root.style.removeProperty('--map-runtime-bar-overhang');
      root.style.removeProperty('--map-visual-offset-top');
    };
  }, [isActive]);
}

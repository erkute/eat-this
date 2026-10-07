'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { appScroller } from '@/lib/dom/appScroller';
import { scrollProgress } from '@/lib/dom/scrollProgress';

/** A progressive enhancement: the server renders the complete, readable page.
 * Like HubMotion, this uses native scrolling rather than ScrollTrigger's
 * session-wide animation loop. Work only runs on scroll, resize or an entrance. */
export default function AboutMotion() {
  useEffect(() => {
    const page = document.getElementById('staticPageAbout');
    if (!page) return;
    const media = gsap.matchMedia();

    media.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        desktop: '(min-width: 900px)',
      },
      (context) => {
        if (!context.conditions?.motion) return;
        const desktop = context.conditions.desktop;
        const distance = desktop ? 68 : 32;
        const scenes: { anchor: HTMLElement; timeline: gsap.core.Timeline; progress: number }[] =
          [];
        const entrances: gsap.core.Tween[] = [];
        let frame = 0;

        const hero = page.querySelector<HTMLElement>('[data-about-hero]');
        const portrait = page.querySelector<HTMLElement>('[data-about-portrait]');
        if (hero && portrait) {
          const timeline = gsap
            .timeline({ paused: true })
            .fromTo(
              portrait,
              { y: 0, rotation: -3 },
              { y: -distance, rotation: 4, duration: 1, ease: 'none', immediateRender: false }
            );
          scenes.push({ anchor: hero, timeline, progress: -1 });
        }

        page.querySelectorAll<HTMLElement>('[data-about-chapter]').forEach((chapter, index) => {
          const figure = chapter.querySelector<HTMLElement>('[data-about-figure]');
          const object = figure?.querySelector<HTMLElement>('[data-about-object]');
          if (!figure || !object) return;
          const timeline = gsap.timeline({ paused: true }).fromTo(
            object,
            { y: distance, rotation: index === 1 ? -9 : -4 },
            {
              y: -distance,
              rotation: index === 1 ? 9 : 4,
              duration: 1,
              ease: 'none',
              immediateRender: false,
            }
          );
          const back = chapter.querySelector('[data-about-card="back"]');
          const front = chapter.querySelector('[data-about-card="front"]');
          if (back && front) {
            timeline
              .fromTo(
                back,
                { x: 16, y: 0, rotation: -2 },
                {
                  x: desktop ? -14 : -8,
                  y: 20,
                  rotation: desktop ? -18 : -14,
                  duration: 1,
                  ease: 'none',
                  immediateRender: false,
                },
                0
              )
              .fromTo(
                front,
                { x: -16, y: 12, rotation: 2 },
                {
                  x: desktop ? 14 : 8,
                  y: -16,
                  rotation: desktop ? 16 : 12,
                  duration: 1,
                  ease: 'none',
                  immediateRender: false,
                },
                0
              );
          }
          // On a stacked phone layout the image enters after the long text.
          // Its untransformed figure is needed to avoid scroll/transform feedback.
          scenes.push({ anchor: figure, timeline, progress: -1 });
        });

        const update = () => {
          frame = 0;
          const scroller = appScroller();
          const view = scroller?.getBoundingClientRect() ?? { top: 0, height: window.innerHeight };
          // Read every box before GSAP writes styles.
          const positions = scenes.map(({ anchor }) => anchor.getBoundingClientRect());
          scenes.forEach((scene, index) => {
            const progress = scrollProgress(positions[index], view, 'top 95%', 'bottom 5%');
            if (Math.abs(progress - scene.progress) < 0.001) return;
            if (scene.progress < 0) scene.timeline.progress(progress);
            else
              gsap.to(scene.timeline, {
                progress,
                duration: 0.45,
                ease: 'power2.out',
                overwrite: true,
              });
            scene.progress = progress;
          });
        };
        const schedule = () => {
          if (!frame) frame = requestAnimationFrame(update);
        };

        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              observer.unobserve(entry.target);
              entrances.push(
                gsap.fromTo(
                  entry.target,
                  { y: 30, rotation: -0.6 },
                  {
                    y: 0,
                    rotation: 0,
                    duration: 0.85,
                    ease: 'power3.out',
                  }
                )
              );
            }
          },
          { threshold: 0, rootMargin: '0px 0px -8% 0px' }
        );
        page.querySelectorAll('[data-about-enter]').forEach((element) => observer.observe(element));
        const resize = new ResizeObserver(schedule);
        resize.observe(page);
        window.addEventListener('scroll', schedule, { passive: true, capture: true });
        window.addEventListener('resize', schedule, { passive: true });
        update();

        return () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          resize.disconnect();
          window.removeEventListener('scroll', schedule, true);
          window.removeEventListener('resize', schedule);
          // Observer callbacks run outside the matchMedia recording context.
          entrances.forEach((tween) => tween.revert());
          scenes.forEach(({ timeline }) => gsap.killTweensOf(timeline));
          // A paused fromTo can retain its start transform after a media
          // change. Return these exclusively owned transforms to the CSS
          // baseline, including the cards' original tilt.
          gsap.set(
            page.querySelectorAll(
              '[data-about-object], [data-about-portrait], [data-about-card], [data-about-enter]'
            ),
            { clearProps: 'transform' }
          );
        };
      },
      page
    );

    return () => media.revert();
  }, []);

  return null;
}

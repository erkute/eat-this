'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Image from '@/app/components/SiteImage';
import { useLocale } from 'next-intl';
import { dispatchBuddyAsk } from '@/lib/buddy/homeStage';
import BuddyMouth from '@/app/components/buddy/BuddyMouth';
import styles from './HubFragRemy.module.css';

export default function HubFragRemy({ compact = false }: { compact?: boolean }) {
  const en = useLocale() === 'en';
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [expression, setExpression] = useState<'neutral' | 'open' | 'laugh'>('neutral');
  const stage = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const entrance = useRef<gsap.core.Timeline | null>(null);
  const reaction = useRef<gsap.core.Timeline | null>(null);
  const pending = useRef(false);
  const portraitReady = useRef(false);
  const motion = () => !!window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches;
  const questions = en
    ? ['Where can I get really good pizza?', 'Where should I go on a date?', 'Surprise me.']
    : ['Wo gibt’s richtig gute Pizza?', 'Was passt für ein Date?', 'Überrasch mich.'];

  useEffect(() => {
    if (!stage.current || !figure.current || !window.matchMedia) return;
    const avatarElement = figure.current;
    const media = gsap.matchMedia();
    media.add({ motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 767.98px)' }, (context) => {
      if (!context.conditions?.motion) return;
      const avatar = figure.current!;
      const mobile = Boolean(context.conditions.mobile);
      const enterRatio = mobile ? 0.15 : 0.6;
      const leaveRatio = mobile ? 0.05 : 0.4;
      let visit = 0;
      let inside = false;
      let alive = true;
      let ready = false;
      const image = avatar.querySelector<HTMLImageElement>('img')!;
      portraitReady.current = false;
      const settle = { x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: 0, scale: 1 };
      const tuckedRight = { ...settle, xPercent: 120, yPercent: 22, rotation: 18 };
      const tucked = mobile ? { ...settle, yPercent: 110 } : tuckedRight;
      gsap.set(avatar, tucked);
      avatar.setAttribute('data-staged', '');
      const arrive = () => {
        if (!alive || !ready || !inside) return;
        entrance.current?.kill();
        gsap.killTweensOf(avatar);
        avatar.removeAttribute('data-buddy-speaking');
        const tl = gsap.timeline({ delay: 0.35 });
        entrance.current = tl;
        // Mobile always rises from the lower edge. Desktop keeps its varied entrance.
        if (!mobile && visit++ % 3 !== 2) {
          tl.fromTo(avatar, tuckedRight,
            { ...settle, xPercent: 24, yPercent: 8, rotation: -8, duration: 0.65, ease: 'power3.out' })
            .to(avatar, { ...settle, duration: 0.65, ease: 'power2.inOut' }, '+=0.15');
        } else {
          tl.fromTo(avatar, { ...settle, yPercent: 110 },
            { ...settle, duration: 1.15, ease: 'power3.out' });
        }
        tl.call(() => avatar.setAttribute('data-buddy-speaking', ''))
          .call(() => avatar.removeAttribute('data-buddy-speaking'), [], '+=2');
      };
      const loaded = async () => {
        try { await image.decode?.(); } catch { /* A loaded image may still be displayable after decode rejects. */ }
        if (!alive || ready) return;
        ready = true;
        portraitReady.current = true;
        arrive();
      };
      image.addEventListener('load', loaded);
      if (image.complete && image.naturalWidth > 0) void loaded();
      const preload = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        avatar.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
        preload.disconnect();
      }, { rootMargin: '100% 0px' });
      preload.observe(avatar.parentElement!);
      // Zwei Schwellen verhindern Flackern beim langsamen Scrollen.
      // Der Abgang beginnt, solange Remy noch teilweise sichtbar ist.
      const observer = new IntersectionObserver(([entry]) => {
        if (pending.current) return;
        if (inside && (!entry.isIntersecting || entry.intersectionRatio < leaveRatio)) {
          inside = false;
          entrance.current?.kill();
          reaction.current?.kill();
          gsap.killTweensOf(avatar);
          avatar.removeAttribute('data-buddy-speaking');
          if (!ready) return;
          entrance.current = gsap.timeline().to(avatar, {
            ...tucked,
            duration: 0.45, ease: 'power2.in',
          });
          return;
        }
        if (inside || !entry.isIntersecting || entry.intersectionRatio < enterRatio) return;
        inside = true;
        arrive();
      }, { threshold: [0, leaveRatio, enterRatio] });
      observer.observe(avatar.parentElement!);
      return () => { alive = false; portraitReady.current = false; preload.disconnect(); image.removeEventListener('load', loaded); observer.disconnect(); entrance.current?.kill(); avatar.removeAttribute('data-buddy-speaking'); avatar.removeAttribute('data-staged'); gsap.set(avatar, { clearProps: 'transform' }); };
    });
    return () => {
      media.revert();
      reaction.current?.kill();
      gsap.killTweensOf(avatarElement);
    };
  }, []);

  function listen(active: boolean, choice = -1) {
    if (pending.current) return;
    setExpression(active ? (choice === 2 ? 'laugh' : choice === 0 ? 'open' : 'neutral') : 'neutral');
    if (!figure.current || !motion() || !portraitReady.current) return;
    const avatar = figure.current;
    // Auch während der Verzögerung vor dem Auftritt nicht dazwischenfunken.
    if (entrance.current && entrance.current.progress() < 1 && entrance.current.time() < 1.85) return;
    entrance.current?.progress(1);
    avatar.removeAttribute('data-buddy-speaking');
    reaction.current?.kill();
    gsap.killTweensOf(avatar);
    const rest = { x: 0, y: 0, rotation: 0, scale: 1 };
    const tl = gsap.timeline();
    reaction.current = tl;
    if (!active) {
      tl.to(avatar, { ...rest, duration: 0.45, ease: 'back.out(1.4)' });
      return;
    }
    if (choice === -1) {
      tl.to(avatar, { ...rest, duration: 0.18, ease: 'power2.out' })
        .to(avatar, { y: 7, scaleY: 0.985, duration: 0.16, ease: 'power2.inOut' })
        .to(avatar, { ...rest, duration: 0.25, ease: 'power2.out' });
    } else if (choice === 2) {
      tl.to(avatar, { y: 7, scaleY: 0.96, rotation: -5, duration: 0.14 })
        .to(avatar, { ...rest, y: -42, rotation: 9, scale: 1.06, duration: 0.3, ease: 'power2.out' })
        .to(avatar, { ...rest, y: -6, rotation: -3, scale: 1.025, duration: 0.45, ease: 'back.out(2)' });
    } else if (choice === 1) {
      tl.to(avatar, { ...rest, x: 0, rotation: 0, scale: 1.03, duration: 0.16 })
        .to(avatar, { y: 14, scaleY: 0.97, duration: 0.18, ease: 'power2.inOut', repeat: 3, yoyo: true })
        .to(avatar, { y: 0, scale: 1.03, rotation: 3, duration: 0.2 });
    } else {
      tl.to(avatar, { ...rest, x: -24, y: -10, rotation: -11, scale: 1.09, duration: 0.55, ease: 'back.out(1.8)' });
    }
  }

  function ask(question: string, choice = -1) {
    const value = question.trim();
    if (!value || pending.current) return;
    pending.current = true;
    setBusy(true);
    setExpression(choice === 2 ? 'laugh' : choice === 0 ? 'open' : 'neutral');
    const open = () => {
      dispatchBuddyAsk({ question: value });
      setDraft('');
      setBusy(false);
      setExpression('neutral');
      pending.current = false;
    };
    if (!figure.current || !motion()) { open(); return; }
    entrance.current?.progress(1);
    gsap.killTweensOf(figure.current);
    reaction.current?.kill();
    const tl = gsap.timeline({ onComplete: open });
    reaction.current = tl;
    if (choice === 0) {
      tl.to(figure.current, { x: -20, y: -8, rotation: -10, scale: 1.08, duration: 0.22 })
        .to(figure.current, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.2 });
    } else if (choice === 2) {
      tl.to(figure.current, { y: -35, rotation: 8, scale: 1.05, duration: 0.22, ease: 'power2.out' })
        .to(figure.current, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.24, ease: 'back.out(1.5)' });
    } else {
      tl.to(figure.current, { x: 0, y: 12, rotation: 0, scaleY: 0.96, duration: 0.12, repeat: 3, yoyo: true })
        .to(figure.current, { y: 0, rotation: 0, scale: 1, duration: 0.12 });
    }
  }

  return (
    <section className={`homeV2 hv-section hv-wrap ${styles.section}${compact ? ` ${styles.compact}` : ''}`} id="hub-fragremy" data-hub-fragremy="">
      <div className={styles.body} ref={stage}>
        <div className={styles.portrait} aria-hidden="true">
          <div className={styles.figure} ref={figure} data-expression={expression}>
            {/* One body; only the mouth changes with the expression. */}
            <div className={styles.head}>
              <Image className={styles.face} src="/buddy/buddy.webp?v=feinripp" alt="" fill unoptimized sizes={compact ? '(max-width: 767px) 320px, 38vw' : '(max-width: 767px) 340px, 44vw'} loading="lazy" />
              <BuddyMouth shape={expression === 'laugh' ? 'wide' : expression === 'open' ? 'open' : 'closed'} />
            </div>
          </div>
        </div>
        <div className={styles.content}>
          {/* Auf einen Blick, wer da spricht (Ansage 21.10.2026): der Name
              gross, darunter in einem Satz, was er kann. */}
          <h2 className={styles.title}>
            <span className={styles.hello}>{en ? 'Hey, I’m' : 'Hey, ich bin'}</span>{' '}
            <span className={styles.name}>Remy.</span>
          </h2>
          <p className={styles.intro}>{en ? 'I’ll show you what to eat in Berlin.' : 'Ich zeig dir, was du in Berlin essen musst.'}</p>
          <p className={styles.prompt}>{en ? 'What are you craving?' : 'Worauf hast du Lust?'}</p>
          <div className={styles.questions} data-fragremy-chips="">
            {questions.map((question, index) => (
              <button key={question} type="button" className={styles.question} disabled={busy} onPointerEnter={(event) => { if (event.pointerType === 'mouse') listen(true, index); }} onPointerLeave={() => listen(false)} onFocus={() => listen(true, index)} onBlur={() => listen(false)} onClick={() => ask(question, index)}>{question}</button>
            ))}
          </div>
          <form className={styles.form} onSubmit={(event) => { event.preventDefault(); ask(draft); }} aria-label={en ? 'Ask Remy' : 'Frag Remy'}>
            <input className={styles.input} data-fragremy-input="" value={draft} onChange={(event) => setDraft(event.target.value)} onFocus={() => listen(true)} onBlur={() => listen(false)} placeholder={en ? 'Or ask me yourself …' : 'Oder frag mich selbst …'} aria-label={en ? 'Your question for Remy' : 'Deine Frage an Remy'} disabled={busy} />
            <button className={`et-btn ${styles.send}`} type="submit" disabled={busy || !draft.trim()}>{en ? 'Ask' : 'Fragen'}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

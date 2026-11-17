/* AVELNORY v2 — ruch: preloader, płynny scroll (Lenis), sceny sterowane scrollem (GSAP ScrollTrigger),
   sceny WebGL (paint.js), nawigacja z aktywną sekcją, kursor i mikrointerakcje.
   Przy prefers-reduced-motion: bez Lenis, bez przypięć i scrubu, scena WebGL renderuje jedną statyczną klatkę. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobile = matchMedia('(max-width: 720px)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- płynny scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis && hasGsap) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Kotwice: płynnie z Lenis, a po dojechaniu fokus na sekcji (klawiatura i czytniki ekranu).
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const target = document.getElementById(id.slice(1)); if (!target) return;
    e.preventDefault(); closeMenu();
    const done = () => { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); history.replaceState(null, '', id); };
    if (lenis) lenis.scrollTo(target, { offset: id === '#start' ? 0 : 0, duration: 1.4, onComplete: done });
    else { target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); done(); }
  }));

  /* ---------- menu mobilne ---------- */
  const menuBtn = $('.nav__menu'), menu = $('#menu');
  function closeMenu() { if (!menu || menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Otwórz menu'); document.body.style.overflow = ''; lenis?.start(); }
  menuBtn?.addEventListener('click', () => {
    const open = menu.hidden;
    if (!open) return closeMenu();
    menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Zamknij menu');
    document.body.style.overflow = 'hidden'; lenis?.stop();
    if (hasGsap && !reduced) gsap.from($$('li', menu), { yPercent: 40, opacity: 0, duration: .6, stagger: .05, ease: 'power3.out' });
    $('a', menu).focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); menuBtn?.focus(); } });

  /* ---------- nawigacja: tło, postęp, aktywna sekcja ---------- */
  const nav = $('#nav'), bar = $('.nav__progress span'), where = $('#where');
  const links = $$('[data-nav]');
  function onScroll() {
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('is-solid', y > 40);
    bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const sections = $$('main > section[id]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const s = en.target;
      links.forEach(l => l.setAttribute('aria-current', String(l.dataset.nav === s.id)));
      where.innerHTML = `<b>${s.dataset.num}</b> ${s.dataset.section}`;
    });
  }, { rootMargin: '-45% 0px -54% 0px' });
  sections.forEach(s => io.observe(s));

  /* ---------- sceny WebGL ---------- */
  let hero = null, mirror = null;
  const heroCanvas = $('#hero-canvas'), mirrorCanvas = $('#mirror-canvas');
  try { hero = new AvelPaint(heroCanvas, { mode: 'hero', static: reduced, intro: reduced ? 1 : 0, maxDpr: mobile ? 1.5 : 1.25 }); }
  catch (err) { root.classList.add('no-webgl'); heroCanvas.remove(); }
  try { mirror = new AvelPaint(mirrorCanvas, { mode: 'compare', static: true, intro: 1, maxDpr: mobile ? 1.5 : 1.25 }); }
  catch (err) { mirrorCanvas.remove(); }

  if (hero) {
    hero.start();
    requestAnimationFrame(() => requestAnimationFrame(() => heroCanvas.classList.add('is-on')));
    const vis = new IntersectionObserver(([en]) => { if (reduced) return; en.isIntersecting ? hero.start() : hero.stop(); });
    vis.observe($('.hero'));
    document.addEventListener('visibilitychange', () => { if (reduced) return; document.hidden ? hero.stop() : hero.start(); });
    if (fine && !reduced) addEventListener('pointermove', e => hero.setMouse(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), { passive: true });
    // Telefon: delikatne kołysanie zamiast kursora.
    if (!fine && !reduced) { const t0 = performance.now(); (function sway(now) { hero.setMouse(Math.sin((now - t0) / 2600) * 0.5, Math.cos((now - t0) / 3400) * 0.3); requestAnimationFrame(sway); })(t0); }
  }
  if (mirror) {
    mirror.render(); mirrorCanvas.classList.add('is-on');
    // Scena porównania renderuje się tylko przy zmianie (statyczna), więc nie obciąża GPU w tle.
  }

  /* ---------- przed / po ---------- */
  const range = $('#mirror-range'), mirrorSec = $('#lustro');
  let touched = false;
  function setSplit(v) {
    mirrorSec.style.setProperty('--split', v);
    mirror?.set('split', v);
  }
  range.addEventListener('input', () => { touched = true; setSplit(range.value / 100); });
  setSplit(range.value / 100);

  /* ---------- preloader i wejście hero ---------- */
  const pre = $('#pre');
  const title = $$('.hero__title .ln > span'), heroRow = $('.hero__row'), heroMeta = $('.hero__meta');
  function intro() {
    if (pre) pre.classList.add('is-done');
    try { sessionStorage.setItem('av-pre', '1'); } catch {}
    if (!hasGsap || reduced) { if (hero) hero.set('intro', 1); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (hero) tl.to(hero.u, { intro: 1, duration: 2.4, ease: 'power2.inOut' }, 0);
    tl.fromTo(title, { yPercent: 108 }, { yPercent: 0, duration: 1.3, stagger: .09 }, .15)
      .fromTo(heroRow, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, .55)
      .fromTo(heroMeta, { opacity: 0 }, { opacity: 1, duration: 1 }, .9)
      .fromTo(nav, { yPercent: -100 }, { yPercent: 0, duration: 1 }, .4);
  }
  const skipPre = root.classList.contains('pre-skip') || reduced;
  if (skipPre) { if (pre) pre.remove(); intro(); }
  else {
    if (hasGsap) gsap.set(title, { yPercent: 108 });
    const t0 = performance.now();
    const go = () => setTimeout(intro, Math.max(0, 650 - (performance.now() - t0)));
    if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(go); else go();
  }

  /* ---------- kursor i magnes ---------- */
  if (fine && !reduced) {
    const cur = $('#cursor'); let x = -100, y = -100, cx = -100, cy = -100;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    (function loop() { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', e => {
      const t = e.target;
      const drag = t.closest('#lustro');
      const link = t.closest('a,button,label.opt,summary');
      const typing = t.closest('input:not([type=range]):not([type=radio]):not([type=checkbox]),textarea,select');
      cur.classList.toggle('is-drag', !!drag && !link);
      cur.classList.toggle('is-link', !!link && !drag);
      cur.textContent = drag && !link ? 'Przeciągnij' : '';
      cur.style.opacity = typing ? '0' : '';
    });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); b.style.transform = `translate(${dx * .18}px,${dy * .28}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1),color .35s'; b.style.transform = ''; setTimeout(() => b.style.transition = '', 600); });
    });
  }

  /* ---------- FAQ: płynne rozwijanie ---------- */
  $$('.qa').forEach(d => {
    const s = $('summary', d), a = $('.qa__a', d);
    s.addEventListener('click', e => {
      if (reduced || !hasGsap) return;
      e.preventDefault();
      if (d.open) { gsap.to(a, { height: 0, duration: .5, ease: 'power3.inOut', onComplete: () => { d.open = false; a.style.height = ''; } }); }
      else { d.open = true; gsap.fromTo(a, { height: 0 }, { height: a.scrollHeight, duration: .6, ease: 'power3.out', onComplete: () => a.style.height = '' }); }
    });
  });

  /* ---------- dok z ceną na telefonie ---------- */
  const dock = $('#dock');
  if (dock) {
    let inDemo = false, resVisible = false;
    const upd = () => { const on = inDemo && !resVisible; dock.classList.toggle('is-on', on); dock.setAttribute('aria-hidden', String(!on)); $('#dock-btn').tabIndex = on ? 0 : -1; };
    new IntersectionObserver(([e]) => { inDemo = e.isIntersecting; upd(); }, { rootMargin: '-20% 0px -20% 0px' }).observe($('#demo .cfg__choices'));
    new IntersectionObserver(([e]) => { resVisible = e.isIntersecting; upd(); }, { threshold: .25 }).observe($('.res'));
  }

  if (!hasGsap || reduced) { root.classList.add('static-motion'); return; }

  /* ---------- sceny scrollowane ---------- */
  // Hero: krople spływają, kamera się unosi, treść odpływa.
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: st => { if (hero) hero.u.scroll = st.progress; } });
  gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });

  // Pytania klientów przesuwają się w przeciwnych kierunkach.
  $$('.ticker p').forEach(p => {
    const dir = +p.dataset.dir || 1;
    gsap.fromTo(p, { x: () => dir * -innerWidth * .14 }, { x: () => dir * innerWidth * .08, ease: 'none', scrollTrigger: { trigger: '.problem', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  // Ujawnienia: nagłówki maską, akapity z przesunięciem.
  $$('.h2').forEach(h => gsap.fromTo(h, { clipPath: 'inset(0 0 100% 0)', y: 40 }, { clipPath: 'inset(0 0 -20% 0)', y: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } }));
  $$('[data-reveal], .head .body, .head .fine, .step .body, .pk__body, .day').forEach(n => gsap.fromTo(n, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 90%', once: true } }));
  $$('.pk__price').forEach(n => gsap.fromTo(n, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 -10% 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: n, start: 'top 85%', once: true } }));

  // Przed/po: suwak sam odsłania lustro, dopóki użytkownik go nie dotknie.
  ScrollTrigger.create({ trigger: '#lustro', start: 'top 70%', end: 'center 45%', scrub: true,
    onUpdate: st => { if (touched) return; const v = 0.92 - st.progress * 0.42; range.value = Math.round(v * 100); setSplit(v); } });
  gsap.fromTo('.mirror__head', { y: 60 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '#lustro', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Jak to działa: numer kroku i paralaksa obrazów.
  const num = $('#step-num');
  $$('.step').forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: st => {
    if (!st.isActive || num.textContent === s.dataset.step) return;
    gsap.fromTo(num, { yPercent: st.direction > 0 ? 100 : -100 }, { yPercent: 0, duration: .8, ease: 'expo.out' }); num.textContent = s.dataset.step;
  } }));
  $$('[data-parallax]').forEach(img => gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.closest('figure'), start: 'top bottom', end: 'bottom top', scrub: true } }));

  // 7 dni: na desktopie przypięta oś przewijana w poziomie; na telefonie linia rośnie w pionie.
  const track = $('#track'), wrap = $('.proc__wrap'), days = $$('.day');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 721px)', () => {
    root.classList.add('proc-pinned');
    const dist = () => Math.max(0, track.scrollWidth - wrap.clientWidth);
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none' });
    const st = ScrollTrigger.create({ trigger: '#proces', start: 'top top', end: () => '+=' + (dist() + innerHeight * .6), pin: true, scrub: .6, animation: tw, invalidateOnRefresh: true,
      onUpdate: s => { wrap.style.setProperty('--pp', s.progress.toFixed(4)); days.forEach((d, i) => d.classList.toggle('is-on', s.progress >= i / days.length - .001)); } });
    return () => { root.classList.remove('proc-pinned'); st.kill(); tw.kill(); gsap.set(track, { x: 0 }); };
  });
  mm.add('(max-width: 720px)', () => {
    const st = ScrollTrigger.create({ trigger: track, start: 'top 70%', end: 'bottom 70%', scrub: true,
      onUpdate: s => { wrap.style.setProperty('--pp', s.progress.toFixed(4)); days.forEach((d, i) => d.classList.toggle('is-on', s.progress >= i / days.length)); } });
    return () => st.kill();
  });

  // Stopka: znak wodny przesuwa się wolniej niż treść.
  gsap.fromTo('.foot__word', { xPercent: 6 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();

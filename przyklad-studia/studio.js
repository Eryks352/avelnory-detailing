/* Lustro (przykład) — scena 3D w hero: zielony metalik pod ciepłymi softboxami.
   Na starcie lakier jest w połowie po korekcie (z lewej lustro, z prawej mat); przewijanie hero kończy korektę
   i obraca kamerę wokół maski. Bez WebGL zostaje plakat-klatka; przy reduced-motion jedna statyczna klatka. */
const canvas = document.getElementById('scene');
const hero = document.querySelector('.hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 720px)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

if (canGL && canvas) requestAnimationFrame(() => setTimeout(boot, 0));   // po pierwszym malowaniu: plakat jest LCP
else canvas?.remove();

async function boot() {
  let s;
  try {
    const { createHero } = await import('../assets/hero3d.js');
    s = createHero(canvas, { static: reduced, intro: 1, defect: 1, mobile, bg: 0x10201a, paint: 0x0d2a1e, metal: 0.38, lamps: 'strips', frameX: 0.1, frameY: 0.3, scrollAz: 70, scrollEl: -6 });
  } catch { canvas.remove(); return; }
  const HALF = 0.98;
  let auto = reduced ? HALF : -0.15, progress = 0;
  const apply = () => {
    s.u.scroll = progress;
    s.u.wipe = Math.max(auto, HALF + progress * 0.95);
    hero.classList.toggle('is-done', s.u.wipe > 1.2);
  };
  const onScroll = () => {
    const r = hero.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight);
    progress = Math.min(1, Math.max(0, -r.top / span));
    apply();
    if (reduced) s.render();
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  s.render();
  canvas.classList.add('is-on');
  canvas.addEventListener('paint:lost', () => { canvas.classList.remove('is-on'); });
  if (reduced) return;
  // wejście: polerka dochodzi do połowy maski w 1,6 s (ease-out)
  const t0 = performance.now();
  (function intro(now) {
    const k = Math.min(1, (now - t0) / 1600);
    auto = -0.15 + (HALF + 0.15) * (1 - Math.pow(1 - k, 3));
    apply();
    if (k < 1) requestAnimationFrame(intro);
  })(t0);
  if (fine) addEventListener('pointermove', e => s.setMouse(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), { passive: true });
  let visible = true;
  const sync = () => (visible && !document.hidden ? s.start() : s.stop());
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }).observe(hero);
  document.addEventListener('visibilitychange', sync);
}

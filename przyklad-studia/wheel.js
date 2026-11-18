/* Werniks (przykład) — scena 3D w hero: proceduralna felga na podeście w jasnym studiu.
   Wejście: felga wtacza się do kadru, kołysze i obraca do ujęcia 3/4 (widać wiśniowy zacisk).
   Przewijanie hero obraca ją dalej do profilu, kamera schodzi niżej. Kursor lekko ją wychyla.
   Bez WebGL zostaje plakat (klatka tej sceny); przy reduced-motion jedna nieruchoma klatka.
   Ładowane po pierwszym malowaniu; three.js (MIT) z ../assets/vendor/three. */
const canvas = document.getElementById('scene');
const hero = document.querySelector('.hero');
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const posterMode = params.has('poster');
const fixedT = params.has('t') ? +params.get('t') : null;   // QA: scena zamrożona w danej sekundzie wejścia
const reduced = posterMode || matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

const fail = () => { root.classList.remove('gl-intro'); canvas?.remove(); };
const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
if (canvas && canGL) requestAnimationFrame(() => setTimeout(() => boot().catch(fail), 0));
else fail();

async function boot() {
  const THREE = await import('../assets/vendor/three/three.module.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: posterMode || fixedT !== null });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, posterMode ? 2 : mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

  /* ---- studio do odbić: jasna sala, softbox z góry, dwa pionowe paski, czarna flaga dla kontrastu ---- */
  const env = new THREE.Scene();
  const glow = k => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.985, 0.96).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false });
  env.add(new THREE.Mesh(new THREE.BoxGeometry(22, 12, 22), new THREE.MeshBasicMaterial({ color: 0x4d4b47, side: THREE.BackSide })));
  const panel = (w, h, k, x, y, z, rx = 0, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), typeof k === 'number' ? glow(k) : k); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m); };
  panel(9, 4, 7.5, 0, 5.8, 1, Math.PI / 2);             // softbox sufitowy
  panel(1, 7, 6, -7.5, 0.5, 2.5, 0, Math.PI / 2);     // pasek lewy
  panel(1, 7, 4.5, 7.5, 0.5, -1.5, 0, -Math.PI / 2);    // pasek prawy
  panel(8, 3, 1.6, 2, 1.5, 10.5, 0, Math.PI);           // wypełnienie zza kamery
  panel(5, 8, new THREE.MeshBasicMaterial({ color: 0x1a1918, side: THREE.DoubleSide }), -4.5, 0, -9);   // flaga
  panel(22, 22, new THREE.MeshBasicMaterial({ color: 0x85837e, side: THREE.DoubleSide }), 0, -5.9, 0, -Math.PI / 2); // jasna posadzka
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-3, 5, 4); scene.add(key);

  /* ---- materiały ---- */
  const M = {
    face: new THREE.MeshPhysicalMaterial({ color: 0xb8bcc1, metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 }),
    side: new THREE.MeshPhysicalMaterial({ color: 0x2c2e32, metalness: 0.8, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.12 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0x2f3134, metalness: 0.9, roughness: 0.42, side: THREE.DoubleSide }),
    tire: new THREE.MeshPhysicalMaterial({ color: 0x18181a, metalness: 0, roughness: 0.78, clearcoat: 0.18, clearcoatRoughness: 0.5, side: THREE.DoubleSide }),
    caliper: new THREE.MeshPhysicalMaterial({ color: 0x6b1d29, metalness: 0.05, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05 }),
    disc: new THREE.MeshStandardMaterial({ color: 0x4a4d51, metalness: 0.9, roughness: 0.5 }),
    nut: new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.14 }),
    cap: new THREE.MeshPhysicalMaterial({ color: 0x2a2b2e, metalness: 0.6, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.05 })
  };
  const seg = mobile ? 72 : 112;
  const lathe = (pts, mat, n = seg) => { const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), n); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, mat); };

  /* ---- felga (promień opony = 1) ---- */
  const wheel = new THREE.Group();
  // opona: przekrój z zaokrąglonymi barkami
  // niski profil, superelipsa (n = 4): środek przekroju r = 0.89, pół-wysokość 0.11, pół-szerokość 0.3
  const tp = [[0.775, 0.255]];
  const se = v => Math.sign(v) * Math.sqrt(Math.abs(v));
  for (let i = 0; i <= 48; i++) { const a = THREE.MathUtils.degToRad(135 - i * 270 / 48); tp.push([0.89 + 0.11 * se(Math.cos(a)), 0.3 * se(Math.sin(a))]); }
  tp.push([0.775, -0.255]);
  wheel.add(lathe(tp, M.tire));
  // obręcz: wnętrze widoczne między ramionami + rant
  wheel.add(lathe([[0.75, -0.26], [0.75, 0.2], [0.765, 0.24], [0.8, 0.258], [0.8, 0.275], [0.775, 0.282]], M.barrel));
  // lico: 5 par ramion o stałej szerokości, wycięte z dysku
  const RO = 0.752, w = 0.052, pairs = 5, half = THREE.MathUtils.degToRad(8);
  const face = new THREE.Shape(); face.absarc(0, 0, RO, 0, Math.PI * 2, false);
  const off = r => Math.asin(w / 2 / r);
  const win = (t1, t2, ri, ro, round = 0.035) => {
    const p = new THREE.Path();
    const a1i = t1 + off(ri), a2i = t2 - off(ri), a1o = t1 + off(ro), a2o = t2 - off(ro);
    if (a2i <= a1i) { // klin zbiegający się w punkt (szczelina między ramionami pary)
      const r0 = w / 2 / Math.sin((t2 - t1) / 2) + 0.03; const m = (t1 + t2) / 2;
      p.moveTo(r0 * Math.cos(m), r0 * Math.sin(m));
    } else { p.moveTo(ri * Math.cos(a1i), ri * Math.sin(a1i)); }
    p.lineTo(ro * Math.cos(a1o), ro * Math.sin(a1o));
    p.absarc(0, 0, ro, a1o, a2o, false);
    if (a2i <= a1i) p.closePath();
    else { p.lineTo(ri * Math.cos(a2i), ri * Math.sin(a2i)); p.absarc(0, 0, ri, a2i, a1i, true); }
    return p;
  };
  for (let k = 0; k < pairs; k++) {
    const c = Math.PI / 2 + k * Math.PI * 2 / pairs;
    face.holes.push(win(c - half, c + half, 0.36, 0.69));                                  // szczelina V w parze
    face.holes.push(win(c + half, c + Math.PI * 2 / pairs - half, 0.25, 0.7));        // duże okno
  }
  const faceGeo = new THREE.ExtrudeGeometry(face, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.014, bevelSegments: 3, curveSegments: mobile ? 36 : 56 });
  const faceMesh = new THREE.Mesh(faceGeo, [M.face, M.side]);
  faceMesh.position.z = 0.17; wheel.add(faceMesh);
  // piasta, nakrętki, dekiel bez znaku
  wheel.add(lathe([[0.21, 0.17], [0.205, 0.25], [0.175, 0.27], [0, 0.28]], M.side, 64));
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + Math.PI / 5 + k * Math.PI * 2 / 5;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.05, 6), M.nut);
    n.rotation.x = Math.PI / 2; n.position.set(0.12 * Math.cos(a), 0.12 * Math.sin(a), 0.29); wheel.add(n);
  }
  wheel.add(lathe([[0.07, 0.285], [0.066, 0.305], [0.04, 0.316], [0, 0.319]], M.cap, 48));
  // tarcza i zacisk za ramionami
  wheel.add(lathe([[0.2, -0.04], [0.6, -0.04], [0.6, 0.0], [0.2, 0.0]], M.disc, 72));
  wheel.add(lathe([[0, -0.2], [0.75, -0.2]], new THREE.MeshBasicMaterial({ color: 0x0e0e0f, side: THREE.DoubleSide }), 48));   // ciemne dno obręczy
  const cal = new THREE.Shape(); const c0 = THREE.MathUtils.degToRad(118), c1 = THREE.MathUtils.degToRad(172);
  cal.absarc(0, 0, 0.71, c0, c1, false); cal.absarc(0, 0, 0.5, c1, c0, true);
  const calGeo = new THREE.ExtrudeGeometry(cal, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3, curveSegments: 20 });
  const caliper = new THREE.Mesh(calGeo, M.caliper); caliper.position.z = -0.02; wheel.add(caliper);

  /* ---- układ: podest (obrót) → przesuw (wtoczenie) → toczenie ---- */
  const stand = new THREE.Group(), slide = new THREE.Group(), roll = new THREE.Group();
  scene.add(stand); stand.add(slide); slide.add(roll); roll.add(wheel);
  // cień kontaktowy: miękka elipsa pod oponą (nie toczy się razem z felgą)
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(30,28,27,.62)'); gr.addColorStop(.45, 'rgba(30,28,27,.24)'); gr.addColorStop(1, 'rgba(30,28,27,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const shadow = (sx, sz, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: o, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.y = -1.002; slide.add(m); return m; };
  shadow(2.2, 0.7, 1); shadow(2.9, 1.25, 0.35);

  /* ---- kamera i animacja ---- */
  const X0 = 3.6, YAW0 = 0.12, YAW1 = -0.62;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const back = t => { const s = 1.25; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
  const smooth = t => t * t * (3 - 2 * t);
  let progress = 0, mx = 0, my = 0, tmx = 0, tmy = 0, t0 = performance.now();
  function frame(now) {
    const t = fixedT ?? (reduced ? 99 : (now - t0) / 1000);
    const kr = Math.min(1, t / 1.7), x = X0 * (1 - back(kr));
    slide.position.x = x;
    roll.rotation.z = (X0 - x) / 1.0;                      // toczenie bez poślizgu: kąt = droga / promień
    const ky = smooth(Math.min(1, Math.max(0, (t - 1.15) / 1.5)));
    const idle = reduced ? 0 : 0.1 * Math.sin(Math.max(0, t - 2.65) * 0.4) * Math.min(1, Math.max(0, t - 2.65));
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    stand.rotation.y = YAW0 + (YAW1 - YAW0) * ky + idle - progress * 0.95 + mx * 0.12;
    stand.rotation.x = my * 0.05;
    const portrait = camera.aspect < 0.9;
    camera.position.set(0, 0.42 - progress * 0.4, (portrait ? 7.4 : mobile ? 5.6 : 6.3) - progress * 1.1);
    camera.lookAt(0, -0.08 - progress * 0.1, 0);
    renderer.render(scene, camera);
  }

  const box = canvas.parentElement;
  const resize = () => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!running) frame(performance.now()); };
  new ResizeObserver(resize).observe(box);

  let running = false, raf = 0;
  const loop = now => { frame(now); raf = requestAnimationFrame(loop); };
  const start = () => { if (running || reduced) return; running = true; raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const onScroll = () => { const r = hero.getBoundingClientRect(); progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))); if (!running) frame(performance.now()); };
  if (!reduced) addEventListener('scroll', onScroll, { passive: true });
  if (fine && !reduced) hero.addEventListener('pointermove', e => { tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); fail(); });
  resize(); t0 = performance.now(); frame(t0);
  canvas.classList.add('is-on');
  if (posterMode) { root.classList.add('poster-mode'); window.__posterReady = true; return; }
  if (reduced) { root.classList.remove('gl-intro'); return; }
  if (fixedT !== null) { onScroll(); window.__posterReady = true; return; }
  let visible = true;
  const sync = () => (visible && !document.hidden ? start() : stop());
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }).observe(hero);
  document.addEventListener('visibilitychange', sync);
  sync();
}

/* AVELNORY — hero 3D (three.js r187, MIT). Bryła maski z przetłoczeniami budowana proceduralnie (bez pobieranego modelu),
   lakier fizyczny: czarny metalik z drobinkami + bezbarwny clearcoat, odbicia studia z sześciokątnymi lampami (env map
   wygenerowana w przeglądarce). Wejście: polerka zmatowione → lustro w przestrzeni ekranu, zsynchronizowana z nagłówkiem.
   Kursor = lampa inspekcyjna (prawdziwe światło punktowe, trafienie liczone analitycznie po powierzchni maski).
   API zgodne z dawnym AvelPaint: u{intro,wipe,defect,lampOn,scroll}, setMouse, setLamp, set, start, stop, render. */
import * as THREE from './vendor/three/three.module.js';

/* wysokość maski y(x, z): x w poprzek auta, z wzdłuż (przód auta = +z), metry */
const sp = t => Math.sqrt(t * t + 0.0004);
function H(x, z) {
  const c = 0.56 + 0.04 * z;
  let y = -0.085 * x * x - 0.018 * z * z + 0.03 * z;
  y += -0.045 * (sp(x - c) + sp(x + c));                    // dwa przetłoczenia
  const ax = Math.abs(x);
  if (ax > 1.02) y -= 1.7 * (ax - 1.02) ** 2;                 // spływ na błotniki
  if (z > 0.95) y -= 1.25 * (z - 0.95) ** 2;                  // zaokrąglenie nosa
  return y;
}
const X0 = -1.95, X1 = 1.95, Z0 = -2.8, Z1 = 1.6;

export function createHero(canvas, opts = {}) {
  const mobile = !!opts.mobile, still = !!opts.static;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const maxDpr = opts.maxDpr || (mobile ? 1.25 : 1.5);
  let scale = 1;

  const BG = 0x07090d;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 4.2, 8.5);

  /* --- studio do odbić: pole sześciokątnych świetlówek w ramie, softbox wzdłuż auta, słabe panele ścienne --- */
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x010102);
  const tubeGeo = new THREE.BoxGeometry(1, 0.06, 0.06);
  const R = 0.42, cols = 13, rows = 22, edges = [];
  for (let q = 0; q < cols; q++) for (let r = 0; r < rows; r++) {
    const cx = (q - (cols - 1) / 2) * R * 1.5, cz = (r - (rows - 1) / 2) * R * Math.sqrt(3) + (q % 2) * R * Math.sqrt(3) / 2;
    for (let k = 0; k < 6; k++) {
      const a0 = k * Math.PI / 3, a1 = a0 + Math.PI / 3;
      const x0 = cx + R * Math.cos(a0), z0 = cz + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), z1 = cz + R * Math.sin(a1);
      edges.push([(x0 + x1) / 2, (z0 + z1) / 2, Math.atan2(z1 - z0, x1 - x0), Math.hypot(x1 - x0, z1 - z0) * 0.9]);
    }
  }
  const tubes = new THREE.InstancedMesh(tubeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), edges.length);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
  edges.forEach(([x, z, a, len], i) => {
    m4.compose(v3.set(x + 1.2, 2.7, z - 4.2), q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), s3.set(len, 1, 1));
    tubes.setMatrixAt(i, m4);
    tubes.setColorAt(i, col.setRGB(1, 1.03, 1.08).multiplyScalar(7 * (0.86 + 0.24 * Math.random())));   // każda rura trochę inna
  });
  env.add(tubes);
  const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.93, 1).multiplyScalar(2.2) });
  const fw = cols * R * 1.5 + 0.3, fd = rows * R * Math.sqrt(3) + 0.5;
  [[0, -fd / 2, fw, 0.04], [0, fd / 2, fw, 0.04], [-fw / 2, 0, 0.04, fd], [fw / 2, 0, 0.04, fd]].forEach(([x, z, w, d]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), frameMat); b.position.set(x + 1.2, 2.7, z - 4.2); env.add(b);
  });
  const soft = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(2.4), side: THREE.DoubleSide }));
  soft.position.set(-3.4, 2.0, -3); soft.rotation.set(-Math.PI / 2, 0.45, 0); env.add(soft);
  const soft2 = soft.clone(); soft2.position.set(3.6, 2.0, -3); soft2.rotation.set(-Math.PI / 2, -0.45, 0); env.add(soft2);
  const wall = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.026, 0.028, 0.034), side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 26), wall); room.position.y = 2; env.add(room);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(env, 0.006, 0.1, 40, { size: 512 });   // 512 px: rury lamp ostre w lustrze
  scene.environment = envRT.texture;
  pmrem.dispose();

  /* --- drobinki metaliku: losowe normalne w mikro-komórkach --- */
  const N = 256, data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const nx = (Math.random() - 0.5) * 0.7, ny = (Math.random() - 0.5) * 0.7, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    data[i * 4] = (nx * 0.5 + 0.5) * 255; data[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; data[i * 4 + 3] = 255;
  }
  const flakes = new THREE.DataTexture(data, N, N);
  flakes.wrapS = flakes.wrapT = THREE.RepeatWrapping; flakes.repeat.set(26, 30);
  flakes.magFilter = THREE.NearestFilter; flakes.minFilter = THREE.LinearMipmapLinearFilter; flakes.generateMipmaps = true; flakes.needsUpdate = true;

  /* --- maska: siatka z funkcji wysokości --- */
  const segX = mobile ? 150 : 230, segZ = mobile ? 150 : 240;
  const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) + (Z0 + Z1) / 2;
    pos.setXYZ(i, x, H(x, z), z);
  }
  geo.computeVertexNormals();

  const u = { intro: opts.intro ?? 0, scroll: 0, defect: opts.defect ?? 0, wipe: opts.defect ? -0.2 : 1.3, lampOn: 0, drops: 1 };
  const shaderU = { uWipe: { value: u.wipe }, uDefect: { value: u.defect }, uRes: { value: new THREE.Vector2(1, 1) } };
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x050608, metalness: 0.2, roughness: 0.42, normalMap: flakes, normalScale: new THREE.Vector2(0.45, 0.45),
    clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1
  });
  paint.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, shaderU);
    sh.fragmentShader = 'uniform float uWipe, uDefect; uniform vec2 uRes;\n' + sh.fragmentShader
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  float wipeS = gl_FragCoord.x / uRes.x + (gl_FragCoord.y / uRes.y - 0.5) * 0.2;
  float dull = uDefect * smoothstep(uWipe - 0.01, uWipe + 0.09, wipeS);
  /* przed polerką: zmatowiony, zamglony lakier; po: lustro */
  material.roughness = mix(material.roughness, 0.6, dull);
  #ifdef USE_CLEARCOAT
  material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.2, dull);
  #endif`)
      .replace('#include <opaque_fragment>', `outgoingLight = mix(outgoingLight, outgoingLight * 0.8 + vec3(0.006, 0.0065, 0.008), dull);
  outgoingLight += vec3(0.75, 0.8, 0.88) * exp(-abs(wipeS - uWipe - 0.04) * 55.) * 0.03 * uDefect;
  #include <opaque_fragment>`);
  };
  const hood = new THREE.Mesh(geo, paint);
  hood.position.z = 0; scene.add(hood);

  /* --- krople na ceramice: płaskie soczewki, pojawiają się za polerką --- */
  const dropN = mobile ? 110 : 220;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 }), dropN);
  const dropData = [];
  for (let i = 0; i < dropN; i++) {
    const x = (Math.random() * 2 - 1) * 1.0, z = -1.9 + Math.random() * 2.75, r = 0.006 + Math.random() ** 2 * 0.016;
    dropData.push([x, z, r]);
  }
  let dropK = -1;
  function placeDrops(k) {
    if (Math.abs(k - dropK) < 0.002) return; dropK = k;
    dropData.forEach(([x, z, r], i) => {
      const s = Math.min(1, Math.max(0, k * 1.6 - (x + 1) / 2 * 0.6));
      m4.compose(v3.set(x, H(x, z) - r * 0.08, z), q4.identity(), s3.set(r * s + 1e-5, r * 0.42 * s + 1e-5, r * s + 1e-5));
      drops.setMatrixAt(i, m4);
    });
    drops.instanceMatrix.needsUpdate = true;
  }
  scene.add(drops);

  /* --- lampa inspekcyjna --- */
  const lamp = new THREE.PointLight(0xfff3e4, 0, 0, 2);
  scene.add(lamp);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  const target = new THREE.Vector3();
  const mouse = [0, 0], mouseT = [0, 0], lampS = [0.78, 0.62], lampT = [0.78, 0.62];
  const ray = new THREE.Vector3(), hitP = new THREE.Vector3(), nrm = new THREE.Vector3();
  function hitHood(o, d) {
    let t = 0.3, prev = o.y - H(o.x, o.z);
    for (let i = 0; i < 90; i++) {
      const t1 = t + 0.07, px = o.x + d.x * t1, pz = o.z + d.z * t1, f = o.y + d.y * t1 - H(px, pz);
      if (f < 0 && prev >= 0) {
        let a = t, b = t1;
        for (let j = 0; j < 14; j++) { const m = (a + b) / 2; (o.y + d.y * m - H(o.x + d.x * m, o.z + d.z * m)) > 0 ? a = m : b = m; }
        hitP.copy(o).addScaledVector(d, (a + b) / 2);
        return hitP.x > X0 && hitP.x < X1 && hitP.z > Z0 && hitP.z < Z1;
      }
      prev = f; t = t1;
    }
    return false;
  }

  let w = 2, h = 2;
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(2, r.width); h = Math.max(2, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * scale;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = w < h;
    // kadr: na desktopie bryła po prawej (nagłówek po lewej), na telefonie w górnej części ekranu
    camera.setViewOffset(w, h, portrait ? 0 : -w * 0.17, portrait ? h * 0.25 : 0, w, h);
    camera.fov = portrait ? 46 : 30;
    camera.updateProjectionMatrix();
    shaderU.uRes.value.set(w * dpr, h * dpr);
    if (!running) render();
  }

  const t0 = performance.now(); let running = false, raf = 0, last = 0, times = [];
  const D = THREE.MathUtils.degToRad;
  function render(now = performance.now()) {
    const t = still ? 0 : (now - t0) / 1000;
    const k = still ? 1 : 0.06;
    mouse[0] += (mouseT[0] - mouse[0]) * k; mouse[1] += (mouseT[1] - mouse[1]) * k;
    lampS[0] += (lampT[0] - lampS[0]) * (still ? 1 : 0.14); lampS[1] += (lampT[1] - lampS[1]) * (still ? 1 : 0.14);
    const s = u.scroll, ease = 1 - Math.pow(1 - Math.min(1, u.intro), 3);
    const portrait = w < h;
    // kamera: wjazd przy starcie, powolne okrążanie, przy przewijaniu schodzi nisko nad lakier
    const az = D((portrait ? 26 : 34) + 16 * (1 - ease) - 20 * s + Math.sin(t * 0.11) * 6 + mouse[0] * 5);
    const el = D((portrait ? 30 : 23) + 6 * (1 - ease) - 15 * s + mouse[1] * 2);
    const rad = (portrait ? 4.4 : 4.3) + 0.9 * (1 - ease) - 1.1 * s;
    target.set(0, -0.12, -0.35 + 0.4 * s);
    camera.position.set(target.x + rad * Math.cos(el) * Math.sin(az), target.y + rad * Math.sin(el), target.z + rad * Math.cos(el) * Math.cos(az));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    // światła studia zapalają się kolejno z krótkim migotaniem świetlówek
    const on = u.intro < 0.12 ? (Math.random() > 0.55 ? 0.5 : 0.08) * u.intro / 0.12 : Math.min(1, u.intro * 1.15);
    scene.environmentIntensity = on;
    shaderU.uWipe.value = u.wipe; shaderU.uDefect.value = u.defect;
    placeDrops(u.defect > 0.001 ? Math.max(0, (u.wipe - 0.6) / 0.7) : 1);
    // lampa: promień z kamery przez punkt ekranu, trafienie w maskę, światło nad punktem odbicia
    lamp.intensity = 0;
    if (u.lampOn > 0.001) {
      ray.set(lampS[0] * 2 - 1, lampS[1] * 2 - 1, 0.5).unproject(camera).sub(camera.position).normalize();
      if (hitHood(camera.position, ray)) {
        const e = 0.003;
        nrm.set(-(H(hitP.x + e, hitP.z) - H(hitP.x - e, hitP.z)) / (2 * e), 1, -(H(hitP.x, hitP.z + e) - H(hitP.x, hitP.z - e)) / (2 * e)).normalize();
        lamp.position.copy(hitP).addScaledVector(ray.reflect(nrm), 0.55);
        lamp.intensity = 0.9 * u.lampOn;
      }
    }
    renderer.render(scene, camera);
  }
  function loop(now) {
    if (!running) return;
    const dt = now - (last || now); last = now;
    if (dt > 0 && dt < 200) {
      times.push(dt);
      if (times.length >= 45) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length; times = [];
        // adaptacyjna rozdzielczość: przy wolnym GPU mniejszy bufor zamiast klatkowania
        if (avg > 22 && scale > 0.55) { scale = Math.max(0.55, scale - 0.15); resize(); }
        else if (avg < 13 && scale < 1) { scale = Math.min(1, scale + 0.1); resize(); }
      }
    }
    render(now);
    raf = requestAnimationFrame(loop);
  }
  addEventListener('resize', resize, { passive: true });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); api.stop(); canvas.dispatchEvent(new CustomEvent('paint:lost', { bubbles: true })); });
  resize();

  const api = {
    u, gl: renderer.getContext(),
    setMouse(x, y) { mouseT[0] = x; mouseT[1] = y; },
    setLamp(x, y) { lampT[0] = x; lampT[1] = y; },
    set(key, v) { u[key] = v; if (!running) render(); },
    render,
    start() { if (running || still) { render(); return; } running = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); }
  };
  return api;
}

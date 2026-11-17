/* AVELNORY — scena lakieru WebGL (autorski shader, bez bibliotek).
   Tryb 'hero': czarna maska auta pod sześciokątnymi lampami studia, krople wody na ceramice.
   Tryb 'compare': ten sam lakier, po lewej hologramy i zmatowienie, po prawej lustro. */
(() => {
  'use strict';

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  const FRAG = `
#ifdef HAS_DERIV
#extension GL_OES_standard_derivatives : enable
#define FW(x) fwidth(x)
#else
#define FW(x) (0.02)
#endif
precision highp float;
uniform vec2 uRes;
uniform float uTime, uIntro, uScroll, uDrops, uDefect, uSplit, uMode, uSoft;
uniform vec2 uMouse;

float h1(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h2(vec2 p){ float n = h1(p); return vec2(n, h1(p+n*17.13)); }
float sat(float x){ return clamp(x,0.,1.); }

float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.,1.732))), p.x); }
vec4 hexCoords(vec2 uv){
  vec2 r = vec2(1.,1.732), h = r*.5;
  vec2 a = mod(uv, r) - h, b = mod(uv - h, r) - h;
  vec2 gv = dot(a,a) < dot(b,b) ? a : b;
  return vec4(gv, uv - gv);
}

/* lampy zapalają się kolejno z krótkim migotaniem, jak świetlówki w studiu */
float lightOn(vec2 id){
  float hh = h1(id*0.731 + 3.1);
  float t = uIntro*1.7 - hh*0.85 - id.x*0.03;
  if (t <= 0.) return 0.;
  if (t < 0.22) return step(0.45, h1(id + floor(uTime*26.))) * 0.75;
  return 1.;
}

/* współrzędne punktu na suficie, w który patrzy odbicie */
vec2 ceil2(vec3 d, vec3 P, out float t){
  t = 2.4 / max(d.y, 0.02);
  vec2 c = P.xz + d.xz*t;
  c.x -= (uMode > 0.5 ? 0.1 : (uRes.x < uRes.y ? 0.35 : 1.25)) + uMouse.x*0.3;
  c.y += (uMode > 0.5 ? 4.4 : (uRes.x < uRes.y ? 9.5 : 5.6)) + sin(uTime*0.11)*0.3 + uScroll*1.6 + uMouse.y*0.25;
  return c;
}

/* środowisko: czarne studio, pole sześciokątnych lamp LED w ramie, długi softbox, cyjanowa linia LED */
vec3 env(vec3 d, vec3 P, float blur){
  vec3 col = vec3(0.003,0.0035,0.0048);
  /* miękkie panele na ścianach bocznych: rysują zaokrąglenie błotników */
  col += vec3(0.07,0.075,0.085) * smoothstep(0.0,0.22,d.y) * smoothstep(0.55,0.22,d.y) * smoothstep(0.35,0.95,abs(d.x)) * uIntro;
  float strip = exp(-pow((d.y-0.05)/(0.005+blur*0.05),2.)) * smoothstep(-0.2,-0.8,d.z) * smoothstep(0.22,0.05,abs(d.x-0.3));
  col += vec3(0.16,0.72,0.86) * strip * 0.55 * uIntro;
  if (d.y > 0.02){
    float t; vec2 c = ceil2(d, P, t);
    vec4 hc = hexCoords(c/(uMode > 0.5 ? 0.5 : 0.6));
    float e = .5 - hexDist(hc.xy);
    float aa = FW(e)*1.2 + blur*0.5 + 0.0015;
    float w = 0.042;
    float line = (1. - smoothstep(w - aa, w + aa, e)) * (w/(w + blur*0.5));
    vec2 bx = abs(c) - vec2(1.55, 2.1);
    float box = max(bx.x, bx.y);
    float inside = 1. - smoothstep(-0.04, 0.04, box);
    float on = lightOn(hc.zw);
    float fog = exp(-t*0.045);
    vec3 tube = vec3(0.88,0.94,1.0);
    col += tube * line * inside * on * 7.0 * fog;
    float fr = abs(box - 0.13);
    float faa = FW(fr) + blur*0.5 + 0.002;
    col += tube * (1.-smoothstep(0.024-faa,0.024+faa,fr)) * 5.0 * fog * sat(uIntro*1.4-0.6) * (0.024/(0.024+blur*0.5));
    /* długi softbox wzdłuż auta, po lewej */
    float sb = (1. - smoothstep(0.16, 0.16 + 0.02 + blur*0.6, abs(c.x + 2.05))) * smoothstep(6.5, 5.5, abs(c.y + 1.));
    col += tube * sb * (uMode > 0.5 ? 2.2 : 1.1) * fog * sat(uIntro*2.-0.5);
  }
  return col;
}

/* miękka poświata do metalicznej bazy (tania, bez linii) */
float envSoft(vec3 d, vec3 P){
  if (d.y <= 0.02) return 0.;
  float t; vec2 c = ceil2(d, P, t);
  vec2 bx = abs(c) - vec2(1.55, 2.1);
  float a = 1. - smoothstep(-0.8, 1.2, max(bx.x, bx.y));
  float b = 1. - smoothstep(0.2, 1.4, abs(c.x + 2.05));
  return (a*0.5 + b*0.35) * exp(-t*0.05);
}

/* maska: wypukłość, dwa przetłoczenia, opadające błotniki, przednia krawędź */
float sp(float x){ return sqrt(x*x + 0.00025); }
float hood(vec2 q){
  float x = q.x - (uMode > 0.5 ? 0.0 : 0.3);
  float z = q.y;
  float c = 0.55 + 0.05*z;
  float h = -0.22*x*x - 0.012*z*z;
  h += -0.085*(sp(x - c) + sp(x + c));
  h += -1.2*pow(max(0., abs(x) - 1.15), 2.);
  h += 0.03*z + 0.02*sin(x*2.1 + z*0.4);
  h += -0.8*pow(max(0., -z - (uMode > 0.5 ? 9. : 3.6)), 2.);
  return h;
}

vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = (fc - 0.5*uRes) / uRes.y;
  float aspect = uRes.x/uRes.y;
  if (aspect < 1.) uv *= mix(1.0, 0.8, sat((1.-aspect)*2.));

  bool cmp = uMode > 0.5;
  float pitch = cmp ? 0.62 + uMouse.y*0.02 : 0.42 + uScroll*0.14 + uMouse.y*0.03;
  float yaw = uMouse.x*(cmp ? 0.03 : 0.06) + (cmp ? 0. : -0.04);
  vec3 ro = vec3(0., cmp ? 0.9 : 0.75 - uScroll*0.1, 0.);
  vec3 rd = normalize(vec3(uv, cmp ? -1.7 : -2.0));
  float cp = cos(-pitch), spn = sin(-pitch);
  rd.yz = vec2(rd.y*cp - rd.z*spn, rd.y*spn + rd.z*cp);
  float cy = cos(yaw), sy = sin(yaw);
  rd.xz = vec2(rd.x*cy - rd.z*sy, rd.x*sy + rd.z*cy);

  vec3 col = vec3(0.);
  if (rd.y < -0.001){
    float t = -ro.y/rd.y;
    vec3 P = ro + rd*t;
    vec2 q = P.xz;
    float e = 0.003;
    float hx = (hood(q+vec2(e,0.)) - hood(q-vec2(e,0.)))/(2.*e);
    float hz = (hood(q+vec2(0.,e)) - hood(q-vec2(0.,e)))/(2.*e);
    vec3 n = normalize(vec3(-hx, 1., -hz));

    /* płytka głębia ostrości: rozmycie rośnie z odległością od płaszczyzny ostrości */
    float focus = cmp ? 1.6 : 1.9;
    float coc = cmp ? 0.0 : sat(abs(t - focus)/t * 0.55);

    float defect = 0.;
    if (cmp){
      float sx = uSplit*uRes.x;
      defect = uDefect * (1. - smoothstep(sx - 1.0, sx + 1.0, fc.x));
    }

    vec3 r = reflect(rd, n);
    float cosT = sat(dot(-rd, n));
    float F = 0.04 + 0.96*pow(1.-cosT, 5.);

    vec3 refl = env(r, P, coc*0.35);
    if (defect > 0.001){
      vec3 o1 = normalize(cross(r, vec3(0.,1.,0.)) + 1e-4), o2 = cross(r, o1);
      float s = 0.045;
      vec3 hz2 = env(normalize(r + o1*s), P, .3) + env(normalize(r - o1*s), P, .3)
               + env(normalize(r + o2*s), P, .3) + env(normalize(r - o2*s), P, .3);
      refl = mix(refl, hz2*0.22, defect*0.85);
    }

    float soft = envSoft(normalize(r + vec3(0., 0.12, 0.)), P);
    vec3 base = vec3(0.0025,0.0028,0.0036) + vec3(0.045,0.05,0.062)*soft*uIntro;
    vec2 fcell = floor(q*520.);
    float sparkle = step(0.994, h1(fcell)) * soft * (1. - coc) * 0.5 * (1. - uMode);
    base += vec3(0.85,0.9,1.0) * sparkle * uIntro * (1. - defect*0.7);
    base += defect * vec3(0.012,0.012,0.013);

    col = base*(1.-F) + refl*F;

    if (defect > 0.001){
      float glow = envSoft(r, P) + envSoft(normalize(r + vec3(0.06,0.04,0.)), P);
      float sw = 0.;
      for (int L = 0; L < 2; L++){
        vec2 gq = q*1.7 + float(L)*vec2(0.37,0.61);
        vec2 cell = floor(gq);
        vec2 cc = cell + 0.2 + 0.6*h2(cell + float(L)*9.1);
        vec2 dv = gq - cc;
        float rho = length(dv)*140.;
        float k = floor(rho);
        float ang = atan(dv.y, dv.x);
        float hk = h1(vec2(k, cell.x*13. + cell.y*7. + float(L)));
        float arc = smoothstep(0.55, 0.98, sin(ang*2. + hk*6.283)) * step(0.55, hk);
        float ln = 1. - smoothstep(0.0, 0.08 + FW(rho)*0.9, abs(fract(rho) - 0.5));
        sw += arc*ln;
      }
      col += vec3(0.8,0.85,0.9) * glow * glow * sw * defect * 0.3;
      vec2 wq = q*3.1; vec2 wc = floor(wq); vec2 wh = h2(wc+4.2);
      float wr = 0.16 + 0.12*wh.x;
      float wd = length(fract(wq) - (0.32 + 0.36*wh));
      float spot = step(0.6, wh.y) * (1. - smoothstep(0.0, 0.015 + FW(wd), abs(wd - wr)));
      col += vec3(0.02) * spot * defect * (0.2 + soft);
    }

    /* krople wody na ceramice */
    if (!cmp && uDrops > 0.001){
      for (int L = 0; L < 2; L++){
        float S = L == 0 ? 0.085 : 0.034;
        float slide = uScroll*uScroll*(L == 0 ? 1.4 : 1.0);
        vec2 dq = (q + vec2(0., slide)) / S;
        vec2 cell = floor(dq);
        vec2 f = fract(dq);
        vec2 hh = h2(cell + float(L)*31.7);
        float dens = (L == 0 ? 0.13 : 0.0) * uDrops * (1. - uScroll*0.75) * smoothstep(L == 0 ? 4.0 : 2.6, L == 0 ? 2.0 : 1.4, t);
        if (hh.x < dens){
          float rr = mix(0.14, 0.32, pow(h1(cell*1.7 + float(L)), 1.5));
          rr *= 1. - uScroll*0.35;
          vec2 cen = rr*1.3 + (1. - 2.6*rr)*h2(cell*3.1 + 1.3);
          vec2 o = (f - cen)/rr;
          float d = length(o);
          float aa = FW(d)*1.2 + 0.02 + coc*0.6;
          col *= mix(0.4, 1., smoothstep(0.8, 1.3 + coc*0.5, d));
          if (d < 1. + aa){
            float hz3 = sqrt(max(0., 1. - d*d));
            vec3 nd = normalize(vec3(o.x, hz3*1.2, o.y) + (n - vec3(0.,1.,0.)));
            float Fd = 0.03 + 0.97*pow(1. - sat(dot(-rd, nd)), 5.);
            vec3 dr = env(reflect(rd, nd), P, coc*0.3);
            /* odblask od pola lamp + jasny półksiężyc na przeciwnej stronie (soczewka) */
            vec3 Ld = normalize(vec3(0.35, 1., -0.9));
            float glint = pow(sat(dot(reflect(rd, nd), Ld)), 220.) * 1.6;
            float crescent = smoothstep(0.55, 0.95, d) * smoothstep(0.2, 0.9, dot(normalize(o + 1e-4), normalize(vec2(-0.35, 0.9)))) ;
            vec3 dc = dr*Fd*1.6 + vec3(0.85,0.92,1.)*(glint + crescent*0.12*uIntro);
            dc *= mix(1., 0.2, smoothstep(0.8, 1.0, d));
            dc += vec3(0.002,0.0025,0.003);
            col = mix(col, dc, 1. - smoothstep(1. - aa, 1. + aa, d));
          }
        }
      }
    }

    col *= smoothstep(12., 3.5, t);
  }

  vec2 vq = fc/uRes;
  float vig = 0.3 + 0.7*pow(16.*vq.x*vq.y*(1.-vq.x)*(1.-vq.y), 0.25);
  col *= vig;
  col = aces(col*1.1);
  col = pow(col, vec3(1./2.2));
  col += (h1(fc + fract(uTime)*91.) - .5) * 0.014;
  col *= uSoft;
  gl_FragColor = vec4(col, 1.);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(log); }
    return s;
  }

  class PaintScene {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.mode = opts.mode === 'compare' ? 1 : 0;
      this.static = !!opts.static;
      this.maxDpr = opts.maxDpr || 1.5;
      this.scale = 1;
      this.u = { intro: opts.intro ?? 0, scroll: 0, drops: this.mode ? 0 : 1, defect: this.mode ? 1 : 0, split: 0.5, soft: 1 };
      this.mouse = [0, 0]; this.mouseT = [0, 0];
      this.visible = true; this.running = false; this.t0 = performance.now(); this.timeOffset = opts.timeOffset || 0;
      const attrs = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve };
      const gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('no-webgl');
      this.gl = gl;
      const deriv = gl.getExtension('OES_standard_derivatives');
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, (deriv ? '#define HAS_DERIV\n' : '') + FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.loc = {};
      for (const n of ['uRes', 'uTime', 'uIntro', 'uScroll', 'uDrops', 'uDefect', 'uSplit', 'uMode', 'uMouse', 'uSoft']) this.loc[n] = gl.getUniformLocation(prog, n);
      this.frameTimes = [];
      this.resize();
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize, { passive: true });
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.stop(); canvas.dispatchEvent(new CustomEvent('paint:lost', { bubbles: true })); });
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr) * this.scale;
      const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.gl.viewport(0, 0, w, h);
      if (!this.running) this.render();
    }
    setMouse(x, y) { this.mouseT = [x, y]; }
    set(key, v) { this.u[key] = v; if (!this.running) this.render(); }
    render(now = performance.now()) {
      const gl = this.gl, L = this.loc, u = this.u;
      const k = this.static ? 1 : 0.06;
      this.mouse[0] += (this.mouseT[0] - this.mouse[0]) * k;
      this.mouse[1] += (this.mouseT[1] - this.mouse[1]) * k;
      const time = this.static ? this.timeOffset : (now - this.t0) / 1000 + this.timeOffset;
      gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
      gl.uniform1f(L.uTime, time);
      gl.uniform1f(L.uIntro, u.intro); gl.uniform1f(L.uScroll, u.scroll);
      gl.uniform1f(L.uDrops, u.drops); gl.uniform1f(L.uDefect, u.defect);
      gl.uniform1f(L.uSplit, u.split); gl.uniform1f(L.uMode, this.mode);
      gl.uniform1f(L.uSoft, u.soft);
      gl.uniform2f(L.uMouse, this.mouse[0], this.mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    loop = now => {
      if (!this.running) return;
      const dt = now - (this.last || now); this.last = now;
      // Adaptacyjna rozdzielczość: przy wolnym GPU zmniejszamy bufor, żeby zachować płynność.
      if (dt > 0 && dt < 200) {
        this.frameTimes.push(dt);
        if (this.frameTimes.length >= 40) {
          const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
          this.frameTimes = [];
          if (avg > 22 && this.scale > 0.5) { this.scale = Math.max(0.5, this.scale - 0.2); this.resize(); }
          else if (avg < 14 && this.scale < 1) { this.scale = Math.min(1, this.scale + 0.1); this.resize(); }
        }
      }
      this.render(now);
      this.raf = requestAnimationFrame(this.loop);
    };
    start() { if (this.running || this.static) { this.render(); return; } this.running = true; this.last = 0; this.raf = requestAnimationFrame(this.loop); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
  }

  window.AvelPaint = PaintScene;
})();

/* Rovai Heavy Industries: the hero field.
   An abstract heat field drawn as contour lines (isotherms) round a hot body. The lines are cool
   and faint far from it and glow as they near it, a front of light travels outwards every few
   seconds, and the pointer is a second source of heat. One WebGL2 fragment shader; without
   WebGL2 the hero keeps the static rings from the stylesheet.
   Any element with data-field and a canvas.hero-gl inside it gets a field. Optional
   data-fx / data-fy place the hot body (0 to 1 across and down the element).
   The 3D simplex noise is by Ian McEwan and Stefan Gustavson (Ashima Arts), MIT licence. */
(() => {
  'use strict';

  const hero = document.querySelector('[data-field]');
  const cvs = hero && hero.querySelector('.hero-gl');
  if (!cvs) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = new URLSearchParams(location.search);
  const FREEZE = qs.has('freeze') ? parseFloat(qs.get('freeze')) || 0 : null;   // ?freeze=<s>: a still at that moment
  const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

  const T0 = 23;          // where the field starts in its own time: a composition that reads well at once
  const IN_T = 2.1;       // seconds the lines take to spread from the hot body

  let gl = null, prog = null;
  const U = {};
  let W = 0, H = 0, fx = 0.77, fy = 0.42, rs = 1, rsCap = 2, dprSeen = 1, ready = false;
  let running = false, raf = 0, last = 0, clock = 0, born = 0, scrollP = 0, drawnAt = 0;
  let frames = 0, slowAcc = 0, probeEvery = 45, resizeNext = false;
  const px1 = new Uint8Array(4);
  let staticMode = false, govN = 0, govAcc = 0, govStrikes = 0, govDone = false;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, s: 0, target: 0, has: false };

  /* ---------- shaders ---------- */
  const VS = `#version 300 es
  layout(location = 0) in vec2 aPos;
  out vec2 vUv;
  void main(){
    vUv = vec2(aPos.x * .5 + .5, .5 - aPos.y * .5);
    gl_Position = vec4(aPos, 0., 1.);
  }`;

  const FS = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 o;
  uniform vec2 uRes, uFocus;
  uniform float uTime, uIn, uScroll, uPx;
  uniform vec3 uPtr;

  vec3 mod289(vec3 x){ return x - floor(x * (1. / 289.)) * 289.; }
  vec4 mod289(vec4 x){ return x - floor(x * (1. / 289.)) * 289.; }
  vec4 permute(vec4 x){ return mod289(((x * 34.) + 1.) * x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - .85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1. / 6., 1. / 3.);
    const vec4 D = vec4(0., .5, 1., 2.);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y + vec4(0., i1.y, i2.y, 1.)) + i.x + vec4(0., i1.x, i2.x, 1.));
    vec3 ns = .142857142857 * D.wyz - D.xzx;
    vec4 j = p - 49. * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7. * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1. - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2. + 1.;
    vec4 s1 = floor(b1) * 2. + 1.;
    vec4 sh = -step(h, vec4(0.));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.);
    m = m * m;
    return 42. * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main(){
    vec2 px = vUv * uRes;
    float unit = min(uRes.y, uRes.x * 1.15);
    vec2 p = (px - uFocus * uRes) / unit;
    float t = uTime;

    /* temperature: a hot body, slow turbulence, and the pointer */
    float f = 1.15 * exp(-dot(p, p) / .34) - .22;
    f += .30 * snoise(vec3(p * 1.25 + vec2(0., t * .012), t * .045));
    f += .11 * snoise(vec3(p * 2.9 + 11.3, t * .07 + 4.));
    vec2 dp = (px - uPtr.xy) / unit;
    f += uPtr.z * .40 * exp(-dot(dp, dp) / .012);

    /* isotherms: a line wherever the field crosses a level, every fourth one heavier */
    float v = f * 11.;
    float dist = abs(fract(v - .5) - .5) / max(fwidth(v), 1e-5);   /* device pixels to the nearest line */
    float major = 1. - step(.5, mod(floor(v + .5) + 404., 4.));
    float w = uPx * mix(.5, .8, major);
    float line = 1. - smoothstep(w - .65, w + .65, dist);

    float heat = smoothstep(.02, .62, f);
    vec3 cool = vec3(.62, .59, .53), warm = vec3(1., .353, .122), hot = vec3(1., .72, .42);
    vec3 lc = mix(cool, warm, smoothstep(0., .42, f));
    lc = mix(lc, hot, smoothstep(.55, 1.05, f));
    float la = mix(.12, .30, major) + heat * mix(.40, .62, major);

    /* a front of light travelling outwards, from hot to cold */
    float ph = fract(t * .07);
    float front = exp(-pow((f - mix(1.2, -.6, ph)) * 9., 2.)) * sin(ph * 3.14159);
    la += front * .5;
    lc = mix(lc, hot, front * .55);

    float rev = smoothstep(0., 1., clamp(uIn * 3.3 - length(p) * 1.15, 0., 1.));
    vec3 bg = vec3(.0431, .0392, .0353);
    vec3 col = bg + warm * smoothstep(.15, 1.1, f) * .055 * rev;
    col = mix(col, lc, clamp(line * la, 0., 1.) * rev);
    col += warm * exp(-dist / (uPx * 7.)) * heat * heat * .14 * rev;
    col = mix(bg, col, 1. - .9 * uScroll);
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
    o = vec4(col, 1.);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }

  function initGL() {
    try {
      gl = cvs.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
      if (!gl) return false;
      // Firefox reports the real renderer through RENDERER and warns about the debug extension
      const dbg = /firefox/i.test(navigator.userAgent) ? null : gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
      if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) { gl = null; return false; }
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uRes', 'uFocus', 'uTime', 'uIn', 'uScroll', 'uPx', 'uPtr']) U[n] = gl.getUniformLocation(prog, n);
      return true;
    } catch (err) {
      if (window.console) console.warn('Field: WebGL2 unavailable, using the static rings.', err && err.message);
      gl = null; return false;
    }
  }

  function draw() {
    if (!gl) return;
    const e = reduce || FREEZE !== null ? 1 : 1 - Math.pow(1 - born, 3);
    gl.viewport(0, 0, cvs.width, cvs.height);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform2f(U.uFocus, fx, fy);
    gl.uniform1f(U.uTime, T0 + (FREEZE !== null ? FREEZE : reduce ? 0 : clock));
    gl.uniform1f(U.uIn, e);
    gl.uniform1f(U.uScroll, scrollP);
    gl.uniform1f(U.uPx, cvs.width / W);
    gl.uniform3f(U.uPtr, ptr.x, ptr.y, staticMode ? 0 : ptr.s);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function sizeCanvas() {
    dprSeen = window.devicePixelRatio || 1;
    rs = Math.min(dprSeen, rsCap);
    if (gl) { cvs.width = Math.max(2, Math.round(W * rs)); cvs.height = Math.max(2, Math.round(H * rs)); }
  }

  function rebuild() {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const wide = W / H > 1.05;
    fx = num(hero.dataset.fx, wide ? 0.77 : 0.76);
    fy = num(hero.dataset.fy, wide ? 0.42 : 0.26);
    sizeCanvas();
    ready = true;
    if (!running || staticMode) draw();
  }

  /* ---------- frame ---------- */
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    const real = t - (last || t);
    const dt = Math.min(0.05, Math.max(0.001, real));
    last = t; clock += dt;
    govern(real);
    // a resize clears the canvas, so it has to happen before this frame is drawn, never after
    if (resizeNext) { resizeNext = false; sizeCanvas(); }
    if (window.devicePixelRatio !== dprSeen) syncDPR();
    if (!running) return;   // the governor just settled for a still frame

    born = Math.min(1, born + dt / IN_T);
    const k = Math.min(1, dt * 9);
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
    ptr.s += (ptr.target - ptr.s) * Math.min(1, dt * 5);

    // The field drifts slowly, so while nothing else is moving every other frame is enough.
    const busy = born < 1 || ptr.target > 0 || ptr.s > 0.004;
    slowAcc += dt; frames++;
    if (!busy && t - drawnAt < 0.03) return;
    drawnAt = t;
    draw();

    // Keep the frame rate: drop resolution if the GPU struggles. Slow frames alone do not prove
    // that, because Low Power Mode and 30 Hz screens cap the refresh rate, so one real frame is
    // timed on the GPU before any resolution is given up.
    if (gl && FREEZE === null && frames >= probeEvery) {
      const avg = slowAcc / frames; frames = 0; slowAcc = 0;
      if (avg > 0.0215 && rs > 0.62 && document.visibilityState === 'visible') {
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1);   // drain what is already queued
        const t0 = performance.now();
        draw();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1);   // waits for the GPU to finish the frame
        if (performance.now() - t0 > 14) { rsCap = Math.max(0.6, rs * 0.8); resizeNext = true; probeEvery = 45; }
        else probeEvery = Math.min(720, probeEvery * 2);              // capped refresh, healthy GPU: ask less often
      } else probeEvery = 45;
    }
  }

  /* A GPU that cannot hold a usable frame rate gets one more chance at half resolution,
     then a single still frame. */
  function govern(real) {
    if (govDone || staticMode || !gl || FREEZE !== null || document.visibilityState !== 'visible') return;
    if (++govN <= 2) return;
    govAcc += real;
    if (govN < 8) return;
    const avg = govAcc / 6; govN = 0; govAcc = 0;
    if (avg <= 0.07) { govDone = true; return; }
    if (++govStrikes === 1 && rs > 0.55) { rsCap = 0.5; sizeCanvas(); return; }
    staticMode = true;
    born = 1; ptr.s = ptr.target = 0;   // the still frame must not bake in the pointer's heat
    stop();
    draw();
  }

  function start() {
    if (running || reduce || staticMode) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // How far the next section has ridden up over the field: 0 untouched, 1 covered.
  function visible() {
    const next = hero.nextElementSibling;
    const top = next ? next.getBoundingClientRect().top : H;
    scrollP = Math.max(0, Math.min(1, 1 - top / Math.max(1, H)));
    return scrollP < 0.995 && document.visibilityState === 'visible';
  }
  function sync() {
    if (!ready) return;   // scroll and visibility events can arrive before boot
    const v = visible();
    cvs.style.visibility = scrollP >= 0.995 ? 'hidden' : '';
    if (v) start(); else stop();
    if ((reduce || staticMode) && gl) draw();   // a still frame follows the scroll fade by hand
  }

  /* ---------- pointer: a second source of heat ---------- */
  function at(e) { const r = hero.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function onMove(e) {
    if (e.pointerType === 'touch') return;
    const [x, y] = at(e);
    ptr.tx = x; ptr.ty = y;
    if (!ptr.has) { ptr.x = x; ptr.y = y; ptr.has = true; }
    ptr.target = 1;
  }
  function onDown(e) {
    if (e.pointerType !== 'touch' || (e.target.closest && e.target.closest('a,button,nav'))) return;
    const [x, y] = at(e);
    ptr.x = ptr.tx = x; ptr.y = ptr.ty = y; ptr.s = 1; ptr.target = 0;   // a touch warms the spot, then it cools
  }

  /* ---------- boot ---------- */
  const ok = initGL();
  hero.classList.add(ok ? 'has-gl' : 'no-gl');

  function boot() {
    rebuild();
    watchDPR();
    if (reduce) { draw(); return; }
    sync();
  }

  // Moving the window to a screen with another pixel ratio changes the scale without a resize event.
  // The running loop notices on its next frame; the media query covers the still frame (reduced motion).
  let dprMQ = null;
  function watchDPR() {
    if (dprMQ) dprMQ.removeEventListener('change', syncDPR);
    dprMQ = matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    if (dprMQ.addEventListener) dprMQ.addEventListener('change', syncDPR); else dprMQ = null;
  }
  function syncDPR() {
    if ((window.devicePixelRatio || 1) === dprSeen || !ready) return;
    watchDPR();
    rebuild();
  }

  let rz = 0;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(() => {
    if (!ready) return;   // the observer fires once before boot
    const r = hero.getBoundingClientRect();
    if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) rebuild();
  }, 140); };
  addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(hero);
  addEventListener('scroll', sync, { passive: true });
  document.addEventListener('visibilitychange', sync);
  addEventListener('pageshow', sync);   // back/forward cache restores do not always fire visibilitychange
  if (!reduce) {                        // with reduced motion nothing is animated, so the pointer is cold too
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', () => { ptr.target = 0; ptr.has = false; });
    hero.addEventListener('pointerdown', onDown, { passive: true });
  }
  // A lost context falls back to the static rings; the field comes back if the browser restores it.
  cvs.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    gl = null;
    hero.classList.remove('has-gl'); hero.classList.add('no-gl');
    sync();
  });
  cvs.addEventListener('webglcontextrestored', () => {
    if (!initGL()) return;
    hero.classList.remove('no-gl'); hero.classList.add('has-gl');
    if (ready) { rebuild(); sync(); }
  });

  requestAnimationFrame(boot);
})();

// Behaviour checks for the site: hero field, nav, phone menu, featured reel, statement, counters, fallbacks.
// usage: NODE_PATH=<folder with playwright>/node_modules node _tools/regress.js http://127.0.0.1:8765 [chrome|webkit|firefox]
// Serve the repo root first (python3 -m http.server 8765). Chrome runs with the real GPU.
const pw = require('playwright');
(async () => {
  const base = process.argv[2];
  const which = process.argv[3] || 'chrome';
  const browser = which === 'chrome'
    ? await pw.chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu'] })
    : await pw[which].launch({ headless: true });
  const results = [];
  const noisy = m => !/GPU stall|Automatic fallback to software WebGL|GroupMarkerNotSet/.test(m);

  async function open(path, opt = {}) {
    const ctx = await browser.newContext({ viewport: { width: opt.w || 1440, height: opt.h || 900 }, deviceScaleFactor: opt.dpr || 1,
      reducedMotion: opt.reduced ? 'reduce' : 'no-preference', hasTouch: !!opt.touch, isMobile: !!opt.touch && which !== 'firefox' });
    if (opt.init) await ctx.addInitScript(opt.init);
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type()) && noisy(m.text())) logs.push(m.text()); });
    page.on('pageerror', e => logs.push('pageerror: ' + e.message));
    page.on('requestfailed', r => logs.push('requestfailed: ' + r.url()));
    await page.goto(base + path, { waitUntil: 'load' });
    await page.waitForTimeout(opt.wait === undefined ? 900 : opt.wait);
    return { ctx, page, logs };
  }
  async function check(name, fn) {
    try { const why = await fn(); results.push({ name, ok: !why, why: why || '' }); }
    catch (e) { results.push({ name, ok: false, why: 'threw: ' + e.message.split('\n')[0] }); }
  }
  const gpu = which === 'chrome';

  await check('home loads clean and the field runs at full resolution', async () => {
    const { ctx, page, logs } = await open('/', { dpr: 2, wait: 4200 });
    const s = await page.evaluate(() => { const h = document.querySelector('.hero'), c = h.querySelector('canvas'); const r = h.getBoundingClientRect();
      return { gl: h.classList.contains('has-gl'), w: c.width, want: Math.round(r.width * Math.min(2, devicePixelRatio)), vis: getComputedStyle(c).display }; });
    await ctx.close();
    if (logs.length) return logs.join(' | ');
    if (gpu && (!s.gl || s.vis === 'none')) return 'field not running: ' + JSON.stringify(s);
    if (s.gl && s.w < s.want * 0.99) return 'canvas ' + s.w + ' wide, wanted ' + s.want;
  });

  await check('profile page loads clean', async () => {
    const { ctx, logs } = await open('/about/', { wait: 1500 });
    await ctx.close();
    if (logs.length) return logs.join(' | ');
  });

  await check('reload while scrolled part-way down throws nothing', async () => {
    const { ctx, page, logs } = await open('/');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, 2600)); await page.waitForTimeout(250);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.evaluate(() => { window.dispatchEvent(new Event('scroll')); document.dispatchEvent(new Event('visibilitychange')); });
      await page.waitForTimeout(700);
    }
    await ctx.close();
    if (logs.length) return logs.length + ' message(s): ' + logs[0];
  });

  await check('the logo goes to the very top', async () => {
    const { ctx, page } = await open('/');
    await page.evaluate(() => window.scrollTo({ top: 3000, behavior: 'instant' })); await page.waitForTimeout(300);
    await page.click('.brand'); await page.waitForTimeout(1700);
    const y = await page.evaluate(() => Math.round(scrollY));
    await ctx.close();
    if (y !== 0) return 'stopped at ' + y;
  });

  await check('every in-page link lands on its section', async () => {
    const { ctx, page } = await open('/');
    const bad = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(id => id !== 'top' && !document.getElementById(id)));
    await ctx.close();
    if (bad.length) return 'no target for: ' + [...new Set(bad)].join(', ');
  });

  await check('nav gains its backdrop and the progress line fills', async () => {
    const { ctx, page } = await open('/');
    const a = await page.evaluate(() => document.querySelector('.nav').classList.contains('is-stuck'));
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await page.waitForTimeout(400);
    const b = await page.evaluate(() => ({ stuck: document.querySelector('.nav').classList.contains('is-stuck'), sx: new DOMMatrix(getComputedStyle(document.querySelector('.nav-progress')).transform).a }));
    await ctx.close();
    if (a) return 'stuck at the top';
    if (!b.stuck || b.sx < 0.99) return JSON.stringify(b);
  });

  await check('phone menu: opens, traps focus, closes on Escape', async () => {
    const { ctx, page } = await open('/', { w: 390, h: 844, touch: true });
    await page.click('.nav-toggle'); await page.waitForTimeout(450);
    const o = await page.evaluate(() => ({ open: document.querySelector('.nav').classList.contains('is-open'), inert: [document.querySelector('main'), document.querySelector('.foot'), document.querySelector('.skip')].every(e => e.inert),
      focusIn: !!document.activeElement.closest('#nav-links'), vis: getComputedStyle(document.querySelector('#nav-links')).visibility,
      cover: (() => { const r = document.querySelector('#nav-links').getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight - 1; })() }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(450);
    const c = await page.evaluate(() => ({ open: document.querySelector('.nav').classList.contains('is-open'), inert: document.querySelector('main').inert, onToggle: document.activeElement === document.querySelector('.nav-toggle') }));
    await ctx.close();
    if (!o.open || !o.inert || !o.focusIn || o.vis !== 'visible' || !o.cover) return 'open: ' + JSON.stringify(o);
    if (c.open || c.inert || !c.onToggle) return 'close: ' + JSON.stringify(c);
  });

  await check('reel: a chip brings its card to the left edge and becomes current', async () => {
    const { ctx, page } = await open('/');
    await page.evaluate(() => document.querySelector('#featured').scrollIntoView({ block: 'start', behavior: 'instant' })); await page.waitForTimeout(300);
    await page.click('.chip[data-go="f-dcat"]'); await page.waitForTimeout(1400);
    const s = await page.evaluate(() => { const reel = document.querySelector('.reel'), c = document.getElementById('f-dcat');
      return { left: Math.round(c.getBoundingClientRect().left - reel.getBoundingClientRect().left - parseFloat(getComputedStyle(reel).paddingLeft)), cur: document.querySelector('.chip[aria-current="true"]').dataset.go, x: Math.round(reel.scrollLeft) }; });
    await ctx.close();
    if (Math.abs(s.left) > 3 || s.cur !== 'f-dcat' || s.x < 100) return JSON.stringify(s);
  });

  await check('reel: a link to text in the last card brings that card on screen', async () => {
    const { ctx, page } = await open('/#:~:text=Nine%20free%20courses', { wait: 1800 });
    const s = await page.evaluate(() => {
      const p = [...document.querySelectorAll('.feature-text')].find(e => e.textContent.startsWith('Nine free courses'));
      const rg = document.createRange(); rg.setStart(p.firstChild, 0); rg.setEnd(p.firstChild, 17);
      const r = rg.getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: innerWidth, h: innerHeight };
    });
    await ctx.close();
    if (s.l < 0 || s.r > s.w || s.t < 0 || s.b > s.h) return JSON.stringify(s);
  });

  await check('reel: keyboard focus in a far card scrolls it into view', async () => {
    const { ctx, page } = await open('/');
    const s = await page.evaluate(async () => {
      const a = [...document.querySelectorAll('.feature-link')].pop();
      a.focus(); await new Promise(r => setTimeout(r, 500));
      const r = a.getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right), w: innerWidth, t: Math.round(r.top), h: innerHeight };
    });
    await ctx.close();
    if (s.l < -2 || s.r > s.w + 2 || s.t < 0 || s.t > s.h) return JSON.stringify(s);
  });

  await check('figures hold still until their card is on screen, then run', async () => {
    const { ctx, page } = await open('/');
    const s = await page.evaluate(async () => {
      const el = document.querySelector('.fig .probe'), card = el.closest('.feature');
      const before = { drawn: card.classList.contains('is-drawn'), state: getComputedStyle(el).animationPlayState, op: getComputedStyle(el).opacity };
      document.querySelector('#featured').scrollIntoView({ block: 'center', behavior: 'instant' });
      const reel = document.querySelector('.reel');
      reel.scrollTo({ left: card.offsetLeft, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 800));
      return { before, after: { drawn: card.classList.contains('is-drawn'), state: getComputedStyle(el).animationPlayState } };
    });
    await ctx.close();
    if (s.before.drawn || s.before.state !== 'paused' || +s.before.op !== 0 || !s.after.drawn || s.after.state !== 'running') return JSON.stringify(s);
  });

  await check('the statement lights word by word as it is scrolled through', async () => {
    const { ctx, page } = await open('/');
    const s = await page.evaluate(async () => {
      const st = document.querySelector('.statement-text'), ws = [...st.querySelectorAll('.w')];
      const top = st.getBoundingClientRect().top + scrollY;
      const read = () => ws.map(w => +getComputedStyle(w).opacity);
      window.scrollTo({ top: top - innerHeight * 0.95, behavior: 'instant' }); await new Promise(r => setTimeout(r, 700));
      const a = read();
      window.scrollTo({ top: top - innerHeight * 0.6, behavior: 'instant' }); await new Promise(r => setTimeout(r, 700));
      const b = read();
      window.scrollTo({ top: top - innerHeight * 0.1, behavior: 'instant' }); await new Promise(r => setTimeout(r, 700));
      const c = read();
      const lit = v => v.filter(x => x > 0.95).length;
      return { n: ws.length, a: lit(a), b: lit(b), c: lit(c), text: st.textContent.slice(0, 24) };
    });
    await ctx.close();
    if (s.n < 20 || s.a !== 0 || s.b <= 0 || s.b >= s.n || s.c !== s.n || s.text !== 'We build the load-bearin') return JSON.stringify(s);
  });

  await check('counters roll to their values', async () => {
    const { ctx, page } = await open('/');
    const s = await page.evaluate(async () => {
      document.querySelector('#output .gauges').scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise(r => setTimeout(r, 3100));
      const c = document.querySelector('.counter[data-value="2900"]');
      return { label: c.getAttribute('aria-label'), digits: [...c.querySelectorAll('.drum > span')].map(r => Math.round(-new DOMMatrix(getComputedStyle(r).transform).f / parseFloat(getComputedStyle(r.parentNode).height))) };
    });
    await ctx.close();
    if (s.label !== '2,900+' || s.digits.join('') !== '2900') return JSON.stringify(s);
  });

  await check('reduced motion: one still frame, plain statement, copy visible', async () => {
    const { ctx, page, logs } = await open('/', { reduced: true, wait: 700 });
    const s = await page.evaluate(() => ({ words: document.querySelectorAll('.statement-text .w').length, op: getComputedStyle(document.querySelector('.hero-line')).opacity,
      cue: getComputedStyle(document.querySelector('.hero-cue')).display, snap: getComputedStyle(document.querySelector('.reel')).scrollSnapType }));
    await ctx.close();
    if (logs.length) return logs[0];
    if (s.words !== 0 || +s.op !== 1 || s.cue !== 'none' || s.snap !== 'none') return JSON.stringify(s);
  });

  await check('no WebGL2: static rings, no canvas, no errors', async () => {
    const { ctx, page, logs } = await open('/', { init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; } });
    const s = await page.evaluate(() => { const h = document.querySelector('.hero'); return { no: h.classList.contains('no-gl'), cv: getComputedStyle(h.querySelector('canvas')).display, bg: getComputedStyle(h).backgroundImage.includes('repeating-radial-gradient') }; });
    await ctx.close();
    if (logs.length) return logs[0];
    if (!s.no || s.cv !== 'none' || !s.bg) return JSON.stringify(s);
  });

  if (gpu) await check('a lost WebGL context falls back and comes back', async () => {
    const { ctx, page, logs } = await open('/');
    const s = await page.evaluate(async () => {
      const h = document.querySelector('.hero'), c = h.querySelector('canvas');
      const ext = c.getContext('webgl2').getExtension('WEBGL_lose_context');
      ext.loseContext(); await new Promise(r => setTimeout(r, 400));
      const lost = { no: h.classList.contains('no-gl'), cv: getComputedStyle(c).display };
      ext.restoreContext(); await new Promise(r => setTimeout(r, 700));
      return { lost, back: { gl: h.classList.contains('has-gl'), cv: getComputedStyle(c).display } };
    });
    await ctx.close();
    if (logs.length) return logs[0];
    if (!s.lost.no || s.lost.cv !== 'none' || !s.back.gl || s.back.cv === 'none') return JSON.stringify(s);
  });

  if (gpu) await check('the pointer warms the field and the still frame ignores it', async () => {
    const shot = async (reduced) => {
      const { ctx, page } = await open('/?freeze=0', { reduced, wait: 900 });
      const a = await page.screenshot({ clip: { x: 300, y: 80, width: 300, height: 240 } });
      await page.mouse.move(430, 190, { steps: 6 }); await page.mouse.move(450, 200, { steps: 6 }); await page.waitForTimeout(900);
      const b = await page.screenshot({ clip: { x: 300, y: 80, width: 300, height: 240 } });
      await ctx.close();
      return !a.equals(b);
    };
    const moving = await shot(false), still = await shot(true);
    if (!moving) return 'pointer changed nothing';
    if (still) return 'reduced-motion frame changed under the pointer';
  });

  await check('no sideways overflow at six window sizes, both pages', async () => {
    const bad = [];
    for (const path of ['/', '/about/']) {
      const { ctx, page } = await open(path, { w: 320, h: 568, wait: 300 });
      for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
        await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(220);
        const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (o > 0) bad.push(path + ' ' + w + 'x' + h + ' +' + o);
      }
      await ctx.close();
    }
    if (bad.length) return bad.join(', ');
  });

  await check('the company page shows no personal profile', async () => {
    const { ctx, page } = await open('/');
    const s = await page.evaluate(() => ({ about: document.querySelectorAll('a[href*="/about"]').length, linkedin: document.querySelectorAll('a[href*="linkedin.com"]').length,
      photo: document.querySelectorAll('img[src*="fabio-rovai"]').length, named: (document.querySelector('main').innerText.match(/Fabio/g) || []).length }));
    await ctx.close();
    if (s.about || s.linkedin || s.photo || s.named) return JSON.stringify(s);
  });

  await browser.close();
  for (const r of results) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : '\n      ' + r.why));
  const failed = results.filter(r => !r.ok).length;
  console.log(`[${which}] ${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('REGRESS FAILED', e.message); process.exit(2); });

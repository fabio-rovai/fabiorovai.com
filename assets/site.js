/* Rovai Heavy Industries: site behaviour.
   Nav and its progress line, the phone menu, scroll reveals, the featured reel,
   the statement that lights word by word, rolling counters and the card spotlight. No dependencies. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Safari before 14 has no addEventListener on media query lists
  const onMQ = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };

  /* ---------- nav ---------- */
  const nav = $('#nav'), toggle = $('.nav-toggle'), links = $('#nav-links');
  const behind = [$('.skip'), $('main'), $('.foot')].filter(Boolean);
  function setMenu(open) {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    // the open menu covers the page, so nothing behind it may take focus
    for (const el of behind) el.inert = open;
    if (open) { const first = links.querySelector('a'); if (first) first.focus({ preventScroll: true }); }
  }
  if (toggle) {
    toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
    onMQ(matchMedia('(min-width: 901px)'), e => { if (e.matches) setMenu(false); });
  }

  /* ---------- reveals ---------- */
  const io = 'IntersectionObserver' in window;
  function watch(els, cls, opts) {
    if (!els.length) return;
    if (!io) { els.forEach(el => el.classList.add(cls)); return; }
    const ob = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add(cls); ob.unobserve(en.target); }
    }, opts);
    els.forEach(el => ob.observe(el));
  }
  watch($$('.reveal'), 'is-in', { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  // a figure draws itself, and starts moving, once a third of its card is on screen
  watch($$('.feature'), 'is-drawn', { threshold: 0.34 });

  /* ---------- rolling counters ---------- */
  function buildCounter(el) {
    const value = el.dataset.value, suffix = el.dataset.suffix || '';
    if (!value) return;
    const label = el.textContent.trim();
    const digits = String(value).split('');
    el.textContent = '';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
    digits.forEach((d, i) => {
      const fromRight = digits.length - i;
      if (i > 0 && fromRight % 3 === 0) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = ','; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); }
      const drum = document.createElement('span'); drum.className = 'drum'; drum.setAttribute('aria-hidden', 'true');
      const reel = document.createElement('span');
      reel.style.setProperty('--dd', (digits.length - 1 - i) * 130 + 'ms');
      for (let n = 0; n <= 9; n++) { const b = document.createElement('b'); b.textContent = n; reel.appendChild(b); }
      reel.dataset.to = d;
      drum.appendChild(reel); el.appendChild(drum);
    });
    if (suffix) { const s = document.createElement('span'); s.className = 'suffix'; s.textContent = suffix; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); }
  }
  function rollCounter(el) { $$('.drum > span', el).forEach(r => { r.style.transform = 'translateY(' + (-r.dataset.to) + 'em)'; }); }
  const counters = $$('.counter[data-value]');
  counters.forEach(buildCounter);
  if (io && !reduce) {
    const ob = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { rollCounter(en.target); ob.unobserve(en.target); } }, { threshold: 0.6 });
    counters.forEach(c => ob.observe(c));
  } else counters.forEach(rollCounter);

  /* ---------- featured reel ----------
     A real sideways scroller, so touch, trackpad, keyboard focus and find-in-page all work on their own.
     The chips jump to a card, and the chip of the card at the left edge is marked as current. */
  const reel = $('.reel'), chips = $$('.chip');
  if (reel && chips.length) {
    const cards = $$('.feature', reel);
    const pad = () => parseFloat(getComputedStyle(reel).paddingLeft) || 0;
    chips.forEach(ch => ch.addEventListener('click', () => {
      const c = document.getElementById(ch.dataset.go);
      if (c) reel.scrollTo({ left: c.offsetLeft - pad(), behavior: reduce ? 'auto' : 'smooth' });
    }));
    let queued = false;
    const mark = () => {
      queued = false;
      const x = reel.scrollLeft + pad() + reel.clientWidth * 0.25;
      let cur = cards[0];
      for (const c of cards) if (c.offsetLeft <= x) cur = c;
      if (reel.scrollLeft + reel.clientWidth >= reel.scrollWidth - 2) cur = cards[cards.length - 1];
      chips.forEach(ch => ch.setAttribute('aria-current', ch.dataset.go === cur.id ? 'true' : 'false'));
    };
    reel.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
    mark();
  }

  /* ---------- the statement: words light as the block is scrolled through ---------- */
  const statement = $('.statement-text');
  let words = [];
  if (statement && !reduce) {
    const parts = statement.textContent.trim().split(/\s+/);
    statement.textContent = '';
    parts.forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      statement.appendChild(s);
      if (i < parts.length - 1) statement.appendChild(document.createTextNode(' '));
    });
    words = $$('.w', statement);
  }
  function paintWords() {
    if (!words.length) return;
    const r = statement.getBoundingClientRect(), vh = window.innerHeight;
    if (r.top > vh) return;
    const p = clamp((vh * 0.92 - r.top) / (vh * 0.6), 0, 1), n = words.length;
    for (let i = 0; i < n; i++) {
      // 0.4 is the floor: an unlit word still clears the 3:1 contrast that large text needs
      const v = (0.4 + 0.6 * clamp(p * (n + 4) - i, 0, 1)).toFixed(2);
      if (words[i].dataset.o !== v) { words[i].dataset.o = v; words[i].style.opacity = v; }
    }
  }

  /* ---------- scroll ---------- */
  // The scroll fraction goes on the elements that use it. On <html> it would restyle the whole page every frame.
  const nuts = $$('.brand-nut'), progress = $('.nav-progress');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      const p = clamp(window.scrollY / max, 0, 1);
      for (const n of nuts) n.style.setProperty('--scroll', p.toFixed(4));
      if (progress) progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (nav) nav.classList.toggle('is-stuck', window.scrollY > 12);
      paintWords();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);
  onScroll();

  /* ---------- card spotlight ---------- */
  if (fine && !reduce) {
    addEventListener('pointermove', e => {
      const card = e.target.closest && e.target.closest('.kit-card');
      if (card) { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    }, { passive: true });
  }

})();

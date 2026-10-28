/* =========================================================
   ELAMARAN E. Portfolio · script.js
   Vanilla JS + GSAP/ScrollTrigger + Lenis (CDN)
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     MEDIA CONFIG: flip `enabled` to true once the Higgsfield
     clips / frames are in /assets (see assets/video/README.md).
     Until then every scene uses its procedural fallback.
     --------------------------------------------------------- */
  const MEDIA = {
    heroSequence: { enabled: false, path: 'assets/seq/hero/', count: 240, ext: 'webp', pad: 4, mobileStep: 2 },
    heroVideo:    { enabled: false, src: 'assets/video/hero-orbit.mp4', mobile: 'assets/video/hero-orbit-m.mp4' },
    builder:      { enabled: false, src: 'assets/video/builder.mp4',    mobile: 'assets/video/builder-m.mp4' },
    gallery:      { enabled: false, src: 'assets/video/gallery.mp4',    mobile: 'assets/video/gallery-m.mp4' },
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;

  const mq = {
    desktop: matchMedia('(min-width: 1025px)'),
    phone: matchMedia('(max-width: 640px)'),
    reduce: matchMedia('(prefers-reduced-motion: reduce)'),
    fine: matchMedia('(hover: hover) and (pointer: fine)'),
  };
  const hasLibs = !!(window.gsap && window.ScrollTrigger && window.Lenis);
  const MOTION = hasLibs && !mq.reduce.matches;

  root.classList.toggle('motion', MOTION);
  root.classList.toggle('no-motion', !MOTION);
  window.__booted = true;

  let lenis = null;
  const velocity = () => (lenis ? lenis.velocity : 0);

  /* =========================================================
     UTILITIES
     ========================================================= */
  function split(el, mode) {
    if (el._parts) return el._parts;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    if (mode !== 'light' && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
    const parts = [];
    const mk = (cls, txt) => { const s = document.createElement('span'); s.className = cls; if (txt != null) s.textContent = txt; return s; };
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (mode === 'light') { const w = mk('wd', tok); parts.push(w); frag.appendChild(w); return; }
            const mask = mk('ln-mask');
            if (mode === 'chars') [...tok].forEach((c) => { const s = mk('ch', c); mask.appendChild(s); parts.push(s); });
            else { const w = mk('wd', tok); mask.appendChild(w); parts.push(w); }
            frag.appendChild(mask);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el._parts = parts;
    return parts;
  }

  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';
  function scramble(el, dur = 900) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    const start = performance.now();
    const step = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      const reveal = Math.floor(p * final.length);
      el.textContent = final.split('').map((c, i) => (i < reveal || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (p < 1) requestAnimationFrame(step); else el.textContent = final;
    };
    requestAnimationFrame(step);
  }

  function fmtCount(el, v) {
    const n = Math.round(v);
    const s = el.hasAttribute('data-comma') ? n.toLocaleString('en-US') : String(n);
    return (el.dataset.prefix || '') + s + (el.dataset.suffix || '');
  }

  function toast(msg) {
    const t = $('.toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  /* =========================================================
     FLOATING LANGUAGE / AI FIELD
     ========================================================= */
  const Field = (() => {
    const WORDS = [
      'Java', 'Kotlin', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'SQL', 'Bash', 'YAML', 'HTML', 'CSS', 'Scala', 'Groovy',
      'Spring', 'Kafka', 'Kubernetes', 'Docker', 'AWS', 'PostgreSQL', 'Oracle', 'GraphQL', 'REST', 'gRPC', 'Git', 'JobRunr', 'jOOQ',
      'Claude', 'GPT', 'Gemini', 'Llama', 'Copilot', 'Mistral', 'LangChain', 'RAG', 'Embeddings', 'Agents', 'LLM', 'Transformers',
      '{ }', '=>', '</>', 'λ', '::', '@Bean', 'async', '&&', '0101', '@Transactional', 'exactly-once',
    ];
    const C = { emerald: [16, 245, 160], ember: [255, 122, 46], gold: [245, 198, 107] };
    const LAYERS = [
      { size: [11, 13], alpha: .09, speed: .12, par: .25, weight: 400 },
      { size: [15, 19], alpha: .12, speed: .22, par: .55, weight: 500 },
      { size: [22, 30], alpha: .14, speed: .38, par: 1, weight: 500 },
    ];
    let cv, ctx, W = 0, H = 0, dpr = 1, tokens = [], byLayer = [], sparks = [];
    let warm = 0, warmT = 0, gold = 0, goldT = 0;
    const mouse = { x: -999, y: -999 };
    let lastT = 0, running = false, lowFps = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function build() {
      const phone = mq.phone.matches;
      const n = phone ? 22 : (mq.desktop.matches ? 46 : 32);
      const layers = phone ? [0, 1] : [0, 1, 2];
      tokens = Array.from({ length: n }, (_, i) => {
        const L = layers[i % layers.length];
        const cfg = LAYERS[L];
        return {
          t: WORDS[(Math.random() * WORDS.length) | 0], L, cfg,
          x: Math.random() * W, y: Math.random() * H,
          ph: Math.random() * Math.PI * 2, ox: 0, oy: 0, rot: 0,
        };
      });
      // Each layer shares one font size so the canvas font is set once per layer per frame.
      byLayer = layers.map((L) => Object.assign(tokens.filter((k) => k.L === L), {
        size: Math.round(LAYERS[L].size[0] + Math.random() * (LAYERS[L].size[1] - LAYERS[L].size[0])),
      }));
      sparks = Array.from({ length: phone ? 20 : 70 }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.8,
        v: .2 + Math.random() * .8, ph: Math.random() * 6.28,
      }));
    }
    function draw(t) {
      const vel = clamp(velocity(), -60, 60);
      warm = lerp(warm, warmT, .04); gold = lerp(gold, goldT, .04);
      ctx.clearRect(0, 0, W, H);
      const base = C.emerald.map((c, i) => lerp(c, C.ember[i], warm * .75));
      const tokenAlpha = 1 - gold * .9;
      if (tokenAlpha > .02) {
        ctx.textBaseline = 'middle';
        const rot = clamp(vel * .004, -.35, .35);
        // One font + colour per depth layer; transforms via setTransform (no save/restore per token).
        for (const layer of byLayer) {
          const cfg = layer[0].cfg;
          ctx.font = `${cfg.weight} ${layer.size}px "JetBrains Mono", monospace`;
          ctx.fillStyle = `rgba(${base[0] | 0},${base[1] | 0},${base[2] | 0},${cfg.alpha * tokenAlpha})`;
          for (const k of layer) {
            k.y -= cfg.speed + vel * .08 * cfg.par;
            k.x += Math.sin(t * .0003 + k.ph) * .12;
            if (k.y < -60) { k.y = H + 60; k.x = Math.random() * W; }
            if (k.y > H + 60) { k.y = -60; k.x = Math.random() * W; }
            const dx = k.x + k.ox - mouse.x, dy = k.y + k.oy - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 22500 && d2 > 0) { const d = Math.sqrt(d2), f = (150 - d) / 150 * 18 * cfg.par; k.ox += dx / d * f * .12; k.oy += dy / d * f * .12; }
            k.ox *= .94; k.oy *= .94;
            k.rot = lerp(k.rot, rot * cfg.par, .08);
            const c = Math.cos(k.rot), s = Math.sin(k.rot);
            ctx.setTransform(c * dpr, s * dpr, -s * dpr, c * dpr, (k.x + k.ox) * dpr, (k.y + k.oy) * dpr);
            ctx.fillText(k.t, 0, 0);
          }
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (gold > .02) {
        const [r, g, b] = C.gold;
        for (const s of sparks) {
          s.y -= s.v + Math.abs(vel) * .02;
          s.x += Math.sin(t * .001 + s.ph) * .3;
          if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; }
          const a = gold * (.35 + .35 * Math.sin(t * .003 + s.ph));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, 6.283);
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fill();
        }
      }
    }
    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      if (lowFps && t - lastT < 32) return;
      lastT = t;
      draw(t);
    }
    return {
      init() {
        cv = $('#field'); ctx = cv.getContext('2d');
        lowFps = mq.phone.matches;
        resize(); build();
        if (!MOTION) { draw(0); return; }
        addEventListener('resize', () => { resize(); build(); });
        addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
        document.addEventListener('visibilitychange', () => {
          const wasRunning = running;
          running = !document.hidden;
          if (running && !wasRunning) requestAnimationFrame(loop);
        });
        running = true;
        requestAnimationFrame(loop);
      },
      mood(name) {
        warmT = name === 'ember' ? 1 : 0;
        goldT = name === 'gold' ? 1 : 0;
      },
    };
  })();

  /* =========================================================
     SMOOTH SCROLL (Lenis ↔ GSAP ticker ↔ ScrollTrigger)
     ========================================================= */
  function initSmooth() {
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({ lerp: .12, wheelMultiplier: 1.1, smoothWheel: true, syncTouch: false });
    window.__lenis = lenis; // handy for debugging / QA
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
    else target.scrollIntoView({ behavior: 'smooth' });
  }

  /* =========================================================
     NAV + MENU + ANCHORS
     ========================================================= */
  function initNav() {
    const nav = $('#nav'), toggle = $('.nav__toggle'), menu = $('#menu');

    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open && MOTION) gsap.from($$('#menu nav a'), { yPercent: 60, opacity: 0, stagger: .06, duration: .8, ease: 'expo.out' });
    };
    toggle.addEventListener('click', () => setMenu(menu.hidden));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target == null) return;
      e.preventDefault();
      if (!menu.hidden) setMenu(false);
      scrollToTarget(target);
    });
    $('[data-top]').addEventListener('click', () => scrollToTarget(0));

    if (!MOTION) return;

    const bar = $('.nav__bar span'), pct = $('.nav__progress');
    let lastY = 0;
    lenis.on('scroll', ({ scroll, limit }) => {
      const p = limit ? scroll / limit : 0;
      bar.style.transform = `scaleX(${p})`;
      pct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
      const down = scroll > lastY;
      nav.classList.toggle('is-hidden', down && scroll > 200 && menu.hidden);
      lastY = scroll;
    });

    ['awards', 'bankly', 'story', 'stack', 'work', 'contact'].forEach((id) => {
      const link = $(`.nav__links a[href="#${id}"]`);
      ScrollTrigger.create({
        trigger: `#${id}`, start: 'top 50%', end: 'bottom 50%',
        onToggle: (s) => link.classList.toggle('is-active', s.isActive),
      });
    });
  }

  /* =========================================================
     PRELOADER → HERO INTRO
     ========================================================= */
  function initPreloader(onDone) {
    const pre = $('.preloader');
    if (!MOTION) { pre.remove(); onDone(); return; }
    root.classList.add('is-loading');
    lenis.stop();

    const count = $('.preloader__count');
    const state = { v: 0 };
    const portrait = $('.hero-fb__portrait img');
    const ready = Promise.race([
      Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        portrait.complete ? Promise.resolve() : new Promise((r) => { portrait.onload = r; portrait.onerror = r; }),
        new Promise((r) => setTimeout(r, 1300)),
      ]),
      new Promise((r) => setTimeout(r, 4000)),
    ]);

    const crawl = gsap.to(state, { v: 86, duration: 2.2, ease: 'power2.out', onUpdate: () => { count.textContent = String(Math.round(state.v)).padStart(3, '0'); } });
    ready.then(() => {
      crawl.kill();
      gsap.timeline({ onComplete: () => { pre.remove(); root.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); } })
        .to(state, { v: 100, duration: .5, ease: 'power2.out', onUpdate: () => { count.textContent = String(Math.round(state.v)).padStart(3, '0'); } })
        .to('.preloader__inner', { opacity: 0, duration: .3 })
        .to('.preloader__panel--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<')
        .to('.preloader__panel--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
        .add(onDone, '-=.75');
    });
  }

  function heroIntro() {
    const chars = split($('.hero__name-inner'), 'chars');
    if (!MOTION) return;
    scramble($('.hero__label'));
    gsap.timeline()
      .from(chars, { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: .045 })
      .from('.hero__headline', { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out' }, '-=1.1')
      .from('.hero__bottom > *', { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08 }, '-=.9')
      .from('.hero-fb__portrait', { scale: 1.12, opacity: 0, duration: 2, ease: 'expo.out' }, 0)
      .from('.hero-fb__orbit', { opacity: 0, scale: .8, duration: 2.2, ease: 'expo.out' }, .2);
  }

  /* =========================================================
     SCRUB HELPERS (video + image sequence)
     ========================================================= */
  function videoScrub(video, cfg, trigger, host) {
    const src = mq.phone.matches && cfg.mobile ? cfg.mobile : cfg.src;
    let target = 0, cur = 0, ok = false;
    video.addEventListener('loadedmetadata', () => { ok = true; host.classList.add('has-video'); ScrollTrigger.refresh(); }, { once: true });
    video.addEventListener('error', () => host.classList.remove('has-video'), { once: true });
    ScrollTrigger.create({
      trigger, start: 'top bottom+=100%', once: true,
      onEnter: () => { video.preload = 'auto'; video.src = src; },
    });
    ScrollTrigger.create({ trigger, start: 'top top', end: 'bottom bottom', onUpdate: (s) => { target = s.progress; } });
    gsap.ticker.add(() => {
      if (!ok || !video.duration) return;
      cur = lerp(cur, target, .15);
      const t = cur * (video.duration - .05);
      if (Math.abs(video.currentTime - t) > .02) video.currentTime = t;
    });
  }

  function sequenceScrub(canvas, cfg, trigger, host) {
    const step = mq.phone.matches ? cfg.mobileStep : 1;
    const frames = [];
    for (let i = 1; i <= cfg.count; i += step) frames.push(`${cfg.path}${String(i).padStart(cfg.pad, '0')}.${cfg.ext}`);
    const imgs = new Array(frames.length);
    const ctx = canvas.getContext('2d');
    let current = -1;

    const draw = (idx) => {
      let i = idx;
      while (i > 0 && !(imgs[i] && imgs[i].complete && imgs[i].naturalWidth)) i--;
      const img = imgs[i];
      if (!img || !img.naturalWidth || i === current) return;
      current = i;
      const cw = canvas.width = canvas.clientWidth * Math.min(devicePixelRatio, 1.5);
      const ch = canvas.height = canvas.clientHeight * Math.min(devicePixelRatio, 1.5);
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };
    const load = (i) => new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(true);
      im.onerror = () => res(false);
      im.src = frames[i];
      imgs[i] = im;
    });
    load(0).then((ok) => {
      if (!ok) return; // keep procedural fallback
      host.classList.add('has-seq');
      draw(0);
      (async () => { for (let i = 1; i < frames.length; i++) await load(i); })();
    });
    ScrollTrigger.create({
      trigger, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => draw(Math.round(s.progress * (frames.length - 1))),
    });
  }

  /* =========================================================
     HERO
     ========================================================= */
  function initHero() {
    if (!MOTION) return;
    const hero = $('.hero');
    const sats = $$('.hero-fb__sat');
    const portrait = $('.hero-fb__portrait');
    const rim = $('.hero-fb__rim');
    const [g1, g2] = $$('.hero-fb__glow span');
    let p = 0, visible = true;

    if (MEDIA.heroSequence.enabled) sequenceScrub($('.hero__seq'), MEDIA.heroSequence, hero, hero);
    else if (MEDIA.heroVideo.enabled) videoScrub($('.hero__video'), MEDIA.heroVideo, hero, hero);

    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom bottom', onUpdate: (s) => { p = s.progress; } });
    ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });

    // Procedural "orbit": scroll drives a full 360°, plus a slow idle drift so it always breathes.
    // Only transforms are touched (no gradient repaints), and only while the hero is on screen.
    gsap.ticker.add((time) => {
      if (!visible || hero.classList.contains('has-seq') || hero.classList.contains('has-video')) return;
      const deg = p * 360 + time * 8;
      const a = deg * Math.PI / 180;
      rim.style.transform = `rotate(${deg + 20}deg)`;
      g1.style.transform = `translate3d(${Math.cos(a) * 22}%,0,0)`;
      g2.style.transform = `translate3d(${-Math.cos(a) * 18}%,0,0)`;
      sats[0].setAttribute('cx', (Math.cos(a) * 460).toFixed(1));
      sats[0].setAttribute('cy', (Math.sin(a) * 120).toFixed(1));
      sats[1].setAttribute('cx', (Math.cos(a + Math.PI) * 300).toFixed(1));
      sats[1].setAttribute('cy', (Math.sin(a + Math.PI) * 74).toFixed(1));
      portrait.style.translate = `${Math.sin(a) * 1.2}% 0`;
    });

    const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true } });
    tl.to('.hero__name-inner', { fontVariationSettings: '"wdth" 125', duration: .5, ease: 'none' }, 0)
      .to('.hero__name', { yPercent: -60, opacity: 0, duration: .45, ease: 'power1.in' }, .3)
      .to('.hero-fb__portrait', { scale: 1.08, duration: 1, ease: 'none' }, 0)
      .to('.hero__headline', { y: -40, duration: .6, ease: 'none' }, .2)
      .fromTo('.hero__scan', { top: '0%', opacity: 0 }, { top: '100%', opacity: 1, duration: .2, ease: 'none' }, .42)
      .to('.hero__scan', { opacity: 0, duration: .04 }, .62)
      .to(['.hero__headline', '.hero__bottom', '.hero__label'], { opacity: 0, y: -60, duration: .2, ease: 'power1.in' }, .8);
  }

  /* =========================================================
     GENERIC REVEALS, COUNTERS, SCRAMBLE, MOODS
     ========================================================= */
  function initReveals() {
    // split headings (hero handled by intro)
    $$('[data-split]').forEach((el) => {
      if (el.closest('.hero')) return;
      const parts = split(el, el.dataset.split);
      if (!MOTION) return;
      gsap.from(parts, {
        yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: el.dataset.split === 'chars' ? .025 : .06,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });

    if (!MOTION) return;

    $$('[data-scramble]').forEach((el) => {
      if (el.closest('.hero')) return;
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => scramble(el) });
    });

    $$('.stats__grid li, .tl, .lab, .story__outro > *, .footer__cols > div, .case__head, .case__info > *, .pillars__head .label, .build__list .cap').forEach((el) => {
      gsap.from(el, { y: 36, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count);
      const o = { v: 0 };
      el.textContent = fmtCount(el, 0);
      gsap.to(o, {
        v: to, duration: 1.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: () => { el.textContent = fmtCount(el, o.v); },
      });
    });

    // Section moods for the particle field + cursor
    const moods = { mission: 'ember', story: 'ember', cta: 'ember', awards: 'gold' };
    $$('[data-section]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 45%',
        onToggle: (s) => { if (s.isActive) Field.mood(moods[sec.dataset.section] || 'emerald'); },
      });
    });
  }

  /* =========================================================
     STATS MARQUEE (velocity-driven)
     ========================================================= */
  function initMarquee() {
    const track = $('.marquee__track');
    if (!MOTION) return;
    let x = 0, dir = -1;
    gsap.ticker.add(() => {
      const v = velocity();
      if (Math.abs(v) > .1) dir = v > 0 ? -1 : 1;
      x += dir * (0.6 + Math.min(Math.abs(v) * .25, 14));
      const half = track.scrollWidth / 2;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* =========================================================
     MISSION
     ========================================================= */
  function initMission() {
    const words = split($('.mission__text'), 'light');
    const light = split($('.farmer__light'), 'light');
    if (!MOTION) return;
    gsap.fromTo(words, { opacity: .12 }, {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: '.mission__text', start: 'top 75%', end: 'bottom 40%', scrub: true },
    });
    gsap.fromTo('.farmer__stem', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.farmer', start: 'top 80%', end: 'top 30%', scrub: true } });
    gsap.from('.farmer__quote, .farmer__punch', { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .15, scrollTrigger: { trigger: '.farmer', start: 'top 80%', once: true } });
    gsap.fromTo(light, { opacity: .25 }, { opacity: 1, stagger: .2, ease: 'none', scrollTrigger: { trigger: '.farmer__quote', start: 'top 70%', end: 'bottom 50%', scrub: true } });
  }

  /* =========================================================
     PILLARS (horizontal on desktop)
     ========================================================= */
  function initPillars() {
    const section = $('.pillars'), track = $('.pillars__track');
    const cards = $$('.pillar:not(.pillar--end)');
    if (!MOTION) { cards.forEach((c) => c.classList.add('is-active')); return; }

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1025px)', () => {
      let offsets = cards.map((c) => c.offsetLeft), maxDist = 0;
      const measure = () => { maxDist = Math.max(0, track.scrollWidth - innerWidth); return maxDist; };
      const dist = () => maxDist || measure();
      ScrollTrigger.addEventListener('refreshInit', measure);
      const setH = () => { section.style.height = `${dist() + innerHeight}px`; };
      setH();
      ScrollTrigger.addEventListener('refreshInit', setH);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
          // No layout reads while scrolling: card offsets are cached on refresh.
          onRefresh: () => { offsets = cards.map((c) => c.offsetLeft); },
          onUpdate: (s) => {
            const x = -dist() * s.progress;
            cards.forEach((c, i) => c.classList.toggle('is-active', offsets[i] + x < innerWidth * .62));
          },
        },
      });
      return () => { ScrollTrigger.removeEventListener('refreshInit', measure); ScrollTrigger.removeEventListener('refreshInit', setH); section.style.height = ''; tween.kill(); gsap.set(track, { clearProps: 'x' }); };
    });
    mm.add('(max-width: 1024px)', () => {
      cards.forEach((c) => ScrollTrigger.create({ trigger: c, start: 'top 65%', once: true, onEnter: () => c.classList.add('is-active') }));
    });
  }

  /* =========================================================
     STORY (timeline line + builder scene)
     ========================================================= */
  function initStory() {
    $$('.badge-award[data-thumb]').forEach((b) => b.style.setProperty('--thumb', `url("${b.dataset.thumb}")`));
    if (!MOTION) return;

    gsap.fromTo('.timeline__line span', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });

    const builder = $('.builder');
    if (MEDIA.builder.enabled) videoScrub($('.builder__video'), MEDIA.builder, '.story__grid', builder);

    const fb = $('.builder-fb');
    const caps = $$('.builder__caption span');
    caps[0].classList.add('is-on');
    ScrollTrigger.create({
      trigger: '.story__grid', start: 'top 60%', end: 'bottom bottom', scrub: true,
      onUpdate: (s) => {
        fb.style.setProperty('--push', s.progress.toFixed(3));
        const i = Math.min(caps.length - 1, Math.floor(s.progress * caps.length));
        caps.forEach((c, j) => c.classList.toggle('is-on', j === i));
      },
    });
  }

  /* =========================================================
     WORK (stacked cards, architecture draw, build-log drag)
     ========================================================= */
  function initWork() {
    initDrag();
    if (!MOTION) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1025px)', () => {
      const cases = $$('.work__stack .case');
      // Tall cards stick by their bottom edge so nothing is ever hidden under the next card.
      const setTops = () => cases.forEach((c) => { c.style.top = `${Math.min(innerHeight * .09, innerHeight - c.offsetHeight - 24)}px`; });
      setTops();
      ScrollTrigger.addEventListener('refreshInit', setTops);
      // Dim with an opacity overlay (compositor-only) rather than a CSS filter.
      const dims = cases.map((c) => c.appendChild(Object.assign(document.createElement('span'), { className: 'case__dim' })));
      cases.slice(0, -1).forEach((c, i) => {
        const st = { trigger: cases[i + 1], start: 'top 70%', end: 'top 9%', scrub: true };
        gsap.to(c, { scale: .93, ease: 'none', scrollTrigger: st });
        gsap.to(dims[i], { opacity: .45, ease: 'none', scrollTrigger: { ...st } });
      });
      return () => { ScrollTrigger.removeEventListener('refreshInit', setTops); cases.forEach((c) => { c.style.top = ''; }); dims.forEach((d) => d.remove()); };
    });

    const edges = $$('.arch__edges path');
    edges.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    gsap.timeline({ scrollTrigger: { trigger: '.arch', start: 'top 80%', once: true } })
      .from('.arch__k8s', { opacity: 0, duration: .8 })
      .from('.arch__nodes > g', { scale: .6, opacity: 0, transformOrigin: '50% 50%', stagger: .08, duration: .7, ease: 'back.out(2)' }, '<')
      .to(edges, { strokeDashoffset: 0, stagger: .1, duration: .8, ease: 'power2.inOut' }, '-=.4');
  }

  function initDrag() {
    $$('[data-drag] .buildlog__track').forEach((track) => {
      const shots = $$('.shot', track);
      let down = false, moved = 0, startX = 0, startL = 0, lastX = 0, v = 0, raf = 0;
      const tilt = () => { if (MOTION) gsap.to(shots, { skewX: clamp(-v * .25, -8, 8), duration: .4, ease: 'power2.out' }); };
      const momentum = () => {
        v *= .94;
        track.scrollLeft -= v;
        tilt();
        if (Math.abs(v) > .3) raf = requestAnimationFrame(momentum);
        else { v = 0; tilt(); }
      };
      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return; // touch uses native scroll
        down = true; moved = 0; startX = lastX = e.clientX; startL = track.scrollLeft; v = 0;
        cancelAnimationFrame(raf);
        track.classList.add('is-dragging');
      });
      addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        v = e.clientX - lastX; lastX = e.clientX;
        track.scrollLeft = startL - dx;
        tilt();
      });
      addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        track.classList.remove('is-dragging');
        raf = requestAnimationFrame(momentum);
      });
      track.addEventListener('click', (e) => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } }, true);
    });
  }

  /* =========================================================
     TROPHY ROOM
     ========================================================= */
  function initTrophy() {
    const section = $('.trophy');
    const awards = $$('.award');
    const hallFly = $$('.hall__fly');

    initHallTilt();
    if (!MOTION) return;

    ScrollTrigger.create({ trigger: section, start: 'top 60%', end: 'bottom 40%', onToggle: (s) => $('.cursor').classList.toggle('is-gold', s.isActive) });

    const mm = gsap.matchMedia();

    /* ---- Desktop: one pinned cinematic chapter per award ---- */
    mm.add('(min-width: 1025px)', () => {
      const strip = $('.odometer__strip');
      const nodes = $$('.rail__nodes li');
      const fill = $('.rail__fill');
      const count = $('.rail__count');
      const CH = 3, START = 2, HALL = START + awards.length * CH;

      gsap.set(awards, { autoAlpha: 0 });
      gsap.set('.hall', { autoAlpha: 0 });
      gsap.set(['.odometer', '.rail'], { autoAlpha: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.addLabel('intro', .6)
        .to('.trophy__intro', { yPercent: -30, autoAlpha: 0, duration: 1, ease: 'power2.in' }, 1)
        .to(['.odometer', '.rail'], { autoAlpha: 1, duration: .8 }, 1.4);

      awards.forEach((aw, i) => {
        const t0 = START + i * CH;
        const frame = $('.award__frame', aw);
        const spot = $('.award__spot', aw);
        const sweep = $('.award__sweep', aw);
        const moment = $('.award__moment', aw);
        const text = $$('.award__text > *', aw);
        const digit = +aw.dataset.digit;

        tl.set(aw, { autoAlpha: 1 }, t0)
          .fromTo(frame, { clipPath: 'circle(0% at 50% 45%)', scale: 1.15, rotateY: 0, y: 0, opacity: 1 },
            { clipPath: 'circle(80% at 50% 45%)', scale: 1, duration: 1.2, ease: 'power2.out' }, t0)
          .fromTo(spot, { opacity: 0 }, { opacity: 1, duration: .8 }, t0)
          .fromTo(sweep, { xPercent: -120 }, { xPercent: 120, duration: 1, ease: 'power1.inOut' }, t0 + .5)
          .fromTo(text, { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: .12, duration: .8, ease: 'power2.out' }, t0 + .3)
          .to(strip, { yPercent: -digit * 10, duration: .8, ease: 'power2.inOut' }, t0);
        if (moment) tl.fromTo(moment, { x: -80, rotate: -24, opacity: 0 }, { x: 0, rotate: -8, opacity: 1, duration: .9, ease: 'power2.out' }, t0 + .6);

        tl.addLabel(`a${i}`, t0 + 1.6);

        // exit: tilt back and fall toward the rail
        const tx = t0 + 2.2;
        tl.to(frame, { rotateY: -18, scale: .55, y: '28vh', opacity: 0, duration: .8, ease: 'power2.in' }, tx)
          .to(text, { y: -30, opacity: 0, stagger: .04, duration: .5, ease: 'power2.in' }, tx)
          .to(spot, { opacity: 0, duration: .5 }, tx);
        if (moment) tl.to(moment, { x: -60, opacity: 0, duration: .5, ease: 'power2.in' }, tx);
        tl.set(aw, { autoAlpha: 0 }, tx + .8);
      });

      tl.to(['.odometer', '.rail'], { autoAlpha: 0, duration: .5 }, HALL)
        .set('.hall', { autoAlpha: 1 }, HALL)
        .from('.hall__line span', { y: 80, opacity: 0, stagger: .15, duration: .8, ease: 'power2.out' }, HALL)
        .from(hallFly, { y: 320, rotateX: 50, opacity: 0, stagger: .12, duration: 1, ease: 'power2.out' }, HALL + .2)
        .addLabel('hall', HALL + 1.8)
        .to({}, { duration: .4 }, HALL + 1.8);

      const updateRail = () => {
        const t = tl.time();
        const idx = t >= HALL ? awards.length - 1 : Math.floor((t - START) / CH);
        nodes.forEach((n, j) => n.classList.toggle('is-on', j <= idx));
        fill.style.transform = `scaleX(${clamp((t - (START + 1.6)) / ((awards.length - 1) * CH), 0, 1)})`;
        count.textContent = `${String(clamp(idx + 1, 1, 5)).padStart(2, '0')} / 05`;
      };

      ScrollTrigger.create({
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1, animation: tl,
        snap: { snapTo: 'labelsDirectional', duration: { min: .3, max: .9 }, delay: .1, ease: 'power2.inOut' },
        onUpdate: updateRail,
      });
      updateRail();

      return () => { gsap.set([awards, '.hall', '.odometer', '.rail', hallFly].flat(), { clearProps: 'all' }); };
    });

    /* ---- Tablet / phone: per-award reveals + swipeable hall ---- */
    mm.add('(max-width: 1024px)', () => {
      awards.forEach((aw) => {
        const frame = $('.award__frame', aw);
        gsap.timeline({ scrollTrigger: { trigger: aw, start: 'top 75%', toggleActions: 'play none none none' } })
          .fromTo(frame, { clipPath: 'circle(0% at 50% 45%)', scale: 1.12 }, { clipPath: 'circle(80% at 50% 45%)', scale: 1, duration: 1.4, ease: 'expo.out' })
          .fromTo($('.award__sweep', aw), { xPercent: -120 }, { xPercent: 120, duration: 1.1, ease: 'power1.inOut' }, .4)
          .from($$('.award__text > *', aw), { y: 30, opacity: 0, stagger: .08, duration: .9, ease: 'expo.out' }, .2);
      });
      gsap.from(hallFly, { y: 60, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.hall', start: 'top 80%', toggleActions: 'play none none none' } });
    });
  }

  function initHallTilt() {
    $$('.hall__tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (!mq.fine.matches) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(px - .5) * 20}deg`);
        card.style.setProperty('--rx', `${(.5 - py) * 20}deg`);
        card.style.setProperty('--gx', `${px * 100}%`);
        card.style.setProperty('--gy', `${py * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  /* =========================================================
     LIGHTBOX
     ========================================================= */
  const Lightbox = (() => {
    let box, img, cap, cnt, items = [], idx = 0, lastFocus = null;
    const groups = {};
    function show(i, origin) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      img.src = it.src; img.alt = it.alt; cap.textContent = it.caption;
      cnt.textContent = `${idx + 1} / ${items.length}`;
      if (MOTION && origin) {
        const o = origin.getBoundingClientRect();
        img.decode().catch(() => {}).then(() => {
          const r = img.getBoundingClientRect();
          gsap.fromTo(img,
            { x: o.left + o.width / 2 - (r.left + r.width / 2), y: o.top + o.height / 2 - (r.top + r.height / 2), scale: Math.max(o.width / r.width, .1), opacity: .4 },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: .8, ease: 'expo.out' });
        });
      } else if (MOTION) gsap.fromTo(img, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out' });
    }
    function open(group, i, origin) {
      items = groups[group] || [];
      if (!items.length) return;
      lastFocus = document.activeElement;
      box.hidden = false;
      if (lenis) lenis.stop();
      show(i, origin);
      $('.lightbox__close').focus();
      if (MOTION) gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: .4 });
    }
    function close() {
      const done = () => { box.hidden = true; if (lenis) lenis.start(); if (lastFocus) lastFocus.focus(); };
      if (MOTION) gsap.to(box, { opacity: 0, duration: .3, onComplete: done }); else done();
    }
    return {
      init() {
        box = $('.lightbox'); img = $('.lightbox__fig img'); cap = $('.lightbox__fig figcaption'); cnt = $('.lightbox__count');
        $$('[data-lightbox]').forEach((el) => {
          const g = el.dataset.lightbox;
          const im = $('img', el);
          (groups[g] = groups[g] || []).push({
            el, src: im.currentSrc || im.src, alt: im.alt,
            caption: el.dataset.caption || ($('figcaption', el) || {}).textContent || im.alt,
          });
          const i = groups[g].length - 1;
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'button');
          el.addEventListener('click', () => open(g, i, el));
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(g, i, el); } });
        });
        $$('[data-open]').forEach((b) => b.addEventListener('click', () => open('awards', +b.dataset.open, b)));
        $('.lightbox__close').addEventListener('click', close);
        $('.lightbox__nav--prev').addEventListener('click', () => show(idx - 1));
        $('.lightbox__nav--next').addEventListener('click', () => show(idx + 1));
        box.addEventListener('click', (e) => { if (e.target === box) close(); });
        addEventListener('keydown', (e) => {
          if (box.hidden) return;
          if (e.key === 'Escape') close();
          if (e.key === 'ArrowRight') show(idx + 1);
          if (e.key === 'ArrowLeft') show(idx - 1);
          if (e.key === 'Tab') {
            const f = $$('button', box);
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        });
        let sx = null;
        box.addEventListener('pointerdown', (e) => { sx = e.clientX; });
        box.addEventListener('pointerup', (e) => {
          if (sx == null) return;
          const dx = e.clientX - sx; sx = null;
          if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
        });
      },
    };
  })();

  /* =========================================================
     TECH STACK · STACK BUILDER
     ========================================================= */
  const STACK = {
    'AWS':                 { tier: 'Epic',      lvl: 80, since: 2024, where: ['Verso'],                    note: 'Cloud-native services for Mercedes-Benz DNM, with secrets in AWS Secrets Manager.' },
    'Kubernetes':          { tier: 'Epic',      lvl: 82, since: 2024, where: ['Verso', 'Bankly'],          note: 'Leader election keeps JobRunr jobs highly available, with zero-downtime failover.' },
    'Docker':              { tier: 'Epic',      lvl: 85, since: 2022, where: ['Verso', 'Bankly'],          note: 'Every service containerised and shipped as an image.' },
    'GKE':                 { tier: 'Rare',      lvl: 70, since: 2025, where: ['Bankly'],                   note: 'Bankly runs here: ClusterIP services behind an Ingress and a Google load balancer.' },
    'PostgreSQL':          { tier: 'Legendary', lvl: 90, since: 2024, where: ['Verso', 'Bankly'],          note: 'Query time on large master-data tables cut by 50%.' },
    'Oracle':              { tier: 'Epic',      lvl: 80, since: 2020, where: ['Bank Muamalat', 'QNB'],     note: 'The core store behind corporate-banking modules.' },
    'jOOQ':                { tier: 'Epic',      lvl: 78, since: 2024, where: ['Verso'],                    note: 'Type-safe SQL on the hot paths, part of the 50% speed-up.' },
    'Liquibase':           { tier: 'Rare',      lvl: 75, since: 2024, where: ['Verso', 'Bankly'],          note: 'Versioned schema changes, identical across every environment.' },
    'Tibero':              { tier: 'Rare',      lvl: 60, since: 2022, where: ['Hong Leong'],               note: 'Oracle-compatible database behind CBX for Hong Leong Bank.' },
    'Redis':               { tier: 'Epic',      lvl: 75, since: 2026, where: ['Securin'],                  note: 'Caching to keep hot cybersecurity data fast.' },
    'Elasticsearch':       { tier: 'Epic',      lvl: 75, since: 2026, where: ['Securin'],                  note: 'Search and indexing over large security datasets.' },
    'Kafka':               { tier: 'Legendary', lvl: 92, since: 2024, where: ['Verso', 'Bankly'],          note: 'Inbox/outbox pattern for 100% event consistency.' },
    'JobRunr':             { tier: 'Epic',      lvl: 85, since: 2024, where: ['Verso'],                    note: 'Scheduled master-data jobs at 99.5% accuracy, with retries built in.' },
    'Java 21':             { tier: 'Legendary', lvl: 96, since: 2020, where: ['Securin', 'Verso', 'Bankly', 'Banking'], note: 'Java 8 → 21. Six years, every working day.' },
    'Spring Boot':         { tier: 'Legendary', lvl: 94, since: 2020, where: ['Securin', 'Verso', 'Bankly', 'Banking'], note: 'REST and async APIs, with unified ProblemDetail errors.' },
    'Spring Cloud':        { tier: 'Epic',      lvl: 76, since: 2025, where: ['Bankly'],                   note: 'Gateway, Eureka, Config Server and Resilience4j.' },
    'JPA / Hibernate':     { tier: 'Epic',      lvl: 85, since: 2020, where: ['Banking', 'Bankly'],        note: 'The default persistence layer, dropping to jOOQ where speed matters.' },
    'REST':                { tier: 'Legendary', lvl: 93, since: 2020, where: ['Everywhere'],               note: 'Mobile pre-login APIs serving 100K+ daily sessions.' },
    'GitHub Actions':      { tier: 'Epic',      lvl: 82, since: 2024, where: ['Verso', 'Bankly'],          note: 'Semantic versioning, plus keyless deploys to GKE.' },
    'Jenkins':             { tier: 'Rare',      lvl: 72, since: 2021, where: ['Banking', 'Verso'],         note: 'Build pipelines and release promotion.' },
    'SonarQube':           { tier: 'Rare',      lvl: 70, since: 2022, where: ['Verso', 'Bankly'],          note: 'Quality gates on every build.' },
    'DataDog':             { tier: 'Rare',      lvl: 72, since: 2024, where: ['Verso'],                    note: 'Production dashboards, traces and alerts.' },
    'Zipkin':              { tier: 'Rare',      lvl: 65, since: 2025, where: ['Bankly'],                   note: 'End-to-end request tracing across services.' },
    'Kibana':              { tier: 'Rare',      lvl: 70, since: 2026, where: ['Securin'],                  note: 'Dashboards and log exploration on top of Elasticsearch.' },
    'AI pair-programming': { tier: 'Legendary', lvl: 88, since: 2024, where: ['Daily'],                    note: 'Claude and Copilot for refactors, tests and design reviews, every day for 2+ years.' },
  };
  const TIER_TAG = { Legendary: 'LEGENDARY · daily driver', Epic: 'EPIC · production-proven', Rare: 'RARE · shipped with it' };
  const LAYER_NAME = { infra: 'Infra', data: 'Data', messaging: 'Messaging', services: 'Services', delivery: 'Delivery', ai: 'Crown' };

  function initStack() {
    const section = $('.stackx');
    if (!section) return;
    const card = $('.itemcard');
    const blocks = $$('.blk', section);

    // ---- item card ----
    let active = null;
    const show = (blk) => {
      const name = blk.dataset.tech, d = STACK[name];
      if (!d || blk === active) return;
      if (active) active.classList.remove('is-active');
      active = blk; blk.classList.add('is-active');
      const layer = blk.closest('[data-layer]').dataset.layer;
      card.style.setProperty('--c', getComputedStyle(blk.closest('[data-layer]')).getPropertyValue('--c'));
      $('.itemcard__tier', card).textContent = TIER_TAG[d.tier];
      $('.itemcard__name', card).textContent = blk.textContent.split(' · ')[0];
      $('.itemcard__lvl', card).textContent = d.lvl;
      $('.itemcard__bar span', card).style.setProperty('--lvl', `${d.lvl}%`);
      const yrs = Math.max(1, 2026 - d.since);
      $('.itemcard__years', card).textContent = `${yrs} yr${yrs > 1 ? 's' : ''}`;
      $('.itemcard__layer', card).textContent = LAYER_NAME[layer];
      $('.itemcard__note', card).textContent = d.note;
      $('.itemcard__where', card).innerHTML = d.where.map((w) => `<li>${w}</li>`).join('');
      if (MOTION) gsap.fromTo([$('.itemcard__name', card), $('.itemcard__note', card)], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .05, ease: 'expo.out' });
    };
    blocks.forEach((b) => {
      b.addEventListener('pointerenter', () => show(b));
      b.addEventListener('focus', () => show(b));
      b.addEventListener('click', () => show(b));
    });
    show($('.blk[data-tech="Java 21"]', section));

    const order = ['infra', 'data', 'messaging', 'services', 'delivery', 'ai'];
    const layers = order.map((k) => $(`[data-layer="${k}"]`, section));
    const hudLayers = $('.stackx__layers'), hudBlocks = $('.stackx__blocks'), status = $('.stackx__status b');
    const total = blocks.length;
    const setHud = (nLayers, nBlocks, live) => {
      hudLayers.textContent = `${nLayers}/5`;
      hudBlocks.textContent = `${nBlocks}/${total}`;
      status.textContent = live ? 'live ✓' : 'building…';
      section.classList.toggle('is-live', live);
      layers.slice(0, 5).forEach((l, i) => l.classList.toggle('is-done', i < nLayers));
    };

    if (!MOTION) { setHud(5, total, true); return; }

    const mm = gsap.matchMedia();

    /* ---- Desktop: scroll builds the tower, block by block ---- */
    mm.add('(min-width: 1025px)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      const landings = [];   // timeline time at which each block lands
      const layerDone = [];  // timeline time at which each layer completes
      let t = .3;
      layers.forEach((layer, li) => {
        const row = $$('.blk', layer);
        row.forEach((b, bi) => {
          const at = t + bi * .32;
          tl.fromTo(b, { y: () => -innerHeight * .9, rotate: (bi % 2 ? 1 : -1) * (6 + bi * 2), opacity: 0 },
            { y: 0, rotate: 0, opacity: 1, duration: .7, ease: 'bounce.out', immediateRender: true }, at);
          // dust puff on impact
          tl.fromTo(b, { '--dust': 0, '--dust-s': .4 }, { '--dust': 1, '--dust-s': 1.5, duration: .12 }, at + .32)
            .to(b, { '--dust': 0, duration: .3 }, at + .44);
          landings.push(at + .32);
        });
        t += row.length * .32 + .5;
        const flash = $('.layer__flash', layer);
        if (flash) {
          tl.fromTo(flash, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .2 }, t - .35)
            .to(flash, { opacity: 0, y: -8, duration: .3 }, t + .1);
          tl.fromTo($('.layer__row', layer), { filter: 'brightness(1)' }, { filter: 'brightness(1.6)', duration: .15, yoyo: true, repeat: 1 }, t - .35);
        }
        if (li < 5) layerDone.push(t - .35);
        t += .2;
      });
      tl.to({}, { duration: .8 }, t);
      const liveAt = t;

      // HUD follows the (smoothed) timeline itself, not raw scroll
      tl.eventCallback('onUpdate', () => {
        const now = tl.time();
        setHud(layerDone.filter((x) => now >= x).length, landings.filter((x) => now >= x).length, now >= liveAt);
      });
      ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', scrub: .6, animation: tl });
      setHud(0, 0, false);
      // clear only what the animation set: the inline --w width weight must survive
      return () => { gsap.set(blocks, { clearProps: 'transform,opacity,--dust,--dust-s' }); setHud(5, total, true); };
    });

    /* ---- Tablet / phone: each layer drops in as it scrolls into view ---- */
    mm.add('(max-width: 1024px)', () => {
      setHud(0, 0, false);
      let landed = 0, done = 0;
      [...layers].reverse().forEach((layer) => { // top of the page first on narrow screens
        const row = $$('.blk', layer);
        gsap.from(row, {
          y: -120, opacity: 0, rotate: () => gsap.utils.random(-10, 10), duration: .9, ease: 'bounce.out', stagger: .08,
          scrollTrigger: { trigger: layer, start: 'top 85%', toggleActions: 'play none none none' },
          onComplete: () => {
            landed += row.length;
            if (layer.dataset.layer !== 'ai') done++;
            setHud(done, landed, landed >= total);
          },
        });
      });
    });
  }

  /* =========================================================
     CTA (corridor walk + email copy)
     ========================================================= */
  function initCTA() {
    const btn = $('[data-copy]');
    btn.addEventListener('click', async () => {
      const v = btn.dataset.copy;
      try { await navigator.clipboard.writeText(v); toast('copied to clipboard ✓'); }
      catch { location.href = `mailto:${v}`; }
    });

    const world = $('.corridor__world');
    const LABELS = [
      ['pair-programming', 'emerald'], ['code review ✓', 'ember'], ['system design', 'emerald'], ['deploy → prod', 'emerald'],
      ['standup 09:30', 'ember'], ['kafka · lag 0', 'emerald'], ['whiteboard', 'ember'], ['tests · 214 passed', 'emerald'],
      ['mentoring', 'ember'], ['k8s · rollout ok', 'emerald'], ['retro ✦', 'ember'], ['ship it', 'emerald'],
    ];
    const screens = [];
    for (let i = 0; i < 12; i++) {
      [-1, 1].forEach((side) => {
        const [txt, tone] = LABELS[(i * 2 + (side > 0 ? 1 : 0)) % LABELS.length];
        const el = document.createElement('div');
        el.className = `scr${tone === 'ember' ? ' scr--ember' : ''}`;
        el.innerHTML = `<span>${String(i + 1).padStart(2, '0')} · live</span><b>${txt}</b><span><i style="width:${40 + ((i * 37) % 55)}%"></i><i style="width:${30 + ((i * 53) % 60)}%"></i></span>`;
        world.appendChild(el);
        screens.push({ el, side, z: -i * 520 - 300 });
      });
    }
    const place = (cam) => {
      const x = Math.min(innerWidth * .36, 560);
      screens.forEach((s) => {
        const ez = s.z + cam;
        s.el.style.transform = `translate3d(${s.side * x}px, 0, ${s.z}px) rotateY(${-s.side * 72}deg)`;
        s.el.style.opacity = ez > 380 ? 0 : clamp(1 - (-ez) / 6000, .08, 1);
      });
      world.style.transform = `translateZ(${cam}px)`;
    };
    place(0);

    if (!MOTION) return;
    const cta = $('.cta');
    if (MEDIA.gallery.enabled) videoScrub($('.cta__video'), MEDIA.gallery, cta, cta);
    ScrollTrigger.create({ trigger: cta, start: 'top bottom', end: 'bottom bottom', scrub: true, onUpdate: (s) => place(s.progress * 2600) });
    addEventListener('resize', () => place(0));

    gsap.from('.cta__line', { yPercent: 60, opacity: 0, stagger: .15, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.cta__title', start: 'top 80%', once: true } });
    gsap.from('.cta__actions > *, .cta__status', { y: 24, opacity: 0, stagger: .07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.cta__actions', start: 'top 92%', once: true } });
  }

  /* =========================================================
     CURSOR + MAGNETIC
     ========================================================= */
  function initCursor() {
    if (!MOTION || !mq.fine.matches) return;
    root.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 }, rp = { ...pos };
    addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      rp.x = lerp(rp.x, pos.x, .18); rp.y = lerp(rp.y, pos.y, .18);
      dot.style.transform = `translate3d(${pos.x}px,${pos.y}px,0)`;
      ring.style.transform = `translate3d(${rp.x}px,${rp.y}px,0)`;
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      const l = e.target.closest('a, button, [role="button"]');
      cur.classList.toggle('is-hover', !!t);
      cur.classList.toggle('is-link', !t && !!l);
      label.textContent = t ? t.dataset.cursor : '';
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: clamp(dx * .3, -12, 12), y: clamp(dy * .3, -12, 12), duration: .4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* =========================================================
     FOOTER CLOCK
     ========================================================= */
  function initClock() {
    const el = $('.footer__clock');
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const tick = () => { el.textContent = `Chennai ${f.format(new Date())} IST`; };
    tick();
    setInterval(tick, 15000);
  }

  /* =========================================================
     BOOT
     ========================================================= */
  function boot() {
    // The film always starts at the opening shot.
    if ('scrollRestoration' in history && !location.hash) { history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }
    if (MOTION) initSmooth();
    // Each section boots independently: one failure must never block the rest (or the preloader).
    const safe = (name, fn) => { try { fn(); } catch (err) { console.error(`[portfolio] ${name} failed`, err); } };
    safe('field', () => Field.init());
    safe('nav', initNav);
    safe('hero', initHero);
    safe('reveals', initReveals);
    safe('marquee', initMarquee);
    safe('mission', initMission);
    safe('pillars', initPillars);
    safe('story', initStory);
    safe('work', initWork);
    safe('trophy', initTrophy);
    safe('stack', initStack);
    safe('cta', initCTA);
    safe('lightbox', () => Lightbox.init());
    safe('cursor', initCursor);
    safe('clock', initClock);
    initPreloader(heroIntro);

    if (MOTION) {
      if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
      addEventListener('load', () => ScrollTrigger.refresh());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

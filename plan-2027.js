/* Plan your 2027: insights page. No dependencies. No copy lives here.
   Without this script the page is complete: every scene is laid out in full, every figure finished. */
(function () {
  'use strict';
  var root = document.getElementById('gvp');
  if (!root) return;

  var qs = window.location.search || '';
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return mqReduce.matches || /[?&]motion=reduce/.test(qs); }
  function all(sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); }
  function clamp(n) { return n < 0 ? 0 : (n > 1 ? 1 : n); }
  function num(el, name, fallback) { var v = parseFloat(el.getAttribute(name)); return isNaN(v) ? fallback : v; }
  var lang = root.getAttribute('lang') || 'en-US';

  /* ---- 1. Planning guide link: one switch, the data-guide-url attribute on the root ---- */
  var guideUrl = (root.getAttribute('data-guide-url') || '').trim();
  all('[data-guide]').forEach(function (a) {
    if (guideUrl) {
      a.setAttribute('href', guideUrl);
      a.removeAttribute('aria-disabled');
      a.removeAttribute('role');
      var soon = a.querySelector('.gvp-soon');
      if (soon) soon.hidden = true;
    } else {
      a.addEventListener('click', function (e) { e.preventDefault(); });
    }
  });

  /* ---- 2. Offset for a fixed site navigation above the page ---- */
  /* A site navigation that stays on screen pushes the step bar and the pinned scenes down by its height.
     One that slides away on scroll down (govocal.com's does) is left to pass over the page: the step bar
     then sits at the very top, and nothing in the layout moves when the navigation comes and goes. */
  var siteTop = 0, barH = 56, navH = 0, navHides = false;
  var bar = root.querySelector('.gvp-bar');
  function navBottom() {
    var top = 0;
    var cands = document.querySelectorAll('.section_nav, .nav-bar-wrapper, .w-nav, body > header');
    Array.prototype.forEach.call(cands, function (el) {
      if (root.contains(el)) return;
      var pos = window.getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky') return;
      var r = el.getBoundingClientRect();
      if (r.height > 0 && r.height < 200 && r.top <= 1 && r.bottom > top) top = r.bottom;
    });
    return Math.round(top);
  }
  function setTop() {
    var seen = navBottom();
    if (seen > navH || (!navHides && seen > 0)) navH = seen;
    siteTop = navHides && window.scrollY > 2 ? 0 : navH;
    root.style.setProperty('--gvp-top', siteTop + 'px');
    root.style.setProperty('--gvp-nav', navH + 'px');
    root.classList.toggle('gvp--navhides', navHides);
    if (bar) barH = bar.offsetHeight || 56;
  }
  function watchNav() {
    if (!navH) return;
    if (!navHides) {
      if (window.scrollY >= navH && navBottom() < navH - 8) {   /* it is sliding away: from now on it floats over the page */
        navHides = true;
        setTop();
        stale = true;
      }
      return;
    }
    var want = window.scrollY > 2 ? 0 : navH;                   /* back at the very top the bar sits under the navigation again */
    if (want !== siteTop) { siteTop = want; root.style.setProperty('--gvp-top', siteTop + 'px'); stale = true; }
  }

  /* ---- 3. Find your number ---- */
  var input = root.querySelector('#gvp-pop');
  if (input) {
    var fmt = new Intl.NumberFormat(lang);
    var pct = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    var bands = [
      { max: 25000, typical: 8.3, top: 26.3 },
      { max: 100000, typical: 7.0, top: 20.1 },
      { max: 1000001, typical: 3.5, top: 11.5 }
    ];
    var out = {};
    ['result', 'too-big', 'empty', 'typical', 'typical-rate', 'top', 'top-rate'].forEach(function (k) {
      out[k] = root.querySelector('[data-calc="' + k + '"]');
    });
    var round = function (n) {
      if (n >= 1000) { var p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; }
      if (n >= 100) return Math.round(n / 10) * 10;
      return Math.round(n);
    };
    var show = function (which) {
      ['result', 'too-big', 'empty'].forEach(function (k) { out[k].hidden = k !== which; });
    };
    var readPop = function () { return parseInt(String(input.value).replace(/[^\d]/g, ''), 10); };
    var update = function () {
      var pop = readPop();
      if (!pop) { show('empty'); return; }
      if (pop > 1000000) { show('too-big'); return; }
      var band = bands.filter(function (b) { return pop < b.max; })[0];
      out.typical.textContent = fmt.format(round(pop * band.typical / 100));
      out['typical-rate'].textContent = pct.format(band.typical) + '%';
      out.top.textContent = fmt.format(round(pop * band.top / 100));
      out['top-rate'].textContent = pct.format(band.top) + '%';
      show('result');
    };
    input.addEventListener('input', update);
    input.addEventListener('blur', function () { var pop = readPop(); if (pop) input.value = fmt.format(pop); });
    all('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pop = readPop() || 0, dir = parseInt(btn.getAttribute('data-step'), 10) || 1;
        var edge = dir > 0 ? pop : pop - 1;
        var step = edge < 25000 ? 1000 : (edge < 100000 ? 5000 : 25000);
        var next = dir > 0 ? Math.floor(pop / step) * step + step : Math.ceil(pop / step) * step - step;
        next = Math.max(1000, Math.min(1000000, next));
        input.value = fmt.format(next);
        update();
      });
    });
    var form = root.querySelector('#gvp-calc');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); update(); input.blur(); });
  }

  /* ---- 4. Scenes: each pinned stage reports its scroll progress, and its parts follow ---- */
  var hero = root.querySelector('.gvp-hero');
  var divs = all('.gvp-div');
  var darks = all('.gvp-div, .gvp-stage--deep, .gvp-plan');
  var stages = all('.gvp-stage').map(function (el) {
    var caps = all('.gvp-caps > li', el);
    /* the "For your 2027 plan" recaps play as ONE step: all three points stay on screen and light up as the line fills */
    var single = /^take/.test(el.getAttribute('data-stage') || '');
    if (single) el.classList.add('gvp-stage--single');
    el.style.setProperty('--beats', single ? 1.4 : caps.length);
    var dotsBox = el.querySelector('[data-dots]');
    return {
      el: el, caps: caps, beats: single ? 1 : caps.length, beat: -1, single: single,
      fig: el.querySelector('.gvp-figure'), figH: 0, plain: single || el.getAttribute('data-flow') === 'plain',
      notes: all('.gvp-figure .gvp-note', el).map(function (n) {
        var layer = n.closest ? n.closest('[data-only]') : null, to = caps.length;
        if (layer) to = Math.max.apply(null, layer.getAttribute('data-only').split(',').map(function (x) { return parseInt(x, 10); }));
        return { n: n, home: n.parentNode, to: caps[to - 1] };
      }),
      onlys: all('[data-only]', el).map(function (n) {
        return { n: n, set: n.getAttribute('data-only').split(',').map(function (x) { return parseInt(x, 10); }) };
      }),
      /* not data-count: govocal.com runs its own count-up on every [data-count] element */
      counts: all('[data-gvp-count]', el).map(function (n) {
        var dec = num(n, 'data-dec', 0);
        return { n: n, from: num(n, 'data-from', 0), to: num(n, 'data-to', 0), a: num(n, 'data-a', 0), d: num(n, 'data-d', 0.2),
          f: new Intl.NumberFormat(lang, { minimumFractionDigits: dec, maximumFractionDigits: dec }), last: null, end: n.textContent };
      }),
      ats: all('[data-at]', el).map(function (n) { return { n: n, at: num(n, 'data-at', 0) }; }),
      arcs: all('[data-arc]', el).map(function (n) {
        return { n: n, max: num(n, 'data-arc', 0), a: num(n, 'data-a', 0), d: num(n, 'data-d', 0.2), end: n.getAttribute('stroke-dasharray') };
      }),
      dots: dotsBox ? {
        items: all('i', dotsBox), label: el.querySelector('[data-dots-n]'), last: -1,
        a1: num(dotsBox, 'data-a1', 0.2), b1: num(dotsBox, 'data-b1', 0.4), a2: num(dotsBox, 'data-a2', 0.5), b2: num(dotsBox, 'data-b2', 0.7)
      } : null
    };
  });
  stages.forEach(function (s) {
    var pin = s.el.querySelector('.gvp-pin');
    if (pin && s.beats > 1) {
      var rail = document.createElement('div');
      rail.className = 'gvp-pips'; rail.setAttribute('aria-hidden', 'true');
      s.pips = s.caps.map(function () { var d = document.createElement('i'); rail.appendChild(d); return d; });
      pin.appendChild(rail);
    }
    s.stops = [];
    for (var k = 0; k <= s.beats + 1; k++) {
      var stop = document.createElement('span');
      stop.className = 'gvp-stop';
      stop.setAttribute('aria-hidden', 'true');
      s.el.appendChild(stop);
      s.stops.push(stop);
    }
  });
  /* ---- Stops and steps ----
     Every sentence of a pinned scene is a stop, and so is the top of every block between scenes.
     Inside a pinned scene a stroke (wheel, trackpad, Page Down, Space) plays ONE step at a set pace,
     so the figure builds at a speed you can watch. Between scenes the scroll stays native and a stroke
     simply cannot fly past the next stop. Small scrolls, the scrollbar and touch stay free. */
  var stops = [];
  var blocks = all('.gvp-div, .gvp-ask, .gvp-trio, .gvp-outro--slim, .gvp-finale, .gvp-acts');
  var stale = true;
  function placeStops() {
    var edge = siteTop + barH, pinH = window.innerHeight - edge;
    stops = []; stale = false;
    if (flow) { measureFlow(); return; }
    stages.forEach(function (s) {
      var h = s.el.offsetHeight, total = h - pinH;
      var top = s.el.getBoundingClientRect().top + window.scrollY - edge;
      s.top = top; s.total = total;
      s.stops.forEach(function (stop, k) {
        var y = Math.round(k === 0 ? 0 : (k > s.beats ? h : total * ((k - 0.06) / s.beats)));
        stop.style.top = y + 'px';
        if (k <= s.beats && (k > 0 || s.el.hasAttribute('data-stop-start'))) stops.push({ y: top + y, beat: true });
      });
    });
    blocks.forEach(function (b) { stops.push({ y: Math.round(b.getBoundingClientRect().top + window.scrollY - edge), beat: false }); });
    stops.sort(function (a, b) { return a.y - b.y; });
  }
  function nextStop(y, dir) {
    var i;
    if (dir > 0) { for (i = 0; i < stops.length; i++) if (stops[i].y > y + 4) return stops[i]; }
    else { for (i = stops.length - 1; i >= 0; i--) if (stops[i].y < y - 4) return stops[i]; }
    return null;
  }
  function pinnedAt(y) {
    return stages.some(function (s) { return y > s.top + 2 && y < s.top + s.total - 2; });
  }
  /* a paced glide from one stop to the next */
  var glide = null;
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function glideTo(to) {
    var from = window.scrollY, dist = to - from;
    if (Math.abs(dist) < 2) return;
    var dur = Math.max(700, Math.min(1500, 520 + Math.abs(dist) * 0.6)), t0 = performance.now();
    var me = glide = { to: to, dir: dist > 0 ? 1 : -1 };
    (function tick(now) {
      if (glide !== me) return;
      var t = Math.min(1, (now - t0) / dur);
      window.scrollTo({ top: from + dist * ease(t), behavior: 'instant' });
      if (t < 1) window.requestAnimationFrame(tick);
      else { glide = null; gest.locked = true; gest.lockAt = performance.now(); }
    })(t0);
  }
  function stopGlide() { glide = null; }
  var gest = { last: 0, dir: 0, start: 0, est: 0, stop: null, paced: false, locked: false, lockAt: 0, prev: 0 };
  window.addEventListener('wheel', function (e) {
    if (!staged || flow || e.ctrlKey) return;
    var dy = e.deltaMode === 1 ? e.deltaY * 40 : (e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY);
    if (!dy) return;
    var now = performance.now(), dir = dy > 0 ? 1 : -1, y = window.scrollY, gap = now - gest.last;
    gest.last = now;
    if (glide) {                                   /* a step is playing */
      e.preventDefault();
      if (dir !== glide.dir && Math.abs(dy) > 6) { /* the reader reverses: go back one stop */
        if (stale) placeStops();
        var back = nextStop(y, dir);
        if (back) glideTo(back.y); else stopGlide();
        gest.dir = dir;
      }
      gest.prev = dy;
      return;
    }
    var fresh = dir !== gest.dir || (!gest.locked && gap > 200) ||
      (gest.locked && now - gest.lockAt > 140 && (gap > 160 || Math.abs(dy) > Math.abs(gest.prev) * 1.35 + 6));
    if (fresh) {
      if (stale) placeStops();
      gest.locked = false; gest.dir = dir; gest.start = y; gest.est = y;
      gest.stop = nextStop(y, dir);
      gest.paced = !!gest.stop && (gest.stop.beat || pinnedAt(y));
    }
    gest.prev = dy;
    if (gest.locked) { e.preventDefault(); return; }
    if (!gest.stop) return;
    gest.est += dy;
    if (gest.paced) {                              /* inside a scene: a clear stroke plays one step */
      e.preventDefault();
      if (Math.abs(gest.est - gest.start) > 36) glideTo(gest.stop.y);
    } else if (dir > 0 ? gest.est >= gest.stop.y : gest.est <= gest.stop.y) {
      e.preventDefault();                          /* between scenes: native scroll, held at the next stop */
      gest.locked = true; gest.lockAt = now;
      window.scrollTo({ top: gest.stop.y, behavior: 'smooth' });
    }
  }, { passive: false });
  /* Page Down, Page Up and Space step through a scene the same way */
  window.addEventListener('keydown', function (e) {
    if (!staged || flow || e.altKey || e.ctrlKey || e.metaKey) return;
    var down = e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
    var up = e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
    if (!down && !up) { if (glide && /^(Arrow|Home|End)/.test(e.key)) stopGlide(); return; }
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || tag === 'VIDEO') return;
    if (stale) placeStops();
    var y = glide ? glide.to : window.scrollY, stop = nextStop(y, down ? 1 : -1);
    /* inside a scene a key plays one step; between scenes it goes to the next block when that is at most a screen away */
    if (!stop || (!(stop.beat || pinnedAt(y)) && Math.abs(stop.y - y) > window.innerHeight * 0.95)) return;
    e.preventDefault();
    glideTo(stop.y);
  });
  ['touchstart', 'mousedown'].forEach(function (name) { window.addEventListener(name, stopGlide, { passive: true }); });

  var takes = all('.gvp-take');
  var links = all('.gvp-bar li a:not([href="#gvp-top"])');
  var targets = links.map(function (a) { return root.querySelector(a.getAttribute('href')); });
  var staged = false, flow = false, flowW = -1, flowFits = false, io = null, ticking = false;
  var coarse = window.matchMedia('(pointer: coarse)');
  var narrow = window.matchMedia('(max-width: 899px)');

  /* ---- Narrow screens: the figure sits in a fixed box under the bar and the sentences scroll past it.
     Each sentence drives its own step of the figure, from the moment it enters to the moment it is in place. ---- */
  function measureFlow() {
    var edge = siteTop + barH;
    stages.forEach(function (s) {
      if (s.plain || !s.fig) return;
      s.figH = s.fig.offsetHeight;
      var text = Math.max(120, window.innerHeight - edge - s.figH), last = s.caps[s.caps.length - 1];
      /* the figure lets go when the last sentence is in place, so the two leave together */
      s.el.style.setProperty('--rel', Math.round(last.offsetHeight) + 'px');
    });
    stale = false;
  }
  function frameFlow(vh, edge) {
    if (stale) measureFlow();
    stages.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh) return;
      if (s.plain || !s.fig) { if (s.beat !== s.beats) drive(s, 1); return; }
      var under = edge + s.figH, text = Math.max(120, vh - under), line = under + text * 0.6, span = text * 0.52, at = -1, top = 0;
      for (var k = 0; k < s.caps.length; k++) {
        var t = s.caps[k].getBoundingClientRect().top;
        if (t > line) break;
        at = k; top = t;
      }
      drive(s, at < 0 ? 0 : (at + Math.min(0.999, (line - top) / span)) / s.beats);
    });
  }
  function moveNotes(on) {
    stages.forEach(function (s) {
      s.notes.forEach(function (o) { (on && !s.plain && o.to ? o.to : o.home).appendChild(o.n); });
    });
  }

  function drive(s, p) {
    s.el.style.setProperty('--p', p.toFixed(4));
    s.el.style.setProperty('--bp', Math.min(1, (p * s.beats) % 1 / 0.94).toFixed(3));
    var beat = Math.min(s.beats, Math.floor(p * s.beats) + 1);
    if (s.single) {
      s.beat = beat;
      s.caps.forEach(function (c, i) { c.classList.toggle('is-wait', p < i / s.caps.length - 0.001); });
    } else if (beat !== s.beat) {
      s.beat = beat;
      s.caps.forEach(function (c, i) { c.classList.toggle('is-active', i === beat - 1); c.classList.toggle('is-past', i < beat - 1); });
      if (s.pips) s.pips.forEach(function (d, i) { d.classList.toggle('is-now', i === beat - 1); d.classList.toggle('is-done', i < beat - 1); });
      s.onlys.forEach(function (o) { o.n.classList.toggle('is-gone', o.set.indexOf(beat) === -1); });
    }
    s.counts.forEach(function (c) {
      var text = c.f.format(c.from + (c.to - c.from) * clamp((p - c.a) / c.d));
      if (text !== c.last) { c.last = text; c.n.textContent = text; }
    });
    s.ats.forEach(function (o) { o.n.classList.toggle('is-wait', p < o.at); });
    s.arcs.forEach(function (o) { o.n.setAttribute('stroke-dasharray', (o.max * clamp((p - o.a) / o.d)).toFixed(2) + ' 100'); });
    if (s.dots) {
      var d = s.dots;
      var n = Math.round(14 * clamp((p - d.a1) / (d.b1 - d.a1))) + Math.round(8 * clamp((p - d.a2) / (d.b2 - d.a2)));
      if (n !== d.last) {
        d.last = n;
        d.items.forEach(function (it, i) { it.classList.toggle('off', i >= n); });
        if (d.label) d.label.textContent = n;
      }
    }
  }
  function release(s) {
    s.beat = -1;
    s.el.style.removeProperty('--p');
    s.counts.forEach(function (c) { c.last = null; c.n.textContent = c.end; });
    s.arcs.forEach(function (o) { o.n.setAttribute('stroke-dasharray', o.end); });
    if (s.dots) { s.dots.last = -1; s.dots.items.forEach(function (it) { it.classList.remove('off'); }); if (s.dots.label) s.dots.label.textContent = 22; }
  }

  function frame() {
    ticking = false;
    watchNav();
    if (stale && staged && !flow) placeStops();
    var vh = window.innerHeight;
    var rr = root.getBoundingClientRect();
    var span = rr.height - vh;
    var edge = siteTop + barH;
    if (bar) {
      bar.style.setProperty('--page-p', span > 0 ? clamp(-rr.top / span).toFixed(4) : 0);
      var over = false;
      darks.forEach(function (d) { var r = d.getBoundingClientRect(); if (r.top <= edge - 2 && r.bottom > edge + 12) over = true; });
      bar.classList.toggle('is-over', over);
    }
    var line = vh * 0.45, current = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < line) current = i; });
    links.forEach(function (a, i) {
      if (i === current) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    if (!staged) return;
    if (flow) frameFlow(vh, edge);
    var pinH = vh - edge, snap = false;
    stages.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.top < edge + vh * 0.2 && r.bottom > edge + vh * 0.2) snap = true;
    });
    document.documentElement.classList.toggle('gvp-snap', snap && coarse.matches && !flow);
    if (!flow) stages.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh) return;
      var total = r.height - pinH;
      drive(s, total > 0 ? clamp((edge - r.top) / total) : 0);
    });
    divs.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      c.style.setProperty('--cq', clamp((vh - r.top) / (vh * 0.9)).toFixed(4));
    });
    if (hero) {
      var hr = hero.getBoundingClientRect();
      if (hr.bottom > 0) hero.style.setProperty('--cv', clamp(-hr.top / hr.height).toFixed(4));
    }
  }
  var navTimer = 0;
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(frame); }
    if (!navHides && navH) {             /* a jump (link, Home, End) ends before the navigation has slid away: look again */
      window.clearTimeout(navTimer);
      navTimer = window.setTimeout(function () { watchNav(); if (navHides) { ticking = true; window.requestAnimationFrame(frame); } }, 450);
    }
  }

  function setMode() {
    var small = narrow.matches, fits;
    if (small) {
      /* phone browsers resize the window when their toolbars slide away: decide once per width, so the
         layout cannot switch in the middle of a scroll */
      if (flowW !== window.innerWidth) { flowW = window.innerWidth; flowFits = window.innerHeight - siteTop - barH >= 440; }
      fits = flowFits;
    } else { flowW = -1; fits = window.innerHeight >= 560; }
    var want = !reduced() && fits;
    var wantFlow = want && small;
    if (want === staged && wantFlow === flow) return;
    var was = staged;
    staged = want; flow = wantFlow;
    root.classList.toggle('gvp--staged', staged);
    root.classList.toggle('gvp--flow', flow);
    moveNotes(flow);
    stopGlide();
    stages.forEach(function (s) { s.beat = -1; if (!flow) s.el.style.removeProperty('--rel'); });
    if (staged) placeStops();
    if (!staged || flow) document.documentElement.classList.remove('gvp-snap');
    if (was === staged) return;
    if (io) { io.disconnect(); io = null; }
    if (staged) {
      takes.forEach(function (t) { all('[data-show]', t).forEach(function (n) { n.classList.add('is-off'); }); });
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          all('[data-show]', en.target).forEach(function (n) {
            n.style.transitionDelay = (((parseInt(n.getAttribute('data-show'), 10) || 1) - 1) * 220) + 'ms';
            n.classList.remove('is-off');
          });
          io.unobserve(en.target);
        });
      }, { threshold: 0.3 });
      takes.forEach(function (t) { io.observe(t); });
    } else {
      all('.is-off, .is-gone, .is-active, .is-wait, .is-past').forEach(function (n) {
        n.classList.remove('is-off', 'is-gone', 'is-active', 'is-wait', 'is-past');
        n.style.transitionDelay = '';
      });
      stages.forEach(release);
      divs.forEach(function (c) { c.style.removeProperty('--cq'); });
      if (hero) hero.style.removeProperty('--cv');
    }
  }

  /* ---- 5. The planner film plays while it is on screen ---- */
  var film = root.querySelector('.gvp-tool__video');
  var toggle = root.querySelector('[data-film-toggle]');
  if (film && 'IntersectionObserver' in window) {
    var userPaused = false;
    var sync = function () { if (toggle) toggle.classList.toggle('is-paused', film.paused); };
    var start = function () { film.muted = true; var play = film.play(); if (play && play.catch) play.catch(function () {}); };
    film.addEventListener('play', sync); film.addEventListener('pause', sync);
    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () {
        if (film.paused) { userPaused = false; start(); } else { userPaused = true; film.pause(); }
      });
    }
    sync();
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !reduced() && !userPaused) start();
        else if (!en.isIntersecting && !film.paused) film.pause();
      });
    }, { threshold: 0.3 }).observe(root.querySelector('.gvp-tool__frame') || film);
  }

  /* ---- 5a. The planner bands draw their small calendar when they come into view ---- */
  var planBands = all('.gvp-next');
  if ('IntersectionObserver' in window) {
    var bandIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); bandIo.unobserve(en.target); } });
    }, { threshold: 0.35 });
    planBands.forEach(function (b) { bandIo.observe(b); });
  } else planBands.forEach(function (b) { b.classList.add('is-in'); });

  /* ---- 5b. Keyboard focus inside a pinned scene brings its sentence on screen ---- */
  var lastFocus = null;
  root.addEventListener('focusout', function (e) { if (e.relatedTarget) lastFocus = null; });
  root.addEventListener('focusin', function (e) {
    if (!staged || flow || !e.target.closest) return;
    var li = e.target.closest('.gvp-caps > li');
    if (!li || li === lastFocus) { if (!li) lastFocus = null; return; }
    lastFocus = li;                      /* a window regaining focus re-announces the same element: ignore it */
    if (li.classList.contains('is-active')) return;
    window.setTimeout(function () {      /* after the browser's own scroll-into-view */
      stages.forEach(function (s) {
        var k = s.caps.indexOf(li);
        if (k < 0 || s.single) return;
        var edge = siteTop + barH, total = s.el.offsetHeight - (window.innerHeight - edge);
        window.scrollTo(0, s.el.getBoundingClientRect().top + window.scrollY - edge + total * ((k + 0.9) / s.beats));
      });
    }, 80);
  });

  /* ---- 5c. Calls to action report their name to the site's tag manager, when there is one ---- */
  root.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-cta]') : null;
    if (!a) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'gvp_cta_click', gvp_cta: a.getAttribute('data-cta') });
  });

  /* ---- 6. In-page links scroll smoothly unless motion is reduced ---- */
  root.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#gvp-"]') : null;
    if (!a) return;
    var t = root.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();                 /* the site's own anchor scrolling would land the step under the bar */
    stopGlide();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - siteTop - barH, behavior: reduced() ? 'auto' : 'smooth' });
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { setTop(); setMode(); if (staged) placeStops(); onScroll(); });
  if (narrow.addEventListener) narrow.addEventListener('change', function () { setMode(); onScroll(); });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', function () { setMode(); onScroll(); });

  /* the page height changes when a fold-out opens or fonts load: stops are recomputed before the next stroke */
  if ('ResizeObserver' in window) new ResizeObserver(function () { stale = true; }).observe(root);
  window.addEventListener('load', function () { stale = true; });

  setTop();
  setMode();
  frame();
})();

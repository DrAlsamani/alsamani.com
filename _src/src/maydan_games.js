/* Maydan challenges: short games played on every phone at once. Every phone gets the same level (same seed),
   so the race is fair. Each game reports a score; higher is better. */
window.MDGames = (function () {
  const rngOf = seed => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const shuffle = (arr, r) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const COL = ['#2a7fa8', '#b0533a', '#2f7d5b', '#C9822B', '#6b5aa6', '#d4508a'];
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ---------- sort the colours: move balls until each tube holds one colour ---------- */
  const sort = {
    id: 'sort', icon: '🧪', ar: 'فرز الألوان', en: 'Colour sort', kind: ['ذكاء', 'Logic'],
    howAr: 'انقل الكرات بين الأنابيب حتى يصير كل أنبوب بلون واحد. اضغط أنبوبًا ثم الأنبوب الذي تنقل إليه.',
    howEn: 'Move balls between tubes until each tube holds one colour. Tap a tube, then the tube to move to.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), N = 4, CAP = 4;
      let start; do { const balls = shuffle([].concat(...COL.slice(0, N).map(c => Array(CAP).fill(c))), r); start = Array.from({ length: N }, (_, k) => balls.slice(k * CAP, k * CAP + CAP)).concat([[], []]); } while (start.some(t => t.length === CAP && t.every(b => b === t[0])));
      let tubes = start.map(t => t.slice()), sel = -1, moves = 0, done = false;
      const wrap = h('div', 'mg-sort'), bar = h('div', 'mg-tools');
      const reset = h('button', 'mg-btn', ctx.ar ? '↺ من جديد' : '↺ Restart'); reset.type = 'button'; bar.appendChild(reset);
      el.append(wrap, bar);
      const full = t => t.length === CAP && t.every(b => b === t[0]);
      const solved = () => tubes.every(t => !t.length || full(t));
      function draw() {
        wrap.innerHTML = '';
        tubes.forEach((t, k) => {
          const tb = h('button', 'mg-tube' + (k === sel ? ' sel' : '') + (full(t) ? ' full' : '')); tb.type = 'button';
          for (let s = CAP - 1; s >= 0; s--) { const b = h('i'); if (t[s]) b.style.background = t[s]; else b.className = 'e'; tb.appendChild(b); }
          tb.onclick = () => tap(k); wrap.appendChild(tb);
        });
      }
      function tap(k) {
        if (done) return;
        if (sel < 0) { if (tubes[k].length && !full(tubes[k])) { sel = k; ctx.tick(); } draw(); return; }
        if (sel === k) { sel = -1; draw(); return; }
        const from = tubes[sel], to = tubes[k], c = from[from.length - 1];
        if (to.length < CAP && (!to.length || to[to.length - 1] === c)) {
          while (from.length && from[from.length - 1] === c && to.length < CAP) to.push(from.pop());
          moves++; ctx.tick();
        } else ctx.bad();
        sel = -1; draw();
        if (solved()) { done = true; ctx.finish(score()); }
      }
      reset.onclick = () => { if (done) return; tubes = start.map(t => t.slice()); sel = -1; draw(); };
      const score = () => done ? 600 + Math.round(400 * ctx.left()) : tubes.filter(full).length * 120;
      draw();
      return { score };
    }
  };

  /* ---------- the throw: flick the ball into a moving hoop ---------- */
  const shoot = {
    id: 'shoot', icon: '🏀', ar: 'الرمية', en: 'The throw', kind: ['مهارة', 'Skill'],
    howAr: 'اسحب الكرة إلى الأعلى واتركها لترميها في السلة المتحركة. كل إصابة نقطة.',
    howEn: 'Drag the ball up and let go to throw it into the moving hoop. Every basket counts.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), cv = h('canvas', 'mg-cv'), info = h('p', 'mg-info');
      el.append(info, cv);
      const x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
      let W, H; const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
      size();
      const R = Math.max(16, W * .055), phase = r() * 6.28, base = .8 + r() * .5;
      let hits = 0, shots = 0, ball = null, drag = null, t0 = performance.now(), last = t0, stop = false;
      const home = () => ({ x: W / 2, y: H - R * 2.2, vx: 0, vy: 0, live: false, up: false });
      ball = home();
      const hoop = t => { const spd = base + hits * .12; return { x: W / 2 + Math.sin(t / 1000 * spd + phase) * (W / 2 - 60), y: H * .2, w: Math.max(70, W * .22) }; };
      cv.addEventListener('pointerdown', e => { if (ball.live) return; const b = cv.getBoundingClientRect(); drag = { x: e.clientX - b.left, y: e.clientY - b.top, t: performance.now() }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointerup', e => {
        if (!drag || ball.live) return; const b = cv.getBoundingClientRect(), ux = e.clientX - b.left, uy = e.clientY - b.top, dt = Math.max(40, performance.now() - drag.t);
        const dx = ux - drag.x, dy = uy - drag.y; drag = null;
        if (dy > -20) return;
        const k = Math.min(2.2, 260 / dt);
        ball.vx = dx * k * 2.2; ball.vy = Math.max(-H * 2.6, dy * k * 3.2); ball.live = true; ball.up = true; shots++;
      });
      function frame(now) {
        if (stop) return;
        const dt = Math.min(.04, (now - last) / 1000); last = now;
        x.clearRect(0, 0, W, H);
        const hp = hoop(now - t0);
        // backboard and hoop
        x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(hp.x - hp.w * .6, hp.y - 46, hp.w * 1.2, 40);
        x.strokeStyle = '#C9822B'; x.lineWidth = 6; x.beginPath(); x.moveTo(hp.x - hp.w / 2, hp.y); x.lineTo(hp.x + hp.w / 2, hp.y); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(hp.x - hp.w / 2 + k * hp.w / 4, hp.y); x.lineTo(hp.x - hp.w / 3 + k * hp.w / 6, hp.y + 30); x.stroke(); }
        if (ball.live) {
          const py = ball.y; ball.vy += H * 1.6 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          // a basket: coming down through the rim
          if (ball.vy > 0 && py < hp.y && ball.y >= hp.y && Math.abs(ball.x - hp.x) < hp.w / 2 - R * .4) { hits++; ctx.tick(); flash = 18; }
          if (ball.y > H + R || ball.x < -R * 2 || ball.x > W + R * 2) ball = home();
        }
        x.fillStyle = '#d97a2b'; x.beginPath(); x.arc(ball.x, ball.y, R, 0, 7); x.fill();
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(ball.x, ball.y, R, 0, 7); x.moveTo(ball.x - R, ball.y); x.lineTo(ball.x + R, ball.y); x.stroke();
        if (flash > 0) { flash--; x.fillStyle = 'rgba(243,210,122,' + flash / 30 + ')'; x.fillRect(0, 0, W, H); }
        info.textContent = (ctx.ar ? 'الإصابات: ' : 'Baskets: ') + hits;
        requestAnimationFrame(frame);
      }
      let flash = 0; requestAnimationFrame(frame);
      return { score: () => hits * 100, stop: () => { stop = true; } };
    }
  };

  /* ---------- pairs: turn cards two at a time and match them ---------- */
  const pairs = {
    id: 'pairs', icon: '🃏', ar: 'أزواج البطاقات', en: 'Card pairs', kind: ['ذاكرة', 'Memory'],
    howAr: 'اقلب بطاقتين في كل مرة، وتذكّر مكانهما، حتى تطابق كل البطاقات.',
    howEn: 'Turn two cards at a time and remember where they are until every card is matched.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), pool = ['🐪', '🌴', '🦅', '⭐', '🌙', '🍉', '🐎', '⚽', '🎈', '🦋', '🍋', '🚀'];
      const pick = shuffle(pool.slice(), r).slice(0, 8), deck = shuffle(pick.concat(pick), r);
      const grid = h('div', 'mg-pairs'); el.appendChild(grid);
      let open = [], got = 0, miss = 0, lock = false, done = false;
      deck.forEach((e, k) => {
        const c = h('button', 'mg-card', `<span>${e}</span>`); c.type = 'button';
        c.onclick = () => {
          if (lock || done || c.classList.contains('up') || c.classList.contains('ok')) return;
          c.classList.add('up'); open.push(c); ctx.tick();
          if (open.length < 2) return;
          const [a, b] = open; open = [];
          if (deck[[...grid.children].indexOf(a)] === deck[[...grid.children].indexOf(b)]) {
            a.classList.add('ok'); b.classList.add('ok'); got++;
            if (got === 8) { done = true; ctx.finish(score()); }
          } else { miss++; lock = true; ctx.bad(); setTimeout(() => { a.classList.remove('up'); b.classList.remove('up'); lock = false; }, 650); }
        };
        grid.appendChild(c);
      });
      const score = () => done ? Math.max(500, 600 + Math.round(400 * ctx.left()) - miss * 10) : got * 60;
      return { score };
    }
  };

  /* ---------- the colour of the word: answer the ink, not the meaning ---------- */
  const stroop = {
    id: 'stroop', icon: '🎨', ar: 'لون الكلمة', en: 'Ink colour', kind: ['تركيز', 'Focus'],
    howAr: 'تظهر كلمة لون مكتوبة بلون آخر. اضغط لون الخط، لا ما تقوله الكلمة. أسرع ما تستطيع.',
    howEn: 'A colour word appears in another colour. Tap the ink colour, not what the word says. As fast as you can.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), C = [['أحمر', 'RED', '#d63c3c'], ['أزرق', 'BLUE', '#2f6fd0'], ['أخضر', 'GREEN', '#2e9a57'], ['أصفر', 'YELLOW', '#e2b21c']];
      const word = h('div', 'mg-word'), btns = h('div', 'mg-sw'), info = h('p', 'mg-info'); el.append(info, word, btns);
      let ok = 0, bad = 0, cur;
      const next = () => { const w = Math.floor(r() * 4); let ink = Math.floor(r() * 4); if (r() < .75) while (ink === w) ink = Math.floor(r() * 4); cur = ink; word.textContent = C[w][ctx.ar ? 0 : 1]; word.style.color = C[ink][2]; };
      // the buttons are plain swatches, so only the eye for colour decides
      shuffle(C.map((c, k) => k), rngOf(ctx.seed + 7)).forEach(k => { const b = h('button', 'mg-swb'); b.type = 'button'; b.style.background = C[k][2]; b.setAttribute('aria-label', C[k][ctx.ar ? 0 : 1]); b.onclick = () => { if (k === cur) { ok++; ctx.tick(); } else { bad++; ctx.bad(); word.classList.remove('shake'); void word.offsetWidth; word.classList.add('shake'); } info.textContent = (ctx.ar ? 'صحيح: ' : 'Right: ') + ok; next(); }; btns.appendChild(b); });
      info.textContent = (ctx.ar ? 'صحيح: ' : 'Right: ') + 0; next();
      return { score: () => Math.max(0, ok * 50 - bad * 25) };
    }
  };

  const LIST = [sort, shoot, pairs, stroop];
  const byId = id => LIST.find(g => g.id === id) || LIST[0];
  // run a game in a box: returns {score(), stop()}; ctx.finish is called when a game ends early by being completed
  function run(id, box, opts) {
    box.innerHTML = ''; box.className = 'mg mg-' + id;
    const g = byId(id), ctx = Object.assign({ seed: 1, ar: true, left: () => 0, finish() {}, tick() {}, bad() {} }, opts);
    const api = g.play(box, ctx);
    return { score: api.score, stop: api.stop || (() => {}) };
  }
  return { LIST, byId, run };
})();

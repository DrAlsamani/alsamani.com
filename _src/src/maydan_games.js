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

  // a canvas that fills its box, sharp on retina screens
  function canvasIn(el) {
    const cv = h('canvas', 'mg-cv'); el.appendChild(cv);
    const x = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 340, H = cv.clientHeight || 420;
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv, x, W, H };
  }
  // multiple-choice rounds that repeat until time runs out (used by count, math)
  function rounds(el, ctx, make) {
    const info = h('p', 'mg-info'), stage = h('div', 'mg-stage'), ch = h('div', 'mg-ch'); el.append(info, stage, ch);
    let ok = 0, bad = 0, busy = false;
    const show = () => { info.textContent = (ctx.ar ? 'صحيح: ' : 'Right: ') + ok; };
    function next() {
      const R = make(); stage.innerHTML = ''; ch.innerHTML = '';
      R.show(stage, () => {
        R.choices.forEach(c => { const b = h('button', 'mg-chb', String(c)); b.type = 'button'; b.onclick = () => { if (busy) return; busy = true; if (c === R.answer) { ok++; ctx.tick(); b.classList.add('ok'); } else { bad++; ctx.bad(); b.classList.add('no'); } show(); setTimeout(() => { busy = false; next(); }, 350); }; ch.appendChild(b); });
      });
    }
    show(); next();
    return { score: () => Math.max(0, ok * 100 - bad * 30) };
  }
  const choicesAround = (ans, r, spread) => { const s = new Set([ans]); while (s.size < 4) { const v = ans + Math.round((r() - .5) * 2 * spread); if (v >= 0 && v !== ans) s.add(v); } return shuffle([...s], r); };

  /* ---------- remember the sequence ---------- */
  const seq = {
    id: 'seq', icon: '🔁', ar: 'تذكّر التسلسل', en: 'Remember the sequence', kind: ['ذاكرة', 'Memory'],
    howAr: 'تضيء المربعات بترتيب معيّن؛ أعِده كما رأيته. يطول التسلسل كلما نجحت.',
    howEn: 'The pads light up in an order; repeat it. The sequence grows each time you succeed.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), order = Array.from({ length: 40 }, () => Math.floor(r() * 4)), info = h('p', 'mg-info'), pad = h('div', 'mg-pad'); el.append(info, pad);
      let len = 3, best = 0, pos = 0, showing = true, stop = false;
      const btns = [0, 1, 2, 3].map(k => { const b = h('button', 'mg-pb'); b.type = 'button'; b.style.background = COL[k]; b.onclick = () => press(k); pad.appendChild(b); return b; });
      const lit = (k, ms) => new Promise(res => { btns[k].classList.add('lit'); setTimeout(() => { btns[k].classList.remove('lit'); setTimeout(res, 160); }, ms); });
      async function play() { showing = true; pos = 0; info.textContent = (ctx.ar ? 'راقب… الطول ' : 'Watch… length ') + len; await new Promise(r => setTimeout(r, 500)); for (let k = 0; k < len && !stop; k++) await lit(order[k], Math.max(260, 520 - len * 20)); showing = false; info.textContent = ctx.ar ? 'دورك' : 'Your turn'; }
      function press(k) {
        if (showing || stop) return;
        btns[k].classList.add('lit'); setTimeout(() => btns[k].classList.remove('lit'), 150);
        if (k !== order[pos]) { ctx.bad(); pad.classList.add('shake'); setTimeout(() => pad.classList.remove('shake'), 300); setTimeout(play, 600); return; }
        ctx.tick(); pos++;
        if (pos === len) { best = Math.max(best, len); len++; setTimeout(play, 500); }
      }
      play();
      return { score: () => best * 100, stop: () => { stop = true; } };
    }
  };

  /* ---------- the odd one out: one tile is a slightly different shade ---------- */
  const odd = {
    id: 'odd', icon: '🔍', ar: 'المختلف', en: 'Odd one out', kind: ['انتباه', 'Attention'],
    howAr: 'كل المربعات بلون واحد إلا مربعًا أفتح أو أغمق قليلًا. اضغطه. يصعب مع كل مرحلة.',
    howEn: 'All tiles share one colour except one slightly lighter or darker. Tap it. It gets harder each level.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), info = h('p', 'mg-info'), grid = h('div', 'mg-odd'); el.append(info, grid);
      let lvl = 0;
      function draw() {
        const n = Math.min(7, 2 + Math.ceil((lvl + 1) / 2)), hue = Math.floor(r() * 360), d = Math.max(4, 22 - lvl * 1.4), hit = Math.floor(r() * n * n), light = 45 + Math.floor(r() * 15);
        grid.innerHTML = ''; grid.style.gridTemplateColumns = `repeat(${n},1fr)`;
        info.textContent = (ctx.ar ? 'المرحلة ' : 'Level ') + (lvl + 1);
        for (let k = 0; k < n * n; k++) {
          const b = h('button', 'mg-ot'); b.type = 'button'; b.style.background = `hsl(${hue} 60% ${k === hit ? light + d : light}%)`;
          b.onclick = () => { if (k === hit) { lvl++; ctx.tick(); draw(); } else { ctx.bad(); grid.classList.add('shake'); setTimeout(() => grid.classList.remove('shake'), 300); } };
          grid.appendChild(b);
        }
      }
      draw();
      return { score: () => lvl * 100 };
    }
  };

  /* ---------- quick count: shapes show for a moment, then a question ---------- */
  const count = {
    id: 'count', icon: '🔺', ar: 'العدّ السريع', en: 'Quick count', kind: ['تركيز', 'Focus'],
    howAr: 'تظهر أشكال لثوانٍ ثم تختفي. أجب: كم كان عدد الشكل المطلوب؟',
    howEn: 'Shapes appear for a moment, then vanish. Answer: how many of the asked shape were there?',
    play(el, ctx) {
      const r = rngOf(ctx.seed), SH = [['▲', 'مثلثًا', 'triangles'], ['●', 'دائرة', 'circles'], ['■', 'مربعًا', 'squares'], ['★', 'نجمة', 'stars']];
      return rounds(el, ctx, () => {
        const total = 7 + Math.floor(r() * 8), items = Array.from({ length: total }, () => Math.floor(r() * 4)), ask = items[Math.floor(r() * total)], ans = items.filter(v => v === ask).length;
        const spots = shuffle(Array.from({ length: 36 }, (_, k) => k), r).slice(0, total);
        return { answer: ans, choices: choicesAround(ans, r, 3), show(stage, done) {
          const box = h('div', 'mg-shapes'); stage.appendChild(box);
          items.forEach((v, k) => { const s = h('span', '', SH[v][0]); s.style.left = (spots[k] % 6) * 16 + 3 + r() * 6 + '%'; s.style.top = Math.floor(spots[k] / 6) * 16 + 2 + r() * 6 + '%'; s.style.color = COL[Math.floor(r() * 6)]; box.appendChild(s); });
          setTimeout(() => { box.classList.add('gone'); const q = h('p', 'mg-ask', ctx.ar ? `كم ${SH[ask][1]} كان؟ ${SH[ask][0]}` : `How many ${SH[ask][2]}? ${SH[ask][0]}`); stage.appendChild(q); done(); }, 2400);
        } };
      });
    }
  };

  /* ---------- quick maths ---------- */
  const math = {
    id: 'math', icon: '➗', ar: 'الحساب السريع', en: 'Quick maths', kind: ['ذكاء', 'Logic'],
    howAr: 'مسائل حسابية سريعة؛ اختر الجواب الصحيح وانتقل إلى التالية.',
    howEn: 'Quick sums; pick the right answer and move on.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), dig = n => String(n);
      let k = 0;
      return rounds(el, ctx, () => {
        k++; const op = k < 4 ? Math.floor(r() * 2) : Math.floor(r() * 3); let a, b, ans, sym;
        if (op === 0) { a = 3 + Math.floor(r() * (10 + k * 3)); b = 2 + Math.floor(r() * (10 + k * 3)); ans = a + b; sym = '+'; }
        else if (op === 1) { a = 10 + Math.floor(r() * (15 + k * 3)); b = 1 + Math.floor(r() * a); ans = a - b; sym = '−'; }
        else { a = 2 + Math.floor(r() * 9); b = 2 + Math.floor(r() * 9); ans = a * b; sym = '×'; }
        return { answer: ans, choices: choicesAround(ans, r, op === 2 ? 8 : 4), show(stage, done) { stage.appendChild(h('p', 'mg-eq', `<span dir="ltr">${dig(a)} ${sym} ${dig(b)} = ?</span>`)); done(); } };
      });
    }
  };

  /* ---------- whack: tap the falcons, avoid the bombs ---------- */
  const whack = {
    id: 'whack', icon: '🦅', ar: 'التقط الصقر', en: 'Catch the falcon', kind: ['سرعة', 'Speed'],
    howAr: 'تظهر صقور وقنابل بسرعة؛ اضغط الصقر قبل أن يختفي، وتجنّب القنبلة 💣.',
    howEn: 'Falcons and bombs pop up fast; tap the falcon before it hides and avoid the bomb 💣.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), info = h('p', 'mg-info'), grid = h('div', 'mg-holes'); el.append(info, grid);
      let pts = 0, n = 0, stop = false;
      const holes = Array.from({ length: 9 }, () => { const b = h('button', 'mg-hole'); b.type = 'button'; grid.appendChild(b); return b; });
      const show = () => { info.textContent = (ctx.ar ? 'النقاط: ' : 'Points: ') + pts; };
      function pop() {
        if (stop) return;
        n++; const k = Math.floor(r() * 9), bomb = r() < .22, life = Math.max(520, 1100 - n * 12), b = holes[k];
        if (b.dataset.on) return setTimeout(pop, 120);
        b.dataset.on = 1; b.textContent = bomb ? '💣' : '🦅'; b.classList.add('up');
        let hit = false;
        b.onclick = () => { if (hit || !b.dataset.on) return; hit = true; if (bomb) { pts = Math.max(0, pts - 2); ctx.bad(); } else { pts++; ctx.tick(); } b.classList.add(bomb ? 'no' : 'ok'); show(); setTimeout(off, 120); };
        const off = () => { delete b.dataset.on; b.textContent = ''; b.className = 'mg-hole'; b.onclick = null; };
        setTimeout(() => { if (!hit) off(); }, life);
        setTimeout(pop, Math.max(280, 700 - n * 8) * (.6 + r() * .6));
      }
      show(); pop();
      return { score: () => pts * 60, stop: () => { stop = true; } };
    }
  };

  /* ---------- stack the blocks: tap to drop, only the overlap stays ---------- */
  const stack = {
    id: 'stack', icon: '🧱', ar: 'كدّس البلوكات', en: 'Stack the blocks', kind: ['مهارة', 'Skill'],
    howAr: 'يتحرك البلوك يمينًا ويسارًا؛ اضغط لإسقاطه فوق البرج. الجزء الزائد يسقط، فكن دقيقًا.',
    howEn: 'The block slides side to side; tap to drop it on the tower. The overhang falls off, so be precise.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), info = h('p', 'mg-info'); el.appendChild(info);
      const { cv, x, W, H } = canvasIn(el), BH = Math.max(22, H / 18);
      let tower, cur, dir, speed, best = 0, layers, stop = false, last = performance.now();
      function reset() { tower = [{ x: W * .2, w: W * .6 }]; layers = 0; spawn(); }
      function spawn() { const top = tower[tower.length - 1]; dir = r() < .5 ? 1 : -1; speed = W * (.45 + layers * .03 + r() * .1); cur = { x: dir > 0 ? -top.w : W, w: top.w }; }
      cv.addEventListener('pointerdown', () => {
        if (stop) return; const top = tower[tower.length - 1], l = Math.max(cur.x, top.x), rr = Math.min(cur.x + cur.w, top.x + top.w);
        if (rr - l < 4) { ctx.bad(); best = Math.max(best, layers); reset(); return; }
        tower.push({ x: l, w: rr - l }); layers++; best = Math.max(best, layers); ctx.tick(); spawn();
      });
      function frame(now) {
        if (stop) return; const dt = Math.min(.04, (now - last) / 1000); last = now;
        cur.x += dir * speed * dt; if (cur.x > W) dir = -1; if (cur.x + cur.w < 0) dir = 1;
        x.clearRect(0, 0, W, H);
        const shift = Math.max(0, tower.length - 10) * BH;
        tower.forEach((b, k) => { x.fillStyle = COL[k % 6]; x.fillRect(b.x, H - (k + 1) * BH + shift, b.w, BH - 2); });
        x.fillStyle = COL[tower.length % 6]; x.fillRect(cur.x, H - (tower.length + 1) * BH + shift - BH * .6, cur.w, BH - 2);
        info.textContent = (ctx.ar ? 'الطوابق: ' : 'Floors: ') + layers + (best > layers ? (ctx.ar ? ' · الأفضل ' : ' · best ') + best : '');
        requestAnimationFrame(frame);
      }
      reset(); requestAnimationFrame(frame);
      return { score: () => best * 100, stop: () => { stop = true; } };
    }
  };

  /* ---------- fly: tap to rise between the palm trunks ---------- */
  const fly = {
    id: 'fly', icon: '🕊️', ar: 'طِر بين العوائق', en: 'Fly through', kind: ['مهارة', 'Skill'],
    howAr: 'اضغط لترتفع الحمامة، واتركها لتنزل. مرّ من الفتحات دون أن تصطدم. تُحسب أفضل محاولة.',
    howEn: 'Tap to lift the dove; let go to fall. Pass the gaps without crashing. Your best run counts.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), info = h('p', 'mg-info'); el.appendChild(info);
      const { cv, x, W, H } = canvasIn(el), gaps = Array.from({ length: 200 }, () => .22 + r() * .5);
      let bird, pipes, passed, best = 0, k, last = performance.now(), stop = false, wait = true;
      function reset() { bird = { y: H / 2, v: 0 }; pipes = []; passed = 0; k = 0; wait = true; for (let j = 0; j < 3; j++) add(W + j * W * .55); }
      function add(px) { pipes.push({ x: px, g: gaps[k++ % gaps.length] * H }); }
      cv.addEventListener('pointerdown', () => { if (stop) return; wait = false; bird.v = -H * .9; ctx.tick && null; });
      function frame(now) {
        if (stop) return; const dt = Math.min(.035, (now - last) / 1000); last = now;
        const gapH = Math.max(H * .26, H * .36 - passed * 2), sp = W * .32 + passed * 3, bx = W * .25, R = Math.max(12, W * .035);
        if (!wait) { bird.v += H * 2.4 * dt; bird.y += bird.v * dt; pipes.forEach(p => { p.x -= sp * dt; }); }
        if (pipes[0].x < -60) { pipes.shift(); add(pipes[pipes.length - 1].x + W * .55); }
        let dead = bird.y > H - R || bird.y < R;
        pipes.forEach(p => { if (Math.abs(p.x - bx) < 26 + R && (bird.y - R < p.g - gapH / 2 || bird.y + R > p.g + gapH / 2)) dead = true; if (!p.done && p.x < bx) { p.done = true; passed++; best = Math.max(best, passed); ctx.tick(); } });
        if (dead) { ctx.bad(); reset(); }
        x.clearRect(0, 0, W, H);
        x.fillStyle = '#2f7d5b'; pipes.forEach(p => { x.fillRect(p.x - 26, 0, 52, p.g - gapH / 2); x.fillRect(p.x - 26, p.g + gapH / 2, 52, H); });
        x.font = `${R * 2.2}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🕊️', bx, bird.y);
        if (wait) { x.fillStyle = '#fff'; x.font = '600 18px sans-serif'; x.fillText(ctx.ar ? 'اضغط للبدء' : 'Tap to start', W / 2, H * .75); }
        info.textContent = (ctx.ar ? 'الآن: ' : 'Now: ') + passed + (ctx.ar ? ' · الأفضل: ' : ' · Best: ') + best;
        requestAnimationFrame(frame);
      }
      reset(); requestAnimationFrame(frame);
      return { score: () => best * 100, stop: () => { stop = true; } };
    }
  };

  /* ---------- sliding numbers: put 1 to 8 in order ---------- */
  const slide = {
    id: 'slide', icon: '🔢', ar: 'الأرقام المنزلقة', en: 'Sliding numbers', kind: ['لغز', 'Puzzle'],
    howAr: 'حرّك المربعات إلى الفراغ حتى تترتب الأرقام من ١ إلى ٨.',
    howEn: 'Slide tiles into the gap until the numbers run 1 to 8.',
    play(el, ctx) {
      const r = rngOf(ctx.seed), grid = h('div', 'mg-slide'), info = h('p', 'mg-info'); el.append(info, grid);
      let t = [1, 2, 3, 4, 5, 6, 7, 8, 0], e = 8, moves = 0, done = false;
      const nb = i => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter(j => j >= 0 && j < 9);
      // scrambled by legal moves from the solved state, so it is always solvable
      let prev = -1; for (let s = 0; s < 40; s++) { const c = nb(e).filter(j => j !== prev); const j = c[Math.floor(r() * c.length)]; [t[e], t[j]] = [t[j], t[e]]; prev = e; e = j; }
      const dig = n => n;
      const right = () => t.filter((v, i) => v && v === i + 1).length;
      function draw() {
        grid.innerHTML = ''; info.textContent = (ctx.ar ? 'في مكانه: ' : 'In place: ') + right() + ' / 8';
        t.forEach((v, i) => { const b = h('button', 'mg-st' + (v ? '' : ' gap') + (v && v === i + 1 ? ' in' : ''), v ? String(dig(v)) : ''); b.type = 'button'; b.onclick = () => { if (done || !v || !nb(i).includes(e)) return; [t[e], t[i]] = [t[i], t[e]]; e = i; moves++; ctx.tick(); if (right() === 8) { done = true; draw(); ctx.finish(score()); } else draw(); }; grid.appendChild(b); });
      }
      const score = () => done ? 600 + Math.round(400 * ctx.left()) : right() * 50;
      draw();
      return { score };
    }
  };

  /* ---------- letters: arrange the letters into a word ---------- */
  const letters = {
    id: 'letters', icon: '🔤', ar: 'رتّب الحروف', en: 'Unscramble', kind: ['لغة', 'Language'],
    howAr: 'اضغط الحروف بالترتيب الصحيح لتكوّن كلمة. «تخطَّ» إن صعبت عليك.',
    howEn: 'Tap the letters in the right order to make a word. “Skip” if it is hard.',
    play(el, ctx) {
      const r = rngOf(ctx.seed);
      const AR = ['مدرسة', 'كتاب', 'سيارة', 'نخلة', 'صحراء', 'حديقة', 'مكتبة', 'طائرة', 'قهوة', 'وطن', 'شمس', 'قمر', 'جبل', 'بحر', 'مطر', 'صقر', 'جمل', 'تمر', 'علم', 'قلم', 'نجمة', 'سحابة', 'فراشة', 'برتقال', 'حصان', 'زيتون', 'مسجد', 'ملعب', 'هاتف', 'كرسي', 'نافذة', 'شجرة', 'ساعة', 'مفتاح', 'رسالة', 'ابتسامة', 'مستشفى', 'جامعة', 'رحلة', 'خيمة'];
      const EN = ['school', 'falcon', 'desert', 'garden', 'camel', 'planet', 'bridge', 'window', 'pencil', 'rocket', 'orange', 'castle', 'island', 'forest', 'friend', 'travel', 'number', 'summer', 'winter', 'spring'];
      const words = shuffle((ctx.ar ? AR : EN).slice(), r);
      const info = h('p', 'mg-info'), out = h('p', 'mg-out'), keys = h('div', 'mg-keys'), tools = h('div', 'mg-tools'); el.append(info, out, keys, tools);
      const skip = h('button', 'mg-btn', ctx.ar ? 'تخطَّ ←' : 'Skip →'), back = h('button', 'mg-btn', ctx.ar ? '⌫ تراجع' : '⌫ Undo'); skip.type = back.type = 'button'; tools.append(back, skip);
      let wi = 0, ok = 0, got = [], used = [];
      function load() {
        const w = words[wi % words.length], ch = [...w]; let s; do { s = shuffle(ch.map((c, i) => i), r); } while (ch.length > 1 && s.every((v, i) => v === i));
        got = []; used = []; keys.innerHTML = '';
        s.forEach(i => { const b = h('button', 'mg-key', ch[i]); b.type = 'button'; b.onclick = () => { if (b.disabled) return; b.disabled = true; got.push(ch[i]); used.push(b); paint(w); }; keys.appendChild(b); });
        paint(w);
      }
      function paint(w) {
        out.textContent = got.join('') || '…'; info.textContent = (ctx.ar ? 'الكلمات: ' : 'Words: ') + ok;
        if (got.length === [...w].length) {
          if (got.join('') === w) { ok++; ctx.tick(); out.classList.add('ok'); setTimeout(() => { out.classList.remove('ok'); wi++; load(); }, 450); }
          else { ctx.bad(); out.classList.add('shake'); setTimeout(() => { out.classList.remove('shake'); used.forEach(b => b.disabled = false); got = []; used = []; paint(w); }, 450); }
        }
      }
      back.onclick = () => { const b = used.pop(); if (b) { b.disabled = false; got.pop(); paint(words[wi % words.length]); } };
      skip.onclick = () => { wi++; load(); };
      load();
      return { score: () => ok * 100 };
    }
  };

  const LIST = [sort, shoot, pairs, stroop, seq, odd, count, math, whack, stack, fly, slide, letters];
  const byId = id => LIST.find(g => g.id === id) || LIST[0];
  // run a game in a box: returns {score(), stop()}; ctx.finish is called when a game ends early by being completed
  function run(id, box, opts) {
    box.innerHTML = ''; const inner = h('div', 'mg mg-' + id); box.appendChild(inner);
    const g = byId(id), ctx = Object.assign({ seed: 1, ar: true, left: () => 0, finish() {}, tick() {}, bad() {} }, opts);
    const api = g.play(inner, ctx);
    return { score: api.score, stop: api.stop || (() => {}) };
  }
  return { LIST, byId, run };
})();

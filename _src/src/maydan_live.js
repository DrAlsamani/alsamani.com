/* alsamani.com/play/maydan — running a quiz live: the big screen of the host.
   Players join at alsamani.com/m with a six-digit code; the room lives in Firebase and the host alone keeps the answers and the scores. */
window.MDLive = (function () {
  const CFG = window.MD_CFG;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // the option letters follow the language of the questions, so the screen and every phone show the same ones
  const LET = () => G && G.ar ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const JOIN = 'alsamani.com/m';
  let db, uid, off = 0;
  async function ready() {
    if (db) return;
    if (!firebase.apps.length) firebase.initializeApp(CFG);
    const cred = firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user;
    uid = cred.uid; db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }
  const now = () => Date.now() + off;
  const TS = firebase.database.ServerValue.TIMESTAMP;

  /* ---------- sound: short tones made in the browser, no files ---------- */
  let ac = null, mute = false;
  function tone(f, d, type, v, at) { if (mute) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || .08, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + .02); } catch (e) {} }
  const SND = {
    join: () => tone(880, .12, 'triangle', .06),
    tick: () => tone(1200, .05, 'square', .03),
    go: () => { tone(523, .14, 'triangle'); tone(784, .2, 'triangle', .08, .12); },
    reveal: () => { tone(659, .15, 'triangle'); tone(988, .3, 'triangle', .08, .14); },
    drum: () => { for (let k = 0; k < 10; k++) tone(140 + k * 6, .07, 'sine', .07, k * .07); },
    win: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, .35, 'triangle', .08, k * .14))
  };

  /* ---------- the room ---------- */
  let G = null; // the running game
  async function start(quiz) {
    const el = document.createElement('div'); el.className = 'md-live'; el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="md-wait">${B('جارٍ تجهيز الميدان…', 'Preparing the room…')}</div>`;
    document.body.appendChild(el); document.documentElement.classList.add('md-on');
    try { el.requestFullscreen && await el.requestFullscreen().catch(() => {}); } catch (e) {}
    try {
      await ready();
      let pin = null;
      for (let k = 0; k < 8 && !pin; k++) {
        const p = String(Math.floor(100000 + Math.random() * 900000));
        try { await db.ref('rooms/' + p).set({ host: uid, at: TS, title: quiz.title || '', n: quiz.qs.length, st: { ph: 'lobby', i: -1, lock: false } }); pin = p; } catch (e) { /* taken: try another */ }
      }
      if (!pin) throw new Error('pin');
      G = { ar: /[\u0600-\u06ff]/.test(quiz.qs.map(x => x.q + x.opts.join('')).join('')), pin, quiz, el, ref: db.ref('rooms/' + pin), players: {}, score: {}, streak: {}, i: -1, opts: { lb: true, speed: true }, timer: null, subs: [] };
      lobby();
    } catch (e) {
      el.innerHTML = `<div class="md-wait">${B('تعذّر الاتصال بالميدان. تأكد من الإنترنت ثم حاول مرة أخرى.', 'Could not reach the room. Check the connection and try again.')}<button type="button" class="btn ghost" data-x>${B('إغلاق', 'Close')}</button></div>`;
      el.querySelector('[data-x]').onclick = close;
    }
  }
  function close() {
    if (G) { clearInterval(G.timer); G.subs.forEach(f => f()); G.ref.remove().catch(() => {}); }
    G = null;
    document.querySelectorAll('.md-live').forEach(x => x.remove()); document.documentElement.classList.remove('md-on');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  const sub = (ref, ev, fn) => { ref.on(ev, fn); G.subs.push(() => ref.off(ev, fn)); };
  function frame(inner, bar) {
    G.el.innerHTML = `<div class="md-scr">${inner}</div><div class="md-ctl">${bar || ''}<span class="md-sp"></span><button type="button" class="md-cb" data-mute title="${T('الصوت', 'Sound')}">${mute ? '🔇' : '🔊'}</button><button type="button" class="md-cb" data-fs title="${T('ملء الشاشة', 'Full screen')}">⛶</button><button type="button" class="md-cb" data-end>${B('إنهاء', 'End')}</button></div>`;
    const q = s => G.el.querySelector(s);
    q('[data-mute]').onclick = e => { mute = !mute; e.currentTarget.textContent = mute ? '🔇' : '🔊'; };
    q('[data-fs]').onclick = () => document.fullscreenElement ? document.exitFullscreen() : G.el.requestFullscreen && G.el.requestFullscreen();
    q('[data-end]').onclick = () => { if (G.i < 0 || G.ended || confirmEnd()) close(); };
    return q;
  }
  function confirmEnd() {
    const c = G.el.querySelector('.md-confirm'); if (c) return true;
    const d = document.createElement('div'); d.className = 'md-confirm';
    d.innerHTML = `<p>${B('إنهاء المسابقة الآن؟ تُحذف الغرفة ونتائجها.', 'End the quiz now? The room and its results are removed.')}</p><button type="button" class="btn solid" data-y>${B('نعم، إنهاء', 'Yes, end')}</button><button type="button" class="btn ghost" data-n>${B('متابعة', 'Keep playing')}</button>`;
    G.el.appendChild(d); d.querySelector('[data-y]').onclick = close; d.querySelector('[data-n]').onclick = () => d.remove();
    return false;
  }

  /* ---------- lobby: the code, a QR code and who has joined ---------- */
  function lobby() {
    const url = 'https://' + JOIN + '/?p=' + G.pin;
    let svg = ''; try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); svg = qr.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); } catch (e) {}
    const q = frame(`<div class="md-lobby">
        <div class="md-join"><p class="md-how">${B('ادخل من جوالك على', 'On your phone, go to')}</p><p class="md-url" dir="ltr">${JOIN}</p><p class="md-how">${B('واكتب الرمز', 'and enter the code')}</p><p class="md-pin" dir="ltr">${G.pin.slice(0, 3)} ${G.pin.slice(3)}</p></div>
        <div class="md-qr">${svg}<small>${B('أو امسح الرمز', 'or scan')}</small></div></div>
      <h2 class="md-title">${esc(G.quiz.title || T('ميدان', 'Maydan'))}</h2>
      <div class="md-count"><b id="mdN">0</b> ${B('مشارك', 'players')}</div><div class="md-names" id="mdNames"></div>`,
      `<button type="button" class="btn solid md-start" data-go disabled>${B('ابدأ', 'Start')}</button>
       <label class="md-opt"><input type="checkbox" data-lock> ${B('إقفال الدخول', 'Lock joining')}</label>
       <label class="md-opt"><input type="checkbox" data-speed checked> ${B('السرعة تزيد النقاط', 'Speed adds points')}</label>
       <label class="md-opt"><input type="checkbox" data-lb checked> ${B('الترتيب بعد كل سؤال', 'Ranking after each question')}</label>`);
    const names = q('#mdNames'), go = q('[data-go]');
    sub(G.ref.child('pl'), 'child_added', s => {
      const v = s.val() || {}; G.players[s.key] = v.n; G.score[s.key] = G.score[s.key] || 0; G.streak[s.key] = 0;
      if (!names.isConnected) return;
      const c = document.createElement('span'); c.className = 'md-chip'; c.textContent = v.n; c.title = T('اضغط لإخراجه', 'Tap to remove'); c.dataset.u = s.key;
      c.onclick = () => G.ref.child('pl/' + s.key).remove();
      names.appendChild(c); SND.join();
      q('#mdN').textContent = Object.keys(G.players).length; go.disabled = false;
    });
    sub(G.ref.child('pl'), 'child_removed', s => {
      delete G.players[s.key]; delete G.score[s.key];
      const c = names.querySelector(`[data-u="${s.key}"]`); if (c) c.remove();
      if (q('#mdN')) { q('#mdN').textContent = Object.keys(G.players).length; go.disabled = !Object.keys(G.players).length; }
    });
    q('[data-lock]').onchange = e => G.ref.child('st/lock').set(e.target.checked);
    q('[data-speed]').onchange = e => { G.opts.speed = e.target.checked; };
    q('[data-lb]').onchange = e => { G.opts.lb = e.target.checked; };
    go.onclick = () => { G.ref.child('st/lock').set(true); next(); };
  }

  /* ---------- a question ---------- */
  async function next() {
    G.i++;
    if (G.i >= G.quiz.qs.length) return finish();
    const x = G.quiz.qs[G.i], n = G.quiz.qs.length;
    // the question is read first, alone and large; then it moves up as the options and the clock appear.
    // The reading time follows its length, so everyone starts answering on equal terms.
    const q = frame(`<div class="md-q md-pre">
        <div class="md-qtop"><span class="md-qn">${B('السؤال', 'Question')} ${G.i + 1} ${T('من', 'of')} ${n}</span>${x.pts === 2 ? `<span class="md-x2">${B('نقاط مضاعفة ×٢', 'Double points ×2')}</span>` : ''}</div>
        <h2 class="md-qt" dir="auto">${esc(x.q)}</h2>
        <div class="md-mid"><div class="md-clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="md-ring0"/><circle cx="50" cy="50" r="44" class="md-ring" id="mdRing"/></svg><b id="mdT">${x.time}</b></div>
          ${x.img ? `<img class="md-img" src="${x.img}" alt="">` : '<span></span>'}
          <div class="md-ans"><b id="mdA">0</b><small>${B('أجابوا', 'answered')}</small></div></div>
        <div class="md-tiles">${x.opts.map((o, j) => `<div class="md-tile" style="--c:var(--qz${j});--d:${j * 80}ms"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></div>`).join('')}</div></div>`,
      `<button type="button" class="btn ghost" data-skip disabled>${B('أنهِ الوقت', 'End time')}</button>`);
    await G.ref.update({ q: { q: x.q, opts: x.opts, type: x.type, multi: x.ok.length > 1, pts: x.pts, i: G.i, n, L: G.ar ? 'ar' : 'en', img: x.img || null }, ok: null, st: { ph: 'ready', i: G.i, lock: true } });
    const words = x.q.trim().split(/\s+/).length, read = Math.min(5, Math.max(2, words / 3)) * 1000;
    setTimeout(() => open(x, q), read);
  }
  async function open(x, q) {
    if (!G) return;
    await G.ref.child('st').set({ ph: 'q', i: G.i, t0: TS, dur: x.time, lock: true });
    const t0 = (await G.ref.child('st/t0').once('value')).val();
    G.t0 = t0; SND.go();
    const box = q('.md-q'); if (box) box.classList.remove('md-pre');
    q('[data-skip]').disabled = false;
    const ring = q('#mdRing'), C = 2 * Math.PI * 44; ring.style.strokeDasharray = C;
    let got = 0, last = -1;
    sub(G.ref.child('an/' + G.i), 'child_added', () => { got++; const a = q('#mdA'); if (a) a.textContent = got; if (got >= Object.keys(G.players).length) reveal(); });
    q('[data-skip]').onclick = () => reveal();
    clearInterval(G.timer);
    G.timer = setInterval(() => {
      const left = Math.max(0, x.time - (now() - t0) / 1000), s = Math.ceil(left), el = q('#mdT');
      if (!el) return;
      el.textContent = s; ring.style.strokeDashoffset = C * (1 - left / x.time);
      if (s !== last && s <= 5 && s > 0) SND.tick(); last = s;
      if (left <= 0) reveal();
    }, 100);
  }

  /* ---------- the answer, the points ---------- */
  async function reveal() {
    if (!G || G.revealing === G.i) return; G.revealing = G.i;
    clearInterval(G.timer);
    const x = G.quiz.qs[G.i];
    await G.ref.child('st').update({ ph: 'rev' });
    G.subs.forEach(f => f()); G.subs = [];
    keepPlayers();
    const ans = (await G.ref.child('an/' + G.i).once('value')).val() || {};
    const counts = x.opts.map(() => 0), okSet = new Set(x.ok), sc = {};
    let right = 0;
    const before = Object.keys(G.score).sort((a, b) => G.score[b] - G.score[a]); G.prev = {}; before.forEach((u, k) => { G.prev[u] = k + 1; });
    Object.keys(G.players).forEach(u => {
      const a = ans[u], pick = a ? [].concat(a.a).map(Number) : [];
      pick.forEach(j => { if (counts[j] != null) counts[j]++; });
      const correct = !!a && pick.length === okSet.size && pick.every(j => okSet.has(j));
      let d = 0;
      if (correct) {
        right++; G.streak[u] = (G.streak[u] || 0) + 1;
        if (x.pts) { const dt = Math.max(0, Math.min(x.time, (a.t - G.t0) / 1000)); d = Math.round(1000 * x.pts * (G.opts.speed ? 1 - dt / x.time / 2 : 1)); }
      } else G.streak[u] = 0;
      G.score[u] = (G.score[u] || 0) + d;
      sc[u] = { s: G.score[u], d, c: correct, k: G.streak[u], a: !!a };
    });
    // ranks after this question, and how far each player is behind the one above
    const order = Object.keys(sc).sort((a, b) => G.score[b] - G.score[a]);
    order.forEach((u, k) => { sc[u].r = k + 1; if (k) { sc[u].gap = G.score[order[k - 1]] - G.score[u]; sc[u].above = G.players[order[k - 1]] || ''; } });
    await G.ref.update({ ok: x.ok, sc });
    SND.reveal();
    const max = Math.max(1, ...counts);
    const q = frame(`<div class="md-q md-rev">
        <h2 class="md-qt" dir="auto">${esc(x.q)}</h2>
        <div class="md-bars">${x.opts.map((o, j) => `<div class="md-bar${okSet.has(j) ? ' ok' : ''}" style="--c:var(--qz${j});--h:${Math.round(100 * counts[j] / max)}%"><b>${counts[j]}</b><span class="md-col"></span><i>${LET()[j]}${okSet.has(j) ? ' ✓' : ''}</i></div>`).join('')}</div>
        <div class="md-tiles">${x.opts.map((o, j) => `<div class="md-tile${okSet.has(j) ? ' right' : ' wrong'}" style="--c:var(--qz${j})"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span>${okSet.has(j) ? '<b>✓</b>' : ''}</div>`).join('')}</div>
        <p class="md-stat">${B(`أجاب إجابة صحيحة ${right} من ${Object.keys(G.players).length}`, `${right} of ${Object.keys(G.players).length} answered correctly`)}</p></div>`,
      `<button type="button" class="btn solid" data-next>${G.i === G.quiz.qs.length - 1 ? B('النتيجة النهائية', 'Final results') : G.opts.lb ? B('الترتيب', 'Ranking') : B('السؤال التالي', 'Next question')}</button>`);
    q('[data-next]').onclick = () => G.i === G.quiz.qs.length - 1 ? finish() : G.opts.lb ? board() : next();
  }
  function keepPlayers() {
    sub(G.ref.child('pl'), 'child_added', s => { const v = s.val() || {}; if (!(s.key in G.players)) { G.players[s.key] = v.n; G.score[s.key] = 0; } });
    sub(G.ref.child('pl'), 'child_removed', s => { delete G.players[s.key]; delete G.score[s.key]; });
  }

  /* ---------- ranking: the top five, and who climbed most ---------- */
  function board() {
    G.ref.child('st').update({ ph: 'lb' });
    const order = Object.keys(G.score).sort((a, b) => G.score[b] - G.score[a]), top = order.slice(0, 5);
    let climb = null, best = 0;
    order.forEach((u, k) => { const was = (G.prev || {})[u]; if (was && was - (k + 1) > best) { best = was - (k + 1); climb = u; } });
    const q = frame(`<div class="md-lb"><h2>${B('الترتيب', 'Ranking')}</h2>
        <ol>${top.map((u, k) => `<li style="--d:${k * 90}ms"><b>${k + 1}</b><span dir="auto">${esc(G.players[u] || '')}</span><em>${G.score[u]}</em>${G.streak[u] >= 3 ? `<i title="${T('إجابات صحيحة متتالية', 'right answers in a row')}">🔥${G.streak[u]}</i>` : ''}</li>`).join('')}</ol>
        ${climb && best >= 2 ? `<p class="md-climb">${B(`⬆ الصاعد: ${esc(G.players[climb])} تقدّم ${best} مراكز`, `⬆ Riser: ${esc(G.players[climb])} climbed ${best} places`)}</p>` : ''}</div>`,
      `<button type="button" class="btn solid" data-next>${B('السؤال التالي', 'Next question')}</button>`);
    q('[data-next]').onclick = next;
  }

  /* ---------- the end: the podium, revealed from third to first ---------- */
  async function finish() {
    G.ended = true; clearInterval(G.timer);
    await G.ref.child('st').set({ ph: 'end', i: G.i, lock: true });
    const order = Object.keys(G.score).sort((a, b) => G.score[b] - G.score[a]);
    const p = k => order[k] ? `<div class="md-pod md-p${k + 1}"><span class="md-pn" dir="auto">${esc(G.players[order[k]] || '')}</span><b>${G.score[order[k]]}</b><div class="md-step">${k + 1}</div></div>` : '<div class="md-pod md-empty"></div>';
    const q = frame(`<div class="md-end"><h2>${esc(G.quiz.title || T('ميدان', 'Maydan'))}</h2>
        <div class="md-podium">${p(1)}${p(0)}${p(2)}</div>
        <ol class="md-rest" start="4">${order.slice(3, 10).map(u => `<li><span dir="auto">${esc(G.players[u] || '')}</span><em>${G.score[u]}</em></li>`).join('')}</ol></div>`,
      `<button type="button" class="btn ghost" data-csv>${B('تحميل النتائج', 'Download results')}</button>`);
    SND.drum();
    [3, 2, 1].forEach((k, n) => setTimeout(() => { const e = q(`.md-p${k}`); if (e) e.classList.add('in'); if (k === 1) SND.win(); }, 900 + n * 1300));
    q('[data-csv]').onclick = () => {
      const rows = [[T('المركز', 'Rank'), T('الاسم', 'Name'), T('النقاط', 'Points')]].concat(order.map((u, k) => [k + 1, G.players[u] || '', G.score[u]]));
      const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (G.quiz.title || 'maydan') + ' - ' + T('النتائج', 'results') + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
    };
  }

  document.addEventListener('keydown', e => { if (!G) return; if (e.key === 'Escape' && !document.fullscreenElement) { if (G.i < 0 || G.ended) close(); } });
  return { start };
})();

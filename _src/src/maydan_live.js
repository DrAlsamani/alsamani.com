/* alsamani.com/play/maydan — running a quiz live: the big screen of the host.
   Players join at alsamani.com/m with a six-digit code; the room lives in Firebase and the host alone keeps the answers and the scores.
   A game can be paused and picked up later from the same browser. */
window.MDLive = (function () {
  const CFG = window.MD_CFG;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // the option letters follow the language of the questions, so the screen and every phone show the same ones
  const LET = () => G && G.ar ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const TEAMS = n => { const c = G && G.ar ? ['الأزرق', 'الأحمر', 'الأخضر', 'الذهبي', 'البنفسجي', 'الكحلي'] : ['Blue', 'Red', 'Green', 'Gold', 'Purple', 'Navy']; return Array.from({ length: n }, (_, k) => n <= 6 ? c[k] : (G && G.ar ? 'فريق ' : 'Team ') + (k + 1)); };
  const JOIN = 'alsamani.com/m';
  const SAVE = 'md.run';
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
    gold: () => [784, 988, 1175, 1568].forEach((f, k) => tone(f, .25, 'sine', .07, k * .09)),
    drum: () => { for (let k = 0; k < 10; k++) tone(140 + k * 6, .07, 'sine', .07, k * .07); },
    win: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, .35, 'triangle', .08, k * .14))
  };

  /* ---------- keeping a game so it can be resumed ---------- */
  const keep = () => { if (!G) return; try { localStorage.setItem(SAVE, JSON.stringify({ pin: G.pin, quiz: G.quiz, i: G.done, score: G.score, qp: G.qp, out: G.out, streak: G.streak, team: G.team, teams: G.teams, opts: G.opts, gold: G.gold, players: G.players, phones: !!G.phones, used: G.used || {}, jr: G.jr || [], jrAt: G.jrAt, lockJoin: !!G.lockJoin, shuffled: !!G.shuffled, at: Date.now() })); } catch (e) {} };
  const forget = () => { try { localStorage.removeItem(SAVE); } catch (e) {} };
  function pending() { try { const s = JSON.parse(localStorage.getItem(SAVE) || 'null'); return s && Date.now() - s.at < 7 * 864e5 ? s : null; } catch (e) { return null; } }

  /* ---------- usage: anonymous counts in this device's own record (no names, no answers) ----------
     rooms/s<uid>/sum holds the counts; rooms/mdreg lists the devices so the counts can be added up later */
  let statK = null;
  async function statRoom() {
    if (statK) return statK;
    const k = 's' + uid, r = db.ref('rooms/' + k);
    if (!(await r.child('host').once('value')).val()) await r.set({ host: uid, at: TS, title: 'stats', n: 0, st: { ph: 'end', i: -1, lock: true } });
    let on = null; try { on = localStorage.getItem('md-reg'); } catch (e) {}
    if (!on) { try { await db.ref('rooms/mdreg/pl/' + uid).set({ n: 'h', at: TS }); await db.ref('rooms/mdreg/an/0/' + uid).set({ a: '1', t: TS }); } catch (e) {} try { localStorage.setItem('md-reg', '1'); } catch (e) {} }
    return (statK = k);
  }
  const KEY = v => String(v || '').replace(/[.#$\[\]\/]/g, '_').slice(0, 40) || '_';
  function stat(add) {
    const INC = firebase.database.ServerValue.increment, up = {};
    Object.keys(add).forEach(k => { if (add[k]) up[k] = INC(add[k]); });
    if (!Object.keys(up).length) return;
    ready().then(statRoom).then(k => db.ref('rooms/' + k + '/sum').update(up)).catch(() => {});
  }
  const srcOf = Q => Q.lib ? 'lib/' + KEY(Q.lib) + (Q.libEd ? '~' : '') : Q.gen ? 'gen/' + KEY(Q.gen) : 'own/all';
  // the item just played: who was there, who took part, and how many reactions it drew until the next one
  function statFlush() {
    if (!G || !G.sp) return;
    const z = G.sp; G.sp = null;
    stat({ [`i/${z.k}/n`]: 1, [`i/${z.k}/p`]: z.p, [`i/${z.k}/a`]: z.a, [`i/${z.k}/rx`]: G.rxc || 0 });
  }

  /* ---------- the journey: everyone's points after each question, for the phones' summary at the end ---------- */
  function journey() {
    if (!G || G.done < 0 || G.jrAt === G.done) return;
    const x = G.quiz.qs[G.done]; G.jrAt = G.done; if (!x || x.type === 'stage') return;
    G.jr = G.jr || []; const o = {}; Object.keys(G.players).forEach(u => { o[u] = G.score[u] || 0; }); G.jr.push(o);
  }
  function journeyOut(order) {
    const us = order.slice(0, 30), J = G.jr || [];
    return { k: us.map(u => u.slice(0, 8)), n: us.map(u => G.players[u] || ''), s: us.map(u => J.map(o => o[u] || 0)) };
  }


  /* ---------- feats: what each player did, for the commentary now and the titles at the end ---------- */
  const arN = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : `${n} ${n % 100 >= 3 && n % 100 <= 10 ? few : many}`;
  function feats(sc) {
    const x = G.quiz.qs[G.i] || {}, judged = !['poll', 'open', 'stage', 'game'].includes(x.type), ans = G.lastAns || {};
    G.aw = G.aw || {}; const W = u => G.aw[u] = G.aw[u] || {};
    Object.keys(G.players).forEach(u => {
      const r = sc[u], w = W(u), a = ans[u]; if (!r) { if (judged) w.run = 0; return; }
      if (G.cap && G.cap[u]) r.cap = 1;
      if (x.type === 'game') w.g = (w.g || 0) + Math.max(0, r.d || 0);
      if (!judged) return;
      if (r.c) { w.run = (w.run || 0) + 1; w.best = Math.max(w.best || 0, w.run); if (a && a.t && G.t0) { w.t = (w.t || 0) + Math.max(0, (a.t - G.t0) / 1000); w.tn = (w.tn || 0) + 1; } if (a && a.b) w.bet = (w.bet || 0) + 1; }
      else w.run = 0;
    });
    // the commentator: the most telling thing that just happened
    const order = Object.keys(G.players).filter(u => u in G.score || sc[u]).sort(byRank), was = G.rk || {}, now2 = {}; order.forEach((u, k) => { now2[u] = k + 1; });
    const nm = u => `«${esc(G.players[u] || '')}»`, lines = [];
    if (G.capNote) { lines.push(G.capNote); G.capNote = null; }
    const lead = order[0], wasLead = Object.keys(was).find(u => was[u] === 1);
    if (lead && wasLead && lead !== wasLead && (G.score[lead] || 0) > 0) lines.push(B(`${nm(lead)} ينتزع الصدارة!`, `${nm(lead)} takes the lead!`));
    if (G.teams) { const tt = teamTable(); if (tt.length > 1) { const tl = tt[0].k; if (G.tlead != null && tl !== G.tlead && tt[0].avg > tt[1].avg) lines.push(B(`فريق «${esc(tt[0].name)}» يتقدّم إلى الصدارة!`, `Team ${esc(tt[0].name)} goes top!`)); G.tlead = tl; } }
    const hot = Object.keys(G.players).filter(u => judged && [3, 5, 7, 10].includes((G.aw[u] || {}).run)).sort((p, q) => G.aw[q].run - G.aw[p].run)[0];
    if (hot) lines.push(B(`${nm(hot)}: ${arN(G.aw[hot].run, '', '', 'إجابات صحيحة متتالية', 'إجابة صحيحة متتالية')}!`, `${nm(hot)}: ${G.aw[hot].run} right in a row!`));
    let jump = null, jv = 1; order.forEach(u => { const d = (was[u] || 0) - now2[u]; if (was[u] && d > jv) { jv = d; jump = u; } });
    if (jump && jv >= 2) lines.push(B(`${nm(jump)} يقفز ${arN(jv, '', 'مركزين', 'مراكز', 'مركزًا')} إلى المركز ${now2[jump]}!`, `${nm(jump)} jumps ${jv} places to ${now2[jump]}!`));
    const players = Object.keys(G.players).length, right = Object.keys(sc).filter(u => u in G.players && sc[u].c).length;
    if (judged && players >= 2 && right === players) lines.push(B('أصاب الجميع! هل كان سهلًا؟', 'Everyone got it! Too easy?'));
    if (judged && players >= 2 && right === 0) lines.push(B('ولا أحد أصاب! هذا كان صعبًا.', 'Nobody got it! That was a hard one.'));
    if (order.length > 2 && G.i > 0) { const gap = (G.score[order[0]] || 0) - (G.score[order[1]] || 0); if (gap > 0 && gap < 120) lines.push(B(`الصدارة على المحك: الفرق بين الأول والثاني ${gap} نقطة فقط`, `Neck and neck at the top: only ${gap} points apart`)); }
    G.rk = now2;
    const t = lines[0] || '';
    G.cmt = t || null;
    G.ref.child('cm').set(t ? { i: G.i, t: t.replace(/<span class="en">.*?<\/span>/g, '').replace(/<[^>]+>/g, ''), e: t.replace(/<span class="ar">.*?<\/span>/g, '').replace(/<[^>]+>/g, '') } : null).catch(() => {});
  }
  // titles at the end: one winner each, only when it was really earned
  function titles(order) {
    const A = G.aw || {}, us = Object.keys(G.players), out = [];
    const best = (f, ok) => { let w = null, v = null; us.forEach(u => { const x = f(A[u] || {}, u); if (x == null || !ok(x)) return; if (v == null || x > v) { v = x; w = u; } }); return w ? { u: w, v } : null; };
    const add = (k, r, ar, en) => { if (r) out.push({ k, u: r.u.slice(0, 8), n: G.players[r.u] || '', v: r.v, ar: ar(r.v), en: en(r.v) }); };
    add('fast', best(w => w.tn >= 2 ? -(w.t / w.tn) : null, () => true), v => `أسرع إجابة صحيحة: ${(-v).toFixed(1)} ث في المتوسط`, v => `Fastest right answers: ${(-v).toFixed(1)}s on average`);
    add('run', best(w => w.best || 0, v => v >= 3), v => `أطول سلسلة: ${arN(v, '', '', 'إجابات صحيحة متتالية', 'إجابة صحيحة متتالية')}`, v => `Longest run: ${v} right in a row`);
    // the biggest climb, from everyone's points after each question
    const J = G.jr || []; if (J.length > 2) { const rank = o => { const r = {}; Object.keys(o).sort((a, b) => o[b] - o[a]).forEach((u, k) => { r[u] = k + 1; }); return r; }; const R = J.map(rank);
      add('back', best((w, u) => { let m = 0; for (let t = 1; t < R.length; t++) for (let t0 = 0; t0 < t; t0++) if (R[t0][u] && R[t][u]) m = Math.max(m, R[t0][u] - R[t][u]); return m; }, v => v >= 2), v => `أكبر عودة: صعد ${arN(v, '', 'مركزين', 'مراكز', 'مركزًا')}`, v => `Biggest comeback: up ${v} places`); }
    add('spirit', best(w => w.rx || 0, v => v >= 3), v => `روح الميدان: ${arN(v, '', 'تفاعلان', 'تفاعلات', 'تفاعلًا')}`, v => `Spirit of the game: ${v} reactions`);
    add('bold', best(w => w.bet || 0, v => v >= 1), v => `المغامر: ربح ${arN(v, 'رهانًا واحدًا', 'رهانين', 'رهانات', 'رهانًا')}`, v => `The daring one: won ${v} bet${v > 1 ? 's' : ''}`);
    add('games', best(w => w.g || 0, v => v > 0), v => `بطل التحديات: ${v} نقطة من التحديات`, v => `Challenge champion: ${v} points from challenges`);
    return out;
  }
  const TITLE = { fast: ['الأسرع', 'The fastest'], run: ['القنّاص', 'The sniper'], back: ['العائد', 'The comeback'], spirit: ['روح الميدان', 'Spirit of the game'], bold: ['المغامر', 'The daring one'], games: ['بطل التحديات', 'Challenge champion'] };
  /* ---------- team captains: one per team, chosen at the start; once a game the captain's points go to every teammate ---------- */
  function captains() {
    G.cap = null; if (!G.teams || G.opts.cap === false || !G.opts.pw) return;
    G.cap = {}; const by = {}; Object.keys(G.players).forEach(u => { const t = G.team[u]; if (t == null) return; (by[t] = by[t] || []).push(u); });
    Object.values(by).forEach(m => { G.cap[m[Math.floor(Math.random() * m.length)]] = 1; });
    G.cmt = B(`قادة الفرق: ${Object.keys(G.cap).map(u => `«${esc(G.players[u] || '')}»`).join('، ')}`, `Team captains: ${Object.keys(G.cap).map(u => esc(G.players[u] || '')).join(', ')}`);
  }
  /* ---------- the audience asks: a fan sends a true-or-false statement during a question; the host may put it in ---------- */
  function fanAsks(ans) {
    Object.keys(ans).forEach(u => { const a = ans[u]; if (!a || u in G.players || typeof a.a !== 'string' || a.a.slice(0, 2) !== 'Q:') return;
      const m = a.a.match(/^Q:([01]):([\s\S]{3,140})$/); if (!m) return; G.asks = G.asks || []; if (G.asks.some(z => z.u === u && z.q === m[2])) return;
      G.asks.push({ u, n: (G.fans || {})[u] || T('مشجّع', 'A fan'), q: m[2].trim(), ok: m[1] === '1' }); });
  }
  function asksBox() {
    const L = (G.asks || []).filter(z => !z.used); if (!L.length) return;
    const d = document.createElement('div'); d.className = 'md-asks';
    d.innerHTML = `<div class="md-asksb"><h3>${B('أسئلة من الجمهور', 'Questions from the audience')}</h3>${L.map((z, k) => `<div class="md-ask"><p dir="auto">${esc(z.q)}</p><small>${esc(z.n)} · ${z.ok ? B('صح', 'True') : B('خطأ', 'False')}</small><button type="button" class="btn solid" data-ask="${k}">${B('أضفه سؤالًا تاليًا', 'Ask it next')}</button></div>`).join('')}<button type="button" class="md-cb" data-x>${B('إغلاق', 'Close')}</button></div>`;
    G.el.appendChild(d);
    d.querySelector('[data-x]').onclick = () => d.remove();
    d.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => { const z = L[+b.dataset.ask]; z.used = true;
      G.quiz.qs.splice(G.done + 1, 0, { type: 'tf', q: z.q, opts: [T('صح', 'True'), T('خطأ', 'False')], ok: [z.ok ? 0 : 1], pts: 1, time: 20, by: z.n });
      if (G.gold > G.done) G.gold++; keep(); d.remove(); const nb = G.el.querySelector('[data-asks]'); if (nb) nb.remove(); });
  }
  /* ---------- the host's phone as a remote: paired with a code shown on the screen, it sends short commands ---------- */
  function remote(u, e) {
    if (!G) return;
    if (e === '@' + G.rc) { G.remote = u; G.ref.child('rc').set(u.slice(0, 8)).catch(() => {}); if (G.fans) delete G.fans[u]; const p = G.el.querySelector('.md-rcbox'); if (p) p.remove(); return; }
    if (u !== G.remote) return;
    const click = s => { const b = G.el.querySelector(s); if (b && !b.disabled) b.click(); };
    if (e === '@n') { click('[data-next]'); click('[data-go]'); }
    else if (e === '@s') click('[data-skip]');
    else if (e === '@m') click('[data-mic]');
    else if (e === '@r') click('[data-replay]');
  }
  function remoteBox() {
    const url = `${location.origin}/m/?p=${G.pin}&rc=${G.rc}`;
    let svg = ''; try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); svg = qr.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (e) {}
    const d = document.createElement('div'); d.className = 'md-asks md-rcbox'; d.dataset.url = url;
    d.innerHTML = `<div class="md-asksb"><h3>${B('تحكّم من جوالك', 'Control from your phone')}</h3><div class="md-rcqr">${svg}</div><p>${B('امسح الرمز بجوالك، فتنتقل بين الأسئلة وتكشف الإجابة وتفتح منصة التصريحات منه.', 'Scan it with your phone to move on, reveal the answer and open the stage from it.')}</p><button type="button" class="md-cb" data-x>${B('إغلاق', 'Close')}</button></div>`;
    G.el.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove();
  }
  /* ---------- phones only: what the big screen would show goes to the phones as data ---------- */
  function phonesResult(x, ans) {
    const A = Object.keys(ans).filter(u => u in G.players).map(u => ans[u] && ans[u].a);
    const out = { i: G.i, n: A.length };
    if (['mc', 'tf', 'poll'].includes(x.type)) { out.c = (x.opts || []).map(() => 0); A.forEach(a => [].concat(a == null ? [] : a).forEach(j => { if (out.c[+j] != null) out.c[+j]++; })); }
    else if (['open', 'word', 'num'].includes(x.type)) { const f = {}; A.forEach(a => { const w = String(a == null ? '' : a).trim().replace(/\s+/g, ' ').slice(0, 30); if (w) f[w] = (f[w] || 0) + 1; }); out.w = Object.entries(f).sort((p, q) => q[1] - p[1]).slice(0, 15); }
    G.ref.child('rv').set(out).catch(() => {});
  }

  /* ---------- the room ---------- */
  let G = null; // the running game
  function shell() {
    const el = document.createElement('div'); el.className = 'md-live'; el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="md-wait">${B('جارٍ تجهيز الميدان…', 'Preparing the room…')}</div>`;
    document.body.appendChild(el); document.documentElement.classList.add('md-on');
    try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch (e) {}
    return el;
  }
  const fail = el => { el.innerHTML = `<div class="md-wait">${B('تعذّر الاتصال بالميدان. تأكد من الإنترنت ثم حاول مرة أخرى.', 'Could not reach the room. Check the connection and try again.')}<button type="button" class="btn ghost" data-x>${B('إغلاق', 'Close')}</button></div>`; el.querySelector('[data-x]').onclick = () => { G = null; leave(); }; };
  function fresh(quiz, el, pin) {
    const n = quiz.qs.length;
    const txt = quiz.qs.map(x => (x.q || '') + (x.opts || []).join('')).join('');
    // the screen's language: the questions' own, or the page's when there is no text (a games-only quiz)
    G = { ar: /[؀-ۿ]/.test(txt) || (!/[a-z]/i.test(txt) && document.documentElement.lang !== 'en'), pin, quiz, el, ref: db.ref('rooms/' + pin), players: {}, score: {}, qp: {}, out: {}, streak: {}, team: {}, teams: null, i: -1, done: -1,
      opts: { every: 1, speed: true, gold: true, final: true, bet: false, pw: true, shuf: true, auto: false, mic: true, cap: true }, rc: String(1000 + Math.floor(Math.random() * 9000)), fans: {}, gold: -1, timer: null, subs: [] };
  }
  async function start(quiz) {
    const el = shell();
    try {
      await ready();
      let pin = null;
      for (let k = 0; k < 8 && !pin; k++) {
        const p = String(Math.floor(100000 + Math.random() * 900000));
        try { await db.ref('rooms/' + p).set({ host: uid, at: TS, title: quiz.title || '', n: quiz.qs.length, st: { ph: 'lobby', i: -1, lock: false } }); pin = p; } catch (e) { /* taken: try another */ }
      }
      if (!pin) throw new Error('pin');
      fresh(quiz, el, pin); keep(); lobby();
    } catch (e) { fail(el); }
  }
  // pick up a paused game: the same room, the same players, the scores so far
  async function resume() {
    const s = pending(); if (!s) return;
    const el = shell();
    try {
      await ready();
      const room = (await db.ref('rooms/' + s.pin).once('value')).val();
      if (!room || room.host !== uid) { forget(); el.innerHTML = `<div class="md-wait">${B('انتهت صلاحية هذه المسابقة ولم تعد موجودة.', 'This quiz is no longer available.')}<button type="button" class="btn ghost" data-x>${B('إغلاق', 'Close')}</button></div>`; el.querySelector('[data-x]').onclick = leave; return; }
      fresh(s.quiz, el, s.pin);
      Object.assign(G, { score: s.score || {}, qp: s.qp || {}, out: s.out || {}, streak: s.streak || {}, team: s.team || {}, teams: s.teams || null, opts: s.opts || G.opts, gold: s.gold, players: s.players || {}, i: s.i, done: s.i, used: s.used || {}, jr: s.jr || [], jrAt: s.jrAt, lockJoin: !!s.lockJoin, shuffled: !!s.shuffled });
      if (s.phones) { phonesMode(true); if (G.i >= 0) G.el.classList.add('started'); }
      keepPlayers();
      if (G.i < 0) return lobby();
      await G.ref.child('st').set({ ph: 'lb', i: G.i, lock: !!G.lockJoin });
      board(T('نكمل من حيث توقفنا', 'Picking up where we left off'));
    } catch (e) { fail(el); }
  }
  function leave() { document.querySelectorAll('.md-live').forEach(x => x.remove()); document.documentElement.classList.remove('md-on'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); document.dispatchEvent(new Event('md:closed')); }
  function close() {
    if (G) { clearInterval(G.timer); G.subs.forEach(f => f()); G.ref.remove().catch(() => {}); }
    G = null; forget(); leave();
  }
  // pause: the room stays, phones show a pause screen, and the game waits in this browser
  async function pause() {
    if (!G) return;
    clearInterval(G.timer); keep();
    await G.ref.child('st').update({ ph: 'pause' }).catch(() => {});
    G.subs.forEach(f => f()); G = null; leave();
  }
  const sub = (ref, ev, fn) => { ref.on(ev, fn); G.subs.push(() => ref.off(ev, fn)); };
  /* ---------- last survivor: a wrong answer takes a player out of the race ---------- */
  const outv = u => G.out[u] == null ? 1e9 : G.out[u];
  const byRank = (a, b) => (G.opts.surv ? outv(b) - outv(a) : 0) || (G.score[b] || 0) - (G.score[a] || 0);
  const alive = () => Object.keys(G.players).filter(u => G.out[u] == null);
  function survive(x, sc) {
    if (!G.opts.surv || G.teams) return;   // last survivor is a game of individuals; with teams it is set aside
    const live = alive(), judged = !['poll', 'open', 'stage', 'game'].includes(x.type);
    const lose = judged ? live.filter(u => !sc[u] || !sc[u].c) : [];
    // when everyone still in would go out, they are all spared this time
    const spared = lose.length && lose.length === live.length;
    if (!spared) lose.forEach(u => { G.out[u] = G.i; });
    const left = alive();
    Object.keys(G.players).forEach(u => { sc[u] = sc[u] || { s: G.score[u] || 0, d: 0, c: false, a: false }; sc[u].out = G.out[u] != null; sc[u].left = left.length; });
    const order = Object.keys(sc).sort(byRank);
    order.forEach((u, k) => { sc[u].r = k + 1; sc[u].of = order.length; delete sc[u].gap; if (k && G.out[u] == null) { sc[u].gap = G.score[order[k - 1]] - G.score[u]; sc[u].above = G.players[order[k - 1]] || ''; } });
    G.note = !judged ? `${B(`الناجون: ${left.length}`, `Still in: ${left.length}`)}`
      : spared ? `${B(`أخطأ الجميع، فنجوا كلهم هذه المرة. الناجون: ${left.length}`, `Everyone missed, so all are spared this time. Still in: ${left.length}`)}`
      : !G.teams && left.length <= 1 ? `${B(`الناجي الأخير: ${esc(G.players[left[0]] || '')}! اضغط التالي لإعلان النتيجة`, `The last survivor: ${esc(G.players[left[0]] || '')}! Press next for the results`)}`
      : `${B(`خرج ${lose.length} · بقي ${left.length}`, `${lose.length} out · ${left.length} still in`)}${lose.length && lose.length <= 6 ? ` <small dir="auto">${lose.map(u => esc(G.players[u] || '')).join('، ')}</small>` : ''}`;
  }
  const SV = d => `<svg class="md-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = { rc: SV('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'), vol: SV('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'), mute: SV('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>'), fs: SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>') };
  function frame(inner, bar, canPause) {
    if (G.note) { inner = inner.replace(/<\/div>\s*$/, `<p class="md-surv">${G.note}</p></div>`); G.note = null; }
    if (G.cmt) { inner = `<p class="md-cmt" dir="auto">${G.cmt}</p>` + inner; G.cmt = null; }
    (G.box || G.el).innerHTML = `<div class="md-scr">${inner}</div><div class="md-fx" aria-hidden="true"></div><div class="md-ctl">${bar || ''}<span class="md-sp"></span>${canPause && G.i >= 0 && !G.ended ? `<button type="button" class="md-cb md-micb${G.stageNext ? ' on' : ''}" data-mic>${G.stageNext ? B('منصة التصريحات بعد هذه الجولة ✓', 'Stage next ✓') : B('افتح منصة التصريحات', 'Open the stage')}<small>${micTxt()}</small></button>` : ''}${canPause ? `<button type="button" class="md-cb" data-pause>${B('إيقاف مؤقت', 'Pause')}</button>` : ''}${G.i >= 0 && !G.ended && (G.asks || []).some(z => !z.used) ? `<button type="button" class="md-cb md-micb on" data-asks>${B(`أسئلة الجمهور (${G.asks.filter(z => !z.used).length})`, `Audience questions (${G.asks.filter(z => !z.used).length})`)}</button>` : ''}${G.remote ? '' : `<button type="button" class="md-cb" data-rc title="${T('تحكّم من جوالك', 'Control from your phone')}">${IC.rc}</button>`}<button type="button" class="md-cb" data-mute title="${T('الصوت', 'Sound')}">${mute ? IC.mute : IC.vol}</button><button type="button" class="md-cb" data-fs title="${T('ملء الشاشة', 'Full screen')}">${IC.fs}</button><button type="button" class="md-cb" data-end>${B('إنهاء', 'End')}</button></div>`;
    clearTimeout(G.autoT);
    const q = s => G.el.querySelector(s);
    if (G.opts.auto && !G.ended) { const nb = G.el.querySelector('[data-next]'); if (nb) G.autoT = setTimeout(() => { if (nb.isConnected) nb.click(); }, G.el.querySelector('.md-lb') ? 6500 : 4500); }
    q('[data-mute]').onclick = e => { mute = !mute; e.currentTarget.innerHTML = mute ? IC.mute : IC.vol; };
    q('[data-fs]').onclick = () => document.fullscreenElement ? document.exitFullscreen() : G.el.requestFullscreen && G.el.requestFullscreen();
    q('[data-end]').onclick = () => { if (G.i < 0 || G.ended || confirmEnd()) close(); };
    if (q('[data-pause]')) q('[data-pause]').onclick = pause;
    if (q('[data-mic]')) q('[data-mic]').onclick = () => { G.stageNext = !G.stageNext; micSync(); };
    if (q('[data-asks]')) q('[data-asks]').onclick = asksBox;
    if (q('[data-rc]')) q('[data-rc]').onclick = remoteBox;
    return q;
  }
  function confirmEnd() {
    const c = G.el.querySelector('.md-confirm'); if (c) return true;
    const d = document.createElement('div'); d.className = 'md-confirm';
    d.innerHTML = `<p>${B('إنهاء المسابقة الآن؟ تُحذف الغرفة ونتائجها. وللمتابعة لاحقًا استعمل «إيقاف مؤقت».', 'End the quiz now? The room and its results are removed. To continue later, use “Pause”.')}</p><button type="button" class="btn solid" data-y>${B('نعم، إنهاء', 'Yes, end')}</button><button type="button" class="btn ghost" data-n>${B('متابعة', 'Keep playing')}</button>`;
    G.el.appendChild(d); d.querySelector('[data-y]').onclick = close; d.querySelector('[data-n]').onclick = () => d.remove();
    return false;
  }
  // reactions sent from phones float up the big screen
  function reactions() {
    const seen = {};
    const fly = s => {
      const v = s.val() || {}; if (!v.e || seen[s.key] === v.t) return; seen[s.key] = v.t;
      if (now() - (v.t || 0) > 8000) return;
      if (v.e === '🎤') { stat({ 'x/mic': 1 }); return micVote(s.key); }
      if (v.e.charAt(0) === '@') return remote(s.key, v.e);
      if (G) { G.aw = G.aw || {}; const w = G.aw[s.key] = G.aw[s.key] || {}; w.rx = (w.rx || 0) + 1; }
      if (G) G.rxc = (G.rxc || 0) + 1;
      const fx = G && G.el.querySelector('.md-fx'); if (!fx) return;
      const e = document.createElement('span'); e.textContent = v.e; e.style.setProperty('--x', (8 + Math.random() * 84) + '%'); e.style.setProperty('--r', (Math.random() * 40 - 20) + 'deg');
      fx.appendChild(e); setTimeout(() => e.remove(), 2600);
    };
    sub(G.ref.child('rx'), 'child_added', fly); sub(G.ref.child('rx'), 'child_changed', fly);
  }

  /* ---------- phones only: no big screen; the host's own phone runs the quiz and plays it in a panel below ----------
     The panel is the player page itself (same browser, so the same player), kept alive while the screen above changes. */
  function phonesMode(on) {
    G.phones = on; if (on) G.opts.auto = true; G.ref.child('pm').set(on ? 1 : null).catch(() => {});   // nobody stands at a screen, so it moves on by itself
    G.el.classList.toggle('phones', on);
    if (on && !G.fr) {
      const box = document.createElement('div'); box.className = 'md-box'; while (G.el.firstChild) box.appendChild(G.el.firstChild);
      const fr = document.createElement('iframe'); fr.className = 'md-me'; fr.title = T('جوالي', 'My phone'); fr.src = '../../m/index.html?embed=1&p=' + G.pin;
      G.el.append(box, fr); G.box = box; G.fr = fr;
    }
    if (G.fr) G.fr.hidden = !on;
    keep();
  }

  /* ---------- the stage on demand: the host opens it, or it opens when a quarter of the players ask ---------- */
  const micNeed = () => Math.max(2, Math.ceil(Object.keys(G.players).length * .25));
  const micCool = () => G.micAt != null && G.done - G.micAt < 2;   // a pause of two questions after each stage
  const micTxt = () => G.stageNext ? '' : micCool() ? ` · ${T('استراحة', 'cooling down')}` : G.mic && G.mic.size ? ` · ${G.mic.size}/${micNeed()}` : '';
  function micVote(u) {
    if (!G.opts.mic || !(u in G.players) || G.stageNext || micCool() || G.i < 0) return;
    G.mic = G.mic || new Set(); G.mic.add(u);
    if (G.mic.size >= micNeed()) { G.stageNext = true; SND.gold(); const fx = G.el.querySelector('.md-fx'); if (fx) { const e = document.createElement('span'); e.className = 'md-micfx'; e.textContent = T('تُفتح منصة التصريحات بعد هذه الجولة!', 'The stage opens after this round!'); fx.appendChild(e); setTimeout(() => e.remove(), 3500); } }
    micSync();
  }
  function micSync() {
    G.micInfo = { n: G.mic ? G.mic.size : 0, need: micNeed(), on: !!G.stageNext, cool: micCool(), off: !G.opts.mic };
    G.ref.child('top/mic').set(G.micInfo).catch(() => {});
    const b = G.el.querySelector('[data-mic]'); if (b) { b.classList.toggle('on', !!G.stageNext); b.innerHTML = `${G.stageNext ? B('منصة التصريحات بعد هذه الجولة ✓', 'Stage next ✓') : B('افتح منصة التصريحات', 'Open the stage')}<small>${micTxt()}</small>`; }
  }
  // put a stage in before the next question
  function stageNow() {
    const at = G.done + 1;
    G.quiz.qs.splice(at, 0, { type: 'stage', q: T('منصة التصريحات لكم: قل كلمتك', 'The stage is yours: say your word'), opts: [], ok: [], pts: 0, time: 45 });
    if (G.gold >= at) G.gold++;
    G.stageNext = false; G.mic = new Set(); G.micAt = at; micSync(); keep();
  }

  // a statement on the stage: the name and the words in a speech bubble; the host can click one away
  const bubble = (n, t, k) => `<div class="md-bub" style="--c:var(--qz${k % 6})" onclick="this.remove()"><b dir="auto">${esc(n || '')}</b><p dir="auto">${esc(String(t).slice(0, 140))}</p></div>`;

  /* ---------- challenge tools: once each per game, sent with the answer ----------
     x2: this question counts double · st: what you earn is taken from the neighbour you chose · sk: skip it and take your average so far */
  function powers(sc, x) {
    const judged = !['poll', 'open', 'stage'].includes(x.type);
    Object.keys(G.pws || {}).forEach(u => {
      const a = G.pws[u], want = String(a.p).split(','); G.used = G.used || {}; const used = G.used[u] = G.used[u] || {};
      const r = sc[u] = sc[u] || { s: G.score[u] || 0, d: 0, c: false, a: true }; r.pw = [];
      if (!judged) return;
      if (want.includes('sk') && !used.sk) { used.sk = 1; const before = (G.score[u] || 0) - (r.d || 0), avg = G.i > 0 ? Math.round(before / G.i) : 300; G.score[u] = before + avg; G.qp[u] = (G.qp[u] || 0) - (r.d || 0) + avg; r.d = avg; r.c = true; r.s = G.score[u]; r.pw.push('sk'); return; }
      if (want.includes('x2') && !used.x2) { used.x2 = 1; const add = Math.max(0, r.d || 0); r.d = (r.d || 0) + add; G.score[u] = (G.score[u] || 0) + add; G.qp[u] = (G.qp[u] || 0) + add; r.s = G.score[u]; r.pw.push('x2'); }
      if (want.includes('cp') && !used.cp && G.cap && G.cap[u] && G.teams && G.team[u] != null) { used.cp = 1; const add = Math.max(0, r.d || 0), mates = Object.keys(G.players).filter(m => m !== u && G.team[m] === G.team[u]); r.pw.push('cp'); r.cg = add; r.cn = mates.length;
        if (add) mates.forEach(m => { G.score[m] = (G.score[m] || 0) + add; G.qp[m] = (G.qp[m] || 0) + add; const t = sc[m] = sc[m] || { s: 0, d: 0, c: false, a: false }; t.d = (t.d || 0) + add; t.s = G.score[m]; t.capby = G.players[u] || ''; });
        if (add) G.capNote = B(`الكابتن «${esc(G.players[u] || '')}» يهدي فريقه ${add} نقطة لكل عضو!`, `Captain ${esc(G.players[u] || '')} gives each teammate ${add} points!`); }
      if (want.includes('st') && !used.st && a.g && a.g in G.players && a.g !== u) { used.st = 1; const take = Math.max(0, r.d || 0), g = a.g; r.pw.push('st'); r.tg = G.players[g] || '';
        if (take) { G.score[g] = Math.max(0, (G.score[g] || 0) - take); const t = sc[g] = sc[g] || { s: 0, d: 0, c: false, a: false }; t.d = (t.d || 0) - take; t.s = G.score[g]; t.hit = (t.hit ? t.hit + '، ' : '') + (G.players[u] || ''); } }
    });
  }
  // each player's neighbours in the ranking, so a phone can offer whom to steal from
  function nbrs(sc) {
    feats(sc);
    const order = Object.keys(sc).filter(u => u in G.players).sort(byRank), one = u => u ? { u, n: G.players[u] || '', s: G.score[u] || 0 } : null;
    G.lastD = {}; Object.keys(sc).forEach(u => { G.lastD[u] = sc[u].d || 0; });
    order.forEach((u, k) => { sc[u].up = one(order[k - 1]); sc[u].dn = one(order[k + 1]); sc[u].used = Object.keys((G.used || {})[u] || {}).join(','); });
  }
  // a fresh order: the questions mixed (the last one stays last when it is a rapid round or the decisive one), and the options of each
  function shuffleQuiz(qz) {
    const qs = qz.qs.slice(), keepLast = qs.length > 1 && (qs[qs.length - 1].type === 'rapid' || G.opts.final) ? qs.pop() : null;
    for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [qs[i], qs[j]] = [qs[j], qs[i]]; }
    if (keepLast) qs.push(keepLast);
    return Object.assign({}, qz, { qs: qs.map(x => {
      if (x.type !== 'mc' || !x.opts || x.opts.length < 3) return x;
      const idx = x.opts.map((_, k) => k).sort(() => Math.random() - .5);
      return Object.assign({}, x, { opts: idx.map(k => x.opts[k]), ok: x.ok.map(k => idx.indexOf(k)) });
    }) });
  }

  /* ---------- teams: average score, so a small team is not at a loss ---------- */
  function teamTable() {
    if (!G.teams) return [];
    return G.teams.map((name, k) => {
      const m = Object.keys(G.players).filter(u => G.team[u] === k), avg = m.length ? Math.round(m.reduce((a, u) => a + (G.score[u] || 0), 0) / m.length) : 0;
      return { k, name, n: m.length, avg };
    }).filter(t => t.n).sort((a, b) => b.avg - a.avg); // empty teams are left out
  }
  // players who joined before teams were set get the smallest team
  function placeAll(shuffle) {
    if (!G.teams) return;
    if (shuffle) {
      const us = Object.keys(G.players).sort(() => Math.random() - .5);
      us.forEach((u, k) => { G.team[u] = k % G.teams.length; });
      G.ref.child('asg').set(Object.fromEntries(us.map(u => [u, G.team[u]])));
      return;
    }
    Object.keys(G.players).forEach(u => { if (G.team[u] == null || G.team[u] >= G.teams.length) { const c = G.teams.map((_, k) => Object.keys(G.players).filter(v => G.team[v] === k).length); G.team[u] = c.indexOf(Math.min(...c)); } });
  }

  /* ---------- lobby: the code, a QR code, who has joined, and the settings ---------- */
  function lobby() {
    const url = 'https://' + JOIN + '/?p=' + G.pin;
    let svg = ''; try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); svg = qr.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); } catch (e) {}
    const O = G.opts;
    const q = frame(`<div class="md-lobby">
        <div class="md-join"><p class="md-how">${B('ادخل من جوالك على', 'On your phone, go to')}</p><p class="md-url" dir="ltr">${JOIN}</p><p class="md-how">${B('واكتب الرمز', 'and enter the code')}</p><p class="md-pin" dir="ltr">${G.pin.slice(0, 3)} ${G.pin.slice(3)}</p></div>
        <div class="md-qr">${svg}<small>${B('أو امسح الرمز', 'or scan')}</small></div></div>
      <h2 class="md-title">${esc(G.quiz.title || T('ميدان', 'Maydan'))}</h2>
      <div class="md-count"><b id="mdN">0</b> ${B('مشارك', 'players')} <small id="mdFans"></small></div><div class="md-names" id="mdNames"></div>
      <div class="md-set" id="mdSet" hidden>
        <h3>${B('إعدادات المسابقة', 'Quiz settings')}</h3>
        <label>${B('عرض الترتيب', 'Show the ranking')}<select data-o="every">${[[1, T('بعد كل سؤال', 'After every question')], [3, T('كل ٣ أسئلة', 'Every 3 questions')], [5, T('كل ٥ أسئلة', 'Every 5 questions')], [0, T('في النهاية فقط', 'Only at the end')]].map(([v, l]) => `<option value="${v}"${O.every === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="md-ck"><input type="checkbox" data-o="speed"${O.speed ? ' checked' : ''}> ${B('السرعة تزيد النقاط', 'Speed adds points')}</label>
        <label class="md-ck"><input type="checkbox" data-o="gold"${O.gold ? ' checked' : ''}> ${B('سؤال ذهبي مفاجئ بنقاط مضاعفة', 'A surprise golden question with double points')}</label>
        <label class="md-ck"><input type="checkbox" data-o="final"${O.final ? ' checked' : ''}> ${B('لحظة الحسم: السؤال الأخير بنقاط مضاعفة', 'The final question with double points')}</label>
        <label class="md-ck"><input type="checkbox" data-o="surv"${O.surv ? ' checked' : ''}> ${B('الناجي الأخير: من يخطئ يخرج من المنافسة ويتابع متفرجًا، ويفوز من يصمد حتى النهاية', 'Last survivor: a wrong answer takes you out to watch; whoever lasts wins')} <small>${B('(للأفراد فقط؛ لا يعمل مع الفرق)', '(individuals only; off with teams)')}</small></label>
        <label class="md-ck"><input type="checkbox" data-o="pw"${O.pw ? ' checked' : ''}> ${B('أدوات التحدي لكل متسابق مرة واحدة: مضاعفة السؤال ×٢، وخطف النقاط من جارك في الترتيب، والانسحاب من سؤال بمتوسط نقاطك', 'Challenge tools, once each: double a question, steal from a neighbour in the ranking, skip a question for your average')}</label>
        <label class="md-ck"><input type="checkbox" data-o="mic"${O.mic ? ' checked' : ''}> ${B('منصة التصريحات: زر «اطلب منصة التصريحات» عند المشاركين، وتُفتح بعد الجولة إذا طلبها ٢٥٪ منهم (وتقدر تفتحها أنت متى شئت)', 'The stage: players can ask for it, and it opens after the round when 25% ask (you can open it any time)')}</label>
        <label class="md-ck"><input type="checkbox" data-o="shuf"${O.shuf ? ' checked' : ''}> ${B('ترتيب عشوائي للأسئلة والخيارات في كل مرة', 'Shuffle the questions and options each time')}</label>
        <label class="md-ck"><input type="checkbox" data-o="auto"${O.auto ? ' checked' : ''}> ${B('▶ تقدّم تلقائي (المشرف يلعب من جواله أيضًا: ادخل بالرمز نفسه)', '▶ Move on automatically (so the host can play on a phone too, with the same code)')}</label>
        <label class="md-ck"><input type="checkbox" data-o="bet"${O.bet ? ' checked' : ''}> ${B('الثقة: يراهن المشارك على إجابته فيكسب أو يخسر نقاطًا إضافية', 'Confidence: players can bet on their answer to win or lose extra points')}</label>
        <button type="button" class="btn solid" data-done>${B('تم', 'Done')}</button></div>
      <div class="md-mode"><span>${B('كيف تعرضون المسابقة؟', 'How will you follow the quiz?')}</span><button type="button" data-mode="screen" aria-pressed="${!G.phones}">${B('شاشة عرض', 'A big screen')}</button><button type="button" data-mode="phones" aria-pressed="${!!G.phones}">${B('جوالات فقط (وأنا ألعب معهم)', 'Phones only (and I play too)')}</button></div>
      <div class="md-set md-teamp" id="mdTeamP" hidden>
        <h3>${B('الفرق', 'Teams')}</h3>
        <label>${B('عدد الفرق', 'Number of teams')}<select data-o="teams"><option value="0">${T('بلا فرق (كل مشارك وحده)', 'No teams (everyone on their own)')}</option>${[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30].map(n => `<option value="${n}"${G.teams && G.teams.length === n ? ' selected' : ''}>${n} ${n <= 10 ? T('فرق', 'teams') : T('فريقًا', 'teams')}</option>`).join('')}</select></label>
        <label class="md-ck" data-capw hidden><input type="checkbox" data-o="cap"${O.cap !== false ? ' checked' : ''}> ${B('كابتن لكل فريق: مرة واحدة تذهب نقاطه لكل أعضاء فريقه', 'A captain for each team: once a game, their points go to every teammate')}</label>
        <label data-tmode hidden>${B('كيف يُوزَّع المشاركون؟', 'How are players placed?')}<select data-o="tmode">
          <option value="pick"${!['auto', 'host'].includes(G.opts.tmode) ? ' selected' : ''}>${T('يختار كل مشارك فريقه من جواله', 'Each player picks a team on their phone')}</option>
          <option value="host"${G.opts.tmode === 'host' ? ' selected' : ''}>${T('المشرف يوزّعهم بنفسه هنا', 'The host places them here')}</option>
          <option value="auto"${G.opts.tmode === 'auto' ? ' selected' : ''}>${T('توزيع عشوائي متوازن عند البدء', 'Random and balanced at the start')}</option></select></label>
        <div data-tnw hidden><p class="md-tnh">${B('أسماء الفرق (اكتبها كما تريد)', 'Team names (write your own)')}</p><div class="md-tn" id="mdTn"></div></div>
        <p class="md-tip" data-tip hidden></p>
        <button type="button" class="btn solid" data-tdone>${B('تم', 'Done')}</button></div>
      <div class="md-move" id="mdMove" hidden></div>`,
      `<button type="button" class="btn solid md-start" data-go disabled>${B('ابدأ', 'Start')}</button>
       <button type="button" class="md-cb md-cbt" data-teams>${B('الفرق', 'Teams')}</button>
       <button type="button" class="md-cb" data-set>${B('الإعدادات', 'Settings')}</button>
       <button type="button" class="md-cb" data-share>${B('رابط الدخول', 'Join link')}</button>
       <label class="md-opt"><input type="checkbox" data-lock> ${B('إقفال الدخول', 'Lock joining')}</label>`, true);
    q('[data-share]').onclick = async e => {
      const link = url, text = T(`ادخل مسابقة «${G.quiz.title || 'ميدان'}»: `, `Join “${G.quiz.title || 'Maydan'}”: `) + link;
      try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); e.currentTarget.textContent = '✓ ' + T('نُسخ', 'Copied'); } } catch (er) {}
    };
    const names = q('#mdNames'), go = q('[data-go]'), set = q('#mdSet'), tp = q('#mdTeamP'), mv = q('#mdMove');
    const chipHtml = u => `<button type="button" class="md-chip" data-u="${u}" style="--tc:${G.teams && G.team[u] != null ? `var(--qz${G.team[u] % 6})` : 'transparent'}" dir="auto">${esc(G.players[u] || '')}</button>`;
    // with teams the names sit in a column per team, so everyone can see where they are
    const draw = () => {
      const us = Object.keys(G.players);
      if (!G.teams) names.innerHTML = us.map(chipHtml).join('');
      else {
        const free = us.filter(u => G.team[u] == null || G.team[u] >= G.teams.length);
        names.innerHTML = `<div class="md-cols">${G.teams.map((t, k) => { const m = us.filter(u => G.team[u] === k); return `<div class="md-col" style="--c:var(--qz${k % 6})"><h4 dir="auto">${esc(t)} <small>${m.length}</small></h4>${m.map(chipHtml).join('')}</div>`; }).join('')}
          ${free.length ? `<div class="md-col md-free"><h4>${B('بلا فريق بعد', 'No team yet')} <small>${free.length}</small></h4>${free.map(chipHtml).join('')}</div>` : ''}</div>`;
      }
      names.classList.toggle('md-has-cols', !!G.teams);
    };
    const chip = () => draw();
    names.onclick = e => {
      const c = e.target.closest('[data-u]'); if (!c) return; const u = c.dataset.u, r = c.getBoundingClientRect();
      mv.innerHTML = `<p dir="auto"><b>${esc(G.players[u] || '')}</b></p>${G.teams ? `<p class="md-mvh">${B('انقله إلى:', 'Move to:')}</p><div class="md-mvt">${G.teams.map((t, k) => `<button type="button" data-to="${k}" style="--c:var(--qz${k % 6})"${G.team[u] === k ? ' aria-pressed="true"' : ''} dir="auto">${esc(t)}</button>`).join('')}</div>` : ''}<div class="md-mvb"><button type="button" class="md-rm" data-rm>${B('إخراجه من المسابقة', 'Remove from the quiz')}</button><button type="button" data-x>${B('إغلاق', 'Close')}</button></div>`;
      mv.hidden = false; mv.style.top = Math.min(innerHeight - mv.offsetHeight - 80, r.bottom + 6) + 'px'; mv.style.left = Math.max(10, Math.min(innerWidth - mv.offsetWidth - 10, r.left + r.width / 2 - mv.offsetWidth / 2)) + 'px';
      mv.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { G.team[u] = +b.dataset.to; G.ref.child('asg/' + u).set(G.team[u]); mv.hidden = true; draw(); keep(); });
      mv.querySelector('[data-rm]').onclick = () => { mv.hidden = true; G.ref.child('pl/' + u).remove(); };
      mv.querySelector('[data-x]').onclick = () => { mv.hidden = true; };
    };
    const count = () => { if (q('#mdN')) { q('#mdN').textContent = Object.keys(G.players).length; go.disabled = !Object.keys(G.players).length; } };
    sub(G.ref.child('pl'), 'child_added', s => {
      const v = s.val() || {}; if (v.w) { G.fans[s.key] = v.n; const f = q('#mdFans'); if (f) f.textContent = Object.keys(G.fans).length ? '' + Object.keys(G.fans).length : ''; return; }
      G.players[s.key] = v.n; if (!(s.key in G.score)) G.score[s.key] = 0; G.streak[s.key] = G.streak[s.key] || 0; if (v.t != null) G.team[s.key] = +v.t;
      draw(); SND.join(); count();
    });
    sub(G.ref.child('pl'), 'child_removed', s => { delete G.players[s.key]; delete G.score[s.key]; draw(); count(); });
    reactions();
    const teamNames = () => {
      const box = q('#mdTn'); tp.querySelector('[data-tmode]').hidden = !G.teams; tp.querySelector('[data-capw]').hidden = !G.teams; tp.querySelector('[data-tnw]').hidden = !G.teams;
      const tip = tp.querySelector('[data-tip]'), md = O.tmode || 'pick'; tip.hidden = !G.teams;
      tip.textContent = md === 'host' ? T('يدخل المشاركون بأسمائهم فقط، ثم تنقر اسم كل واحد في القائمة وتختار فريقه. من لا تختار له فريقًا يُوضع في أصغر فريق عند البدء.', 'Players join with just their names; tap each name in the list and choose a team. Anyone left over goes to the smallest team at the start.')
        : md === 'auto' ? T('يُوزَّع الجميع عشوائيًا وبالتساوي لحظة البدء.', 'Everyone is placed at random, evenly, at the start.')
        : T('يرى كل مشارك أسماء الفرق على جواله ويختار فريقه. وتقدر تنقل أي واحد بالنقر على اسمه.', 'Each player sees the team names and picks one. You can still move anyone by tapping their name.');
      if (!G.teams) { box.innerHTML = ''; return; }
      box.innerHTML = G.teams.map((t, k) => `<label style="--c:var(--qz${k % 6})"><b>${k + 1}</b><input type="text" maxlength="20" data-tn="${k}" value="${esc(t)}" dir="auto" aria-label="team ${k + 1}"></label>`).join('');
      box.querySelectorAll('[data-tn]').forEach(i => i.onchange = () => { G.teams[+i.dataset.tn] = i.value.trim() || TEAMS(G.teams.length)[+i.dataset.tn]; G.ref.child('teams').set(G.teams); draw(); keep(); });
    };
    [set, tp].forEach(P => P.querySelectorAll('[data-o]').forEach(i => i.onchange = () => {
      const k = i.dataset.o;
      if (k === 'teams') { const n = +i.value, d = TEAMS(n), was = G.teams || []; G.teams = n ? d.map((x, j) => was[j] && was[j] !== TEAMS(was.length)[j] ? was[j] : x) : null; G.ref.update({ teams: G.teams, tmode: G.teams ? O.tmode || 'pick' : null }); teamNames(); draw(); }
      else if (k === 'tmode') { O.tmode = i.value; G.ref.child('tmode').set(i.value); teamNames(); }
      else if (k === 'every') O.every = +i.value; else O[k] = i.checked;
      keep();
    }));
    teamNames(); draw();
    q('[data-set]').onclick = () => { tp.hidden = true; set.hidden = !set.hidden; };
    G.el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { phonesMode(b.dataset.mode === 'phones'); lobby(); });
    q('[data-teams]').onclick = () => { set.hidden = true; tp.hidden = !tp.hidden; };
    tp.querySelector('[data-tdone]').onclick = () => { tp.hidden = true; };
    set.querySelector('[data-done]').onclick = () => { set.hidden = true; };
    q('[data-lock]').onchange = e => { G.lockJoin = e.target.checked; G.ref.child('st/lock').set(e.target.checked); };
    go.onclick = () => {
      if (G.phones) G.el.classList.add('started');
      G.lockJoin = !!q('[data-lock]').checked; placeAll(G.opts.tmode === 'auto');
      micSync();
      if (O.shuf && !G.shuffled) { G.shuffled = true; G.quiz = shuffleQuiz(G.quiz); }
      // the golden question falls somewhere in the middle, never first or last
      const n = G.quiz.qs.length; G.gold = O.gold && n >= 4 ? 1 + Math.floor(Math.random() * (n - 2 - (O.final ? 1 : 0))) : -1;
      keep(); next();
    };
  }

  /* ---------- a question ---------- */
  const multOf = i => (G.quiz.qs[i].pts || 0) * (i === G.gold ? 2 : 1) * (G.opts.final && i === G.quiz.qs.length - 1 && G.quiz.qs.length > 1 ? 2 : 1);
  // the place of an item among the real questions (the stage is not counted)
  const qNo = i => G.quiz.qs.slice(0, i + 1).filter(z => z.type !== 'stage').length, qTot = () => G.quiz.qs.filter(z => z.type !== 'stage').length;
  async function next() {
    if (G.stageNext && !G.ended && G.done + 1 <= G.quiz.qs.length) stageNow();
    statFlush(); G.rxc = 0; journey(); if (G.sb && G.sb.length) { G.sb = []; G.ref.child('sb').remove().catch(() => {}); }
    G.i = G.done + 1;
    if (G.i === 0) captains();
    if (G.i === 0) stat({ [srcOf(G.quiz) + '/go']: 1, [srcOf(G.quiz) + '/p']: Object.keys(G.players).length, [G.phones ? 'x/phones' : 'x/screen']: 1, [G.teams ? 'x/teams' : 'x/solo']: 1 });
    // last survivor: alone it ends with one player left; with teams, when only one team still has someone in
    if (G.opts.surv && !G.teams && G.i > 0 && alive().length <= 1) return finish();
    if (G.i >= G.quiz.qs.length) return finish();
    const x = G.quiz.qs[G.i], n = G.quiz.qs.length, m = multOf(G.i), gold = G.i === G.gold, last = G.opts.final && G.i === n - 1 && n > 1;
    // the question is read first, alone and large; then it moves up as the options and the clock appear.
    // The reading time follows its length, so everyone starts answering on equal terms.
    const tag = gold ? `<span class="md-gold">${B('السؤال الذهبي — نقاط مضاعفة', 'The golden question — double points')}</span>` : last ? `<span class="md-x2">${B('السؤال الأخير — نقاط مضاعفة', 'The last question — double points')}</span>` : m === 2 ? `<span class="md-x2">${B('نقاط مضاعفة ×٢', 'Double points ×2')}</span>` : '';
    if (x.type === 'game') return nextGame(x, n, m, gold, last, tag);
    const q = frame(`<div class="md-q md-pre${gold ? ' is-gold' : ''}">
        <div class="md-qtop"><span class="md-qn">${x.type === 'stage' ? '' + B('منصة التصريحات', 'The stage') : `${B('السؤال', 'Question')} ${qNo(G.i)} ${T('من', 'of')} ${qTot()}`}</span>${tag}</div>
        <h2 class="md-qt" dir="auto">${esc(x.q)}</h2>
        <div class="md-mid"><div class="md-clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="md-ring0"/><circle cx="50" cy="50" r="44" class="md-ring" id="mdRing"/></svg><b id="mdT">${x.time}</b></div>
          ${x.img ? (x.reveal ? `<div class="md-pic"><img src="${x.img}" alt=""><div class="md-veil">${veil(x.time)}</div></div>` : `<img class="md-img" src="${x.img}" alt="">`) : '<span></span>'}
          <div class="md-ans"><b id="mdA">0</b><small>${B('أجابوا', 'answered')}</small></div></div>
        ${centre(x)}</div>`,
      `<button type="button" class="btn ghost" data-skip disabled>${B('أنهِ الوقت', 'End time')}</button>`);
    if (gold) SND.gold();
    await G.ref.child('an/' + G.i).remove();
    await G.ref.update({ q: Object.assign({ q: x.q, opts: x.opts, type: x.type, multi: x.ok.length > 1, m, gold, last, bet: !!(G.opts.bet && m && !['poll', 'open', 'stage'].includes(x.type)), pw: !!(G.opts.pw && m && !['poll', 'open', 'stage'].includes(x.type)), i: G.i, n, qn: qNo(G.i), qt: qTot(), L: G.ar ? 'ar' : 'en', img: x.img || null, rv: x.reveal ? x.time : null }, extra(x)), ok: null, wr: null, st: { ph: 'ready', i: G.i, lock: !!G.lockJoin } });
    const words = x.q.trim().split(/\s+/).length, read = Math.min(5, Math.max(2, words / 3)) * 1000 + (gold || last ? 1200 : 0);
    setTimeout(() => open(x, q), read);
  }
  // the picture is covered by tiles that fall away over the answer time, in a random order
  function veil(t) { const d = Array.from({ length: 24 }, (_, k) => k).sort(() => Math.random() - .5); return d.map(k => `<i style="--d:${(k * t * .85 / 24).toFixed(2)}s"></i>`).join(''); }
  // what sits under the question: the options, or a prompt for the text kinds
  function centre(x) {
    if (x.type === 'num') return `<p class="md-prompt">${B('اكتب رقمًا على جوالك', 'Type a number on your phone')}${x.unit ? ` <small>(${esc(x.unit)})</small>` : ''}</p>`;
    if (x.type === 'word') { x._order = x._order || shuffleIdx([...x.ans].map((c, k) => c === ' ' ? -1 : k).filter(k => k >= 0)); return `<p class="md-mask" id="mdW" dir="auto">${mask(x, 0)}</p><p class="md-prompt">${B('خمّن الكلمة واكتبها على جوالك', 'Guess the word and type it on your phone')}</p>`; }
    if (x.type === 'order') { x._sh = x._sh || shuffleIdx(x.items.map((_, k) => k), true); return `<div class="md-order">${x._sh.map((k, j) => `<div class="md-tile" style="--c:var(--qz${j % 6});--d:${j * 80}ms"><i>${LET()[j]}</i><span dir="auto">${esc(x.items[k])}</span></div>`).join('')}</div><p class="md-prompt">${B('رتّبها على جوالك من الأول إلى الأخير', 'Put them in order on your phone, first to last')}</p>`; }
    if (x.type === 'match') { x._mr = x._mr || shuffleIdx(x.pairs.map((_, k) => k), true); return `<div class="md-match"><div>${x.pairs.map((p, j) => `<div class="md-tile" style="--c:var(--qz${j % 6});--d:${j * 80}ms"><i>${j + 1}</i><span dir="auto">${esc(p[0])}</span></div>`).join('')}</div><div>${x._mr.map((k, j) => `<div class="md-tile" style="--c:#6b7393;--d:${(j + x.pairs.length) * 80}ms"><i>${LET()[j]}</i><span dir="auto">${esc(x.pairs[k][1])}</span></div>`).join('')}</div></div><p class="md-prompt">${B('صِل كل عنصر بما يقابله على جوالك', 'Match each item on your phone')}</p>`; }
    if (x.type === 'rapid') return `<p class="md-prompt md-rapid">${B(`${x.items.length} عبارات تظهر على جوالك واحدة بعد أخرى: صح أم خطأ؟ أسرع وأدق!`, `${x.items.length} statements on your phone, one after another: true or false? Fast and right!`)}</p>`;
    if (x.type === 'stage') return `<div class="md-stage" id="mdStage"><p class="md-prompt">${B('اكتب تصريحك من جوالك ويظهر هنا باسمك', 'Write on your phone; it shows here with your name')}</p></div>`;
    if (x.type === 'open') return `<p class="md-prompt">${B('اكتب إجابتك على جوالك', 'Write your answer on your phone')}</p>`;
    return `<div class="md-tiles">${x.opts.map((o, j) => `<div class="md-tile" style="--c:var(--qz${j});--d:${j * 80}ms"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></div>`).join('')}</div>`;
  }
  const shuffleIdx = (a, notSame) => { let r; do { r = a.slice().sort(() => Math.random() - .5); } while (notSame && a.length > 1 && r.every((v, k) => v === a[k])); return r; };
  const mask = (x, n) => [...x.ans].map((c, k) => c === ' ' ? ' ' : x._order.slice(0, n).includes(k) ? c : '_').join('');
  // what phones need for each kind; never the answer itself
  function extra(x) {
    if (x.type === 'num') return { unit: x.unit || '' };
    if (x.type === 'word') return { wl: mask(x, 0) };
    if (x.type === 'order') return { items: x._sh.map(k => x.items[k]) };
    if (x.type === 'match') return { items: x.pairs.map(p => p[0]), opts2: x._mr.map(k => x.pairs[k][1]) };
    if (x.type === 'rapid') return { items: x.items };
    return {};
  }
  // a challenge: the name and how to play, then everyone plays on their phone at once
  async function nextGame(x, n, m, gold, last, tag) {
    const g = MDGames.byId(x.g), nm = G.ar ? g.ar : g.en, how = G.ar ? g.howAr : g.howEn;
    const q = frame(`<div class="md-q md-pre md-gq${gold ? ' is-gold' : ''}">
        <div class="md-qtop"><span class="md-qn">${B('التحدي', 'Challenge')} · ${qNo(G.i)} ${T('من', 'of')} ${qTot()}</span>${tag}</div>
        <h2 class="md-qt"><span class="md-gi">${g.icon}</span> ${esc(nm)}</h2>
        <div class="md-mid"><div class="md-clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="md-ring0"/><circle cx="50" cy="50" r="44" class="md-ring" id="mdRing"/></svg><b id="mdT">${x.time}</b></div>
          <p class="md-how2">${esc(how)}</p>
          <div class="md-ans"><b id="mdA">0</b><small>${B('أنهوا', 'finished')}</small></div></div>
        ${x.g === 'tug' ? tugView(x) : x.g === 'race' ? raceView(x) : (x.g === 'sum' ? (raceView(x), '') : '') + '<div class="md-arena" id="mdArena"></div>'}</div>`,
      `<button type="button" class="btn ghost" data-skip disabled>${B('أنهِ الوقت', 'End time')}</button>`);
    if (gold) SND.gold();
    await G.ref.child('an/' + G.i).remove();
    await G.ref.update({ tg: null, tgp: 0 });
    await G.ref.update({ q: Object.assign({ type: 'game', g: x.g, seed: x.seed || 1, q: nm, opts: [], m, gold, last, i: G.i, n, qn: qNo(G.i), qt: qTot(), L: G.ar ? 'ar' : 'en' }, x.g === 'tug' || x.g === 'race' || x.g === 'sum' ? { ts: x._tug.sides, tn: x._tug.names, tc: x._tug.cols || null } : {}), ok: null, st: { ph: 'ready', i: G.i, lock: !!G.lockJoin } });
    setTimeout(() => open(x, q), 4500 + (gold || last ? 1200 : 0));
  }
  /* ---------- tug of war: two balanced sides; teams stay whole when there are teams ---------- */
  function tugSides() {
    const sides = {}, us = Object.keys(G.players), live = teamTable();
    if (G.teams && live.length >= 2) {
      const load = [0, 0], got = [[], []];
      live.slice().sort((a, b) => b.n - a.n).forEach(t => { const k = load[0] <= load[1] ? 0 : 1; load[k] += t.n; got[k].push(t.name); us.filter(u => G.team[u] === t.k).forEach(u => { sides[u] = k; }); });
      us.forEach(u => { if (sides[u] == null) sides[u] = load[0] <= load[1] ? 0 : 1; });
      const nm = (l, d) => l.length <= 3 ? l.join(' + ') : d;
      return { sides, names: [nm(got[0], T('الفريق الأزرق', 'Blue side')), nm(got[1], T('الفريق الأحمر', 'Red side'))] };
    }
    us.sort(() => Math.random() - .5).forEach((u, k) => { sides[u] = k % 2; });
    return { sides, names: [T('الفريق الأزرق', 'Blue side'), T('الفريق الأحمر', 'Red side')] };
  }
  function tugView(x) {
    x._tug = tugSides(); const c = [0, 1].map(k => Object.values(x._tug.sides).filter(v => v === k).length);
    return `<div class="md-tug"><div class="md-tug-sides"><span>${esc(x._tug.names[0])}<small>${c[0]} ${T('لاعب', 'players')}</small></span><span>${esc(x._tug.names[1])}<small>${c[1]} ${T('لاعب', 'players')}</small></span></div>
      <div class="mg-rope"><i class="a"></i><i class="b"></i><span class="knot" id="mdKnot">🎀</span></div>
      <div class="md-crew"><div class="md-crew-a" id="mdCrewA"></div><div class="md-crew-b" id="mdCrewB"></div></div></div>`;
  }
  // who is pulling: each side's players in order of effort, the strongest nearest the middle, sized by their share
  function crew(x, taps) {
    [0, 1].forEach(k => { const box = G.el.querySelector(k ? '#mdCrewB' : '#mdCrewA'); if (!box) return;
      const us = Object.keys(x._tug.sides).filter(u => x._tug.sides[u] === k).sort((a, b) => (taps[b] || 0) - (taps[a] || 0)), mx = Math.max(1, ...us.map(u => taps[u] || 0));
      box.innerHTML = us.slice(0, 14).map(u => `<span style="--s:${(.75 + .55 * (taps[u] || 0) / mx).toFixed(2)}"><b dir="auto">${esc((G.players[u] || '').slice(0, 12))}</b><i>${taps[u] || 0}</i></span>`).join('') + (us.length > 14 ? `<span class="more">+${us.length - 14}</span>` : ''); });
  }
  /* ---------- the camel race: every team has a lane; the team's average taps moves its camel ---------- */
  const RACE_END = 70;
  function raceSides() {
    const us = Object.keys(G.players), live = teamTable(), sides = {};
    if (G.teams && live.length >= 2) { live.forEach((t, j) => us.filter(u => G.team[u] === t.k).forEach(u => { sides[u] = j; })); us.forEach(u => { if (sides[u] == null) sides[u] = 0; }); return { sides, names: live.map(t => t.name), cols: live.map(t => t.k % 6) }; }
    const n = us.length <= 5 ? 2 : us.length <= 11 ? 3 : 4, names = TEAMS(n);
    us.sort(() => Math.random() - .5).forEach((u, k) => { sides[u] = k % n; });
    return { sides, names, cols: names.map((_, k) => k) };
  }
  const runner = x => x.g === 'sum' ? '<span class="md-sumc"></span>' : '🐪';
  function raceView(x) {
    x._tug = raceSides();
    return `<div class="md-race">${x._tug.names.map((nm, j) => `<div class="md-lane" style="--c:var(--qz${x._tug.cols[j]})"><span class="md-ln" dir="auto">${esc(nm)}</span><i class="md-camel" id="mdCam${j}" style="--p:0%">${runner(x)}</i><b class="md-flag">🏁</b><small id="mdLead${j}"></small></div>`).join('')}</div>`;
  }
  function raceView2(x, avg, raw) {
    const order = avg.map((v, j) => j).sort((a, b) => avg[b] - avg[a]);
    return `<div class="md-race done">${order.map((j, k) => { const mem = Object.keys(x._tug.sides).filter(u => x._tug.sides[u] === j).sort((p, q) => (raw[q] || 0) - (raw[p] || 0));
      return `<div class="md-lane" style="--c:var(--qz${x._tug.cols[j]})"><span class="md-ln" dir="auto">${k + 1}. ${esc(x._tug.names[j])}</span><i class="md-camel" style="--p:${Math.min(100, 100 * avg[j] / (x.g === 'sum' ? 22 : RACE_END))}%">${runner(x)}</i><b class="md-flag">🏁</b><small>${mem.slice(0, 4).map(u => `${esc((G.players[u] || '').slice(0, 12))} ${raw[u] || 0}`).join(' · ')}</small></div>`; }).join('')}</div>`;
  }
  function arena(x, pr, fin) {
    const box = G.el.querySelector('#mdArena'); if (!box) return;
    const us = Object.keys(G.players), best = Math.max(1, ...us.map(u => fin[u] != null ? fin[u] : pr[u] || 0));
    const groups = x.g === 'sum' && x._tug ? x._tug.names.map((n, j) => ({ k: x._tug.cols[j], n, us: us.filter(u => x._tug.sides[u] === j) })) : G.teams && teamTable().length >= 2 ? teamTable().map(t => ({ k: t.k, n: t.name, us: us.filter(u => G.team[u] === t.k) })) : [{ k: 0, n: T('المتسابقون', 'Players'), us }];
    const pos = u => fin[u] != null ? 100 : Math.min(92, Math.round(92 * (pr[u] || 0) / best));
    box.innerHTML = groups.map(gr => { const avg = gr.us.length ? Math.round(gr.us.reduce((a, u) => a + pos(u), 0) / gr.us.length) : 0;
      return `<div class="md-alane" style="--c:var(--qz${gr.k % 6})"><span class="md-aln" dir="auto">${esc(gr.n)}</span>${groups.length > 1 ? `<em class="md-alavg" style="--w:${avg}%"></em>` : ''}<b class="md-afin"></b>
        ${gr.us.slice(0, 24).map((u, j) => `<i class="md-fig${fin[u] != null ? ' done' : ''}" style="--x:${pos(u)}%;--y:${(j % 4) * 22 + 8}%"><span>${esc((G.players[u] || '?').charAt(0))}</span><small dir="auto">${esc((G.players[u] || '').slice(0, 10))}</small></i>`).join('')}</div>`; }).join('');
    // the same picture, small, for the fans on their phones
    if (!arena.t || Date.now() - arena.t > 900) { arena.t = Date.now(); G.ref.child('top/ar').set({ i: G.i, g: groups.map(gr => ({ k: gr.k, n: gr.n, p: gr.us.slice(0, 20).map(u => ({ n: G.players[u] || '', p: pos(u), d: fin[u] != null ? 1 : 0 })) })) }).catch(() => {}); }
  }
  function raceAvg(x, taps) { const n = x._tug.names.length, sum = new Array(n).fill(0), cnt = new Array(n).fill(0); Object.keys(x._tug.sides).forEach(u => { const k = x._tug.sides[u]; cnt[k]++; sum[k] += taps[u] || 0; }); return sum.map((v, k) => cnt[k] ? v / cnt[k] : 0); }
  function raceDraw(x, taps) {
    raceAvg(x, taps).forEach((a, j) => { const c = G.el.querySelector('#mdCam' + j); if (c) c.style.setProperty('--p', Math.min(100, 100 * a / (x.g === 'sum' ? 22 : RACE_END)) + '%');
      const best = Object.keys(x._tug.sides).filter(u => x._tug.sides[u] === j).sort((p, q) => (taps[q] || 0) - (taps[p] || 0))[0], l = G.el.querySelector('#mdLead' + j); if (l) l.textContent = best && taps[best] ? `${(G.players[best] || '').slice(0, 14)} ${taps[best]}` : ''; });
  }
  // average pulls per player on each side; -1 means the first side has it all, 1 the second
  function tugPos(x, taps) {
    const sum = [0, 0], cnt = [0, 0];
    Object.keys(x._tug.sides).forEach(u => { const k = x._tug.sides[u]; cnt[k]++; sum[k] += taps[u] || 0; });
    const a = sum.map((v, k) => cnt[k] ? v / cnt[k] : 0);
    return { avg: a, p: Math.max(-1, Math.min(1, (a[1] - a[0]) / (a[0] + a[1] + 6))) };
  }
  async function open(x, q) {
    if (!G || !q('[data-skip]')) return;   // the screen moved on before the question opened
    await G.ref.child('st').set({ ph: 'q', i: G.i, t0: TS, dur: x.time, lock: !!G.lockJoin });
    const t0 = (await G.ref.child('st/t0').once('value')).val();
    G.t0 = t0; SND.go();
    const box = q('.md-q'); if (box) box.classList.remove('md-pre');
    q('[data-skip]').disabled = false;
    const ring = q('#mdRing'), C = 2 * Math.PI * 44; ring.style.strokeDasharray = C;
    let got = 0, last = -1;
    sub(G.ref.child('an/' + G.i), 'child_added', () => { got++; const a = q('#mdA'); if (a) a.textContent = got; if (got >= (G.opts.surv && !G.teams ? alive() : Object.keys(G.players)).length) reveal(); });
    q('[data-skip]').onclick = () => reveal();
    if (x.type === 'stage') { let k = 0; sub(G.ref.child('an/' + G.i), 'child_added', s => { const v = s.val() || {}, box = q('#mdStage'); if (!box || typeof v.a !== 'string' || !v.a.trim()) return; const p = box.querySelector('.md-prompt'); if (p) p.remove(); box.insertAdjacentHTML('afterbegin', bubble(G.players[s.key], v.a, k++)); SND.join(); { G.sb = [{ n: G.players[s.key] || '', t: String(v.a).slice(0, 140) }].concat(G.sb || []).slice(0, 12); G.ref.child('sb').set(G.sb).catch(() => {}); } while (box.children.length > 12) box.lastElementChild.remove(); }); }
    if (x.type === 'game' && !['tug', 'race'].includes(x.g)) { const fin = {}; let pr = {};
      sub(G.ref.child('an/' + G.i), 'child_added', a => { fin[a.key] = +(a.val() || {}).a || 0; arena(x, pr, fin); });
      sub(G.ref.child('tg'), 'value', v => { pr = {}; Object.entries(v.val() || {}).forEach(([u, o]) => { pr[u] = +o.c || 0; }); arena(x, pr, fin); }); arena(x, pr, fin); }
    // the camel and number races: the screen draws the lanes, and the phones get each lane's progress to draw their own
    if (x.g === 'race' || x.g === 'sum') { let sentAt = 0; sub(G.ref.child('tg'), 'value', v => { const taps = {}; Object.entries(v.val() || {}).forEach(([u, o]) => { taps[u] = +o.c || 0; }); raceDraw(x, taps);
      if (Date.now() - sentAt > 300) { sentAt = Date.now(); G.ref.child('tgp').set(raceAvg(x, taps).map(a => Math.round(Math.min(100, 100 * a / (x.g === 'sum' ? 22 : RACE_END))))); } }); }
    if (x.g === 'tug') {
      let taps = {}, sentAt = 0;
      sub(G.ref.child('tg'), 'value', v => {
        taps = {}; Object.entries(v.val() || {}).forEach(([u, o]) => { taps[u] = +o.c || 0; });
        const { p } = tugPos(x, taps), k = q('#mdKnot'); if (k) k.style.left = (50 + 42 * p) + '%'; crew(x, taps);
        if (Date.now() - sentAt > 300) { sentAt = Date.now(); G.ref.child('tgp').set(Math.round(p * 100) / 100); }
      });
    }
    clearInterval(G.timer);
    G.timer = setInterval(() => {
      const left = Math.max(0, x.time - (now() - t0) / 1000), s = Math.ceil(left), el = q('#mdT');
      if (!el) return;
      el.textContent = s; ring.style.strokeDashoffset = C * (1 - left / x.time);
      if (x.type === 'word') { const k = Math.min(x._order.length - 1, Math.floor((1 - left / x.time) / .8 * x._order.length)); if (k !== x._shown) { x._shown = k; const w = mask(x, k); const e = q('#mdW'); if (e) e.textContent = w; G.ref.child('wr').set(w); } }
      if (s !== last && s <= 5 && s > 0) SND.tick(); last = s;
      if (left <= 0) { if (x.type === 'game') { clearInterval(G.timer); setTimeout(reveal, 1800); } else reveal(); }
    }, 100);
  }

  /* ---------- the answer, the points ---------- */
  async function reveal() {
    if (!G || G.revealing === G.i) return; G.revealing = G.i;
    clearInterval(G.timer);
    const x = G.quiz.qs[G.i], m = multOf(G.i);
    await G.ref.child('st').update({ ph: 'rev' });
    G.subs.forEach(f => f()); G.subs = [];
    keepPlayers(); reactions();
    const ans = (await G.ref.child('an/' + G.i).once('value')).val() || {};
    G.lastAns = ans; fanAsks(ans);
    G.sp = { k: x.type === 'game' ? 'g_' + KEY(x.g) : 't_' + KEY(x.type), p: Object.keys(G.players).length, a: Object.keys(ans).filter(u => u in G.players).length };
    if (G.phones) phonesResult(x, ans);
    G.pws = {}; Object.keys(ans).forEach(u => { const a = ans[u]; if (a && a.p && G.opts.pw && u in G.players) { G.pws[u] = a; if (/sk/.test(a.p)) delete ans[u]; } });
    if (G.opts.surv) Object.keys(ans).forEach(u => { if (G.out[u] != null) delete ans[u]; });
    if (x.type === 'game') return revealGame(x, m, ans);
    if (['num', 'word', 'order', 'open', 'poll', 'match', 'rapid', 'stage'].includes(x.type)) return revealText(x, m, ans);
    const counts = x.opts.map(() => 0), okSet = new Set(x.ok), sc = {};
    let right = 0;
    const before = Object.keys(G.score).sort(byRank); G.prev = {}; before.forEach((u, k) => { G.prev[u] = k + 1; });
    Object.keys(G.players).forEach(u => {
      const a = ans[u], pick = a ? [].concat(a.a).map(Number) : [];
      pick.forEach(j => { if (counts[j] != null) counts[j]++; });
      const correct = !!a && pick.length === okSet.size && pick.every(j => okSet.has(j));
      let d = 0;
      if (correct) {
        right++; G.streak[u] = (G.streak[u] || 0) + 1;
        if (m) { const dt = Math.max(0, Math.min(x.time, (a.t - G.t0) / 1000)); d = Math.round(1000 * m * (G.opts.speed ? 1 - dt / x.time / 2 : 1)); }
      } else G.streak[u] = 0;
      // a bet adds or takes away a fixed amount
      const bet = !!(a && a.b && G.opts.bet && m);
      if (bet) d += (correct ? 1 : -1) * 300 * m;
      G.score[u] = Math.max(0, (G.score[u] || 0) + d); G.qp[u] = Math.max(0, (G.qp[u] || 0) + d);
      sc[u] = { s: G.score[u], d, c: correct, k: G.streak[u], a: !!a, b: bet };
    });
    // ranks after this question, how far each player is behind the one above, and the team standing
    powers(sc, x);
    const order = Object.keys(sc).sort(byRank), tt = teamTable();
    order.forEach((u, k) => {
      sc[u].r = k + 1; sc[u].of = order.length;
      if (k) { sc[u].gap = G.score[order[k - 1]] - G.score[u]; sc[u].above = G.players[order[k - 1]] || ''; }
      if (G.teams && G.team[u] != null) { const r = tt.findIndex(t => t.k === G.team[u]); sc[u].t = G.team[u]; sc[u].tr = r + 1; }
    });
    nbrs(sc); G.done = G.i; keep();
    survive(x, sc);
    Object.values(sc).forEach(v => { v.q = G.i; });
    await G.ref.update({ ok: x.ok, sc });
    SND.reveal();
    const max = Math.max(1, ...counts), n = G.quiz.qs.length, lastQ = G.i === n - 1;
    // the ranking shows at the chosen rhythm, and always before the final question when it is worth double
    const showBoard = !lastQ && ((G.opts.every && (G.i + 1) % G.opts.every === 0) || (G.opts.final && G.i === n - 2 && n > 2));
    const q = frame(`<div class="md-q md-rev">
        <h2 class="md-qt" dir="auto">${esc(x.q)}</h2>
        <div class="md-bars">${x.opts.map((o, j) => `<div class="md-bar${okSet.has(j) ? ' ok' : ''}" style="--c:var(--qz${j});--h:${Math.round(100 * counts[j] / max)}%"><b>${counts[j]}</b><span class="md-col"></span><i>${LET()[j]}${okSet.has(j) ? ' ✓' : ''}</i></div>`).join('')}</div>
        <div class="md-tiles">${x.opts.map((o, j) => `<div class="md-tile${okSet.has(j) ? ' right' : ' wrong'}" style="--c:var(--qz${j})"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span>${okSet.has(j) ? '<b>✓</b>' : ''}</div>`).join('')}</div>
        <p class="md-stat">${B(`أجاب إجابة صحيحة ${right} من ${Object.keys(G.players).length}`, `${right} of ${Object.keys(G.players).length} answered correctly`)}</p></div>`,
      `<button type="button" class="btn solid" data-next>${lastQ ? B('النتيجة النهائية', 'Final results') : showBoard ? B('الترتيب', 'Ranking') : B('السؤال التالي', 'Next question')}</button>`, true);
    q('[data-next]').onclick = () => lastQ && !G.stageNext ? finish() : showBoard && !lastQ ? board() : next();
  }
  // Arabic answers match whatever the hamza, taa marbuta or alif maqsura
  const normW = s => String(s || '').trim().toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\s+/g, ' ');
  async function revealText(x, m, ans) {
    const sc = {}, us = Object.keys(G.players), N = us.length;
    const before = Object.keys(G.score).sort(byRank); G.prev = {}; before.forEach((u, k) => { G.prev[u] = k + 1; });
    const speed = a => Math.round(1000 * m * (G.opts.speed ? 1 - Math.max(0, Math.min(x.time, (a.t - G.t0) / 1000)) / x.time / 2 : 1));
    let body = '', right = 0;
    if (x.type === 'num') {
      const got = us.filter(u => ans[u] && !isNaN(+ans[u].a)).sort((a, b) => Math.abs(+ans[a].a - x.ans) - Math.abs(+ans[b].a - x.ans) || ans[a].t - ans[b].t);
      const best = got.length ? Math.abs(+ans[got[0]].a - x.ans) : 0;
      got.forEach((u, k) => { const df = Math.abs(+ans[u].a - x.ans), c = df === best || df <= Math.abs(x.ans) * .05; sc[u] = { c, d: m ? Math.round(1000 * m * Math.max(.1, 1 - k / Math.max(1, got.length))) : 0, g: +ans[u].a, a: true }; if (c) right++; });
      body = `<p class="md-big">${esc(x.ans)} ${esc(x.unit || '')}</p><ol class="md-near">${got.slice(0, 5).map(u => `<li><span dir="auto">${esc(G.players[u])}</span><em>${esc(ans[u].a)}</em><small>${+ans[u].a === x.ans ? '' : (+ans[u].a > x.ans ? '+' : '−') + Math.abs(+ans[u].a - x.ans)}</small></li>`).join('')}</ol>`;
    } else if (x.type === 'word' || x.type === 'order') {
      const fast = [];
      us.forEach(u => { const a = ans[u]; if (!a) return; const c = x.type === 'word' ? normW(a.a) === normW(x.ans) : JSON.stringify([].concat(a.a).map(k => x._sh[k])) === JSON.stringify(x.items.map((_, k) => k)); sc[u] = { c, d: c && m ? speed(a) : 0, a: true }; if (c) { right++; fast.push(u); } });
      fast.sort((a, b) => ans[a].t - ans[b].t);
      body = x.type === 'word' ? `<p class="md-big" dir="auto">${esc(x.ans)}</p>` : `<ol class="md-near md-ord">${x.items.map(v => `<li><span dir="auto">${esc(v)}</span></li>`).join('')}</ol>`;
      body += fast.length ? `<p class="md-stat">${B('الأسرع', 'Fastest')}: ${fast.slice(0, 3).map(u => esc(G.players[u])).join('، ')}</p>` : '';
    } else if (x.type === 'match' || x.type === 'rapid') {
      // a share of the points for each right link or statement, still faster is better
      const n = x.type === 'match' ? x.pairs.length : x.items.length, per = new Array(n).fill(0), full = [];
      us.forEach(u => { const a = ans[u]; if (!a) return; const v = [].concat(a.a);
        const hits = x.type === 'match' ? x.pairs.map((_, j) => x._mr[v[j]] === j) : x.truth.map((t, j) => v[j] === (t ? 1 : 0));
        hits.forEach((h, j) => { if (h) per[j]++; }); const k = hits.filter(Boolean).length;
        const c = x.type === 'match' ? k === n : k / n >= .7; // a rapid round is worth 200 points a statement (1000 at least); a match, like any question, 1000
        const worth = x.type === 'rapid' ? Math.max(1, n / 5) : 1;
        sc[u] = { c, d: m && k ? Math.round(speed(a) * worth * k / n) : 0, a: true, g: k, n }; if (k === n) full.push(u); if (c) right++; });
      full.sort((a, b) => ans[a].t - ans[b].t);
      body = x.type === 'match' ? `<div class="md-pairs">${x.pairs.map((p, j) => `<div><span dir="auto">${esc(p[0])}</span><i>↔</i><span dir="auto">${esc(p[1])}</span><small>${Math.round(100 * per[j] / Math.max(1, Object.keys(ans).length))}%</small></div>`).join('')}</div>`
        : `<ol class="md-rlist${x.items.length > 8 ? ' many' : ''}">${x.items.map((v, j) => `<li class="${x.truth[j] ? 't' : 'f'}"><b>${x.truth[j] ? T('صح', 'True') : T('خطأ', 'False')}</b><span dir="auto">${esc(v)}</span><small>${Math.round(100 * per[j] / Math.max(1, Object.keys(ans).length))}%</small></li>`).join('')}</ol>`;
      body += full.length ? `<p class="md-stat">${B('العلامة الكاملة', 'Full marks')}: ${full.slice(0, 3).map(u => esc(G.players[u])).join('، ')}</p>` : '';
    } else if (x.type === 'stage') {
      const said = us.filter(u => ans[u] && typeof ans[u].a === 'string' && ans[u].a.trim()).sort((a, b) => ans[a].t - ans[b].t);
      said.forEach(u => { sc[u] = { c: true, d: 0, a: true }; });
      body = `<div class="md-wall">${said.map((u, k) => bubble(G.players[u], ans[u].a, k)).join('')}</div>`;
    } else if (x.type === 'open') {
      const cnt = {}; us.forEach(u => { const a = ans[u]; if (!a || typeof a.a !== 'string') return; const w = a.a.trim().slice(0, 40); if (!w) return; const k = normW(w); cnt[k] = cnt[k] || { w, n: 0 }; cnt[k].n++; sc[u] = { c: true, d: 0, a: true }; });
      const list = Object.values(cnt).sort((a, b) => b.n - a.n).slice(0, 40), mx = Math.max(1, ...list.map(v => v.n));
      body = `<div class="md-cloud">${list.sort(() => Math.random() - .5).map((v, k) => `<span dir="auto" style="--s:${(1 + 1.6 * v.n / mx).toFixed(2)};--c:var(--qz${k % 6})" title="${v.n}">${esc(v.w)}</span>`).join('')}</div>`;
    } else { // poll
      const counts = x.opts.map(() => 0); us.forEach(u => { const a = ans[u]; if (a) { [].concat(a.a).forEach(j => { if (counts[j] != null) counts[j]++; }); sc[u] = { c: true, d: 0, a: true }; } });
      const tot = Math.max(1, counts.reduce((a, b) => a + b, 0)), max = Math.max(1, ...counts);
      body = `<div class="md-bars">${x.opts.map((o, j) => `<div class="md-bar ok" style="--c:var(--qz${j});--h:${Math.round(100 * counts[j] / max)}%"><b>${Math.round(100 * counts[j] / tot)}%</b><span class="md-col"></span><i>${LET()[j]}</i></div>`).join('')}</div><div class="md-tiles">${x.opts.map((o, j) => `<div class="md-tile" style="--c:var(--qz${j})"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></div>`).join('')}</div>`;
    }
    us.forEach(u => {
      const r = sc[u] || { c: false, d: 0, a: !!ans[u] };
      if (!['open', 'poll', 'stage'].includes(x.type)) G.streak[u] = r.c ? (G.streak[u] || 0) + 1 : 0;
      const bet = !!(ans[u] && ans[u].b && G.opts.bet && m && !['open', 'poll', 'stage'].includes(x.type));
      if (bet) r.d += (r.c ? 1 : -1) * 300 * m;
      G.score[u] = Math.max(0, (G.score[u] || 0) + r.d); G.qp[u] = Math.max(0, (G.qp[u] || 0) + r.d);
      sc[u] = Object.assign(r, { s: G.score[u], k: G.streak[u] || 0, b: bet });
    });
    powers(sc, x);
    const order = us.slice().sort(byRank), tt = teamTable();
    order.forEach((u, k) => { sc[u].r = k + 1; sc[u].of = order.length; if (k) { sc[u].gap = G.score[order[k - 1]] - G.score[u]; sc[u].above = G.players[order[k - 1]] || ''; } if (G.teams && G.team[u] != null) { sc[u].t = G.team[u]; sc[u].tr = tt.findIndex(t => t.k === G.team[u]) + 1; } });
    nbrs(sc); G.done = G.i; keep();
    survive(x, sc);
    Object.values(sc).forEach(v => { v.q = G.i; });
    await G.ref.update({ ok: x.type === 'num' || x.type === 'word' ? String(x.ans) : x.type === 'order' ? x.items : x.type === 'match' ? x.pairs.map(p => p[0] + ' ↔ ' + p[1]) : x.type === 'rapid' ? x.truth.map(t => t ? 1 : 0) : 'x', sc });
    SND.reveal();
    const n = G.quiz.qs.length, lastQ = G.i === n - 1, showBoard = !lastQ && ((G.opts.every && (G.i + 1) % G.opts.every === 0) || (G.opts.final && G.i === n - 2 && n > 2));
    const q = frame(`<div class="md-q md-rev md-tx"><h2 class="md-qt" dir="auto">${esc(x.q)}</h2>${body}
        ${['open', 'poll', 'stage'].includes(x.type) ? `<p class="md-stat">${B(`شارك ${Object.keys(ans).length} من ${N}`, `${Object.keys(ans).length} of ${N} took part`)}</p>` : `<p class="md-stat">${x.type === 'match' ? B(`وصّل الكل صحيحًا ${right} من ${N}`, `${right} of ${N} matched all`) : x.type === 'rapid' ? B(`أصاب ٧٠٪ فأكثر ${right} من ${N}`, `${right} of ${N} got 70% or more`) : B(`${x.type === 'num' ? 'الأقرب' : 'أصاب'} ${right} من ${N}`, `${right} of ${N} ${x.type === 'num' ? 'closest' : 'right'}`)}</p>`}</div>`,
      `<button type="button" class="btn solid" data-next>${lastQ ? B('النتيجة النهائية', 'Final results') : showBoard ? B('الترتيب', 'Ranking') : B('التالي', 'Next')}</button>`, true);
    q('.md-cloud') && q('.md-cloud').querySelectorAll('span').forEach(e => e.onclick = () => e.remove());
    q('[data-next]').onclick = () => lastQ && !G.stageNext ? finish() : showBoard && !lastQ ? board() : next();
  }
  async function revealGame(x, m, ans) {
    const g = MDGames.byId(x.g), sc = {}, raw = {};
    const before = Object.keys(G.score).sort(byRank); G.prev = {}; before.forEach((u, k) => { G.prev[u] = k + 1; });
    Object.keys(G.players).forEach(u => { const a = ans[u]; raw[u] = a ? Math.max(0, Number(a.a) || 0) : 0; });
    const best = Math.max(1, ...Object.values(raw));
    // tug of war: the winning side scores most; the other side still earns a little for its effort
    const tug = x.g === 'tug' && x._tug ? tugPos(x, raw) : null, win = tug ? (tug.avg[0] >= tug.avg[1] ? 0 : 1) : 0;
    const bestOf = k => Math.max(1, ...Object.keys(raw).filter(u => x._tug.sides[u] === k).map(u => raw[u]));
    const race = (x.g === 'race' || x.g === 'sum') && x._tug ? raceAvg(x, raw) : null, place = race ? race.map(v => race.filter(w => w > v).length) : null;
    Object.keys(G.players).forEach(u => {
      const sd = tug ? (x._tug.sides[u] != null ? x._tug.sides[u] : 0) : 0;
      const rp = race ? place[x._tug.sides[u] || 0] : 0, rs = race ? (x._tug.sides[u] || 0) : 0;
      const c = race ? raw[u] > 0 && rp === 0 : tug ? raw[u] > 0 && sd === win : raw[u] > 0;
      const d = !m || !raw[u] ? 0 : race ? Math.round(1000 * m * Math.max(.15, 1 - rp * .3) * (.5 + .5 * raw[u] / bestOf(rs))) : tug ? Math.round(1000 * m * (sd === win ? .5 + .5 * raw[u] / bestOf(sd) : .25 * raw[u] / bestOf(sd))) : Math.round(1000 * m * (.25 + .75 * raw[u] / best));
      G.streak[u] = c ? (G.streak[u] || 0) + 1 : 0;
      G.score[u] = (G.score[u] || 0) + d;
      sc[u] = { s: G.score[u], d, c, k: G.streak[u], a: !!ans[u], g: raw[u] };
      if (tug) sc[u].tw = sd === win;
      if (race) { sc[u].tw = rp === 0; sc[u].rp = rp + 1; }
    });
    powers(sc, x);
    const order = Object.keys(sc).sort(byRank), tt = teamTable();
    order.forEach((u, k) => {
      sc[u].r = k + 1; sc[u].of = order.length;
      if (k) { sc[u].gap = G.score[order[k - 1]] - G.score[u]; sc[u].above = G.players[order[k - 1]] || ''; }
      if (G.teams && G.team[u] != null) { const r = tt.findIndex(t => t.k === G.team[u]); sc[u].t = G.team[u]; sc[u].tr = r + 1; }
    });
    nbrs(sc); G.done = G.i; keep();
    survive(x, sc);
    Object.values(sc).forEach(v => { v.q = G.i; });
    await G.ref.update({ ok: 'game', sc });
    SND.reveal();
    const n = G.quiz.qs.length, lastQ = G.i === n - 1;
    const showBoard = !lastQ && ((G.opts.every && (G.i + 1) % G.opts.every === 0) || (G.opts.final && G.i === n - 2 && n > 2));
    const top = Object.keys(raw).filter(u => u in G.players).sort((a, b) => raw[b] - raw[a]).slice(0, 5);
    const raceRes = race ? `<h2 class="md-tugwin">${B('الأول', 'First:')} ${esc(x._tug.names[place.indexOf(0)])}</h2>${raceView2(x, race, raw)}` : '';
    const q = frame(`<div class="md-lb">${raceRes}${tug ? `<h2 class="md-tugwin">🏆 ${B('فاز', 'Winner:')} ${esc(x._tug.names[win])}</h2><div class="md-tug"><div class="md-tug-sides"><span>${esc(x._tug.names[0])}<small>${T('معدل الشدّات', 'Avg pulls')}: ${Math.round(tug.avg[0])}</small></span><span>${esc(x._tug.names[1])}<small>${T('معدل الشدّات', 'Avg pulls')}: ${Math.round(tug.avg[1])}</small></span></div><div class="mg-rope"><i class="a"></i><i class="b"></i><span class="knot" style="left:${win ? 92 : 8}%">🎀</span></div></div><h3>${B('أقوى الشادّين', 'Strongest pullers')}</h3>` : `<h2>${g.icon} ${B('أبطال التحدي', 'Challenge champions')}: ${esc(G.ar ? g.ar : g.en)}</h2>`}
        <ol>${top.map((u, k) => `<li style="--d:${k * 90}ms"><b>${k + 1}</b><span dir="auto">${esc(G.players[u] || '')}</span><em>${raw[u]}</em><small class="md-plus">+${sc[u].d}</small></li>`).join('')}</ol>
        <p class="md-stat">${B(`شارك ${Object.keys(ans).length} من ${Object.keys(G.players).length}`, `${Object.keys(ans).length} of ${Object.keys(G.players).length} took part`)}</p></div>`,
      `<button type="button" class="btn solid" data-next>${lastQ ? B('النتيجة النهائية', 'Final results') : showBoard ? B('الترتيب', 'Ranking') : B('التالي', 'Next')}</button>`, true);
    q('[data-next]').onclick = () => lastQ && !G.stageNext ? finish() : showBoard && !lastQ ? board() : next();
  }
  function keepPlayers() {
    sub(G.ref.child('pl'), 'child_added', s => { const v = s.val() || {}; if (v.w) { G.fans[s.key] = v.n; return; } if (!(s.key in G.players) || !(s.key in G.score)) { G.players[s.key] = v.n; if (!(s.key in G.score)) G.score[s.key] = 0; if (v.t != null) G.team[s.key] = +v.t; placeAll(); } });
    sub(G.ref.child('pl'), 'child_removed', s => { delete G.players[s.key]; delete G.score[s.key]; });
  }

  /* ---------- ranking: teams, the top five, who climbed most ---------- */
  function board(note) {
    G.ref.child('st').update({ ph: 'lb' });
    const order = Object.keys(G.score).filter(u => u in G.players).sort(byRank), top = order.slice(0, 20), n = G.quiz.qs.length;
    const decisive = G.opts.final && G.done === n - 2 && n > 2;
    let climb = null, best = 0;
    order.forEach((u, k) => { const was = (G.prev || {})[u]; if (was && was - (k + 1) > best) { best = was - (k + 1); climb = u; } });
    const tt = teamTable(), tmax = Math.max(1, ...tt.map(t => t.avg));
    G.ref.child('top').set({ p: top.map(u => ({ n: G.players[u] || '', s: G.score[u], d: (G.lastD || {})[u] || 0, w: (G.prev || {})[u] || 0 })), t: tt.slice(0, 5).map(t => ({ n: t.name, s: t.avg, k: t.k })), d: decisive || null, mic: G.micInfo || null });
    const q = frame(`<div class="md-lb${G.teams ? ' with-teams' : ''}">${note ? `<p class="md-note">${esc(note)}</p>` : ''}
        <h2>${decisive ? B('لحظة الحسم: بقي سؤال واحد بنقاط مضاعفة', 'Decisive moment: one question left, worth double') : B('الترتيب', 'Ranking')}</h2>
        ${G.teams ? `<div class="md-teams">${tt.slice(0, 5).map((t, k) => `<div class="md-team" style="--c:var(--qz${(t.k) % 6});--w:${Math.round(100 * t.avg / tmax)}%;--d:${k * 120}ms"><b>${k + 1}</b><span dir="auto">${esc(t.name)}</span><i></i><em>${t.avg}</em><small class="md-tmem">${Object.keys(G.players).filter(u => G.team[u] === t.k).sort(byRank).slice(0, 4).map((u, j) => `${j + 1}. ${esc(G.players[u] || '')} ${G.score[u] || 0}`).join(' · ')}</small></div>`).join('')}<small>${B('نتيجة الفريق متوسط نقاط أعضائه', 'A team’s score is its members’ average')}</small></div>` : ''}
        <ol class="md-slide${top.length > 8 ? ' many' : ''}" style="--n:${top.length}">${top.map((u, k) => `<li style="--d:${k * 40}ms;--from:${Math.min(top.length, ((G.prev || {})[u] || k + 1)) - 1};--to:${k}" data-mv>${(G.prev || {})[u] && G.prev[u] !== k + 1 ? `<u class="${G.prev[u] > k + 1 ? 'up' : 'dn'}">${G.prev[u] > k + 1 ? '▲' : '▼'}${Math.abs(G.prev[u] - k - 1)}</u>` : ''}${(G.lastD || {})[u] ? `<q>${G.lastD[u] > 0 ? '+' : ''}${G.lastD[u]}</q>` : ''}${G.teams && G.team[u] != null ? `<s style="--c:var(--qz${(G.team[u]) % 6})"></s>` : ''}<b>${k + 1}</b><span dir="auto">${esc(G.players[u] || '')}</span>${decisive && k ? `<small>−${G.score[top[k - 1]] - G.score[u]}</small>` : ''}<em>${G.score[u]}</em>${G.streak[u] >= 3 ? `<i title="${T('إجابات صحيحة متتالية', 'right answers in a row')}">${G.streak[u]}</i>` : ''}</li>`).join('')}</ol>
        ${climb && best >= (order.length >= 6 ? 2 : 1) ? `<p class="md-climb">${B(`⬆ الصاعد: ${esc(G.players[climb])} تقدّم ${best} ${best === 1 ? 'مركزًا' : 'مراكز'}`, `⬆ Riser: ${esc(G.players[climb])} climbed ${best} place${best > 1 ? 's' : ''}`)}</p>` : ''}</div>`,
      `<button type="button" class="btn solid" data-next>${B('السؤال التالي', 'Next question')}</button>`, true);
    q('[data-next]').onclick = next;
    setTimeout(() => G.el.querySelectorAll('[data-mv]').forEach(li => li.classList.add('go')), 900);
  }


  /* ---------- the race replay on the big screen: the top ten, each in a lane, the gaps as the gaps in points ---------- */
  function replayBig(order) {
    const J = G.jr || []; if (J.length < 2) return;
    const us = order.slice(0, 10), max = Math.max(1, ...us.map(u => J[J.length - 1][u] || 0), ...J.flatMap(o => us.map(u => o[u] || 0)));
    const d = document.createElement('div'); d.className = 'md-rpbig';
    d.innerHTML = `<div class="md-rphead"><b id="mdRpQ"></b><button type="button" class="md-cb" data-x>${B('إغلاق', 'Close')}</button></div><div class="md-rptrack">${us.map((u, k) => `<div class="md-rplane"><span class="md-rpn" dir="auto">${esc(G.players[u] || '')}</span><div class="md-rprun"><em class="md-rpf" style="--c:var(--qz${k % 6})" data-u="${u}"><span>${esc((G.players[u] || '?').trim().charAt(0))}</span><small></small></em></div></div>`).join('')}</div>`;
    G.el.appendChild(d);
    const F = [...d.querySelectorAll('.md-rpf')], hd = d.querySelector('#mdRpQ'); let t = -1, tm = null;
    const at = t => {
      const sc = u => t < 0 ? 0 : (J[t][u] || 0), rk = [...us].sort((a, b) => sc(b) - sc(a));
      F.forEach(f => { const u = f.dataset.u, r = rk.indexOf(u) + 1; f.style.left = (100 * sc(u) / max) + '%'; f.querySelector('small').textContent = t < 0 ? '' : r; f.classList.toggle('lead', t >= 0 && r === 1); });
      hd.textContent = t < 0 ? T('انطلق السباق', 'And they are off') : t === J.length - 1 ? T('خط النهاية', 'The finish') : T(`بعد السؤال ${t + 1}`, `After question ${t + 1}`);
    };
    const go = () => { t++; if (t >= J.length) return; at(t); if (t === J.length - 1) SND.drum(); else SND.join(); tm = setTimeout(go, 1500); };
    at(-1); tm = setTimeout(go, 1200);
    d.querySelector('[data-x]').onclick = () => { clearTimeout(tm); d.remove(); };
  }
  /* ---------- the end: the winning team, then the podium from third to first ---------- */
  async function finish() {
    G.ended = true; clearInterval(G.timer); forget();
    statFlush(); stat({ [srcOf(G.quiz) + '/f']: 1 });
    const order = Object.keys(G.score).filter(u => u in G.players).sort(byRank), tt = teamTable();
    journey(); const jr = journeyOut(order), aw = titles(order);
    await G.ref.child('top').set({ jr, aw, p: order.slice(0, 5).map(u => ({ n: G.players[u] || '', s: G.score[u] })), t: tt.slice(0, 5).map(t => ({ n: t.name, s: t.avg, k: t.k })) });
    await G.ref.child('st').set({ ph: 'end', i: G.i, lock: true });
    const p = k => order[k] ? `<div class="md-pod md-p${k + 1}"><span class="md-pn" dir="auto">${esc(G.players[order[k]] || '')}</span><b>${G.score[order[k]]}</b><div class="md-step">${k + 1}</div></div>` : '<div class="md-pod md-empty"></div>';
    const q = frame(`<div class="md-end"><h2>${esc(G.quiz.title || T('ميدان', 'Maydan'))}</h2>
        ${tt.length ? `<p class="md-wteam" style="--c:var(--qz${(tt[0].k) % 6})">${B(`الفريق الفائز: ${esc(tt[0].name)}`, `Winning team: ${esc(tt[0].name)}`)} <em>${tt[0].avg}</em></p>` : ''}
        <div class="md-podium">${p(1)}${p(0)}${p(2)}</div>
        <ol class="md-rest" start="4">${order.slice(3, 10).map(u => `<li><span dir="auto">${esc(G.players[u] || '')}</span><em>${G.score[u]}</em></li>`).join('')}</ol>${aw.length ? `<div class="md-titles">${aw.map((a, k) => `<div class="md-title" style="--d:${k * .35 + 4}s"><b>${B(TITLE[a.k][0], TITLE[a.k][1])}</b><span dir="auto">${esc(a.n)}</span><small>${B(a.ar, a.en)}</small></div>`).join('')}</div>` : ''}</div>`,
      `${(G.jr || []).length > 1 ? `<button type="button" class="btn ghost" data-replay>${B('إعادة السباق', 'Replay the race')}</button>` : ''}<button type="button" class="btn ghost" data-csv>${B('تحميل النتائج', 'Download results')}</button>
       <label class="md-opt md-grade" title="${T('اختياري: تُحسب الدرجة من نقاط ميدان، والأول يأخذ الدرجة كاملة', 'Optional: the grade follows Maydan points; the top player gets full marks')}">${B('مع درجة من', 'with a grade out of')} <input type="number" min="1" max="100" step="1" inputmode="numeric" data-gr placeholder="—"></label>
       ${G.quiz.qs.some(x => x.type === 'game') ? `<label class="md-opt md-grade"><input type="checkbox" data-gq> ${B('من الأسئلة فقط (دون التحديات)', 'from the questions only (no challenges)')}</label>` : ''}`);
    reactions(); SND.drum();
    [3, 2, 1].forEach((k, n) => setTimeout(() => { const e = q(`.md-p${k}`); if (e) e.classList.add('in'); if (k === 1) SND.win(); }, 900 + n * 1300));
    if (q('[data-replay]')) q('[data-replay]').onclick = () => replayBig(order);
    q('[data-csv]').onclick = () => {
      // an optional grade: in proportion to the points, so speed still counts and the top player gets full marks
      // with "questions only", the points from challenges are left out of the grade (but kept in the ranking)
      const out = Math.max(0, Math.min(100, +q('[data-gr]').value || 0)), qo = !!(q('[data-gq]') && q('[data-gq]').checked), pts = u => (qo ? G.qp[u] : G.score[u]) || 0, best = Math.max(1, ...order.map(pts));
      const head = [T('المركز', 'Rank'), T('الاسم', 'Name'), T('النقاط', 'Points')].concat(G.teams ? [T('الفريق', 'Team')] : []).concat(qo ? [T('نقاط الأسئلة', 'Question points')] : []).concat(out ? [qo ? T(`الدرجة من ${out} (الأسئلة فقط)`, `Grade out of ${out} (questions only)`) : T(`الدرجة من ${out}`, `Grade out of ${out}`)] : []);
      const rows = [head].concat(order.map((u, k) => [k + 1, G.players[u] || '', G.score[u]].concat(G.teams ? [G.teams[G.team[u]] || ''] : []).concat(qo ? [G.qp[u] || 0] : []).concat(out ? [Math.round(pts(u) / best * out * 100) / 100] : [])));
      const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (G.quiz.title || 'maydan') + ' - ' + T('النتائج', 'results') + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
    };
  }

  document.addEventListener('keydown', e => { if (!G) return; if (e.key === 'Escape' && !document.fullscreenElement) { if (G.i < 0 || G.ended) close(); } });
  return { start, resume, pending, stat, discard: async () => { const s = pending(); forget(); if (s) { try { await ready(); await db.ref('rooms/' + s.pin).remove(); } catch (e) {} } } };
})();

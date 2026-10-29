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
  const keep = () => { if (!G) return; try { localStorage.setItem(SAVE, JSON.stringify({ pin: G.pin, quiz: G.quiz, i: G.done, score: G.score, streak: G.streak, team: G.team, teams: G.teams, opts: G.opts, gold: G.gold, players: G.players, at: Date.now() })); } catch (e) {} };
  const forget = () => { try { localStorage.removeItem(SAVE); } catch (e) {} };
  function pending() { try { const s = JSON.parse(localStorage.getItem(SAVE) || 'null'); return s && Date.now() - s.at < 7 * 864e5 ? s : null; } catch (e) { return null; } }

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
    G = { ar: /[؀-ۿ]/.test(quiz.qs.map(x => x.q + x.opts.join('')).join('')), pin, quiz, el, ref: db.ref('rooms/' + pin), players: {}, score: {}, streak: {}, team: {}, teams: null, i: -1, done: -1,
      opts: { every: 1, speed: true, gold: true, final: true, bet: false }, gold: -1, timer: null, subs: [] };
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
      Object.assign(G, { score: s.score || {}, streak: s.streak || {}, team: s.team || {}, teams: s.teams || null, opts: s.opts || G.opts, gold: s.gold, players: s.players || {}, i: s.i, done: s.i });
      keepPlayers();
      if (G.i < 0) return lobby();
      await G.ref.child('st').set({ ph: 'lb', i: G.i, lock: true });
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
  function frame(inner, bar, canPause) {
    G.el.innerHTML = `<div class="md-scr">${inner}</div><div class="md-fx" aria-hidden="true"></div><div class="md-ctl">${bar || ''}<span class="md-sp"></span>${canPause ? `<button type="button" class="md-cb" data-pause>${B('إيقاف مؤقت', 'Pause')}</button>` : ''}<button type="button" class="md-cb" data-mute title="${T('الصوت', 'Sound')}">${mute ? '🔇' : '🔊'}</button><button type="button" class="md-cb" data-fs title="${T('ملء الشاشة', 'Full screen')}">⛶</button><button type="button" class="md-cb" data-end>${B('إنهاء', 'End')}</button></div>`;
    const q = s => G.el.querySelector(s);
    q('[data-mute]').onclick = e => { mute = !mute; e.currentTarget.textContent = mute ? '🔇' : '🔊'; };
    q('[data-fs]').onclick = () => document.fullscreenElement ? document.exitFullscreen() : G.el.requestFullscreen && G.el.requestFullscreen();
    q('[data-end]').onclick = () => { if (G.i < 0 || G.ended || confirmEnd()) close(); };
    if (q('[data-pause]')) q('[data-pause]').onclick = pause;
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
      const fx = G && G.el.querySelector('.md-fx'); if (!fx) return;
      const e = document.createElement('span'); e.textContent = v.e; e.style.setProperty('--x', (8 + Math.random() * 84) + '%'); e.style.setProperty('--r', (Math.random() * 40 - 20) + 'deg');
      fx.appendChild(e); setTimeout(() => e.remove(), 2600);
    };
    sub(G.ref.child('rx'), 'child_added', fly); sub(G.ref.child('rx'), 'child_changed', fly);
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
      <div class="md-count"><b id="mdN">0</b> ${B('مشارك', 'players')}</div><div class="md-names" id="mdNames"></div>
      <div class="md-set" id="mdSet" hidden>
        <h3>${B('إعدادات المسابقة', 'Quiz settings')}</h3>
        <label>${B('الفرق', 'Teams')}<select data-o="teams"><option value="0">${T('بلا فرق', 'No teams')}</option>${[2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].map(n => `<option value="${n}"${G.teams && G.teams.length === n ? ' selected' : ''}>${n} ${T('فرق', 'teams')}</option>`).join('')}</select></label>
        <label data-tmode hidden>${B('توزيع المشاركين', 'How players are placed')}<select data-o="tmode"><option value="pick"${G.opts.tmode !== 'auto' ? ' selected' : ''}>${T('يختار كل مشارك فريقه (مثل رقم الطاولة)', 'Each player picks a team (e.g. the table number)')}</option><option value="auto"${G.opts.tmode === 'auto' ? ' selected' : ''}>${T('توزيع عشوائي متوازن عند البدء', 'Random, balanced, at the start')}</option></select></label>
        <div class="md-tn" id="mdTn"></div>
        <label>${B('عرض الترتيب', 'Show the ranking')}<select data-o="every">${[[1, T('بعد كل سؤال', 'After every question')], [3, T('كل ٣ أسئلة', 'Every 3 questions')], [5, T('كل ٥ أسئلة', 'Every 5 questions')], [0, T('في النهاية فقط', 'Only at the end')]].map(([v, l]) => `<option value="${v}"${O.every === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="md-ck"><input type="checkbox" data-o="speed"${O.speed ? ' checked' : ''}> ${B('السرعة تزيد النقاط', 'Speed adds points')}</label>
        <label class="md-ck"><input type="checkbox" data-o="gold"${O.gold ? ' checked' : ''}> ${B('✨ سؤال ذهبي مفاجئ بنقاط مضاعفة', '✨ A surprise golden question with double points')}</label>
        <label class="md-ck"><input type="checkbox" data-o="final"${O.final ? ' checked' : ''}> ${B('🏁 لحظة الحسم: السؤال الأخير بنقاط مضاعفة', '🏁 The final question with double points')}</label>
        <label class="md-ck"><input type="checkbox" data-o="bet"${O.bet ? ' checked' : ''}> ${B('🎯 الثقة: يراهن المشارك على إجابته فيكسب أو يخسر نقاطًا إضافية', '🎯 Confidence: players can bet on their answer to win or lose extra points')}</label>
        <button type="button" class="btn solid" data-done>${B('تم', 'Done')}</button></div>`,
      `<button type="button" class="btn solid md-start" data-go disabled>${B('ابدأ', 'Start')}</button>
       <button type="button" class="md-cb" data-set>⚙ ${B('الإعدادات', 'Settings')}</button>
       <button type="button" class="md-cb" data-share>🔗 ${B('رابط الدخول', 'Join link')}</button>
       <label class="md-opt"><input type="checkbox" data-lock> ${B('إقفال الدخول', 'Lock joining')}</label>`, true);
    q('[data-share]').onclick = async e => {
      const link = url, text = T(`ادخل مسابقة «${G.quiz.title || 'ميدان'}»: `, `Join “${G.quiz.title || 'Maydan'}”: `) + link;
      try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); e.currentTarget.textContent = '✓ ' + T('نُسخ', 'Copied'); } } catch (er) {}
    };
    const names = q('#mdNames'), go = q('[data-go]'), set = q('#mdSet');
    const chip = u => {
      let c = names.querySelector(`[data-u="${u}"]`);
      if (!c) { c = document.createElement('span'); c.className = 'md-chip'; c.dataset.u = u; c.title = T('اضغط لإخراجه', 'Tap to remove'); c.onclick = () => G.ref.child('pl/' + u).remove(); names.appendChild(c); }
      c.textContent = G.players[u]; c.style.setProperty('--tc', G.teams && G.team[u] != null ? `var(--qz${(G.team[u]) % 6})` : 'transparent');
    };
    const count = () => { if (q('#mdN')) { q('#mdN').textContent = Object.keys(G.players).length; go.disabled = !Object.keys(G.players).length; } };
    sub(G.ref.child('pl'), 'child_added', s => {
      const v = s.val() || {}; G.players[s.key] = v.n; if (!(s.key in G.score)) G.score[s.key] = 0; G.streak[s.key] = G.streak[s.key] || 0; if (v.t != null) G.team[s.key] = +v.t;
      chip(s.key); SND.join(); count();
    });
    sub(G.ref.child('pl'), 'child_removed', s => { delete G.players[s.key]; delete G.score[s.key]; const c = names.querySelector(`[data-u="${s.key}"]`); if (c) c.remove(); count(); });
    reactions();
    const teamNames = () => {
      const box = q('#mdTn'), md = set.querySelector('[data-tmode]'); md.hidden = !G.teams; if (!G.teams || G.teams.length > 6) { box.innerHTML = ''; return; }
      box.innerHTML = G.teams.map((t, k) => `<input type="text" maxlength="20" data-tn="${k}" value="${esc(t)}" style="--c:var(--qz${k % 6})" aria-label="team ${k + 1}">`).join('');
      box.querySelectorAll('[data-tn]').forEach(i => i.onchange = () => { G.teams[+i.dataset.tn] = i.value.trim() || TEAMS()[+i.dataset.tn]; G.ref.child('teams').set(G.teams); });
    };
    set.querySelectorAll('[data-o]').forEach(i => i.onchange = () => {
      const k = i.dataset.o;
      if (k === 'teams') { const n = +i.value, d = TEAMS(n); G.teams = n ? d.map((x, j) => (G.teams && G.teams.length === n && G.teams[j]) || x) : null; G.ref.update({ teams: G.teams, tmode: G.teams ? O.tmode || 'pick' : null }); teamNames(); Object.keys(G.players).forEach(chip); }
      else if (k === 'tmode') { O.tmode = i.value; G.ref.child('tmode').set(i.value); }
      else if (k === 'every') O.every = +i.value; else O[k] = i.checked;
      keep();
    });
    teamNames();
    q('[data-set]').onclick = () => { set.hidden = !set.hidden; };
    set.querySelector('[data-done]').onclick = () => { set.hidden = true; };
    q('[data-lock]').onchange = e => G.ref.child('st/lock').set(e.target.checked);
    go.onclick = () => {
      G.ref.child('st/lock').set(true); placeAll(G.opts.tmode === 'auto');
      // the golden question falls somewhere in the middle, never first or last
      const n = G.quiz.qs.length; G.gold = O.gold && n >= 4 ? 1 + Math.floor(Math.random() * (n - 2 - (O.final ? 1 : 0))) : -1;
      keep(); next();
    };
  }

  /* ---------- a question ---------- */
  const multOf = i => (G.quiz.qs[i].pts || 0) * (i === G.gold ? 2 : 1) * (G.opts.final && i === G.quiz.qs.length - 1 && G.quiz.qs.length > 1 ? 2 : 1);
  async function next() {
    G.i = G.done + 1;
    if (G.i >= G.quiz.qs.length) return finish();
    const x = G.quiz.qs[G.i], n = G.quiz.qs.length, m = multOf(G.i), gold = G.i === G.gold, last = G.opts.final && G.i === n - 1 && n > 1;
    // the question is read first, alone and large; then it moves up as the options and the clock appear.
    // The reading time follows its length, so everyone starts answering on equal terms.
    const tag = gold ? `<span class="md-gold">${B('✨ السؤال الذهبي — نقاط مضاعفة', '✨ The golden question — double points')}</span>` : last ? `<span class="md-x2">${B('🏁 السؤال الأخير — نقاط مضاعفة', '🏁 The last question — double points')}</span>` : m === 2 ? `<span class="md-x2">${B('نقاط مضاعفة ×٢', 'Double points ×2')}</span>` : '';
    const q = frame(`<div class="md-q md-pre${gold ? ' is-gold' : ''}">
        <div class="md-qtop"><span class="md-qn">${B('السؤال', 'Question')} ${G.i + 1} ${T('من', 'of')} ${n}</span>${tag}</div>
        <h2 class="md-qt" dir="auto">${esc(x.q)}</h2>
        <div class="md-mid"><div class="md-clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="md-ring0"/><circle cx="50" cy="50" r="44" class="md-ring" id="mdRing"/></svg><b id="mdT">${x.time}</b></div>
          ${x.img ? `<img class="md-img" src="${x.img}" alt="">` : '<span></span>'}
          <div class="md-ans"><b id="mdA">0</b><small>${B('أجابوا', 'answered')}</small></div></div>
        <div class="md-tiles">${x.opts.map((o, j) => `<div class="md-tile" style="--c:var(--qz${j});--d:${j * 80}ms"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></div>`).join('')}</div></div>`,
      `<button type="button" class="btn ghost" data-skip disabled>${B('أنهِ الوقت', 'End time')}</button>`);
    if (gold) SND.gold();
    await G.ref.child('an/' + G.i).remove();
    await G.ref.update({ q: { q: x.q, opts: x.opts, type: x.type, multi: x.ok.length > 1, m, gold, last, bet: !!(G.opts.bet && m), i: G.i, n, L: G.ar ? 'ar' : 'en', img: x.img || null }, ok: null, st: { ph: 'ready', i: G.i, lock: true } });
    const words = x.q.trim().split(/\s+/).length, read = Math.min(5, Math.max(2, words / 3)) * 1000 + (gold || last ? 1200 : 0);
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
    const x = G.quiz.qs[G.i], m = multOf(G.i);
    await G.ref.child('st').update({ ph: 'rev' });
    G.subs.forEach(f => f()); G.subs = [];
    keepPlayers(); reactions();
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
        if (m) { const dt = Math.max(0, Math.min(x.time, (a.t - G.t0) / 1000)); d = Math.round(1000 * m * (G.opts.speed ? 1 - dt / x.time / 2 : 1)); }
      } else G.streak[u] = 0;
      // a bet adds or takes away a fixed amount
      const bet = !!(a && a.b && G.opts.bet && m);
      if (bet) d += (correct ? 1 : -1) * 300 * m;
      G.score[u] = Math.max(0, (G.score[u] || 0) + d);
      sc[u] = { s: G.score[u], d, c: correct, k: G.streak[u], a: !!a, b: bet };
    });
    // ranks after this question, how far each player is behind the one above, and the team standing
    const order = Object.keys(sc).sort((a, b) => G.score[b] - G.score[a]), tt = teamTable();
    order.forEach((u, k) => {
      sc[u].r = k + 1; sc[u].of = order.length;
      if (k) { sc[u].gap = G.score[order[k - 1]] - G.score[u]; sc[u].above = G.players[order[k - 1]] || ''; }
      if (G.teams && G.team[u] != null) { const r = tt.findIndex(t => t.k === G.team[u]); sc[u].t = G.team[u]; sc[u].tr = r + 1; }
    });
    G.done = G.i; keep();
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
    q('[data-next]').onclick = () => lastQ ? finish() : showBoard ? board() : next();
  }
  function keepPlayers() {
    sub(G.ref.child('pl'), 'child_added', s => { const v = s.val() || {}; if (!(s.key in G.players) || !(s.key in G.score)) { G.players[s.key] = v.n; if (!(s.key in G.score)) G.score[s.key] = 0; if (v.t != null) G.team[s.key] = +v.t; placeAll(); } });
    sub(G.ref.child('pl'), 'child_removed', s => { delete G.players[s.key]; delete G.score[s.key]; });
  }

  /* ---------- ranking: teams, the top five, who climbed most ---------- */
  function board(note) {
    G.ref.child('st').update({ ph: 'lb' });
    const order = Object.keys(G.score).filter(u => u in G.players).sort((a, b) => G.score[b] - G.score[a]), top = order.slice(0, 5), n = G.quiz.qs.length;
    const decisive = G.opts.final && G.done === n - 2 && n > 2;
    let climb = null, best = 0;
    order.forEach((u, k) => { const was = (G.prev || {})[u]; if (was && was - (k + 1) > best) { best = was - (k + 1); climb = u; } });
    const tt = teamTable(), tmax = Math.max(1, ...tt.map(t => t.avg));
    G.ref.child('top').set({ p: top.map(u => ({ n: G.players[u] || '', s: G.score[u] })), t: tt.slice(0, 5).map(t => ({ n: t.name, s: t.avg, k: t.k })), d: decisive || null });
    const q = frame(`<div class="md-lb${G.teams ? ' with-teams' : ''}">${note ? `<p class="md-note">${esc(note)}</p>` : ''}
        <h2>${decisive ? B('🏁 لحظة الحسم: بقي سؤال واحد بنقاط مضاعفة', '🏁 Decisive moment: one question left, worth double') : B('الترتيب', 'Ranking')}</h2>
        ${G.teams ? `<div class="md-teams">${tt.slice(0, 5).map((t, k) => `<div class="md-team" style="--c:var(--qz${(t.k) % 6});--w:${Math.round(100 * t.avg / tmax)}%;--d:${k * 120}ms"><b>${k + 1}</b><span dir="auto">${esc(t.name)}</span><i></i><em>${t.avg}</em></div>`).join('')}<small>${B('نتيجة الفريق متوسط نقاط أعضائه', 'A team’s score is its members’ average')}</small></div>` : ''}
        <ol>${top.map((u, k) => `<li style="--d:${k * 90}ms">${G.teams && G.team[u] != null ? `<s style="--c:var(--qz${(G.team[u]) % 6})"></s>` : ''}<b>${k + 1}</b><span dir="auto">${esc(G.players[u] || '')}</span>${decisive && k ? `<small>−${G.score[top[k - 1]] - G.score[u]}</small>` : ''}<em>${G.score[u]}</em>${G.streak[u] >= 3 ? `<i title="${T('إجابات صحيحة متتالية', 'right answers in a row')}">🔥${G.streak[u]}</i>` : ''}</li>`).join('')}</ol>
        ${climb && best >= (order.length >= 6 ? 2 : 1) ? `<p class="md-climb">${B(`⬆ الصاعد: ${esc(G.players[climb])} تقدّم ${best} ${best === 1 ? 'مركزًا' : 'مراكز'}`, `⬆ Riser: ${esc(G.players[climb])} climbed ${best} place${best > 1 ? 's' : ''}`)}</p>` : ''}</div>`,
      `<button type="button" class="btn solid" data-next>${B('السؤال التالي', 'Next question')}</button>`, true);
    q('[data-next]').onclick = next;
  }

  /* ---------- the end: the winning team, then the podium from third to first ---------- */
  async function finish() {
    G.ended = true; clearInterval(G.timer); forget();
    const order = Object.keys(G.score).filter(u => u in G.players).sort((a, b) => G.score[b] - G.score[a]), tt = teamTable();
    await G.ref.child('top').set({ p: order.slice(0, 5).map(u => ({ n: G.players[u] || '', s: G.score[u] })), t: tt.slice(0, 5).map(t => ({ n: t.name, s: t.avg, k: t.k })) });
    await G.ref.child('st').set({ ph: 'end', i: G.i, lock: true });
    const p = k => order[k] ? `<div class="md-pod md-p${k + 1}"><span class="md-pn" dir="auto">${esc(G.players[order[k]] || '')}</span><b>${G.score[order[k]]}</b><div class="md-step">${k + 1}</div></div>` : '<div class="md-pod md-empty"></div>';
    const q = frame(`<div class="md-end"><h2>${esc(G.quiz.title || T('ميدان', 'Maydan'))}</h2>
        ${tt.length ? `<p class="md-wteam" style="--c:var(--qz${(tt[0].k) % 6})">${B(`🏆 الفريق الفائز: ${esc(tt[0].name)}`, `🏆 Winning team: ${esc(tt[0].name)}`)} <em>${tt[0].avg}</em></p>` : ''}
        <div class="md-podium">${p(1)}${p(0)}${p(2)}</div>
        <ol class="md-rest" start="4">${order.slice(3, 10).map(u => `<li><span dir="auto">${esc(G.players[u] || '')}</span><em>${G.score[u]}</em></li>`).join('')}</ol></div>`,
      `<button type="button" class="btn ghost" data-csv>${B('تحميل النتائج', 'Download results')}</button>`);
    reactions(); SND.drum();
    [3, 2, 1].forEach((k, n) => setTimeout(() => { const e = q(`.md-p${k}`); if (e) e.classList.add('in'); if (k === 1) SND.win(); }, 900 + n * 1300));
    q('[data-csv]').onclick = () => {
      const head = [T('المركز', 'Rank'), T('الاسم', 'Name'), T('النقاط', 'Points')].concat(G.teams ? [T('الفريق', 'Team')] : []);
      const rows = [head].concat(order.map((u, k) => [k + 1, G.players[u] || '', G.score[u]].concat(G.teams ? [G.teams[G.team[u]] || ''] : [])));
      const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (G.quiz.title || 'maydan') + ' - ' + T('النتائج', 'results') + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
    };
  }

  document.addEventListener('keydown', e => { if (!G) return; if (e.key === 'Escape' && !document.fullscreenElement) { if (G.i < 0 || G.ended) close(); } });
  return { start, resume, pending, discard: async () => { const s = pending(); forget(); if (s) { try { await ready(); await db.ref('rooms/' + s.pin).remove(); } catch (e) {} } } };
})();

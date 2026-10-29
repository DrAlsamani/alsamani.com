/* alsamani.com/m — a player's phone in Maydan: enter the code, pick a name, answer, see how you did. */
(function () {
  const root = document.getElementById('mp');
  if (!root) return;
  const CFG = window.MD_CFG;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LET = () => (Q && Q.L ? Q.L === 'ar' : isAr()) ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const store = { get(k, d) { try { return localStorage.getItem('md.' + k) || d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('md.' + k, v); } catch (e) {} } };
  const TS = firebase.database.ServerValue.TIMESTAMP;
  let TOP = null, TEAMS = null, TMODE = 'pick', myTeam = null, bet = false, lastRx = 0;
  let db, uid, off = 0, R = null, me = null, st = {}, Q = null, OK = null, SC = null, sent = null, tick = null;
  const now = () => Date.now() + off;
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  async function ready() {
    if (db) return;
    firebase.initializeApp(CFG);
    uid = (firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user).uid;
    db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }

  /* ---------- the code and the name ---------- */
  function codeScreen(err) {
    const p = new URLSearchParams(location.search).get('p') || '';
    root.innerHTML = `<div class="mp-card"><div class="mp-logo">${window.MD_MARK || ''}<b>${B('ميدان', 'Maydan')}</b></div>
      <label class="mp-l">${B('رمز المسابقة', 'Quiz code')}<input id="mpPin" inputmode="numeric" autocomplete="off" maxlength="7" dir="ltr" placeholder="123 456" value="${esc(p)}"></label>
      <p class="mp-err" ${err ? '' : 'hidden'}>${err || ''}</p>
      <button type="button" class="btn solid mp-go" id="mpGo">${B('دخول', 'Enter')}</button></div>`;
    const inp = root.querySelector('#mpPin'), go = root.querySelector('#mpGo');
    inp.oninput = () => { inp.value = inp.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^\d ]/g, ''); };
    inp.onkeydown = e => { if (e.key === 'Enter') go.click(); };
    go.onclick = async () => {
      const pin = inp.value.replace(/\D/g, '');
      if (pin.length !== 6) return codeScreen(T('الرمز ستة أرقام.', 'The code has six digits.'));
      go.disabled = true;
      try {
        await ready();
        const s = await db.ref('rooms/' + pin + '/st').once('value');
        if (!s.exists()) return codeScreen(T('لا توجد مسابقة بهذا الرمز. تأكد منه على الشاشة.', 'No quiz with this code. Check it on the screen.'));
        R = db.ref('rooms/' + pin);
        const mine = (await R.child('pl/' + uid).once('value')).val();
        if (mine) { me = mine.n; return play(); }
        if (s.val().lock) return codeScreen(T('أُقفل الدخول إلى هذه المسابقة.', 'This quiz is closed to new players.'));
        R.child('tmode').on('value', t => { TMODE = t.val() || 'pick'; const box = root.querySelector('#mpTeams'); if (box) teamPick(box); });
        R.child('teams').on('value', t => { TEAMS = t.val(); const box = root.querySelector('#mpTeams'); if (box) teamPick(box); });
        nameScreen();
      } catch (e) { codeScreen(T('تعذّر الاتصال. تأكد من الإنترنت.', 'Could not connect. Check the internet.')); }
    };
    if (p.replace(/\D/g, '').length === 6 && !err) setTimeout(() => go.click(), 50);
  }
  function nameScreen(err) {
    root.innerHTML = `<div class="mp-card"><div class="mp-logo">${window.MD_MARK || ''}<b>${B('ميدان', 'Maydan')}</b></div>
      <label class="mp-l">${B('اسمك أو لقبك', 'Your name or nickname')}<input id="mpName" maxlength="24" autocomplete="nickname" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <div id="mpTeams" class="mp-teams"></div>
      <p class="mp-err" ${err ? '' : 'hidden'}>${err || ''}</p>
      <button type="button" class="btn solid mp-go" id="mpGo">${B('ادخل الميدان', 'Join')}</button></div>`;
    const inp = root.querySelector('#mpName'), go = root.querySelector('#mpGo');
    teamPick(root.querySelector('#mpTeams'));
    inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') go.click(); };
    go.onclick = async () => {
      const n = inp.value.trim().replace(/\s+/g, ' ').slice(0, 24);
      if (!n) return nameScreen(T('اكتب اسمًا يظهر على الشاشة.', 'Type a name to show on the screen.'));
      if (TEAMS && TMODE === 'pick' && myTeam == null) { const e = root.querySelector('.mp-err'); e.hidden = false; e.textContent = T('اختر فريقك.', 'Choose your team.'); return; }
      go.disabled = true;
      try { await R.child('pl/' + uid).set(Object.assign({ n, at: TS }, TEAMS && myTeam != null ? { t: myTeam } : {})); me = n; store.set('name', n); play(); }
      catch (e) { nameScreen(T('تعذّر الدخول؛ ربما أُقفلت المسابقة.', 'Could not join; the quiz may be closed.')); }
    };
  }

  function teamPick(box) {
    if (!box) return;
    if (!TEAMS || TMODE !== 'pick') { box.innerHTML = TEAMS ? `<p>${TMODE === 'host' ? B('سيضعك المشرف في فريقك.', 'The host will put you in your team.') : B('سيُوزَّع المشاركون على الفرق عند البدء', 'Players will be placed in teams at the start')}</p>` : ''; myTeam = null; return; }
    box.className = 'mp-teams' + (TEAMS.length > 6 ? ' many' : ''); box.innerHTML = `<p>${B('اختر فريقك', 'Choose your team')}</p>` + TEAMS.map((t, k) => `<button type="button" data-t="${k}" style="--c:var(--qz${k % 6})" aria-pressed="${myTeam === k}">${esc(t)}</button>`).join('');
    box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { myTeam = +b.dataset.t; box.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  }
  // a row of reactions that float up the big screen
  const RX = ['👏', '🔥', '😂', '😮', '💪', '❤️'];
  const rxBar = () => `<div class="mp-rx">${RX.map(e => `<button type="button" data-rx="${e}">${e}</button>`).join('')}</div>`;
  function rxBind() {
    root.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => {
      if (Date.now() - lastRx < 900) return; lastRx = Date.now();
      R.child('rx/' + uid).set({ e: b.dataset.rx, t: TS }).catch(() => {}); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); buzz(15);
    });
  }

  /* ---------- the game: follow the room and draw what this phone should show ---------- */
  function play() {
    R.child('st').on('value', s => { st = s.val() || {}; if (!s.exists()) return gone(); draw(); });
    R.child('q').on('value', s => { Q = s.val(); });
    R.child('teams').on('value', t => { TEAMS = t.val(); });
    R.child('pl/' + uid + '/t').once('value', t => { if (t.val() != null) myTeam = +t.val(); });
    R.child('asg/' + uid).on('value', t => { if (t.val() != null) { myTeam = +t.val(); shown = ''; draw(); } });
    R.child('ok').on('value', s => { OK = s.val(); draw(); });
    R.child('wr').on('value', s => { const e = root.querySelector('#mpW'); if (e && s.val()) e.textContent = s.val(); });
    R.child('top').on('value', s => { TOP = s.val(); if (st.ph === 'lb' || st.ph === 'end') { shown = ''; draw(); } });
    R.child('sc/' + uid).on('value', s => { SC = s.val(); draw(); });
    R.child('pl/' + uid).on('value', s => { if (!s.exists() && me) kicked(); });
  }
  let shown = '';
  function draw() {
    const key = st.ph + ':' + st.i + ':' + (st.ph === 'rev' || st.ph === 'lb' || st.ph === 'end' ? JSON.stringify(SC) + (OK ? 'k' : '') + (TOP ? JSON.stringify(TOP).length : '') : '');
    if (key === shown) return; shown = key;
    clearInterval(tick);
    if (st.ph === 'lobby') return screen(`<div class="mp-wait"><p class="mp-big">${B('أنت في الميدان!', 'You are in!')}</p><p class="mp-me" dir="auto">${esc(me)}</p>${TEAMS && myTeam != null ? `<p class="mp-tm" style="--c:var(--qz${(myTeam) % 6})">${esc(TEAMS[myTeam])}</p>` : ''}<p>${B('انظر إلى الشاشة؛ ستبدأ المسابقة قريبًا.', 'Watch the screen; the quiz will start soon.')}</p></div>` + rxBar());
    if (st.ph === 'pause') return screen(`<div class="mp-wait"><p class="mp-big">⏸</p><p class="mp-big">${B('توقفت المسابقة مؤقتًا', 'The quiz is paused')}</p><p>${B('ابقَ على هذه الصفحة؛ ستُستأنف من حيث توقفت.', 'Stay on this page; it will continue where it stopped.')}</p></div>`);
    if (st.ph === 'ready') { if (!Q || Q.i !== st.i) { shown = ''; setTimeout(draw, 200); return; } bet = false; const gm = Q.type === 'game' && window.MDGames ? MDGames.byId(Q.g) : null; return screen(`<div class="mp-wait${Q.gold ? ' gold' : ''}"><p>${B('استعد…', 'Get ready…')}</p><p class="mp-big">${gm ? `${gm.icon} ${Q.L === 'en' ? gm.en : gm.ar}` : B('السؤال', 'Question') + ' ' + ((st.i || 0) + 1)}</p>${gm ? `<p class="mp-how">${Q.L === 'en' ? gm.howEn : gm.howAr}</p>` : ''}${Q.gold ? `<p class="mp-gold">${B('✨ السؤال الذهبي! نقاط مضاعفة', '✨ The golden question! Double points')}</p>` : Q.last ? `<p class="mp-gold">${B('🏁 السؤال الأخير — نقاط مضاعفة', '🏁 The last question — double points')}</p>` : ''}</div>`); }
    // last survivor: once out, a player watches the rest
    if (st.ph === 'q' && SC && SC.out && SC.q != null && SC.q < st.i) return screen(`<div class="mp-wait"><p class="mp-sym">👀</p><p class="mp-big">${B('أنت الآن متفرج', 'You are watching now')}</p><p>${B('خرجت من المنافسة؛ تابع الأسئلة على الشاشة وشجّع الناجين.', 'You are out of the race; follow along on the screen and cheer for those still in.')}</p><p class="mp-rank">${B(`الناجون: ${SC.left}`, `Still in: ${SC.left}`)}</p></div>` + rxBar());
    if (st.ph === 'q') return question();
    if (st.ph === 'rev' || st.ph === 'lb') return result();
    if (st.ph === 'end') return final();
  }
  function screen(html, cls) {
    if (SC && SC.left != null && SC.q === st.i && st.ph === 'rev') html = (SC.out ? `<p class="mp-surv out">🏳 ${B('خرجت من المنافسة، وتكمل متفرجًا', 'You are out; keep watching')}</p>` : `<p class="mp-surv">🏆 ${B(`ما زلت في المنافسة · الناجون: ${SC.left}`, `Still in · ${SC.left} left`)}</p>`) + html;
    root.innerHTML = `<div class="mp-play ${cls || ''}"><div class="mp-top"><span dir="auto">${esc(me)}${TEAMS && myTeam != null ? ` <i style="--c:var(--qz${(myTeam) % 6})">${esc(TEAMS[myTeam])}</i>` : ''}</span><b>${SC ? SC.s : 0}</b></div>${html}</div>`; if (R) rxBind(); }
  let game = null;
  function playGame() {
    if (sent === st.i) return screen(`<div class="mp-wait"><p class="mp-big">${B('أنهيت التحدي!', 'Challenge done!')}</p><p>${B('بانتظار البقية…', 'Waiting for the others…')}</p></div>`);
    screen(`<div class="mp-q mp-gq"><div class="mp-bar"><i id="mpBar"></i></div><div class="mp-gbox" id="mpG"></div></div>`, 'q');
    let send = async score => {
      if (sent === st.i) return; sent = st.i; buzz(30); if (game) { game.stop(); game = null; }
      try { await R.child('an/' + st.i + '/' + uid).set({ a: Math.round(score), t: TS }); } catch (e) {}
      shown = ''; draw();
    };
    // tug of war: pulls go up live (a few times a second) so the rope moves on every screen
    let tug = {};
    if (Q.g === 'tug') {
      const k = Q.ts && Q.ts[uid] != null ? Q.ts[uid] : 0; let pos = 0, pend = 0, lastW = 0, tm = null;
      const ref = R.child('tgp'), on = v => { pos = +v.val() || 0; }; ref.on('value', on);
      const push = () => { tm = null; lastW = Date.now(); R.child('tg/' + uid).set({ c: pend }).catch(() => {}); };
      tug = { side: { k, name: Q.tn ? Q.tn[k] : '' }, rope: () => pos, onTap: n => { pend = n; if (!tm) tm = setTimeout(push, Math.max(0, 350 - (Date.now() - lastW))); } };
      const was = send; send = async sc => { ref.off('value', on); if (tm) { clearTimeout(tm); push(); } return was(sc); };
    }
    game = MDGames.run(Q.g, root.querySelector('#mpG'), Object.assign({ seed: Q.seed, ar: Q.L !== 'en', left: () => Math.max(0, 1 - (now() - st.t0) / 1000 / st.dur), finish: s2 => send(s2), tick: () => buzz(10), bad: () => buzz(60) }, tug));
    const bar = root.querySelector('#mpBar'), g = game;
    tick = setInterval(() => {
      const left = Math.max(0, st.dur - (now() - st.t0) / 1000);
      if (bar) bar.style.width = (100 * left / st.dur) + '%';
      if (left <= 0) { clearInterval(tick); send(g.score()); }
    }, 100);
  }
  // a number typed in any digits: Arabic (١٢٣), Persian (۱۲۳) or English, with ٫ or , as the decimal mark
  function toNum(v) {
    const t = String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٬\s]/g, '').replace(/[٫،,]/g, '.').replace(/[−–]/g, '-');
    if (!/^-?\d*\.?\d+$/.test(t) && !/^-?\d+\.$/.test(t)) return null; return parseFloat(t);
  }
  // the kinds answered by typing or arranging
  function textQ() {
    const T2 = Q.type, pic = Q.img ? `<img class="mp-img" src="${Q.img}" alt="">` : '';
    const inner = T2 === 'num' ? `<input class="mp-in" id="mpIn" type="text" inputmode="decimal" autocomplete="off" dir="ltr" placeholder="${isAr() ? 'اكتب رقمًا' : 'Type a number'}">${Q.unit ? `<p class="mp-hint">${esc(Q.unit)}</p>` : ''}`
      : T2 === 'word' ? `<p class="mp-mask" id="mpW" dir="auto">${esc(Q.wl || '')}</p><input class="mp-in" id="mpIn" maxlength="24" dir="auto" autocomplete="off" placeholder="${isAr() ? 'اكتب الكلمة' : 'Type the word'}">`
      : T2 === 'open' ? `<input class="mp-in" id="mpIn" maxlength="40" dir="auto" autocomplete="off" placeholder="${isAr() ? 'اكتب إجابتك' : 'Write your answer'}">`
      : T2 === 'match' ? `<div class="mp-mrows" id="mpMr">${(Q.items || []).map((v, j) => `<button type="button" class="mp-mrow" data-l="${j}" style="--c:var(--qz${j % 6})"><span dir="auto">${esc(v)}</span><i>↔</i><b dir="auto">…</b></button>`).join('')}</div><p class="mp-hint" id="mpMh"></p><div class="mp-ord" id="mpOrd">${(Q.opts2 || []).map((v, j) => `<button type="button" data-o="${j}" style="--c:#6b7393"><span dir="auto">${esc(v)}</span></button>`).join('')}</div><button type="button" class="mg-btn" id="mpUndo">${B('⌫ تراجع', '⌫ Undo')}</button>`
      : T2 === 'rapid' ? `<p class="mp-rk" id="mpRk"></p><p class="mp-rs" id="mpRs" dir="auto"></p><div class="mp-rtf"><button type="button" class="t" data-tf="1">${B('صح', 'True')}</button><button type="button" class="f" data-tf="0">${B('خطأ', 'False')}</button></div>`
      : `<p class="mp-hint">${B('اضغطها بالترتيب من الأول إلى الأخير', 'Tap them in order, first to last')}</p><ol class="mp-picked" id="mpPk"></ol><div class="mp-ord" id="mpOrd">${(Q.items || []).map((v, j) => `<button type="button" data-o="${j}" style="--c:var(--qz${j % 6})"><span dir="auto">${esc(v)}</span></button>`).join('')}</div><button type="button" class="mg-btn" id="mpUndo">${B('⌫ تراجع', '⌫ Undo')}</button>`;
    screen(`<div class="mp-q mp-tq"><div class="mp-bar"><i id="mpBar"></i></div><p class="mp-qt" dir="auto">${esc(Q.q)}</p>${pic}${inner}
      ${Q.bet ? `<button type="button" class="mp-bet" id="mpBet" aria-pressed="${bet}">🎯 ${B('أراهن على إجابتي (+٣٠٠ أو −٣٠٠)', 'I bet on my answer (+300 or −300)')}</button>` : ''}
      <button type="button" class="btn solid mp-send" id="mpSend">${B('إرسال', 'Send')}</button></div>`, 'q');
    const inp = root.querySelector('#mpIn'), go = root.querySelector('#mpSend'), picked = [];
    const send = async a => { sent = st.i; buzz(30); try { await R.child('an/' + st.i + '/' + uid).set(Object.assign({ a, t: TS }, bet ? { b: true } : {})); } catch (e) {} shown = ''; draw(); };
    if (inp) { setTimeout(() => inp.focus(), 100); inp.onkeydown = e => { if (e.key === 'Enter') go.click(); }; }
    go.onclick = () => {
      if (T2 === 'match') { if (picked.length !== (Q.items || []).length) return; return send(picked.slice()); }
      if (T2 === 'rapid') return send(picked.slice());
      if (T2 === 'order') { if (picked.length !== (Q.items || []).length) return; return send(picked.slice()); }
      const v = inp.value.trim(); if (!v) return;
      if (T2 === 'num') { const n = toNum(v); if (n === null) { inp.classList.add('bad'); setTimeout(() => inp.classList.remove('bad'), 600); return; } return send(n); }
      send(v);
    };
    if (T2 === 'order') {
      const pk = root.querySelector('#mpPk'), paint = () => { pk.innerHTML = picked.map(j => `<li dir="auto">${esc(Q.items[j])}</li>`).join(''); root.querySelectorAll('[data-o]').forEach(b => b.disabled = picked.includes(+b.dataset.o)); go.disabled = picked.length !== Q.items.length; };
      root.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { picked.push(+b.dataset.o); buzz(10); paint(); });
      root.querySelector('#mpUndo').onclick = () => { picked.pop(); paint(); }; paint();
    }
    // match: the items are linked in turn, first to last
    if (T2 === 'match') {
      const mh = root.querySelector('#mpMh'), paint = () => {
        root.querySelectorAll('[data-l]').forEach(r => { const j = +r.dataset.l; r.classList.toggle('on', j === picked.length); r.querySelector('b').textContent = picked[j] != null ? Q.opts2[picked[j]] : '…'; });
        root.querySelectorAll('[data-o]').forEach(b => b.disabled = picked.includes(+b.dataset.o));
        mh.innerHTML = picked.length < Q.items.length ? B(`اختر ما يقابل: «${esc(Q.items[picked.length])}»`, `Choose the match of “${esc(Q.items[picked.length])}”`) : B('اكتمل التوصيل؛ أرسل إجابتك', 'All linked; send your answer');
        go.disabled = picked.length !== Q.items.length;
      };
      root.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { if (picked.length < Q.items.length) { picked.push(+b.dataset.o); buzz(10); paint(); } });
      root.querySelector('#mpUndo').onclick = () => { picked.pop(); paint(); }; paint();
    }
    // rapid round: one statement at a time; the last answer sends it all
    if (T2 === 'rapid') {
      go.hidden = true; const n = (Q.items || []).length, rs = root.querySelector('#mpRs'), rk = root.querySelector('#mpRk');
      const paint = () => { rk.textContent = Math.min(picked.length + 1, n) + ' / ' + n; rs.textContent = Q.items[picked.length] || ''; rs.classList.remove('in'); void rs.offsetWidth; rs.classList.add('in'); };
      root.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => { if (sent === st.i || picked.length >= n) return; picked.push(+b.dataset.tf); buzz(12); if (picked.length >= n) send(picked.slice()); else paint(); });
      paint();
    }
    const bb = root.querySelector('#mpBet'); if (bb) bb.onclick = () => { bet = !bet; bb.setAttribute('aria-pressed', bet); buzz(20); };
    const bar = root.querySelector('#mpBar');
    tick = setInterval(() => { const left = Math.max(0, st.dur - (now() - st.t0) / 1000); if (bar) bar.style.width = (100 * left / st.dur) + '%'; if (left <= 0) { clearInterval(tick); go.disabled = true; if (T2 === 'rapid' && sent !== st.i && picked.length) send(picked.slice()); } }, 100);
  }
  function question() {
    if (!Q || Q.i !== st.i) { setTimeout(draw, 200); shown = ''; return; }
    if (Q.type === 'game') return playGame();
    if (['num', 'word', 'order', 'open', 'match', 'rapid'].includes(Q.type) && sent !== st.i) return textQ();
    if (sent === st.i) return screen(`<div class="mp-wait"><p class="mp-big">${B('وصلت إجابتك', 'Answer sent')}</p><p>${B('انتظر النتيجة…', 'Wait for the result…')}</p></div>`);
    const multi = !!Q.multi, pick = new Set();
    const veil = Q.img && Q.rv ? `<div class="md-pic mp-pic"><img src="${Q.img}" alt=""><div class="md-veil go">${Array.from({ length: 24 }, (_, k) => `<i style="--d:${(Math.random() * Q.rv * .85).toFixed(2)}s"></i>`).join('')}</div></div>` : '';
    screen(`<div class="mp-q"><div class="mp-bar"><i id="mpBar"></i></div><p class="mp-qt" dir="auto">${esc(Q.q)}</p>${veil}${multi ? `<p class="mp-hint">${B('اختر كل الإجابات الصحيحة ثم أرسل', 'Choose every right answer, then send')}</p>` : ''}${Q.bet ? `<button type="button" class="mp-bet" id="mpBet" aria-pressed="${bet}">🎯 ${B('أراهن على إجابتي (+٣٠٠ أو −٣٠٠)', 'I bet on my answer (+300 or −300)')}</button>` : ''}
      <div class="mp-btns n${Q.opts.length}">${Q.opts.map((o, j) => `<button type="button" data-j="${j}" style="--c:var(--qz${j})"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></button>`).join('')}</div>
      ${multi ? `<button type="button" class="btn solid mp-send" id="mpSend" disabled>${B('إرسال', 'Send')}</button>` : ''}</div>`, 'q');
    const send = async a => {
      sent = st.i; buzz(30);
      try { await R.child('an/' + st.i + '/' + uid).set(Object.assign({ a, t: TS }, bet ? { b: true } : {})); } catch (e) { /* the time ended first */ }
      shown = ''; draw();
    };
    root.querySelectorAll('[data-j]').forEach(b => b.onclick = () => {
      const j = +b.dataset.j;
      if (!multi) return send(j);
      pick.has(j) ? pick.delete(j) : pick.add(j); b.classList.toggle('on', pick.has(j)); root.querySelector('#mpSend').disabled = !pick.size;
    });
    const bb = root.querySelector('#mpBet'); if (bb) bb.onclick = () => { bet = !bet; bb.setAttribute('aria-pressed', bet); buzz(20); };
    if (multi) root.querySelector('#mpSend').onclick = () => send([...pick].sort());
    const bar = root.querySelector('#mpBar');
    tick = setInterval(() => {
      const left = Math.max(0, st.dur - (now() - st.t0) / 1000);
      if (bar) bar.style.width = (100 * left / st.dur) + '%';
      if (left <= 0) { clearInterval(tick); root.querySelectorAll('[data-j]').forEach(b => b.disabled = true); }
    }, 100);
  }
  // the standings as the big screen shows them: top teams and top five
  const topList = () => !TOP ? '' : `<div class="mp-top5">${TOP.d ? `<p class="mp-gold">${B('🏁 بقي سؤال واحد بنقاط مضاعفة', '🏁 One question left, worth double')}</p>` : ''}${TOP.t && TOP.t.length ? `<ol class="mp-tl">${TOP.t.map(t => `<li style="--c:var(--qz${t.k % 6})"><span dir="auto">${esc(t.n)}</span><b>${t.s}</b></li>`).join('')}</ol>` : ''}<ol>${(TOP.p || []).map(p => `<li${p.n === me ? ' class="me"' : ''}><span dir="auto">${esc(p.n)}</span><b>${p.s}</b></li>`).join('')}</ol></div>`;
  function result() {
    // wait for this question's own result, not the last one
    if (!SC || !OK || (SC.q != null && SC.q !== st.i)) { if (st.ph === 'rev') screen(`<div class="mp-wait"><p>${B('لحظة…', 'One moment…')}</p></div>`); shown = ''; return; }
    if (st.ph === 'lb' && TOP) return screen(`<div class="mp-res end"><p class="mp-big">${B('الترتيب', 'Ranking')}</p>${topList()}<p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p></div>` + rxBar(), 'end');
    if (game) { game.stop(); game = null; }
    if (Q && Q.i === st.i && (Q.type === 'poll' || Q.type === 'open')) return screen(`<div class="mp-res end"><p class="mp-sym">🗳️</p><p class="mp-big">${SC.a ? B('شكرًا، وصلت مشاركتك', 'Thanks, your answer is in') : B('انتهى الوقت', 'Time’s up')}</p><p>${B('انظر النتائج على الشاشة', 'See the results on the screen')}</p><p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p></div>` + rxBar(), 'end');
    if (Q && Q.i === st.i && (Q.type === 'match' || Q.type === 'rapid')) {
      const ok2 = SC.c; if (st.ph === 'rev') buzz(ok2 ? [40, 60, 40] : 200);
      const key = Q.type === 'match' ? `<ol class="mp-ordr">${[].concat(OK).map(v => `<li dir="auto">${esc(v)}</li>`).join('')}</ol>` : '';
      return screen(`<div class="mp-res ${ok2 ? 'good' : 'bad'}"><p class="mp-sym">${ok2 ? '✓' : SC.a ? '◐' : '⏱'}</p>
        <p class="mp-big">${SC.a ? B(`أصبت ${SC.g || 0} من ${SC.n || (Q.items || []).length}`, `${SC.g || 0} of ${SC.n || (Q.items || []).length} right`) : B('انتهى الوقت', 'Time’s up')}</p>${key ? `<p class="mp-right">${B('التوصيل الصحيح:', 'The right links:')} ${key}</p>` : ''}
        ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : SC.d < 0 ? `<p class="mp-plus neg">${SC.d}</p>` : ''}${SC.b ? `<p class="mp-streak">🎯 ${ok2 ? B('ربحت الرهان', 'You won the bet') : B('خسرت الرهان', 'You lost the bet')}</p>` : ''}
        <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">🎯 ${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), ok2 ? 'good' : 'bad');
    }
    if (Q && Q.i === st.i && ['num', 'word', 'order'].includes(Q.type)) {
      const ok2 = SC.c, ans = Q.type === 'order' ? `<ol class="mp-ordr">${[].concat(OK).map(v => `<li dir="auto">${esc(v)}</li>`).join('')}</ol>` : `<b dir="auto">${esc(OK)}${Q.unit ? ' ' + esc(Q.unit) : ''}</b>`;
      if (st.ph === 'rev') buzz(ok2 ? [40, 60, 40] : 200);
      return screen(`<div class="mp-res ${ok2 ? 'good' : 'bad'}"><p class="mp-sym">${ok2 ? '✓' : SC.a ? '✕' : '⏱'}</p>
        <p class="mp-big">${Q.type === 'num' ? (ok2 ? B('من الأقرب!', 'One of the closest!') : B('ليس الأقرب', 'Not the closest')) : ok2 ? B('إجابة صحيحة', 'Correct') : SC.a ? B('إجابة خاطئة', 'Not this time') : B('انتهى الوقت', 'Time’s up')}</p>
        <p class="mp-right">${B('الجواب:', 'Answer:')} ${ans}${Q.type === 'num' && SC.g != null ? `<br>${B('إجابتك:', 'Yours:')} ${esc(SC.g)}` : ''}</p>
        ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : SC.d < 0 ? `<p class="mp-plus neg">${SC.d}</p>` : ''}${SC.b ? `<p class="mp-streak">🎯 ${ok2 ? B('ربحت الرهان', 'You won the bet') : B('خسرت الرهان', 'You lost the bet')}</p>` : ''}
        <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">🎯 ${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), ok2 ? 'good' : 'bad');
    }
    if (Q && Q.type === 'game' && Q.i === st.i) {
      return screen(`<div class="mp-res ${SC.c ? 'good' : 'bad'}"><p class="mp-sym">${SC.tw != null ? (SC.tw ? '🏆' : '🪢') : SC.c ? '🎉' : '⏱'}</p>${SC.tw != null ? `<p class="mp-big">${SC.tw ? B('فاز فريقك!', 'Your side won!') : B('خسر فريقك هذه المرة', 'Your side lost this time')}</p><p>${B('شدّاتك', 'Your pulls')}: ${SC.g || 0}</p>` : `<p class="mp-big">${B('نتيجتك في التحدي', 'Your challenge score')}: ${SC.g || 0}</p>`}
        ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : ''}<p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">🎯 ${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), SC.c ? 'good' : 'bad');
    }
    const ok = SC.c, right = Q && Q.i === st.i ? [].concat(OK).map(j => `${LET()[j]}) ${esc(Q.opts[j])}`).join(' · ') : '';
    if (st.ph === 'rev') buzz(ok ? [40, 60, 40] : 200);
    screen(`<div class="mp-res ${ok ? 'good' : 'bad'}"><p class="mp-sym">${ok ? '✓' : SC.a ? '✕' : '⏱'}</p>
      <p class="mp-big">${ok ? B('إجابة صحيحة', 'Correct') : SC.a ? B('إجابة خاطئة', 'Not this time') : B('انتهى الوقت', 'Time’s up')}</p>
      ${!ok && right ? `<p class="mp-right">${B('الإجابة الصحيحة:', 'Right answer:')} <span dir="auto">${right}</span></p>` : ''}
      ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : SC.d < 0 ? `<p class="mp-plus neg">${SC.d}</p>` : ''}${SC.b ? `<p class="mp-streak">🎯 ${ok ? B('ربحت الرهان', 'You won the bet') : B('خسرت الرهان', 'You lost the bet')}</p>` : ''}${SC.k >= 2 ? `<p class="mp-streak">🔥 ${B(`${SC.k} إجابات صحيحة متتالية`, `${SC.k} right in a row`)}</p>` : ''}
      <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
      ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">🎯 ${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}
      ${SC.tr ? `<p class="mp-tm" style="--c:var(--qz${(SC.t) % 6})">${B(`فريقك ${esc(TEAMS ? TEAMS[SC.t] : '')} في المركز ${SC.tr}`, `Your team ${esc(TEAMS ? TEAMS[SC.t] : '')} is in place ${SC.tr}`)}</p>` : ''}</div>` + rxBar(), ok ? 'good' : 'bad');
  }
  function final() {
    const r = SC ? SC.r : null;
    screen(`<div class="mp-res end"><p class="mp-sym">${r === 1 ? '🏆' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🎉'}</p>
      <p class="mp-big">${r && r <= 3 ? B('على منصة التتويج!', 'On the podium!') : B('انتهت المسابقة', 'The quiz is over')}</p>
      ${r ? `<p class="mp-rank">${B(`مركزك النهائي: ${r}`, `Final place: ${r}`)}</p><p class="mp-plus">${SC.s} ${B('نقطة', 'points')}</p>` : ''}
      ${TOP && TOP.t && TOP.t.length ? `<p class="mp-tm" style="--c:var(--qz${TOP.t[0].k % 6})">🏆 ${B('الفريق الفائز:', 'Winning team:')} ${esc(TOP.t[0].n)}</p>` : ''}${topList()}
      <p>${B('شكرًا لمشاركتك.', 'Thanks for playing.')}</p></div>` + rxBar(), 'end');
  }
  function gone() { clearInterval(tick); R && R.off(); root.innerHTML = `<div class="mp-card"><p class="mp-big">${B('انتهت المسابقة', 'The quiz has ended')}</p><button type="button" class="btn ghost" id="mpAgain">${B('مسابقة أخرى', 'Another quiz')}</button></div>`; root.querySelector('#mpAgain').onclick = () => { history.replaceState(null, '', location.pathname); codeScreen(); }; }
  function kicked() { R.off(); me = null; root.innerHTML = `<div class="mp-card"><p>${B('أخرجك المضيف من المسابقة.', 'The host removed you from the quiz.')}</p></div>`; }

  codeScreen();
})();

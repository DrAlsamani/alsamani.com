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
  let TOOLS = false;
  let SIDREQ = false;
  let PM = false, RV = null, SB = [], CM = null, RCON = false, ASKQ = null;
  const REMOTE = new URLSearchParams(location.search).get('rc') || '';   // phones only: the flag, everyone's answers, the stage's statements
  let TOP = null, TEAMS = null, TMODE = 'pick', myTeam = null, bet = false, lastRx = 0;
  let db, uid, off = 0, R = null, me = null, st = {}, Q = null, OK = null, SC = null, sent = null, tick = null;
  const now = () => Date.now() + off;
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms || 25000))]);
  async function ready() {
    if (db) return;
    firebase.initializeApp(CFG);
    uid = ((await new Promise(r => { const off = firebase.auth().onAuthStateChanged(u => { off(); r(u); }); })) || (await firebase.auth().signInAnonymously()).user).uid;
    db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }

  /* ---------- the code and the name ---------- */
  function codeScreen(err) {
    const p = new URLSearchParams(location.search).get('p') || '';
    root.innerHTML = `<div class="mp-card"><a class="mp-logo" href="/play/maydan/">${window.MD_MARK || ''}<b>${B('ميدان', 'Maydan')}</b></a>
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
        await within(ready());
        const s = await within(db.ref('rooms/' + pin + '/st').once('value'));
        if (!s.exists()) return codeScreen(T('لا توجد مسابقة بهذا الرمز. تأكد منه على الشاشة.', 'No quiz with this code. Check it on the screen.'));
        R = db.ref('rooms/' + pin); PIN = pin; loadH(); SIDREQ = !!(await within(R.child('sidreq').once('value'))).val();
        const mine = (await within(R.child('pl/' + uid).once('value'))).val();
        if (REMOTE) { if (!mine) await within(R.child('pl/' + uid).set({ n: T('جوال المضيف', 'Host phone'), at: TS, w: 1 })); FAN = true; me = ''; R.child('rx/' + uid).set({ e: '@' + REMOTE, t: TS }).catch(() => {}); return play(); }
        if (mine) { me = mine.n; return play(); }
        if (s.val().lock) return codeScreen(T('أُقفل الدخول إلى هذه المسابقة.', 'This quiz is closed to new players.'));
        R.child('tmode').on('value', t => { TMODE = t.val() || 'pick'; const box = root.querySelector('#mpTeams'); if (box) teamPick(box); });
        R.child('teams').on('value', t => { TEAMS = t.val(); const box = root.querySelector('#mpTeams'); if (box) teamPick(box); });
        nameScreen();
      } catch (e) { codeScreen(T('تعذّر الاتصال. تأكد من الإنترنت.', 'Could not connect. Check the internet.')); }
    };
    if (p.replace(/\D/g, '').length === 6 && !err) setTimeout(() => go.click(), 50);
  }

  function avPick(box, inp) {
    if (!box) return;
    let a = store.get('av', ''); if (!/^\d\d$/.test(a)) { a = String(Math.floor(Math.random() * 6)) + Math.floor(Math.random() * 8); store.set('av', a); }
    const L = () => (inp && inp.value.trim().charAt(0)) || '؟';
    const paint = () => { box.innerHTML = `<p class="mp-l">${B('شكلك في الميدان', 'Your figure')}</p><div class="mp-avrow">${AVS.map((_, k) => `<button type="button" data-s="${k}" aria-pressed="${+a[0] === k}" style="${avSt(String(k) + a[1])}"><span>${esc(L())}</span></button>`).join('')}</div><div class="mp-avcol">${AVC.map((c, k) => `<button type="button" data-c="${k}" aria-pressed="${+a[1] === k}" style="background:${c}"></button>`).join('')}</div>`;
      box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { a = b.dataset.s + a[1]; store.set('av', a); paint(); });
      box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { a = a[0] + b.dataset.c; store.set('av', a); paint(); }); };
    paint(); if (inp) inp.addEventListener('input', () => box.querySelectorAll('[data-s] span').forEach(sp => { sp.textContent = L(); }));
  }
  function nameScreen(err) {
    root.innerHTML = `<div class="mp-card"><a class="mp-logo" href="/play/maydan/">${window.MD_MARK || ''}<b>${B('ميدان', 'Maydan')}</b></a>
      <label class="mp-l">${B('اسمك أو لقبك', 'Your name or nickname')}<input id="mpName" maxlength="24" autocomplete="nickname" dir="auto" value="${esc(store.get('name', ''))}"></label>
      ${SIDREQ ? `<label class="mp-l">${B('الرقم الجامعي (أو اسم المستخدم)', 'Student ID (or username)')}<input id="mpSid" maxlength="12" dir="ltr" autocomplete="off" value="${esc(store.get('sid', ''))}"></label>` : ''}
      <div class="mp-av" id="mpAv"></div>
      <div id="mpTeams" class="mp-teams"></div>
      <p class="mp-err" ${err ? '' : 'hidden'}>${err || ''}</p>
      <button type="button" class="btn solid mp-go" id="mpGo">${B('ادخل الميدان', 'Join')}</button>
      <button type="button" class="btn ghost mp-go" id="mpFan">${B('ادخل متفرجًا', 'Just watch')}</button></div>`;
    const inp = root.querySelector('#mpName'), go = root.querySelector('#mpGo');
    root.querySelector('#mpFan').onclick = async () => { const n = inp.value.trim().replace(/\s+/g, ' ').slice(0, 24) || T('مشجّع', 'A fan'); try { await within(R.child('pl/' + uid).set({ n, at: TS, w: 1 })); FAN = true; me = n; store.set('name', n); play(); } catch (e) { nameScreen(T('تعذّر الدخول؛ ربما أُقفلت المسابقة.', 'Could not join; the quiz may be closed.')); } };
    teamPick(root.querySelector('#mpTeams')); avPick(root.querySelector('#mpAv'), inp);
    inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') go.click(); };
    go.onclick = async () => {
      const n = inp.value.trim().replace(/\s+/g, ' ').slice(0, 24);
      if (!n) return nameScreen(T('اكتب اسمًا يظهر على الشاشة.', 'Type a name to show on the screen.'));
      if (SIDREQ) { const v = (root.querySelector('#mpSid').value || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^A-Za-z0-9]/g, '').slice(0, 12); if (v.length < 3) { const e = root.querySelector('.mp-err'); e.hidden = false; e.textContent = T('اكتب رقمك الجامعي.', 'Type your student ID.'); return; } store.set('sid', v); }
      if (TEAMS && TMODE === 'pick' && myTeam == null) { const e = root.querySelector('.mp-err'); e.hidden = false; e.textContent = T('اختر فريقك.', 'Choose your team.'); return; }
      go.disabled = true;
      go.textContent = T('لحظة…', 'One moment…');
      try { await within(R.child('pl/' + uid).set(Object.assign({ n, at: TS }, TEAMS && myTeam != null ? { t: myTeam } : {}))); me = n; store.set('name', n); play(); }
      catch (e) { nameScreen(e && e.message === 'slow' ? T('الاتصال بطيء؛ اضغط «ادخل الميدان» مرة أخرى.', 'The connection is slow; press Join again.') : T('تعذّر الدخول؛ ربما أُقفلت المسابقة.', 'Could not join; the quiz may be closed.')); }
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
  const PH = () => [T('كفو!', 'Bravo!'), T('قوية!', 'Nice!'), T('يا حظك', 'Lucky!'), T('ركّز!', 'Focus!'), T('يا سلام', 'Wow'), T('هههه', 'Haha')];
  let micOn = false;
  const micBox = () => { if (FAN || !['rev', 'lb'].includes(st.ph)) return ''; const M = TOP && TOP.mic; if (!M || M.off) return ''; if (!M.n && !M.on) micOn = micOn && false; if (M.cool) return '';
    return `<div class="mp-mic"><button type="button" data-mic aria-pressed="${micOn || M.on}"${micOn || M.on ? ' disabled' : ''}>${M.on ? B('تُفتح منصة التصريحات بعد هذه الجولة!', 'The stage opens after this round!') : micOn ? B('طلبت منصة التصريحات ✓', 'You asked for the stage ✓') : B('اطلب منصة التصريحات', 'Ask for the stage')}</button>${M.on ? '' : `<small>${B(`تُفتح إذا طلبها ${M.need} (٢٥٪ من المشاركين) · طلبها حتى الآن ${M.n}`, `Opens when ${M.need} ask (25% of players) · ${M.n} so far`)}</small>`}</div>`; };
  const rxBar = () => micBox() + `<div class="mp-rx">${RX.map(e => `<button type="button" data-rx="${e}">${e}</button>`).join('')}${PH().map(e => `<button type="button" class="ph" data-rx="${e}">${e}</button>`).join('')}</div>`;
  function rxBind() {
    const mb = root.querySelector('[data-mic]'); if (mb) mb.onclick = () => { micOn = true; R.child('rx/' + uid).set({ e: '🎤', t: TS }).catch(() => {}); buzz(30); shown = ''; draw(); };
    root.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => {
      if (Date.now() - lastRx < 900) return; lastRx = Date.now();
      R.child('rx/' + uid).set({ e: b.dataset.rx, t: TS }).catch(() => {}); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); buzz(15);
    });
  }

  /* ---------- the game: follow the room and draw what this phone should show ---------- */
  function play() {
    if (window.AV && !REMOTE && !document.documentElement.classList.contains('mp-embed')) AV.attach({ ref: R.child('av'), uid, name: me || T('مشجّع', 'A fan') });
    { const a = store.get('av', ''); if (a && R && !REMOTE) setTimeout(() => R.child('rx/' + uid).set({ e: '%' + a, t: TS }).catch(() => {}), 400); }
    // a graded quiz: the student ID goes to the host in two short parts
    if (R && !REMOTE) R.child('sidreq').once('value', s2 => { const id = store.get('sid', ''); if (!s2.val() || !id || FAN) return; setTimeout(() => R.child('rx/' + uid).set({ e: '#0' + id.slice(0, 6), t: TS }).catch(() => {}), 1200); setTimeout(() => R.child('rx/' + uid).set({ e: '#1' + id.slice(6, 12), t: TS }).catch(() => {}), 2400); });
    if (REMOTE) { const seen = {}; const got = m => { const v = m.val() || {}; if (v.to !== 'h' || !v.m || seen[m.key] === v.t) return; seen[m.key] = v.t; R.child('pl/' + m.key + '/n').once('value', n => { RIN.push({ n: n.val() || T('مشارك', 'A player'), m: v.m }); buzz([30, 40, 30]); shown = ''; draw(); }); };
      R.child('msg').on('child_added', got); R.child('msg').on('child_changed', got); }
    R.child('ann').on('value', a => { const v = a.val(); ANN = v && v.m ? v.m : ''; if (ANN && now() - (v.t || 0) < 3600000) { if (st.ph && st.ph !== 'lobby' && st.ph !== 'pause') return; buzz([40, 60, 40]); tone(988, .12); shown = ''; draw(); } });
    R.child('wu').on('value', w => { WU = w.val(); if (st.ph === 'lobby' || st.ph === 'pause') { shown = ''; draw(); } });
    R.child('st').on('value', s => { st = s.val() || {}; if (!s.exists()) return gone(); phaseSeen(); draw(); tryAsk(); askBtn(); });
    R.child('q').on('value', s => { Q = s.val(); if (Q && Q.pw) TOOLS = true; });
    R.child('pl/' + uid + '/w').once('value', s => { FAN = !!s.val(); const o = store.get('fan.' + PIN, null); if (o != null && !!o !== FAN && !REMOTE) { FAN = !!o; R.child('rx/' + uid).set({ e: FAN ? '^f' : '^p', t: TS }).catch(() => {}); shown = ''; draw(); } });
    R.child('teams').on('value', t => { TEAMS = t.val(); });
    R.child('pl/' + uid + '/t').once('value', t => { if (t.val() != null) myTeam = +t.val(); });
    R.child('asg/' + uid).on('value', t => { if (t.val() != null) { myTeam = +t.val(); shown = ''; draw(); } });
    R.child('ok').on('value', s => { OK = s.val(); draw(); });
    R.child('wr').on('value', s => { const e = root.querySelector('#mpW'); if (e && s.val()) e.textContent = s.val(); });
    R.child('pm').on('value', s => { PM = !!s.val(); if (st.ph === 'lobby') { shown = ''; draw(); } else feed(); });
    R.child('rv').on('value', s => { RV = s.val(); feed(); });
    R.child('cm').on('value', s => { CM = s.val(); feed(); });
    R.child('rc').on('value', s => { RCON = s.val() === uid.slice(0, 8); if (REMOTE) { shown = ''; draw(); } });
    R.child('sb').on('value', s => { SB = s.val() || []; feed(); });
    { const seen = {}; const fx = s => { const v = s.val() || {}; if (!PM || !v.e || v.e === '🎤' || /^(w\d|\^|%|#|@)/.test(v.e) || s.key === uid || seen[s.key] === v.t) return; seen[s.key] = v.t; if (now() - (v.t || 0) > 8000) return; floatRx(v.e); };
      R.child('rx').on('child_added', fx); R.child('rx').on('child_changed', fx); }
    R.child('top').on('value', s => { TOP = s.val(); if (FAN && st.ph === 'q') { shown = ''; draw(); return; }
      if (st.ph === 'q' && Q && Q.type === 'game') { const sp = root.querySelector('#mpStrip'); if (sp) sp.innerHTML = arenaFan(true); if (sent === st.i) { shown = ''; draw(); } return; } if (TOP && TOP.mic && !TOP.mic.n && !TOP.mic.on) micOn = false; if (['lb', 'end', 'rev'].includes(st.ph)) { shown = ''; draw(); } });
    R.child('sc/' + uid).on('value', s => { SC = s.val(); draw(); });
    R.child('pl/' + uid).on('value', s => { if (!s.exists() && me) kicked(); });
  }
  let shown = '';
  function draw() {
    if (REMOTE) return remoteScreen();
    const key = st.ph + ':' + st.i + ':' + (st.ph === 'rev' || st.ph === 'lb' || st.ph === 'end' ? JSON.stringify(SC) + (OK ? 'k' : '') + (TOP ? JSON.stringify(TOP).length : '') : '');
    if (key === shown) return; shown = key;
    clearInterval(tick);
    if (st.ph === 'lobby') return screen(annHtml() + wuHtml() + `<div class="mp-wait"><p class="mp-big">${B('أنت في الميدان!', 'You are in!')}</p><p class="mp-me" dir="auto">${esc(me)}</p>${TEAMS && myTeam != null ? `<p class="mp-tm" style="--c:var(--qz${(myTeam) % 6})">${esc(TEAMS[myTeam])}</p>` : ''}<p>${(PM ? B('ستبدأ المسابقة قريبًا، وتتابعها كاملة من جوالك.', 'The quiz will start soon; follow all of it on your phone.') : B('انظر إلى الشاشة؛ ستبدأ المسابقة قريبًا.', 'Watch the screen; the quiz will start soon.'))}</p></div>` + rxBar());
    if (st.ph === 'pause') return screen(annHtml() + `<div class="mp-wait"><p class="mp-big"></p><p class="mp-big">${B('توقفت المسابقة مؤقتًا', 'The quiz is paused')}</p><p>${B('ابقَ على هذه الصفحة؛ ستُستأنف من حيث توقفت.', 'Stay on this page; it will continue where it stopped.')}</p></div>`);
    if (st.ph === 'ready') { if (!Q || Q.i !== st.i) { shown = ''; setTimeout(draw, 200); return; } bet = false; const gm = Q.type === 'game' && window.MDGames ? MDGames.byId(Q.g) : null; return screen(`<div class="mp-wait${Q.gold ? ' gold' : ''}"><p>${B('استعد…', 'Get ready…')}</p><p class="mp-big">${gm ? `${gm.icon} ${Q.L === 'en' ? gm.en : gm.ar}` : B('السؤال', 'Question') + ' ' + ((st.i || 0) + 1)}</p>${gm ? `<p class="mp-how">${Q.L === 'en' ? gm.howEn : gm.howAr}</p>` : ''}${Q.gold ? `<p class="mp-gold">${B('السؤال الذهبي! نقاط مضاعفة', 'The golden question! Double points')}</p>` : Q.last ? `<p class="mp-gold">${B('السؤال الأخير — نقاط مضاعفة', 'The last question — double points')}</p>` : ''}</div>`); }
    // last survivor: once out, a player watches the rest
    if (st.ph === 'q' && SC && SC.out && SC.q != null && SC.q < st.i) return screen(`<div class="mp-wait"><p class="mp-sym"></p><p class="mp-big">${B('أنت الآن متفرج', 'You are watching now')}</p><p>${B('خرجت من المنافسة؛ تابع الأسئلة على الشاشة وشجّع الناجين.', 'You are out of the race; follow along on the screen and cheer for those still in.')}</p><p class="mp-rank">${B(`الناجون: ${SC.left}`, `Still in: ${SC.left}`)}</p></div>` + rxBar());
    if (FAN && ['q', 'rev', 'lb', 'ready'].includes(st.ph)) return screen('');
    if (st.ph === 'rev' && Q && Q.i === st.i && SC && SC.q === st.i && !FAN) note();
    if (st.ph === 'q' && !FAN) tone(880, .15);
    if (st.ph === 'q') return question();
    if (st.ph === 'rev' || st.ph === 'lb') return result();
    if (st.ph === 'end') return final();
  }
  function screen(html, cls) {
    if (SC && SC.left != null && SC.q === st.i && st.ph === 'rev') html = (SC.out ? `<p class="mp-surv out">${B('خرجت من المنافسة، وتكمل متفرجًا', 'You are out; keep watching')}</p>` : `<p class="mp-surv">${B(`ما زلت في المنافسة · الناجون: ${SC.left}`, `Still in · ${SC.left} left`)}</p>`) + html;
    if (FAN) html = fanHtml(html);
    const qn = Q && Q.n && st.i >= 0 && ['q', 'ready', 'rev'].includes(st.ph) ? `<span class="mp-qn">${Q.type === 'stage' ? '' + B('منصة التصريحات', 'The stage') : B(`السؤال ${Q.qn || st.i + 1} من ${Q.qt || Q.n}`, `Question ${Q.qn || st.i + 1} of ${Q.qt || Q.n}`)}</span>` : '';
    const fx = SC && SC.q === st.i && st.ph === 'rev' ? pwNote() : '';
    root.innerHTML = `<div class="mp-play ${cls || ''}"><div class="mp-top"><span dir="auto">${FAN ? '' : ''}${esc(me)}${TEAMS && myTeam != null ? ` <i style="--c:var(--qz${(myTeam) % 6})">${esc(TEAMS[myTeam])}</i>` : ''}</span>${qn}<b>${FAN ? '' : SC ? SC.s : 0}</b></div>${fx}${/<div class="mp-(mic|rx)"/.test(html) ? html.replace(/<div class="mp-(mic|rx)"/, m => '<div class="mp-feed" id="mpFeed"></div>' + m) : html + '<div class="mp-feed" id="mpFeed"></div>'}${!FAN && ['rev', 'lb', 'ready'].includes(st.ph) ? toolsBar() : ''}${!FAN && st.ph === 'q' && cls === 'q' ? skipBtn() : ''}${extras()}</div>`; if (R) { rxBind(); toolsBind(); xBind(); } feed(); }
  /* ---------- while waiting: switch between playing and watching, write to the screen or to the host, and be told when it starts ---------- */
  let msgDraft = '', lastMsg = 0;
  function annHtml() { return ANN && (st.ph === 'lobby' || st.ph === 'pause') ? `<div class="mp-ann"><small>${B('من المشرف', 'From the host')}</small><p dir="auto">${esc(ANN)}</p></div>` : ''; }
  function wuHtml() {
    if (!WU || !window.MDGames || !(st.ph === 'lobby' || st.ph === 'pause')) return ''; const g = MDGames.byId(WU.g), best = store.get('wu.' + PIN + '.' + WU.g + '.' + WU.seed, 0);
    return `<div class="mp-wu"><p>${B('تحدي الانتظار', 'Waiting challenge')}: <b>${B(g.ar, g.en)}</b></p><button type="button" class="btn solid" data-wu>${best ? B(`العب مرة ثانية · أفضل نتيجة لك ${best}`, `Play again · your best ${best}`) : B('العب ٣٠ ثانية، وأفضل النتائج على الشاشة', 'Play 30 seconds; the best scores go on the screen')}</button></div>`;
  }
  function playWarmup() {
    const g = MDGames.byId(WU.g), key = 'wu.' + PIN + '.' + WU.g + '.' + WU.seed, ov = document.createElement('div'); ov.className = 'mp-wuo';
    ov.innerHTML = `<div class="mp-wuh"><b>${B(g.ar, g.en)}</b><span class="mp-wut">30</span><button type="button" aria-label="${T('إغلاق', 'Close')}">×</button></div><div class="mp-bar"><i id="mpWuBar"></i></div><div class="mp-wug"></div>`;
    document.body.appendChild(ov); const t0 = Date.now(), dur = 30;
    const end = () => { if (!wuGame) return; const sc = Math.max(0, Math.round(wuGame.score() || 0)); wuGame.stop(); wuGame = null; clearInterval(ti); ov.remove();
      const best = store.get(key, 0); if (sc > best) { store.set(key, sc); R.child('rx/' + uid).set({ e: 'w' + Math.min(9999999, sc), t: TS }).catch(() => {}); }
      flashMsg(sc > best ? T(`نتيجتك ${sc}، أفضل نتيجة لك!`, `You scored ${sc}, your best!`) : T(`نتيجتك ${sc}`, `You scored ${sc}`)); buzz([30, 50, 30]); shown = ''; draw(); };
    wuGame = MDGames.run(WU.g, ov.querySelector('.mp-wug'), { seed: WU.seed, ar: isAr(), left: () => Math.max(0, 1 - (Date.now() - t0) / 1000 / dur), finish: end, tick: () => buzz(10), bad: () => buzz(60) });
    const ti = setInterval(() => { const l = Math.max(0, dur - (Date.now() - t0) / 1000); ov.querySelector('.mp-wut').textContent = Math.ceil(l); ov.querySelector('#mpWuBar').style.width = (100 * l / dur) + '%'; if (l <= 0 || (st.ph && st.ph !== 'lobby' && st.ph !== 'pause')) end(); }, 100);
    ov.querySelector('button').onclick = end;
  }
  function extras() {
    if (REMOTE || !R) return '';
    const calm = ['lobby', 'pause', 'rev', 'lb'].includes(st.ph) || FAN; if (!calm || st.ph === 'end') return '';
    const nt = st.ph === 'lobby' && 'Notification' in window && Notification.permission === 'default' ? `<button type="button" class="mp-xb" data-ntf>${B('نبّهني إذا بدأت وأنا خارج الصفحة', 'Tell me when it starts if I leave the page')}</button>` : '';
    return `<div class="mp-xtra">
      <div class="mp-msg"><button type="button" class="mp-xb" data-msgo>${B('اكتب رسالة للشاشة أو للمشرف', 'Write to the screen or the host')}</button></div>
      <button type="button" class="mp-xb" data-sw>${FAN ? B('انضم كلاعب', 'Join as a player') : B('تحوّل إلى متفرج', 'Switch to watching')}</button>${nt}</div>`;
  }
  function xBind() {
    const o = root.querySelector('[data-msgo]'); if (o) o.onclick = msgSheet;
    const wb = root.querySelector('[data-wu]'); if (wb) wb.onclick = () => { if (!wuGame) playWarmup(); };
    const sw = root.querySelector('[data-sw]'); if (sw) sw.onclick = () => { FAN = !FAN; store.set('fan.' + PIN, FAN ? 1 : 0); R.child('rx/' + uid).set({ e: FAN ? '^f' : '^p', t: TS }).catch(() => {}); buzz(25); shown = ''; draw(); };
    const nb = root.querySelector('[data-ntf]'); if (nb) nb.onclick = () => { try { Notification.requestPermission().then(() => { shown = ''; draw(); }); } catch (e) {} };
  }
  // writing sits in its own sheet over the page, so the live updates underneath never interrupt it
  function msgSheet() {
    if (document.querySelector('.mp-sheet')) return;
    const d = document.createElement('div'); d.className = 'mp-sheet';
    d.innerHTML = `<div class="mp-sbox"><textarea maxlength="80" rows="2" dir="auto" placeholder="${T('رسالتك (٨٠ حرفًا)', 'Your message (80 characters)')}">${esc(msgDraft)}</textarea>
      <div class="mp-msgb"><button type="button" class="btn solid" data-msg="s">${B('أرسلها للشاشة', 'Send to the screen')}</button><button type="button" class="btn ghost" data-msg="h">${B('للمشرف فقط', 'To the host only')}</button></div>
      <button type="button" class="mp-sx" data-x>${B('إلغاء', 'Cancel')}</button></div>`;
    document.body.appendChild(d);
    const t = d.querySelector('textarea'), close = () => { msgDraft = t.value; d.remove(); };
    setTimeout(() => t.focus(), 30);
    d.onclick = e => { if (e.target === d) close(); };
    d.querySelector('[data-x]').onclick = close;
    d.querySelectorAll('[data-msg]').forEach(b => b.onclick = async () => {
      const m = t.value.trim().replace(/\s+/g, ' ').slice(0, 80); if (!m) return t.focus();
      if (Date.now() - lastMsg < 15000) return flashMsg(T('انتظر قليلًا قبل رسالة أخرى.', 'Wait a moment before another message.'));
      b.disabled = true;
      try { await R.child('msg/' + uid).set({ m, to: b.dataset.msg, t: TS }); lastMsg = Date.now(); msgDraft = ''; d.remove(); buzz(25); flashMsg(b.dataset.msg === 's' ? T('وصلت رسالتك للشاشة.', 'Your message is on its way to the screen.') : T('وصلت رسالتك للمشرف.', 'Your message reached the host.')); }
      catch (e) { b.disabled = false; flashMsg(T('تعذّر إرسال الرسالة الآن.', 'The message could not be sent now.')); }
    });
  }
  function flashMsg(t) { const d = document.createElement('div'); d.className = 'mp-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
  // the screen stays awake while waiting, and the start is announced: sound, vibration, the tab title and, if allowed, a notification
  let wake = null, startedOnce = false, lastPh = null; const PAGE_T = document.title;
  async function keepAwake(on) { try { if (on && !wake && navigator.wakeLock && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } else if (!on && wake) { wake.release(); wake = null; } } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { document.title = PAGE_T; if (st.ph === 'lobby') keepAwake(true); } });
  function announce(first) {
    const hidden = document.visibilityState !== 'visible';
    if (first) { tone(660, .15); setTimeout(() => tone(880, .15), 180); setTimeout(() => tone(1175, .3), 360); buzz([300, 100, 300, 100, 600]); }
    if (hidden) { document.title = (first ? T('بدأت المسابقة! ', 'The quiz has started! ') : T('سؤال جديد! ', 'New question! ')) + '· ' + PAGE_T;
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification(first ? T('بدأت المسابقة في ميدان!', 'Your Maydan quiz has started!') : T('سؤال جديد في ميدان', 'A new question in Maydan'), { body: T('ارجع للصفحة وشارك.', 'Come back and play.'), tag: 'md-' + PIN, renotify: true }); } catch (e) {} }
  }
  function phaseSeen() {
    if (REMOTE) return; const ph = st.ph;
    if (ph === 'lobby') keepAwake(true);
    if (lastPh === 'lobby' && ph && ph !== 'lobby' && !startedOnce) { startedOnce = true; announce(true); keepAwake(false); }
    else if (ph === 'q' && lastPh !== 'q' && startedOnce) announce(false);
    if (ph && ph !== 'lobby') startedOnce = true;
    lastPh = ph;
  }


  /* ---------- the host's remote: big buttons that send short commands to the screen ---------- */
  function remoteScreen() {
    const cmd = e => { R.child('rx/' + uid).set({ e, t: TS }).catch(() => {}); buzz(20); };
    const ph = st.ph, where = st.i >= 0 && Q ? (Q.type === 'stage' ? T('منصة التصريحات', 'The stage') : T(`السؤال ${Q.qn || st.i + 1} من ${Q.qt || Q.n || ''}`, `Question ${Q.qn || st.i + 1} of ${Q.qt || Q.n || ''}`)) : T('قبل البدء', 'Before the start');
    const state = { lobby: T('ينتظر اللاعبين', 'Waiting for players'), ready: T('يُعرض السؤال', 'Showing the question'), q: T('السؤال مفتوح للإجابة', 'Answers are open'), rev: T('النتيجة معروضة', 'The result is up'), lb: T('الترتيب معروض', 'The ranking is up'), pause: T('متوقفة مؤقتًا', 'Paused'), end: T('انتهت المسابقة', 'The quiz is over') }[ph] || '';
    root.innerHTML = `<div class="mp-card mp-remote"><a class="mp-logo" href="/play/maydan/">${window.MD_MARK || ''}<b>${B('ميدان', 'Maydan')}</b></a>
      <p class="mp-rcst${RCON ? ' on' : ''}">${RCON ? B('متصل بالشاشة', 'Connected to the screen') : B('جارٍ الاتصال بالشاشة…', 'Connecting to the screen…')}</p>
      <p class="mp-big">${esc(where)}</p><p>${esc(state)}</p>
      <div class="mp-rcb">${ph === 'end' ? `<button type="button" data-c="@r">${B('إعادة السباق', 'Replay the race')}</button>`
        : `<button type="button" class="go" data-c="@n">${ph === 'lobby' ? B('ابدأ', 'Start') : B('التالي', 'Next')}</button>${ph === 'q' ? `<button type="button" data-c="@s">${B('أنهِ الوقت واكشف الإجابة', 'End the time, show the answer')}</button>` : ''}${['rev', 'lb', 'ready', 'q'].includes(ph) ? `<button type="button" data-c="@m">${B('منصة التصريحات بعد هذه الجولة', 'The stage after this round')}</button>` : ''}`}</div></div>`;
    // messages written for the host alone come to the host's phone
    if (RIN.length) root.querySelector('.mp-remote').insertAdjacentHTML('beforeend', `<div class="mp-rin"><h3>${B('رسائل لك', 'Messages for you')}</h3>${RIN.slice().reverse().slice(0, 12).map(z => `<p><b dir="auto">${esc(z.n)}</b><span dir="auto">${esc(z.m)}</span></p>`).join('')}</div>`);
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cmd(b.dataset.c); b.classList.add('sent'); setTimeout(() => b.classList.remove('sent'), 600); });
  }
  /* ---------- the audience asks: a fan writes a true-or-false statement; it reaches the host with the next question ---------- */
  function askBtn() {
    let b = document.getElementById('mpAskB');
    const want = FAN && !REMOTE && !['end'].includes(st.ph) && st.i >= -1 && R;
    if (!want) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('button'); b.type = 'button'; b.id = 'mpAskB'; b.className = 'mp-askb'; b.innerHTML = B('اقترح سؤالًا', 'Suggest a question');
    document.body.appendChild(b);
    b.onclick = () => {
      const d = document.createElement('div'); d.className = 'mp-askm';
      d.innerHTML = `<div class="mp-askc"><p class="mp-big">${B('اقترح سؤالًا للمضيف', 'Suggest a question to the host')}</p><textarea id="mpAskT" maxlength="140" rows="3" dir="auto" placeholder="${T('اكتب عبارة يجيب عنها اللاعبون بصح أو خطأ', 'Write a statement the players answer true or false')}"></textarea>
        <p>${B('العبارة:', 'The statement is:')}</p><div class="mp-asktf"><button type="button" data-v="1">${B('صحيحة', 'True')}</button><button type="button" data-v="0">${B('خاطئة', 'False')}</button></div>
        <button type="button" class="btn ghost" data-x>${B('إلغاء', 'Cancel')}</button></div>`;
      document.body.appendChild(d);
      d.querySelector('[data-x]').onclick = () => d.remove();
      d.querySelectorAll('[data-v]').forEach(v => v.onclick = () => { const t = d.querySelector('#mpAskT').value.trim().replace(/\s+/g, ' '); if (t.length < 3) return; ASKQ = { t, ok: v.dataset.v }; d.remove(); b.innerHTML = B('اقتراحك في الطريق…', 'Your question is on its way…'); b.disabled = true; tryAsk(); });
    };
  }
  async function tryAsk() {
    if (!ASKQ || !R || st.ph !== 'q' || st.i < 0) return;
    const a = 'Q:' + ASKQ.ok + ':' + ASKQ.t, keep2 = ASKQ; ASKQ = null;
    try { await R.child('an/' + st.i + '/' + uid).set({ a, t: TS }); const b = document.getElementById('mpAskB'); if (b) { b.innerHTML = B('وصل اقتراحك ✓ اقترح غيره', 'Sent ✓ suggest another'); b.disabled = false; } }
    catch (e) { ASKQ = keep2; }
  }
  /* ---------- phones only (no big screen): the screen's part comes to the phone ----------
     everyone's answers after each question, the stage's statements, and the reactions flying past */
  function feed() {
    const f = root.querySelector('#mpFeed'); if (!f) return;
    let h = CM && CM.i === st.i && ['rev', 'lb'].includes(st.ph) ? `<p class="mp-cmt" dir="auto">${esc(isAr() ? CM.t : CM.e)}</p>` : '';
    // the stage's statements show on every phone, with or without a big screen
    if (Q && Q.type === 'stage' && Q.i === st.i && ['q', 'rev'].includes(st.ph) && SB.length) h += `<div class="mp-sb">${SB.map((b, k) => `<div class="md-bub" style="--c:var(--qz${k % 6})"><b dir="auto">${esc(b.n)}</b><p dir="auto">${esc(b.t)}</p></div>`).join('')}</div>`;
    else if (PM && st.ph === 'rev' && RV && RV.i === st.i && Q && Q.i === st.i) {
      const okSet = new Set([].concat(OK == null ? [] : OK).map(Number));
      if (RV.c) { const mx = Math.max(1, ...RV.c); h += `<div class="mp-dist"><p>${B(`إجابات الجميع (${RV.n})`, `Everyone’s answers (${RV.n})`)}</p>${RV.c.map((c, j) => `<div class="mp-dbar${Q.type !== 'poll' && okSet.has(j) ? ' ok' : ''}"><span dir="auto">${esc((Q.opts || [])[j] || '')}</span><i style="--w:${(100 * c / mx).toFixed(0)}%"></i><b>${c}</b></div>`).join('')}</div>`; }
      else if (RV.w && RV.w.length) { const mx = Math.max(1, ...RV.w.map(w => w[1])); h += `<div class="mp-cloud"><p>${B(`ماذا كتب الجميع (${RV.n})`, `What everyone wrote (${RV.n})`)}</p><div>${RV.w.map(([w, c], k) => `<span dir="auto" style="--s:${(0.85 + 0.9 * c / mx).toFixed(2)};--c:var(--qz${k % 6})">${esc(w)}${c > 1 ? `<small>${c}</small>` : ''}</span>`).join('')}</div></div>`; }
    }
    f.innerHTML = h;
  }
  function floatRx(e) {
    let L = document.getElementById('mpFx'); if (!L) { L = document.createElement('div'); L.id = 'mpFx'; L.className = 'mp-fx'; document.body.appendChild(L); }
    if (L.childElementCount > 14) return;
    const s = document.createElement('span'); s.textContent = e; s.className = /\p{Extended_Pictographic}/u.test(e) && e.length <= 4 ? 'emo' : 'txt';
    s.style.setProperty('--x', (6 + Math.random() * 80) + '%'); s.style.setProperty('--r', (Math.random() * 30 - 15) + 'deg');
    L.appendChild(s); setTimeout(() => s.remove(), 2600);
  }
  /* ---------- challenge tools: chosen between questions, sent with the next answer ---------- */
  let PEND = null; const usedL = new Set();
  const usedAll = () => new Set([...usedL, ...String((SC && SC.used) || '').split(',').filter(Boolean)]);
  const nextI = () => st.ph === 'ready' ? st.i : st.i + 1;
  function pwx() { if (!PEND || PEND.i !== st.i || FAN) return {}; const o = { p: PEND.p.join(',') }; if (PEND.g) o.g = PEND.g; PEND.p.forEach(k => usedL.add(k)); PEND = null; return o; }
  function toolsBar() {
    if (TOOLS && usedAll().has('x2') && (usedAll().has('st') || !(SC && (SC.up || SC.dn))) && !(SC && SC.cap && !usedAll().has('cp'))) return '';
    if (!TOOLS || (Q && Q.n && nextI() >= Q.n)) return '';
    const u = usedAll(), on = k => PEND && PEND.i === nextI() && PEND.p.includes(k), nb = SC ? [SC.up, SC.dn].filter(Boolean) : [];

    return `<div class="mp-tools"><p>${B('أدواتك للسؤال القادم (كل أداة مرة واحدة)', 'Your tools for the next question (once each)')}</p><div class="mp-tb">
      ${u.has('x2') ? '' : `<button type="button" data-tool="x2" aria-pressed="${on('x2')}">×٢ ${B('ضاعف نقاطه', 'Double it')}</button>`}
      ${u.has('st') || !nb.length ? '' : `<button type="button" data-tool="st" aria-pressed="${on('st')}">${B('اخطف من جارك', 'Steal from a neighbour')}</button>`}
      ${SC && SC.cap && !u.has('cp') ? `<button type="button" class="cap" data-tool="cp" aria-pressed="${on('cp')}">${B('قرار الكابتن: نقاطك لكل فريقك', 'Captain’s call: your points to all your team')}</button>` : ''}</div>
      ${PEND && PEND.i === nextI() && PEND.p.includes('st') ? `<div class="mp-nb"><p>${B('ممن تخطف؟ ما تكسبه في السؤال القادم يُخصم منه', 'From whom? What you earn next is taken from them')}</p>${nb.map(x => `<button type="button" data-tg="${x.u}" aria-pressed="${PEND.g === x.u}"><span dir="auto">${x === SC.up ? '⬆' : '⬇'} ${esc(x.n)}</span><b>${x.s}</b></button>`).join('')}</div>` : ''}
      ${PEND && PEND.i === nextI() && PEND.p.length ? `<p class="mp-armed">${B('مفعّلة للسؤال القادم', 'Set for the next question')}</p>` : ''}</div>`;
  }
  function toolsBind() {
    root.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { const k = b.dataset.tool, i = nextI(); if (!PEND || PEND.i !== i) PEND = { i, p: [] }; if (PEND.p.includes(k)) { PEND.p = PEND.p.filter(x => x !== k); if (k === 'st') PEND.g = null; } else { PEND.p.push(k); if (k === 'st') PEND.g = SC && SC.up ? SC.up.u : SC && SC.dn ? SC.dn.u : null; } buzz(20); tone(700, .12); shown = ''; draw(); });
    root.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { if (PEND) PEND.g = b.dataset.tg; buzz(15); shown = ''; draw(); });
    const sk = root.querySelector('[data-skip]'); if (sk) sk.onclick = async () => { if (!confirm(T('تنسحب من هذا السؤال وتأخذ متوسط نقاطك؟ (مرة واحدة في المسابقة)', 'Skip this question and take your average? (once per quiz)'))) return; usedL.add('sk'); sent = st.i; try { await R.child('an/' + st.i + '/' + uid).set({ a: -1, t: TS, p: 'sk' }); } catch (e) {} shown = ''; draw(); };
  }
  const skipBtn = () => TOOLS && Q && Q.pw && !usedAll().has('sk') && sent !== st.i ? `<button type="button" class="mp-skip" data-skip>${B('انسحب من السؤال بمتوسط نقاطك', 'Skip it for your average')}</button>` : '';
  function pwNote() {
    const p = [].concat(SC.pw || []), out = [];
    if (p.includes('x2')) out.push(`×٢ ${B('ضاعفت نقاط السؤال', 'You doubled this one')}`);
    if (p.includes('st')) out.push(`${B(`خطفت ${Math.max(0, SC.d || 0)} من ${esc(SC.tg || '')}`, `You took ${Math.max(0, SC.d || 0)} from ${esc(SC.tg || '')}`)}`);
    if (p.includes('sk') && Q && Q.type === 'game') out.push(`${B(`انسحبت وأخذت متوسطك: ${SC.d}`, `Skipped for your average: ${SC.d}`)}`);
    if (p.includes('cp')) out.push(B(`قرار الكابتن: أهديت ${SC.cn || 0} من زملائك ${SC.cg || 0} نقطة لكل واحد`, `Captain’s call: ${SC.cg || 0} points to each of ${SC.cn || 0} teammates`));
    if (SC.capby) out.push(B(`أهداك الكابتن «${esc(SC.capby)}» نقاطه`, `Your captain ${esc(SC.capby)} shared their points with you`));
    if (SC.hit) out.push(`${B(`خطف منك: ${esc(SC.hit)}`, `${esc(SC.hit)} took points from you`)}`);
    return out.length ? `<div class="mp-pwn">${out.map(x => `<p>${x}</p>`).join('')}</div>` : '';
  }
  // sounds made on the phone
  let acx = null;
  function tone(f, d, v) { try { acx = acx || new (window.AudioContext || window.webkitAudioContext)(); if (acx.state === 'suspended') acx.resume(); const o = acx.createOscillator(), g = acx.createGain(), t = acx.currentTime; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(v || .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(acx.destination); o.start(t); o.stop(t + d + .02); } catch (e) {} }
  /* ---------- a fan: follows the questions and the ranking, and cheers ---------- */
  let FAN = false, PIN = '', RIN = [], ANN = '', WU = null, wuGame = null;
  // each player's figure: a shape and a colour they chose ('%' + shape digit + colour digit, sent once on joining)
  const AVS = ['polygon(50% 0,61% 22%,85% 15%,78% 39%,100% 50%,78% 61%,85% 85%,61% 78%,50% 100%,39% 78%,15% 85%,22% 61%,0 50%,22% 39%,15% 15%,39% 22%)', 'polygon(50% 0,63% 27%,93% 25%,76% 50%,93% 75%,63% 73%,50% 100%,37% 73%,7% 75%,24% 50%,7% 25%,37% 27%)', 'circle(50%)', 'polygon(50% 0,100% 50%,50% 100%,0 50%)', 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)', 'polygon(50% 0,100% 22%,88% 72%,50% 100%,12% 72%,0 22%)'], AVC = ['#C9822B', '#2a7fa8', '#2e8b57', '#b0533a', '#7a4fb5', '#d14d8b', '#23336F', '#1f8f8a'];
  const avSt = a => { a = String(a || ''); if (!/^\d\d$/.test(a)) return ''; return `--fs:${AVS[+a[0]] || AVS[0]};--fc:${AVC[+a[1]] || AVC[0]};`; };
  const arenaFan = quiet => { const A = TOP && TOP.ar; if (!A || A.i !== st.i) return quiet ? '' : `<p>${B('التحدي جارٍ…', 'The challenge is on…')}</p>`;
    return `<div class="mp-arena">${A.g.map(gr => `<div class="mp-al" style="--c:var(--qz${gr.k % 6})"><b dir="auto">${esc(gr.n)}</b>${gr.p.map(x => `<i style="left:${x.p}%;${avSt(x.a)}" class="${x.d ? 'done' : ''}${x.n === me ? ' me' : ''}" title="${esc(x.n)}">${esc(x.n.charAt(0))}</i>`).join('')}</div>`).join('')}</div>`; };
  /* ---------- the watcher sees the question, who has answered, and after it who chose what ---------- */
  let PLN = {}, AN = {}, anI = null, plOn = false;
  function fanWatch() {
    if (!R) return;
    if (!plOn) { plOn = true; R.child('pl').on('value', s => { const v = s.val() || {}; PLN = {}; Object.keys(v).forEach(k => { if (v[k] && !v[k].w) PLN[k] = v[k].n; }); fanWho(); }); }
    if (anI !== st.i) { if (anI != null) R.child('an/' + anI).off(); anI = st.i; AN = {}; if (st.i >= 0) R.child('an/' + st.i).on('value', s => { AN = s.val() || {}; fanWho(); }); }
  }
  const chips = us => us.map(u => `<span class="mp-wn" dir="auto">${esc(PLN[u] || '')}</span>`).join('');
  function fanWho() {
    const el = root.querySelector('#mpWho'); if (!el || !FAN || !Q || Q.i !== st.i) return;
    const all = Object.keys(PLN), got = Object.keys(AN).filter(u => u in PLN).sort((a, b) => (AN[a].t || 0) - (AN[b].t || 0));
    if (st.ph === 'q') { el.innerHTML = `<p class="mp-wc">${B(`أجاب ${got.length} من ${all.length}`, `${got.length} of ${all.length} answered`)}</p><div class="mp-wl">${chips(got)}</div>`; return; }
    // after the question: under each option, the names that chose it; the right ones marked
    if (['mc', 'tf', 'poll'].includes(Q.type) && (Q.opts || []).length) {
      const okS = new Set([].concat(OK == null ? [] : OK).map(Number));
      el.innerHTML = `<ol class="mp-fo mp-fr">${Q.opts.map((o, j) => { const by = got.filter(u => [].concat(AN[u].a).map(Number).includes(j)); const ok = Q.type !== 'poll' && okS.has(j);
        return `<li class="${ok ? 'ok' : Q.type !== 'poll' && OK != null ? 'no' : ''}" style="--c:var(--qz${j})"><p><i>${LET()[j]}</i> <span dir="auto">${esc(o)}</span>${ok ? ' <b>✓</b>' : ''}<em>${by.length}</em></p>${by.length ? `<div class="mp-wl">${chips(by)}</div>` : ''}</li>`; }).join('')}</ol>${all.length > got.length ? `<p class="mp-wc">${B(`لم يجب: ${all.length - got.length}`, `No answer: ${all.length - got.length}`)}</p>` : ''}`;
      return; }
    el.innerHTML = `<p class="mp-wc">${B(`أجاب ${got.length} من ${all.length}`, `${got.length} of ${all.length} answered`)}</p>${Q.type !== 'game' ? `<div class="mp-wl">${got.map(u => `<span class="mp-wn" dir="auto">${esc(PLN[u] || '')}${['num', 'word'].includes(Q.type) && AN[u].a != null ? ': <b>' + esc(String(AN[u].a).slice(0, 20)) + '</b>' : ''}</span>`).join('')}</div>` : ''}`;
  }
  function fanHtml(html) {
    fanWatch(); setTimeout(fanWho, 0);
    const cur = Q && Q.i === st.i;
    if (st.ph === 'q' && cur && Q.type === 'game') return `<div class="mp-wait"><p class="mp-qt" dir="auto">${esc(Q.q)}</p>${arenaFan()}</div>` + rxBar();
    if (st.ph === 'q' && cur) return `<div class="mp-wait mp-fan"><p class="mp-qt" dir="auto">${esc(Q.q)}</p>${Q.img ? `<img class="mp-img" src="${Q.img}" alt="">` : ''}${(Q.opts || []).length ? `<ol class="mp-fo">${Q.opts.map((o, j) => `<li style="--c:var(--qz${j})"><i>${LET()[j]}</i> <span dir="auto">${esc(o)}</span></li>`).join('')}</ol>` : ''}<div class="mp-who" id="mpWho"></div></div>` + rxBar();
    if (st.ph === 'rev' && cur && Q.type !== 'game') return `<div class="mp-wait mp-fan"><p class="mp-qt" dir="auto">${esc(Q.q)}</p><div class="mp-who" id="mpWho"></div>${TOP ? `<p class="mp-big">${B('الترتيب', 'Ranking')}</p>${topList()}` : ''}</div>` + rxBar();
    if ((st.ph === 'rev' || st.ph === 'lb') && TOP) return `<div class="mp-res end"><p class="mp-big">${B('الترتيب', 'Ranking')}</p>${topList()}</div>` + rxBar();
    if (st.ph === 'end') return html;
    return `<div class="mp-wait"><p class="mp-sym"></p><p class="mp-big">${B('أنت متفرج', 'You are watching')}</p><p>${B('تشاهد الأسئلة ومن أجاب عليها، وتشجّع بالتفاعلات.', 'See each question and who answered it, and cheer.')}</p></div>` + rxBar();
  }
  let game = null;
  function playGame() {
    if (sent === st.i) return screen(`<div class="mp-wait"><p class="mp-big">${B('أنهيت التحدي!', 'Challenge done!')}</p><p>${B('بانتظار البقية…', 'Waiting for the others…')}</p>${arenaFan()}</div>`);
    screen(`<div class="mp-q mp-gq"><div class="mp-bar"><i id="mpBar"></i></div><div class="mp-strip" id="mpStrip">${arenaFan(true)}</div><div class="mp-gbox" id="mpG"></div></div>`, 'q');
    let send = async score => {
      if (sent === st.i) return; sent = st.i; buzz(30); if (game) { game.stop(); game = null; }
      try { MYA[st.i] = Math.round(score); keepH(); await R.child('an/' + st.i + '/' + uid).set(Object.assign({ a: Math.round(score), t: TS }, pwx())); } catch (e) {}
      shown = ''; draw();
    };
    // tug of war: pulls go up live (a few times a second) so the rope moves on every screen
    let tug = {};
    if (Q.g === 'tug' || Q.g === 'race' || Q.g === 'sum') {
      const k = Q.ts && Q.ts[uid] != null ? Q.ts[uid] : 0; let pos = 0, pend = 0, lastW = 0, tm = null;
      const ref = R.child('tgp'), on = v => { const w = v.val(); pos = Array.isArray(w) ? w : +w || 0; }; ref.on('value', on);
      const push = () => { tm = null; lastW = Date.now(); R.child('tg/' + uid).set({ c: pend }).catch(() => {}); };
      tug = { side: { k, name: Q.tn ? Q.tn[k] : '' }, rope: () => pos, lanes: () => Array.isArray(pos) ? pos : null, names: Q.tn || [], cols: Q.tc || null, onTap: n => { pend = n; if (!tm) tm = setTimeout(push, Math.max(0, 350 - (Date.now() - lastW))); } };
      const was = send; send = async sc => { ref.off('value', on); if (tm) { clearTimeout(tm); push(); } return was(sc); };
    }
    game = MDGames.run(Q.g, root.querySelector('#mpG'), Object.assign({ seed: Q.seed, ar: Q.L !== 'en', left: () => Math.max(0, 1 - (now() - st.t0) / 1000 / st.dur), finish: s2 => send(s2), tick: () => buzz(10), bad: () => buzz(60) }, tug));
    const bar = root.querySelector('#mpBar'), g = game;
    let lastP = -1, lastW = 0;
    tick = setInterval(() => {
      if (!['tug', 'race', 'sum'].includes(Q.g) && Date.now() - lastW > 900) { const v = Math.round(g.score() || 0); if (v !== lastP) { lastP = v; lastW = Date.now(); R.child('tg/' + uid).set({ c: v }).catch(() => {}); } }
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
      : T2 === 'stage' ? `<textarea class="mp-in mp-ta" id="mpIn" maxlength="140" rows="3" dir="auto" placeholder="${isAr() ? 'اكتب تصريحك (١٤٠ حرفًا)' : 'Your statement (140 characters)'}"></textarea>`
      : T2 === 'open' ? `<input class="mp-in" id="mpIn" maxlength="40" dir="auto" autocomplete="off" placeholder="${isAr() ? 'اكتب إجابتك' : 'Write your answer'}">`
      : T2 === 'match' ? `<div class="mp-mrows" id="mpMr">${(Q.items || []).map((v, j) => `<button type="button" class="mp-mrow" data-l="${j}" style="--c:var(--qz${j % 6})"><span dir="auto">${esc(v)}</span><i>↔</i><b dir="auto">…</b></button>`).join('')}</div><p class="mp-hint" id="mpMh"></p><div class="mp-ord" id="mpOrd">${(Q.opts2 || []).map((v, j) => `<button type="button" data-o="${j}" style="--c:#6b7393"><span dir="auto">${esc(v)}</span></button>`).join('')}</div><button type="button" class="mg-btn" id="mpUndo">${B('⌫ تراجع', '⌫ Undo')}</button>`
      : T2 === 'rapid' ? `<p class="mp-rk" id="mpRk"></p><p class="mp-rs" id="mpRs" dir="auto"></p><div class="mp-rtf"><button type="button" class="t" data-tf="1">${B('صح', 'True')}</button><button type="button" class="f" data-tf="0">${B('خطأ', 'False')}</button></div>`
      : `<p class="mp-hint">${B('اضغطها بالترتيب من الأول إلى الأخير', 'Tap them in order, first to last')}</p><ol class="mp-picked" id="mpPk"></ol><div class="mp-ord" id="mpOrd">${(Q.items || []).map((v, j) => `<button type="button" data-o="${j}" style="--c:var(--qz${j % 6})"><span dir="auto">${esc(v)}</span></button>`).join('')}</div><button type="button" class="mg-btn" id="mpUndo">${B('⌫ تراجع', '⌫ Undo')}</button>`;
    screen(`<div class="mp-q mp-tq"><div class="mp-bar"><i id="mpBar"></i></div><p class="mp-qt" dir="auto">${esc(Q.q)}</p>${pic}${inner}
      ${Q.bet ? `<button type="button" class="mp-bet" id="mpBet" aria-pressed="${bet}">${B('أراهن على إجابتي (+٣٠٠ أو −٣٠٠)', 'I bet on my answer (+300 or −300)')}</button>` : ''}
      <button type="button" class="btn solid mp-send" id="mpSend">${B('إرسال', 'Send')}</button></div>`, 'q');
    const inp = root.querySelector('#mpIn'), go = root.querySelector('#mpSend'), picked = [];
    const send = async a => { sent = st.i; buzz(30); try { MYA[st.i] = a; keepH(); await R.child('an/' + st.i + '/' + uid).set(Object.assign({ a, t: TS }, bet ? { b: true } : {}, pwx())); } catch (e) {} shown = ''; draw(); };
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
    if (['num', 'word', 'order', 'open', 'match', 'rapid', 'stage'].includes(Q.type) && sent !== st.i) return textQ();
    if (sent === st.i) return screen(`<div class="mp-wait"><p class="mp-big">${B('وصلت إجابتك', 'Answer sent')}</p><p>${B('انتظر النتيجة…', 'Wait for the result…')}</p></div>`);
    const multi = !!Q.multi, pick = new Set();
    const veil = Q.img && Q.rv ? `<div class="md-pic mp-pic"><img src="${Q.img}" alt=""><div class="md-veil go">${Array.from({ length: 24 }, (_, k) => `<i style="--d:${(Math.random() * Q.rv * .85).toFixed(2)}s"></i>`).join('')}</div></div>` : Q.img ? `<img class="mp-img" src="${Q.img}" alt="">` : '';
    screen(`<div class="mp-q"><div class="mp-bar"><i id="mpBar"></i></div><p class="mp-qt" dir="auto">${esc(Q.q)}</p>${veil}${multi ? `<p class="mp-hint">${B('اختر كل الإجابات الصحيحة ثم أرسل', 'Choose every right answer, then send')}</p>` : ''}${Q.bet ? `<button type="button" class="mp-bet" id="mpBet" aria-pressed="${bet}">${B('أراهن على إجابتي (+٣٠٠ أو −٣٠٠)', 'I bet on my answer (+300 or −300)')}</button>` : ''}
      <div class="mp-btns n${Q.opts.length}">${Q.opts.map((o, j) => `<button type="button" data-j="${j}" style="--c:var(--qz${j})"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></button>`).join('')}</div>
      ${multi ? `<button type="button" class="btn solid mp-send" id="mpSend" disabled>${B('إرسال', 'Send')}</button>` : ''}</div>`, 'q');
    const send = async a => {
      sent = st.i; buzz(30);
      try { MYA[st.i] = a; keepH(); await R.child('an/' + st.i + '/' + uid).set(Object.assign({ a, t: TS }, bet ? { b: true } : {}, pwx())); } catch (e) { /* the time ended first */ }
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
      if (left <= 5 && left > 0 && Math.ceil(left) !== tick.s) { tick.s = Math.ceil(left); tone(1300, .05, .04); }
      if (left <= 0) { clearInterval(tick); root.querySelectorAll('[data-j]').forEach(b => b.disabled = true); }
    }, 100);
  }
  // the standings as the big screen shows them: top teams and top five
  const topList = () => !TOP ? '' : `<div class="mp-top5">${TOP.d ? `<p class="mp-gold">${B('بقي سؤال واحد بنقاط مضاعفة', 'One question left, worth double')}</p>` : ''}${TOP.t && TOP.t.length ? `<ol class="mp-tl">${TOP.t.map(t => `<li style="--c:var(--qz${t.k % 6})"><span dir="auto">${esc(t.n)}</span><b>${t.s}</b></li>`).join('')}</ol>` : ''}<ol class="mp-tops">${(TOP.p || []).map((p, k) => `<li${p.n === me ? ' class="me"' : ''}><i>${k + 1}</i>${p.w && p.w !== k + 1 ? `<u class="${p.w > k + 1 ? 'up' : 'dn'}">${p.w > k + 1 ? '▲' : '▼'}${Math.abs(p.w - k - 1)}</u>` : ''}<span dir="auto">${esc(p.n)}</span>${p.d ? `<q>${p.d > 0 ? '+' : ''}${p.d}</q>` : ''}<b>${p.s}</b></li>`).join('')}${!FAN && SC && SC.r && !(TOP.p || []).some(p => p.n === me) ? `<li class="me far"><i>${SC.r}</i><span dir="auto">${esc(me)}</span><b>${SC.s}</b></li>` : ''}</ol></div>`;
  function result() {
    // wait for this question's own result, not the last one
    if (!SC || !OK || (SC.q != null && SC.q !== st.i)) { if (st.ph === 'rev') screen(`<div class="mp-wait"><p>${B('لحظة…', 'One moment…')}</p></div>`); shown = ''; return; }
    if (st.ph === 'lb' && TOP) return screen(`<div class="mp-res end"><p class="mp-big">${B('الترتيب', 'Ranking')}</p>${topList()}<p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p></div>` + rxBar(), 'end');
    if (game) { game.stop(); game = null; }
    if (Q && Q.i === st.i && (Q.type === 'poll' || Q.type === 'open' || Q.type === 'stage')) return screen(`<div class="mp-res end"><p class="mp-sym"></p><p class="mp-big">${SC.a ? B('شكرًا، وصلت مشاركتك', 'Thanks, your answer is in') : B('انتهى الوقت', 'Time’s up')}</p><p>${(PM ? '' : B('انظر النتائج على الشاشة', 'See the results on the screen'))}</p><p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p></div>` + rxBar(), 'end');
    // skipped for the average: no right or wrong, just the answer and what the skip brought
    if (Q && Q.i === st.i && Q.type !== 'game' && [].concat(SC.pw || []).includes('sk')) {
      const ol = v => `<ol class="mp-ordr">${[].concat(v).map(z => `<li dir="auto">${esc(z)}</li>`).join('')}</ol>`;
      const ans = Q.type === 'order' || Q.type === 'match' ? ol(OK) : ['num', 'word'].includes(Q.type) ? `<b dir="auto">${esc(OK)}${Q.unit ? ' ' + esc(Q.unit) : ''}</b>` : Q.type === 'rapid' ? '' : `<span dir="auto">${[].concat(OK).map(j => `${LET()[j]}) ${esc(Q.opts[j])}`).join(' · ')}</span>`;
      return screen(`<div class="mp-res end"><p class="mp-big">${B('انسحبت من هذا السؤال', 'You skipped this one')}</p>
        ${ans ? `<p class="mp-right">${B('الإجابة الصحيحة:', 'The right answer:')} ${ans}</p>` : ''}
        <p class="mp-plus">+${SC.d || 0}</p><p>${B('متوسط نقاطك في الأسئلة السابقة', 'Your average from the earlier questions')}</p>
        <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), 'end');
    }
    if (Q && Q.i === st.i && (Q.type === 'match' || Q.type === 'rapid')) {
      const ok2 = SC.c; if (st.ph === 'rev') buzz(ok2 ? [40, 60, 40] : 200);
      const key = Q.type === 'match' ? `<ol class="mp-ordr">${[].concat(OK).map(v => `<li dir="auto">${esc(v)}</li>`).join('')}</ol>` : '';
      return screen(`<div class="mp-res ${ok2 ? 'good' : 'bad'}"><p class="mp-sym">${ok2 ? '✓' : SC.a ? '◐' : ''}</p>
        <p class="mp-big">${SC.a ? B(`أصبت ${SC.g || 0} من ${SC.n || (Q.items || []).length}`, `${SC.g || 0} of ${SC.n || (Q.items || []).length} right`) : B('انتهى الوقت', 'Time’s up')}</p>${key ? `<p class="mp-right">${B('التوصيل الصحيح:', 'The right links:')} ${key}</p>` : ''}
        ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : SC.d < 0 ? `<p class="mp-plus neg">${SC.d}</p>` : ''}${SC.b ? `<p class="mp-streak">${ok2 ? B('ربحت الرهان', 'You won the bet') : B('خسرت الرهان', 'You lost the bet')}</p>` : ''}
        <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), ok2 ? 'good' : 'bad');
    }
    if (Q && Q.i === st.i && ['num', 'word', 'order'].includes(Q.type)) {
      const ok2 = SC.c, ans = Q.type === 'order' ? `<ol class="mp-ordr">${[].concat(OK).map(v => `<li dir="auto">${esc(v)}</li>`).join('')}</ol>` : `<b dir="auto">${esc(OK)}${Q.unit ? ' ' + esc(Q.unit) : ''}</b>`;
      if (st.ph === 'rev') buzz(ok2 ? [40, 60, 40] : 200);
      return screen(`<div class="mp-res ${ok2 ? 'good' : 'bad'}"><p class="mp-sym">${ok2 ? '✓' : SC.a ? '✕' : ''}</p>
        <p class="mp-big">${Q.type === 'num' ? (ok2 ? B('من الأقرب!', 'One of the closest!') : B('ليس الأقرب', 'Not the closest')) : ok2 ? B('إجابة صحيحة', 'Correct') : SC.a ? B('إجابة خاطئة', 'Not this time') : B('انتهى الوقت', 'Time’s up')}</p>
        <p class="mp-right">${B('الجواب:', 'Answer:')} ${ans}${Q.type === 'num' && SC.g != null ? `<br>${B('إجابتك:', 'Yours:')} ${esc(SC.g)}` : ''}</p>
        ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : SC.d < 0 ? `<p class="mp-plus neg">${SC.d}</p>` : ''}${SC.b ? `<p class="mp-streak">${ok2 ? B('ربحت الرهان', 'You won the bet') : B('خسرت الرهان', 'You lost the bet')}</p>` : ''}
        <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), ok2 ? 'good' : 'bad');
    }
    if (Q && Q.type === 'game' && Q.i === st.i) {
      return screen(`<div class="mp-res ${SC.c ? 'good' : 'bad'}"><p class="mp-sym">${SC.tw != null ? (SC.tw ? '' : '') : SC.c ? '' : ''}</p>${SC.tw != null ? `<p class="mp-big">${SC.tw ? B('فاز فريقك!', 'Your side won!') : B('خسر فريقك هذه المرة', 'Your side lost this time')}</p><p>${B('شدّاتك', 'Your pulls')}: ${SC.g || 0}</p>` : `<p class="mp-big">${B('نتيجتك في التحدي', 'Your challenge score')}: ${SC.g || 0}</p>`}
        ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : ''}<p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
        ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}</div>` + rxBar(), SC.c ? 'good' : 'bad');
    }
    const ok = SC.c, right = Q && Q.i === st.i ? [].concat(OK).map(j => `${LET()[j]}) ${esc(Q.opts[j])}`).join(' · ') : '';
    if (st.ph === 'rev') { buzz(ok ? [40, 60, 40] : 200); ok ? (tone(660, .12), setTimeout(() => tone(990, .2), 120)) : tone(220, .3); }
    screen(`<div class="mp-res ${ok ? 'good' : 'bad'}"><p class="mp-sym">${ok ? '✓' : SC.a ? '✕' : ''}</p>
      <p class="mp-big">${ok ? B('إجابة صحيحة', 'Correct') : SC.a ? B('إجابة خاطئة', 'Not this time') : B('انتهى الوقت', 'Time’s up')}</p>
      ${!ok && right ? `<p class="mp-right">${B('الإجابة الصحيحة:', 'Right answer:')} <span dir="auto">${right}</span></p>` : ''}
      ${SC.d > 0 ? `<p class="mp-plus">+${SC.d}</p>` : SC.d < 0 ? `<p class="mp-plus neg">${SC.d}</p>` : ''}${SC.b ? `<p class="mp-streak">${ok ? B('ربحت الرهان', 'You won the bet') : B('خسرت الرهان', 'You lost the bet')}</p>` : ''}${SC.k >= 2 ? `<p class="mp-streak">${B(`${SC.k} إجابات صحيحة متتالية`, `${SC.k} right in a row`)}</p>` : ''}
      <p class="mp-rank">${B(`مركزك: ${SC.r}`, `Your place: ${SC.r}`)}</p>
      ${SC.gap != null && SC.r > 1 ? `<p class="mp-gap">${B(`تحتاج ${SC.gap + 1} نقطة لتتجاوز ${esc(SC.above)}`, `You need ${SC.gap + 1} points to pass ${esc(SC.above)}`)}</p>` : SC.r === 1 ? `<p class="mp-gap">${B('أنت في الصدارة!', 'You are in the lead!')}</p>` : ''}
      ${SC.tr ? `<p class="mp-tm" style="--c:var(--qz${(SC.t) % 6})">${B(`فريقك ${esc(TEAMS ? TEAMS[SC.t] : '')} في المركز ${SC.tr}`, `Your team ${esc(TEAMS ? TEAMS[SC.t] : '')} is in place ${SC.tr}`)}</p>` : ''}</div>` + rxBar(), ok ? 'good' : 'bad');
  }

  /* ---------- the player's own record of the quiz: kept on this phone, shown and saved at the end ---------- */
  let HIST = {}, MYA = {};
  const HKEY = () => 'md-hist-' + (R ? R.key : '');
  const keepH = () => { try { sessionStorage.setItem(HKEY(), JSON.stringify({ HIST, MYA })); } catch (e) {} };
  const loadH = () => { try { const v = JSON.parse(sessionStorage.getItem(HKEY()) || 'null'); if (v) { HIST = v.HIST || {}; MYA = v.MYA || {}; } } catch (e) {} };
  function note() {
    const t = Q.type, gm = t === 'game' && window.MDGames ? MDGames.byId(Q.g) : null, a = MYA[Q.i], O = Q.opts || [], IT = Q.items || [];
    const pick = v => [].concat(v == null ? [] : v).map(j => O[j] != null ? O[j] : j).join('، ');
    const ok = ['mc', 'tf'].includes(t) ? pick(OK) : ['num', 'word'].includes(t) ? `${OK == null ? '' : OK}${Q.unit ? ' ' + Q.unit : ''}` : t === 'order' ? [].concat(OK || []).join(' ← ') : '';
    const mine = a == null ? '' : ['mc', 'tf', 'poll'].includes(t) ? pick(a) : t === 'order' ? [].concat(a).map(j => IT[j] != null ? IT[j] : j).join(' ← ') : ['num', 'word', 'open', 'stage'].includes(t) ? String(a) : '';
    HIST[Q.i] = { n: Q.qn || Q.i + 1, t, q: gm ? (Q.L === 'en' ? gm.en : gm.ar) : (Q.q || ''), ok, me: mine, c: !!SC.c, d: SC.d || 0, sk: [].concat(SC.pw || []).includes('sk'), judged: !['poll', 'open', 'stage', 'game'].includes(t), done: a != null };
    keepH();
  }
  const hList = () => Object.values(HIST).filter(h => h.t !== 'stage').sort((a, b) => a.n - b.n);
  function review() {
    const L = hList(); if (!L.length) return '';
    const right = L.filter(h => h.judged && h.c).length, judged = L.filter(h => h.judged).length;
    return `<details class="mp-review"><summary>${B(`مراجعة إجاباتك (${right} من ${judged} صحيحة)`, `Review your answers (${right} of ${judged} right)`)}</summary><ol>${L.map(h => `<li class="${h.judged ? (h.c ? 'ok' : 'no') : ''}"><b dir="auto">${esc(h.q)}</b>
      ${h.judged ? `<span>${h.sk ? B('انسحبت', 'Skipped') : h.c ? '✓ ' + B('صحيحة', 'Right') : h.done ? '✕ ' + B('إجابتك:', 'Yours:') + ` <i dir="auto">${esc(h.me)}</i>` : B('لم تُجب', 'No answer')}</span>${!h.c && h.ok ? `<span>${B('الصحيحة:', 'Right answer:')} <i dir="auto">${esc(h.ok)}</i></span>` : ''}` : h.me ? `<span>${B('إجابتك:', 'Yours:')} <i dir="auto">${esc(h.me)}</i></span>` : ''}
      ${h.d ? `<em>${h.d > 0 ? '+' : ''}${h.d}</em>` : ''}</li>`).join('')}</ol></details>`;
  }

  // the journey: places after every question, worked out from everyone's points
  function jData() {
    const J = TOP && TOP.jr; if (!J || !J.s || !J.s.length || !J.s[0] || J.s[0].length < 2) return null;
    const me2 = J.k.indexOf(uid.slice(0, 8)), steps = J.s[0].length, n = J.s.length;
    const rk = [...Array(steps).keys()].map(t => { const ord = [...Array(n).keys()].sort((a, b) => J.s[b][t] - J.s[a][t]); const r = []; ord.forEach((p, k) => { r[p] = k + 1; }); return r; });
    const line = p => rk.map(r => r[p]);
    let st = null;
    if (me2 >= 0) {
      const L = line(me2); let up = 0, upAt = 0, dn = 0, dnAt = 0; const best = Math.min(...L);
      for (let t = 1; t < steps; t++) { const d = L[t - 1] - L[t]; if (d > up) { up = d; upAt = t; } if (-d > dn) { dn = -d; dnAt = t; } }
      st = { L, best, bestAt: L.indexOf(best), up, upAt, dn, dnAt, lead: L.filter(v => v === 1).length, end: L[steps - 1] };
    }
    return { J, n, steps, me: me2, line, st };
  }
  function jSvg(D, W, H) {
    const pl = 30, pr = 14, pt = 12, pb = 26, show = Math.min(D.n, 12), N = Math.max(D.n, 2);
    const X = t => pl + (W - pl - pr) * t / (D.steps - 1), Y = r => pt + (H - pt - pb) * (Math.min(r, N) - 1) / (N - 1);
    const pts = p => D.line(p).map((r, t) => `${X(t).toFixed(1)},${Y(r).toFixed(1)}`).join(' ');
    let g = '';
    for (let p = 0; p < D.n; p++) if (p !== D.me && p < show) g += `<polyline points="${pts(p)}" fill="none" stroke="var(--qz${p % 6})" stroke-opacity=".8" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (D.me >= 0) { const L = D.line(D.me); g += `<polyline points="${pts(D.me)}" fill="none" stroke="#e0a458" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>` + L.map((r, t) => `<circle cx="${X(t)}" cy="${Y(r)}" r="${t === L.length - 1 ? 6 : 3.5}" fill="#e0a458"/>`).join(''); }
    const stp = Math.ceil(D.steps / 10), ax = [...Array(D.steps).keys()].filter(t => D.steps <= 12 || t === D.steps - 1 || (t % stp === 0 && D.steps - 1 - t >= stp / 2 + .5)).map(t => `<text x="${X(t)}" y="${H - 6}" text-anchor="middle">${t + 1}</text>`).join('');
    const ay = [1, Math.ceil(N / 2), N].filter((v, k, a) => a.indexOf(v) === k).map(r => `<text x="${pl - 8}" y="${Y(r) + 4}" text-anchor="end">${r}</text>`).join('');
    return `<svg class="mp-jsvg" viewBox="0 0 ${W} ${H}" dir="ltr" role="img" aria-label="${T('مسار مركزك بعد كل سؤال', 'Your place after each question')}">${g}<g class="mp-jax">${ax}${ay}</g></svg>`;
  }
  // Arabic counting: one, two, three to ten, eleven and more
  const arN = (n, one, two, few, many, pre) => n === 1 ? one : n === 2 ? two : `${pre ? pre + ' ' : ''}${n} ${n % 100 >= 3 && n % 100 <= 10 ? few : many}`;

  const TITLE = { fast: ['الأسرع', 'The fastest'], run: ['القنّاص', 'The sniper'], back: ['العائد', 'The comeback'], spirit: ['روح الميدان', 'Spirit of the game'], bold: ['المغامر', 'The daring one'], games: ['بطل التحديات', 'Challenge champion'] };
  const myTitles = () => (TOP && TOP.aw || []).filter(a => a.u === uid.slice(0, 8));
  function titlesHtml() {
    const L = TOP && TOP.aw || []; if (!L.length) return '';
    return `<div class="mp-titles"><p class="mp-jt">${B('ألقاب المسابقة', 'The titles')}</p>${L.map(a => `<div class="mp-ttl${a.u === uid.slice(0, 8) ? ' me' : ''}"><b>${B(TITLE[a.k][0], TITLE[a.k][1])}</b><span dir="auto">${a.u === uid.slice(0, 8) ? B('أنت!', 'You!') : esc(a.n)}</span><small>${esc(isAr() ? a.ar : a.en)}</small></div>`).join('')}</div>`;
  }
  function journeyHtml() {
    const D = jData(); if (!D || D.me < 0 || D.n < 2) return '';
    const S = D.st, q = t => T(`السؤال ${t + 1}`, `question ${t + 1}`), lines = [];
    if (S.lead) lines.push(B(`تصدّرت الترتيب ${arN(S.lead, 'في سؤال واحد', 'في سؤالين', 'أسئلة', 'سؤالًا', 'في')}`, `You led after ${S.lead} question${S.lead > 1 ? 's' : ''}`));
    else lines.push(B(`أفضل مركز وصلته: ${S.best} بعد ${q(S.bestAt)}`, `Best place: ${S.best}, after ${q(S.bestAt)}`));
    if (S.up) lines.push(B(`أكبر صعود: ${arN(S.up, 'مركز واحد', 'مركزان', 'مراكز', 'مركزًا')} في ${q(S.upAt)}`, `Biggest climb: ${S.up} place${S.up > 1 ? 's' : ''} at ${q(S.upAt)}`));
    if (S.dn) lines.push(B(`أكبر تراجع: ${arN(S.dn, 'مركز واحد', 'مركزان', 'مراكز', 'مركزًا')} في ${q(S.dnAt)}`, `Biggest drop: ${S.dn} place${S.dn > 1 ? 's' : ''} at ${q(S.dnAt)}`));
    return `<div class="mp-journey"><p class="mp-jt">${B('رحلتك في المسابقة', 'Your journey')}</p>${jSvg(D, 340, 190)}<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul></div>`;
  }

  /* ---------- the replay: the whole quiz as a race, the camera following this player ----------
     Runners stand at their points after each question; the gaps on the track are the gaps in points. */
  let RP = null;
  function replayHtml() {
    const D = jData(); if (!D || D.me < 0) return '';
    return `<div class="mp-rp" id="mpRp"><div class="mp-rphud"><b id="mpRpQ"></b><span id="mpRpR"></span></div><div class="mp-rpview"><div class="mp-rpworld" id="mpRpW"></div><span class="mp-rpahead" id="mpRpA" dir="auto"></span></div><button type="button" class="mp-rpagain" id="mpRpGo">${B('أعد السباق', 'Replay the race')}</button></div>`;
  }
  function replayRun() {
    const box = root.querySelector('#mpRp'), D = jData(); if (!box || !D || D.me < 0) return;
    clearTimeout(RP);
    const view = box.querySelector('.mp-rpview'), world = box.querySelector('#mpRpW'), VW = view.clientWidth || 340, VH = view.clientHeight || 220;
    const J = D.J, n = Math.min(D.n, 30), max = Math.max(1, ...J.s.map(a => Math.max(...a)));
    const lanes = Math.min(n, 7), mid = Math.floor(lanes / 2), lane = []; let k = 0;
    for (let p = 0; p < n; p++) { if (p === D.me) { lane[p] = mid; continue; } let l = k % lanes; if (l === mid && lanes > 1) { k++; l = k % lanes; } lane[p] = l; k++; }
    const WW = Math.max(VW * 3, 900), x0 = 60, X = v => x0 + (WW - x0 - 80) * v / max, LH = (VH - 40) / lanes, Y = l => 26 + l * LH + LH / 2;
    world.style.width = WW + 'px';
    world.innerHTML = `<i class="mp-rpstart" style="left:${x0}px"></i><i class="mp-rpfin" style="left:${WW - 60}px"></i>` + [...Array(lanes).keys()].map(l => `<i class="mp-rplane" style="top:${26 + l * LH}px;height:${LH}px"></i>`).join('')
      + [...Array(n).keys()].map(p => `<em class="mp-rpr${p === D.me ? ' me' : ''}" data-p="${p}" style="--c:var(--qz${p % 6});${avSt((J.a || [])[p])}top:${Y(lane[p]) + (p === D.me ? 0 : (p % 3 - 1) * 4)}px;left:${x0}px"><span>${esc((J.n[p] || '?').trim().charAt(0))}</span><small dir="auto">${esc(p === D.me ? T('أنت', 'You') : J.n[p] || '')}</small></em>`).join('');
    const R = [...world.querySelectorAll('.mp-rpr')], q = box.querySelector('#mpRpQ'), r = box.querySelector('#mpRpR');
    const at = t => {   // t = -1 is the start line
      R.forEach(e => { const p = +e.dataset.p; e.style.left = X(t < 0 ? 0 : J.s[p][t]) + 'px'; });
      const meX = X(t < 0 ? 0 : J.s[D.me][t]); world.style.transform = `translateX(${Math.min(0, Math.max(VW - WW, VW * .55 - meX))}px)`;
      q.textContent = t < 0 ? T('انطلق السباق', 'And they are off') : T(`بعد السؤال ${t + 1}`, `After question ${t + 1}`);
      if (t >= 0) { const rank = D.line(D.me)[t], prev = t ? D.line(D.me)[t - 1] : null; r.innerHTML = B(`مركزك ${rank}`, `Place ${rank}`) + (prev && prev !== rank ? ` <i class="${prev > rank ? 'up' : 'dn'}">${prev > rank ? '▲' : '▼'}${Math.abs(prev - rank)}</i>` : ''); } else r.textContent = '';
      box.classList.toggle('lead', t >= 0 && D.line(D.me)[t] === 1);
      // the leader, when the camera has left them behind its right edge
      const a = box.querySelector('#mpRpA'); if (t >= 0) { const L = [...Array(n).keys()].sort((u, v) => J.s[v][t] - J.s[u][t])[0], gap = J.s[L][t] - J.s[D.me][t], shift = Math.min(0, Math.max(VW - WW, VW * .55 - meX)); if (L !== D.me && X(J.s[L][t]) + shift > VW - 20) { a.innerHTML = `${esc(J.n[L] || '')} <b>+${gap}</b> ›`; a.classList.add('on'); } else a.classList.remove('on'); } else a.classList.remove('on');
    };
    world.classList.add('cut'); at(-1); void world.offsetWidth; world.classList.remove('cut');
    let t = -1; const go = () => { t++; if (t >= D.steps) { box.classList.add('end'); return; } at(t); RP = setTimeout(go, t === D.steps - 1 ? 1600 : 1400); };
    box.classList.remove('end'); RP = setTimeout(go, 900);
    box.querySelector('#mpRpGo').onclick = () => replayRun();
  }
  // a picture of the result and the questions, to keep or send
  async function saveCard(title) {
    const L = hList(), W = 1080, pad = 70, ar = document.documentElement.lang !== 'en';
    const cv = document.createElement('canvas'), x = cv.getContext('2d');
    const F = (w, s) => `${w} ${s}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
    const wrap = (txt, font, max) => { x.font = font; const out = []; let line = ''; String(txt).split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }); if (line) out.push(line); return out; };
    const rows = L.slice(0, 30).map(h => { const q = wrap(`${h.n}. ${h.q}`, F(600, 34), W - pad * 2 - 130); const sub = h.judged && !h.c && h.ok ? wrap((ar ? 'الصحيحة: ' : 'Right: ') + h.ok, F(400, 28), W - pad * 2 - 90) : []; return { h, q, sub, H: q.length * 46 + sub.length * 38 + 34 }; });
    const D = jData(), JH = D && D.me >= 0 && D.n > 1 ? 470 : 0;
    const TH = myTitles().length ? 46 : 0; const H = 560 + TH + JH + rows.reduce((s, r) => s + r.H, 0) + 140; cv.width = W; cv.height = H;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#26336b'); g.addColorStop(1, '#1a2350'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.direction = ar ? 'rtl' : 'ltr'; x.textAlign = 'center';
    x.fillStyle = '#e0a458'; x.font = F(700, 64); x.fillText(ar ? 'ميدان' : 'Maydan', W / 2, 120);
    x.fillStyle = '#fff'; wrap(title || '', F(700, 46), W - pad * 2).slice(0, 2).forEach((l, k) => x.fillText(l, W / 2, 200 + k * 58));
    const right = L.filter(h => h.judged && h.c).length, judged = L.filter(h => h.judged).length;
    x.fillStyle = '#f4ead8'; x.font = F(600, 40); x.fillText(`${me || ''}`, W / 2, 330);
    x.fillStyle = '#e0a458'; x.font = F(700, 52); x.fillText(ar ? `المركز ${SC && SC.r || '-'} · ${SC ? SC.s : 0} نقطة` : `Place ${SC && SC.r || '-'} · ${SC ? SC.s : 0} points`, W / 2, 405);
    x.fillStyle = '#c9cde0'; x.font = F(400, 32); x.fillText(ar ? `الإجابات الصحيحة: ${right} من ${judged}` : `Right answers: ${right} of ${judged}`, W / 2, 460);
    const MT = myTitles(); if (MT.length) { x.fillStyle = '#e0a458'; x.font = F(700, 34); x.fillText((ar ? 'لقبك: ' : 'Your title: ') + MT.map(a => TITLE[a.k][ar ? 0 : 1]).join(' · '), W / 2, 506); }
    if (JH) {   // the journey: my line over the others'
      const X0 = pad + 40, X1 = W - pad, Y0 = 520 + TH, Y1 = 520 + TH + JH - 120, N = Math.max(D.n, 2), show = Math.min(D.n, 12);
      const X = t => X0 + (X1 - X0) * t / (D.steps - 1), Y = r => Y0 + (Y1 - Y0) * (Math.min(r, N) - 1) / (N - 1);
      const COLS = ['#5b8def', '#e0a458', '#4fbf8f', '#e7766b', '#a77fe0', '#4cc3d9'];
      const draw = (p, col, w, a) => { x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.beginPath(); D.line(p).forEach((r, t) => t ? x.lineTo(X(t), Y(r)) : x.moveTo(X(t), Y(r))); x.stroke(); x.globalAlpha = 1; };
      for (let p = 0; p < show; p++) if (p !== D.me) draw(p, COLS[p % 6], 5, .8);
      draw(D.me, '#e0a458', 9, 1); x.fillStyle = '#e0a458'; D.line(D.me).forEach((r, t) => { x.beginPath(); x.arc(X(t), Y(r), 8, 0, 7); x.fill(); });
      x.fillStyle = '#c9cde0'; x.font = F(400, 26); x.textAlign = 'center'; x.fillText(ar ? 'مسار مركزك بعد كل سؤال' : 'Your place after each question', W / 2, Y1 + 62);
      const S = D.st; x.fillStyle = '#fff'; x.font = F(600, 30);
      x.fillText(ar ? `أفضل مركز ${S.best}${S.up ? ` · أكبر صعود ${S.up}` : ''}${S.dn ? ` · أكبر تراجع ${S.dn}` : ''}` : `Best place ${S.best}${S.up ? ` · biggest climb ${S.up}` : ''}${S.dn ? ` · biggest drop ${S.dn}` : ''}`, W / 2, Y1 + 112);
    }
    let y = 540 + TH + JH + (JH ? 40 : 0); const sx = ar ? W - pad : pad, mx = ar ? pad + 30 : W - pad - 30;
    x.textAlign = ar ? 'right' : 'left';
    rows.forEach(r => {
      x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.roundRect(pad - 20, y - 40, W - (pad - 20) * 2, r.H - 12, 22); x.fill();
      x.fillStyle = '#fff'; x.font = F(600, 34); r.q.forEach((l, k) => x.fillText(l, sx, y + k * 46));
      x.fillStyle = '#e0a458'; x.font = F(400, 28); r.sub.forEach((l, k) => x.fillText(l, sx, y + r.q.length * 46 + k * 38));
      if (r.h.judged) { x.textAlign = 'center'; x.font = F(700, 40); x.fillStyle = r.h.c ? '#6fd39b' : '#ff8a80'; x.fillText(r.h.c ? '✓' : '✕', mx, y + 4); }
      else if (r.h.d) { x.textAlign = ar ? 'left' : 'right'; x.font = F(700, 28); x.fillStyle = '#e0a458'; x.fillText('+' + r.h.d, ar ? pad + 4 : W - pad - 4, y); }
      x.textAlign = ar ? 'right' : 'left';
      y += r.H;
    });
    x.textAlign = 'center'; x.fillStyle = '#e0a458'; x.font = F(600, 34); x.fillText('alsamani.com/play/maydan', W / 2, H - 60);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], 'maydan.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file] }); } catch (e) { if (e && e.name === 'AbortError') return; }
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'maydan.png'; l.click();
  }
  /* ---------- the race as a short video to share: the same replay, drawn on a canvas and recorded on the phone ---------- */
  function raceVideo(title, onProgress) {
    const D = jData(); if (!D || D.me < 0 || !window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return Promise.reject(new Error('unsupported'));
    const S = 720, cv = document.createElement('canvas'); cv.width = S; cv.height = S; const x = cv.getContext('2d'), ar = document.documentElement.lang !== 'en', t = (a, e) => ar ? a : e;
    const F = (w, s2) => `${w} ${s2}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
    const J = D.J, n = Math.min(D.n, 12), max = Math.max(1, ...J.s.map(a => Math.max(...a)));
    const lanes = Math.min(n, 7), mid = Math.floor(lanes / 2), lane = []; let k = 0;
    for (let p = 0; p < n; p++) { if (p === D.me) { lane[p] = mid; continue; } let l = k % lanes; if (l === mid && lanes > 1) { k++; l = k % lanes; } lane[p] = l; k++; }
    const top = 150, bottom = S - 120, LH = (bottom - top) / lanes, WW = S * 3, x0 = 50, X = v => x0 + (WW - x0 - 70) * v / max, Y = l => top + l * LH + LH / 2;
    const shape = (cx, cy, r, a) => { const sh = AVS[+String(a || '')[0]] || 'circle(50%)'; x.beginPath(); if (/circle/.test(sh)) x.arc(cx, cy, r, 0, 7); else sh.replace(/polygon\(|\)/g, '').split(',').forEach((pt, i) => { const [px, py] = pt.trim().split(/\s+/).map(v => parseFloat(v) / 100); const X2 = cx - r + px * 2 * r, Y2 = cy - r + py * 2 * r; i ? x.lineTo(X2, Y2) : x.moveTo(X2, Y2); }); x.closePath(); };
    const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, STEP = Math.max(500, Math.min(1100, 14000 / (D.steps + 1))), HOLD = 2600, total = STEP * (D.steps + 1) + HOLD;
    const pos = (p, f) => { const i = Math.floor(f), u = ease(f - i), a = i <= 0 ? 0 : J.s[p][Math.min(i - 1, D.steps - 1)], b = J.s[p][Math.min(i, D.steps - 1)]; return i >= D.steps ? J.s[p][D.steps - 1] : a + (b - a) * u; };
    function frame(ms) {
      const f = Math.min(D.steps, ms / STEP), st = Math.min(D.steps - 1, Math.max(0, Math.round(f) - 1));
      const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#26336b'); g.addColorStop(1, '#151c44'); x.fillStyle = g; x.fillRect(0, 0, S, S);
      const meX = X(pos(D.me, f)), cam = Math.min(0, Math.max(S - WW, S * .55 - meX));
      x.save(); x.translate(cam, 0);
      for (let l = 0; l < lanes; l++) { x.fillStyle = l % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; x.fillRect(0, top + l * LH, WW, LH); }
      x.fillStyle = '#e0a458'; x.fillRect(x0 - 3, top, 6, bottom - top); for (let yy = top; yy < bottom; yy += 20) { x.fillStyle = ((yy - top) / 20) % 2 ? '#fff' : '#17153a'; x.fillRect(WW - 63, yy, 10, 10); x.fillStyle = ((yy - top) / 20) % 2 ? '#17153a' : '#fff'; x.fillRect(WW - 53, yy, 10, 10); x.fillRect(WW - 63, yy + 10, 10, 10); }
      const order = [...Array(n).keys()].sort((a, b) => (a === D.me) - (b === D.me));
      order.forEach(p => { const me2 = p === D.me, cx = X(pos(p, f)), cy = Y(lane[p]) + (me2 ? 0 : (p % 3 - 1) * 5), r = me2 ? 26 : 19;
        if (me2) { x.fillStyle = 'rgba(224,164,88,.35)'; x.beginPath(); x.arc(cx, cy, r + 12, 0, 7); x.fill(); }
        x.fillStyle = AVC[+String((J.a || [])[p] || '')[1]] || ['#5b8def', '#4fbf8f', '#e7766b', '#a77fe0', '#4cc3d9', '#e0a458'][p % 6]; shape(cx, cy, r, (J.a || [])[p]); x.fill();
        x.fillStyle = '#fff'; x.font = F(800, me2 ? 24 : 18); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((J.n[p] || '?').trim().charAt(0), cx, cy + 1);
        x.font = F(me2 ? 800 : 500, me2 ? 20 : 14); x.fillStyle = me2 ? '#e0a458' : 'rgba(255,255,255,.75)'; x.fillText(me2 ? t('أنت', 'You') : String(J.n[p] || '').slice(0, 10), cx, cy + r + 16); });
      x.restore(); x.textBaseline = 'alphabetic';
      // the head: the quiz, the question, my place
      x.fillStyle = '#e0a458'; x.font = F(800, 34); x.textAlign = 'center'; x.fillText(t('ميدان', 'Maydan'), S / 2, 50);
      x.fillStyle = 'rgba(255,255,255,.8)'; x.font = F(600, 22); x.fillText(String(title || '').slice(0, 40), S / 2, 84, S - 60);
      const rank = f < 1 ? null : D.line(D.me)[st], prev = st > 0 ? D.line(D.me)[st - 1] : null;
      x.fillStyle = '#fff'; x.font = F(700, 26); x.fillText(f < 1 ? t('انطلق السباق', 'And they are off') : t(`بعد السؤال ${st + 1}  ·  مركزك ${rank}`, `After question ${st + 1}  ·  place ${rank}`), S / 2, 128);
      if (rank && prev && prev !== rank) { x.fillStyle = prev > rank ? '#6fd39b' : '#ff8a80'; x.font = F(800, 24); x.fillText((prev > rank ? '▲' : '▼') + Math.abs(prev - rank), S - 50, 128); }
      // the end: my place, big
      if (ms > STEP * (D.steps + 1)) { const a = Math.min(1, (ms - STEP * (D.steps + 1)) / 500); x.globalAlpha = a * .92; x.fillStyle = '#151c44'; x.fillRect(0, S / 2 - 110, S, 220); x.globalAlpha = a;
        x.fillStyle = '#e0a458'; x.font = F(800, 72); x.fillText(t(`المركز ${D.line(D.me)[D.steps - 1]}`, `Place ${D.line(D.me)[D.steps - 1]}`), S / 2, S / 2 + 10); x.fillStyle = '#fff'; x.font = F(600, 30); x.fillText(String(me || ''), S / 2, S / 2 + 64); x.globalAlpha = 1; }
      x.fillStyle = 'rgba(255,255,255,.55)'; x.font = F(600, 20); x.fillText('alsamani.com/play/maydan', S / 2, S - 30);
    }
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'], type = types.find(m => MediaRecorder.isTypeSupported(m)) || '';
    return new Promise((ok, no) => {
      frame(0); const stream = cv.captureStream(30), rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 2500000 } : undefined), chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => { const mt = rec.mimeType || type || 'video/webm'; ok(new File([new Blob(chunks, { type: mt })], 'maydan-race.' + (/mp4/.test(mt) ? 'mp4' : 'webm'), { type: mt.split(';')[0] })); };
      rec.onerror = e => no(e); rec.start(250); const t0 = performance.now();
      const loop = now => { const ms = now - t0; frame(ms); if (onProgress) onProgress(Math.min(1, ms / total)); if (ms < total) requestAnimationFrame(loop); else setTimeout(() => rec.stop(), 150); };
      requestAnimationFrame(loop);
    });
  }
  // the result to share: place, points, the titles (mine marked), the journey, the podium; made to send in a chat or a story
  async function shareCard(title) {
    const W = 1080, H = 1350, ar = document.documentElement.lang !== 'en', cv = document.createElement('canvas'), x = cv.getContext('2d'); cv.width = W; cv.height = H;
    const F = (w, s2) => `${w} ${s2}px "IBM Plex Sans Arabic", system-ui, sans-serif`, t = (a, e) => ar ? a : e;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3878'); g.addColorStop(1, '#151c44'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .25})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * 420, Math.random() * 2, 0, 7); x.fill(); }
    x.direction = ar ? 'rtl' : 'ltr'; x.textAlign = 'center';
    x.fillStyle = '#e0a458'; x.font = F(800, 56); x.fillText(t('ميدان', 'Maydan'), W / 2, 100);
    x.fillStyle = 'rgba(255,255,255,.85)'; x.font = F(600, 34); x.fillText(String(title || '').slice(0, 48), W / 2, 156, W - 140);
    // the place, big
    const r = SC && SC.r, D = jData(), S = D && D.me >= 0 ? D.st : null;
    x.fillStyle = r === 1 ? '#f2c14e' : r === 2 ? '#c9d1e3' : r === 3 ? '#d9965b' : '#e0a458'; x.beginPath(); x.arc(W / 2, 300, 104, 0, 7); x.fill();
    x.fillStyle = '#17153a'; x.font = F(800, 112); x.fillText(String(r || '-'), W / 2, 340);
    x.fillStyle = '#fff'; x.font = F(700, 46); x.fillText(String(me || ''), W / 2, 462, W - 140);
    x.fillStyle = '#e0a458'; x.font = F(700, 40); x.fillText(t(`المركز ${r || '-'} · ${SC ? SC.s : 0} نقطة`, `Place ${r || '-'} · ${SC ? SC.s : 0} points`), W / 2, 520);
    let y = 580;
    if (S) { x.fillStyle = '#c9cde0'; x.font = F(500, 30); x.fillText(t(`أفضل مركز ${S.best}${S.up ? ` · أكبر صعود ${S.up}` : ''}${S.lead ? ` · تصدّر ${arN(S.lead, 'مرة', 'مرتين', 'مرات', 'مرة')}` : ''}`, `Best place ${S.best}${S.up ? ` · biggest climb ${S.up}` : ''}${S.lead ? ` · led ${S.lead}×` : ''}`), W / 2, y); y += 40; }
    // the titles: two to a row, mine in gold
    const L = (TOP && TOP.aw) || [];
    if (L.length) { y += 10; L.slice(0, 6).forEach((a, k) => { const mine = a.u === uid.slice(0, 8), col = k % 2, cx = L.length === 1 ? W / 2 : W / 2 + (col ? -1 : 1) * (ar ? 1 : -1) * 240, cy = y + Math.floor(k / 2) * 98;
      x.fillStyle = mine ? '#e0a458' : 'rgba(255,255,255,.09)'; x.beginPath(); x.roundRect(cx - 225, cy, 450, 84, 20); x.fill();
      x.fillStyle = mine ? '#17153a' : '#e0a458'; x.font = F(700, 28); x.fillText(TITLE[a.k] ? TITLE[a.k][ar ? 0 : 1] : '', cx, cy + 34, 420);
      x.fillStyle = mine ? '#17153a' : '#fff'; x.font = F(700, 30); x.fillText(mine ? t('أنت!', 'You!') : String(a.n || ''), cx, cy + 70, 420); });
      y += Math.ceil(Math.min(L.length, 6) / 2) * 98 + 16; }
    // the journey: my line over the others'
    if (D && D.me >= 0 && D.n > 1) {
      const X0 = 110, X1 = W - 90, Y0 = y + 80, Y1 = Math.min(H - 260, y + 330), N = Math.max(D.n, 2), show = Math.min(D.n, 10);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(60, y, W - 120, Y1 - y + 70, 24); x.fill();
      x.fillStyle = '#e0a458'; x.font = F(700, 30); x.fillText(t('رحلتك في المسابقة', 'Your journey'), W / 2, y + 36);
      const X = k => X0 + (X1 - X0) * k / (D.steps - 1), Y = rr => Y0 + (Y1 - Y0) * (Math.min(rr, N) - 1) / (N - 1), COLS = ['#5b8def', '#4fbf8f', '#e7766b', '#a77fe0', '#4cc3d9', '#c9d1e3'];
      const line = (p2, col, w, a) => { x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.beginPath(); D.line(p2).forEach((rr, k) => k ? x.lineTo(X(k), Y(rr)) : x.moveTo(X(k), Y(rr))); x.stroke(); x.globalAlpha = 1; };
      for (let p2 = 0; p2 < show; p2++) if (p2 !== D.me) line(p2, COLS[p2 % 6], 4, .55);
      line(D.me, '#e0a458', 9, 1); const ML = D.line(D.me); x.fillStyle = '#e0a458'; x.beginPath(); x.arc(X(ML.length - 1), Y(ML[ML.length - 1]), 12, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.6)'; x.font = F(500, 22); x.textAlign = 'right'; x.fillText('1', X0 - 18, Y(1) + 8); x.fillText(String(N), X0 - 18, Y(N) + 8); x.textAlign = 'center';
      y = Y1 + 90;
    }
    // the podium
    const P = ((TOP && TOP.p) || []).slice(0, 3);
    if (P.length && y < H - 150) { x.fillStyle = '#c9cde0'; x.font = F(500, 28); x.fillText(P.map((p2, k) => `${k + 1}. ${p2.n}`).join('    '), W / 2, Math.min(y + 10, H - 120), W - 120); }
    x.fillStyle = 'rgba(255,255,255,.6)'; x.font = F(600, 30); x.fillText('alsamani.com/play/maydan', W / 2, H - 50);
    const blob = await new Promise(rs => cv.toBlob(rs, 'image/png')), file = new File([blob], 'maydan-result.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text: t('نتيجتي في ميدان', 'My Maydan result') }); } catch (e) { if (e && e.name === 'AbortError') return; }
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'maydan-result.png'; l.click();
  }
  // after the game: an invitation to build one's own quiz (not inside the host's own panel)
  const MAKE = () => document.documentElement.classList.contains('mp-embed') ? '' : `<a class="btn solid mp-make" href="/play/maydan/">${B('جرّب وأنشئ مسابقتك', 'Make your own quiz')}</a>`;
  function final() {
    const r = SC ? SC.r : null;
    screen(`<div class="mp-res end"><p class="mp-sym">${r === 1 ? '' : r === 2 ? '' : r === 3 ? '' : ''}</p>
      <p class="mp-big">${r && r <= 3 ? B('على منصة التتويج!', 'On the podium!') : B('انتهت المسابقة', 'The quiz is over')}</p>
      ${r ? `<p class="mp-rank">${B(`مركزك النهائي: ${r}`, `Final place: ${r}`)}</p><p class="mp-plus">${SC.s} ${B('نقطة', 'points')}</p>` : ''}
      ${TOP && TOP.t && TOP.t.length ? `<p class="mp-tm" style="--c:var(--qz${TOP.t[0].k % 6})">${B('الفريق الفائز:', 'Winning team:')} ${esc(TOP.t[0].n)}</p>` : ''}${topList()}
      ${titlesHtml()}${replayHtml()}${journeyHtml()}<p>${B('شكرًا لمشاركتك.', 'Thanks for playing.')}</p>${SC && SC.r && window.MediaRecorder && jData() ? `<button type="button" class="btn ghost mp-save" id="mpVid">${B('شارك سباقك فيديو قصير', 'Share your race as a short video')}</button>` : ''}${SC && SC.r ? `<button type="button" class="btn solid mp-save" id="mpShare">${B('شارك نتيجتك: المركز والألقاب والرحلة', 'Share your result: place, titles, journey')}</button>` : ''}${hList().length || jData() ? `<button type="button" class="btn ghost mp-save" id="mpSave">${B('احفظ إجاباتك صورة', 'Save your answers as a picture')}</button>` : ''}${MAKE()}</div>${review()}` + rxBar(), 'end');
    if (root.querySelector('#mpRp') && !root.querySelector('#mpRp').dataset.on) { root.querySelector('#mpRp').dataset.on = 1; replayRun(); }
    // the video is recorded first; a second tap shares it, since phones only share straight from a tap
    let vid = null; const vb = root.querySelector('#mpVid'); if (vb) vb.onclick = async () => {
      if (vid) { try { if (navigator.canShare && navigator.canShare({ files: [vid] })) { await navigator.share({ files: [vid], text: T('سباقي في ميدان', 'My Maydan race') }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
        const l = document.createElement('a'); l.href = URL.createObjectURL(vid); l.download = vid.name; l.click(); return; }
      const was = vb.innerHTML; vb.disabled = true;
      try { const t = (await R.child('title').once('value')).val(); vid = await raceVideo(t, p => { vb.textContent = T(`جارٍ تجهيز الفيديو… ${Math.round(p * 100)}٪`, `Making the video… ${Math.round(p * 100)}%`); });
        vb.disabled = false; vb.classList.replace('ghost', 'solid'); vb.textContent = T('الفيديو جاهز: اضغط لمشاركته', 'The video is ready: tap to share it'); buzz([30, 40, 30]);
      } catch (e) { console.error(e); vid = null; vb.innerHTML = was; vb.disabled = false; flashMsg(T('تعذّر تجهيز الفيديو على هذا الجهاز؛ شارك الصورة بدلًا منه.', 'The video could not be made on this device; share the picture instead.')); } };
    const sh = root.querySelector('#mpShare'); if (sh) sh.onclick = async () => { sh.disabled = true; try { const t = (await R.child('title').once('value')).val(); await shareCard(t); } catch (e) { console.error(e); } sh.disabled = false; };
    const sv = root.querySelector('#mpSave'); if (sv) sv.onclick = async () => { sv.disabled = true; try { const t = (await R.child('title').once('value')).val(); await saveCard(t); } catch (e) {} sv.disabled = false; };
  }
  function gone() { clearInterval(tick); R && R.off(); root.innerHTML = `<div class="mp-card"><p class="mp-big">${B('انتهت المسابقة', 'The quiz has ended')}</p><button type="button" class="btn ghost" id="mpAgain">${B('مسابقة أخرى', 'Another quiz')}</button>${MAKE()}</div>`; root.querySelector('#mpAgain').onclick = () => { history.replaceState(null, '', location.pathname); codeScreen(); }; }
  function kicked() { R.off(); me = null; root.innerHTML = `<div class="mp-card"><p>${B('أخرجك المضيف من المسابقة.', 'The host removed you from the quiz.')}</p></div>`; }

  // inside the host's own page (phones-only mode): just the game, no site around it
  if (new URLSearchParams(location.search).get('embed')) document.documentElement.classList.add('mp-embed');
  codeScreen();
})();

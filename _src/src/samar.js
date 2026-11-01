/* Samar (alsamani.com/play/samar): games for a gathering, on one code — the screen shows the play and each phone
   holds the player's part. Four games: the secret word, who am I, draw and guess, and the letter game.
   The device that opens the session keeps the rules; the phones send their moves (kh/{pin}/mv/{uid}); what each
   player alone may see goes to khh/{pin}/{uid}. Points add up across the games of the session. */
(function () {
  const root = document.getElementById('sm');
  if (!root) return;
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('sm.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('sm.' + k, JSON.stringify(v)); } catch (e) {} } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  let ac = null;
  const tone = (f, d, type, v, at) => { if (store.get('mute', false)) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || .08, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); } catch (e) {} };
  const SND = { join: () => tone(880, .12, 'triangle', .06), go: () => [523, 659, 784].forEach((f, k) => tone(f, .2, 'triangle', .08, k * .1)), ok: () => { tone(784, .12, 'triangle', .08); tone(1175, .2, 'triangle', .08, .1); }, no: () => tone(220, .25, 'sawtooth', .05), tick: () => tone(1300, .04, 'square', .03), win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, .35, 'triangle', .09, k * .13)) };
  const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    spy: SV('<circle cx="8" cy="15" r="3"/><circle cx="16" cy="15" r="3"/><path d="M11 15h2M3 11h18M6 11l2-6h8l2 6"/>'),
    who: SV('<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M11 7.2a1.4 1.4 0 1 1 1.6 1.4c-.5.1-.6.4-.6.9M12 10.6v.1"/>'),
    draw: SV('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3M4 20h16"/>'),
    letters: SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>'),
    vol: SV('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'), mute: SV('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>'), fs: SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')
  };
  const COLS = ['#f2b84b', '#2bb3a3', '#e0607e', '#7c8cf8', '#9bd25b', '#f08a4b', '#c77dff', '#4fc3f7'];
  const JOIN = 'alsamani.com/play/samar';
  // the same answer however it is written: hamzas, taa marbuta, alif maqsura, the article, spaces and case
  const norm = s => String(s || '').trim().toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^(ال|the\s+|a\s+|an\s+)/, '').replace(/[\s\-_.،,!؟?]/g, '');
  const first = s => { const w = String(s || '').trim().replace(/[ً-ْـ]/g, '').replace(/^ال(?=..)/, ''); return w.charAt(0).replace(/[أإآٱ]/g, 'ا').toLowerCase(); };

  /* ---------- the words ---------- */
  const W = {
    ar: {
      food: ['كبسة', 'جريش', 'مرقوق', 'سمبوسة', 'شاورما', 'بيتزا', 'برجر', 'فلافل', 'حمص', 'كنافة', 'لقيمات', 'معصوب', 'مندي', 'تمر', 'قهوة', 'شاي', 'آيسكريم', 'شوربة', 'سلطة', 'كيك'],
      places: ['مطار', 'مستشفى', 'مدرسة', 'مسجد', 'سوق', 'شاطئ', 'صحراء', 'مكتبة', 'ملعب', 'مطعم', 'حديقة', 'جامعة', 'محطة', 'فندق', 'بنك', 'مخبز', 'متحف', 'جبل', 'مزرعة', 'سينما'],
      animals: ['جمل', 'صقر', 'حصان', 'غزال', 'أسد', 'قطة', 'زرافة', 'فيل', 'دلفين', 'نحلة', 'سلحفاة', 'بطريق', 'ثعلب', 'أرنب', 'حوت', 'نسر', 'تمساح', 'قرد', 'خروف', 'ضب'],
      jobs: ['طبيب', 'معلم', 'طيار', 'مهندس', 'طباخ', 'شرطي', 'رسام', 'مزارع', 'نجار', 'صيدلي', 'محامي', 'مصور', 'خباز', 'حلاق', 'رائد فضاء', 'ممرض', 'مذيع', 'إطفائي', 'صياد', 'سائق'],
      things: ['مظلة', 'ساعة', 'نظارة', 'مفتاح', 'كرسي', 'مرآة', 'جوال', 'دلة', 'سجادة', 'شمعة', 'حقيبة', 'مقص', 'قلم', 'كتاب', 'فانوس', 'خيمة', 'دراجة', 'طائرة ورقية', 'كاميرا', 'بالون']
    },
    en: {
      food: ['pizza', 'burger', 'falafel', 'hummus', 'pancake', 'sushi', 'ice cream', 'soup', 'salad', 'cake', 'dates', 'coffee', 'tea', 'sandwich', 'noodles', 'cookie', 'popcorn', 'omelette', 'lemonade', 'donut'],
      places: ['airport', 'hospital', 'school', 'mosque', 'market', 'beach', 'desert', 'library', 'stadium', 'restaurant', 'park', 'university', 'station', 'hotel', 'bank', 'bakery', 'museum', 'mountain', 'farm', 'cinema'],
      animals: ['camel', 'falcon', 'horse', 'gazelle', 'lion', 'cat', 'giraffe', 'elephant', 'dolphin', 'bee', 'turtle', 'penguin', 'fox', 'rabbit', 'whale', 'eagle', 'crocodile', 'monkey', 'sheep', 'owl'],
      jobs: ['doctor', 'teacher', 'pilot', 'engineer', 'chef', 'police officer', 'painter', 'farmer', 'carpenter', 'pharmacist', 'lawyer', 'photographer', 'baker', 'barber', 'astronaut', 'nurse', 'reporter', 'firefighter', 'fisherman', 'driver'],
      things: ['umbrella', 'watch', 'glasses', 'key', 'chair', 'mirror', 'phone', 'coffee pot', 'carpet', 'candle', 'bag', 'scissors', 'pen', 'book', 'lantern', 'tent', 'bicycle', 'kite', 'camera', 'balloon']
    }
  };
  const CAT = { food: ['أكلات ومشروبات', 'Food and drink'], places: ['أماكن', 'Places'], animals: ['حيوانات', 'Animals'], jobs: ['مهن', 'Jobs'], things: ['أشياء', 'Things'] };
  const words = (cat, L) => W[L || (isAr() ? 'ar' : 'en')][cat];
  const LETTERS = { ar: 'ا ب ت ج ح خ د ر ز س ش ص ع ف ق ك ل م ن ه و ي'.split(' '), en: 'A B C D E F G H I J K L M N O P R S T W'.split(' ') };
  const LCATS = () => isAr() ? ['إنسان', 'حيوان', 'نبات', 'جماد', 'بلاد'] : ['Name', 'Animal', 'Plant', 'Thing', 'Country'];

  const GAMES = [
    { id: 'spy', icon: IC.spy, ar: 'الكلمة السرية', en: 'The secret word', min: 3, dAr: 'الكل يعرف الكلمة إلا واحدًا. تلميحات ثم تصويت: اكشفوا من لا يعرفها.', dEn: 'Everyone knows the word but one. Clues, then a vote: find who does not know it.' },
    { id: 'who', icon: IC.who, ar: 'من أنا؟', en: 'Who am I?', min: 2, dAr: 'لكل لاعب شخصية يراها الجميع إلا هو. يسأل بنعم أو لا حتى يعرف من هو.', dEn: 'Each player has an identity everyone sees but them. Ask yes-or-no questions to find it.' },
    { id: 'draw', icon: IC.draw, ar: 'ارسم وخمّن', en: 'Draw and guess', min: 2, dAr: 'واحد يرسم في جواله والرسمة تظهر على الشاشة، والبقية يخمّنون بأسرع ما يمكن.', dEn: 'One draws on their phone, the drawing shows on the screen, the others guess as fast as they can.' },
    { id: 'letters', icon: IC.letters, ar: 'إنسان حيوان نبات جماد بلاد', en: 'Name, animal, plant, thing, country', min: 2, dAr: 'حرف واحد للجميع: املأ الخانات الخمس قبل أن يقول أحدهم «ستوب».', dEn: 'One letter for all: fill the five boxes before someone calls stop.' }
  ];
  const gameOf = id => GAMES.find(g => g.id === id);

  /* ---------- the connection ---------- */
  let db = null, uid = null, off = 0;
  const now = () => Date.now() + off;
  async function fb() {
    if (db) return; if (!window.firebase || !window.MD_CFG) throw new Error('nofb');
    if (!firebase.apps.length) firebase.initializeApp(MD_CFG);
    uid = (firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user).uid; db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const within = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('slow')), ms || 12000))]);
  let S = null;   // this device's session (host or player)
  const subs = [];
  const on = (ref, ev, fn) => { ref.on(ev, fn); subs.push(() => ref.off(ev, fn)); };
  const stopAll = () => { subs.splice(0).forEach(f => f()); if (S && S.tm) clearInterval(S.tm); S = null; };

  /* ---------- home ---------- */
  function home(err) {
    stopAll();
    const p = new URLSearchParams(location.search).get('k') || '';
    root.innerHTML = `<div class="sm-home">
      <div class="sm-card sm-join"><h2>${B('ادخل اللعبة', 'Join a game')}</h2>
        <label>${B('الرمز', 'Code')}<input id="smPin" inputmode="numeric" maxlength="7" dir="ltr" placeholder="123 456" value="${esc(p)}"></label>
        <label>${B('اسمك', 'Your name')}<input id="smName" maxlength="20" dir="auto" value="${esc(store.get('name', ''))}"></label>
        <p class="sm-err" ${err ? '' : 'hidden'}>${err || ''}</p>
        <button type="button" class="btn solid" id="smGo">${B('ادخل', 'Join')}</button></div>
      <div class="sm-card sm-host"><h2>${B('افتح جلسة', 'Open a session')}</h2><p>${B('على الشاشة الكبيرة أو اللابتوب: يظهر رمز يدخل به الجميع من جوالاتهم، ثم تختارون اللعبة.', 'On the big screen or a laptop: a code appears for everyone to join from their phones, then you choose the game.')}</p>
        <button type="button" class="btn ghost" id="smHost">${B('افتح جلسة جديدة', 'Open a new session')}</button></div>
      <div class="sm-gl">${GAMES.map(g => `<div class="sm-gi"><i>${g.icon}</i><b>${B(g.ar, g.en)}</b><small>${B(g.dAr, g.dEn)}</small></div>`).join('')}</div></div>`;
    const pin = root.querySelector('#smPin'), nm = root.querySelector('#smName');
    pin.oninput = () => { pin.value = pin.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d ]/g, ''); };
    root.querySelector('#smGo').onclick = () => join(pin.value.replace(/\D/g, ''), nm.value.trim().replace(/\s+/g, ' ').slice(0, 20));
    root.querySelector('#smHost').onclick = host;
    if (p && !nm.value) setTimeout(() => nm.focus(), 100);
  }

  /* =====================================================================================
     the host: the screen of the gathering
     ===================================================================================== */
  // the screen: a layer on the page's body, so nothing on the page can clip or cover it
  const HE = () => { let e = document.getElementById('smLive'); if (!e) { e = document.createElement('div'); e.id = 'smLive'; e.className = 'sm'; document.body.appendChild(e); document.documentElement.classList.add('sm-on'); } return e; };
  async function host() {
    root.innerHTML = `<div class="sm-card sm-wait">${B('جارٍ فتح الجلسة…', 'Opening the session…')}</div>`;
    try {
      await within(fb());
      let pin = null;
      for (let k = 0; k < 6 && !pin; k++) { const p = String(100000 + Math.floor(Math.random() * 900000)); try { await within(db.ref('kh/' + p).set({ host: uid, at: TS(), st: 'lobby', cfg: { teams: 0, L: 0, need: 0, tt: 0 } })); pin = p; } catch (e) {} }
      if (!pin) throw new Error('pin');
      S = { mode: 'host', pin, ref: db.ref('kh/' + pin), pl: {}, sc: {}, g: null, gs: null, seq: {}, L: isAr() ? 'ar' : 'en' };
      on(S.ref.child('pl'), 'child_added', s => { const v = s.val() || {}; S.pl[s.key] = v.n || '؟'; if (S.sc[s.key] == null) S.sc[s.key] = 0; SND.join(); hostDraw(); });
      on(S.ref.child('pl'), 'child_removed', s => { delete S.pl[s.key]; hostDraw(); });
      const mv = s => { const v = s.val() || {}; if (S.seq[s.key] === v.x) return; S.seq[s.key] = v.x; if (S.g && S.gs && v.k) { try { S.gs.move(s.key, String(v.k)); } catch (e) { console.error(e); } } };
      on(S.ref.child('mv'), 'child_added', mv); on(S.ref.child('mv'), 'child_changed', mv);
      const seen = {}; const rx = s => { const v = s.val() || {}; if (!v.e || seen[s.key] === v.t || now() - (v.t || 0) > 8000) return; seen[s.key] = v.t; fly(v.e); };
      on(S.ref.child('rx'), 'child_added', rx); on(S.ref.child('rx'), 'child_changed', rx);
      S.tm = setInterval(() => { if (S && S.gs && S.gs.tick) S.gs.tick(); paintClock(); }, 250);
      window.addEventListener('beforeunload', () => { if (S && S.mode === 'host') { db.ref('khh/' + S.pin).remove(); S.ref.remove(); } });
      hostDraw();
    } catch (e) { home(T('تعذّر فتح الجلسة. تأكد من الإنترنت وحاول مرة أخرى.', 'Could not open the session. Check the internet and try again.')); }
  }
  const players = () => Object.keys(S.pl);
  const nameOf = u => S.pl[u] || '؟';
  const colOf = u => COLS[Math.abs([...u].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) % COLS.length];
  // public state for the phones, private parts for each player, and the session's points
  const pub = o => { S.g = Object.assign({ id: S.gs ? S.gs.id : null, at: now() }, o); return S.ref.child('g').set(S.g).catch(() => {}); };
  const priv = (u, o) => db.ref('khh/' + S.pin + '/' + u).set(o).catch(() => {});
  const add = (u, n) => { if (!(u in S.pl)) return; S.sc[u] = (S.sc[u] || 0) + Math.round(n); };
  const pushScores = () => S.ref.child('sc').set(S.sc).catch(() => {});
  const phase = (ph, dur, extra) => { S.ph = ph; S.end = dur ? now() + dur * 1000 : 0; return pub(Object.assign({ ph, t0: now(), dur: dur || 0 }, extra || {})); };
  const left = () => S.end ? Math.max(0, (S.end - now()) / 1000) : 0;
  function paintClock() { const c = HE().querySelector('#smClock'); if (!c) return; const l = left(); c.textContent = S.end ? Math.ceil(l) : ''; c.classList.toggle('low', S.end && l <= 10); }
  function fly(e) { const fx = HE().querySelector('.sm-fx'); if (!fx) return; const s = document.createElement('span'); s.textContent = e; s.style.setProperty('--x', (6 + Math.random() * 86) + '%'); fx.appendChild(s); setTimeout(() => s.remove(), 2600); }

  // the frame of the screen: the code to join, the players and the session points, and the stage in the middle
  function frame(stage, foot) {
    const url = `${location.origin}/play/samar/?k=${S.pin}`;
    let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); } catch (e) {}
    const order = players().sort((a, b) => (S.sc[b] || 0) - (S.sc[a] || 0));
    HE().innerHTML = `<div class="sm-screen"><div class="sm-side"><div class="sm-code"><div class="sm-qr">${qr}</div><p dir="ltr">${JOIN}</p><b dir="ltr">${S.pin.slice(0, 3)} ${S.pin.slice(3)}</b></div>
      <ol class="sm-board">${order.map(u => `<li style="--c:${colOf(u)}"><i></i><span dir="auto">${esc(nameOf(u))}</span><b>${S.sc[u] || 0}</b></li>`).join('') || `<li class="sm-none">${B('بانتظار اللاعبين…', 'Waiting for players…')}</li>`}</ol></div>
      <div class="sm-stage">${stage}</div><div class="sm-fx" aria-hidden="true"></div>
      <div class="sm-ctl">${foot || ''}<span class="sm-sp"></span><b class="sm-clock" id="smClock"></b><button type="button" class="sm-cb" data-mute>${store.get('mute', false) ? IC.mute : IC.vol}</button><button type="button" class="sm-cb" data-fs>${IC.fs}</button><button type="button" class="sm-cb" data-end>${B('إنهاء الجلسة', 'End the session')}</button></div></div>`;
    const q = s => HE().querySelector(s);
    q('[data-mute]').onclick = e => { const m = !store.get('mute', false); store.set('mute', m); e.currentTarget.innerHTML = m ? IC.mute : IC.vol; };
    q('[data-fs]').onclick = () => document.fullscreenElement ? document.exitFullscreen() : HE().requestFullscreen && HE().requestFullscreen().catch(() => {});
    q('[data-end]').onclick = () => { if (!confirm(T('إنهاء الجلسة لكل اللاعبين؟', 'End the session for everyone?'))) return; db.ref('khh/' + S.pin).remove(); S.ref.remove(); HE().remove(); document.documentElement.classList.remove('sm-on'); home(); };
    paintClock();
    return q;
  }
  // between games: choose the next one
  function picker() {
    const n = players().length;
    const q = frame(`<div class="sm-pick"><h2>${S.played ? B('اختر اللعبة التالية', 'Choose the next game') : B('اختر اللعبة', 'Choose a game')}</h2>
      <div class="sm-games">${GAMES.map(g => `<button type="button" class="sm-game" data-g="${g.id}"${n < g.min ? ' disabled' : ''}><i>${g.icon}</i><b>${B(g.ar, g.en)}</b><small>${B(g.dAr, g.dEn)}</small>${n < g.min ? `<em>${B(`تحتاج ${g.min} لاعبين على الأقل`, `Needs at least ${g.min} players`)}</em>` : ''}</button>`).join('')}</div></div>`);
    HE().querySelectorAll('[data-g]').forEach(b => b.onclick = () => startGame(b.dataset.g));
  }
  function hostDraw() { if (!S || S.mode !== 'host') return; if (S.gs && S.gs.view) S.gs.view(); else picker(); }
  function startGame(id) {
    const mk = { spy: Spy, who: Who, draw: Draw, letters: Letters }[id]; if (!mk) return;
    S.gs = mk(); S.gs.id = id; S.played = true; SND.go(); S.gs.start();
  }
  // after a game: the points it gave, then back to the choice of games
  function gameOver(gained, note) {
    pushScores();
    const order = Object.keys(gained).filter(u => gained[u] > 0).sort((a, b) => gained[b] - gained[a]);
    S.gs = { id: null, view: () => { const q = frame(`<div class="sm-over"><h2>${note || B('انتهت اللعبة', 'The game is over')}</h2>
        <ol class="sm-gain">${order.map(u => `<li style="--c:${colOf(u)}"><span dir="auto">${esc(nameOf(u))}</span><b>+${gained[u]}</b></li>`).join('') || `<li>${B('لا نقاط هذه المرة', 'No points this time')}</li>`}</ol></div>`,
        `<button type="button" class="btn solid" data-again>${B('العب مرة أخرى', 'Play it again')}</button><button type="button" class="btn ghost" data-pick>${B('لعبة أخرى', 'Another game')}</button>`);
      q('[data-again]').onclick = () => startGame(S.lastId); q('[data-pick]').onclick = () => { S.gs = null; pub({ ph: 'pick' }); picker(); }; } };
    S.lastId = S.lastGame; pub({ ph: 'over', gained, note: note ? note.replace(/<[^>]+>/g, '') : '' }); SND.win(); hostDraw();
  }

  /* ---------- the secret word ---------- */
  function Spy() {
    const st = { r: 0, hints: {}, votes: {}, guess: null };
    const G = {
      start() {
        S.lastGame = 'spy'; const us = shuffle(players()); st.cat = pick(Object.keys(CAT)); st.word = pick(words(st.cat, S.L)); st.spy = us[0]; st.hints = {}; st.votes = {}; st.guess = null; st.r = 1;
        us.forEach(u => priv(u, u === st.spy ? { g: 'spy', role: 'spy', cat: st.cat } : { g: 'spy', role: 'in', w: st.word, cat: st.cat }));
        G.hint();
      },
      hint() { st.hints = {}; phase('hint', 60, { r: st.r, cat: st.cat, n: 0 }); G.view(); },
      move(u, k) {
        if (S.ph === 'hint' && k.startsWith('h:') && !st.hints[u]) { st.hints[u] = k.slice(2, 30).trim(); pub(Object.assign({}, S.g, { n: Object.keys(st.hints).length })); SND.join(); G.view(); if (Object.keys(st.hints).length >= players().length) G.show(); }
        else if (S.ph === 'vote' && k.startsWith('v:') && !st.votes[u] && k.slice(2) in S.pl && k.slice(2) !== u) { st.votes[u] = k.slice(2); pub(Object.assign({}, S.g, { n: Object.keys(st.votes).length })); G.view(); if (Object.keys(st.votes).length >= players().length) G.reveal(); }
        else if (S.ph === 'guess' && u === st.spy && k.startsWith('g:')) { st.guess = k.slice(2, 40); G.end(); }
      },
      show() { const all = players().map(u => ({ u, n: nameOf(u), h: st.hints[u] || '—' })); st.all = (st.all || []).concat([all]); phase('show', 45, { r: st.r, cat: st.cat, hints: st.all, list: players().map(u => ({ u, n: nameOf(u) })) }); G.view(); },
      vote() { st.votes = {}; phase('vote', 40, { r: st.r, cat: st.cat, hints: st.all, n: 0, list: players().map(u => ({ u, n: nameOf(u) })) }); G.view(); },
      reveal() {
        const tally = {}; Object.values(st.votes).forEach(t => { tally[t] = (tally[t] || 0) + 1; });
        const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a]); st.caught = top[0] === st.spy && (tally[top[0]] || 0) > (tally[top[1]] || 0); st.tally = tally;
        if (st.caught) { phase('guess', 30, { spy: nameOf(st.spy), tally, hints: st.all }); G.view(); } else G.end();
      },
      end() {
        const gained = {}; const g = (u, n) => { add(u, n); gained[u] = (gained[u] || 0) + n; };
        Object.keys(st.votes).forEach(u => { if (st.votes[u] === st.spy) g(u, 100); });
        const guessed = st.guess && norm(st.guess) === norm(st.word);
        if (!st.caught) g(st.spy, 250); else if (guessed) g(st.spy, 150);
        const note = !st.caught ? B(`نجا الجاسوس «${esc(nameOf(st.spy))}»! الكلمة: ${esc(st.word)}`, `The spy ${esc(nameOf(st.spy))} got away! The word: ${esc(st.word)}`)
          : guessed ? B(`كُشف «${esc(nameOf(st.spy))}» لكنه عرف الكلمة: ${esc(st.word)}`, `${esc(nameOf(st.spy))} was caught but guessed the word: ${esc(st.word)}`)
          : B(`كشفتم الجاسوس «${esc(nameOf(st.spy))}»! الكلمة: ${esc(st.word)}`, `You caught the spy ${esc(nameOf(st.spy))}! The word: ${esc(st.word)}`);
        players().forEach(u => priv(u, { g: 'spy', role: 'done', w: st.word, spy: nameOf(st.spy) }));
        gameOver(gained, note);
      },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'hint') G.show(); else if (S.ph === 'show') G.vote(); else if (S.ph === 'vote') G.reveal(); else if (S.ph === 'guess') G.end(); },
      view() {
        const ph = S.ph, cat = `<p class="sm-cat">${B('الفئة:', 'Category:')} <b>${B(CAT[st.cat][0], CAT[st.cat][1])}</b></p>`;
        const hintsHtml = (st.all || []).map((rd, k) => `<div class="sm-hints"><h4>${B(`التلميحات ${st.all.length > 1 ? k + 1 : ''}`, `Clues ${st.all.length > 1 ? k + 1 : ''}`)}</h4>${rd.map(h => `<div class="sm-hint" style="--c:${colOf(h.u)}"><span dir="auto">${esc(h.n)}</span><b dir="auto">${esc(h.h)}</b></div>`).join('')}</div>`).join('');
        let body = '', foot = '';
        if (ph === 'hint') { body = `<h2>${B('اكتب تلميحًا من كلمة واحدة', 'Write a one-word clue')}</h2>${cat}<p class="sm-sub">${B('تلميح يثبت أنك تعرف الكلمة، دون أن تكشفها للجاسوس.', 'A clue that shows you know the word, without giving it away to the spy.')}</p><p class="sm-count" dir="ltr">${Object.keys(st.hints).length} / ${players().length}</p>${hintsHtml}`; foot = `<button type="button" class="btn ghost" data-skip>${B('اعرض التلميحات', 'Show the clues')}</button>`; }
        else if (ph === 'show') { body = `<h2>${B('ناقشوا: من الجاسوس؟', 'Talk it over: who is the spy?')}</h2>${cat}${hintsHtml}`; foot = `<button type="button" class="btn ghost" data-more>${B('جولة تلميحات أخرى', 'Another round of clues')}</button><button type="button" class="btn solid" data-skip>${B('إلى التصويت', 'To the vote')}</button>`; }
        else if (ph === 'vote') { body = `<h2>${B('صوّتوا من جوالاتكم', 'Vote on your phones')}</h2>${cat}<p class="sm-count" dir="ltr">${Object.keys(st.votes).length} / ${players().length}</p>${hintsHtml}`; foot = `<button type="button" class="btn ghost" data-skip>${B('أنهِ التصويت', 'End the vote')}</button>`; }
        else if (ph === 'guess') { body = `<h2>${B(`كُشف الجاسوس: «${esc(nameOf(st.spy))}»`, `The spy is ${esc(nameOf(st.spy))}`)}</h2><p class="sm-sub">${B('أمامه فرصة أخيرة: إن خمّن الكلمة سرق النقاط.', 'One last chance: if they guess the word, they steal the points.')}</p>`; }
        const q = frame(`<div class="sm-g sm-spy">${body}</div>`, foot);
        if (q('[data-skip]')) q('[data-skip]').onclick = () => ph === 'hint' ? G.show() : ph === 'show' ? G.vote() : G.reveal();
        if (q('[data-more]')) q('[data-more]').onclick = () => { st.r++; G.hint(); };
      }
    };
    return G;
  }

  /* ---------- who am I ---------- */
  function Who() {
    const st = { id: {}, solved: {}, order: 0 };
    const G = {
      start() {
        S.lastGame = 'who'; st.cat = pick(Object.keys(CAT)); const pool = shuffle(words(st.cat, S.L)), us = players(); st.id = {}; st.solved = {}; st.order = 0;
        us.forEach((u, k) => { st.id[u] = pool[k % pool.length]; });
        us.forEach(u => priv(u, { g: 'who', cat: st.cat, others: us.filter(o => o !== u).map(o => ({ n: nameOf(o), w: st.id[o] })) }));
        phase('play', 240, { cat: st.cat }); G.view();
      },
      move(u, k) {
        if (S.ph !== 'play' || st.solved[u] || !k.startsWith('g:')) return;
        const ok = norm(k.slice(2)) === norm(st.id[u]);
        if (ok) { const pts = Math.max(100, 300 - st.order * 50); st.order++; st.solved[u] = pts; add(u, pts); SND.ok(); priv(u, { g: 'who', cat: st.cat, solved: st.id[u], pts, others: players().filter(o => o !== u).map(o => ({ n: nameOf(o), w: st.id[o] })) }); fly('✓'); G.view(); if (Object.keys(st.solved).length >= players().length) G.end(); }
        else { db.ref('khh/' + S.pin + '/' + u + '/no').set(Date.now()).catch(() => {}); }
      },
      end() { const gained = {}; Object.keys(st.solved).forEach(u => { gained[u] = st.solved[u]; }); st.done = true; phase('reveal', 0, { ids: players().map(u => ({ n: nameOf(u), w: st.id[u] })) }); gameOver(gained, B('من كان من؟', 'Who was who?') + `<div class="sm-ids">${players().map(u => `<span style="--c:${colOf(u)}"><i dir="auto">${esc(nameOf(u))}</i><b dir="auto">${esc(st.id[u])}</b></span>`).join('')}</div>`); },
      tick() { if (S.ph === 'play' && S.end && left() <= 0) G.end(); },
      view() {
        const us = players();
        const q = frame(`<div class="sm-g sm-who"><h2>${B('من أنا؟', 'Who am I?')}</h2><p class="sm-cat">${B('الفئة:', 'Category:')} <b>${B(CAT[st.cat][0], CAT[st.cat][1])}</b></p>
          <p class="sm-sub">${B('كل واحد يرى شخصيات غيره في جواله. اسألوا بالتناوب بنعم أو لا، ومن عرف نفسه يكتبها في جواله.', 'Each phone shows the others’ identities. Take turns asking yes-or-no questions; when you know yours, type it in.')}</p>
          <div class="sm-whos">${us.map(u => `<div class="sm-whoc${st.solved[u] ? ' on' : ''}" style="--c:${colOf(u)}"><span dir="auto">${esc(nameOf(u))}</span><b dir="auto">${st.solved[u] ? esc(st.id[u]) : '؟'}</b>${st.solved[u] ? `<em>+${st.solved[u]}</em>` : ''}</div>`).join('')}</div></div>`,
          `<button type="button" class="btn ghost" data-skip>${B('أنهِ اللعبة', 'End the game')}</button>`);
        q('[data-skip]').onclick = () => G.end();
      }
    };
    return G;
  }

  /* ---------- draw and guess ---------- */
  // strokes travel as text: "|" starts a stroke, then points of two base-36 characters for x and y (0–1295 each)
  const enc = n => Math.max(0, Math.min(1295, Math.round(n))).toString(36).padStart(2, '0');
  function paintStrokes(cv, data, fresh) {
    const x = cv.getContext('2d'), W2 = cv.width, H2 = cv.height; if (fresh) { x.fillStyle = '#fff'; x.fillRect(0, 0, W2, H2); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    data.split('|').forEach(s => { if (!s) return; const col = COLS_D[+s[0]] || '#222', pts = []; for (let i = 1; i + 3 < s.length + 1; i += 4) pts.push([parseInt(s.substr(i, 2), 36) / 1295 * W2, parseInt(s.substr(i + 2, 2), 36) / 1295 * H2]);
      if (!pts.length) return; x.strokeStyle = col; x.lineWidth = Math.max(3, W2 / 110) * (s[0] === '5' ? 4 : 1); x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => x.lineTo(p[0], p[1])); if (pts.length === 1) x.lineTo(pts[0][0] + .1, pts[0][1]); x.stroke(); });
  }
  const COLS_D = ['#222222', '#d64545', '#2a6fdb', '#2f9e5b', '#f2b84b', '#ffffff'];
  function Draw() {
    const st = { turn: -1, order: [], got: {}, ink: '', gained: {} };
    const G = {
      start() { S.lastGame = 'draw'; st.order = shuffle(players()).slice(0, 8); st.turn = -1; st.gained = {}; G.next(); },
      next() {
        st.turn++; if (st.turn >= st.order.length || !(st.order[st.turn] in S.pl)) { if (st.turn >= st.order.length) return gameOver(st.gained); return G.next(); }
        st.drawer = st.order[st.turn]; st.got = {}; st.ink = ''; st.feed = []; st.cat = pick(Object.keys(CAT)); st.opts = shuffle(words(st.cat, S.L)).slice(0, 3); st.word = st.opts[0];
        S.ref.child('dr').remove().catch(() => {});
        players().forEach(u => priv(u, u === st.drawer ? { g: 'draw', role: 'drawer', opts: st.opts, t: st.turn } : { g: 'draw', role: 'guess', t: st.turn }));
        phase('choose', 12, { drawer: nameOf(st.drawer), du: st.drawer.slice(0, 8), turn: st.turn + 1, of: st.order.length }); G.view();
      },
      go(i) { st.word = st.opts[i] || st.opts[0]; priv(st.drawer, { g: 'draw', role: 'drawer', word: st.word, t: st.turn }); st.t0 = now(); phase('draw', 80, { drawer: nameOf(st.drawer), du: st.drawer.slice(0, 8), turn: st.turn + 1, of: st.order.length, len: [...st.word].length }); G.view(); },
      move(u, k) {
        if (S.ph === 'choose' && u === st.drawer && k.startsWith('w:')) return G.go(+k.slice(2));
        if (S.ph !== 'draw') return;
        if (u === st.drawer && k.startsWith('d:')) { const d = k.slice(2); if (d === 'clear') { st.ink = ''; S.ref.child('dr').push('C').catch(() => {}); } else { st.ink += d; S.ref.child('dr').push(d).catch(() => {}); } const cv = HE().querySelector('#smCv'); if (cv) { if (d === 'clear') paintStrokes(cv, '', true); else paintStrokes(cv, d, false); } return; }
        if (u !== st.drawer && k.startsWith('g:') && !st.got[u]) {
          const gs = k.slice(2, 40);
          if (norm(gs) === norm(st.word)) { const pts = 100 + Math.round(200 * left() / 80); st.got[u] = pts; add(u, pts); add(st.drawer, 60); st.gained[u] = (st.gained[u] || 0) + pts; st.gained[st.drawer] = (st.gained[st.drawer] || 0) + 60; SND.ok(); st.feed.unshift({ u, ok: 1 }); db.ref('khh/' + S.pin + '/' + u + '/ok').set(st.word).catch(() => {});
            if (Object.keys(st.got).length >= players().length - 1) return G.reveal(); }
          else { st.feed.unshift({ u, g: gs }); db.ref('khh/' + S.pin + '/' + u + '/no').set(Date.now()).catch(() => {}); }
          st.feed = st.feed.slice(0, 12); G.feed();
        }
      },
      reveal() { phase('reveal', 6, { word: st.word, drawer: nameOf(st.drawer) }); G.view(); },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'choose') G.go(0); else if (S.ph === 'draw') G.reveal(); else if (S.ph === 'reveal') G.next(); },
      feed() { const f = HE().querySelector('#smFeed'); if (f) f.innerHTML = st.feed.map(z => `<li class="${z.ok ? 'ok' : ''}" style="--c:${colOf(z.u)}"><span dir="auto">${esc(nameOf(z.u))}</span>${z.ok ? `<b>${B('خمّن الكلمة!', 'got it!')}</b>` : `<i dir="auto">${esc(z.g)}</i>`}</li>`).join(''); },
      view() {
        const ph = S.ph; let body = '', foot = '';
        if (ph === 'choose') body = `<h2>${B(`دور «${esc(nameOf(st.drawer))}» في الرسم`, `${esc(nameOf(st.drawer))} draws now`)}</h2><p class="sm-sub">${B('يختار كلمة من جواله…', 'Choosing a word on their phone…')}</p>`;
        else if (ph === 'draw' || ph === 'reveal') {
          const hint = ph === 'reveal' ? `<p class="sm-word">${esc(st.word)}</p>` : `<p class="sm-mask" dir="auto">${[...st.word].map(c => c === ' ' ? '&nbsp;&nbsp;' : '_').join(' ')}</p>`;
          body = `<div class="sm-drawrow"><div class="sm-cvw"><canvas id="smCv" width="900" height="900"></canvas></div><div class="sm-dside"><p class="sm-sub">${B(`يرسم: «${esc(nameOf(st.drawer))}»`, `Drawing: ${esc(nameOf(st.drawer))}`)} · ${st.turn + 1}/${st.order.length}</p>${hint}<ol class="sm-feed" id="smFeed"></ol></div></div>`;
          foot = ph === 'draw' ? `<button type="button" class="btn ghost" data-skip>${B('أنهِ الرسمة', 'End this drawing')}</button>` : '';
        }
        const q = frame(`<div class="sm-g sm-draw">${body}</div>`, foot);
        const cv = q('#smCv'); if (cv) paintStrokes(cv, st.ink, true);
        G.feed(); if (q('[data-skip]')) q('[data-skip]').onclick = () => G.reveal();
      }
    };
    return G;
  }

  /* ---------- the letter game ---------- */
  function Letters() {
    const st = { ans: {}, bad: {} };
    const G = {
      start() { S.lastGame = 'letters'; st.cats = LCATS(); st.letter = pick(LETTERS[S.L]); st.ans = {}; st.bad = {}; st.stop = null; phase('write', 120, { letter: st.letter, cats: st.cats, n: 0 }); G.view(); },
      move(u, k) {
        if (S.ph !== 'write' || !/^[aA]:/.test(k)) return;
        let a = []; try { a = JSON.parse(k.slice(2)); } catch (e) { return; }
        st.ans[u] = st.cats.map((_, i) => String(a[i] || '').trim().slice(0, 30));
        const full = st.ans[u].every(Boolean);
        if (k.charAt(0) === 'A' && full && !st.stop) { st.stop = u; S.end = Math.min(S.end, now() + 10000); pub(Object.assign({}, S.g, { stop: nameOf(u), t0: now(), dur: 10 })); SND.go(); fly(T('ستوب!', 'Stop!')); }
        pub(Object.assign({}, S.g, { n: Object.keys(st.ans).length })); G.view();
      },
      review() {
        // a word that does not start with the letter is out at once; the host can strike out any other
        Object.keys(st.ans).forEach(u => st.ans[u].forEach((w, i) => { if (w && first(w) !== st.letter.toLowerCase().replace(/[أإآ]/g, 'ا')) st.bad[u + ':' + i] = 1; }));
        phase('review', 0, { letter: st.letter }); G.view();
      },
      score() {
        const gained = {};
        st.cats.forEach((_, i) => { const ok = Object.keys(st.ans).filter(u => st.ans[u][i] && !st.bad[u + ':' + i]); const count = {}; ok.forEach(u => { const n = norm(st.ans[u][i]); count[n] = (count[n] || 0) + 1; });
          ok.forEach(u => { const p = count[norm(st.ans[u][i])] > 1 ? 50 : 100; gained[u] = (gained[u] || 0) + p; }); });
        Object.keys(gained).forEach(u => add(u, gained[u]));
        st.gained = gained; players().forEach(u => priv(u, { g: 'letters', mine: st.ans[u] || [], bad: st.cats.map((_, i) => !!st.bad[u + ':' + i]), pts: gained[u] || 0 }));
        gameOver(gained, B(`حرف «${esc(st.letter)}»`, `The letter ${esc(st.letter)}`));
      },
      tick() { if (S.ph === 'write' && S.end && left() <= 0) G.review(); },
      view() {
        const ph = S.ph, us = Object.keys(st.ans);
        if (ph === 'write') { const q = frame(`<div class="sm-g sm-let"><p class="sm-sub">${B('الحرف', 'The letter')}</p><p class="sm-letter">${esc(st.letter)}</p><p class="sm-cats">${st.cats.map(c => `<span>${esc(c)}</span>`).join('')}</p>${st.stop ? `<p class="sm-stop">${B(`«${esc(nameOf(st.stop))}» قال ستوب! ١٠ ثوانٍ`, `${esc(nameOf(st.stop))} called stop! 10 seconds`)}</p>` : ''}<p class="sm-count" dir="ltr">${us.length} / ${players().length}</p></div>`, `<button type="button" class="btn ghost" data-skip>${B('أنهِ الكتابة', 'End the writing')}</button>`); q('[data-skip]').onclick = () => G.review(); return; }
        const q = frame(`<div class="sm-g sm-let"><h2>${B(`حرف «${esc(st.letter)}»: راجع الإجابات`, `Letter ${esc(st.letter)}: check the answers`)}</h2><p class="sm-sub">${B('اضغط أي إجابة لا تصح لتشطبها. الإجابة المنفردة ١٠٠، والمكررة ٥٠.', 'Tap any answer that does not count to strike it. A unique answer is 100, a shared one 50.')}</p>
          <div class="sm-tbl"><table><thead><tr><th></th>${st.cats.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${us.map(u => `<tr><th dir="auto" style="color:${colOf(u)}">${esc(nameOf(u))}</th>${st.cats.map((_, i) => { const w = st.ans[u][i], bad = st.bad[u + ':' + i]; return `<td><button type="button" data-x="${u}:${i}" class="${!w ? 'empty' : bad ? 'bad' : ''}" dir="auto">${esc(w || '—')}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div>`,
          `<button type="button" class="btn solid" data-score>${B('احسب النقاط', 'Count the points')}</button>`);
        HE().querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const k = b.dataset.x; if (!st.ans[k.split(':')[0]][+k.split(':')[1]]) return; if (st.bad[k]) delete st.bad[k]; else st.bad[k] = 1; G.view(); });
        q('[data-score]').onclick = () => G.score();
      }
    };
    return G;
  }

  /* =====================================================================================
     the player: a phone
     ===================================================================================== */
  async function join(pin, name) {
    if (pin.length !== 6) return home(T('الرمز ستة أرقام.', 'The code has six digits.'));
    if (!name) return home(T('اكتب اسمك.', 'Type your name.'));
    root.innerHTML = `<div class="sm-card sm-wait">${B('لحظة…', 'One moment…')}</div>`;
    try {
      await within(fb());
      const s = await within(db.ref('kh/' + pin + '/host').once('value'));
      if (!s.exists()) return home(T('لا توجد جلسة بهذا الرمز.', 'No session with this code.'));
      await within(db.ref('kh/' + pin + '/pl/' + uid).set({ n: name, at: TS() }));
      store.set('name', name);
      S = { mode: 'player', pin, ref: db.ref('kh/' + pin), me: name, g: null, p: null, sc: {}, x: 0 };
      on(S.ref.child('g'), 'value', v => { const was = S.g; S.g = v.val(); if (!was || !S.g || was.ph !== S.g.ph || was.id !== S.g.id || was.r !== S.g.r || was.turn !== S.g.turn) { S.sent = null; buzz(30); if (S.g && was && S.g.turn !== was.turn) S.inkData = ''; if (S.g && (!was || was.id !== S.g.id)) S.lt = []; } phone(); });
      on(db.ref('khh/' + pin + '/' + uid), 'value', v => { const o = S.p; S.p = v.val(); if (S.p && o && S.p.no && S.p.no !== o.no) { buzz(120); flash(T('لا، جرّب غيرها', 'No, try another'), 'no'); } if (S.p && S.p.ok && (!o || o.ok !== S.p.ok)) { buzz([40, 60, 40]); flash(T('صح! خمّنتها', 'Right! You got it'), 'ok'); } phone(); });
      on(S.ref.child('sc'), 'value', v => { S.sc = v.val() || {}; phone(); });
      on(S.ref.child('host'), 'value', v => { if (!v.exists()) { stopAll(); home(T('انتهت الجلسة.', 'The session has ended.')); } });
      S.clk = setInterval(phoneClock, 250); subs.push(() => clearInterval(S && S.clk));
      phone();
    } catch (e) { home(T('تعذّر الدخول. تأكد من الإنترنت.', 'Could not join. Check the internet.')); }
  }
  const send = k => { if (!S) return; S.x++; S.ref.child('mv/' + uid).set({ k, c: '', x: S.x, t: TS() }).catch(() => {}); };
  const RX = ['👏', '😂', '🔥', '😮', '❤️', '🤔'];
  const rxBar = () => `<div class="sm-rx">${RX.map(e => `<button type="button" data-rx="${e}">${e}</button>`).join('')}</div>`;
  function flash(t, cls) { const d = document.createElement('div'); d.className = 'sm-flash ' + (cls || ''); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1600); }
  function phoneClock() { const g = S && S.g, b = root.querySelector('#smBar'); if (!b || !g || !g.dur) return; const l = Math.max(0, g.dur - (now() - g.t0) / 1000); b.style.width = (100 * l / g.dur) + '%'; }
  function phone() {
    if (!S || S.mode !== 'player') return;
    const g = S.g, p = S.p || {}, my = S.sc[uid] || 0;
    let body = '';
    const wait = (a, e) => `<div class="sm-pw"><p class="sm-big">${B(a, e)}</p></div>`;
    if (!g || !g.id || g.ph === 'pick') body = wait('أنت في الجلسة! تُختار اللعبة على الشاشة.', 'You are in! The game is chosen on the screen.');
    else if (g.ph === 'over') body = `<div class="sm-pw"><p class="sm-big">${esc(g.note || T('انتهت اللعبة', 'The game is over'))}</p>${g.gained && g.gained[uid] ? `<p class="sm-plus">+${g.gained[uid]}</p>` : ''}${p.g === 'letters' && p.mine ? `<ul class="sm-mine">${LCATS().map((c, i) => `<li class="${p.bad[i] ? 'bad' : ''}"><i>${esc(c)}</i><b dir="auto">${esc(p.mine[i] || '—')}</b></li>`).join('')}</ul>` : ''}</div>`;
    else if (g.id === 'spy') body = phoneSpy(g, p);
    else if (g.id === 'who') body = phoneWho(g, p);
    else if (g.id === 'draw') body = phoneDraw(g, p);
    else if (g.id === 'letters') body = phoneLetters(g, p);
    // keep what the player is typing when the page redraws
    if (S.drawing && g && g.id === 'draw' && g.ph === 'draw' && root.querySelector('#smPad')) return;
    const html = `<div class="sm-phone"><div class="sm-top"><span dir="auto">${esc(S.me)}</span><b>${my}</b></div>${g && g.dur ? '<div class="sm-bar"><i id="smBar"></i></div>' : ''}${body}${rxBar()}</div>`;
    if (html === S.html && root.querySelector('.sm-phone')) return; S.html = html;
    const keep = [...root.querySelectorAll('input[data-keep]')].map(i => [i.dataset.keep, i.value]), fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.keep : null;
    root.innerHTML = html;
    keep.forEach(([k, v]) => { const i = root.querySelector(`input[data-keep="${k}"]`); if (i && !i.value) i.value = v; });
    if (fk) { const i = root.querySelector(`input[data-keep="${fk}"]`); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } }
    root.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => { S.ref.child('rx/' + uid).set({ e: b.dataset.rx, t: TS() }).catch(() => {}); buzz(15); });
    bindPhone(g, p);
  }
  function phoneSpy(g, p) {
    const card = p.role === 'spy' ? `<div class="sm-role spy"><p>${B('أنت الجاسوس!', 'You are the spy!')}</p><small>${B('لا تعرف الكلمة. الفئة:', 'You do not know the word. Category:')} <b>${B(CAT[g.cat] ? CAT[g.cat][0] : '', CAT[g.cat] ? CAT[g.cat][1] : '')}</b></small></div>`
      : p.role === 'in' ? `<div class="sm-role"><p>${B('الكلمة السرية', 'The secret word')}</p><b dir="auto">${esc(p.w)}</b></div>` : '';
    if (g.ph === 'hint') return S.sent === 'h' ? card + `<div class="sm-pw"><p class="sm-big">${B('وصل تلميحك', 'Your clue is in')}</p></div>` : card + `<div class="sm-form"><label>${B('تلميح من كلمة واحدة', 'A one-word clue')}<input id="smIn" data-keep="h" maxlength="24" dir="auto" autocomplete="off"></label><button type="button" class="btn solid" data-send="h">${B('أرسل', 'Send')}</button></div>`;
    if (g.ph === 'show') return card + `<div class="sm-pw"><p class="sm-big">${B('ناقشوا: من الجاسوس؟', 'Talk: who is the spy?')}</p></div>` + phoneHints(g);
    if (g.ph === 'vote') return S.sent === 'v' ? card + `<div class="sm-pw"><p class="sm-big">${B('وصل صوتك', 'Your vote is in')}</p></div>` : card + `<div class="sm-votes"><p>${B('من الجاسوس؟', 'Who is the spy?')}</p>${(g.list || []).filter(x => x.u !== uid).map(x => `<button type="button" data-vote="${x.u}" dir="auto">${esc(x.n)}</button>`).join('')}</div>` + phoneHints(g);
    if (g.ph === 'guess') return p.role === 'spy' ? `<div class="sm-form"><p class="sm-big">${B('كشفوك! خمّن الكلمة لتسرق النقاط', 'Caught! Guess the word to steal the points')}</p><input id="smIn" data-keep="g" maxlength="30" dir="auto" autocomplete="off"><button type="button" class="btn solid" data-send="g">${B('أرسل', 'Send')}</button></div>` : `<div class="sm-pw"><p class="sm-big">${B(`كُشف الجاسوس «${esc(g.spy)}»، وأمامه فرصة أخيرة…`, `The spy ${esc(g.spy)} is caught, with one last chance…`)}</p></div>`;
    return card;
  }
  const phoneHints = g => (g.hints || []).length ? `<div class="sm-phints">${g.hints[g.hints.length - 1].map(h => `<span><i dir="auto">${esc(h.n)}</i><b dir="auto">${esc(h.h)}</b></span>`).join('')}</div>` : '';
  function phoneWho(g, p) {
    if (g.ph === 'reveal') return `<div class="sm-pw"><p class="sm-big">${B('انظر الشاشة: من كان من؟', 'Look at the screen: who was who?')}</p></div>`;
    const others = `<div class="sm-others"><p>${B('شخصيات الآخرين', 'The others')}</p>${(p.others || []).map(o => `<span><i dir="auto">${esc(o.n)}</i><b dir="auto">${esc(o.w)}</b></span>`).join('')}</div>`;
    if (p.solved) return `<div class="sm-pw ok"><p class="sm-big">${B('عرفتها!', 'You got it!')}</p><p class="sm-word" dir="auto">${esc(p.solved)}</p><p class="sm-plus">+${p.pts}</p></div>` + others;
    return `<div class="sm-form"><p class="sm-big">${B('من أنت؟', 'Who are you?')}</p><small>${B('الفئة:', 'Category:')} ${B(CAT[g.cat] ? CAT[g.cat][0] : '', CAT[g.cat] ? CAT[g.cat][1] : '')}</small><input id="smIn" data-keep="g" maxlength="30" dir="auto" autocomplete="off" placeholder="${T('اكتب تخمينك', 'Type your guess')}"><button type="button" class="btn solid" data-send="g" data-stay>${B('خمّن', 'Guess')}</button></div>` + others;
  }
  function phoneDraw(g, p) {
    const me = p.role === 'drawer';
    if (g.ph === 'choose') return me && p.opts ? `<div class="sm-votes"><p>${B('دورك في الرسم! اختر كلمة', 'Your turn to draw! Choose a word')}</p>${p.opts.map((w, i) => `<button type="button" data-word="${i}" dir="auto">${esc(w)}</button>`).join('')}</div>` : `<div class="sm-pw"><p class="sm-big">${B(`«${esc(g.drawer)}» يختار كلمة…`, `${esc(g.drawer)} is choosing a word…`)}</p></div>`;
    if (g.ph === 'reveal') return `<div class="sm-pw"><p>${B('الكلمة كانت', 'The word was')}</p><p class="sm-word" dir="auto">${esc(g.word)}</p></div>`;
    if (me) return `<div class="sm-pad"><p class="sm-tell">${B('ارسم:', 'Draw:')} <b dir="auto">${esc(p.word || '')}</b></p><canvas id="smPad" width="600" height="600"></canvas><div class="sm-tools">${COLS_D.slice(0, 5).map((c, i) => `<button type="button" data-ink="${i}" style="background:${c}" aria-pressed="${(S.ink || 0) === i}"></button>`).join('')}<button type="button" data-ink="5" class="er" aria-pressed="${S.ink === 5}">${B('ممحاة', 'Eraser')}</button><button type="button" data-clear>${B('امسح', 'Clear')}</button></div></div>`;
    if (p.ok) return `<div class="sm-pw ok"><p class="sm-big">${B('خمّنتها!', 'You got it!')}</p><p class="sm-word" dir="auto">${esc(p.ok)}</p></div><canvas id="smView" class="sm-view" width="600" height="600"></canvas>`;
    return `<canvas id="smView" class="sm-view" width="600" height="600"></canvas><div class="sm-form"><p>${B(`يرسم «${esc(g.drawer)}»: ${g.len} حروف`, `${esc(g.drawer)} is drawing: ${g.len} letters`)}</p><input id="smIn" data-keep="g" maxlength="30" dir="auto" autocomplete="off" placeholder="${T('ما هذه؟', 'What is it?')}"><button type="button" class="btn solid" data-send="g" data-stay>${B('خمّن', 'Guess')}</button></div>`;
  }
  function phoneLetters(g, p) {
    if (g.ph === 'review') return `<div class="sm-pw"><p class="sm-big">${B('المراجعة على الشاشة…', 'The answers are checked on the screen…')}</p></div>`;
    const cats = g.cats || LCATS(), mine = S.lt || [];
    return `<div class="sm-form sm-lform"><p class="sm-letter">${esc(g.letter)}</p>${g.stop ? `<p class="sm-stop">${B(`«${esc(g.stop)}» قال ستوب!`, `${esc(g.stop)} called stop!`)}</p>` : ''}${cats.map((c, i) => `<label>${esc(c)}<input data-keep="l${i}" data-l="${i}" maxlength="30" dir="auto" autocomplete="off"></label>`).join('')}<button type="button" class="btn solid" data-stop>${B('خلصت! ستوب', 'Done! Stop')}</button></div>`;
  }
  function bindPhone(g, p) {
    const q = s => root.querySelector(s), inp = q('#smIn');
    root.querySelectorAll('[data-send]').forEach(b => b.onclick = () => { const v = (inp && inp.value || '').trim(); if (!v) return; send(b.dataset.send + ':' + v); if (!b.hasAttribute('data-stay')) S.sent = b.dataset.send; else inp.value = ''; buzz(20); phone(); });
    if (inp) { if (!document.activeElement || document.activeElement === document.body) setTimeout(() => inp.focus(), 50); inp.onkeydown = e => { if (e.key === 'Enter') { const b = q('[data-send]'); if (b) b.click(); } }; }
    root.querySelectorAll('[data-vote]').forEach(b => b.onclick = () => { send('v:' + b.dataset.vote); S.sent = 'v'; buzz(20); phone(); });
    root.querySelectorAll('[data-word]').forEach(b => b.onclick = () => { send('w:' + b.dataset.word); buzz(20); });
    // the letter game: what is typed goes out quietly as it is written, and "stop" sends it all at once
    const ls = root.querySelectorAll('[data-l]'); if (ls.length) { const vals = () => [...ls].map(i => i.value.trim()); let t = null; ls.forEach(i => i.oninput = () => { S.lt = vals(); clearTimeout(t); t = setTimeout(() => send('a:' + JSON.stringify(S.lt)), 700); });
      q('[data-stop]').onclick = () => { S.lt = vals(); if (!S.lt.every(Boolean)) { flash(T('املأ الخانات كلها أولًا', 'Fill all the boxes first'), 'no'); return; } send('A:' + JSON.stringify(S.lt)); buzz([40, 60, 40]); }; }
    // drawing: points gathered as the finger moves, sent every 120 ms
    const pad = q('#smPad'); if (pad) drawPad(pad);
    const view = q('#smView'); if (view) viewer(view);
  }
  function drawPad(cv) {
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    if (S.inkData) paintStrokes(cv, S.inkData, false);
    let buf = '', hdr = '', cur = null; S.ink = S.ink || 0;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1295, (e.clientY - r.top) / r.height * 1295]; };
    const flush = () => { if (!buf || buf === hdr) return; send('d:' + buf); S.inkData = (S.inkData || '') + buf; buf = hdr = cur ? '|' + S.ink + enc(cur[0]) + enc(cur[1]) : ''; };
    const iv = setInterval(flush, 120); subs.push(() => clearInterval(iv));
    cv.onpointerdown = e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); S.drawing = true; const p = pt(e); cur = p; buf += '|' + S.ink + enc(p[0]) + enc(p[1]); hdr = ''; paintStrokes(cv, '|' + S.ink + enc(p[0]) + enc(p[1]), false); };
    cv.onpointermove = e => { if (!cur) return; const p = pt(e); if (Math.hypot(p[0] - cur[0], p[1] - cur[1]) < 8) return; const seg = '|' + S.ink + enc(cur[0]) + enc(cur[1]) + enc(p[0]) + enc(p[1]); paintStrokes(cv, seg, false); buf += enc(p[0]) + enc(p[1]); cur = p; };
    cv.onpointerup = cv.onpointercancel = () => { flush(); cur = null; buf = hdr = ''; setTimeout(() => { S.drawing = false; }, 300); };
    root.querySelectorAll('[data-ink]').forEach(b => b.onclick = () => { S.ink = +b.dataset.ink; root.querySelectorAll('[data-ink]').forEach(z => z.setAttribute('aria-pressed', z === b)); });
    root.querySelector('[data-clear]').onclick = () => { send('d:clear'); S.inkData = ''; x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); };
  }
  // the guessers' phones show the drawing too, so the game works without a big screen
  function viewer(cv) {
    paintStrokes(cv, '', true);
    if (S.drOff) S.drOff();
    const ref = S.ref.child('dr'), fn = s => { const d = s.val(); if (d === 'C') paintStrokes(cv, '', true); else paintStrokes(cv, d, false); };
    ref.on('child_added', fn); S.drOff = () => ref.off('child_added', fn); subs.push(S.drOff);
  }

  // a link with a code opens the join form with the code filled in
  home();
})();

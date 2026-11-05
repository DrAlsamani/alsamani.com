/* Tasalsul (alsamani.com/play/tasalsul): a card-and-board game of rows of five or four, for teams.
   Play with friends — the board on a big screen and each hand on a phone, or everyone remote on their own phone — or against the computer.
   The device that creates a game keeps the rules and the pack; the others send their moves. */
(function () {
  const root = document.getElementById('kh');
  if (!root || !window.KH) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('kh.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('kh.' + k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem('kh.' + k); } catch (e) {} } };
  const toast = (html, bad) => { let t = document.getElementById('khToast'); if (!t) { t = document.createElement('div'); t.id = 'khToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3200); };
  // short sounds made in the browser (no files)
  let ac = null;
  const tone = (f, d, type, v, at) => { if (store.get('snd', true) === false) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v || .07, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02); } catch (e) {} };
  const SND = { turn: () => { tone(660, .15, 'triangle', .09); tone(880, .15, 'triangle', .09, .14); tone(1175, .25, 'triangle', .09, .28); }, chip: () => tone(320, .09, 'square', .05), tick: () => tone(1300, .05, 'square', .04),
    seq: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, .3, 'triangle', .08, k * .1)), win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, .4, 'triangle', .09, k * .14)) };
  const SVG = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const SVOL = SVG('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'), SMUTE = SVG('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>');
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const COL = ['#2a6fdb', '#d64545', '#2f9e5b'];
  const TN = k => [T('الأزرق', 'Blue'), T('الأحمر', 'Red'), T('الأخضر', 'Green')][k];
  const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const JOIN = 'alsamani.com/play/tasalsul';
  const card = (c, cls) => {
    if (c === '*') return `<span class="kc star">★</span>`;
    const r = c.slice(0, -1), s = c.slice(-1), red = s === 'H' || s === 'D';
    const jk = r === 'J' ? (KH.twoEyed(c) ? `<em>${B('ضع في أي مكان', 'Wild')}</em>` : `<em>${B('أزل قطعة', 'Remove')}</em>`) : '';
    return `<span class="kc${red ? ' r' : ''}${r === 'J' ? ' j' : ''} ${cls || ''}"><b>${r === 'T' ? '10' : r}</b><i>${SUIT[s]}</i><s>${r === 'K' ? '♚' : r === 'Q' ? '♛' : SUIT[s]}</s>${r === 'J' ? `<u>${KH.twoEyed(c) ? '👀' : '👁'}</u>` : ''}${jk}</span>`;
  };

  let G = null;          // the game on this device
  let db = null, uid = null, off = 0;
  const now = () => Date.now() + off;
  async function fb() {
    if (db) return;
    if (!window.firebase || !window.MD_CFG) throw new Error('nofb');
    if (!firebase.apps.length) firebase.initializeApp(MD_CFG);
    const u = (await new Promise(r => { const off = firebase.auth().onAuthStateChanged(u => { off(); r(u); }); })) || (await firebase.auth().signInAnonymously()).user;
    uid = u.uid; db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const wipe = async pin => { try { await db.ref('khh/' + pin).remove(); } catch (e) {} try { await db.ref('kh/' + pin).remove(); } catch (e) {} };
  // voice: everyone at the table talks while they play, as if sitting together
  const avOn = (n, h) => { if (window.AV && G && G.ref && !(G.o && G.o.bot)) AV.attach({ ref: G.ref.child('av'), uid, name: n, host: !!h }); };
  const stop = () => { if (window.AV) AV.detach(); if (G && G.off) G.off.forEach(f => f()); if (G && G.botT) clearTimeout(G.botT); if (G && G.tt) clearTimeout(G.tt); clearInterval(clk); G = null; };
  let clk = null;
  const on = (ref, ev, fn) => { ref.on(ev, fn); G.off.push(() => ref.off(ev, fn)); };

  const rules = open => `<details class="kh-rules"${open ? ' open' : ''}><summary>${B('كيف تُلعب؟', 'How to play')}</summary>
        <ol><li>${B('لكل فريق لون. في دورك اختر ورقة من يدك، ثم ضع قطعتك على إحدى خانتيها في اللوح (لكل ورقة خانتان).', 'Each team has a colour. On your turn pick a card, then put your chip on one of its two spaces.')}</li>
        <li>${B('<b>السلسلة</b>: خمس قطع متتالية من لونك أفقيًا أو عموديًا أو قطريًا. الزوايا ★ مجانية للجميع.', '<b>A sequence</b>: five of your chips in a row, across, down or diagonal. The ★ corners count for everyone.')}</li>
        <li>${B('<b>ولد أبو عينين</b> (♦ و♣): ضع قطعتك في أي خانة فارغة. <b>ولد أبو عين</b> (♠ و♥): أزل قطعة خصم، إلا إن كانت في سلسلة مكتملة.', '<b>Two-eyed jacks</b> (♦ ♣): put your chip on any empty space. <b>One-eyed jacks</b> (♠ ♥): remove a rival chip unless it is in a finished sequence.')}</li>
        <li>${B('<b>الفوز</b>: يفوز أول فريق يكمل عدد السلاسل المختار عند بدء اللعبة (واحدة أو اثنتان أو ثلاث). ويمكن اختيار صف من أربع للعب أسرع.', '<b>Winning</b>: the first team to make the number of sequences chosen at the start (one, two or three). Rows of four make a quicker game.')}</li>
        <li>${B('<b>الورقة الميتة</b>: إن امتلأت خانتاها فاستبدلها بورقة جديدة مرة في الدور.', '<b>A dead card</b>: if both its spaces are taken, swap it for a new one, once a turn.')}</li></ol></details>`;
  /* ---------- home ---------- */
  function home() {
    stop();
    const P = store.get('run', null), fresh = P && Date.now() - P.at < 864e5;
    const p = new URLSearchParams(location.search).get('k');
    if (p && /^\d{6}$/.test(p)) return joinCode(p);
    root.innerHTML = `${fresh ? `<div class="kh-card kh-resume"><p>${B('لعبة لم تكتمل', 'An unfinished game')} · ${B('الرمز', 'code')} <span dir="ltr">${P.pin}</span></p><div class="kh-row"><button type="button" class="btn solid" id="khRes">${B('أكمل اللعبة ▶', 'Resume ▶')}</button><button type="button" class="btn ghost" id="khDrop">${B('احذفها', 'Remove it')}</button></div></div>` : ''}
      <div class="kh-hero"><div class="kh-mini">${demo()}</div><div>
        <h2>${B('خمس في صف… قبل خصمك!', 'Five in a row… before the others!')}</h2>
        <p>${B('العب ورقة من يدك وضع قطعتك على خانتها، وكوّن صفًّا من خمس قطع. ولد أبو عينين يضعك في أي مكان، وولد أبو عين يشيل قطعة خصمك.', 'Play a card and put your chip on its space, and make a row of five. A two-eyed jack goes anywhere; a one-eyed jack removes a rival chip.')}</p></div></div>
      <div class="kh-modes">
        <button type="button" class="kh-mode" data-go="host"><b>${B('العب مع الآخرين', 'Play with others')}</b><small>${B('أنشئ لعبة وشارك رمزها: اللوح على شاشة كبيرة والأوراق في الجوالات، أو كلٌّ من مكانه عن بُعد.', 'Create a game and share its code: the board on a big screen and the hands on phones, or everyone remote.')}</small></button>
        <button type="button" class="kh-mode" data-go="join"><b>${B('ادخل برمز', 'Join with a code')}</b><small>${B('عندك رمز لعبة؟ ادخل واختر فريقك.', 'Got a game code? Join and pick your team.')}</small></button>
        <button type="button" class="kh-mode" data-go="bot"><b>${B('العب ضد الجهاز', 'Play the computer')}</b><small>${B('جرّب اللعبة وحدك وتعلّم قواعدها.', 'Try it on your own and learn the rules.')}</small></button>
      </div>
      ${rules()}`;
    if (fresh) { root.querySelector('#khRes').onclick = () => resumeHost(P); root.querySelector('#khDrop').onclick = async () => { store.del('run'); try { await fb(); await wipe(P.pin); } catch (e) {} home(); }; }
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ({ host: setup, join: joinCode, bot: () => setup(true) })[b.dataset.go]());
  }
  // a tiny board on the home screen: five in a row
  function demo() {
    const lay = KH.layout(11), row = [22, 33, 44, 55, 66];
    return `<div class="kh-board kh-demo">${lay.slice(0, 100).map((c, i) => `<div class="kh-cell">${card(c)}${row.includes(i) ? `<i class="kh-chip seq" style="--c:${COL[0]}"></i>` : [27, 38, 72].includes(i) ? `<i class="kh-chip" style="--c:${COL[1]}"></i>` : ''}</div>`).join('')}</div>`;
  }

  /* ---------- a new game: teams, row length, and who this device is ---------- */
  function setup(bot) {
    const o = Object.assign({ teams: 2, L: 4, need: 3, role: 'play', tt: 15, lv: 2 }, store.get('cfg2', {})); if (!o.need) o.need = 3; if (![5, 10, 15, 30, 60].includes(o.tt)) o.tt = 15;
    root.innerHTML = `<div class="kh-card"><h2>${bot ? '' + B('العب ضد الجهاز', 'Play the computer') : '' + B('لعبة جديدة', 'A new game')}</h2>
      <div class="kh-opt"><span>${B('عدد الفرق', 'Teams')}</span><div class="kh-seg" data-k="teams"><button type="button" data-v="2">${B('فريقان', 'Two')}</button><button type="button" data-v="3">${B('ثلاثة فرق', 'Three')}</button></div></div>
      <div class="kh-opt"><span>${B('طول الصف', 'Row length')}</span><div class="kh-seg" data-k="L"><button type="button" data-v="4">${B('أربع (أسرع)', 'Four (quicker)')}</button><button type="button" data-v="5">${B('خمس (الأصلية)', 'Five (classic)')}</button></div></div>
      <div class="kh-opt"><span>${B('سلاسل الفوز', 'Sequences to win')}</span><div class="kh-seg" data-k="need"><button type="button" data-v="1">${B('واحدة', 'One')}</button><button type="button" data-v="2">${B('اثنتان', 'Two')}</button><button type="button" data-v="3">${B('ثلاث', 'Three')}</button></div></div>
      ${bot ? `<div class="kh-opt"><span>${B('مستوى الجهاز', 'Computer level')}</span><div class="kh-seg" data-k="lv"><button type="button" data-v="1">${B('سهل', 'Easy')}</button><button type="button" data-v="2">${B('متوسط', 'Medium')}</button><button type="button" data-v="3">${B('صعب', 'Hard')}</button></div></div>` : ''}
      ${bot ? '' : `<div class="kh-opt"><span>${B('وقت الدور', 'Time per turn')}</span><div class="kh-seg" data-k="tt">${[[5, '٥ ثوانٍ', '5 s'], [10, '١٠ ثوانٍ', '10 s'], [15, '١٥ ثانية', '15 s'], [30, '٣٠ ثانية', '30 s'], [60, 'دقيقة', '1 min']].map(([v, a, e]) => `<button type="button" data-v="${v}">${B(a, e)}</button>`).join('')}</div></div>`}
      ${bot ? '' : `<div class="kh-opt"><span>${B('هذا الجهاز', 'This device')}</span><div class="kh-seg" data-k="role"><button type="button" data-v="play">${B('ألعب منه', 'I play on it')}</button><button type="button" data-v="screen">${B('شاشة عرض فقط', 'A display screen only')}</button></div></div>`}
      <label class="kh-opt kh-name" ${!bot && o.role === 'screen' ? 'hidden' : ''}><span>${B('اسمك', 'Your name')}</span><input id="khN" maxlength="24" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <p class="kh-note" id="khNote"></p>
      <div class="kh-row"><button type="button" class="btn solid" id="khGo">${bot ? B('ابدأ اللعب ▶', 'Start ▶') : B('أنشئ اللعبة', 'Create the game')}</button><button type="button" class="btn ghost" id="khBack">${B('رجوع', 'Back')}</button></div></div>`;
    const paint = () => {
      root.querySelectorAll('.kh-seg').forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(o[g.dataset.k]) === b.dataset.v)));
      const nm = root.querySelector('.kh-name'); if (nm) nm.hidden = !bot && o.role === 'screen';
      const nw = ['', 'سلسلة واحدة', 'سلسلتين', 'ثلاث سلاسل'][o.need], ne = ['', 'one sequence', 'two sequences', 'three sequences'][o.need];
      root.querySelector('#khNote').innerHTML = B(`يفوز أول فريق يكمل <b>${nw}</b>، كل سلسلة ${o.L === 4 ? 'أربع' : 'خمس'} قطع متتالية.${o.teams === 3 && o.need > 1 ? ' (مع ثلاثة فرق تطول اللعبة.)' : ''}`, `The first team to make <b>${ne}</b> of ${o.L} wins.`);
    };
    root.querySelectorAll('.kh-seg button').forEach(b => b.onclick = () => { const k = b.parentNode.dataset.k; o[k] = k === 'role' ? b.dataset.v : +b.dataset.v;  paint(); });
    paint();
    root.querySelector('#khBack').onclick = home;
    root.querySelector('#khGo').onclick = () => {
      const n = (root.querySelector('#khN') || {}).value; if (n != null && n.trim()) store.set('name', n.trim().slice(0, 24));
      store.set('cfg2', o);
      if (bot) return local(o, (n || '').trim() || T('أنت', 'You'));
      if (o.role === 'play' && !(n || '').trim()) { toast(B('اكتب اسمك.', 'Write your name.'), 1); return; }
      host(o, (n || '').trim());
    };
  }

  /* ---------- against the computer: everything stays on this device ---------- */
  function local(o, name) {
    stop();
    const players = [{ id: 'me', team: 0 }, { id: 'b1', team: 1 }].concat(o.teams === 3 ? [{ id: 'b2', team: 2 }] : []);
    const st = KH.create({ players, teams: o.teams, L: o.L, need: o.need });
    G = { mode: 'local', st, me: 'me', off: [], names: { me: name, b1: T('الجهاز', 'Computer') + (o.teams === 3 ? ' ١' : ''), b2: T('الجهاز ٢', 'Computer 2') } };
    const act = (k, c, i) => { const e = k === 'p' ? KH.play(st, 'me', c, i) : k === 's' ? KH.swap(st, 'me', c) : KH.pass(st, 'me'); if (e) return; after(); };
    const after = () => { show(); if (st.win === -1 && KH.cur(st) !== 'me') G.botT = setTimeout(botTurn, 750); };
    const botTurn = () => { if (!G || st.win !== -1) return; const id = KH.cur(st); if (id === 'me') return; const m = KH.botMove(st, id, o.lv || 2); if (!m) KH.pass(st, id); else if (m.swap) { KH.swap(st, id, m.swap); return botTurn(); } else KH.play(st, id, m.card, m.i); after(); };
    const show = () => view({ P: KH.pub(st), hand: st.hands.me, me: 'me', names: G.names, act, again: () => local(o, name) });
    after();
  }

  /* ---------- the host: makes the room, keeps the pack, applies everyone's moves ---------- */
  async function host(o, name) {
    stop(); root.innerHTML = `<div class="kh-card"><p>${B('لحظة…', 'One moment…')}</p></div>`;
    try { await fb(); } catch (e) { root.innerHTML = `<div class="kh-card"><p>${B('تعذّر الاتصال. تأكد من الإنترنت.', 'Could not connect. Check the internet.')}</p><button type="button" class="btn ghost" id="khBack">${B('رجوع', 'Back')}</button></div>`; root.querySelector('#khBack').onclick = home; return; }
    let pin = null;
    for (let t = 0; t < 6 && !pin; t++) { const p = String(100000 + Math.floor(Math.random() * 900000)); try { await db.ref('kh/' + p).set({ host: uid, at: TS(), st: 'lobby', cfg: { teams: o.teams, L: o.L, need: o.need, tt: o.tt || 0 } }); pin = p; } catch (e) {} }
    if (!pin) { toast(B('تعذّر إنشاء اللعبة.', 'Could not create the game.'), 1); return home(); }
    G = { mode: 'host', pin, o: Object.assign({ tt: 15 }, o), ser: new Array(o.teams).fill(0), rnd: 0, ref: db.ref('kh/' + pin), names: {}, tm: {}, off: [], me: o.role === 'play' ? uid : null };
    if (G.me) await G.ref.child('pl/' + uid).set({ n: name, at: TS() });
    avOn(name || T('المضيف', 'Host'), true);
    lobby();
  }
  function lobby() {
    const url = 'https://' + JOIN + '/?k=' + G.pin;
    let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (e) {}
    root.innerHTML = `<div class="kh-card kh-lobby"><div class="kh-join"><div><p>${B('ادخلوا من جوالاتكم على', 'Join on your phones at')}</p><p class="kh-url" dir="ltr">${JOIN}</p><p>${B('واكتبوا الرمز', 'and enter the code')}</p><p class="kh-pin" dir="ltr">${G.pin.slice(0, 3)} ${G.pin.slice(3)}</p>
      <button type="button" class="btn ghost" id="khShare">${B('أرسل رابط الدخول', 'Send the join link')}</button></div><div class="kh-qr">${qr}</div></div>
      <div class="kh-teams" id="khTeams"></div><p class="kh-note">${B('انقر اسم أي لاعب لنقله إلى فريق آخر. ومن أراد المتابعة فقط يدخل بالرمز نفسه ويختار «شاهد فقط»، ولو بعد بدء اللعب.', 'Tap a player’s name to move them. Anyone who only wants to follow enters the same code and picks “Just watch”, even after the start.')}</p>
      <div class="kh-row"><button type="button" class="btn solid" id="khStart" disabled>${B('ابدأ اللعب ▶', 'Start ▶')}</button><button type="button" class="btn ghost" id="khEnd">${B('إلغاء', 'Cancel')}</button></div></div>`;
    root.querySelector('#khShare').onclick = async e => { const text = T('تعال العب تسلسل: ', 'Come and play Tasalsul: ') + url; try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); e.currentTarget.textContent = '✓ ' + T('تم النسخ', 'Copied'); } } catch (er) {} };
    root.querySelector('#khEnd').onclick = async () => { await wipe(G.pin); store.del('run'); home(); };
    const draw = () => {
      const ids = Object.keys(G.names), box = root.querySelector('#khTeams'); if (!box) return;
      box.innerHTML = [...Array(G.o.teams).keys()].map(k => { const m = ids.filter(u => G.tm[u] === k); return `<div class="kh-team" style="--c:${COL[k]}"><h4>${TN(k)} <small>${m.length}</small></h4>${m.map(u => `<button type="button" data-u="${u}" dir="auto">${esc(G.names[u])}${u === G.me ? ' ' : ''}</button>`).join('')}</div>`; }).join('');
      box.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const u = b.dataset.u; G.tm[u] = (G.tm[u] + 1) % G.o.teams; G.ref.child('tm').set(G.tm); draw(); });
      root.querySelector('#khStart').disabled = [...Array(G.o.teams).keys()].some(k => !ids.some(u => G.tm[u] === k));
    };
    on(G.ref.child('pl'), 'child_added', s => {
      const v = s.val() || {}; G.names[s.key] = v.n;
      if (G.tm[s.key] == null) { const c = [...Array(G.o.teams).keys()].map(k => Object.values(G.tm).filter(t => t === k).length); G.tm[s.key] = c.indexOf(Math.min(...c)); G.ref.child('tm').set(G.tm); }
      draw(); buzz(10);
    });
    on(G.ref.child('pl'), 'child_removed', s => { delete G.names[s.key]; delete G.tm[s.key]; G.ref.child('tm').set(G.tm); draw(); });
    root.querySelector('#khStart').onclick = start;
  }
  async function start() {
    G.off.forEach(f => f()); G.off = [];
    const players = Object.keys(G.names).map(id => ({ id, team: G.tm[id] })).sort(() => Math.random() - .5);
    G.st = KH.create({ players, teams: G.o.teams, L: G.o.L, need: G.o.need });
    await G.ref.child('st').set('play');
    await publish(true);
    run();
  }
  // what everyone sees, then each hand to its owner only
  // the turn clock: when it runs out, the computer plays a sensible move for that player
  const pubOf = () => Object.assign(KH.pub(G.st), { dl: G.dl || 0, tt: G.o.tt || 0, ser: G.ser || null, rnd: G.rnd || 0, aw: G.aw && Object.keys(G.aw).length ? G.aw : null });
  function clock() {
    const st = G.st; clearTimeout(G.tt); clearTimeout(G.bt);
    if (st.win === -1 && G.aw && G.aw[KH.cur(st)]) { const n = st.turn; G.bt = setTimeout(() => { if (G && G.st && G.st.turn === n && G.st.win === -1) autoMove(2); }, 1600); }
    if (!G.o.tt || st.win !== -1) { G.dl = 0; return; }
    if (G.dlN !== st.turn || !G.dl) { G.dlN = st.turn; G.dl = now() + G.o.tt * 1000; }
    G.tt = setTimeout(timeUp, Math.max(0, G.dl - now()) + 400);
  }
  function timeUp() {
    if (!G || !G.st || G.st.win !== -1 || G.dlN !== G.st.turn) return;
    const id = KH.cur(G.st);
    // two turns in a row run out: the player seems to have left, so the computer takes their turns until they are back
    G.miss = G.miss || {}; G.miss[id] = (G.miss[id] || 0) + 1;
    if (G.miss[id] >= 2 && id !== G.me && !(G.aw && G.aw[id])) { G.aw = Object.assign(G.aw || {}, { [id]: 1 }); toast(B(`${esc(G.names[id] || '')} غائب؛ صار الجهاز يلعب عنه. تقدر تخرجه من «اللاعبون».`, `${esc(G.names[id] || '')} seems away; the computer plays for them. You can remove them under “Players”.`)); }
    autoMove(1);
  }
  // a move made for the player whose turn it is: at random when time ran out (so the clock never helps), a sensible one when they are away or skipped
  function autoMove(how) {
    const st = G.st, id = KH.cur(st);
    if (how === 2) { const b = KH.botMove(st, id, 2); if (b && b.swap) KH.swap(st, id, b.swap); const m = b && !b.swap ? b : KH.botMove(st, id, 2); if (m && !m.swap) { KH.play(st, id, m.card, m.i); if (st.last) st.last.auto = 2; } else KH.pass(st, id); G.lastBy = id; publish(false); show(); return; }
    const rnd = () => { const ms = []; for (const c of new Set(st.hands[id])) for (const i of KH.legal(st, c)) ms.push({ card: c, i }); return ms[Math.floor(Math.random() * ms.length)]; };
    let m = rnd();
    if (!m) { const d = st.hands[id].find(c => KH.dead(st, c)); if (d && !st.swapped) { KH.swap(st, id, d); m = rnd(); } }
    if (!m) KH.pass(st, id); else { KH.play(st, id, m.card, m.i); if (st.last) st.last.auto = true; }
    G.lastBy = id; publish(false); show();
  }
  // the host's say over a player who stopped playing: skip their turn now, let the computer play for them, or take them out
  function manage(u, k) {
    const st = G.st; if (!st || st.win !== -1) return;
    const n = esc(G.names[u] || '');
    if (k === 'skip') { if (KH.cur(st) === u) autoMove(2); return; }
    if (k === 'away') { G.aw = G.aw || {}; if (G.aw[u]) { delete G.aw[u]; if (G.miss) G.miss[u] = 0; } else G.aw[u] = 1; publish(false); show(); return; }
    if (k === 'out') {
      const e = KH.drop(st, u); if (e === 'last') return toast(B(`${n} آخر لاعب في فريقه؛ خلّ الجهاز يلعب عنه بدل إخراجه.`, `${n} is the last of their team; let the computer play for them instead.`), 1); if (e) return;
      if (G.aw) delete G.aw[u]; delete G.names[u]; delete G.tm[u];
      G.ref.update({ ['pl/' + u]: null, ['ok/' + u]: null, tm: G.tm }).catch(() => {}); db.ref('khh/' + G.pin + '/' + u).remove().catch(() => {});
      toast(B(`خرج ${n} من اللعبة.`, `${n} is out of the game.`)); publish(true); show();
    }
  }
  function playersSheet() {
    const old = document.querySelector('.kh-psheet'); if (old) old.remove();
    const st = G.st; if (!st) return; const cu = KH.cur(st), aw = G.aw || {};
    const el = document.createElement('div'); el.className = 'kh-psheet';
    const ids = Object.keys(st.team).filter(u => u !== G.me);
    el.innerHTML = `<div class="kh-psh" role="dialog" aria-label="${T('اللاعبون', 'Players')}"><h3>${B('اللاعبون', 'Players')}</h3>${cu !== G.me && st.win === -1 ? `<button type="button" class="btn solid" data-pm="skip" data-u="${cu}">${B(`تخطَّ دور ${esc(G.names[cu] || '')}`, `Skip ${esc(G.names[cu] || '')}’s turn`)}</button>` : ''}
      ${ids.length ? ids.map(u => { const t = st.team[u], last = !Object.keys(st.team).some(x => x !== u && st.team[x] === t); return `<div class="kh-pr" style="--c:${COL[t]}"><b dir="auto">${esc(G.names[u] || '')}</b><small>${TN(t)}${aw[u] ? ' · ' + T('الجهاز يلعب عنه', 'computer plays') : ''}${u === cu ? ' · ' + T('دوره', 'their turn') : ''}</small><span><button type="button" class="btn ghost" data-pm="away" data-u="${u}">${aw[u] ? B('رجّعه يلعب', 'Back to them') : B('خلّ الجهاز يلعب عنه', 'Computer plays')}</button><button type="button" class="btn ghost" data-pm="out" data-u="${u}"${last ? ` disabled title="${T('آخر لاعب في فريقه', 'Last of the team')}"` : ''}>${B('أخرجه', 'Remove')}</button></span></div>`; }).join('') : `<p>${B('لا لاعبين غيرك.', 'No other players.')}</p>`}
      <button type="button" class="btn ghost" data-pm="x">${B('إغلاق', 'Close')}</button></div>`;
    document.body.appendChild(el);
    el.onclick = e => { const b = e.target.closest('[data-pm]'); if (e.target === el || (b && b.dataset.pm === 'x')) return el.remove(); if (!b) return; const k = b.dataset.pm, u = b.dataset.u; if (k === 'out' && !confirm(T(`تخرج ${G.names[u] || ''} من اللعبة؟ ترجع أوراقه للكومة.`, `Remove ${G.names[u] || ''}? Their cards go back to the deck.`))) return; manage(u, k); el.remove(); if (k === 'away') playersSheet(); };
  }
  async function publish(all) {
    const st = G.st; clock();
    if (st.win !== -1 && G.counted !== G.rnd) { G.counted = G.rnd; if (st.win >= 0) { G.ser = G.ser || new Array(G.o.teams).fill(0); G.ser[st.win]++; } }
    store.set('run', { pin: G.pin, st, names: G.names, tm: G.tm, o: G.o, me: G.me, ser: G.ser, rnd: G.rnd, counted: G.counted, at: Date.now() });
    await G.ref.update({ g: pubOf(), names: G.names, st: st.win !== -1 ? 'end' : 'play' });
    const ids = all ? Object.keys(st.hands) : [G.lastBy].filter(Boolean);
    await Promise.all(ids.map(id => db.ref('khh/' + G.pin + '/' + id).set(st.hands[id])));
  }
  function apply(id, k, c, i) {
    const st = G.st, e = k === 'p' ? KH.play(st, id, c, i) : k === 's' ? KH.swap(st, id, c) : KH.pass(st, id);
    if (e) return e;
    if (G.miss) G.miss[id] = 0; if (G.aw && G.aw[id]) { delete G.aw[id]; toast(B(`رجع ${esc(G.names[id] || '')} يلعب.`, `${esc(G.names[id] || '')} is back.`)); }
    G.lastBy = id; publish(false); show();
    return '';
  }
  function run() {
    listenRx(); joinReqs();
    on(G.ref.child('mv'), 'child_added', s => { const v = s.val() || {}; apply(s.key, v.k, v.c, v.x); s.ref.remove(); });
    const back = s => { const v = s.val() || {}; if (v.e !== '^b' || !G.aw || !G.aw[s.key] || now() - (v.t || 0) > 20000) return; delete G.aw[s.key]; if (G.miss) G.miss[s.key] = 0; toast(B(`رجع ${esc(G.names[s.key] || '')} يلعب.`, `${esc(G.names[s.key] || '')} is back.`)); publish(false); show(); };
    on(G.ref.child('rx'), 'child_added', back); on(G.ref.child('rx'), 'child_changed', back);
    show();
  }
  async function nextRound() {
    const players = Object.keys(G.names).filter(id => G.tm[id] != null).map(id => ({ id, team: G.tm[id] })).sort(() => Math.random() - .5);
    G.rnd = (G.rnd || 0) + 1; G.dl = 0; G.dlN = null; G.miss = {}; G.st = KH.create({ players, teams: G.o.teams, L: G.o.L, need: G.o.need });
    winShown = -1; lastSeen = -1; await publish(true); show();
  }
  function show() {
    const st = G.st;
    view({ P: pubOf(), hand: G.me ? st.hands[G.me] : null, me: G.me, names: G.names, screen: !G.me, ctl: true, act: (k, c, i) => apply(G.me, k, c, i), again: nextRound, end: async () => { store.del('run'); await wipe(G.pin); home(); } });
  }
  async function resumeHost(P) {
    stop();
    try { await fb(); } catch (e) { toast(B('تعذّر الاتصال.', 'Could not connect.'), 1); return; }
    const snap = await db.ref('kh/' + P.pin + '/host').once('value');
    if (snap.val() !== uid) { store.del('run'); toast(B('انتهت هذه اللعبة.', 'This game has ended.'), 1); return home(); }
    G = { mode: 'host', pin: P.pin, o: Object.assign({ tt: 0 }, P.o), ref: db.ref('kh/' + P.pin), names: P.names, tm: P.tm, off: [], me: P.me, st: P.st, ser: P.ser, rnd: P.rnd || 0, counted: P.counted };
    avOn((G.names || {})[uid] || store.get('name', '') || T('المضيف', 'Host'), true);
    run(); publish(false);
  }

  /* ---------- a player who joins with a code ---------- */
  function joinCode(pre) {
    stop();
    root.innerHTML = `<div class="kh-card kh-narrow"><h2>${B('ادخل اللعبة', 'Join a game')}</h2>
      <label class="kh-opt"><span>${B('رمز اللعبة', 'Game code')}</span><input id="khP" inputmode="numeric" maxlength="7" dir="ltr" placeholder="123 456" value="${esc(pre || '')}"></label>
      <label class="kh-opt"><span>${B('اسمك', 'Your name')}</span><input id="khN" maxlength="24" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <p class="kh-err" hidden></p><div class="kh-row"><button type="button" class="btn solid" id="khGo">${B('ادخل لاعبًا', 'Join as a player')}</button><button type="button" class="btn ghost" id="khWatch">${B('شاهد فقط', 'Just watch')}</button><button type="button" class="btn ghost" id="khBack">${B('رجوع', 'Back')}</button></div></div>`;
    const err = t => { const e = root.querySelector('.kh-err'); e.hidden = false; e.innerHTML = t; };
    root.querySelector('#khBack').onclick = () => { history.replaceState(null, '', location.pathname); home(); };
    const pin = root.querySelector('#khP');
    pin.oninput = () => { pin.value = pin.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d ]/g, ''); };
    root.querySelector('#khGo').onclick = async ev => {
      const e = { currentTarget: ev.currentTarget };
      const p = pin.value.replace(/\D/g, ''), n = root.querySelector('#khN').value.trim().slice(0, 24);
      if (p.length !== 6) return err(B('الرمز ستة أرقام.', 'The code has six digits.'));
      if (!n) return err(B('اكتب اسمك.', 'Write your name.'));
      e.currentTarget.disabled = true; store.set('name', n);
      try {
        await fb();
        const s = (await db.ref('kh/' + p + '/st').once('value')).val();
        if (!s) { e.currentTarget.disabled = false; return err(B('لا توجد لعبة بهذا الرمز.', 'No game with this code.')); }
        const mine = (await db.ref('kh/' + p + '/pl/' + uid).once('value')).val();
        if (!mine) { if (s !== 'lobby') { toast(B('الجولة بدأت، فدخلت متفرجًا. تقدر تطلب اللعب من الجولة الجاية.', 'The round has started, so you are watching. You can ask to play from the next round.')); return watch(p, n); } await db.ref('kh/' + p + '/pl/' + uid).set({ n, at: TS() }); }
        player(p);
      } catch (er) { console.error('kh join', er && er.message); e.currentTarget.disabled = false; err(B('تعذّر الدخول. تأكد من الإنترنت.', 'Could not join. Check the internet.')); }
    };
    // a watcher only reads the table: no name, and they can come in at any time
    root.querySelector('#khWatch').onclick = async () => {
      const p = pin.value.replace(/\D/g, ''); if (p.length !== 6) return err(B('الرمز ستة أرقام.', 'The code has six digits.'));
      try { await fb(); if (!(await db.ref('kh/' + p + '/st').once('value')).exists()) return err(B('لا توجد لعبة بهذا الرمز.', 'No game with this code.')); const n = root.querySelector('#khN').value.trim().slice(0, 24); if (n) store.set('name', n); watch(p, n || T('مشجّع', 'A fan')); } catch (e) { err(B('تعذّر الاتصال.', 'Could not connect.')); }
    };
    if (pre) setTimeout(() => root.querySelector('#khN').value.trim() ? null : root.querySelector('#khN').focus(), 100);
  }
  function player(pin) {
    stop();
    G = { mode: 'player', pin, ref: db.ref('kh/' + pin), me: uid, off: [], hand: [], P: null, names: {}, tm: {}, stt: 'lobby' };
    avOn(store.get('name', '') || T('لاعب', 'Player'));
    const draw = () => {
      if (!G) return;
      if (G.stt === 'lobby' || !G.P) {
        const k = G.tm[uid];
        root.innerHTML = `<div class="kh-card kh-narrow kh-wait"><p class="kh-big">${B('أنت في اللعبة!', 'You are in!')}</p>${k != null ? `<p class="kh-tm" style="--c:${COL[k]}">${B('فريقك', 'Your team')}: <b>${TN(k)}</b></p>` : ''}${G.cfg ? `<p class="kh-cfgbox">${B(`صف من ${G.cfg.L === 4 ? 'أربع' : 'خمس'} قطع · يفوز من يكمل ${['', 'سلسلة واحدة', 'سلسلتين', 'ثلاث سلاسل'][G.cfg.need] || G.cfg.need}${G.cfg.tt ? ` · ${G.cfg.tt} ثانية لكل دور` : ''}`, `Rows of ${G.cfg.L} · first to ${G.cfg.need} sequences wins${G.cfg.tt ? ` · ${G.cfg.tt} s a turn` : ''}`)}</p>` : ''}<p>${B('انتظر حتى يبدأ منشئ اللعبة. وفي الأثناء تعرّف على القواعد:', 'Wait for the game to start. Meanwhile, here are the rules:')}</p></div>${rules(true)}`;
        return;
      }
      view({ P: G.P, hand: G.hand, me: uid, names: G.names, act: (k, c, i) => { G.ref.child('mv/' + uid).set({ k, c: c || '', x: i == null ? -1 : i, t: TS() }).catch(() => toast(B('تعذّر الإرسال.', 'Could not send.'), 1)); return ''; }, again: () => { history.replaceState(null, '', location.pathname); home(); } });
    };
    on(G.ref.child('st'), 'value', s => { if (!s.exists()) { stop(); root.innerHTML = `<div class="kh-card kh-narrow"><p class="kh-big">${B('انتهت اللعبة', 'The game has ended')}</p><button type="button" class="btn ghost" id="khHome">${B('الرئيسية', 'Home')}</button></div>`; root.querySelector('#khHome').onclick = () => { history.replaceState(null, '', location.pathname); home(); }; return; } G.stt = s.val(); draw(); });
    on(G.ref.child('tm'), 'value', s => { G.tm = s.val() || {}; if (G.stt === 'lobby') draw(); });
    on(G.ref.child('cfg'), 'value', s => { G.cfg = s.val(); if (G.stt === 'lobby') draw(); });
    on(G.ref.child('names'), 'value', s => { G.names = s.val() || {}; });
    listenRx();
    on(G.ref.child('g'), 'value', s => { G.P = s.val(); if (G.P && G.P.team && G.stt !== 'lobby' && G.P.team[uid] == null) { toast(B('أخرجك المضيف من هذه الجولة؛ تقدر تشاهد وتطلب اللعب من الجولة الجاية.', 'The host took you out of this round; you can watch and ask to play from the next one.'), 1); return watch(pin, store.get('name', '')); } draw(); });
    on(db.ref('khh/' + pin + '/' + uid), 'value', s => { G.hand = s.val() || []; draw(); });
  }

  function watch(pin, name) {
    stop();
    G = { mode: 'watch', pin, ref: db.ref('kh/' + pin), off: [], P: null, names: {} };
    avOn(name || T('متفرج', 'Fan'));
    // take a seat in the stands; it is freed when the page closes
    const seat = G.ref.child('au/' + uid); seat.set({ n: name, at: TS() }).catch(() => {}); seat.onDisconnect().remove(); G.off.push(() => { seat.remove().catch(() => {}); });
    const leave = () => { history.replaceState(null, '', location.pathname); home(); };
    on(G.ref.child('st'), 'value', s => { if (!s.exists()) { stop(); root.innerHTML = `<div class="kh-card kh-narrow"><p class="kh-big">${B('انتهت اللعبة', 'The game has ended')}</p><button type="button" class="btn ghost" id="khHome">${B('الرئيسية', 'Home')}</button></div>`; root.querySelector('#khHome').onclick = leave; } });
    on(G.ref.child('names'), 'value', s => { G.names = s.val() || {}; });
    listenRx(); askBar(pin, name);
    on(G.ref.child('g'), 'value', s => {
      G.P = s.val();
      if (G.P && G.P.team && G.P.team[uid] != null && G.mode === 'watch') { toast(B('بدأت جولتك! أنت الآن لاعب.', 'Your round has started! You are playing now.')); return player(pin); }
      if (!G.P) { root.innerHTML = `<div class="kh-card kh-narrow kh-wait"><p class="kh-big">${B('أنت تشاهد', 'You are watching')}</p><p>${B('لم تبدأ اللعبة بعد؛ ستظهر هنا حين تبدأ.', 'The game has not started yet; it will show here when it does.')}</p></div>`; return; }
      G.redraw = () => view({ P: G.P, hand: null, me: null, names: G.names, screen: true, watch: true, act: () => '', again: leave }); G.redraw();
    });
  }

  /* ---------- joining a game already under way: a watcher asks, the host lets them in from the next round ---------- */
  function askBar(pin, name) {
    const el = document.createElement('div'); el.className = 'kh-ask'; document.body.appendChild(el); G.off.push(() => el.remove());
    let st = 'idle';
    const paint = () => { el.innerHTML = st === 'idle' ? `<button type="button" class="btn solid" data-ask>${B('أبي ألعب من الجولة الجاية', 'I want to play next round')}</button>`
      : `<p>${st === 'sent' ? B('وصل طلبك للمضيف…', 'Your request reached the host…') : st === 'ok' ? B('وافق المضيف: تدخل من الجولة الجاية', 'Approved: you join from the next round') : B('المضيف أبقاك متفرجًا هذه المرة', 'The host kept you watching this time')}</p>`;
      const b = el.querySelector('[data-ask]'); if (b) b.onclick = () => { if (!name) name = (prompt(T('اسمك؟', 'Your name?')) || '').trim().slice(0, 24); if (!name) return; G.ref.child('au/' + uid).update({ n: name }).catch(() => {}); G.ref.child('rx/' + uid).set({ e: '^j', t: TS() }).catch(() => {}); st = 'sent'; paint(); }; };
    on(G.ref.child('ok/' + uid), 'value', s => { const v = s.val(); if (v === 1) st = 'ok'; else if (v === 0) st = 'no'; paint(); });
    paint();
  }
  // the host: who is asking, and a yes that seats them on the smallest team from the next round
  function joinReqs() {
    if (G.reqOn) return; G.reqOn = true; G.req = {};
    const el = document.createElement('div'); el.className = 'kh-req'; document.body.appendChild(el);
    const paint = () => { const us = Object.keys(G.req); el.hidden = !us.length; el.innerHTML = us.map(u => `<div><b dir="auto">${esc(G.req[u])}</b> ${B('يبي يلعب', 'wants to play')}<button type="button" class="btn solid" data-y="${u}">${B('ضمّه من الجولة الجاية', 'Seat from next round')}</button><button type="button" class="btn ghost" data-n="${u}">${B('يبقى متفرج', 'Keep watching')}</button></div>`).join('');
      el.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { const u = b.dataset.y, n = G.req[u]; delete G.req[u];
        const c = [...Array(G.o.teams).keys()].map(k => Object.values(G.tm).filter(t => t === k).length); G.tm[u] = c.indexOf(Math.min(...c)); G.names[u] = n;
        G.ref.update({ ['pl/' + u]: { n, at: TS() }, ['ok/' + u]: 1, tm: G.tm, names: G.names }).catch(e => console.error(e)); store.set('run', Object.assign(store.get('run', {}) || {}, { names: G.names, tm: G.tm }));
        toast(B(`${esc(n)} يلعب من الجولة الجاية مع ${TN(G.tm[u])}.`, `${esc(n)} plays from the next round with ${TN(G.tm[u])}.`)); paint(); });
      el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const u = b.dataset.n; delete G.req[u]; G.ref.child('ok/' + u).set(0).catch(() => {}); paint(); }); };
    const f = s => { const v = s.val() || {}; if (v.e !== '^j' || !G || G.names[s.key]) return; const n = ((G.aud || {})[s.key] || {}).n || T('مشجّع', 'A fan'); if (G.req[s.key]) return; G.req[s.key] = String(n).slice(0, 24); buzz(20); paint(); };
    on(G.ref.child('rx'), 'child_added', f); on(G.ref.child('rx'), 'child_changed', f); G.off.push(() => { el.remove(); G.reqOn = false; });
    paint();
  }

  /* ---------- reactions: emoji and short ready phrases that float over the board for everyone ---------- */
  const EMO = ['👏', '🔥', '😂', '😮', '😡', '💪', '❤️', '😅', '🤝'];
  const SAY = () => [T('أحسنت!', 'Well done!'), T('يا سلام! 😍', 'Wow! 😍'), T('حظ أوفر 😅', 'Better luck 😅'), T('استعجل شوي ⏱', 'Hurry up ⏱'), T('ركّزوا يا فريق 💪', 'Focus, team 💪'), T('سدّوا عليهم!', 'Block them!'), T('لعبة حلوة 🤝', 'Good game 🤝'), T('قهر والله 😤', 'So frustrating 😤'), T('الأخ مفهي 😭', 'Wake up! 😭')];
  let lastRx = 0;
  // each person can silence everyone, or block one person, on their own device only
  const blocked = new Set(store.get('blk', [])); let muted = store.get('mute', false);
  function listenRx() {
    on(G.ref.child('au'), 'value', s => { G.aud = s.val() || {}; const st = root.querySelector('.kh-stands'); if (st) st.outerHTML = stands(); });
    const fly = s => { const v = s.val() || {}; if (!v.e || !G || muted || blocked.has(s.key) || String(v.e).charAt(0) === '^') return; G.rxSeen = G.rxSeen || {}; const was = G.rxSeen[s.key]; if (was && was.e === v.e && Date.now() - was.at < 1100) return; G.rxSeen[s.key] = { e: v.e, at: Date.now() }; if (Date.now() - (v.t || 0) - off > 15000) return; const fan = G.aud && G.aud[s.key]; float(v.e, (G.names && G.names[s.key]) || (fan && fan.n) || ''); if (fan) cheer(s.key, v.e); };
    on(G.ref.child('rx'), 'child_added', fly); on(G.ref.child('rx'), 'child_changed', fly);
  }
  // the stands: everyone watching, by name; a fan's chip jumps when they react
  const stands = () => { const a = Object.entries((G && G.aud) || {}); const open = G && (G.standsOpen || (G.mode === 'host' && !G.me)); return `<div class="kh-stands${open ? ' open' : ''}"${a.length ? '' : ' hidden'}><button type="button" data-stands>${B('المدرجات', 'The stands')} <small>${a.length}</small><span class="kh-recent"></span></button><div>${a.slice(0, 40).map(([u, v]) => `<span class="kh-fan${blocked.has(u) ? ' blk' : ''}" data-fan="${u}" dir="auto">${esc((v.n || '').slice(0, 14))}</span>`).join('')}${a.length > 40 ? `<span class="kh-fan">+${a.length - 40}</span>` : ''}</div></div>`; };
  function cheer(u, e) { const rc = root.querySelector('.kh-recent'); if (rc) { rc.textContent = `${(G.aud[u] || {}).n || ''} ${[...e].length <= 2 ? e : ''}`; rc.classList.remove('go'); void rc.offsetWidth; rc.classList.add('go'); } const f = root.querySelector(`[data-fan="${u}"]`); if (!f) return; f.dataset.e = [...e].length <= 2 ? e : ''; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  function float(e, who) {
    const b = root.querySelector('.kh-board') || root, r = b.getBoundingClientRect(), d = document.createElement('div'), big = [...e].length <= 2;
    d.className = 'kh-fly' + (big ? ' emo' : ' say');
    d.innerHTML = big ? `${esc(e)}${who ? `<small dir="auto">${esc(who)}</small>` : ''}` : `<b dir="auto">${esc(who)}</b> <span dir="auto">${esc(e)}</span>`;
    d.style.left = (r.left + r.width * (.15 + Math.random() * .7)) + 'px'; d.style.top = (r.top + r.height * .75) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 3200);
  }
  function sendRx(e) {
    if (Date.now() - lastRx < 1200 || !G || !G.ref || !uid) return; lastRx = Date.now(); buzz(10);
    G.ref.child('rx/' + uid).set({ e, t: TS() }).catch(() => {});
  }
  const people = () => { const all = Object.assign({}, ...Object.entries((G && G.aud) || {}).map(([u, v]) => ({ [u]: v.n })), (G && G.names) || {}); delete all[uid]; return Object.entries(all); };
  const rxSet = online => `<div class="kh-rxset" hidden>${online ? `<label><input type="checkbox" data-mute${muted ? ' checked' : ''}> ${B('أوقف كل التفاعلات عندي', 'Turn off all reactions for me')}</label>${people().length ? `<p>${B('حظر شخص (لن تصلك تفاعلاته):', 'Block someone (you will not see their reactions):')}</p><div>${people().map(([u, n]) => `<button type="button" data-blk="${u}" aria-pressed="${blocked.has(u)}" dir="auto">${blocked.has(u) ? '' : ''}${esc(n || '')}</button>`).join('')}</div>` : ''}<p class="kh-note">${B('يخصّ جهازك وحدك، ولا يعلم به أحد.', 'This is for your device only; nobody is told.')}</p>` : ''}</div>`;
  // one row under the hand: react, and settings; each opens its own small panel
  const rxBar = react => `<div class="kh-rx">${react ? `<button type="button" class="kh-tab" data-say>${B('تفاعل', 'React')}</button>` : ''}${G && G.mode !== 'local' ? `<button type="button" class="kh-tab" data-rxset>${B('الإعدادات', 'Settings')}</button>` : ''}${react ? `<div class="kh-says" hidden><div class="kh-emo">${EMO.map(e => `<button type="button" data-rx="${e}">${e}</button>`).join('')}</div><div class="kh-phr">${SAY().map(t => `<button type="button" data-rx="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : ''}${rxSet(G && G.mode !== 'local')}</div>`;

  /* ---------- the table: the board, the teams, whose turn, and this player's hand ---------- */
  let sel = null, lastSeen = -1, winShown = -1;
  async function shareResult(P, names) {
    const team = P.team || {}, n = P.teams, ser = P.ser || new Array(n).fill(0), cv = document.createElement('canvas'), W = 1080, H = 1080; cv.width = W; cv.height = H;
    const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f4d3a'); g.addColorStop(1, '#082a20'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#e0a458'; x.font = 'bold 84px system-ui, sans-serif'; x.fillText(T('تسلسل', 'Tasalsul'), W / 2, 150);
    x.fillStyle = '#fff'; x.font = 'bold 60px system-ui, sans-serif'; x.fillText(P.win >= 0 ? T(`فاز الفريق ${TN(P.win)}`, `${TN(P.win)} won`) : T('تعادل', 'A draw'), W / 2, 260);
    const best = Math.max(...ser), lead = ser.filter(v => v === best).length === 1 && best > 0 ? ser.indexOf(best) : -1;
    x.font = '40px system-ui, sans-serif'; x.fillStyle = '#d9e8e1'; x.fillText(T(`الجولات حتى الآن · صف من ${P.L} · ${P.need} للفوز`, `Rounds so far · rows of ${P.L} · ${P.need} to win`), W / 2, 340);
    for (let k = 0; k < n; k++) { const y = 430 + k * 190, mem = Object.keys(team).filter(u => team[u] === k).map(u => names[u] || '').join('، ');
      x.fillStyle = COL[k]; x.beginPath(); x.roundRect(110, y, W - 220, 160, 30); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 54px system-ui, sans-serif'; x.fillText(`${TN(k)}${k === lead ? ' ' : ''}   ${ser[k] || 0}`, W / 2, y + 70); x.font = '36px system-ui, sans-serif'; x.fillText(mem.slice(0, 48), W / 2, y + 126); }
    x.fillStyle = '#e0a458'; x.font = 'bold 40px system-ui, sans-serif'; x.fillText('alsamani.com/play/tasalsul', W / 2, H - 60);
    const text = T(`نتيجة تسلسل: ${[...Array(n).keys()].map(k => `${TN(k)} ${ser[k] || 0}`).join(' – ')}. تحدّونا على alsamani.com/play/tasalsul`, `Tasalsul: ${[...Array(n).keys()].map(k => `${TN(k)} ${ser[k] || 0}`).join(' – ')}. Challenge us at alsamani.com/play/tasalsul`);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], 'tasalsul.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text }); } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tasalsul.png'; a.click();
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }
  function celebrate(P, names, again) {
    document.querySelectorAll('.kh-win').forEach(x => x.remove());
    const t = P.win, team = P.team || {}, who = t >= 0 ? Object.keys(team).filter(u => team[u] === t).map(u => esc(names[u] || '')).join('، ') : '';
    const d = document.createElement('div'); d.className = 'kh-win'; d.style.setProperty('--c', t >= 0 ? COL[t] : '#888');
    d.innerHTML = `<div class="kh-conf">${Array.from({ length: 60 }, (_, k) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--r:${Math.floor(Math.random() * 360)}deg;--k:${['#e0a458', '#fff', COL[0], COL[1], COL[2]][k % 5]}"></i>`).join('')}</div>
      <div class="kh-winbox"><p class="kh-trophy">${t >= 0 ? '' : ''}</p><h2>${t >= 0 ? B(`فاز الفريق ${TN(t)}!`, `${TN(t)} wins!`) : B('تعادل!', 'A draw!')}</h2>${who ? `<p dir="auto">${who}</p>` : ''}
      <div class="kh-row">${G && G.mode === 'player' ? '' : `<button type="button" class="btn solid" data-w="again">${G && G.mode === 'host' ? B('جولة جديدة ▶', 'Another round ▶') : B('لعبة جديدة', 'New game')}</button>`}<button type="button" class="btn ghost" data-w="share">${B('شارك', 'Share')}</button><button type="button" class="btn ghost" data-w="board">${B('عرض اللوح', 'See the board')}</button></div></div>`;
    document.body.appendChild(d); buzz([100, 60, 100, 60, 200]);
    d.querySelector('[data-w="board"]').onclick = () => d.remove();
    const ag = d.querySelector('[data-w="again"]'); if (ag) ag.onclick = () => { d.remove(); again(); };
    d.querySelector('[data-w="share"]').onclick = () => shareResult(P, names);
  }
  let lastTurn = null, lastTick = -1;
  function view({ P, hand, me, names, screen, watch, act, again, end, ctl }) {
    const lay = P.lay.split(','), board = P.board.split('').map(c => c === '.' ? -1 : +c);
    const sq = (P.sq || []).map(s => new Set(String(s || '').split(',').filter(Boolean).map(Number)));
    const team = P.team || {}, myT = me != null ? team[me] : null, turn = P.turn, mine = turn === me && P.win === -1;
    // the rules engine checks the moves from this player's side of the table
    const st = { lay, board, inseq: sq.map(s => { const a = []; s.forEach(i => { a[i] = true; }); return a; }), team, order: [turn], turn: 0 };
    hand = hand || [];
    if (sel != null && !hand.includes(sel)) sel = null;
    const legalOf = c => c ? KH.legal(st, c) : [];
    const can = mine && sel ? legalOf(sel) : [];
    const dead = mine && sel && !KH.twoEyed(sel) && !KH.oneEyed(sel) && can.length === 0;
    const stuck = mine && hand.length && hand.every(c => !legalOf(c).length) && (P.sw || !hand.some(c => !KH.twoEyed(c) && !KH.oneEyed(c)));
    const L = P.last;
    clearInterval(clk);
    // news of the last move
    const fresh = !!L && P.n !== lastSeen;
    if (fresh && L) { if (L.made) SND.seq(); else SND.chip(); }
    // the turn has come to this player: a sound, a buzz and a big word on the screen
    const turnKey = P.rnd + ':' + P.n;
    if (mine && lastTurn !== turnKey) { lastTurn = turnKey; SND.turn(); buzz([120, 60, 120]); setTimeout(() => { const b = document.createElement('div'); b.className = 'kh-yourturn'; b.innerHTML = `<b>${B('دورك!', 'Your turn!')}</b>${sel ? `<small>${B('ورقتك المختارة جاهزة', 'Your chosen card is ready')}</small>` : ''}`; document.body.appendChild(b); setTimeout(() => b.remove(), 1500); }, 30); }
    else if (!mine) lastTurn = null;
    // how many turns until mine
    const ord = P.order || [], nT = ord.length, untilMe = me != null && !mine && nT ? (() => { for (let k = 1; k <= nT; k++) if (ord[(P.n + k) % nT] === me) return k; return 0; })() : 0;
    const rulesLine = `<p class="kh-cfg">${B(`صف من ${P.L === 4 ? 'أربع' : 'خمس'} · ${['', 'سلسلة واحدة', 'سلسلتان', 'ثلاث سلاسل'][P.need] || P.need} للفوز${P.tt ? ` · ${P.tt} ثانية للدور` : ''}`, `Rows of ${P.L} · ${P.need} to win${P.tt ? ` · ${P.tt} s a turn` : ''}`)}${P.ser && P.ser.some(x => x) || P.rnd ? ` · ${B('الجولات', 'Rounds')}: ${P.ser.map((x, k) => `<b style="color:${COL[k]}">${x}</b>`).join(' – ')}` : ''}</p>`;
    if (L && P.n !== lastSeen) { lastSeen = P.n; if (L.auto === 2) toast(B(`لعب الجهاز عن ${esc(names[L.id] || '')}`, `The computer played for ${esc(names[L.id] || '')}`)); else if (L.auto) toast(`${B(`انتهى وقت ${esc(names[L.id] || '')}، فلُعبت ورقة عنه`, `${esc(names[L.id] || '')} ran out of time; a card was played for them`)}`); else if (L.made) { toast(`${B(`فريق ${TN(L.t)} أكمل سلسلة!`, `${TN(L.t)} made a sequence!`)}`); buzz([60, 40, 60]); } else if (L.rm) toast(`${B(`${esc(names[L.id] || '')} أزال قطعة من فريق ${TN(L.t)}`, `${esc(names[L.id] || '')} removed a ${TN(L.t)} chip`)}`); if (mine) buzz(40); }
    const teamsBar = [...Array(P.teams).keys()].map(k => `<div class="kh-ts${P.order && names && turn != null && team[turn] === k ? ' on' : ''}" style="--c:${COL[k]}"><b>${TN(k)}</b><span>${'●'.repeat(P.seqs[k] || 0)}${'○'.repeat(Math.max(0, P.need - (P.seqs[k] || 0)))}</span><small dir="auto">${Object.keys(team).filter(u => team[u] === k).map(u => esc(names[u] || '') + (P.aw && P.aw[u] ? ' <i class="kh-away">' + T('غائب', 'away') + '</i>' : '')).join('، ')}</small></div>`).join('');
    const awayMe = me != null && P.aw && P.aw[me] && P.win === -1;
    const status = P.win >= 0 ? `${B(`فاز فريق ${TN(P.win)}!`, `${TN(P.win)} wins!`)}` : P.win === -2 ? B('تعادل!', 'A draw!')
      : mine ? `<b>${B('دورك!', 'Your turn!')}</b> ${sel ? (KH.oneEyed(sel) ? B('ولد أبو عين: اختر قطعة خصم لإزالتها', 'One-eyed jack: pick a rival chip to remove') : KH.twoEyed(sel) ? B('ولد أبو عينين: ضع قطعتك في أي خانة فارغة', 'Two-eyed jack: put your chip on any empty space') : dead ? B('خانتا هذه الورقة ممتلئتان؛ استبدلها', 'both its spaces are taken; swap it') : B('اختر إحدى الخانتين المضيئتين', 'pick one of the lit spaces')) : B('اختر ورقة من يدك', 'pick a card')}`
      : `${B('دور', 'Turn:')} <b dir="auto" style="color:${COL[team[turn]]}">${esc(names[turn] || '')}</b> (${TN(team[turn])})${untilMe ? ` · <span class="kh-soon${untilMe === 1 ? ' next' : ''}">${untilMe === 1 ? B('أنت التالي!', 'You are next!') : B(`دورك بعد ${untilMe}`, `You play in ${untilMe}`)}</span>` : ''}`;
    root.innerHTML = `<div class="kh-game${screen ? ' kh-screen' : ''} kh-real">
      <div class="kh-bar">${teamsBar}</div><div class="kh-cfgr">${rulesLine}<button type="button" class="kh-snd" data-snd aria-label="${T('الصوت', 'Sound')}" aria-pressed="${store.get('snd', true) !== false}">${store.get('snd', true) !== false ? SVOL : SMUTE}</button></div>
      ${G && G.mode !== 'local' ? stands() : ''}
      <p class="kh-status">${P.dl && P.win === -1 ? `<span class="kh-clock${mine ? ' me' : ''}" id="khClk"></span> ` : ''}${watch ? `<span class="kh-eye">${B('مشاهدة', 'Watching')}</span> ` : ''}${status}</p>
      <div class="kh-board${can.length ? ' picking' : ''}">${lay.map((c, i) => { const b = board[i], inq = b >= 0 && sq[b] && sq[b].has(i);
        return `<div class="kh-cell${can.includes(i) ? ' can' : sel && lay[i] === sel ? ' twin' : ''}${L && L.i === i ? ' last' + (fresh ? ' drop' : '') : ''}${P.win >= 0 && inq && b === P.win ? ' won' : ''}" data-i="${i}">${card(c)}${b >= 0 ? `<i class="kh-chip${inq ? ' seq' : ''}" style="--c:${COL[b]}"></i>` : ''}${L && L.i === i && L.rm && fresh ? `<i class="kh-chip ghost" style="--c:${COL[L.t]}"></i>` : ''}</div>`; }).join('')}</div>
      ${awayMe ? `<div class="kh-awaybar">${B('الجهاز يلعب عنك الآن', 'The computer is playing for you')}<button type="button" class="btn solid" id="khBack1">${B('رجعت، ألعب', 'I’m back')}</button></div>` : ''}
      ${me != null && !screen ? `<div class="kh-hand${mine ? ' mine' : ''}">${hand.map(c => `<button type="button" class="kh-hc${sel === c ? ' on' : ''}${mine && !KH.twoEyed(c) && !KH.oneEyed(c) && !legalOf(c).length ? ' dead' : ''}" data-c="${c}" style="--c:${myT != null ? COL[myT] : '#888'}">${card(c)}</button>`).join('')}</div>
        <div class="kh-row kh-acts">${dead ? `<button type="button" class="btn ghost" id="khSwap">↻ ${B('استبدل الورقة الميتة', 'Swap the dead card')}</button>` : ''}${stuck ? `<button type="button" class="btn ghost" id="khPass">${B('لا حركة لديك: تخطَّ الدور', 'No move: pass')}</button>` : ''}</div>` : ''}
      ${screen || (ctl && P.win === -1) ? `<div class="kh-row">${ctl && P.win === -1 ? `<button type="button" class="btn ghost" id="khPl">${B('اللاعبون', 'Players')}</button>` : ''}${screen ? `<button type="button" class="btn ghost" id="khFs">${B('ملء الشاشة', 'Full screen')}</button>` : ''}</div>` : ''}
      ${rxBar(G && G.mode !== 'local' && P.win === -1 && !(G.mode === 'host' && !G.me))}
      <div class="kh-help">${rules(false)}</div>
      ${P.win !== -1 ? `<div class="kh-row">${G && G.mode === 'player' ? `<p class="kh-note">${B('بانتظار المضيف يبدأ جولة جديدة…', 'Waiting for the host to start another round…')}</p>` : `<button type="button" class="btn solid" id="khAgain">${G && G.mode === 'host' ? B('جولة جديدة ▶', 'Another round ▶') : B('لعبة جديدة', 'New game')}</button>`}<button type="button" class="btn ghost" id="khShareR">${B('شارك النتيجة', 'Share the result')}</button>${end ? `<button type="button" class="btn ghost" id="khEndS">${B('إنهاء الجلسة', 'End the session')}</button>` : ''}</div>` : ''}</div>`;
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sel = sel === b.dataset.c ? null : b.dataset.c; buzz(8); view({ P, hand, me, names, screen, watch, act, again, end, ctl }); });
    root.querySelectorAll('.kh-cell.can').forEach(c => c.onclick = () => { const s = sel; sel = null; buzz(20); act('p', s, +c.dataset.i); });
    const sw = root.querySelector('#khSwap'); if (sw) sw.onclick = () => { const s = sel; sel = null; act('s', s); };
    const ps = root.querySelector('#khPass'); if (ps) ps.onclick = () => act('n');
    const sn = root.querySelector('[data-snd]'); if (sn) sn.onclick = () => { const on = store.get('snd', true) === false; store.set('snd', on); sn.innerHTML = on ? SVOL : SMUTE; sn.setAttribute('aria-pressed', on); if (on) SND.chip(); };
    const ag = root.querySelector('#khAgain'); if (ag) ag.onclick = again;
    const sr = root.querySelector('#khShareR'); if (sr) sr.onclick = () => shareResult(P, names);
    const es = root.querySelector('#khEndS'); if (es) es.onclick = () => { if (confirm(T('تنهي الجلسة لكل اللاعبين؟', 'End the session for everyone?'))) end(); };
    if (P.win !== -1 && winShown !== P.rnd + ':' + P.n) { winShown = P.rnd + ':' + P.n; SND.win(); celebrate(P, names, again); }
    const ck = root.querySelector('#khClk');
    if (ck) { let warned = false; const tick = () => { const left = Math.max(0, Math.ceil((P.dl - now()) / 1000)); ck.textContent = '' + left; ck.style.setProperty('--p', P.tt ? Math.round(100 * left / P.tt) + '%' : '100%'); ck.classList.toggle('hot', left <= 10); if (mine && left <= 5 && !warned) { warned = true; buzz([80, 60, 80]); } if (mine && left <= 5 && left > 0 && left !== lastTick) { lastTick = left; SND.tick(); } }; tick(); clk = setInterval(tick, 250); }
    root.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => { sendRx(b.dataset.rx); const ss = root.querySelector('.kh-says'); if (ss) ss.hidden = true; });
    const rs = root.querySelector('[data-rxset]'); if (rs) rs.onclick = () => { const p = root.querySelector('.kh-rxset'), q = root.querySelector('.kh-says'); p.hidden = !p.hidden; if (q) q.hidden = true; };
    const mu = root.querySelector('[data-mute]'); if (mu) mu.onchange = () => { muted = mu.checked; store.set('mute', muted);  };
    root.querySelectorAll('[data-blk]').forEach(b => b.onclick = () => { const u = b.dataset.blk; if (blocked.has(u)) blocked.delete(u); else blocked.add(u); store.set('blk', [...blocked]); b.setAttribute('aria-pressed', blocked.has(u)); b.textContent = (blocked.has(u) ? '' : '') + b.textContent.replace(/^/, ''); const f = root.querySelector(`[data-fan="${u}"]`); if (f) f.classList.toggle('blk', blocked.has(u)); });
    const sy = root.querySelector('[data-say]'); if (sy) sy.onclick = () => { const ss = root.querySelector('.kh-says'); ss.hidden = !ss.hidden; root.querySelector('.kh-rxset').hidden = true; };
    const sb = root.querySelector('[data-stands]'); if (sb) sb.onclick = () => { G.standsOpen = !G.standsOpen; sb.parentNode.classList.toggle('open', G.standsOpen); };
    const pl = root.querySelector('#khPl'); if (pl) pl.onclick = playersSheet;
    const bk = root.querySelector('#khBack1'); if (bk) bk.onclick = () => { G.ref.child('rx/' + uid).set({ e: '^b', t: TS() }).catch(() => {}); bk.disabled = true; };
    const fs = root.querySelector('#khFs'); if (fs) fs.onclick = () => document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen();
  }

  document.addEventListener('DOMContentLoaded', home);
  if (document.readyState !== 'loading') home();
})();

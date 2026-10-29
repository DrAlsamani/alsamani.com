/* Khumasiya (alsamani.com/play/khumasiya): a card-and-board game of five in a row, for teams.
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
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const COL = ['#2a6fdb', '#d64545', '#2f9e5b'];
  const TN = k => [T('الأزرق', 'Blue'), T('الأحمر', 'Red'), T('الأخضر', 'Green')][k];
  const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const JOIN = 'alsamani.com/play/khumasiya';
  const card = (c, cls) => {
    if (c === '*') return `<span class="kc star">★</span>`;
    const r = c.slice(0, -1), s = c.slice(-1), red = s === 'H' || s === 'D';
    const jk = r === 'J' ? (KH.twoEyed(c) ? `<em>${B('ضع في أي مكان', 'Wild')}</em>` : `<em>${B('أزل قطعة', 'Remove')}</em>`) : '';
    return `<span class="kc${red ? ' r' : ''}${r === 'J' ? ' j' : ''} ${cls || ''}"><b>${r === 'T' ? '10' : r}</b><i>${SUIT[s]}</i>${r === 'J' ? `<u>${KH.twoEyed(c) ? '👀' : '👁'}</u>` : ''}${jk}</span>`;
  };

  let G = null;          // the game on this device
  let db = null, uid = null, off = 0;
  const now = () => Date.now() + off;
  async function fb() {
    if (db) return;
    if (!window.firebase || !window.MD_CFG) throw new Error('nofb');
    if (!firebase.apps.length) firebase.initializeApp(MD_CFG);
    const u = firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user;
    uid = u.uid; db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const wipe = async pin => { try { await db.ref('khh/' + pin).remove(); } catch (e) {} try { await db.ref('kh/' + pin).remove(); } catch (e) {} };
  const stop = () => { if (G && G.off) G.off.forEach(f => f()); if (G && G.botT) clearTimeout(G.botT); if (G && G.tt) clearTimeout(G.tt); clearInterval(clk); G = null; };
  let clk = null;
  const on = (ref, ev, fn) => { ref.on(ev, fn); G.off.push(() => ref.off(ev, fn)); };

  const rules = open => `<details class="kh-rules"${open ? ' open' : ''}><summary>📖 ${B('كيف تُلعب؟', 'How to play')}</summary>
        <ol><li>${B('لكل فريق لون. في دورك اختر ورقة من يدك، ثم ضع قطعتك على إحدى خانتيها في اللوح (لكل ورقة خانتان).', 'Each team has a colour. On your turn pick a card, then put your chip on one of its two spaces.')}</li>
        <li>${B('<b>السلسلة</b>: خمس قطع متتالية من لونك أفقيًا أو عموديًا أو قطريًا. الزوايا ★ مجانية للجميع.', '<b>A sequence</b>: five of your chips in a row, across, down or diagonal. The ★ corners count for everyone.')}</li>
        <li>${B('<b>👀 ولد أبو عينين</b> (♦ و♣): ضع قطعتك في أي خانة فارغة. <b>👁 ولد أبو عين</b> (♠ و♥): أزل قطعة خصم، إلا إن كانت في سلسلة مكتملة.', '<b>👀 Two-eyed jacks</b> (♦ ♣): put your chip on any empty space. <b>👁 One-eyed jacks</b> (♠ ♥): remove a rival chip unless it is in a finished sequence.')}</li>
        <li>${B('<b>الفوز</b>: فريقان يحتاجان سلسلتين، وثلاثة فرق سلسلة واحدة. ويمكن اختيار صف من أربع للعب أسرع.', '<b>Winning</b>: with two teams make two sequences; with three, one. You can choose rows of four for a quicker game.')}</li>
        <li>${B('<b>الورقة الميتة</b>: إن امتلأت خانتاها فاستبدلها بورقة جديدة مرة في الدور.', '<b>A dead card</b>: if both its spaces are taken, swap it for a new one, once a turn.')}</li></ol></details>`;
  /* ---------- home ---------- */
  function home() {
    stop();
    const P = store.get('run', null), fresh = P && Date.now() - P.at < 864e5;
    const p = new URLSearchParams(location.search).get('k');
    if (p && /^\d{6}$/.test(p)) return joinCode(p);
    root.innerHTML = `${fresh ? `<div class="kh-card kh-resume"><p>⏸ ${B('لعبة لم تكتمل', 'An unfinished game')} · ${B('الرمز', 'code')} <span dir="ltr">${P.pin}</span></p><div class="kh-row"><button type="button" class="btn solid" id="khRes">${B('أكمل اللعبة ▶', 'Resume ▶')}</button><button type="button" class="btn ghost" id="khDrop">${B('احذفها', 'Remove it')}</button></div></div>` : ''}
      <div class="kh-hero"><div class="kh-mini">${demo()}</div><div>
        <h2>${B('خمس في صف… قبل خصمك!', 'Five in a row… before the others!')}</h2>
        <p>${B('لعبة ورق ولوح للفرق: العب ورقة من يدك وضع قطعتك على خانتها، وكوّن صفًّا من خمس قطع. ولد أبو عينين يضعك في أي مكان، وولد أبو عين يشيل قطعة خصمك.', 'A card and board game for teams: play a card and put your chip on its space, and make a row of five. A two-eyed jack goes anywhere; a one-eyed jack removes a rival chip.')}</p></div></div>
      <div class="kh-modes">
        <button type="button" class="kh-mode" data-go="host"><b>👥 ${B('العب مع الآخرين', 'Play with others')}</b><small>${B('أنشئ لعبة وشارك رمزها: اللوح على شاشة كبيرة والأوراق في الجوالات، أو كلٌّ من مكانه عن بُعد.', 'Create a game and share its code: the board on a big screen and the hands on phones, or everyone remote.')}</small></button>
        <button type="button" class="kh-mode" data-go="join"><b>🔢 ${B('ادخل برمز', 'Join with a code')}</b><small>${B('عندك رمز لعبة؟ ادخل واختر فريقك.', 'Got a game code? Join and pick your team.')}</small></button>
        <button type="button" class="kh-mode" data-go="bot"><b>🤖 ${B('العب ضد الجهاز', 'Play the computer')}</b><small>${B('جرّب اللعبة وحدك وتعلّم قواعدها.', 'Try it on your own and learn the rules.')}</small></button>
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
    const o = Object.assign({ teams: 2, L: 5, role: 'play', tt: 45, lv: 2 }, store.get('cfg', {}));
    root.innerHTML = `<div class="kh-card"><h2>${bot ? '🤖 ' + B('العب ضد الجهاز', 'Play the computer') : '👥 ' + B('لعبة جديدة', 'A new game')}</h2>
      <div class="kh-opt"><span>${B('عدد الفرق', 'Teams')}</span><div class="kh-seg" data-k="teams"><button type="button" data-v="2">${B('فريقان', 'Two')}</button><button type="button" data-v="3">${B('ثلاثة فرق', 'Three')}</button></div></div>
      <div class="kh-opt"><span>${B('طول الصف', 'Row length')}</span><div class="kh-seg" data-k="L"><button type="button" data-v="5">${B('خمس (الأصلية)', 'Five (classic)')}</button><button type="button" data-v="4">${B('أربع (أسرع وللصغار)', 'Four (quicker, for children)')}</button></div></div>
      ${bot ? `<div class="kh-opt"><span>${B('مستوى الجهاز', 'Computer level')}</span><div class="kh-seg" data-k="lv"><button type="button" data-v="1">${B('سهل', 'Easy')}</button><button type="button" data-v="2">${B('متوسط', 'Medium')}</button><button type="button" data-v="3">${B('صعب', 'Hard')}</button></div></div>` : ''}
      ${bot ? '' : `<div class="kh-opt"><span>${B('وقت الدور', 'Time per turn')}</span><div class="kh-seg" data-k="tt"><button type="button" data-v="30">${B('٣٠ ثانية', '30 s')}</button><button type="button" data-v="45">${B('٤٥ ثانية', '45 s')}</button><button type="button" data-v="60">${B('دقيقة', '1 min')}</button><button type="button" data-v="0">${B('بلا وقت', 'No limit')}</button></div></div>`}
      ${bot ? '' : `<div class="kh-opt"><span>${B('هذا الجهاز', 'This device')}</span><div class="kh-seg" data-k="role"><button type="button" data-v="play">${B('ألعب منه', 'I play on it')}</button><button type="button" data-v="screen">${B('شاشة عرض فقط', 'A display screen only')}</button></div></div>`}
      <label class="kh-opt kh-name" ${!bot && o.role === 'screen' ? 'hidden' : ''}><span>${B('اسمك', 'Your name')}</span><input id="khN" maxlength="24" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <p class="kh-note" id="khNote"></p>
      <div class="kh-row"><button type="button" class="btn solid" id="khGo">${bot ? B('ابدأ اللعب ▶', 'Start ▶') : B('أنشئ اللعبة', 'Create the game')}</button><button type="button" class="btn ghost" id="khBack">${B('رجوع', 'Back')}</button></div></div>`;
    const paint = () => {
      root.querySelectorAll('.kh-seg').forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(o[g.dataset.k]) === b.dataset.v)));
      const nm = root.querySelector('.kh-name'); if (nm) nm.hidden = !bot && o.role === 'screen';
      root.querySelector('#khNote').innerHTML = o.teams === 2 ? B(`يفوز أول فريق يكمل <b>سلسلتين</b> من ${o.L}.`, `The first team to make <b>two</b> sequences of ${o.L} wins.`) : B(`يفوز أول فريق يكمل <b>سلسلة واحدة</b> من ${o.L}.`, `The first team to make <b>one</b> sequence of ${o.L} wins.`);
    };
    root.querySelectorAll('.kh-seg button').forEach(b => b.onclick = () => { const k = b.parentNode.dataset.k; o[k] = k === 'role' ? b.dataset.v : +b.dataset.v; paint(); });
    paint();
    root.querySelector('#khBack').onclick = home;
    root.querySelector('#khGo').onclick = () => {
      const n = (root.querySelector('#khN') || {}).value; if (n != null && n.trim()) store.set('name', n.trim().slice(0, 24));
      store.set('cfg', o);
      if (bot) return local(o, (n || '').trim() || T('أنت', 'You'));
      if (o.role === 'play' && !(n || '').trim()) { toast(B('اكتب اسمك.', 'Write your name.'), 1); return; }
      host(o, (n || '').trim());
    };
  }

  /* ---------- against the computer: everything stays on this device ---------- */
  function local(o, name) {
    stop();
    const players = [{ id: 'me', team: 0 }, { id: 'b1', team: 1 }].concat(o.teams === 3 ? [{ id: 'b2', team: 2 }] : []);
    const st = KH.create({ players, teams: o.teams, L: o.L });
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
    for (let t = 0; t < 6 && !pin; t++) { const p = String(100000 + Math.floor(Math.random() * 900000)); try { await db.ref('kh/' + p).set({ host: uid, at: TS(), st: 'lobby', cfg: { teams: o.teams, L: o.L } }); pin = p; } catch (e) {} }
    if (!pin) { toast(B('تعذّر إنشاء اللعبة.', 'Could not create the game.'), 1); return home(); }
    G = { mode: 'host', pin, o: Object.assign({ tt: 45 }, o), ref: db.ref('kh/' + pin), names: {}, tm: {}, off: [], me: o.role === 'play' ? uid : null };
    if (G.me) await G.ref.child('pl/' + uid).set({ n: name, at: TS() });
    lobby();
  }
  function lobby() {
    const url = 'https://' + JOIN + '/?k=' + G.pin;
    let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (e) {}
    root.innerHTML = `<div class="kh-card kh-lobby"><div class="kh-join"><div><p>${B('ادخلوا من جوالاتكم على', 'Join on your phones at')}</p><p class="kh-url" dir="ltr">${JOIN}</p><p>${B('واكتبوا الرمز', 'and enter the code')}</p><p class="kh-pin" dir="ltr">${G.pin.slice(0, 3)} ${G.pin.slice(3)}</p>
      <button type="button" class="btn ghost" id="khShare">🔗 ${B('أرسل رابط الدخول', 'Send the join link')}</button></div><div class="kh-qr">${qr}</div></div>
      <div class="kh-teams" id="khTeams"></div><p class="kh-note">${B('انقر اسم أي لاعب لنقله إلى فريق آخر. ومن أراد المتابعة فقط يدخل بالرمز نفسه ويختار «شاهد فقط»، ولو بعد بدء اللعب.', 'Tap a player’s name to move them. Anyone who only wants to follow enters the same code and picks “Just watch”, even after the start.')}</p>
      <div class="kh-row"><button type="button" class="btn solid" id="khStart" disabled>${B('ابدأ اللعب ▶', 'Start ▶')}</button><button type="button" class="btn ghost" id="khEnd">${B('إلغاء', 'Cancel')}</button></div></div>`;
    root.querySelector('#khShare').onclick = async e => { const text = T('تعال العب خماسية: ', 'Come and play Khumasiya: ') + url; try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); e.currentTarget.textContent = '✓ ' + T('نُسخ', 'Copied'); } } catch (er) {} };
    root.querySelector('#khEnd').onclick = async () => { await wipe(G.pin); store.del('run'); home(); };
    const draw = () => {
      const ids = Object.keys(G.names), box = root.querySelector('#khTeams'); if (!box) return;
      box.innerHTML = [...Array(G.o.teams).keys()].map(k => { const m = ids.filter(u => G.tm[u] === k); return `<div class="kh-team" style="--c:${COL[k]}"><h4>${TN(k)} <small>${m.length}</small></h4>${m.map(u => `<button type="button" data-u="${u}" dir="auto">${esc(G.names[u])}${u === G.me ? ' ⭐' : ''}</button>`).join('')}</div>`; }).join('');
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
    G.st = KH.create({ players, teams: G.o.teams, L: G.o.L });
    await G.ref.child('st').set('play');
    await publish(true);
    run();
  }
  // what everyone sees, then each hand to its owner only
  // the turn clock: when it runs out, the computer plays a sensible move for that player
  const pubOf = () => Object.assign(KH.pub(G.st), { dl: G.dl || 0 });
  function clock() {
    const st = G.st; clearTimeout(G.tt);
    if (!G.o.tt || st.win !== -1) { G.dl = 0; return; }
    if (G.dlN !== st.turn || !G.dl) { G.dlN = st.turn; G.dl = now() + G.o.tt * 1000; }
    G.tt = setTimeout(timeUp, Math.max(0, G.dl - now()) + 400);
  }
  function timeUp() {
    if (!G || !G.st || G.st.win !== -1 || G.dlN !== G.st.turn) return;
    const st = G.st, id = KH.cur(st);
    let m = KH.botMove(st, id);
    if (m && m.swap) { KH.swap(st, id, m.swap); m = KH.botMove(st, id); }
    if (!m || m.swap) KH.pass(st, id); else { KH.play(st, id, m.card, m.i); if (st.last) st.last.auto = true; }
    G.lastBy = id; publish(false); show();
  }
  async function publish(all) {
    const st = G.st; clock();
    store.set('run', { pin: G.pin, st, names: G.names, tm: G.tm, o: G.o, me: G.me, at: Date.now() });
    await G.ref.update({ g: pubOf(), names: G.names, st: st.win !== -1 ? 'end' : 'play' });
    const ids = all ? Object.keys(st.hands) : [G.lastBy].filter(Boolean);
    await Promise.all(ids.map(id => db.ref('khh/' + G.pin + '/' + id).set(st.hands[id])));
  }
  function apply(id, k, c, i) {
    const st = G.st, e = k === 'p' ? KH.play(st, id, c, i) : k === 's' ? KH.swap(st, id, c) : KH.pass(st, id);
    if (e) return e;
    G.lastBy = id; publish(false); show();
    return '';
  }
  function run() {
    on(G.ref.child('mv'), 'child_added', s => { const v = s.val() || {}; apply(s.key, v.k, v.c, v.x); s.ref.remove(); });
    show();
  }
  function show() {
    const st = G.st;
    view({ P: pubOf(), hand: G.me ? st.hands[G.me] : null, me: G.me, names: G.names, screen: !G.me, act: (k, c, i) => apply(G.me, k, c, i), again: async () => { store.del('run'); await wipe(G.pin); home(); } });
  }
  async function resumeHost(P) {
    stop();
    try { await fb(); } catch (e) { toast(B('تعذّر الاتصال.', 'Could not connect.'), 1); return; }
    const snap = await db.ref('kh/' + P.pin + '/host').once('value');
    if (snap.val() !== uid) { store.del('run'); toast(B('انتهت هذه اللعبة.', 'This game has ended.'), 1); return home(); }
    G = { mode: 'host', pin: P.pin, o: Object.assign({ tt: 0 }, P.o), ref: db.ref('kh/' + P.pin), names: P.names, tm: P.tm, off: [], me: P.me, st: P.st };
    run(); publish(false);
  }

  /* ---------- a player who joins with a code ---------- */
  function joinCode(pre) {
    stop();
    root.innerHTML = `<div class="kh-card kh-narrow"><h2>🔢 ${B('ادخل اللعبة', 'Join a game')}</h2>
      <label class="kh-opt"><span>${B('رمز اللعبة', 'Game code')}</span><input id="khP" inputmode="numeric" maxlength="7" dir="ltr" placeholder="123 456" value="${esc(pre || '')}"></label>
      <label class="kh-opt"><span>${B('اسمك', 'Your name')}</span><input id="khN" maxlength="24" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <p class="kh-err" hidden></p><div class="kh-row"><button type="button" class="btn solid" id="khGo">${B('ادخل لاعبًا', 'Join as a player')}</button><button type="button" class="btn ghost" id="khWatch">👀 ${B('شاهد فقط', 'Just watch')}</button><button type="button" class="btn ghost" id="khBack">${B('رجوع', 'Back')}</button></div></div>`;
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
        if (!mine) { if (s !== 'lobby') { e.currentTarget.disabled = false; return err(B('بدأت هذه اللعبة؛ لا يمكن الدخول الآن.', 'This game has started; you cannot join now.')); } await db.ref('kh/' + p + '/pl/' + uid).set({ n, at: TS() }); }
        player(p);
      } catch (er) { console.error('kh join', er && er.message); e.currentTarget.disabled = false; err(B('تعذّر الدخول. تأكد من الإنترنت.', 'Could not join. Check the internet.')); }
    };
    // a watcher only reads the table: no name, and they can come in at any time
    root.querySelector('#khWatch').onclick = async () => {
      const p = pin.value.replace(/\D/g, ''); if (p.length !== 6) return err(B('الرمز ستة أرقام.', 'The code has six digits.'));
      try { await fb(); if (!(await db.ref('kh/' + p + '/st').once('value')).exists()) return err(B('لا توجد لعبة بهذا الرمز.', 'No game with this code.')); watch(p); } catch (e) { err(B('تعذّر الاتصال.', 'Could not connect.')); }
    };
    if (pre) setTimeout(() => root.querySelector('#khN').value.trim() ? null : root.querySelector('#khN').focus(), 100);
  }
  function player(pin) {
    stop();
    G = { mode: 'player', pin, ref: db.ref('kh/' + pin), me: uid, off: [], hand: [], P: null, names: {}, tm: {}, stt: 'lobby' };
    const draw = () => {
      if (!G) return;
      if (G.stt === 'lobby' || !G.P) {
        const k = G.tm[uid];
        root.innerHTML = `<div class="kh-card kh-narrow kh-wait"><p class="kh-big">${B('أنت في اللعبة!', 'You are in!')}</p>${k != null ? `<p class="kh-tm" style="--c:${COL[k]}">${B('فريقك', 'Your team')}: <b>${TN(k)}</b></p>` : ''}<p>${B('انتظر حتى يبدأ منشئ اللعبة. وفي الأثناء تعرّف على القواعد:', 'Wait for the game to start. Meanwhile, here are the rules:')}</p></div>${rules(true)}`;
        return;
      }
      view({ P: G.P, hand: G.hand, me: uid, names: G.names, act: (k, c, i) => { G.ref.child('mv/' + uid).set({ k, c: c || '', x: i == null ? -1 : i, t: TS() }).catch(() => toast(B('تعذّر الإرسال.', 'Could not send.'), 1)); return ''; }, again: () => { history.replaceState(null, '', location.pathname); home(); } });
    };
    on(G.ref.child('st'), 'value', s => { if (!s.exists()) { stop(); root.innerHTML = `<div class="kh-card kh-narrow"><p class="kh-big">${B('انتهت اللعبة', 'The game has ended')}</p><button type="button" class="btn ghost" id="khHome">${B('الرئيسية', 'Home')}</button></div>`; root.querySelector('#khHome').onclick = () => { history.replaceState(null, '', location.pathname); home(); }; return; } G.stt = s.val(); draw(); });
    on(G.ref.child('tm'), 'value', s => { G.tm = s.val() || {}; if (G.stt === 'lobby') draw(); });
    on(G.ref.child('names'), 'value', s => { G.names = s.val() || {}; });
    on(G.ref.child('g'), 'value', s => { G.P = s.val(); draw(); });
    on(db.ref('khh/' + pin + '/' + uid), 'value', s => { G.hand = s.val() || []; draw(); });
  }

  function watch(pin) {
    stop();
    G = { mode: 'watch', pin, ref: db.ref('kh/' + pin), off: [], P: null, names: {} };
    const leave = () => { history.replaceState(null, '', location.pathname); home(); };
    on(G.ref.child('st'), 'value', s => { if (!s.exists()) { stop(); root.innerHTML = `<div class="kh-card kh-narrow"><p class="kh-big">${B('انتهت اللعبة', 'The game has ended')}</p><button type="button" class="btn ghost" id="khHome">${B('الرئيسية', 'Home')}</button></div>`; root.querySelector('#khHome').onclick = leave; } });
    on(G.ref.child('names'), 'value', s => { G.names = s.val() || {}; });
    on(G.ref.child('g'), 'value', s => {
      G.P = s.val();
      if (!G.P) { root.innerHTML = `<div class="kh-card kh-narrow kh-wait"><p class="kh-big">👀 ${B('أنت تشاهد', 'You are watching')}</p><p>${B('لم تبدأ اللعبة بعد؛ ستظهر هنا حين تبدأ.', 'The game has not started yet; it will show here when it does.')}</p></div>`; return; }
      view({ P: G.P, hand: null, me: null, names: G.names, screen: true, watch: true, act: () => '', again: leave });
    });
  }

  /* ---------- the table: the board, the teams, whose turn, and this player's hand ---------- */
  let sel = null, lastSeen = -1;
  function view({ P, hand, me, names, screen, watch, act, again }) {
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
    if (L && P.n !== lastSeen) { lastSeen = P.n; if (L.auto) toast(`⏱ ${B(`انتهى وقت ${esc(names[L.id] || '')}، فلُعبت ورقة عنه`, `${esc(names[L.id] || '')} ran out of time; a card was played for them`)}`); else if (L.made) { toast(`🎉 ${B(`فريق ${TN(L.t)} أكمل سلسلة!`, `${TN(L.t)} made a sequence!`)}`); buzz([60, 40, 60]); } else if (L.rm) toast(`👁 ${B(`${esc(names[L.id] || '')} أزال قطعة من فريق ${TN(L.t)}`, `${esc(names[L.id] || '')} removed a ${TN(L.t)} chip`)}`); if (mine) buzz(40); }
    const teamsBar = [...Array(P.teams).keys()].map(k => `<div class="kh-ts${P.order && names && turn != null && team[turn] === k ? ' on' : ''}" style="--c:${COL[k]}"><b>${TN(k)}</b><span>${'●'.repeat(P.seqs[k] || 0)}${'○'.repeat(Math.max(0, P.need - (P.seqs[k] || 0)))}</span><small dir="auto">${Object.keys(team).filter(u => team[u] === k).map(u => esc(names[u] || '')).join('، ')}</small></div>`).join('');
    const status = P.win >= 0 ? `🏆 ${B(`فاز فريق ${TN(P.win)}!`, `${TN(P.win)} wins!`)}` : P.win === -2 ? B('تعادل!', 'A draw!')
      : mine ? `<b>${B('دورك!', 'Your turn!')}</b> ${sel ? (KH.oneEyed(sel) ? B('👁 ولد أبو عين: اختر قطعة خصم لإزالتها', '👁 One-eyed jack: pick a rival chip to remove') : KH.twoEyed(sel) ? B('👀 ولد أبو عينين: ضع قطعتك في أي خانة فارغة', '👀 Two-eyed jack: put your chip on any empty space') : dead ? B('خانتا هذه الورقة ممتلئتان؛ استبدلها', 'both its spaces are taken; swap it') : B('اختر إحدى الخانتين المضيئتين', 'pick one of the lit spaces')) : B('اختر ورقة من يدك', 'pick a card')}`
      : `${B('دور', 'Turn:')} <b dir="auto" style="color:${COL[team[turn]]}">${esc(names[turn] || '')}</b> (${TN(team[turn])})`;
    root.innerHTML = `<div class="kh-game${screen ? ' kh-screen' : ''}">
      <div class="kh-bar">${teamsBar}</div>
      <p class="kh-status">${P.dl && P.win === -1 ? `<span class="kh-clock${mine ? ' me' : ''}" id="khClk"></span> ` : ''}${watch ? `<span class="kh-eye">👀 ${B('مشاهدة', 'Watching')}</span> ` : ''}${status}</p>
      <div class="kh-board${can.length ? ' picking' : ''}">${lay.map((c, i) => { const b = board[i], inq = b >= 0 && sq[b] && sq[b].has(i);
        return `<div class="kh-cell${can.includes(i) ? ' can' : ''}${L && L.i === i ? ' last' : ''}" data-i="${i}">${card(c)}${b >= 0 ? `<i class="kh-chip${inq ? ' seq' : ''}" style="--c:${COL[b]}"></i>` : ''}</div>`; }).join('')}</div>
      ${me != null && !screen ? `<div class="kh-hand${mine ? ' mine' : ''}">${hand.map(c => `<button type="button" class="kh-hc${sel === c ? ' on' : ''}${mine && !KH.twoEyed(c) && !KH.oneEyed(c) && !legalOf(c).length ? ' dead' : ''}" data-c="${c}" style="--c:${myT != null ? COL[myT] : '#888'}">${card(c)}</button>`).join('')}</div>
        <div class="kh-row kh-acts">${dead ? `<button type="button" class="btn ghost" id="khSwap">↻ ${B('استبدل الورقة الميتة', 'Swap the dead card')}</button>` : ''}${stuck ? `<button type="button" class="btn ghost" id="khPass">${B('لا حركة لديك: تخطَّ الدور', 'No move: pass')}</button>` : ''}</div>` : ''}
      ${screen ? `<div class="kh-row"><button type="button" class="btn ghost" id="khFs">⛶ ${B('ملء الشاشة', 'Full screen')}</button></div>` : ''}
      <div class="kh-help">${rules(false)}</div>
      ${P.win !== -1 ? `<div class="kh-row"><button type="button" class="btn solid" id="khAgain">${B('لعبة جديدة', 'New game')}</button></div>` : ''}</div>`;
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sel = sel === b.dataset.c ? null : b.dataset.c; buzz(8); view({ P, hand, me, names, screen, watch, act, again }); });
    root.querySelectorAll('.kh-cell.can').forEach(c => c.onclick = () => { const s = sel; sel = null; buzz(20); act('p', s, +c.dataset.i); });
    const sw = root.querySelector('#khSwap'); if (sw) sw.onclick = () => { const s = sel; sel = null; act('s', s); };
    const ps = root.querySelector('#khPass'); if (ps) ps.onclick = () => act('n');
    const ag = root.querySelector('#khAgain'); if (ag) ag.onclick = again;
    const ck = root.querySelector('#khClk');
    if (ck) { let warned = false; const tick = () => { const left = Math.max(0, Math.ceil((P.dl - now()) / 1000)); ck.textContent = '⏱ ' + left; ck.classList.toggle('hot', left <= 10); if (mine && left <= 5 && !warned) { warned = true; buzz([80, 60, 80]); } }; tick(); clk = setInterval(tick, 250); }
    const fs = root.querySelector('#khFs'); if (fs) fs.onclick = () => document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen();
  }

  document.addEventListener('DOMContentLoaded', home);
  if (document.readyState !== 'loading') home();
})();

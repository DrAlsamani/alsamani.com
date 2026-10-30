/* Baloot (alsamani.com/play/baloot): the table on a screen and the hands on phones, or against the computer.
   The device that creates the game keeps the rules and the pack (BL) and plays the empty seats (BLBOT); the others send their moves.
   Network paths are shared with Tasalsul's (kh/…), marked with cfg.game = 'bl'. */
(function () {
  const root = document.getElementById('bl');
  if (!root || !window.BL) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('bl.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bl.' + k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem('bl.' + k); } catch (e) {} } };
  const toast = (html, bad) => { let t = document.getElementById('blToast'); if (!t) { t = document.createElement('div'); t.id = 'blToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3200); };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  // sound: card snaps made on the fly (no files) and the calls spoken by the device's Arabic voice
  const SND = (() => {
    let ac = null, on = store.get('snd', true);
    const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; };
    const noise = (a, dur, f, q, vol, type) => { const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); const src = a.createBufferSource(); src.buffer = b; const fl = a.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const g = a.createGain(); g.gain.value = vol; src.connect(fl).connect(g).connect(a.destination); src.start(); };
    const thump = (a, vol) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + .18); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .26); };
    let voice = null; const pickV = () => { try { const v = speechSynthesis.getVoices(); voice = v.find(x => /^ar[-_]SA/i.test(x.lang)) || v.find(x => /^ar/i.test(x.lang)) || null; } catch (e) {} };
    try { pickV(); speechSynthesis.onvoiceschanged = pickV; } catch (e) {}
    document.addEventListener('pointerdown', () => { if (on) ctx(); }, { once: true });
    return {
      get on() { return on; }, set on(v) { on = v; store.set('snd', v); if (!v) try { speechSynthesis.cancel(); } catch (e) {} },
      card() { const a = on && ctx(); if (a) noise(a, .07, 2600, .9, .55); },
      slam() { const a = on && ctx(); if (!a) return; noise(a, .14, 1400, .6, 1.1); noise(a, .2, 500, .7, .9, 'lowpass'); thump(a, .9); },
      tick() { const a = on && ctx(); if (a) noise(a, .03, 4200, 2, .18); },
      deal() { const a = on && ctx(); if (!a) return; for (let i = 0; i < 4; i++) setTimeout(() => noise(a, .05, 3200, 1, .3), i * 70); },
      speak(t) { if (!on || !isAr() || !window.speechSynthesis) return; t = String(t).replace(/[♠♥♦♣]/g, m => ' ' + SUITN[{ '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' }[m]]).replace(/[^؀-ۿ\s!؟?]/g, '').trim(); if (!t) return; try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ar-SA'; if (voice) u.voice = voice; u.rate = 1.05; u.pitch = 1; speechSynthesis.speak(u); } catch (e) {} }
    };
  })();
  const JOIN = 'alsamani.com/play/baloot';
  const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' }, SUITN = { S: 'سبيت', H: 'هاص', D: 'ديمن', C: 'شيريا' };
  const RN = { A: 'إكة', K: 'شايب', Q: 'بنت', J: 'ولد', T: 'عشرة', 9: 'تسعة', 8: 'ثمانية', 7: 'سبعة' };
  const team = s => s % 2;
  const TEAMN = k => k ? T('هم', 'Them') : T('لنا', 'Us');
  const IMG = '../../img/cards/';
  // real playing cards (the classic designs by Adrian Kennard, public domain)
  // a seated player: a simple bust in thobe and shmagh (red or white), drawn here
  const LOOKS = [['#c62828', '#c98e62', 1], ['#fff', '#b97a50', 0], ['#c62828', '#a86d45', 1], ['#fff', '#d9a27a', 1]];
  // a seated player from the chest up, in thobe and shmagh; the hands hold the cards in front
  const profile = k => { const [sh, sk, beard] = LOOKS[k % 4], id = 'shp' + k + Math.random().toString(36).slice(2, 6);
    return `<svg class="bl-man side" viewBox="0 0 120 112" aria-hidden="true"><defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fbfaf7"/>${sh === '#fff' ? '<path d="M0 0h5v.6H0z" fill="#e7e3da"/>' : `<path d="M0 0h2.5v2.5H0zM2.5 2.5H5V5H2.5z" fill="${sh}"/>`}</pattern>
      <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="#d9d5cb"/><stop offset=".6" stop-color="#fbfaf6"/><stop offset="1" stop-color="#e2ded5"/></linearGradient></defs>
      <path d="M14 112c2-30 18-46 46-46 24 0 40 14 44 46z" fill="url(#${id}t)"/><path d="M84 78c8 8 14 18 16 34" stroke="#d2cdc2" stroke-width="2" fill="none"/>
      <path d="M44 30c-4 22-12 46-26 66l30-12c6-16 10-34 12-52z" fill="url(#${id})" stroke="#0002"/>
      <path d="M58 26c12-3 21 4 23 14l4 8-4 2c1 7-3 14-11 16-9 2-15-4-16-12z" fill="${sk}"/>${beard ? `<path d="M60 56c3 7 8 10 14 9 5-1 7-5 7-9-4 2-9 3-13 1-3-1-6-2-8-1z" fill="#241811"/>` : ''}
      <circle cx="74" cy="40" r="1.6" fill="#241811"/>
      <path d="M40 36c0-14 10-22 22-22 10 0 18 6 20 16-8-4-18-4-26 1-2 16-6 34-12 52l-14 8c8-18 10-36 10-55z" fill="url(#${id})" stroke="#0002"/>
      <path d="M42 26c8-8 22-10 34-3" stroke="#141414" stroke-width="3.6" fill="none"/><path d="M41.5 31c8-7 22-8.6 34-2.4" stroke="#141414" stroke-width="3.2" fill="none"/></svg>`; };
  const person = k => { const [sh, sk, beard] = LOOKS[k % 4], id = 'shm' + k + Math.random().toString(36).slice(2, 6);
    return `<svg class="bl-man" viewBox="0 0 120 112" aria-hidden="true"><defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fbfaf7"/>${sh === '#fff' ? '<path d="M0 0h5v.6H0z" fill="#e7e3da"/>' : `<path d="M0 0h2.5v2.5H0zM2.5 2.5H5V5H2.5z" fill="${sh}"/>`}</pattern>
      <linearGradient id="${id}t" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fbfaf6"/><stop offset="1" stop-color="#d9d5cb"/></linearGradient></defs>
      <path d="M4 112c2-30 22-46 56-46s54 16 56 46z" fill="url(#${id}t)"/><path d="M52 68l8 20 8-20" fill="none" stroke="#cfcabe" stroke-width="2"/><path d="M60 88v24" stroke="#d6d1c6" stroke-width="1.5"/>
      <path d="M36 52c-2-24 9-38 24-38s26 14 24 38l18 44c-10-14-26-24-42-24s-32 10-42 24z" fill="url(#${id})" stroke="#0002"/>
      <ellipse cx="60" cy="50" rx="12.5" ry="15.5" fill="${sk}"/>${beard ? `<path d="M47.6 51c1 12 6.4 16 12.4 16s11.4-4 12.4-16c-3 4.4-6.4 6.4-12.4 6.4S50.6 55.4 47.6 51z" fill="#241811"/><path d="M54 57.5c3 1.4 9 1.4 12 0" stroke="#241811" stroke-width="2.4" fill="none"/>` : ''}
      <path d="M53.5 47.5h4M62.5 47.5h4" stroke="#241811" stroke-width="2" stroke-linecap="round"/>
      <path d="M37 32c6-6 14-8 23-8s17 2 23 8" stroke="#141414" stroke-width="3.6" fill="none"/><path d="M38.5 36.5c6-5 13.5-6.6 21.5-6.6s15.5 1.6 21.5 6.6" stroke="#141414" stroke-width="3.2" fill="none"/></svg>`; };
  const CUP = `<svg viewBox="0 0 40 34" aria-hidden="true"><ellipse cx="20" cy="30" rx="15" ry="3.5" fill="#0004"/><path d="M5 6h30l-4 20c-1 4-5 6-11 6s-10-2-11-6z" fill="#fbfaf6" stroke="#d8d2c4"/><ellipse cx="20" cy="6" rx="15" ry="3.6" fill="#c9a36a" stroke="#e6dccb"/><path d="M20 12v10M17 15l3-3 3 3M16 18l4-3 4 3" stroke="#3f7d4b" stroke-width="1.4" fill="none"/></svg>`;
  const DALLAH = `<svg viewBox="0 0 60 90" aria-hidden="true"><defs><linearGradient id="blBr" x1="0" x2="1"><stop offset="0" stop-color="#8a6a2a"/><stop offset=".45" stop-color="#f1d58a"/><stop offset="1" stop-color="#9c7a34"/></linearGradient></defs><path d="M30 2l3 8h-6z" fill="url(#blBr)"/><path d="M24 10h12l2 12c6 4 9 14 9 26 0 14-6 24-17 24S13 62 13 48c0-12 3-22 9-26z" fill="url(#blBr)"/><path d="M14 40C6 34 2 22 4 12l4 2c0 9 3 18 8 22z" fill="url(#blBr)"/><path d="M46 30c8 0 12 8 10 16s-8 12-10 12" stroke="url(#blBr)" stroke-width="4" fill="none"/><path d="M14 74h32l4 10H10z" fill="url(#blBr)"/></svg>`;
  const card = (c, cls) => `<span class="bl-c${c ? '' : ' back'} ${cls || ''}"${c ? ` data-c="${c}"` : ''}><img src="${IMG}${c || 'back'}.svg" alt="${c ? (c[0] === 'T' ? '10' : c[0]) + SUIT[c[1]] : ''}" draggable="false"></span>`;
  const contractTxt = C => !C ? '' : C.type === 'sun' ? (C.ashkal ? T('أشكال (صن)', 'Ashkal (Sun)') : T('صن', 'Sun')) : `${T('حكم', 'Hokm')} ${SUIT[C.trump]}`;
  const BIDO = () => ({ pass: T('بس', 'Pass'), hokm: T('حكم', 'Hokm'), sun: T('صن', 'Sun'), ashkal: T('أشكل', 'Ashkal'), kawesh: T('كوّش', 'Kawesh') });
  const bidTxt = o => o.startsWith('hokm:') ? `${T('حكم', 'Hokm')} ${SUIT[o.slice(5)]}` : BIDO()[o] || o;
  const DBLO = () => ({ pass: T('بس', 'Pass'), double: T('دبل', 'Double'), 'double:open': T('دبل مفتوح', 'Double, open'), 'double:locked': T('دبل مقفول', 'Double, locked'), triple: T('ثري', 'Triple'), 'four:open': T('فور مفتوح', 'Four, open'), 'four:locked': T('فور مقفول', 'Four, locked'), gahwa: T('قهوة ☕', 'Gahwa ☕') });
  // short codes for the network (the rules allow three characters)
  const ENC = { pass: 'P', hokm: 'H', sun: 'S', ashkal: 'A', kawesh: 'K', 'hokm:S': 'HS', 'hokm:H': 'HH', 'hokm:D': 'HD', 'hokm:C': 'HC', double: 'D', 'double:open': 'DO', 'double:locked': 'DL', triple: 'T', 'four:open': 'FO', 'four:locked': 'FL', gahwa: 'G' };
  const DEC = Object.fromEntries(Object.entries(ENC).map(([a, b]) => [b, a]));

  let G = null, db = null, uid = null, off = 0;
  const now = () => Date.now() + off;
  async function fb() {
    if (db) return;
    if (!window.firebase || !window.MD_CFG) throw new Error('nofb');
    if (!firebase.apps.length) firebase.initializeApp(MD_CFG);
    const u = firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user;
    uid = u.uid; db = firebase.database(); db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const wipe = async pin => { try { await db.ref('khh/' + pin).remove(); } catch (e) {} try { await db.ref('kh/' + pin).remove(); } catch (e) {} };
  const stop = () => { if (G && G.off) G.off.forEach(f => f()); if (G) { clearTimeout(G.botT); clearTimeout(G.tt); clearTimeout(G.nxT); clearTimeout(G.tapT); } clearTimeout(view.t); G = null; document.querySelectorAll('.bl-over').forEach(x => x.remove()); };
  const on = (ref, ev, fn) => { ref.on(ev, fn); G.off.push(() => ref.off(ev, fn)); };

  /* ---------- home ---------- */
  const rules = open => `<details class="bl-rules"${open ? ' open' : ''}><summary>📖 ${B('ملخص القوانين', 'The rules in brief')}</summary><ol>
    <li>${B('أربعة لاعبين، كل اثنين متقابلين فريق. لكل لاعب ٨ أوراق، ويفوز من يصل ١٥٢ أولًا.', 'Four players; partners sit opposite. Eight cards each; first to 152 wins.')}</li>
    <li>${B('<b>الشراء</b>: في الأول حكم من نوع الورقة المكشوفة أو صن، وفي الثاني حكم من نوع آخر أو صن. والأشكال للثالث والموزّع: صن يأخذ الورقة فيه الشريك.', '<b>Buying</b>: first round Hokm in the shown suit or Sun; second round another suit or Sun. Ashkal: Sun with the partner taking the card.')}</li>
    <li>${B('<b>الحكم</b>: ترتيبه ولد، تسعة، إكة، عشرة، شايب، بنت. ويلزم النوع، فإن لم يوجد يلزم الدق، والتكبير على الخصم.', '<b>Hokm</b>: J, 9, A, 10, K, Q. Follow suit; if you cannot, trump; overtrump the opponents.')}</li>
    <li>${B('<b>المشاريع</b> تُعلن في الأكلة الأولى: سرا، خمسين، مية، أربعمية. و<b>البلوت</b> شايب وبنت الحكم.', '<b>Projects</b> are called on the first trick; <b>Baloot</b> is the K and Q of trumps.')}</li>
    <li>${B('<b>القيد</b>: من خالف ولم ينتبه له أحد مرّت مخالفته؛ فإن قال الخصم «قيد» وصحّ، أخذ اليد كاملة، وإن أخطأ قُيّد عليه.', '<b>Qaid</b>: a breach stands unless the other side calls it; a right call wins the hand, a wrong one loses it.')}</li></ol></details>`;
  function home() {
    stop();
    const run = store.get('run');
    root.innerHTML = `<div class="bl-home">
      ${run && Date.now() - run.at < 6 * 3600e3 ? `<button type="button" class="bl-resume" id="blResume">↩ ${B('ارجع إلى لعبتك', 'Back to your game')}</button>` : ''}
      <button type="button" class="bl-mode" data-go="bot"><b>🤖 ${B('العب ضد الجهاز', 'Play the computer')}</b><small>${B('أنت وشريك من الجهاز ضد فريق من الجهاز. اختر أسلوب لعبه وقوته.', 'You and a computer partner against a computer team. Choose its style and strength.')}</small></button>
      <button type="button" class="bl-mode" data-go="host"><b>👥 ${B('العب مع الآخرين', 'Play with others')}</b><small>${B('أنشئ طاولة وشارك رمزها: الطاولة على الشاشة والأوراق في الجوالات، ومن لا يحضر يكمّله الجهاز.', 'Create a table and share its code: the table on a screen, hands on phones; the computer fills any empty seat.')}</small></button>
      <button type="button" class="bl-mode" data-go="join"><b>🔢 ${B('ادخل برمز', 'Join with a code')}</b><small>${B('لاعبًا أو متفرجًا.', 'As a player or to watch.')}</small></button>
      ${rules()}</div>`;
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => b.dataset.go === 'join' ? joinCode() : setup(b.dataset.go === 'bot'));
    const r = root.querySelector('#blResume'); if (r) r.onclick = () => run.local ? resumeLocal(run) : resumeHost(run);
  }

  /* ---------- a new game: the computer's style, house rules, turn time ---------- */
  function setup(bot) {
    const o = Object.assign({ style: 'pro', level: 'strong', pStyle: 'classic', pLevel: 'strong', oStyle: 'pro', oLevel: 'medium', tt: 0, qaid: true, ashkal2: false, kawesh: true, role: 'play', seat: 'jack' }, store.get('cfg', {}));
    if (!['pro', 'classic'].includes(o.style)) o.style = 'pro';
    const seg = (k, opts) => `<div class="bl-seg" data-k="${k}">${opts.map(([v, a, e]) => `<button type="button" data-v="${v}">${B(a, e)}</button>`).join('')}</div>`;
    root.innerHTML = `<div class="bl-card"><h2>${bot ? '🤖 ' + B('العب ضد الجهاز', 'Play the computer') : '👥 ' + B('طاولة جديدة', 'A new table')}</h2>
      ${bot ? `<div class="bl-who"><h4>🤝 ${B('شريكك', 'Your partner')}</h4>${seg('pStyle', STY)}${seg('pLevel', LVL)}</div>
      <div class="bl-who"><h4>⚔️ ${B('الخصمان', 'The opponents')}</h4>${seg('oStyle', STY)}${seg('oLevel', LVL)}</div>`
      : `<div class="bl-who"><h4>🤖 ${B('الجهاز حين يكمّل مقعدًا فارغًا', 'The computer, when it fills an empty seat')}</h4>${seg('style', STY)}${seg('level', LVL)}</div>`}
      <div class="bl-opt"><span>${B('القيد', 'Qaid')}</span>${seg('qaid', [['1', 'مفتوح', 'Open'], ['0', 'ممنوع', 'Off']])}</div>
      ${bot ? '' : `<div class="bl-opt"><span>${B('وقت الدور', 'Time per turn')}</span>${seg('tt', [['0', 'بلا وقت', 'No limit'], ['10', '١٠ ثوانٍ', '10 s'], ['15', '١٥ ثانية', '15 s'], ['30', '٣٠ ثانية', '30 s'], ['60', 'دقيقة', '1 min']])}</div>
      <div class="bl-opt"><span>${B('الجلوس', 'Seating')}</span>${seg('seat', [['jack', 'طق الولد', 'Draw the jacks'], ['rand', 'عشوائي', 'Random'], ['hand', 'أختار بنفسي', 'I choose']])}</div>
      <div class="bl-opt"><span>${B('هذا الجهاز', 'This device')}</span>${seg('role', [['play', 'ألعب منه', 'I play on it'], ['screen', 'شاشة الطاولة فقط', 'The table screen only']])}</div>`}
      <details class="bl-more"><summary>${B('قوانين الجلسة', 'House rules')}</summary>
        <label><input type="checkbox" data-c="kawesh"${o.kawesh ? ' checked' : ''}> ${B('الكوش: من أتته خمس أوراق كلها ٧ و٨ و٩ يطلب إعادة التوزيع', 'Kawesh: a first five of only 7s, 8s and 9s may be redealt')}</label>
        <label><input type="checkbox" data-c="ashkal2"${o.ashkal2 ? ' checked' : ''}> ${B('الأشكال في الدور الثاني أيضًا', 'Ashkal in the second round too')}</label></details>
      <label class="bl-opt bl-name" ${!bot && o.role === 'screen' ? 'hidden' : ''}><span>${B('اسمك', 'Your name')}</span><input id="blN" maxlength="24" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <div class="bl-row"><button type="button" class="btn solid" id="blGo">${bot ? B('ابدأ ▶', 'Start ▶') : B('أنشئ الطاولة', 'Create the table')}</button><button type="button" class="btn ghost" id="blBack">${B('رجوع', 'Back')}</button></div></div>`;
    const paint = () => { root.querySelectorAll('.bl-seg').forEach(g => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(o[g.dataset.k] === true ? '1' : o[g.dataset.k] === false ? '0' : o[g.dataset.k]) === b.dataset.v))); const nm = root.querySelector('.bl-name'); if (nm) nm.hidden = !bot && o.role === 'screen'; };
    root.querySelectorAll('.bl-seg button').forEach(b => b.onclick = () => { const k = b.parentNode.dataset.k, v = b.dataset.v; o[k] = k === 'tt' ? +v : k === 'qaid' ? v === '1' : v; paint(); });
    root.querySelectorAll('[data-c]').forEach(c => c.onchange = () => { o[c.dataset.c] = c.checked; });
    paint();
    root.querySelector('#blBack').onclick = home;
    root.querySelector('#blGo').onclick = () => {
      const n = (root.querySelector('#blN') || {}).value; const name = (n || '').trim().slice(0, 24) || T('أنت', 'You');
      if (n && n.trim()) store.set('name', n.trim()); store.set('cfg', o);
      if (bot) local(o, name); else host(o, name);
    };
  }
  const STY = [['pro', 'حريف', 'Sharp'], ['classic', 'أصول', 'By the book']];
  const LVL = [['easy', 'مبتدئ', 'Beginner'], ['medium', 'متوسط', 'Medium'], ['strong', 'قوي', 'Strong']];
  const houseRules = o => ({ strict: !o.qaid, ashkal2: !!o.ashkal2, kawesh: !!o.kawesh });
  const botName = s => [T('الجهاز ١', 'Computer 1'), T('الجهاز ٢', 'Computer 2'), T('الجهاز ٣', 'Computer 3'), T('الجهاز ٤', 'Computer 4')][s];

  /* ---------- against the computer, on this device ---------- */
  function local(o, name) {
    stop();
    const m = BL.newMatch(houseRules(o));
    const opp = { bot: 1, sty: o.oStyle, lvl: o.oLevel }; G = { mode: 'local', o, m, seats: [{ n: name, me: true }, Object.assign({ n: T('خصم', 'Rival') + ' ١' }, opp), { n: T('شريكك', 'Partner'), bot: 1, sty: o.pStyle, lvl: o.pLevel }, Object.assign({ n: T('خصم', 'Rival') + ' ٢' }, opp)], mine: 0, off: [] };
    drive();
  }
  function resumeLocal(run) { stop(); G = { mode: 'local', o: run.o, m: run.m, seats: run.seats, mine: 0, off: [] }; drive(); }

  /* ---------- the host: the rules, the computer seats, the clock ---------- */
  // after every change: save, publish, let a computer seat move, or wait for a person
  function drive() {
    if (!G) return; const m = G.m, H = m.H;
    if (G.mode === 'local') store.set('run', { local: true, o: G.o, m, seats: G.seats, at: Date.now() });
    if (G.dn !== m.n) { G.dn = m.n; G.hold = now() + 2900; G.nt = 0; }   // a new deal: give the cards time to arrive
    if (H.tricks.length !== G.nt) { G.tap = -1; if (H.tricks.length > (G.nt || 0)) { const w = H.tricks[H.tricks.length - 1].win, x = G.seats[w] || {};
        if (!x.bot && H.tricks.length - (G.nt || 0) === 1 && (G.mode === 'local' ? w === 0 : !!x.u)) { G.hold = now() + 10000; G.tap = w; G.tapT = setTimeout(() => { if (G && G.tap === w) { G.tap = -1; drive(); } }, 10050); }
        else G.hold = now() + 1300; } G.nt = H.tricks.length; }
    if (G.mode === 'host') publish();
    show();
    clearTimeout(G.botT); clearTimeout(G.tt);
    if (m.over >= 0) return;
    if (H.phase === 'done') { G.nxT = setTimeout(() => { if (G && G.m.H.phase === 'done' && G.autoNext !== false) { BL.nextHand(G.m); drive(); } }, (G.mode === 'local' ? 12000 : 14000) + Math.max(0, (G.hold || 0) - now())); return; }
    const s = H.turn, seat = G.seats[s];
    if (seat && seat.bot) { G.botT = setTimeout(() => botMove(s), Math.max(0, (G.hold || 0) - now()) + (H.phase === 'play' ? 1100 + Math.random() * 700 : 1300 + Math.random() * 500)); return; }
    if (G.o.tt) { const w = Math.max(0, (G.hold || 0) - now()); G.dl = now() + w + G.o.tt * 1000; G.tt = setTimeout(() => timeUp(s), w + G.o.tt * 1000 + 300); } else G.dl = 0;
  }
  function botMove(s) {
    if (!G || G.m.H.turn !== s) return;
    if (G.m.H.phase === 'play' && !G.m.H.trick.length && G.m.H.hands[s].length >= 2 && BL.sawaOk(G.m, s)) { act(s, 'w'); return; }
    const x = G.seats[s] || {}, a = BLBOT.act(G.m, s, { style: x.sty || G.o.style, level: x.lvl || G.o.level }) || BL.botAct(G.m, s);
    perform(s, a);
  }
  // when time runs out the computer moves for the player, without thinking (no gain from waiting)
  function timeUp(s) { if (!G || G.m.H.turn !== s) return; const a = BL.botAct(G.m, s, 'weak'); if (G.m.H.phase === 'bid') a.bid = 'pass'; if (G.m.H.phase === 'double') a.dbl = 'pass'; perform(s, a, true); }
  function perform(s, a, auto) {
    const m = G.m, H = m.H; let ok = false;
    if (H.phase === 'bid') { ok = BL.bid(m, s, a.bid); if (ok) say(s, a.bid === 'pass' ? (m.H.round === 2 || H.round === 2 ? T('ولا', 'Pass') : T('بس', 'Pass')) : a.bid.startsWith('hokm:') ? T('حكم ثاني', 'Hokm, second') : bidTxt(a.bid), 1); }
    else if (H.phase === 'double') { ok = BL.doubleAct(m, s, a.dbl); if (ok && a.dbl !== 'pass') say(s, DBLO()[a.dbl], 1); }
    else if (H.phase === 'play') { const hadB = H.baloot; ok = BL.play(m, s, a.card, { declare: a.declare, ekka: a.ekka }); if (ok) G.sl = a.slam ? a.card : ''; if (ok && a.ekka) say(s, T('إكّة', 'Ekka')); if (ok && !hadB && m.H.baloot) say(s, T('بلوت!', 'Baloot!')); }
    if (ok) { G.lastAuto = auto ? s : -1; drive(); }
    return ok;
  }
  function act(s, k, v, x) {        // a person's move, from this device or the network
    if (!G || !G.m) return false;
    const m = G.m;
    if (k === 'k') { if (G.tap === s) { G.tap = -1; clearTimeout(G.tapT); G.hold = now(); drive(); } return true; }
    if (k === 'w') { const ok = BL.sawa(m, s); if (ok) { say(s, T('سوا', 'All mine')); drive(); } return ok; }
    if (k === 'q') { const ok = BL.qaid(m, s); if (ok) { say(s, T('قيد!', 'Qaid!')); drive(); } return ok; }
    if (m.H.turn !== s) return false;
    if (k === 'b') return perform(s, { bid: v });
    if (k === 'd') return perform(s, { dbl: v });
    if (k === 'p') return perform(s, { card: v, declare: !!(x & 1), ekka: !!(x & 2), slam: !!(x & 4) });
    return false;
  }
  // a short word over a seat ("Hokm", "Double", "Qaid!")
  // q: spoken only (bids and doubles already stay written by the name, so no bubble)
  function say(s, t, q) { G.says = G.says || {}; G.says[s] = { t, at: Date.now(), q: q ? 1 : 0 }; }

  /* ---------- online: create, seat, publish ---------- */
  async function host(o, name) {
    stop(); root.innerHTML = `<div class="bl-card"><p>${B('لحظة…', 'One moment…')}</p></div>`;
    try { await fb(); } catch (e) { root.innerHTML = `<div class="bl-card"><p>${B('تعذّر الاتصال. تأكد من الإنترنت.', 'Could not connect. Check the internet.')}</p><button type="button" class="btn ghost" id="blBack">${B('رجوع', 'Back')}</button></div>`; root.querySelector('#blBack').onclick = home; return; }
    let pin = null;
    for (let t = 0; t < 6 && !pin; t++) { const p = String(100000 + Math.floor(Math.random() * 900000)); try { await db.ref('kh/' + p).set({ host: uid, at: TS(), st: 'lobby', cfg: { game: 'bl' } }); pin = p; } catch (e) {} }
    if (!pin) { toast(B('تعذّر إنشاء الطاولة.', 'Could not create the table.'), 1); return home(); }
    G = { mode: 'host', pin, o, ref: db.ref('kh/' + pin), names: {}, off: [], me: o.role === 'play' ? uid : null, order: [] };
    if (G.me) await G.ref.child('pl/' + uid).set({ n: name, at: TS() });
    lobby();
  }
  function lobby() {
    const url = 'https://' + JOIN + '/?k=' + G.pin;
    let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (e) {}
    root.innerHTML = `<div class="bl-card bl-lobby"><div class="bl-join"><div><p>${B('ادخلوا من جوالاتكم على', 'Join on your phones at')}</p><p class="bl-url" dir="ltr">${JOIN}</p><p>${B('واكتبوا الرمز', 'and enter the code')}</p><p class="bl-pin" dir="ltr">${G.pin.slice(0, 3)} ${G.pin.slice(3)}</p>
      <button type="button" class="btn ghost" id="blShare">🔗 ${B('أرسل رابط الدخول', 'Send the join link')}</button></div><div class="bl-qr">${qr}</div></div>
      <div id="blWho"></div><p class="bl-note">${B('من لم يحضر يكمّله الجهاز. ومن أراد المتابعة فقط يدخل بالرمز ويختار «شاهد فقط».', 'The computer fills any empty seat. To only watch, join with the code and choose “Just watch”.')}</p>
      <div class="bl-row"><button type="button" class="btn solid" id="blSeat">${G.o.seat === 'jack' ? '🃏 ' + B('طق الولد', 'Draw the jacks') : B('ابدأ ▶', 'Start ▶')}</button><button type="button" class="btn ghost" id="blEnd">${B('إلغاء', 'Cancel')}</button></div></div>`;
    root.querySelector('#blShare').onclick = async e => { const text = T('تعال العب بلوت: ', 'Come and play Baloot: ') + url; try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast(B('نُسخ الرابط.', 'Link copied.')); } } catch (er) {} };
    root.querySelector('#blEnd').onclick = async () => { await wipe(G.pin); store.del('run'); home(); };
    const draw = () => {
      const ids = Object.keys(G.names), box = root.querySelector('#blWho'); if (!box) return;
      if (G.o.seat === 'hand') { while (G.order.length < 4) G.order.push(null); ids.forEach(u => { if (!G.order.includes(u)) { const i = G.order.indexOf(null); if (i >= 0) G.order[i] = u; } }); G.order = G.order.map(u => u && G.names[u] ? u : null); }
      box.innerHTML = G.o.seat === 'hand'
        ? `<p class="bl-note">${B('انقر لاعبين لتبديل مكانيهما. المتقابلان فريق.', 'Tap two seats to swap them. Opposite seats are partners.')}</p><div class="bl-seats">${[0, 1, 2, 3].map(i => `<button type="button" data-i="${i}" class="t${i % 2}"><small>${i % 2 ? B('فريق ب', 'Team B') : B('فريق أ', 'Team A')}</small>${G.order[i] ? esc(G.names[G.order[i]]) : '🤖 ' + B('الجهاز', 'Computer')}</button>`).join('')}</div>`
        : `<div class="bl-names">${ids.map(u => `<span dir="auto">${esc(G.names[u])}${u === G.me ? ' ⭐' : ''}</span>`).join('')}${[...Array(Math.max(0, 4 - ids.length))].map(() => `<span class="bot">🤖 ${B('الجهاز', 'Computer')}</span>`).join('')}</div>`;
      let pick = null; box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (pick == null) { pick = i; b.classList.add('on'); } else { [G.order[pick], G.order[i]] = [G.order[i], G.order[pick]]; pick = null; draw(); } });
      const tooMany = ids.length > 4; root.querySelector('#blSeat').disabled = tooMany; if (tooMany) toast(B('الطاولة لأربعة فقط؛ الزائد يدخل متفرجًا.', 'Four players only; others can watch.'), 1);
    };
    on(G.ref.child('pl'), 'child_added', s => { G.names[s.key] = (s.val() || {}).n; draw(); buzz(10); });
    on(G.ref.child('pl'), 'child_removed', s => { delete G.names[s.key]; draw(); });
    root.querySelector('#blSeat').onclick = () => { const ids = Object.keys(G.names).slice(0, 4); while (ids.length < 4) ids.push(null); if (G.o.seat === 'jack') jacks(ids); else if (G.o.seat === 'rand') seatUp(ids.sort(() => Math.random() - .5)); else seatUp(G.order.slice(0, 4)); };
  }
  // "draw the jacks": cards face up, one at a time around the players; the two who get a black jack are partners, and so are the two red
  function jacks(ids) {
    const deck = []; BL.SUITS.forEach(s => BL.RANKS.forEach(r => deck.push(r + s))); deck.sort(() => Math.random() - .5);
    const ppl = ids.map((u, i) => ({ u, n: u ? G.names[u] : botName(i), got: [], jack: null })), steps = [];
    let k = 0, i = 0; while (ppl.some(p => !p.jack) && k < deck.length) { const p = ppl[i % 4]; i++; if (p.jack) continue; const c = deck[k++]; p.got.push(c); steps.push([ppl.indexOf(p), c]); if (c[0] === 'J') p.jack = c; }
    const black = ppl.filter(p => p.jack && 'SC'.includes(p.jack[1])), red = ppl.filter(p => p.jack && 'HD'.includes(p.jack[1]));
    const seats = [black[0], red[0], black[1], red[1]].map(p => p.u);
    G.ref.child('jk').set({ ppl: ppl.map(p => ({ n: p.n })), steps: steps.map(([a, c]) => a + c) }).catch(() => {});
    root.innerHTML = `<div class="bl-card bl-jacks"><h2>🃏 ${B('طق الولد', 'Drawing the jacks')}</h2><div class="bl-jk">${ppl.map((p, j) => `<div data-j="${j}"><b dir="auto">${esc(p.n)}</b><span class="bl-jkc"></span></div>`).join('')}</div><p class="bl-note" id="blJkN"></p></div>`;
    let st = 0; const tick = () => {
      if (!G) return; if (st >= steps.length) { const n = root.querySelector('#blJkN'); n.innerHTML = B(`الأسود: ${esc(black[0].n)} و${esc(black[1].n)} · الأحمر: ${esc(red[0].n)} و${esc(red[1].n)}`, 'Black and red pairs are partners'); setTimeout(() => seatUp(seats), 2600); return; }
      const [j, c] = steps[st++], box = root.querySelector(`[data-j="${j}"] .bl-jkc`); box.innerHTML = card(c, c[0] === 'J' ? 'jack' : ''); if (c[0] === 'J') { box.parentNode.classList.add(['S', 'C'].includes(c[1]) ? 'blk' : 'red'); buzz(40); }
      setTimeout(tick, c[0] === 'J' ? 1100 : 420);
    }; tick();
  }
  async function seatUp(order) {
    G.off.forEach(f => f()); G.off = [];
    G.seats = order.map((u, i) => u ? { n: G.names[u], u } : { n: botName(i), bot: 1 });
    G.m = BL.newMatch(houseRules(G.o)); G.mine = G.me ? order.indexOf(G.me) : -1;
    await G.ref.update({ st: 'play', seats: G.seats.map(x => ({ n: x.n, u: x.u || '', bot: !!x.bot })) });
    listen(); drive();
  }
  function listen() {
    on(G.ref.child('mv'), 'child_added', s => { const v = s.val() || {}, seat = G.seats.findIndex(x => x.u === s.key); if (seat >= 0) act(seat, v.k, DEC[v.c] || v.c, v.x); s.ref.remove(); });
    listenRx();
  }
  const pubOf = () => { const P = BL.view(G.m, null); return Object.assign(P, { seats: G.seats.map(x => ({ n: x.n, bot: !!x.bot, u: x.u || '' })), dl: G.dl || 0, hold: G.hold || 0, tt: G.o.tt || 0, says: G.says || {}, sl: G.sl || '', tap: G.tap >= 0 ? G.tap : -1, adv: G.adv || {}, auto: G.lastAuto, rules: G.m.rules, n: G.m.n, decl: undefined }); };
  async function publish() {
    store.set('run', { pin: G.pin, o: G.o, m: G.m, seats: G.seats, names: G.names, me: G.me, at: Date.now() });
    const P = pubOf();
    try { await G.ref.update({ g: JSON.parse(JSON.stringify(P)), st: G.m.over >= 0 ? 'end' : 'play' }); } catch (e) {}
    G.seats.forEach((x, s) => { if (x.u) db.ref('khh/' + G.pin + '/' + x.u).set(G.m.H.hands[s]).catch(() => {}); });
    Object.keys(G.adv || {}).forEach(k => db.ref('khh/' + G.pin + '/' + G.adv[k].u).set(G.m.H.hands[+k.slice(1)]).catch(() => {}));   // each advisor sees the hand of the one they advise
  }
  async function resumeHost(run) {
    stop(); try { await fb(); } catch (e) { toast(B('تعذّر الاتصال.', 'Could not connect.'), 1); return; }
    if ((await db.ref('kh/' + run.pin + '/host').once('value')).val() !== uid) { store.del('run'); toast(B('انتهت هذه اللعبة.', 'This game has ended.'), 1); return home(); }
    G = { mode: 'host', pin: run.pin, o: run.o, ref: db.ref('kh/' + run.pin), names: run.names, off: [], me: run.me, m: run.m, seats: run.seats };
    G.mine = G.me ? G.seats.findIndex(x => x.u === G.me) : -1; listen(); drive();
  }

  /* ---------- joining ---------- */
  function joinCode(pre) {
    stop();
    root.innerHTML = `<div class="bl-card bl-narrow"><h2>🔢 ${B('ادخل الطاولة', 'Join a table')}</h2>
      <label class="bl-opt"><span>${B('الرمز', 'Code')}</span><input id="blP" inputmode="numeric" maxlength="7" dir="ltr" placeholder="123 456" value="${esc(pre || '')}"></label>
      <label class="bl-opt"><span>${B('اسمك', 'Your name')}</span><input id="blN" maxlength="24" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <p class="bl-err" hidden></p><div class="bl-row"><button type="button" class="btn solid" id="blGo">${B('ادخل لاعبًا', 'Join as a player')}</button><button type="button" class="btn ghost" id="blWatch">👀 ${B('شاهد فقط', 'Just watch')}</button><button type="button" class="btn ghost" id="blBack">${B('رجوع', 'Back')}</button></div></div>`;
    const err = t => { const e = root.querySelector('.bl-err'); e.hidden = false; e.innerHTML = t; };
    root.querySelector('#blBack').onclick = () => { history.replaceState(null, '', location.pathname); home(); };
    const pin = root.querySelector('#blP'); pin.oninput = () => { pin.value = pin.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d ]/g, ''); };
    const check = async p => { await fb(); const v = (await db.ref('kh/' + p).once('value')).val(); if (!v || !v.cfg || v.cfg.game !== 'bl') return null; return v; };
    root.querySelector('#blGo').onclick = async ev => {
      const btn = ev.currentTarget, p = pin.value.replace(/\D/g, ''), n = root.querySelector('#blN').value.trim().slice(0, 24);
      if (p.length !== 6) return err(B('الرمز ستة أرقام.', 'The code has six digits.')); if (!n) return err(B('اكتب اسمك.', 'Write your name.'));
      btn.disabled = true; store.set('name', n);
      try {
        const v = await check(p); if (!v) { btn.disabled = false; return err(B('لا توجد طاولة بلوت بهذا الرمز.', 'No Baloot table with this code.')); }
        if (!(v.pl && v.pl[uid])) { if (v.st !== 'lobby') { btn.disabled = false; return err(B('بدأت اللعبة؛ يمكنك المشاهدة.', 'The game has started; you can watch.')); } await db.ref('kh/' + p + '/pl/' + uid).set({ n, at: TS() }); }
        player(p);
      } catch (e) { btn.disabled = false; err(B('تعذّر الدخول. تأكد من الإنترنت.', 'Could not join. Check the internet.')); }
    };
    root.querySelector('#blWatch').onclick = async () => { const p = pin.value.replace(/\D/g, ''); if (p.length !== 6) return err(B('الرمز ستة أرقام.', 'The code has six digits.')); try { if (!(await check(p))) return err(B('لا توجد طاولة بلوت بهذا الرمز.', 'No Baloot table with this code.')); const n = root.querySelector('#blN').value.trim().slice(0, 24); watch(p, n || T('مشجّع', 'A fan')); } catch (e) { err(B('تعذّر الاتصال.', 'Could not connect.')); } };
  }
  function player(pin) {
    stop(); G = { mode: 'player', pin, ref: db.ref('kh/' + pin), off: [], hand: [], P: null };
    const ended = () => { stop(); root.innerHTML = `<div class="bl-card bl-narrow"><p class="bl-big">${B('انتهت اللعبة', 'The game has ended')}</p><button type="button" class="btn ghost" id="blHome">${B('الرئيسية', 'Home')}</button></div>`; root.querySelector('#blHome').onclick = home; };
    on(G.ref.child('st'), 'value', s => { if (!s.exists()) ended(); });
    on(G.ref.child('jk'), 'value', s => { const v = s.val(); if (v && !G.P) root.innerHTML = `<div class="bl-card bl-narrow bl-wait"><p class="bl-big">🃏 ${B('طق الولد على الشاشة…', 'Drawing the jacks on the screen…')}</p></div>`; });
    on(G.ref.child('g'), 'value', s => { G.P = s.val(); draw(); });
    on(db.ref('khh/' + pin + '/' + uid), 'value', s => { G.hand = s.val() || []; draw(); });
    listenRx();
    const draw = () => {
      if (!G) return;
      if (!G.P) { root.innerHTML = `<div class="bl-card bl-narrow bl-wait"><p class="bl-big">${B('أنت في الطاولة!', 'You are in!')}</p><p>${B('انتظر حتى يبدأ منشئ الطاولة.', 'Wait for the host to start.')}</p></div>`; return; }
      const seat = (G.P.seats || []).findIndex(x => x.u === uid); G.mine = seat;
      G.send = G.send || ((k, v, x) => { G.ref.child('mv/' + uid).set({ k, c: ENC[v] || v || '', x: x || 0, t: TS() }).catch(() => toast(B('تعذّر الإرسال.', 'Could not send.'), 1)); return true; });
      view(G.P, G.hand, seat, (k, v, x) => { G.ref.child('mv/' + uid).set({ k, c: ENC[v] || v || '', x: x || 0, t: TS() }).catch(() => toast(B('تعذّر الإرسال.', 'Could not send.'), 1)); return true; });
    };
  }
  function watch(pin, name) {
    stop(); G = { mode: 'watch', pin, ref: db.ref('kh/' + pin), off: [], P: null };
    const seat = G.ref.child('au/' + uid); seat.set({ n: name, at: TS() }).catch(() => {}); seat.onDisconnect().remove(); G.off.push(() => { seat.remove().catch(() => {}); });
    on(G.ref.child('st'), 'value', s => { if (!s.exists()) { stop(); home(); } });
    on(G.ref.child('g'), 'value', s => { G.P = s.val(); if (!G.P) { root.innerHTML = `<div class="bl-card bl-narrow bl-wait"><p class="bl-big">👀 ${B('أنت تشاهد', 'You are watching')}</p><p>${B('ستظهر الطاولة حين تبدأ اللعبة.', 'The table will show when the game starts.')}</p></div>`; return; } view(G.P, null, -1, null); });
    listenRx();
  }

  /* ---------- reactions: emoji and short phrases for everyone (online) ---------- */
  const EMO = ['👏', '🔥', '😂', '😮', '😡', '💪', '😅', '🤝', '☕'];
  const SAY = () => [T('السلام عليكم', 'Hello'), T('وعليكم السلام', 'Hello to you'), T('فالك طيب', 'Good luck'), T('فدا', 'No worries'), T('تسلم', 'Thanks'), T('كفو! 👏', 'Bravo! 👏'), T('ابشر بالعوض', 'Better luck next'), T('طرا 😏', 'Fluke 😏'), T('سموحة 🙏', 'Sorry 🙏'), T('بسرعة ⏱', 'Hurry ⏱'), T('حرام عليك 😤', 'Have mercy 😤'), T('صحيح خوي 😂', 'Ha, of course 😂'), T('قهر والله 😤', 'So annoying 😤'), T('الأخ مفهي 😭', 'Asleep at the table 😭'), T('شريكي ذيب 🐺', 'My partner is a wolf 🐺'), T('كبوت! 🔥', 'Kaboot! 🔥')];
  let lastRx = 0;
  function listenRx() { if (!G.ref) return; const fly = s => { const v = s.val() || {}; if (!v.e || Date.now() - (v.t || 0) - off > 15000) return; if (v.e[0] === '@') return advMsg(s.key, v.e); const who = (G.P && G.P.seats || G.seats || []).find(x => x.u === s.key) || {}; float(v.e, who.n || ((G.aud || {})[s.key] || {}).n || ''); }; on(G.ref.child('rx'), 'child_added', fly); on(G.ref.child('rx'), 'child_changed', fly); on(G.ref.child('au'), 'value', s => { G.aud = s.val() || {}; const a = root.querySelector('.bl-aud'); if (a) a.innerHTML = audTxt(); const f = root.querySelector('.bl-fans'); if (f) f.innerHTML = fansHtml(); }); }
  const audTxt = () => { const a = Object.values((G && G.aud) || {}); return a.length ? `👀 ${B('المتابعون', 'Watching')} <b>${a.length}</b>` : ''; };
  // the audience sit on chairs around the table, behind and beside the players
  const fansHtml = () => { const a = Object.values((G && G.aud) || {}), N = 8, slots = ['t1', 't2', 'r1', 'l1', 'r2', 'l2', 't3', 't4'];
    return a.slice(0, N).map((x, i) => `<span class="bl-fan ${slots[i]}" title="${esc(x.n || '')}"><i>${esc((x.n || '؟').trim().charAt(0))}</i><u></u></span>`).join('') + (a.length > N ? `<span class="bl-fan more">+${a.length - N}</span>` : ''); };
  function float(e, who) { const d = document.createElement('div'), big = [...e].length <= 2; d.className = 'bl-fly' + (big ? ' emo' : ' say'); d.innerHTML = big ? `${esc(e)}${who ? `<small dir="auto">${esc(who)}</small>` : ''}` : `<b dir="auto">${esc(who)}</b> <span dir="auto">${esc(e)}</span>`; d.style.left = (15 + Math.random() * 70) + 'vw'; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  /* ---------- the advisor (مستشار): someone watching advises one player, in the open ----------
     Requests and cues travel as reactions that start with '@'. The player accepts; the host then
     copies that player's hand to the advisor. Everyone sees each cue; for «العب هذي» only the
     player sees which card. */
  const CUES = () => [T('انتبه', 'Careful'), T('شكله فوت', 'Looks like a void'), T('فوت', 'Skip it'), T('شد', 'Go strong'), T('اشترِ', 'Buy'), T('خلك حذر', 'Play safe'), T('لازم تتهور', 'Take a risk'), T('دبّل', 'Double')];
  const rxRaw = e => G && G.ref && uid && G.ref.child('rx/' + uid).set({ e, t: TS() }).catch(() => {});
  const advOf = u => { const A = (G.P || {}).adv || G.adv || {}; const k = Object.keys(A).find(x => A[x] && A[x].u === u); return k == null ? null : { s: +k.slice(1), ...A[k] }; };   // keys are 's0'…'s3'
  function advMsg(from, e) {
    const [k, a] = [e.slice(1, 2), e.slice(3)], seats = (G.P && G.P.seats) || G.seats || [], aud = G.aud || {};
    if (k === 'a') {                                  // a request to advise seat a
      const seat = +a, mine = G.mode === 'player' ? G.mine : G.mode === 'host' && G.me ? G.seats.findIndex(x => x.u === G.me) : -1; if (mine !== seat || document.querySelector('.bl-ask')) return;
      const d = document.createElement('div'); d.className = 'bl-ask';
      d.innerHTML = `<p>🧠 <b>${esc((aud[from] || {}).n || T('متابع', 'A fan'))}</b> ${B('يبي يكون مستشارك (يرى أوراقك ويوجّهك علنًا).', 'wants to advise you (sees your cards, cues in the open).')}</p><div class="bl-row"><button type="button" class="btn solid" data-y>${B('قبول', 'Accept')}</button><button type="button" class="btn ghost" data-n>${B('لا', 'No')}</button></div>`;
      document.body.appendChild(d); d.querySelector('[data-y]').onclick = () => { rxRaw('@o:' + from.slice(0, 8)); d.remove(); }; d.querySelector('[data-n]').onclick = () => { rxRaw('@x:' + from.slice(0, 8)); d.remove(); };   // the answer names the advisor by the start of their id (messages are short)
      return;
    }
    if (k === 'o' || k === 'x') {                      // the player's answer
      const advU = Object.keys(aud).concat(Object.keys(G.req || {})).find(u => u.slice(0, 8) === a) || ''; if (uid && uid.slice(0, 8) === a) toast(k === 'o' ? B('قَبِل! صرت مستشاره.', 'Accepted! You are the advisor.') : B('اعتذر عن الاستشارة.', 'The player declined.'), k !== 'o');
      if (k === 'o' && G.mode === 'host') { const seat = G.seats.findIndex(x => x.u === from); if (seat >= 0 && advU) { G.adv = G.adv || {}; Object.keys(G.adv).forEach(x => { if (G.adv[x].u === advU) delete G.adv[x]; }); G.adv['s' + seat] = { u: advU, n: ((G.aud || {})[advU] || {}).n || T('مستشار', 'Advisor') }; publish(); show(); } }
      return;
    }
    const ad = advOf(from); if (!ad) return;          // a cue, from someone who really advises
    const pn = (seats[ad.s] || {}).n || '';
    if (k === 'c') float(`🧠 ${CUES()[+a] || ''}`, `${ad.n} ← ${pn}`);
    if (k === 'p') { float(`🧠 ${T('العب هذي', 'Play this one')}`, `${ad.n} ← ${pn}`); if (G.mode === 'player' && G.mine === ad.s) { G.hint = { c: a, at: Date.now() }; buzz([20, 40, 20]); if (G.P) view(G.P, G.hand, G.mine, G.send); } }
  }
  // the advisor's panel, under the table, for someone watching
  function advPanel(P) {
    const me = advOf(uid), seats = P.seats || [];
    if (!me) { const can = seats.map((x, s) => ({ x, s })).filter(o => o.x.u && !o.x.bot);
      return can.length ? `<div class="bl-advp"><b>🧠 ${B('كن مستشارًا لـ', 'Advise')}</b>${can.map(o => `<button type="button" class="bl-b" data-adv="${o.s}">${esc(o.x.n)}</button>`).join('')}</div>` : ''; }
    const used = (G.advUsed && G.advUsed.n === P.n) ? G.advUsed.k : 0, left = Math.max(0, 3 - used), h = sortHand(G.advHand || [], P);
    return `<div class="bl-advp on"><b>🧠 ${B('مستشار', 'Advising')} ${esc((seats[me.s] || {}).n || '')}</b><small>${B(`باقي لك ${left} في هذه اليد`, `${left} left this hand`)}</small>
      <div class="bl-advh">${h.map(c => `<button type="button" data-hint="${c}"${left ? '' : ' disabled'}>${card(c, 'mini')}</button>`).join('')}</div>
      <div class="bl-advc">${CUES().map((t, i) => `<button type="button" data-cue="${i}"${left ? '' : ' disabled'}>${t}</button>`).join('')}</div></div>`;
  }
  function bindAdv(P) {
    root.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => { rxRaw('@a:' + b.dataset.adv); toast(B('أُرسل الطلب، انتظر موافقته.', 'Request sent; wait for the player.')); });
    const spend = () => { G.advUsed = G.advUsed && G.advUsed.n === P.n ? G.advUsed : { n: P.n, k: 0 }; G.advUsed.k++; };
    root.querySelectorAll('[data-cue]').forEach(b => b.onclick = () => { spend(); rxRaw('@c:' + b.dataset.cue); view(P, null, -1, null); });
    root.querySelectorAll('[data-hint]').forEach(b => b.onclick = () => { spend(); rxRaw('@p:' + b.dataset.hint); view(P, null, -1, null); });
    if (advOf(uid) && !G.advOn) { G.advOn = 1; on(db.ref('khh/' + G.pin + '/' + uid), 'value', s => { G.advHand = s.val() || []; if (G.P) view(G.P, null, -1, null); }); }
  }
  function sendRx(e) { if (Date.now() - lastRx < 1200 || !G || !G.ref || !uid) return; lastRx = Date.now(); G.ref.child('rx/' + uid).set({ e, t: TS() }).catch(() => {}); }

  /* ---------- the table ---------- */
  let sel = null, decl = true;
  // drag a card up to play it; flick it up fast to slam it on the table (once in a while, so it stays fun)
  const gest = { at: 0 };
  document.addEventListener('pointerdown', e => { const el = e.target.closest && e.target.closest('#bl .bl-hand .bl-c'); gest.c = el ? el.dataset.c : null; gest.y = e.clientY; gest.t = performance.now(); });
  document.addEventListener('pointerup', e => { if (!gest.c) return; const c = gest.c, dy = e.clientY - gest.y, dt = Math.max(1, performance.now() - gest.t); gest.c = null;
    if (dy > -45 || !view.play) return; gest.at = now();
    const slam = -dy / dt > .9 && now() - (gest.slam || 0) > 25000; if (slam) gest.slam = now();
    view.play(c, slam); });
  function show() {
    if (!G || !G.m) return;
    const mine = G.mode === 'local' ? 0 : G.mine;
    const P = Object.assign(BL.view(G.m, null), { seats: G.seats.map(x => ({ n: x.n, bot: !!x.bot })), dl: G.dl || 0, hold: G.hold || 0, tt: G.o.tt || 0, says: G.says || {}, sl: G.sl || '', tap: G.tap >= 0 ? G.tap : -1, adv: G.adv || {}, rules: G.m.rules, n: G.m.n });
    view(P, mine >= 0 ? G.m.H.hands[mine] : null, mine, (k, v, x) => act(mine, k, v, x));
  }
  // order the hand by suit (alternating colours) and rank
  function sortHand(h, P) {
    const tr = P.contract && P.contract.type === 'hokm' ? P.contract.trump : null, so = ['S', 'H', 'C', 'D'], ro = tr ? null : ['A', 'T', 'K', 'Q', 'J', '9', '8', '7'];
    const rank = c => (tr && c[1] === tr ? ['J', '9', 'A', 'T', 'K', 'Q', '8', '7'] : ['A', 'T', 'K', 'Q', 'J', '9', '8', '7']).indexOf(c[0]);
    return h.slice().sort((a, b) => (a[1] === tr ? -1 : b[1] === tr ? 1 : 0) || so.indexOf(a[1]) - so.indexOf(b[1]) || rank(a) - rank(b));
  }
  const KIND = () => ({ sira: T('سرا', 'Sira'), 50: T('خمسين', 'Fifty'), 100: T('مية', 'Hundred'), 400: T('أربعمية', 'Four hundred') });
  // what each player said in the bidding stays by their name; in play the buyer keeps «شاري …»
  function callTag(P, s) {
    const c = (P.calls || {})[s] || '', C = P.contract;
    if (P.phase === 'bid' || P.phase === 'double') { if (!c) return P.phase === 'bid' && P.first === s && P.round === 1 ? `<span class="bl-call first">${T('أول', 'First')}</span>` : ''; if (c.startsWith('x:')) return `<span class="bl-call dbl">${esc(DBLO()[c.slice(2)] || '')}</span>`;
      if (c === 'pass' || c === 'pass2') return `<span class="bl-call pass">${c === 'pass2' ? T('ولا', 'Pass') : T('بس', 'Pass')}</span>`;
      return `<span class="bl-call buy">${esc(c.startsWith('hokm:') ? T('حكم ثاني', 'Hokm, second') : bidTxt(c))}</span>`; }
    if (C && C.seat === s && (P.phase === 'play' || P.phase === 'done')) return `<span class="bl-call buy">${T('شاري', 'Bought')} ${esc(contractTxt(C))}</span>`;
    return '';
  }
  const projTag = (P, s) => { const k = P.phase === 'play' && P.declK && P.declK[s]; return k ? `<span class="bl-call proj">${k.split(',').map(x => KIND()[x]).join(' + ')}</span>` : ''; };
  // in the second trick the winning side's projects are shown by each player who has them
  const projFan = (P, s) => { if (!(P.phase === 'play' && P.nt === 1 && P.shown && P.shown.list)) return ''; const l = P.shown.list.filter(p => p.s === s); return l.length ? `<div class="bl-pfan">${l.map(p => p.cards.map(c => card(c, 'mini')).join('')).join('<i></i>')}</div>` : ''; };
  function view(P, hand, me, send) {
    const seats = P.seats || [], base = me >= 0 ? me : 0, at = k => (base + k) % 4;     // 0 bottom, 1 right, 2 top, 3 left (play goes anticlockwise)
    const myT = me >= 0 ? team(me) : 0, C = P.contract;
    const says = P.says || {}, fresh = s => says[s] && !says[s].q && Date.now() - says[s].at < 3500 ? says[s].t : '';
    const holding = P.hold && now() < P.hold, dealing = holding && P.phase === 'bid', dealAnim = dealing && view.dealt !== P.n; if (dealing) view.dealt = P.n;                      // a finished trick stays on the table for a moment
    const turnMine = me >= 0 && P.turn === me && ['bid', 'double', 'play'].includes(P.phase) && !dealing;
    hand = hand ? sortHand(hand, P) : null;
    const tn = k => me >= 0 ? (k === myT ? T('لنا', 'Us') : T('لهم', 'Them')) : seats.filter((x, s) => team(s) === k).map(x => x.n).join('، ');
    const dl = P.dl && P.phase !== 'done' ? Math.max(0, (P.dl - now()) / 1000) : 0, tt = P.tt || 0;
    const seatBox = k => { const s = at(k), x = seats[s] || {}, cnt = (P.counts || [])[s] || 0, on = P.turn === s && ['bid', 'double', 'play'].includes(P.phase) && !holding, nb = Math.min(cnt, 8);
      const bar = on && dl && tt ? ` style="--p:${Math.round(100 * dl / tt)}%"` : '';
      return `<div class="bl-seat p${k}${on ? ' turn' : ''}${team(s) === myT ? ' us' : ' them'}"><div class="bl-body">${k % 2 ? profile(s) : person(s)}${on ? `<span class="bl-clock"${dl && tt ? ` style="--p:${Math.round(100 * dl / tt)}%"` : ''}>${dl ? Math.ceil(dl) : '⏳'}</span>` : ''}
        ${nb ? `<span class="bl-held">${Array.from({ length: nb }, (_, i) => `<i style="--r:${((i - (nb - 1) / 2) * 9).toFixed(1)}deg"></i>`).join('')}<span class="bl-fist l"></span><span class="bl-fist r"></span></span>` : ''}</div>
        <div class="bl-plate"${bar}><b dir="auto">${esc(x.n || '')}${x.bot ? ' 🤖' : ''}</b>${on && dl ? `<em>${Math.ceil(dl)}</em>` : ''}</div>
        <div class="bl-tags">${callTag(P, s)}${projTag(P, s)}${P.adv && P.adv['s' + s] ? `<span class="bl-call adv">🧠 ${esc(P.adv['s' + s].n)}</span>` : ''}${P.dealer === s ? `<small class="bl-dealer">${B('الموزّع', 'Dealer')}</small>` : ''}</div>${projFan(P, s)}${fresh(s) ? `<span class="bl-say">${esc(fresh(s))}</span>` : ''}</div>`; };
    // the trick on the table; a finished one stays, with its winner marked
    const showLast = holding && !(P.trick || []).length && P.last, tk = showLast ? P.last.cards : (P.trick || []);
    const key = P.n + ':' + P.nt + ':' + tk.length + (showLast ? 'h' : ''), isNew = view.k !== key; view.k = key;
    const played = P.phase === 'play' || P.phase === 'done' ? (P.nt || 0) * 4 + (P.trick || []).length : 0, pc = P.n + ':' + played;
    if (view.pc !== pc) { const prev = (view.pc || '').split(':'); view.pc = pc; if (+prev[0] === P.n && +prev[1] === played - 1) { const lc = (P.trick || []).length ? P.trick[P.trick.length - 1].c : P.last && P.last.cards[3].c; if (P.sl && P.sl === lc) { SND.slam(); buzz([30, 30, 60]); view.slam = lc; } else SND.card(); } }
    if (P.n !== view.hn && P.phase === 'bid') { view.hn = P.n; SND.deal(); }
    view.said = view.said || {}; Object.keys(says).forEach(s => { const v = says[s]; if (v && Date.now() - v.at < 3000 && view.said[s] !== v.at) { view.said[s] = v.at; SND.speak(v.t); } });
    const trick = tk.map((x, i) => `<div class="bl-tp p${(x.s - base + 4) % 4}${i === tk.length - 1 && isNew ? (view.slam === x.c ? ' new slam' : showLast ? '' : ' new') : ''}${showLast && x.s === P.last.win ? ' win' : ''}">${card(x.c)}</div>`).join('');
    const center = P.phase === 'bid' ? `<div class="bl-exp${dealAnim ? ' flip' : ''}">${P.exp ? card(P.exp, 'big') : ''}<small>${P.round === 2 ? B('الدور الثاني', 'Second round') : B('الدور الأول', 'First round')}</small></div>` : `<div class="bl-trick">${trick}</div>`;
    const dbl = P.dbl && P.dbl.level > 1 ? ` · ${['', '', T('دبل', 'Double'), T('ثري', 'Triple'), T('فور', 'Four')][P.dbl.level]}${P.dbl.gahwa ? ' ☕' : ''}${P.dbl.locked ? ' 🔒' : ''}` : '';
    const top = `<div class="bl-top"><div class="bl-sc us"><small>${esc(tn(myT))}</small><b>${P.scores[myT]}</b></div>
      <div class="bl-con">${C ? `<b>${contractTxt(C)}${dbl}</b><small>${esc((seats[C.seat] || {}).n || '')}${P.won ? ` · ${B('الأكلات', 'Tricks')} ${P.won[myT]}–${P.won[1 - myT]}` : ''}</small>` : `<b>${B('الشراء', 'Bidding')}</b><small>${B('إلى ١٥٢', 'to 152')}</small>`}</div>
      <div class="bl-sc them"><small>${esc(tn(1 - myT))}</small><b>${P.scores[1 - myT]}</b></div></div>`;
    // the controls for whoever's turn it is on this device
    let ctl = '';
    if (turnMine && P.phase === 'bid') { const opts = G.mode !== 'player' ? BL.bidOptions(G.m, me) : bidOptsRemote(P, me, hand); const lab = o => o === 'pass' ? (P.round === 2 ? T('ولا', 'Pass') : T('بس', 'Pass')) : o === 'sun' && P.ask ? T('قبلك', 'Before you') : bidTxt(o); const hs = opts.filter(o => o.startsWith('hokm:')), rest = opts.filter(o => !o.startsWith('hokm:'));
      ctl = `<div class="bl-ctl">${rest.map(o => `<button type="button" class="bl-b${o === 'pass' ? ' pass' : ''}" data-bid="${o}">${lab(o)}</button>`).join('')}${hs.length ? `<button type="button" class="bl-b" data-two>${T('حكم ثاني', 'Hokm, second')}</button>` : ''}</div>${hs.length ? `<div class="bl-ctl bl-suits" hidden>${hs.map(o => `<button type="button" class="bl-b suit s${o.slice(5)}" data-bid="${o}">${SUIT[o.slice(5)]} ${SUITN[o.slice(5)]}</button>`).join('')}</div>` : ''}`; }
    else if (turnMine && P.phase === 'double') { const opts = G.mode !== 'player' ? BL.doubleOptions(G.m, me) : dblOptsRemote(P); ctl = `<div class="bl-ctl">${opts.map(o => `<button type="button" class="bl-b${o === 'pass' ? ' pass' : ''}" data-dbl="${o}">${DBLO()[o]}</button>`).join('')}</div>`; }
    const pr = me >= 0 && P.phase === 'play' && P.nt === 0 && hand ? BL.projectsIn(hand, { contract: C }) : [];
    const help = P.phase === 'play' && turnMine && (P.rules || {}).strict && G.mode !== 'player' ? BL.legal(G.m, me) : null;
    const n = hand ? hand.length : 0;
    const dk = (P.dealer - base + 4) % 4, from = [['0px', '40vh'], ['45vw', '-25vh'], ['0px', '-55vh'], ['-45vw', '-25vh']][dk];
    const handHtml = hand ? `<div class="bl-hand${turnMine && P.phase === 'play' && !holding ? ' go' : ''}${dealAnim ? ' deal' : ''}" style="--fx:${from[0]};--fy:${from[1]}" dir="ltr" style="--n:${n}">${hand.map((c, i) => `<div class="bl-hc" style="--d:${(i * .14 + (i >= 5 ? .5 : 0)).toFixed(2)}s;--r:${((i - (n - 1) / 2) * 1.6).toFixed(1)}deg;--y:${(((i - (n - 1) / 2) ** 2) * 1.3).toFixed(1)}px">${card(c, (sel === c ? 'sel' : '') + (help && !help.includes(c) ? ' no' : '') + (G && G.hint && G.hint.c === c && Date.now() - G.hint.at < 15000 ? ' hint' : ''))}</div>`).join('')}</div>` : '';
    const shown = false ? `<div class="bl-shown">${esc(tn(P.shown.team))}: ${P.shown.list.map(p => `${KIND()[p.kind]} ${p.cards.map(c => card(c, 'mini')).join('')}`).join(' · ')}</div>` : '';
    const iWon = turnMine && P.phase === 'play' && !(P.trick || []).length && P.last && P.last.win === me;
    const tapMe = holding && P.tap === me && me >= 0;
    const meBox = me >= 0 ? `<div class="bl-mine${turnMine && !holding ? ' turn' : ''}">${tapMe ? `<button type="button" class="bl-tap" data-take><em>${Math.ceil((P.hold - now()) / 1000)}</em> ${B('اضغط في أي مكان للأكلة', 'Tap anywhere to take the trick')}</button>` : ''}${callTag(P, me)}${projTag(P, me)}${projFan(P, me)}${turnMine && !holding ? `<span class="bl-clock me"${dl && tt ? ` style="--p:${Math.round(100 * dl / tt)}%"` : ''}>${dl ? Math.ceil(dl) : '⏳'}</span><b>${P.phase === 'play' ? (iWon ? B('أكلتها — ابدأ أنت', 'You won it — lead') : B('دورك', 'Your turn')) : B('دورك', 'Your turn')}</b>` : ''}${fresh(me) ? `<span class="bl-say">${esc(fresh(me))}</span>` : ''}</div>` : '';
    const bar = me >= 0 ? `<div class="bl-bar">${!(P.rules || {}).strict ? `<button type="button" data-qaid${P.phase !== 'play' ? ' disabled' : ''}>⚖️ ${B('قيدها', 'Qaid')}</button>` : ''}
      <button type="button" data-sawa${turnMine && !holding && P.phase === 'play' && !(P.trick || []).length && (hand || []).length > 1 ? '' : ' disabled'}>🙌 ${B('سوا', 'Claim')}</button>
      <button type="button" data-proj class="${pr.length ? 'has' : ''}"${pr.length && turnMine ? '' : ' disabled'}>🃏 ${B('المشاريع', 'Projects')}${pr.length ? `<i>${decl ? '✓' : ''}</i>` : ''}</button>
      ${G && G.ref ? `<button type="button" data-say>😊 ${B('تفاعل', 'React')}</button>` : ''}<button type="button" data-snd>${SND.on ? '🔊' : '🔇'}</button><button type="button" data-info>📖</button></div>` : '';
    const first = !root.querySelector('.bl-table');
    root.innerHTML = `<div class="bl-table${me < 0 ? ' screen' : ''}${dealAnim ? ' dealing' : ''}"><button type="button" class="bl-exit" data-exit aria-label="${T('خروج', 'Leave')}">✕</button>${top}<div class="bl-felt"><div class="bl-room"><i class="bl-sofa"></i><i class="bl-dallah">${DALLAH}</i></div>${G && G.ref ? `<div class="bl-fans">${fansHtml()}</div>` : ''}<div class="bl-plane"><div class="bl-rug"></div>${showLast && P.last ? `<span class="bl-plus q${(P.last.win - base + 4) % 4}">+${P.lastPts || 0}</span>` : ''}${[0, 1, 2, 3].map(k => { const n = (P.wins || [])[at(k)] || 0; return n ? `<span class="bl-pile q${k}"><i></i><i></i><b>${n}</b></span>` : ''; }).join('')}<i class="bl-cup a">${CUP}</i><i class="bl-cup b">${CUP}</i>${center}</div>${[1, 2, 3].map(seatBox).join('')}${me < 0 ? seatBox(0) : ''}${shown}</div>
      ${meBox}${ctl}${handHtml}${bar}
      ${G && G.ref ? `<div class="bl-rxp" hidden>${EMO.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}${SAY().map(e => `<button type="button" class="ph" data-e="${esc(e)}">${esc(e)}</button>`).join('')}</div>` : ''}
      <div class="bl-info" hidden>${rules(true)}</div></div>`;
    // tap a card once to raise it, again to play it
    const playC = (c, slam) => {
      const leadTop = !(P.trick || []).length && C.type === 'hokm' && c[1] !== C.trump && c[0] !== 'A';
      const x = (pr.length && decl ? 1 : 0) | (leadTop ? 2 : 0) | (slam ? 4 : 0);
      sel = null; if (!send('p', c, x)) toast(B('لا يجوز لعب هذه الورقة الآن.', 'That card cannot be played now.'), 1); else buzz(15);
    };
    view.play = turnMine && P.phase === 'play' ? playC : null;
    root.querySelectorAll('.bl-hand .bl-c').forEach(el => el.onclick = () => {
      if (now() - (gest.at || 0) < 400) return; const c = el.dataset.c; if (!(turnMine && P.phase === 'play')) { sel = sel === c ? null : c; return view(P, hand, me, send); }
      if (sel !== c) { sel = c; return view(P, hand, me, send); }
      playC(c, false);
    });
    root.querySelectorAll('[data-bid]').forEach(b => b.onclick = () => send('b', b.dataset.bid));
    const two = root.querySelector('[data-two]'); if (two) two.onclick = () => { const x = root.querySelector('.bl-suits'); x.hidden = !x.hidden; };
    root.querySelectorAll('[data-dbl]').forEach(b => b.onclick = () => send('d', b.dataset.dbl));
    const q = root.querySelector('[data-qaid]'); if (q) q.onclick = () => { if (confirm(T('تنادي «قيد» على الخصم؟ إن لم تكن هناك مخالفة يُقيَّد عليك.', 'Call Qaid on the other side? If there was no breach, it counts against you.'))) send('q'); };
    const pj = root.querySelector('[data-proj]'); if (pj) pj.onclick = () => { decl = !decl; toast(decl ? B(`ستُعلن: ${pr.map(p => KIND()[p.kind]).join(' + ')}`, 'Will declare') : B('لن تُعلن مشاريعك', 'Projects not declared')); view(P, hand, me, send); };
    const sy = root.querySelector('[data-say]'); if (sy) { sy.onclick = () => { const p = root.querySelector('.bl-rxp'); p.hidden = !p.hidden; }; root.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { sendRx(b.dataset.e); root.querySelector('.bl-rxp').hidden = true; }); }
    const sw = root.querySelector('[data-sawa]'); if (sw) sw.onclick = () => { if (confirm(T('«سوا»: تأخذ كل الأكلات الباقية؟ إن أمكن للخصم أن يأكل منها شيئًا تُحسب عليك.', 'Claim all the remaining tricks? If the other side could take any, it counts against you.'))) send('w'); };
    if (tapMe) { const take = () => send('k'); root.querySelector('.bl-felt').onclick = take; root.querySelector('[data-take]').onclick = take; }
    const ex = root.querySelector('[data-exit]'); if (ex) ex.onclick = () => { if (confirm(T('تخرج من الطاولة؟ (تقدر ترجع لها من الصفحة الرئيسية)', 'Leave the table? (You can come back from the start page)'))) { stop(); home(); } };
    const sn = root.querySelector('[data-snd]'); if (sn) sn.onclick = () => { SND.on = !SND.on; sn.textContent = SND.on ? '🔊' : '🔇'; if (SND.on) SND.card(); };
    const inf = root.querySelector('[data-info]'); if (inf) inf.onclick = () => { const p = root.querySelector('.bl-info'); p.hidden = !p.hidden; };
    const tk2 = ['bid', 'double', 'play'].includes(P.phase) && !holding ? (P.turn - base + 4) % 4 : -1, felt = root.querySelector('.bl-felt');
    if (felt && tk2 >= 0) { const sp = document.createElement('i'); sp.className = 'bl-spot q' + (view.spot >= 0 ? view.spot : tk2); felt.appendChild(sp);
      if (view.spot !== tk2) { if (view.spot >= 0) SND.tick(); requestAnimationFrame(() => requestAnimationFrame(() => { sp.className = 'bl-spot q' + tk2; })); } }
    view.spot = tk2;
    if (G && G.mode === 'watch') { root.querySelector('.bl-table').insertAdjacentHTML('beforeend', advPanel(P)); bindAdv(P); }
    if (first) root.querySelector('.bl-table').scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (P.phase === 'done' && P.result && !holding) handOver(P, seats, myT, me);
    else if (P.phase !== 'done') document.querySelectorAll('.bl-over').forEach(x => x.remove());
    if (P.over >= 0 && !holding) matchOver(P, myT, me);
    clearTimeout(view.t);
    if (dl || holding || Object.values(says).some(v => Date.now() - v.at < 3600)) view.t = setTimeout(() => view(P, hand, me, send), dealing ? Math.max(120, P.hold - now() + 30) : holding ? Math.min(500, Math.max(120, P.hold - now() + 30)) : 500);
  }
  // a joined phone does not hold the rules state: it works out its own options from what it can see
  function bidOptsRemote(P, me, hand) {
    const o = ['pass'], b = P.bid, pos = (me - P.dealer + 3) % 4;
    if (P.round === 1) { if (!b) o.push('hokm'); if (!b || b.type !== 'sun') o.push('sun'); if (!b && pos >= 2) o.push('ashkal'); if ((P.rules || {}).kawesh && hand && hand.length === 5 && hand.every(c => '789'.includes(c[0]))) o.push('kawesh'); }
    else { if (!b && P.exp) ['S', 'H', 'D', 'C'].filter(x => x !== P.exp[1]).forEach(x => o.push('hokm:' + x)); o.push('sun'); }
    return o;
  }
  const dblOptsRemote = P => { const hk = P.contract.type === 'hokm', lv = P.dbl.level; return ['pass'].concat(lv === 1 ? (hk ? ['double:open', 'double:locked'] : ['double']) : lv === 2 ? ['triple'] : lv === 3 ? ['four:open', 'four:locked'] : ['gahwa']); };

  // the count of a hand, shown to everyone
  function handOver(P, seats, myT, me) {
    if (document.querySelector('.bl-over[data-n="' + P.n + '"]')) return;
    document.querySelectorAll('.bl-over').forEach(x => x.remove());
    const r = P.result, tn = k => me >= 0 ? (k === myT ? T('لنا', 'Us') : T('لهم', 'Them')) : seats.filter((x, s) => team(s) === k).map(x => x.n).join('، ');
    const d = document.createElement('div'); d.className = 'bl-over'; d.dataset.n = P.n;
    const rows = r.qaid && r.sawa ? `<p class="bl-big">🙌 ${B('سوا خاطئ', 'A wrong claim')}</p><p>${B(`ادّعى ${esc((seats[r.by] || {}).n)} أن الأكلات الباقية كلها لهم، وكان للخصم ما يأكل به، فحُسبت عليهم.`, 'The other side could still take a trick, so it counts against the claimers.')}</p>`
      : r.qaid ? `<p class="bl-big">⚖️ ${r.ok ? B('قيد صحيح', 'A right call') : B('قيد خاطئ', 'A wrong call')}</p><p>${r.ok ? B(`خالف ${esc((seats[r.breach.s] || {}).n)} بورقة ${card(r.breach.c, 'mini')} في الأكلة ${r.breach.trick + 1}.`, 'A breach was found.') : B('لم تكن هناك مخالفة من الخصم، فقُيّد على من نادى.', 'There was no breach, so it counts against the caller.')}</p>`
      : `<table class="bl-res"><tr><th></th><th>${esc(tn(0))}</th><th>${esc(tn(1))}</th></tr>
        <tr><td>${B('الأكلات', 'Tricks')}</td><td>${r.raw[0] - (r.ground === 0 ? 10 : 0)}</td><td>${r.raw[1] - (r.ground === 1 ? 10 : 0)}</td></tr>
        <tr><td>${B('الأرض', 'Last trick')}</td><td>${r.ground === 0 ? 10 : ''}</td><td>${r.ground === 1 ? 10 : ''}</td></tr>
        ${r.proj[0] + r.proj[1] ? `<tr><td>${B('المشاريع', 'Projects')}</td><td>${r.proj[0] || ''}</td><td>${r.proj[1] || ''}</td></tr>` : ''}
        ${r.bal[0] + r.bal[1] ? `<tr><td>${B('بلوت', 'Baloot')}</td><td>${r.bal[0] || ''}</td><td>${r.bal[1] || ''}</td></tr>` : ''}
        <tr><td>${B('الأبناط', 'Card points')}</td><td>${r.raw[0]}</td><td>${r.raw[1]}</td></tr>
        <tr class="sum"><td>${B('النتيجة', 'Score')}</td><td>+${r.add[0]}</td><td>+${r.add[1]}</td></tr></table>
        <p>${r.sawa !== undefined ? B('سوا ✓', 'Claimed ✓') : ''}${r.mult > 1 ? ` (${['', '', T('دبل', 'Double'), T('ثري', 'Triple'), T('فور', 'Four')][r.mult]})` : ''}</p>`;
    const buyer = P.contract ? team(P.contract.seat) : -1;
    d.innerHTML = `<div class="bl-obox">${!r.qaid && r.kaboot >= 0 && r.kaboot !== undefined ? `<p class="bl-kab">${B('كبوت', 'Kaboot')}</p>` : ''}<div class="bl-head"><span>${B('اللعبة', 'Game')}: <b>${contractTxt(P.contract)}</b></span><span>${B('المشتري أو المدبّل', 'Bought by')}: <b>${me >= 0 ? (buyer === myT ? T('فريقنا', 'Us') : T('فريقهم', 'Them')) : esc(tn(buyer))}</b></span>${!r.qaid ? `<span>${B('نتيجة الشراء', 'Result')}: <b class="${r.decWins || r.kaboot === buyer ? 'ok' : 'no'}">${r.decWins || r.kaboot === buyer ? T('ربحانة', 'Made') : T('خسرانة', 'Lost')}</b></span>` : ''}</div><h3>${B('النشرة', 'The count')}</h3>${rows}<p class="bl-tot">${esc(tn(0))} <b>${P.scores[0]}</b> · ${esc(tn(1))} <b>${P.scores[1]}</b></p>
      ${P.over < 0 && G && G.m ? `<button type="button" class="btn solid" data-next>${B('عودة', 'Back')}</button>` : P.over < 0 ? `<p class="bl-note">${B('اليد التالية بعد لحظات…', 'The next hand starts shortly…')}</p>` : ''}</div>`;
    document.body.appendChild(d);
    const nb = d.querySelector('[data-next]'); if (nb) nb.onclick = () => { d.remove(); if (G && G.m && G.m.H.phase === 'done') { BL.nextHand(G.m); drive(); } };
  }
  function matchOver(P, myT, me) {
    if (document.querySelector('.bl-win')) return;
    const w = P.over, mineWin = me >= 0 && w === myT, seats = P.seats || [];
    const d = document.createElement('div'); d.className = 'bl-win';
    d.innerHTML = `<div class="bl-conf">${Array.from({ length: 50 }, () => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--r:${Math.floor(Math.random() * 360)}deg"></i>`).join('')}</div>
      <div class="bl-winbox"><p class="bl-trophy">${me < 0 || mineWin ? '🏆' : '😤'}</p><h2>${me < 0 ? B(`فاز ${esc(seats.filter((x, s) => team(s) === w).map(x => x.n).join('، '))}`, 'Winners!') : mineWin ? B('ربحت القهوة!', 'You won!') : B('خسرت القهوة', 'They won this time')}</h2>
      <p>${P.scores[0]} – ${P.scores[1]}</p><div class="bl-row"><button type="button" class="btn solid" data-again>${B('قهوة جديدة', 'New match')}</button><button type="button" class="btn ghost" data-close>${B('إغلاق', 'Close')}</button></div></div>`;
    document.body.appendChild(d); buzz([100, 60, 160]);
    d.querySelector('[data-close]').onclick = () => d.remove();
    d.querySelector('[data-again]').onclick = () => { d.remove(); if (G && G.mode === 'local') local(G.o, G.seats[0].n); else if (G && G.mode === 'host') { G.m = BL.newMatch(houseRules(G.o)); drive(); } else home(); };
  }

  // a link with ?k=123456 opens the join screen
  const k = new URLSearchParams(location.search).get('k');
  if (k) joinCode(k.replace(/\D/g, '').slice(0, 6)); else home();
})();

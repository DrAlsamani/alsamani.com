/* alsamani.com — Dawwara: a team quiz that needs one device only, the host's.
   Groups take turns; each turn one group gets its own question. The group's leader says the answer,
   the host taps it, and right and fast scores more. A miss can be stolen by another group.
   For classrooms without devices, and for gatherings around one screen. */
window.Dawwara = (function () {
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LET = () => isAr() ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const NUM = n => isAr() ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n);
  const COL = ['#2a7fa8', '#b0533a', '#2f7d5b', '#c9822b', '#6b5aa6', '#b23a6b', '#1f8a8a', '#8a6d2a'];
  const NAMES = () => isAr() ? ['الصقور', 'النجوم', 'الفرسان', 'النخيل', 'الشهب', 'الرعد', 'الريم', 'السيوف'] : ['Falcons', 'Stars', 'Knights', 'Palms', 'Comets', 'Thunder', 'Gazelles', 'Swords'];
  const KINDS = ['mc', 'tf', 'num', 'word'];
  const SV = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    half: SV('<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/>'),
    time: SV('<circle cx="12" cy="13" r="7"/><path d="M12 10v3l2 2M9 3h6M12 6V3"/>'),
    swap: SV('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
    hand: SV('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-4.5L3 12.5a1.5 1.5 0 0 1 2.5-1.5L8 14"/>'),
    x: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
    print: SV('<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>')
  };
  let D = null, el = null, tick = null;

  // short sounds, made on the spot
  let ac = null;
  const tone = (f, d, type, v) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.value = v || .08; g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {} };
  const SND = { tick: () => tone(880, .05, 'square', .025), ok: () => { tone(660, .12); setTimeout(() => tone(990, .22), 120); }, no: () => tone(170, .35, 'sawtooth', .05), go: () => { tone(520, .1); setTimeout(() => tone(780, .16), 110); }, win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .24), i * 150)) };

  const cfgGet = () => { try { return Object.assign({ n: 4, per: 0, time: 0, steal: true, life: true, names: [], leads: [] }, JSON.parse(localStorage.getItem('dw.cfg') || '{}')); } catch (e) { return { n: 4, per: 0, time: 0, steal: true, life: true, names: [], leads: [] }; } };
  const cfgV2 = c => { if (!c.v2) { Object.assign(c, { v2: 1, wager: false, chn: false, life: false, r: null, ext: false }); } return c; };
  const cfgSet = c => { try { localStorage.setItem('dw.cfg', JSON.stringify(c)); } catch (e) {} };
  const usable = x => KINDS.includes(x.type) && (x.q || '').trim() && (['num', 'word'].includes(x.type) ? String(x.ans == null ? '' : x.ans).trim() !== '' : (x.opts || []).filter(o => String(o).trim()).length >= 2 && (x.ok || []).length);
  // the options without the empty ones, and the right ones mapped to the new places
  const clean = x => { if (['num', 'word'].includes(x.type)) return Object.assign({}, x); const keep = x.opts.map((o, j) => String(o).trim() ? j : -1).filter(j => j >= 0); return Object.assign({}, x, { opts: keep.map(j => x.opts[j]), ok: x.ok.map(j => keep.indexOf(j)).filter(j => j >= 0) }); };

  // keep the screen awake while a game runs, on the host's screen and on the phones
  let wl = null; const wake = async () => { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) {} };
  document.addEventListener('visibilitychange', () => { if (document.documentElement.classList.contains('dw-on') || document.documentElement.classList.contains('dw-phone')) wake(); });
  function shell(html, cls) {
    if (!el) { el = document.createElement('div'); el.className = 'dw'; el.setAttribute('role', 'dialog'); document.body.appendChild(el); document.documentElement.classList.add('dw-on'); document.addEventListener('keydown', keys); wake(); el.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.dw-board [data-tm]'); if (c && D && D.groups) chanceSheet(+c.dataset.tm); }); rcWatch(); }
    el.className = 'dw ' + (cls || ''); el.innerHTML = `<button type="button" class="dw-close" data-close title="${T('إنهاء', 'End')}">${IC.x}</button>${html}`;
    el.querySelector('[data-close]').onclick = () => { if (!D || !D.steps || D.done || confirm(T('تنهي دوّارة؟', 'End Dawwara?'))) close(); };
  }
  function close() { clearInterval(tick); const sp = document.getElementById('dwSgP'); if (sp) sp.remove(); ROOM.sg = []; if (el) el.remove(); el = null; D = null; document.documentElement.classList.remove('dw-on'); document.removeEventListener('keydown', keys); }
  // the host's keyboard: 1–6 to answer, space or enter for the main button
  function keys(e) {
    if (!el || /input|textarea|select/i.test((e.target || {}).tagName || '')) return;
    if (e.key === 'Escape') return el.querySelector('[data-close]').click();
    const k = '١٢٣٤٥٦'.indexOf(e.key) >= 0 ? '١٢٣٤٥٦'.indexOf(e.key) + 1 : +e.key;
    if (k >= 1 && k <= 6) { const b = el.querySelector(`[data-j="${k - 1}"]:not([disabled])`); if (b) { e.preventDefault(); b.click(); } return; }
    if (e.key === ' ' || e.key === 'Enter') { const b = el.querySelector('[data-main]:not([disabled])'); if (b) { e.preventDefault(); b.click(); } }
  }

  /* ---------- 1. setting up: the groups, their leaders, how many questions each ---------- */
  function start(quiz) {
    const qs = (quiz.qs || []).filter(usable).map(clean);
    D = { title: quiz.title || T('دوّارة', 'Dawwara'), all: qs, cfg: cfgV2(cfgGet()), ch: quiz.ch || [], chosen: null };
    if (quiz.tpl) { Object.assign(D.cfg, { tpl: quiz.tpl.kind, dur: quiz.tpl.dur, pack: quiz.tpl.pack || '', r: null }); } else D.cfg.tpl = null;
    // no questions at all still makes an evening of challenges
    setup();
  }
  function setup() {
    const c = D.cfg, n = Math.min(8, Math.max(2, c.n)), P = D.all.length, mc = D.all.filter(isMC).length;
    const catQ = D.all.filter(x => (x.cat || '').trim()).length, cats = new Set(D.all.map(x => (x.cat || '').trim()).filter(Boolean)).size;
    const W = () => (c.wager && P > 2 ? 1 : 0);
    if (c.dur == null) c.dur = 30;
    if (!c.r || c.rn !== n || c.rq !== P) { c.r = defRounds(n, P - W(), mc, 0); c.rn = n; c.rq = P; if (c.dur) c.r = fitTime(c, n, P - W(), mc, c.dur); if (c.tpl) applyTpl(c, n, P, mc, 0); D.chosen = null; }
    ['all', 'board'].forEach(k => { if (c.r[k] == null || !c.ext) c.r[k] = c.ext ? c.r[k] || 0 : 0; });
    if (!D.chosen) fillChal(c.r.chal);
    const R = ROUND(), max = { turn: Math.min(6, Math.floor((P - W()) / n)), buzz: Math.min(20, mc), chal: 10, all: Math.min(15, P), board: cats >= 2 ? Math.min(48, catQ) : 0 };
    const row = (k, unit, rule) => `<div class="dw-pr"><div><b>${k === 'board' ? T('لوحة الفئات', 'The categories board') : R[k][0]}</b><small>${rule}</small></div><div class="dw-step" data-k="${k}"><button type="button" data-d="-1" aria-label="${T('أقل', 'Fewer')}">−</button><span><b>${NUM(c.r[k])}</b><small>${unit}</small></span><button type="button" data-d="1" aria-label="${T('أكثر', 'More')}">+</button></div></div>`;
    const DUR = [[20, NUM(20) + T(' دقيقة', ' min')], [30, NUM(30) + T(' دقيقة', ' min')], [45, NUM(45) + T(' دقيقة', ' min')], [60, T('ساعة', '1 hour')], [90, T('ساعة ونصف', '1.5 hours')]];
    shell(`<div class="dw-set dw-set2"><header><b class="dw-logo">${T('دوّارة', 'Dawwara')}</b><h2 dir="auto">${esc(D.title)}</h2></header>
      <section><h3>${T('المجموعات', 'The groups')}</h3><div class="dw-seg">${[2, 3, 4, 5, 6, 7, 8].map(k => `<button type="button" data-n="${k}" aria-pressed="${k === n}"${k > Math.max(2, P) && k > 2 ? ' disabled' : ''}>${NUM(k)}</button>`).join('')}</div>
        <div class="dw-hrnames">${Array.from({ length: n }, (_, k) => `<label style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="18" dir="auto" value="${esc(c.names[k] || NAMES()[k])}" aria-label="${T('اسم المجموعة', 'Group name')}"></label>`).join('')}</div></section>
      <section><h3>${T('المدة', 'Length')}</h3><div class="dw-seg" data-dur>${DUR.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${c.dur === v}">${l}</button>`).join('')}</div></section>
      <section><h3>${T('مع كل فريق جوال؟', 'Does each team have a phone?')}</h3><div class="dw-seg" data-ph><button type="button" data-v="0" aria-pressed="${!c.ph}">${T('لا، أسجّل أنا الإجابات', 'No, I record the answers')}</button><button type="button" data-v="1" aria-pressed="${!!c.ph}">${T('نعم، يجيبون من جوالاتهم', 'Yes, they answer on their phones')}</button></div><div id="dwPh"></div></section>
      <section><h3>${T('خطة الأمسية', 'The evening')} <small id="dwEst"></small></h3><div class="dw-plan">
        ${max.turn ? row('turn', T('لكل مجموعة', 'per group'), T('لكل مجموعة سؤالها · ١٠٠ نقطة، والمنقول ٥٠', 'A question per group · 100, passed on 50')) : ''}
        ${max.buzz ? row('buzz', T('أسئلة', 'questions'), c.ph ? T('أول إجابة صحيحة من الجوالات · ١٠٠ نقطة', 'First right answer on the phones · 100') : T('أول يد ترتفع تجيب · ١٠٠ نقطة', 'First hand up answers · 100')) : ''}
        ${row('chal', T('تحديات', 'challenges'), T('حركة وإبداع وذكاء · الأول ١٠٠ والثاني ٥٠', 'Moving, creating, thinking · 100 and 50'))}
        ${c.ext && max.all ? row('all', T('أسئلة', 'questions'), T('الكل يجيب في وقت واحد · ١٠٠ لكل مجموعة تصيب', 'All answer at once · 100 each')) : ''}
        ${c.ext && max.board ? row('board', T('مربعات', 'tiles'), T('تختار المجموعة الفئة والقيمة', 'Pick a category and a value')) : ''}
        ${c.wager && P > 2 ? `<p class="dw-pnote">${T('ثم المراهنة الختامية', 'Then the final wager')}</p>` : ''}</div>
        <p class="dw-need" id="dwNeed"></p><p class="dw-sum" id="dwSum"></p></section>
      <details class="dw-adv"><summary>${T('إضافات', 'Extras')}<small>${T('اختيار التحديات، والمناسبة، ووقت السؤال، ووسائل المساعدة، والفرص، والمراهنة', 'Challenges, occasion, time, helps, chances, wager')}</small></summary>
        <div class="dw-row"><span>${T('المناسبة', 'The occasion')}<small>${T('تُختار التحديات المناسبة لها', 'Challenges to suit it')}</small></span><select data-pack>${PACK().map(([v, l]) => `<option value="${v}"${(c.pack || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="dw-row"><span>${T('وقت السؤال', 'Time per question')}</span><select data-time>${[[0, T('كما في المسابقة', 'As in the quiz')], [20, NUM(20) + T(' ثانية', ' s')], [30, NUM(30) + T(' ثانية', ' s')], [45, NUM(45) + T(' ثانية', ' s')], [60, T('دقيقة', '1 min')]].map(([v, l]) => `<option value="${v}"${c.time === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <label class="dw-ck"><input type="checkbox" data-steal${c.steal ? ' checked' : ''}> ${T('نقل السؤال: إذا أخطأت المجموعة في دورها، تجيب أول مجموعة ترفع يدها بنصف النقاط', 'Passing: after a miss on a turn, the first group to raise a hand answers for half')}</label>
        <label class="dw-ck"><input type="checkbox" data-life${c.life ? ' checked' : ''}> ${T('وسائل المساعدة، مرة لكل مجموعة: حذف خيارين، ووقت إضافي، وتغيير السؤال', 'Helps, once per group: remove two options, extra time, change the question')}</label>
        <label class="dw-ck"><input type="checkbox" data-chn${c.chn ? ' checked' : ''}> ${T('فرص الفرق، مرة لكل فريق: مضاعفة النقاط، وخصم ١٠٠ من الخصم، وتحويل السؤال إليه، واختيار سؤاله', 'Team chances, once each: double, deduct 100, pass the question, pick the rival’s question')}</label>
        <label class="dw-ck"><input type="checkbox" data-wager${c.wager ? ' checked' : ''}> ${T('المراهنة الختامية: سؤال أخير تراهن فيه كل مجموعة على جزء من نقاطها', 'The final wager: one last question to stake points on')}</label>
        <label class="dw-ck"><input type="checkbox" data-ext${c.ext ? ' checked' : ''}> ${T('جولات أخرى: سؤال للجميع، ولوحة الفئات', 'More rounds: everyone answers, the categories board')}</label>
        <div class="dw-chbox" id="dwCh"></div>
      </details>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ دوّارة', 'Start Dawwara')}</button><button type="button" class="dw-btn ghost" data-cards>${IC.print}${T('اطبع بطاقات المجموعات', 'Print group cards')}</button></div></div>`, 'dw-setup');
    const read = () => { c.names = [...el.querySelectorAll('[data-name]')].map(i => i.value.trim()); c.pack = el.querySelector('[data-pack]').value; c.time = +el.querySelector('[data-time]').value; c.steal = el.querySelector('[data-steal]').checked; c.life = el.querySelector('[data-life]').checked; c.chn = el.querySelector('[data-chn]').checked; c.wager = el.querySelector('[data-wager]').checked; c.ext = el.querySelector('[data-ext]').checked; cfgSet(c); };
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.n; c.r = null; cfgSet(c); setup(); });
    el.querySelectorAll('[data-dur] [data-v]').forEach(b => b.onclick = () => { read(); c.dur = +b.dataset.v; c.r = fitTime(c, n, P - W(), mc, c.dur); fillChal(c.r.chal); cfgSet(c); setup(); });
    el.querySelectorAll('.dw-step').forEach(st => st.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { read(); const k = st.dataset.k; c.r[k] = Math.max(0, Math.min(max[k], (c.r[k] || 0) + +b.dataset.d)); c.dur = 0; if (k === 'chal') fillChal(c.r.chal); cfgSet(c); setup(); }));
    const chRe = () => { const b = el.querySelector('#dwCh'); b.innerHTML = chalBox(); chalBind(() => { c.r.chal = Math.min(10, D.chosen.length); cfgSet(c); setup(); }); };
    const need = () => {
      const q = c.r.turn * n + c.r.buzz + (c.r.all || 0) + (c.r.board || 0) + W(), e = el.querySelector('#dwNeed'), st = el.querySelector('[data-main]');
      el.querySelector('#dwEst').textContent = T(`· حوالي ${NUM(estimate(c.r, n))} دقيقة`, `· about ${estimate(c.r, n)} minutes`);
      const mats = [...new Set((D.chosen || []).map(byKey).filter(Boolean).map(x => (x.mat || '').trim()).filter(Boolean))];
      el.querySelector('#dwSum').innerHTML = mats.length ? `<b>${T('جهّز', 'Prepare')}:</b> ${mats.map(esc).join(T('، ', ', '))}` : '';
      e.textContent = q > P ? T(`تحتاج الخطة ${NUM(q)} سؤالًا، والمتاح ${NUM(P)}. قلّل الأسئلة.`, `The plan needs ${q} questions; ${P} are available.`) : '';
      e.classList.toggle('bad', q > P); st.disabled = q > P || !(q + c.r.chal);
    };
    ['[data-pack]'].forEach(k => el.querySelector(k).onchange = () => { read(); D.chosen = []; fillChal(c.r.chal); chRe(); need(); });
    ['[data-wager]', '[data-ext]'].forEach(k => el.querySelector(k).onchange = () => { read(); c.r = fitTime(c, n, P - W(), mc, c.dur || 30); setup(); });
    ['[data-time]', '[data-steal]', '[data-life]', '[data-chn]'].forEach(k => el.querySelector(k).onchange = read);
    chRe(); need();
    el.querySelector('[data-cards]').onclick = () => { read(); cards(); };
    el.querySelectorAll('[data-ph] [data-v]').forEach(b => b.onclick = () => { read(); c.ph = b.dataset.v === '1'; cfgSet(c); setup(); });
    if (c.ph || ROOM.ref) phonesBox();
    el.querySelectorAll('[data-name]').forEach(i => i.addEventListener('input', () => { read(); leadPaint(); pub(); }));
    el.querySelector('[data-main]').onclick = () => { read(); begin(); };
  }
  // the groups and the deal: questions sorted by kind and dealt in turn, so each group gets a like mix; the rest wait for a swap
  function begin() {
    const c = D.cfg, n = c.n;
    D.groups = Array.from({ length: n }, (_, k) => ({ name: c.names[k] || NAMES()[k], lead: c.leads[k] || '', col: COL[k], score: 0, right: 0, steals: 0, chal: 0, life: { half: 1, time: 1, swap: 1 }, chances: c.chn !== false ? 'dxvk' : '', dbl: false }));
    program(); D.t = 0; D.done = false; SND.go(); run();
  }
  const board = cur => `<div class="dw-board">${D.groups.map((g, k) => `<div class="${k === cur ? 'on' : ''}" style="--c:${g.col}" data-tm="${k}"${D.cfg.chn !== false ? ` title="${T('فرص الفريق', 'The team’s chances')}"` : ''}><span dir="auto">${esc(g.name)}</span><b>${NUM(g.score)}</b>${g.dbl ? '<em class="dw-x2">×٢</em>' : ''}${D.cfg.chn !== false && g.chances ? `<i class="dw-cn">${'•'.repeat(g.chances.length)}</i>` : ''}</div>`).join('')}${ROOM.pin ? `<div class="dw-code" title="${T('رمز جوالات القادة', 'Leaders’ code')}" dir="ltr">${ROOM.pin}</div>` : ''}</div>`;

  /* ---------- 2. a group's turn ---------- */
  function intro(tn) {
    const g = D.groups[tn.g]; D.cur = { kind: 'intro', team: tn.g, s: tn }; pub({ ph: 'intro', team: tn.g, i: D.t });
    shell(`${board(tn.g)}<div class="dw-mid dw-turn" style="--c:${g.col}"><p class="dw-sub">${ROUND().turn[0]}</p><h2>${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span></h2>${g.lead ? `<p class="dw-lead">${T('القائد', 'Leader')}: <b dir="auto">${esc(g.lead)}</b></p>` : `<p class="dw-lead">${T('اتفقوا على من يقول الإجابة', 'Agree who will say the answer')}</p>`}
      <button type="button" class="dw-btn" data-main>${T('اعرض السؤال', 'Show the question')}</button></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => ask();
  }
  function ask() {
    const tn = D.steps[D.t], g = D.groups[tn.g], x = tn.x, dur = D.cfg.time || x.time || (x.type === 'tf' ? 15 : 30);
    const st = D.q = { tn, g, x, dur, left: dur, t0: Date.now(), hide: [], locked: false, stealer: null, tried: [], val: tn.val || 0 };
    D.cur = { kind: 'q' }; st.onAns = (k, j) => { const a = st.stealer || st.g; if (tIdx(a) === k && isMC(x) && !(st.locked && !st.stealer)) { const b = el.querySelector(`[data-j="${j}"]:not([disabled])`); if (b) pick(j); } };
    pub({ ph: 'turn', team: tn.g, n: isMC(x) ? x.opts.length : 0, tf: x.type === 'tf' ? 1 : 0, text: isMC(x) ? 0 : 1, i: D.t });
    const text = ['num', 'word'].includes(x.type);
    shell(`${board(tn.g)}<div class="dw-q" style="--c:${g.col}"><div class="dw-qh"><span class="dw-who" dir="auto">${esc(g.name)}${tn.val ? ` · ${esc(tn.cat)} ${NUM(tn.val)}` : g.lead ? ` · ${esc(g.lead)}` : ''}</span><div class="dw-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="44" id="dwArc"/></svg><b id="dwT">${NUM(dur)}</b></div></div>
      <h2 class="dw-qt" dir="auto">${esc(x.q)}</h2>${x.img ? `<img class="dw-img" src="${x.img}" alt="">` : ''}
      ${text ? `<div class="dw-say"><p>${T('القائد يقول الإجابة، ثم:', 'The leader says the answer, then:')}</p><button type="button" class="dw-btn" data-main data-show>${T('اكشف الإجابة', 'Reveal the answer')}</button></div>`
        : `<div class="dw-opts n${x.opts.length}">${x.opts.map((o, j) => `<button type="button" data-j="${j}" style="--o:var(--dwo${j})"><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></button>`).join('')}</div>`}
      <div class="dw-foot" id="dwFoot">${D.cfg.life ? helps(st) : ''}</div></div>`, 'dw-ask');
    bindQ();
    const arc = el.querySelector('#dwArc'), C = 2 * Math.PI * 44; arc.style.strokeDasharray = C;
    clearInterval(tick); let last = -1;
    tick = setInterval(() => {
      if (!D || D.q !== st || st.locked) return clearInterval(tick);
      st.left = Math.max(0, st.dur - (Date.now() - st.t0) / 1000); const s = Math.ceil(st.left), t = el.querySelector('#dwT');
      if (t) t.textContent = NUM(s); arc.style.strokeDashoffset = C * (1 - st.left / st.dur);
      if (s !== last && s <= 5 && s > 0) SND.tick(); last = s;
      if (st.left <= 0) { clearInterval(tick); timeUp(); }
    }, 100);
    SND.go();
  }
  const helps = st => { const L = st.g.life, x = st.x; return `<div class="dw-helps">${[
    ['half', IC.half, T('حذف خيارين', 'Remove two'), L.half && x.type === 'mc' && x.opts.length - x.ok.length >= 2],
    ['time', IC.time, T('+١٥ ثانية', '+15 s'), L.time],
    ['swap', IC.swap, T('تبديل السؤال', 'Swap question'), L.swap && D.spare.some(y => y.type === x.type || !['num', 'word'].includes(y.type) === !['num', 'word'].includes(x.type))]
  ].map(([k, ic, l, ok]) => `<button type="button" data-help="${k}"${ok ? '' : ' disabled'}>${ic}<span>${l}</span></button>`).join('')}</div>`; };
  function bindQ() {
    const st = D.q;
    el.querySelectorAll('[data-j]').forEach(b => { if (st.hide.includes(+b.dataset.j)) { b.classList.add('gone'); b.disabled = true; } b.onclick = () => pick(+b.dataset.j); });
    const sh = el.querySelector('[data-show]'); if (sh) sh.onclick = showText;
    el.querySelectorAll('[data-help]').forEach(b => b.onclick = () => help(b.dataset.help));
  }
  function help(k) {
    const st = D.q, L = st.g.life; if (st.locked || !L[k]) return; L[k] = 0;
    if (k === 'half') { const wrong = st.x.opts.map((_, j) => j).filter(j => !st.x.ok.includes(j)).sort(() => Math.random() - .5).slice(0, 2); st.hide = wrong; bindQ(); }
    if (k === 'time') { st.dur += 15; }
    if (k === 'swap') { const same = D.spare.findIndex(y => y.type === st.x.type), j = same >= 0 ? same : D.spare.findIndex(y => ['num', 'word'].includes(y.type) === ['num', 'word'].includes(st.x.type)); if (j < 0) return; const nx = D.spare.splice(j, 1)[0]; D.spare.push(st.x); st.tn.x = nx; clearInterval(tick); return ask(); }
    const f = el.querySelector('#dwFoot'); if (f) { f.innerHTML = helps(st); f.querySelectorAll('[data-help]').forEach(b => b.onclick = () => help(b.dataset.help)); }
    SND.go();
  }
  // points: 100 for a right answer, up to 50 more for speed; a steal is worth half, without the speed
  const worth = () => 100;
  function pick(j) {
    const st = D.q; if (!st || (st.locked && !st.stealer)) return; if (st.tried.includes(j)) return;
    const right = st.x.ok.includes(j); st.tried.push(j);
    const b = el.querySelector(`[data-j="${j}"]`); if (b) { b.classList.add(right ? 'ok' : 'no'); b.disabled = true; }
    settle(right);
  }
  function showText() {
    const st = D.q; if (!st) return; st.locked = true; clearInterval(tick);
    const box = el.querySelector('.dw-say'); box.innerHTML = `<p class="dw-ans">${T('الإجابة', 'The answer')}: <b dir="auto">${esc(st.x.ans)}${st.x.unit ? ' ' + esc(st.x.unit) : ''}</b></p><p>${st.stealer ? T(`هل أصابت ${esc(st.stealer.name)}؟`, `Did ${esc(st.stealer.name)} get it?`) : T('هل أصابوا؟', 'Did they get it?')}</p><div class="dw-yn"><button type="button" class="dw-btn ok" data-y>✓ ${T('أصابوا', 'Right')}</button><button type="button" class="dw-btn no" data-n>✗ ${T('أخطأوا', 'Wrong')}</button></div>`;
    box.querySelector('[data-y]').onclick = () => settle(true); box.querySelector('[data-n]').onclick = () => settle(false);
  }
  function settle(right) {
    const st = D.q; clearInterval(tick);
    // a passed question: right, the other team takes half; wrong, the team that passed it does
    if (st.pass) { st.locked = true; const w = right ? st.stealer : st.pass, p = award(w, Math.round((st.val || 100) / 2)); right ? SND.ok() : SND.no(); return finish(st, true, p, w); }
    const who = st.stealer || st.g; let pts = right ? (st.stealer ? Math.round((st.val || 100) / 2) : (st.val || worth(st))) : 0;
    st.locked = true;
    if (right) { pts = award(who, pts); if (st.stealer) who.steals++; else who.right++; SND.ok(); }
    else SND.no();
    // a miss: the others may steal, once
    if (!right && !st.stealer && D.cfg.steal && D.groups.length > 1 && (['num', 'word'].includes(st.x.type) || st.tried.length < st.x.opts.length - st.hide.length)) return stealAsk(st);
    finish(st, right, pts, who);
  }
  function timeUp() {
    const st = D.q; st.locked = true; SND.no();
    if (D.cfg.steal && D.groups.length > 1) return stealAsk(st, true);
    finish(st, false, 0, st.g);
  }
  function stealAsk(st, late) {
    const f = el.querySelector('#dwFoot');
    f.innerHTML = `<div class="dw-steal"><p>${IC.hand}<b>${late ? T('انتهى الوقت!', 'Time is up!') : T('خطأ!', 'Wrong!')}</b> ${T('فرصة سرقة: أي مجموعة رفعت يدها أولًا؟', 'A chance to steal: which group raised a hand first?')}</p><div>${D.groups.map((g, k) => g === st.g ? '' : `<button type="button" data-st="${k}" style="--c:${g.col}" dir="auto">${esc(g.name)}</button>`).join('')}<button type="button" class="dw-none" data-st="-1">${T('لا أحد', 'Nobody')}</button></div></div>`;
    f.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
      const k = +b.dataset.st; if (k < 0) return finish(st, false, 0, st.g);
      st.stealer = D.groups[k]; st.locked = true; pub({ ph: 'turn', team: k, n: isMC(st.x) ? st.x.opts.length : 0, tf: st.x.type === 'tf' ? 1 : 0, text: isMC(st.x) ? 0 : 1, i: D.t, st: 1 });
      const box = el.querySelector('.dw-q'); box.style.setProperty('--c', st.stealer.col);
      el.querySelector('.dw-who').textContent = T('سرقة: ', 'Steal: ') + st.stealer.name;
      f.innerHTML = `<p class="dw-hint">${['num', 'word'].includes(st.x.type) ? T('تقول المجموعة إجابتها، ثم اكشفها.', 'The group says its answer; then reveal it.') : T('تقول المجموعة إجابتها، فاضغطها.', 'The group says its answer; tap it.')}</p>`;
      if (['num', 'word'].includes(st.x.type)) { const s = el.querySelector('.dw-say'); s.innerHTML = `<button type="button" class="dw-btn" data-main data-show>${T('اكشف الإجابة', 'Reveal the answer')}</button>`; s.querySelector('[data-show]').onclick = showText; }
    });
  }
  function finish(st, right, pts, who) {
    el.querySelectorAll('[data-j]').forEach(b => { b.disabled = true; if (st.x.ok && st.x.ok.includes(+b.dataset.j)) b.classList.add('ok'); });
    if (['num', 'word'].includes(st.x.type) && !el.querySelector('.dw-ans')) { const s = el.querySelector('.dw-say'); if (s) s.innerHTML = `<p class="dw-ans">${T('الإجابة', 'The answer')}: <b dir="auto">${esc(st.x.ans)}${st.x.unit ? ' ' + esc(st.x.unit) : ''}</b></p>`; }
    const s2 = el.querySelector('.dw-say .dw-yn'); if (s2) s2.remove();
    const f = el.querySelector('#dwFoot');
    f.innerHTML = `<div class="dw-res ${right ? 'ok' : 'no'}"><p>${right ? `<b>+${NUM(pts)}</b> ${T('لمجموعة ', 'to ')}<span dir="auto">${esc(who.name)}</span>` : T('لم تُحتسب نقاط في هذا السؤال', 'No points for this one')}</p><button type="button" class="dw-btn" data-main>${nextLabel()}</button></div>`;
    el.querySelector('.dw-board').outerHTML = board(D.groups.indexOf(st.g));
    f.querySelector('[data-main]').onclick = go;
  }

  /* ---------- the evening as a program of rounds: for all, by turn, for speed, and challenges ---------- */
  const isMC = x => ['mc', 'tf'].includes(x.type);
  const ROUND = () => ({
    all: [T('سؤال للجميع', 'Everyone answers'), T('كل المجموعات تجاوب على نفس السؤال في نفس الوقت: ترفع بطاقة الحرف أو تكتب الإجابة على ورقة، والمدير يسجّل.', 'All groups answer the same question at once: they raise the letter card or write the answer, and the host records it.')],
    board: [T('لوحة الفئات', 'The categories board'), T('المجموعة صاحبة الدور تختار الفئة والقيمة، مثل كتاب «حروف». كلما زادت القيمة صعب السؤال وكثرت النقاط، ومن يخطئ يُسرق منه.', 'The group on turn picks a category and a value. The higher the value, the harder the question and the more points; a miss can be stolen.')],
    turn: [T('جولة الأدوار', 'Turn round'), T('لكل مجموعة سؤالها بالدور. الإجابة الصحيحة ١٠٠ نقطة، وإن أخطأت فلأول مجموعة ترفع يدها ٥٠.', 'Each group gets its own question in turn: a right answer is 100; after a miss, the first other group to raise a hand gets 50.')],
    buzz: [T('جولة السرعة', 'Speed round'), D && D.cfg && D.cfg.ph ? T('سؤال واحد للجميع على الجوالات: أول إجابة صحيحة ١٠٠ نقطة، والخطأ ينكشف على الشاشة ويخرج صاحبه من السؤال.', 'One question for all on the phones: the first right answer is 100; a miss shows on the screen and puts that group out.') : T('سؤال واحد للجميع، وأول مجموعة ترفع يدها تجيب: الإجابة الصحيحة ١٠٠ نقطة، والخاطئة تُخرجها من السؤال.', 'One question for all; the first group to raise a hand answers: right is 100, wrong puts it out of the question.')],
    chal: [T('جولة التحديات', 'Challenge round'), T('تحدٍّ للمجموعات كلها في وقت واحد: الفائز الأول ١٠٠ نقطة والثاني ٥٠.', 'A challenge for all groups at once: the winner gets 100, the runner-up 50.')]
  });
  // a sensible program for the number of groups: few groups play by turn; many groups play all together
  const defRounds = (n, pool, mc, catQ) => {
    const r = n <= 3 ? { turn: 2, all: 0, buzz: 5, chal: 2 } : n <= 5 ? { turn: 1, all: 0, buzz: 6, chal: 2 } : { turn: 1, all: 0, buzz: 6, chal: 3 };
    r.board = 0;
    r.buzz = Math.min(r.buzz, mc); while (r.turn * n + r.all + r.buzz + r.board > pool && (r.turn || r.all || r.buzz || r.board)) { if (r.turn) r.turn--; else if (r.board > 6) r.board--; else if (r.all >= r.buzz && r.all) r.all--; else if (r.buzz) r.buzz--; else r.board--; }
    return r;
  };
  function program() {
    const c = D.cfg, n = c.n, R = c.r;
    const order = ['mc', 'tf', 'num', 'word'], rest = D.all.map((x, i) => ({ x, i })).sort((a, b) => order.indexOf(a.x.type) - order.indexOf(b.x.type) || a.i - b.i).map(o => o.x);
    const take = (k, f) => { const out = []; for (let i = 0; i < rest.length && out.length < k;) { if (!f || f(rest[i])) out.push(rest.splice(i, 1)[0]); else i++; } return out; };
    let last = null; if (c.wager && rest.length > 2) { const i = rest.findIndex(x => isMC(x) && x.type === 'mc' && (x.lv || 0) >= 3); last = rest.splice(i >= 0 ? i : rest.findIndex(isMC) >= 0 ? rest.findIndex(isMC) : 0, 1)[0]; }
    D.tiles = boardTiles(R.board || 0, rest, c.bmode === 'h');
    const buzzQ = take(R.buzz, isMC), turnQ = take(R.turn * n), allQ = take(R.all);
    D.spare = rest;
    const hands = D.groups.map(() => []); turnQ.forEach((x, k) => hands[k % n].push(x));
    const turns = []; for (let r = 0; r < R.turn; r++) for (let g = 0; g < n; g++) if (hands[g][r]) turns.push({ k: 'turn', g, x: hands[g][r], r });
    const chs = (D.chosen || []).map(byKey).filter(Boolean).map(c => ({ k: 'chal', c }));
    const blocks = [['all', allQ.map(x => ({ k: 'all', x }))], ['board', D.tiles.map((_, i) => ({ k: 'board', g: i % n }))], ['turn', turns], ['buzz', buzzQ.map(x => ({ k: 'buzz', x }))]].filter(b => b[1].length);
    const per = Math.ceil(chs.length / Math.max(1, blocks.length)), steps = [];
    const push = (type, items) => { if (!items.length) return; steps.push({ k: 'round', type, n: items.length }); items.forEach(i => steps.push(i)); steps.push({ k: 'stand' }); };
    blocks.forEach(([t, items]) => { push(t, items); push('chal', chs.splice(0, per)); });
    push('chal', chs);
    if (last) { if (!steps.length || steps[steps.length - 1].k !== 'stand') steps.push({ k: 'stand' }); steps.push({ k: 'wager', x: last }); }
    else if (steps.length && steps[steps.length - 1].k === 'stand') steps.pop();
    D.steps = steps;
  }
  function run() {
    const s = D.steps[D.t]; clearInterval(tick);
    if (!s) return final();
    D.cur = null; if (['round', 'stand', 'chal'].includes(s.k)) pub({ ph: s.k, i: D.t });
    ({ round: roundCard, board: s => D.cfg.bmode === 'h' ? huroof(s) : boardPick(s), wager, turn: intro, all: askAll, buzz: s => (D.cfg.ph && ROOM.ref && Object.keys(ROOM.lead).length && isMC(s.x) ? askRace(s) : askBuzz(s)), chal: challenge, stand: standings })[s.k](s);
  }
  const go = () => { D.t++; run(); };
  const nextLabel = () => { const s = D.steps[D.t + 1]; return !s ? T('النتيجة النهائية', 'Final result') : s.k === 'stand' ? T('الترتيب', 'Standings') : s.k === 'round' ? T('الجولة التالية', 'Next round') : s.k === 'turn' || s.k === 'board' ? T('الدور التالي', 'Next turn') : s.k === 'chal' ? T('التحدي التالي', 'Next challenge') : s.k === 'wager' ? T('المراهنة الختامية', 'The final wager') : T('السؤال التالي', 'Next question'); };
  function roundCard(s) {
    const no = D.steps.slice(0, D.t + 1).filter(x => x.k === 'round').length, all = D.steps.filter(x => x.k === 'round').length, [t, d] = s.type === 'board' && D.cfg.bmode === 'h' ? [T('حروف', 'Huroof'), T('المجموعة صاحبة الدور تختار الفئة، ثم الحرف الذي تبدأ به الإجابة، ثم رقمًا. الأصعب نقاطه أكثر، ومن يخطئ يُسرق منه.', 'The group on turn picks a category, then the letter the answer starts with, then a number. Harder pays more; a miss can be stolen.')] : ROUND()[s.type];
    shell(`${board(-1)}<div class="dw-mid dw-rcard dw-r-${s.type}"><p class="dw-sub">${T(`الجولة ${NUM(no)} من ${NUM(all)}`, `Round ${no} of ${all}`)}</p><h2>${t}</h2><p>${d}</p><p class="dw-sub">${s.type === 'chal' ? T(`${NUM(s.n)} ${s.n === 1 ? 'تحدٍّ' : 'تحديات'}`, `${s.n} challenge${s.n > 1 ? 's' : ''}`) : s.type === 'board' ? T(`${NUM(s.n)} مربعات`, `${s.n} tiles`) : s.type === 'turn' ? T(`${NUM(s.n)} أسئلة بالتناوب`, `${s.n} questions in turn`) : T(`${NUM(s.n)} أسئلة`, `${s.n} questions`)}</p><button type="button" class="dw-btn" data-main>${T('ابدأ الجولة', 'Start the round')}</button></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = go; SND.go();
  }
  // a ring that counts down, for any screen that has one
  function clock(st, end) {
    const arc = el.querySelector('#dwArc'), C = 2 * Math.PI * 44; if (!arc) return; arc.style.strokeDasharray = C;
    clearInterval(tick); let last = -1; st.t0 = Date.now() - (st.dur - st.left) * 1000;
    tick = setInterval(() => {
      if (!D || D.q !== st || st.locked) return clearInterval(tick);
      st.left = Math.max(0, st.dur - (Date.now() - st.t0) / 1000); const s = Math.ceil(st.left), t = el.querySelector('#dwT');
      if (t) t.textContent = NUM(s); arc.style.strokeDashoffset = C * (1 - st.left / st.dur);
      if (s !== last && s <= 5 && s > 0) SND.tick(); last = s;
      if (st.left <= 0) { clearInterval(tick); end(); }
    }, 100);
  }
  const ring = dur => `<div class="dw-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="44" id="dwArc"/></svg><b id="dwT">${NUM(dur)}</b></div>`;
  const qBody = (x, live) => `<h2 class="dw-qt" dir="auto">${esc(x.q)}</h2>${x.img ? `<div class="dw-imgw${x.zoom ? ' zoom' : ''}" style="--d:${x.zd || 20}s;--ox:${x.ox || 50}%;--oy:${x.oy || 50}%;--z:${x.zs || 3.5}"><span class="dw-imf"><img class="dw-img" src="${x.img}" alt="" referrerpolicy="no-referrer"></span></div>${x.cr ? `<small class="dw-imcr">${esc(x.cr)}</small>` : ''}` : ''}${isMC(x) ? `<div class="dw-opts n${x.opts.length}${live ? '' : ' dw-view'}">${x.opts.map((o, j) => `<button type="button" ${live ? 'data-j' : 'data-v'}="${j}" style="--o:var(--dwo${j})"${live ? ' disabled' : ''}><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></button>`).join('')}</div>` : ''}`;
  const answerOf = x => isMC(x) ? x.ok.map(j => `${LET()[j]}) ${x.opts[j]}`).join(T(' و', ' & ')) : `${x.ans}${x.unit ? ' ' + x.unit : ''}`;
  const markRight = x => (el.querySelector('.dw-imgw') || { classList: { add() {} } }).classList.add('done') || el.querySelectorAll('[data-j],[data-v]').forEach(b => { const j = +(b.dataset.j || b.dataset.v); b.disabled = true; if (x.ok && x.ok.includes(j)) b.classList.add('ok'); });
  const after = (html) => { const f = el.querySelector('#dwFoot'); f.innerHTML = `<div class="dw-res">${html}<button type="button" class="dw-btn" data-main>${nextLabel()}</button></div>`; f.querySelector('[data-main]').onclick = go; el.querySelector('.dw-board').outerHTML = board(-1); };

  /* everyone answers: each group raises its card or writes; the host records them, then reveals */
  function askAll(s) {
    if (D.cfg.ph && ROOM.ref && Object.keys(ROOM.lead).length && isMC(s.x) && !s.bets) return askRace(s);
    const x = s.x, dur = D.cfg.time || x.time || 30, st = D.q = { x, dur, left: dur, rec: {}, ok: {}, shown: false, locked: false };
    shell(`${board(-1)}<div class="dw-q dw-all"><div class="dw-qh"><span class="dw-who">${s.bets ? T('المراهنة الختامية', 'The final wager') : T('سؤال للجميع', 'Everyone answers')}</span>${ring(dur)}</div>${qBody(x, false)}
      ${isMC(x) ? '' : `<p class="dw-hint">${T('كل مجموعة تكتب إجابتها على ورقة وترفعها.', 'Each group writes its answer and holds it up.')}</p>`}
      <div class="dw-rec" id="dwRec"></div><div class="dw-foot" id="dwFoot"><button type="button" class="dw-btn" data-main data-rev>${isMC(x) ? T('أظهر الإجابة', 'Show the answer') : T('اكشف الإجابة', 'Reveal the answer')}</button></div></div>`, 'dw-ask');
    const rec = () => {
      const box = el.querySelector('#dwRec'); if (!box) return;
      box.innerHTML = D.groups.map((g, k) => `<div class="dw-rg" style="--c:${g.col}"><b dir="auto">${esc(g.name)}</b><span>${isMC(x)
        ? x.opts.map((o, j) => `<button type="button" data-g="${k}" data-a="${j}" style="--o:var(--dwo${j})" aria-pressed="${st.rec[k] === j}"${st.shown ? ' disabled' : ''}>${x.type === 'tf' ? esc(o) : LET()[j]}</button>`).join('')
        : st.shown ? `<button type="button" class="y" data-g="${k}" data-r="1" aria-pressed="${st.ok[k] === true}">✓</button><button type="button" class="n" data-g="${k}" data-r="0" aria-pressed="${st.ok[k] === false}">✗</button>` : `<em>${T('تكتب…', 'Writing…')}</em>`}</span>${st.done ? `<i class="${st.ok[k] ? 'ok' : 'no'}">${st.ok[k] ? '+' + NUM(s.bets ? s.bets[k] : 100) : s.bets && s.bets[k] ? '−' + NUM(s.bets[k]) : NUM(0)}</i>` : ''}</div>`).join('');
      box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { st.rec[+b.dataset.g] = +b.dataset.a; rec(); });
      box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { st.ok[+b.dataset.g] = b.dataset.r === '1'; rec(); });
    };
    rec(); st.onAns = (k, j) => { if (!st.shown && !st.done && isMC(x) && j < x.opts.length) { st.rec[k] = j; rec(); } };
    pub({ ph: 'all', n: isMC(x) ? x.opts.length : 0, tf: x.type === 'tf' ? 1 : 0, i: D.t });
    const reveal = () => {
      st.locked = true; clearInterval(tick);
      if (isMC(x)) { markRight(x); D.groups.forEach((g, k) => { st.ok[k] = st.rec[k] != null && x.ok.includes(st.rec[k]); }); return done(); }
      if (!st.shown) { st.shown = true; const f = el.querySelector('#dwFoot'); f.innerHTML = `<p class="dw-ans">${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b></p><p class="dw-hint">${T('علّم ✓ لكل مجموعة أصابت', 'Tick each group that got it')}</p><button type="button" class="dw-btn" data-main>${T('اعتمد النتيجة', 'Confirm')}</button>`; f.querySelector('[data-main]').onclick = done; rec(); }
    };
    const done = () => {
      st.done = true; let n = 0; D.groups.forEach((g, k) => { if (s.bets) { const b = s.bets[k] || 0; g.score = Math.max(0, g.score + (st.ok[k] ? b : -b)); if (st.ok[k]) { g.right++; n++; } } else if (st.ok[k]) { award(g, 100); g.right++; n++; } });
      n ? SND.ok() : SND.no(); rec();
      after(`<p>${isMC(x) ? `${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b> · ` : ''}${n ? T(`أصابت ${NUM(n)} من ${NUM(D.groups.length)}`, `${n} of ${D.groups.length} got it`) : T('لم تُصب أي مجموعة', 'No group got it')}</p>`);
    };
    el.querySelector('[data-rev]').onclick = reveal;
    clock(st, () => { SND.no(); const b = el.querySelector('[data-rev]'); if (b) b.classList.add('dw-pulse'); });
    SND.go();
  }

  /* the phone race: the first team to answer right takes the points; a wrong pick is struck out on the screen with the team's name and the rest go on */
  function askRace(s) {
    const x = s.x, dur = D.cfg.time || x.time || 30, st = D.q = { x, dur, left: dur, out: [], no: [], tags: {}, sel: null, locked: false };
    shell(`${board(-1)}<div class="dw-q dw-race"><div class="dw-qh"><span class="dw-who" id="dwWho">${T('سباق: أول إجابة صحيحة تفوز', 'Race: the first right answer wins')}</span>${ring(dur)}</div>${qBody(x, true)}<p class="dw-say" id="dwRf" aria-live="polite"></p><div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    const pts = () => st.out.length ? 50 : 100;
    const send = () => pub({ ph: 'race', n: x.opts.length, tf: x.type === 'tf' ? 1 : 0, out: st.out, no: st.no, i: D.t });
    const open = () => el.querySelectorAll('[data-j]').forEach(b => { b.disabled = st.locked || st.no.includes(+b.dataset.j); });
    // teams without a phone: the host taps the team, then its answer
    const foot = () => {
      const f = el.querySelector('#dwFoot'), off = D.groups.map((g, k) => k).filter(k => ROOM.lead[k] == null && !st.out.includes(k));
      f.innerHTML = `<p class="dw-hint">${st.out.length ? T(`النقاط الآن ${NUM(pts())}`, `Now worth ${pts()}`) : T(`${NUM(100)} نقطة لأول إجابة صحيحة، و${NUM(50)} بعد أي خطأ`, `${100} for the first right answer, ${50} after a miss`)}</p>${off.length ? `<div class="dw-steal"><p>${T('فريق بلا جوال؟ اختره ثم إجابته', 'A team without a phone? Pick it, then its answer')}</p><div>${off.map(k => `<button type="button" data-rt="${k}" style="--c:${D.groups[k].col}" aria-pressed="${st.sel === k}" dir="auto">${esc(D.groups[k].name)}</button>`).join('')}</div></div>` : ''}<button type="button" class="dw-btn ghost" data-stop>${T('أظهر الإجابة', 'Show the answer')}</button>`;
      f.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { st.sel = st.sel === +b.dataset.rt ? null : +b.dataset.rt; foot(); });
      f.querySelector('[data-stop]').onclick = () => end(null);
    };
    const tag = (j, k, ok) => { const b = el.querySelector(`[data-j="${j}"]`); if (!b) return; let t = b.querySelector('.dw-tags'); if (!t) { t = document.createElement('em'); t.className = 'dw-tags'; b.appendChild(t); } t.insertAdjacentHTML('beforeend', `<b style="--c:${D.groups[k].col}" class="${ok ? 'y' : 'n'}" dir="auto">${esc(D.groups[k].name)}</b>`); };
    const say = h => { const f = el.querySelector('#dwRf'); if (f) { f.innerHTML = h; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
    st.onAns = (k, j) => {
      if (st.locked || st.out.includes(k) || st.no.includes(j) || !(j >= 0 && j < x.opts.length)) return;
      const g = D.groups[k];
      if (x.ok.includes(j)) { const b = el.querySelector(`[data-j="${j}"]`); b.classList.add('ok'); tag(j, k, true); const p = award(g, pts()); g.right++; return end(k, p); }
      st.out.push(k); st.no.push(j); tag(j, k, false); el.querySelector(`[data-j="${j}"]`).classList.add('no'); SND.no();
      const left = D.groups.length - st.out.length, opts = x.opts.length - st.no.length;
      say(`<b style="color:${g.col}" dir="auto">${esc(g.name)}</b> ${T('أخطأت', 'missed')} · ${left ? T('الباب مفتوح للبقية', 'the others go on') : ''}`);
      if (!left || !opts) return end(null);
      open(); foot(); send();
    };
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { if (st.sel == null) { say(T('اختر الفريق أولًا من الأسفل', 'Pick the team first, below')); return; } const k = st.sel; st.sel = null; st.onAns(k, +b.dataset.j); if (!st.locked) foot(); });
    const end = (k, p) => { st.locked = true; clearInterval(tick); markRight(x); k != null ? SND.ok() : SND.no(); pub({ ph: 'wait', i: D.t, won: k == null ? -1 : k });
      after(`<p>${k != null ? `<b>+${NUM(p)}</b> ${T('لمجموعة ', 'to ')}<span dir="auto">${esc(D.groups[k].name)}</span> · ` : ''}${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b></p>`); };
    open(); foot(); send(); clock(st, () => end(null)); SND.go();
  }

  /* speed: the first hand up answers; a wrong answer puts that group out of the question */
  function askBuzz(s) {
    const x = s.x, dur = D.cfg.time || x.time || 20, st = D.q = { x, dur, left: dur, out: [], who: null, locked: false, line: [] };
    shell(`${board(-1)}<div class="dw-q dw-buzz"><div class="dw-qh"><span class="dw-who" id="dwWho">${T('جولة السرعة', 'Speed round')}</span>${ring(dur)}</div>${qBody(x, true)}<div class="dw-line" id="dwLine"></div><div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    const send = () => pub({ ph: 'buzz', n: x.opts.length, tf: x.type === 'tf' ? 1 : 0, out: st.out, who: st.who, i: D.t });
    // the phones' presses, in the order the server received them
    const line = () => { const l = el.querySelector('#dwLine'); if (l) l.innerHTML = st.line.length ? st.line.map((o, i) => `<span style="--c:${D.groups[o.k].col}" class="${st.out.includes(o.k) ? 'out' : ''}"><b>${NUM(i + 1)}</b>${esc(D.groups[o.k].name)}</span>`).join('') : ''; };
    const choose = k => { if (st.locked || st.out.includes(k)) return; st.who = k; const g = D.groups[k], f = el.querySelector('#dwFoot');
      el.querySelector('#dwWho').textContent = T('تجاوب: ', 'Answering: ') + g.name; el.querySelector('.dw-q').style.setProperty('--c', g.col);
      el.querySelectorAll('[data-j]').forEach(o => { o.disabled = o.classList.contains('no'); });
      f.innerHTML = `<p class="dw-hint">${ROOM.lead[k] ? T('يختار القائد الإجابة من جواله، أو اضغطها هنا.', 'The leader picks on the phone, or tap it here.') : T('يقول القائد الإجابة، فاضغطها.', 'The leader says the answer; tap it.')}</p><button type="button" class="dw-btn ghost" data-undo>${T('تراجع', 'Undo')}</button>`; f.querySelector('[data-undo]').onclick = () => { st.who = null; hands(); }; SND.go(); send(); };
    const nextInLine = () => { const o = st.line.find(o => !st.out.includes(o.k)); if (o) choose(o.k); else hands(); };
    const hands = () => {
      const f = el.querySelector('#dwFoot'), left = D.groups.map((g, k) => k).filter(k => !st.out.includes(k));
      el.querySelectorAll('[data-j]').forEach(b => { b.disabled = true; }); el.querySelector('#dwWho').textContent = T('جولة السرعة', 'Speed round'); el.querySelector('.dw-q').style.removeProperty('--c');
      f.innerHTML = `<div class="dw-steal"><p>${IC.hand}${Object.keys(ROOM.lead).length ? T('أول ضغطة من جوالات القادة تظهر هنا، أو اختر من رفع يده', 'The first press on the leaders’ phones shows here, or pick a raised hand') : T('من رفع يده أولًا؟', 'Whose hand went up first?')}</p><div>${left.map(k => `<button type="button" data-bz="${k}" style="--c:${D.groups[k].col}" dir="auto">${esc(D.groups[k].name)}</button>`).join('')}<button type="button" class="dw-none" data-bz="-1">${T('لا أحد', 'Nobody')}</button></div></div>`;
      f.querySelectorAll('[data-bz]').forEach(b => b.onclick = () => { const k = +b.dataset.bz; if (k < 0) return end(null); choose(k); });
      send();
    };
    st.onBuzz = (k, t) => { if (st.locked || st.line.some(o => o.k === k)) return; st.line.push({ k, t }); st.line.sort((a, b) => a.t - b.t); line(); SND.tick(); if (st.who == null && !st.out.includes(k)) setTimeout(() => { if (st.who == null && !st.locked) nextInLine(); }, 250); };
    st.onAns = (k, j) => { if (st.who === k && !st.locked) { const b = el.querySelector(`[data-j="${j}"]:not([disabled])`); if (b) b.click(); } };
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => {
      if (st.who == null || st.locked) return; const j = +b.dataset.j, k = st.who, right = x.ok.includes(j);
      if (right) { b.classList.add('ok'); const pts = award(D.groups[k], 100); D.groups[k].right++; return end(k, pts); }
      b.classList.add('no'); b.disabled = true; SND.no(); st.out.push(k); st.who = null; line();
      const open = [...el.querySelectorAll('[data-j]')].filter(o => !o.classList.contains('no')).length;
      if (st.out.length >= D.groups.length || open <= 1) return end(null); nextInLine();
    });
    const end = (k, pts) => { st.locked = true; clearInterval(tick); markRight(x); k != null ? SND.ok() : SND.no(); pub({ ph: 'wait', i: D.t });
      after(`<p>${k != null ? `<b>+${NUM(pts)}</b> ${T('لمجموعة ', 'to ')}<span dir="auto">${esc(D.groups[k].name)}</span>` : `${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b>`}</p>`); };
    hands(); clock(st, () => end(null)); SND.go();
  }

  /* challenges: on the screen, a timer; afterwards the host taps the groups in the order they finished or won */
  const PLACE = [100, 50];
  function nextChal(used, not) { const L = CHAL().map((c, i) => i).filter(i => !used.has(i) && i !== not); if (!L.length) return null; const i = L[Math.floor(Math.random() * L.length)]; used.add(i); return Object.assign({ i }, CHAL()[i]); }
  function challenge(s) {
    const ch = s.c, st = D.q = { dur: ch.s, left: ch.s, locked: false, rank: [], extra: extra(ch), sc: ch.sc || 'rank' };
    shell(`${board(-1)}<div class="dw-mid dw-ch"><p class="dw-tag">${esc(ch.cat)}</p><h2 dir="auto">${esc(ch.t)}</h2><p dir="auto">${esc(ch.d)}</p>${ch.mat ? `<p class="dw-sub">${T('يحتاج', 'Needs')}: ${esc(ch.mat)}${ch.alt ? ` · ${T('أو', 'or')}: ${esc(ch.alt)}` : ''}</p>` : ''}<div class="dw-x" id="dwX">${st.extra.pre || ''}</div>${ring(ch.s)}
      <div class="dw-foot" id="dwFoot"><div class="dw-acts"><button type="button" class="dw-btn" data-main data-go>${T('ابدأ المؤقت', 'Start the timer')}</button><button type="button" class="dw-btn ghost" data-swap>${IC.swap}${T('تحدٍّ آخر', 'Another challenge')}</button><button type="button" class="dw-btn ghost" data-skip>${T('تخطَّه', 'Skip it')}</button></div></div></div>`, 'dw-in');
    el.querySelector('[data-skip]').onclick = () => { clearInterval(tick); go(); };
    el.querySelector('[data-swap]').onclick = () => { const P = shuf(pool().filter(c => !(D.chosen || []).includes(c.key))); if (P.length) { D.chosen = (D.chosen || []).map(k => k === ch.key ? P[0].key : k); s.c = P[0]; challenge(s); } };
    el.querySelector('[data-go]').onclick = () => {
      SND.go(); const x = el.querySelector('#dwX'); if (st.extra.live) x.innerHTML = st.extra.live;
      if (st.extra.hideAt) setTimeout(() => { if (D && D.q === st && x.isConnected) x.innerHTML = st.extra.after; }, st.extra.hideAt * 1000);
      el.querySelector('#dwFoot').innerHTML = `<div class="dw-acts"><button type="button" class="dw-btn" data-main data-stop>${T('انتهى التحدي', 'The challenge is over')}</button><button type="button" class="dw-btn ghost" data-re0>${T('أعد المؤقت', 'Restart the timer')}</button><button type="button" class="dw-btn ghost" data-cancel>${T('ألغِه بلا نقاط', 'Cancel, no points')}</button></div>`;
      el.querySelector('[data-stop]').onclick = score; el.querySelector('[data-cancel]').onclick = () => { st.locked = true; clearInterval(tick); go(); };
      el.querySelector('[data-re0]').onclick = () => { st.left = st.dur; clock(st, () => { SND.win(); score(); }); SND.go(); };
      clock(st, () => { SND.win(); score(); });
    };
    const score = () => { st.again = score; if (st.sc === 'judge') { st.locked = true; clearInterval(tick); const x = el.querySelector('#dwX'); if (st.extra.answer) x.innerHTML = st.extra.answer;
      return judgeBox(st, m => { let best = -1; m.forEach((v, k) => { D.groups[k].score += v; if (best < 0 || v > m[best]) best = k; }); if (best >= 0 && m[best] > 0) D.groups[best].chal = (D.groups[best].chal || 0) + 1; SND.ok();
        after(`<p>${T('تمت إضافة الدرجات', 'Marks added')}${best >= 0 && m[best] > 0 ? ` · ${T('الأعلى', 'Top')}: <span dir="auto">${esc(D.groups[best].name)}</span> <b>+${NUM(m[best])}</b>` : ''}</p>`); }); }
      rank(); };
    const rank = () => {
      st.locked = true; clearInterval(tick); const f = el.querySelector('#dwFoot'), x = el.querySelector('#dwX'); if (st.extra.answer) x.innerHTML = st.extra.answer;
      const paint = () => { f.innerHTML = `<div class="dw-steal"><p>${T('اختر الفائز الأول (١٠٠ نقطة) ثم الثاني (٥٠ نقطة)', 'Pick the winner (100) and the runner-up (50)')}</p><div>${D.groups.map((g, k) => { const p = st.rank.indexOf(k); return `<button type="button" data-rk="${k}" style="--c:${g.col}" class="${p >= 0 ? 'on' : ''}" dir="auto">${p >= 0 ? `<em>${NUM(p + 1)}</em>` : ''}${esc(g.name)}</button>`; }).join('')}</div></div>
        <div class="dw-acts"><button type="button" class="dw-btn" data-main data-ok${st.rank.length ? '' : ' disabled'}>${T('اعتمد النتيجة', 'Confirm')}</button><button type="button" class="dw-btn ghost" data-re>${T('أعد الترتيب', 'Reset')}</button><button type="button" class="dw-btn ghost" data-tojudge>${T('ضع درجات بدلًا من الترتيب', 'Give marks instead')}</button></div>`;
        f.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { const k = +b.dataset.rk; if (!st.rank.includes(k) && st.rank.length < Math.min(2, D.groups.length - 1)) st.rank.push(k); paint(); });
        f.querySelector('[data-re]').onclick = () => { st.rank = []; paint(); };
        f.querySelector('[data-tojudge]').onclick = () => { st.sc = 'judge'; score(); };
        f.querySelector('[data-ok]').onclick = () => { st.rank.forEach((k, p) => { D.groups[k].score += PLACE[p] || 0; D.groups[k].chal = (D.groups[k].chal || 0) + (p === 0 ? 1 : 0); }); SND.ok(); const w = D.groups[st.rank[0]];
          after(`<p><b>+${NUM(PLACE[0])}</b> ${T('للفائز', 'to the winner')} <span dir="auto">${esc(w.name)}</span></p>`); };
      };
      paint();
    };
  }
  // screen-made material for some challenges: words to remember, letters to rearrange, numbers to reach 24
  const WORDS = () => isAr() ? ['نخلة', 'فنجان', 'صقر', 'خيمة', 'قمر', 'مفتاح', 'دلة', 'جمل', 'كتاب', 'ساعة', 'قلم', 'مظلة', 'سفينة', 'بيت', 'تمر', 'سيارة', 'نجمة', 'باب', 'شمس', 'بحر', 'جبل', 'وردة', 'طائرة', 'كرسي', 'مصباح', 'حقيبة', 'غيمة', 'سراج', 'ميزان', 'بوصلة'] : ['palm', 'cup', 'falcon', 'tent', 'moon', 'key', 'pot', 'camel', 'book', 'clock', 'pen', 'umbrella', 'ship', 'house', 'date', 'car', 'star', 'door', 'sun', 'sea', 'mountain', 'rose', 'plane', 'chair', 'lamp', 'bag', 'cloud', 'lantern', 'scale', 'compass'];
  const LONG = () => isAr() ? ['المستشفى', 'الاستقلال', 'المكتبات', 'البرتقال', 'المهرجان', 'الطائرات', 'المسافرون', 'الجامعات', 'المزرعة', 'الكهرباء'] : ['HOSPITAL', 'LIBRARY', 'FESTIVAL', 'TRAVELLER', 'UNIVERSITY', 'ELECTRIC', 'MOUNTAINS', 'ORANGES'];
  const N24 = [[1, 2, 3, 4], [1, 3, 4, 6], [2, 3, 4, 6], [1, 1, 4, 6], [3, 4, 5, 6], [1, 2, 3, 8], [3, 3, 4, 6]];
  const shuf = a => a.slice().sort(() => Math.random() - .5);
  function extra(ch) {
    if (ch.x === 'mem') { const w = shuf(WORDS()).slice(0, 12); return { pre: `<p class="dw-hint">${T('تظهر الكلمات حين يبدأ المؤقت، لمدة ٢٠ ثانية فقط', 'The words show when the timer starts, for 20 seconds only')}</p>`, live: `<div class="dw-words">${w.map(v => `<span>${esc(v)}</span>`).join('')}</div>`, hideAt: 20, after: `<p class="dw-big">${T('اكتبوا كل ما تتذكرون!', 'Write down all you remember!')}</p>`, answer: `<div class="dw-words dw-dim">${w.map(v => `<span>${esc(v)}</span>`).join('')}</div>` }; }
    if (ch.x === 'scr') { const w = LONG()[Math.floor(Math.random() * LONG().length)], l = shuf([...w.replace(/^ال/, '')]); return { live: `<div class="dw-letters">${l.map(v => `<span>${esc(v)}</span>`).join('')}</div>`, pre: `<p class="dw-hint">${T('تظهر الحروف حين يبدأ المؤقت', 'The letters show when the timer starts')}</p>`, answer: `<p class="dw-big">${T('الكلمة', 'The word')}: ${esc(w)}</p>` }; }
    if (ch.x === 'bld') { const w = LONG()[Math.floor(Math.random() * LONG().length)]; return { pre: `<p class="dw-big">${esc(w)}</p>` }; }
    if (ch.x === 'n24') { const n = N24[Math.floor(Math.random() * N24.length)]; return { pre: `<div class="dw-letters">${shuf(n).map(v => `<span>${NUM(v)}</span>`).join('')}</div><p class="dw-hint">+ − × ÷</p>` }; }
    return {};
  }
  // forty challenges for a class, a family gathering or a team: no devices, little or nothing to prepare
  const CHAL = () => { const M = T('حركة', 'Move'), C = T('إبداع', 'Create'), Z = T('ذكاء', 'Think'), K = T('تعاون', 'Together');
    const A = isAr();
    return [
      [Z, 'ذاكرة الشاشة', 'تظهر ١٢ كلمة لمدة ٢٠ ثانية ثم تختفي. اكتبوا أكبر عدد منها.', 'Screen memory', 'Twelve words show for 20 seconds, then vanish. Write down as many as you can.', 60, 'mem'],
      [Z, 'الحروف المبعثرة', 'رتّبوا الحروف على الشاشة لتكوين الكلمة. أول مجموعة تصيب تفوز.', 'Scrambled letters', 'Rearrange the letters on the screen into the word. The first group to get it wins.', 60, 'scr'],
      [Z, 'كلمات من كلمة', 'كوّنوا أكبر عدد من الكلمات من حروف الكلمة على الشاشة.', 'Words from a word', 'Make as many words as you can from the letters of the word on the screen.', 90, 'bld'],
      [Z, 'تحدي ٢٤', 'استعملوا الأرقام الأربعة كلها مرة واحدة مع الجمع والطرح والضرب والقسمة لتصلوا إلى ٢٤.', 'Make 24', 'Use all four numbers once, with + − × ÷, to reach 24.', 90, 'n24'],
      [Z, 'مدن المملكة', 'اكتبوا أكبر عدد من مدن المملكة ومحافظاتها.', 'Cities', 'Write as many cities of the country as you can.', 60],
      [Z, 'حرف الميم', 'اكتبوا أكبر عدد من الأشياء التي تبدأ بحرف الميم.', 'The letter M', 'Write as many things as you can that start with M.', 60],
      [Z, 'أكلاتنا', 'اكتبوا أكبر عدد من الأكلات الشعبية السعودية.', 'Our dishes', 'Write as many traditional dishes as you can.', 60],
      [Z, 'حيوانات الصحراء', 'اكتبوا أكبر عدد من الحيوانات والطيور التي تعيش في الصحراء.', 'Desert animals', 'Write as many desert animals and birds as you can.', 60],
      [Z, 'دول بحرف السين', 'اكتبوا أكبر عدد من الدول التي تبدأ بحرف السين.', 'Countries', 'Write as many countries starting with S as you can.', 60],
      [Z, 'سلسلة الكلمات', 'يقول كل عضو بدوره كلمة تبدأ بآخر حرف من كلمة زميله. أطول سلسلة بلا توقف تفوز.', 'Word chain', 'In turn, each says a word starting with the last letter of the one before. The longest chain wins.', 60],
      [Z, 'أكمل المثل', 'يقول المدير بداية مثل شعبي، وأول مجموعة تكمله تكسب نقطة. الأكثر نقاطًا يفوز.', 'Finish the proverb', 'The host starts a proverb; the first group to finish it scores. Most wins.', 120],
      [Z, 'السؤال المعكوس', 'يقول المدير جوابًا، وأول مجموعة تقول سؤالًا مناسبًا له تكسب. الأكثر يفوز.', 'Reverse question', 'The host says an answer; the first group with a fitting question scores.', 120],
      [Z, 'سؤال للمنافس', 'كل مجموعة تكتب سؤالًا صعبًا لمجموعة أخرى. من يعجز عن سؤاله تكسب صاحبة السؤال.', 'Stump them', 'Each group writes a hard question for another group. Whoever cannot answer, the asker wins.', 120],
      [Z, 'ثلاث كلمات', 'يصف عضو شيئًا في المكان بثلاث كلمات فقط، ومجموعته تخمّن. أكبر عدد أشياء يفوز.', 'Three words', 'One member describes something in the room in three words; the group guesses. Most wins.', 90],
      [Z, 'بلا نعم ولا لا', 'يسأل المنافسون عضوًا من المجموعة أسئلة سريعة، وعليه ألا يقول «نعم» أو «لا». أطول صمود يفوز.', 'No yes, no no', 'Rivals fire questions at one member, who must never say yes or no. The longest to last wins.', 60],
      [M, 'الصف الصامت', 'رتّبوا أنفسكم حسب الطول دون أي كلمة. أول مجموعة تنتهي صحيحًا تفوز.', 'Silent line-up', 'Line up by height without a word. The first group done right wins.', 90],
      [M, 'الترتيب الأبجدي', 'رتّبوا أنفسكم أبجديًا حسب الاسم الأول دون كلام.', 'Alphabet line-up', 'Line up alphabetically by first name, without talking.', 90],
      [M, 'العدّ العكسي', 'عدّوا من ٣٠ إلى ١ بالتناوب بين الأعضاء بلا خطأ. أسرع مجموعة تفوز، ومن يخطئ يبدأ من جديد.', 'Countdown', 'Count from 30 down to 1, members in turn, no slips. Fastest wins; a slip starts again.', 60],
      [M, 'التصفيق المتسلسل', 'يصفق كل عضو مرة بدوره بأسرع ما يمكن، ثلاث دورات كاملة بلا خطأ.', 'Clap chain', 'Each member claps once in turn as fast as you can, three full rounds, no slips.', 45],
      [M, 'الكرة الورقية', 'مرّروا كرة ورقية على كل الأعضاء عشر دورات دون أن تسقط.', 'Paper ball', 'Pass a paper ball round every member ten times without dropping it.', 60],
      [M, 'المطاردة', 'أول مجموعة تُحضر: قلمًا أحمر، وورقة مطوية مثلثًا، وشيئًا دائريًا.', 'Scavenger hunt', 'The first group to bring a red pen, a paper folded into a triangle and something round.', 60],
      [M, 'خمسة من الجيوب', 'أخرجوا خمسة أشياء من جيوبكم وحقائبكم ورتّبوها من الأصغر إلى الأكبر.', 'Five from pockets', 'Take five things from pockets and bags and line them up, smallest to largest.', 45],
      [M, 'الطائرة الورقية', 'اصنعوا طائرة ورقية، والطائرة التي تطير أبعد تفوز.', 'Paper plane', 'Fold a paper plane; the one that flies furthest wins.', 120],
      [M, 'الشكل البشري', 'شكّلوا بأجسامكم شكل نخلة، والمدير يختار الأجمل.', 'Human shape', 'Make the shape of a palm tree with your bodies; the host picks the best.', 60],
      [C, 'مثّل المثل', 'يمثّل عضو مثلًا شعبيًا بلا كلام، ومجموعته تخمّن. أكبر عدد أمثال يفوز.', 'Act the proverb', 'A member acts a proverb without words; the group guesses. Most wins.', 120],
      [C, 'مثّل المهنة', 'يمثّل عضو مهنة بلا كلام، ومجموعته تخمّن. أكبر عدد يفوز.', 'Act the job', 'A member acts a job without words; the group guesses. Most wins.', 90],
      [C, 'رسّام المجموعة', 'يرسم عضو كلمة يهمسها له المدير، ومجموعته تخمّن. أسرع مجموعة تفوز.', 'Group artist', 'One member draws a word the host whispers; the group guesses. Fastest wins.', 90],
      [C, 'خريطة المملكة', 'ارسموا خريطة المملكة وضعوا عليها خمس مدن في أماكنها.', 'The map', 'Draw the map of the country and place five cities on it.', 120],
      [C, 'شعار المجموعة', 'صمّموا شعارًا وعبارة قصيرة لمجموعتكم، والمدير يختار الأجمل.', 'Group logo', 'Design a logo and a slogan for your group; the host picks the best.', 120],
      [C, 'القصة الجماعية', 'كل عضو يضيف جملة لقصة تبدأ بـ«في ليلة شتوية في البر…». أجمل قصة تفوز.', 'Group story', 'Each member adds a sentence to a story that starts “One winter night in the desert…”.', 120],
      [C, 'الإعلان', 'مثّلوا إعلانًا مدته ٣٠ ثانية لمنتج تختاره لكم المجموعة المنافسة.', 'The advert', 'Act a 30-second advert for a product a rival group picks.', 120],
      [C, 'بيتان من الشعر', 'اكتبوا بيتين من الشعر عن هذا المكان أو هذه المناسبة.', 'Two lines of verse', 'Write two lines of verse about this place or this occasion.', 120],
      [C, 'التلخيص', 'لخّصوا ما تعلّمناه اليوم في ثلاث كلمات، والأذكى يفوز.', 'In three words', 'Sum up what we learned today in three words; the sharpest wins.', 60],
      [K, 'البرج', 'ابنوا أعلى برج يقف وحده من الأوراق والأقلام.', 'The tower', 'Build the tallest tower that stands on its own, from paper and pens.', 120],
      [K, 'أشياء مشتركة', 'اكتبوا عشرة أشياء مشتركة بين كل أعضاء مجموعتكم.', 'In common', 'Write ten things every member of your group shares.', 90],
      [K, 'الصوت الواحد', 'قولوا «السلام عليكم ورحمة الله وبركاته» معًا بصوت واحد متزامن تمامًا.', 'One voice', 'Say a greeting together, perfectly in time, as one voice.', 30],
      [K, 'الرسم الأعمى', 'يصف عضو شكلًا يراه وحده، وزميله يرسمه دون أن يراه. الأقرب يفوز.', 'Blind drawing', 'One member describes a shape only they see; a teammate draws it unseen. Closest wins.', 90],
      [K, 'العقدة البشرية', 'يمسك كل عضو يدَي زميلين مختلفين، ثم فكّوا العقدة دون أن تفلتوا الأيدي.', 'Human knot', 'Each takes the hands of two different teammates; untangle without letting go.', 120],
      [K, 'رقم المجموعة', 'دون كلام، يرفع الأعضاء أصابعًا ليكون المجموع ١٥ بالضبط في أسرع وقت.', 'Group number', 'Without talking, members raise fingers so the total is exactly 15, as fast as you can.', 45],
      ...PACKS(),
      [K, 'الجملة الطويلة', 'كوّنوا أطول جملة مفيدة يقول فيها كل عضو كلمة واحدة بدوره.', 'Long sentence', 'Build the longest sensible sentence, one word per member in turn.', 60]
    ].map(r => ({ cat: r[0], t: A ? r[1] : r[3], d: A ? r[2] : r[4], s: r[5], x: r[6] || '', pk: r[7] || '', sc0: r[8] || '', mat0: r[9] || '' })); };
  // packs for the occasion: a class, a family majlis, a day out in the desert, a team at work
  const PACK = () => [['', T('كل التحديات', 'All challenges')], ['cls', T('الفصل', 'The classroom')], ['maj', T('المجلس العائلي', 'Family majlis')], ['bar', T('البر والكشتة', 'Out in the desert')], ['wrk', T('فريق العمل', 'A work team')]];
  const PACKS = () => { const M = T('حركة', 'Move'), C = T('إبداع', 'Create'), Z = T('ذكاء', 'Think'), K = T('تعاون', 'Together'); return [
    [Z, 'الكلمة الممنوعة', 'يصف عضو كلمة لمجموعته دون أن يستعمل ثلاث كلمات ممنوعة يحددها المعلم. أكبر عدد كلمات يفوز.', 'Forbidden words', 'A member describes a word without three banned words the teacher sets. Most words wins.', 90, '', 'cls', 'rank', ''],
    [K, 'التهجئة الجماعية', 'يتهجّى الأعضاء كلمة طويلة يقولها المعلم، كل عضو حرفًا بالتناوب بلا خطأ.', 'Group spelling', 'Members spell a long word the teacher says, one letter each in turn, no slips.', 60, '', 'cls', 'rank', ''],
    [C, 'الخريطة الذهنية', 'ارسموا خريطة ذهنية لدرس اليوم: الفكرة في الوسط وفروعها حولها.', 'Mind map', 'Draw a mind map of today’s lesson: the idea in the middle, its branches around it.', 180, '', 'cls', 'judge', 'ورق وأقلام ملونة'],
    [Z, 'أسئلة للمنافسين', 'كل مجموعة تكتب ثلاثة أسئلة عن الدرس وتطرحها على مجموعة أخرى.', 'Questions for rivals', 'Each group writes three questions on the lesson for another group.', 180, '', 'cls', 'judge', 'ورقة وقلم لكل مجموعة'],
    [C, 'المعلم الصغير', 'عضو من كل مجموعة يشرح فكرة من الدرس في دقيقة واحدة.', 'Little teacher', 'One member from each group explains an idea from the lesson in one minute.', 90, '', 'cls', 'judge', ''],
    [Z, 'التصنيف السريع', 'يكتب المعلم عشر كلمات على السبورة، والمجموعات تصنّفها في جدول صحيح.', 'Quick sorting', 'The teacher writes ten words on the board; groups sort them into a correct table.', 90, '', 'cls', 'rank', 'سبورة'],
    [Z, 'ألغاز الأولين', 'كل مجموعة تطرح لغزًا شعبيًا تعرفه، والمجموعات الأخرى تحاول حله.', 'Old riddles', 'Each group sets a folk riddle it knows; the others try to solve it.', 120, '', 'maj', 'judge', ''],
    [Z, 'القهوة العربية', 'اكتبوا خطوات إعداد القهوة العربية بالترتيب وأسماء أدواتها.', 'Arabic coffee', 'Write the steps of making Arabic coffee in order, and the names of its tools.', 90, '', 'maj', 'rank', 'ورقة وقلم لكل مجموعة'],
    [C, 'المثل وقصته', 'تذكر المجموعة مثلًا شعبيًا وتحكي قصته باختصار.', 'A proverb’s story', 'The group names a proverb and tells its story briefly.', 120, '', 'maj', 'judge', ''],
    [C, 'المحاورة', 'يقول المدير بيتًا من الشعر الشعبي، وكل مجموعة تردّ ببيت على القافية نفسها.', 'Verse duel', 'The host says a line of folk verse; each group answers with a line on the same rhyme.', 120, '', 'maj', 'judge', ''],
    [M, 'أصوات البر', 'تقلّد المجموعة أصوات حيوانات البر، والبقية يخمّنون.', 'Desert sounds', 'The group imitates desert animals; the others guess.', 90, '', 'maj', 'rank', ''],
    [Z, 'السوق القديم', 'اذكروا أكبر عدد من البضائع والمهن في الأسواق الشعبية القديمة.', 'The old market', 'Name as many goods and trades of the old markets as you can.', 60, '', 'maj', 'rank', 'ورقة وقلم لكل مجموعة'],
    [M, 'جامع الحطب', 'اجمعوا أكبر عدد من الأعواد الجافة الصغيرة خلال الوقت.', 'Firewood', 'Gather as many small dry sticks as you can in the time.', 120, '', 'bar', 'rank', ''],
    [C, 'لوحة الرمل', 'ارسموا على الرمل أو بالحصى لوحة جميلة، والحكم يختار الأجمل.', 'Sand picture', 'Draw a picture in the sand or with pebbles; the judge picks the best.', 180, '', 'bar', 'judge', ''],
    [M, 'رمي الحصاة', 'يرمي كل عضو حصاة نحو دائرة مرسومة، والأقرب يكسب لمجموعته.', 'Pebble toss', 'Each member throws a pebble at a drawn circle; the closest scores for the group.', 120, '', 'bar', 'rank', 'دائرة مرسومة على الأرض'],
    [M, 'سباق الأكياس', 'سباق تتابع بالقفز داخل الأكياس.', 'Sack race', 'A relay race hopping in sacks.', 120, '', 'bar', 'rank', 'أكياس كبيرة'],
    [Z, 'نجوم الليل', 'اذكروا أسماء النجوم والمنازل والطوالع التي يعرفها أهل البر.', 'Night stars', 'Name the stars and seasons desert people know.', 90, '', 'bar', 'rank', 'ورقة وقلم لكل مجموعة'],
    [K, 'شد الحبل', 'مجموعتان تتنافسان في شد الحبل، والفائزة تلاقي التالية.', 'Tug of war', 'Two groups pull; the winner meets the next.', 120, '', 'bar', 'rank', 'حبل متين'],
    [Z, 'حقيقتان وكذبة', 'يقول عضو ثلاث معلومات عن نفسه إحداها غير صحيحة، والمجموعات الأخرى تكتشفها.', 'Two truths and a lie', 'A member says three things about themselves, one untrue; the others find it.', 180, '', 'wrk', 'judge', ''],
    [C, 'فكرة في دقيقة', 'اقترحوا فكرة لتحسين بيئة العمل وقدّموها في دقيقة واحدة.', 'An idea in a minute', 'Propose an idea to improve the workplace and pitch it in one minute.', 180, '', 'wrk', 'judge', ''],
    [K, 'البرج الهندسي', 'ابنوا أعلى برج يقف وحده من المعكرونة غير المطبوخة والشريط اللاصق.', 'Spaghetti tower', 'Build the tallest standing tower from dry spaghetti and tape.', 240, '', 'wrk', 'rank', 'معكرونة غير مطبوخة وشريط لاصق'],
    [C, 'عرض المصعد', 'اعرضوا منتجًا من خيالكم في ثلاثين ثانية كأنكم في مصعد مع مستثمر.', 'Elevator pitch', 'Pitch an imagined product in thirty seconds, as if in a lift with an investor.', 120, '', 'wrk', 'judge', ''],
    [Z, 'أولويات النجاة', 'رتّبوا عشرة أشياء يحتاجها تائه في الصحراء من الأهم إلى الأقل.', 'Survival order', 'Rank ten things someone lost in the desert needs, most to least.', 180, '', 'wrk', 'judge', 'ورقة وقلم لكل مجموعة'],
    [K, 'الرسالة المنقولة', 'يهمس المدير جملة للأول، فتنتقل همسًا حتى الأخير الذي يقولها بصوت عالٍ. الأدق يفوز.', 'Whisper chain', 'The host whispers a sentence to the first; it passes on to the last, who says it aloud. Most exact wins.', 90, '', 'wrk', 'rank', '']
  ]; };

  /* ---------- challenges: the bank, the evening's own (from the AI), and the host's own; each scored by place or by the judge ---------- */
  const MAT = { 'الطائرة الورقية': 'أوراق A4', 'البرج': 'أوراق وأقلام', 'الكرة الورقية': 'ورقة', 'خريطة المملكة': 'ورق وأقلام', 'شعار المجموعة': 'ورق وأقلام ملونة', 'رسّام المجموعة': 'سبورة أو ورق وأقلام', 'الرسم الأعمى': 'ورق وأقلام', 'المطاردة': '', 'بيتان من الشعر': 'ورقة وقلم', 'القصة الجماعية': '', 'مدن المملكة': 'ورقة وقلم لكل مجموعة', 'حرف الميم': 'ورقة وقلم لكل مجموعة', 'أكلاتنا': 'ورقة وقلم لكل مجموعة', 'حيوانات الصحراء': 'ورقة وقلم لكل مجموعة', 'دول بحرف السين': 'ورقة وقلم لكل مجموعة', 'ذاكرة الشاشة': 'ورقة وقلم لكل مجموعة', 'كلمات من كلمة': 'ورقة وقلم لكل مجموعة', 'أشياء مشتركة': 'ورقة وقلم لكل مجموعة', 'سؤال للمنافس': 'ورقة وقلم لكل مجموعة' };
  const myChal = () => { try { return JSON.parse(localStorage.getItem('dw.mych') || '[]'); } catch (e) { return []; } };
  function pool() {
    const C = T('إبداع', 'Create');
    const bank = CHAL().map((c, i) => Object.assign({ key: 'b' + i, sc: c.sc0 || (c.cat === C ? 'judge' : 'rank'), mat: isAr() ? (c.mat0 || MAT[c.t] || '') : '' }, c));
    const own = (D.ch || []).map((c, i) => Object.assign({ sc: 'judge', s: 90, cat: T('تحدي الأمسية', 'This evening'), x: '' }, c, { key: 'q' + i }));
    const mine = myChal().map((c, i) => Object.assign({ sc: 'judge', s: 90, cat: T('تحدياتك', 'Yours'), x: '' }, c, { key: 'm' + i }));
    return own.concat(mine, bank);
  }
  const byKey = k => pool().find(c => c.key === k);
  // fill the evening's challenges up to the count: the evening's own first, then the bank at random
  function fillChal(n) {
    const P = pool(), keep = (D.chosen || []).filter(k => P.some(c => c.key === k)).slice(0, n);
    const own = P.filter(c => c.key.charAt(0) === 'q' && !keep.includes(c.key)), pk = D.cfg.pack || '', bank = shuf(P.filter(c => c.key.charAt(0) === 'b' && !keep.includes(c.key))).sort((a, b) => (pk ? (b.pk === pk) - (a.pk === pk) : (a.pk ? 1 : 0) - (b.pk ? 1 : 0)));
    while (keep.length < n && own.length) keep.push(own.shift().key);
    while (keep.length < n && bank.length) keep.push(bank.shift().key);
    D.chosen = keep;
  }
  function chalBox() {
    const L = D.chosen.map(byKey).filter(Boolean), mats = [...new Set(L.map(c => (c.mat || '').trim()).filter(Boolean))];
    return `${L.length ? `<ol class="dw-chl">${L.map((c, i) => `<li><span><b dir="auto">${esc(c.t)}</b><small>${esc(c.cat)} · ${NUM(c.s)} ${T('ثانية', 's')} · ${c.sc === 'judge' ? T('درجات الحكم', 'judge’s marks') : T('بالترتيب', 'by place')}${c.mat ? ' · ' + T('يحتاج: ', 'needs: ') + esc(c.mat) : ''}${c.alt ? ' · ' + T('البديل: ', 'or: ') + esc(c.alt) : ''}</small></span><button type="button" data-cs="${i}" title="${T('بدّله', 'Swap')}">${IC.swap}</button><button type="button" data-cx="${i}" title="${T('احذفه', 'Remove')}">${IC.x}</button></li>`).join('')}</ol>` : ''}
      ${mats.length ? `<p class="dw-mats"><b>${T('جهّز قبل الأمسية', 'Prepare beforehand')}:</b> ${mats.map(esc).join(T('، ', ', '))}</p>` : ''}
      <button type="button" class="dw-add" data-cadd>+ ${T('أضف تحديًا من عندك', 'Add your own challenge')}</button>`;
  }
  function chalBind(again) {
    el.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { const i = +b.dataset.cs, cur = D.chosen[i], P = shuf(pool().filter(c => !D.chosen.includes(c.key) && c.key !== cur)); if (P.length) D.chosen[i] = P[0].key; again(); });
    el.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { D.chosen.splice(+b.dataset.cx, 1); D.cfg.r.chal = D.chosen.length; again(); });
    const a = el.querySelector('[data-cadd]'); if (a) a.onclick = () => chalForm(again);
  }
  // the host's own challenge: a game, an activity, a scene to act, a contest outside — with its time, how it is scored and what it needs
  function chalForm(again) {
    const d = document.createElement('div'); d.className = 'dw-modal'; el.appendChild(d);
    d.innerHTML = `<div class="dw-mbox"><h3>${T('تحدٍّ من عندك', 'Your own challenge')}</h3>
      <label>${T('العنوان', 'Title')}<input data-f="t" maxlength="40" dir="auto" placeholder="${T('مثال: سباق الملاعق', 'e.g. Spoon race')}"></label>
      <label>${T('التعليمات كما تظهر على الشاشة', 'Instructions as shown on the screen')}<textarea data-f="d" rows="3" dir="auto" maxlength="240"></textarea></label>
      <div class="dw-two"><label>${T('الوقت', 'Time')}<select data-f="s">${[30, 45, 60, 90, 120, 180, 300].map(v => `<option value="${v}"${v === 90 ? ' selected' : ''}>${v < 60 ? NUM(v) + T(' ثانية', ' s') : NUM(v / 60) + T(' دقيقة', ' min')}</option>`).join('')}</select></label>
        <label>${T('الاحتساب', 'Scoring')}<select data-f="sc"><option value="judge">${T('درجات يضعها الحكم', 'Marks from the judge')}</option><option value="rank">${T('بترتيب الفوز', 'By place')}</option></select></label></div>
      <label>${T('يحتاج (اختياري)', 'Needs (optional)')}<input data-f="mat" maxlength="60" dir="auto" placeholder="${T('مثال: ملاعق وليمون', 'e.g. spoons and lemons')}"></label>
      <div class="dw-acts"><button type="button" class="dw-btn" data-ok>${T('أضفه', 'Add it')}</button><button type="button" class="dw-btn ghost" data-no>${T('إلغاء', 'Cancel')}</button></div></div>`;
    const f = k => d.querySelector(`[data-f="${k}"]`);
    d.querySelector('[data-no]').onclick = () => d.remove();
    d.querySelector('[data-ok]').onclick = () => {
      const c = { t: f('t').value.trim(), d: f('d').value.trim(), s: +f('s').value, sc: f('sc').value, mat: f('mat').value.trim() }; if (!c.t) return f('t').focus();
      const L = myChal(); L.unshift(c); try { localStorage.setItem('dw.mych', JSON.stringify(L.slice(0, 60))); } catch (e) {}
      d.remove(); D.chosen.unshift('m0'); D.chosen = D.chosen.map((k, i) => i && k.charAt(0) === 'm' ? 'm' + (+k.slice(1) + 1) : k); D.cfg.r.chal = D.chosen.length; again();
    };
  }
  // the judge's marks: a number for each group, quick to set
  function judgeBox(st, done) {
    const f = el.querySelector('#dwFoot'); st.marks = st.marks || D.groups.map(() => 0); const mx = st.max || 100;
    const paint = () => { f.innerHTML = `<div class="dw-judge"><p>${T('ضع درجة كل مجموعة', 'Mark each group')} <small>(${T('من', 'out of')} ${NUM(mx)})</small></p><div>${D.groups.map((g, k) => `<div class="dw-jr" style="--c:${g.col}"><b dir="auto">${esc(g.name)}</b><button type="button" data-jm="${k}">−</button><input type="number" inputmode="numeric" min="0" max="${mx}" step="5" data-jv="${k}" value="${st.marks[k]}"><button type="button" data-jp="${k}">+</button></div>`).join('')}</div></div>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main data-jok>${T('اعتمد الدرجات', 'Confirm the marks')}</button><button type="button" class="dw-btn ghost" data-jrank>${T('احسبها بالترتيب', 'Score by place instead')}</button></div>`;
      const set = (k, v) => { st.marks[k] = Math.max(0, Math.min(mx, Math.round(v))); const i = f.querySelector(`[data-jv="${k}"]`); if (i) i.value = st.marks[k]; };
      f.querySelectorAll('[data-jm]').forEach(b => b.onclick = () => set(+b.dataset.jm, st.marks[+b.dataset.jm] - 10));
      f.querySelectorAll('[data-jp]').forEach(b => b.onclick = () => set(+b.dataset.jp, st.marks[+b.dataset.jp] + 10));
      f.querySelectorAll('[data-jv]').forEach(i => i.oninput = () => { st.marks[+i.dataset.jv] = Math.max(0, Math.min(mx, +i.value || 0)); });
      f.querySelector('[data-jok]').onclick = () => done(st.marks);
      f.querySelector('[data-jrank]').onclick = () => { st.sc = 'rank'; st.again(); };
    };
    paint();
  }

  /* ---------- the categories board, like the «حروف» book: the group on turn picks a category and a value ---------- */
  function boardTiles(n, rest, hr) {
    const cats = {}; rest.forEach(x => { const c = (x.cat || '').trim(); if (c && (!hr || (['mc', 'word'].includes(x.type) && letterOf(x)))) (cats[c] = cats[c] || []).push(x); });
    const names = Object.keys(cats).filter(c => cats[c].length).slice(0, 6); if (names.length < 2) return [];
    names.forEach(c => cats[c].sort((a, b) => (a.lv || 2) - (b.lv || 2)));
    const tiles = []; let r = 0;
    while (tiles.length < n && names.some(c => cats[c].length)) { names.forEach(c => { if (tiles.length < n && cats[c].length) { const x = cats[c].shift(); rest.splice(rest.indexOf(x), 1); tiles.push({ cat: c, x, v: 100 * (x.lv || Math.min(4, r + 1)), used: false }); } }); r++; }
    tiles.forEach(t => { t.v = Math.max(100, Math.min(400, t.v)); if (hr) t.letter = letterOf(t.x); });
    return tiles;
  }
  const pickHead = g => D.pickBy != null ? `<span dir="auto" style="color:${D.groups[D.pickBy].col}">${esc(D.groups[D.pickBy].name)}</span> ${T('تختار لـ', 'picks for')} <span dir="auto">${esc(g.name)}</span>` : `${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span>`;
  function boardPick(s) {
    const g = D.groups[s.g], cats = [...new Set(D.tiles.map(t => t.cat))];
    if (D.pickBy == null) { D.cur = { kind: 'intro', team: s.g, s }; pub({ ph: 'intro', team: s.g, i: D.t }); }
    shell(`${board(s.g)}<div class="dw-mid dw-bd" style="--c:${g.col}"><h2>${pickHead(g)}</h2><p>${T('اختاروا الفئة والقيمة: كلما زادت القيمة صعب السؤال وكثرت النقاط', 'Pick a category and a value: the higher, the harder and the more points')}</p>
      <div class="dw-grid" style="--n:${cats.length}">${cats.map(c => `<div class="dw-col"><h3 dir="auto">${esc(c)}</h3>${D.tiles.map((t, i) => t.cat === c ? `<button type="button" data-tile="${i}"${t.used ? ' disabled' : ''}>${t.used ? '' : NUM(t.v)}</button>` : '').join('')}</div>`).join('')}</div></div>`, 'dw-in');
    el.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => { const t = D.tiles[+b.dataset.tile]; t.used = true; s.x = t.x; s.val = t.v; s.cat = t.cat; D.pickBy = null; SND.go(); ask(); });
  }

  /* ---------- «حروف»: category, then a letter (the first letter of the answer), then a number ---------- */
  const normL = ch => ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه' }[ch] || ch);
  function letterOf(x) {
    if (x.letter) return normL(String(x.letter).trim().charAt(0));
    const a = String(isMC(x) ? x.opts[x.ok[0]] || '' : x.ans == null ? '' : x.ans).trim().replace(/^(ال|AL\s)/i, '');
    const c = a.charAt(0); return /[؀-ۿA-Za-z]/.test(c) ? normL(c.toUpperCase()) : '';
  }
  function huroof(s) {
    if (D.pickBy == null) { D.cur = { kind: 'intro', team: s.g, s }; pub({ ph: 'intro', team: s.g, i: D.t }); }
    const g = D.groups[s.g], open = D.tiles.filter(t => !t.used && t.letter), head = (sub, inner, crumbs) => shell(`${board(s.g)}<div class="dw-mid dw-bd dw-hr" style="--c:${g.col}"><h2>${pickHead(g)}</h2>${crumbs ? `<p class="dw-crumb">${crumbs}</p>` : ''}<p>${sub}</p>${inner}</div>`, 'dw-in');
    const pickCat = () => { const cats = [...new Set(open.map(t => t.cat))];
      head(T('اختاروا الفئة', 'Pick a category'), `<div class="dw-hbtns">${cats.map(c => `<button type="button" data-hc="${esc(c)}" dir="auto">${esc(c)}<small>${NUM(open.filter(t => t.cat === c).length)}</small></button>`).join('')}</div>`);
      el.querySelectorAll('[data-hc]').forEach(b => b.onclick = () => { SND.tick(); pickLetter(b.dataset.hc); }); };
    const pickLetter = cat => { const L = [...new Set(open.filter(t => t.cat === cat).map(t => t.letter))].sort((a, b) => a.localeCompare(b, 'ar'));
      head(T('اختاروا الحرف: إجابة السؤال تبدأ به', 'Pick a letter: the answer starts with it'), `<div class="dw-hbtns dw-hl">${L.map(l => `<button type="button" data-hl="${esc(l)}">${esc(l)}</button>`).join('')}</div><button type="button" class="dw-btn ghost" data-back>${T('رجوع', 'Back')}</button>`, esc(cat));
      el.querySelectorAll('[data-hl]').forEach(b => b.onclick = () => { SND.tick(); pickNum(cat, b.dataset.hl); }); el.querySelector('[data-back]').onclick = pickCat; };
    const pickNum = (cat, l) => { const ts = open.filter(t => t.cat === cat && t.letter === l);
      head(T('اختاروا رقمًا', 'Pick a number'), `<div class="dw-hbtns dw-hn">${ts.map((t, i) => `<button type="button" data-hn="${D.tiles.indexOf(t)}">${NUM(i + 1)}</button>`).join('')}</div><button type="button" class="dw-btn ghost" data-back>${T('رجوع', 'Back')}</button>`, `${esc(cat)} › ${esc(l)}`);
      el.querySelectorAll('[data-hn]').forEach(b => b.onclick = () => { const t = D.tiles[+b.dataset.hn]; t.used = true; s.x = t.x; s.val = t.v; s.cat = `${t.cat} › ${t.letter}`; D.pickBy = null; SND.go(); ask(); }); el.querySelector('[data-back]').onclick = () => pickLetter(cat); };
    if (!open.length) return go();
    pickCat();
  }

  /* ---------- the closing wager: each group stakes part of its points on one last question ---------- */
  function wager(s) {
    const x = s.x, bets = D.groups.map(g => Math.min(g.score, Math.round(g.score / 2 / 10) * 10));
    const paint = () => {
      shell(`${board(-1)}<div class="dw-mid dw-wg"><p class="dw-sub">${T('الختام', 'The finale')}</p><h2>${T('المراهنة الختامية', 'The final wager')}</h2><p>${T('سؤال أخير واحد. كل مجموعة تراهن على جزء من نقاطها: إن أصابت كسبته، وإن أخطأت خسرته. الفئة', 'One last question. Each group stakes part of its points: right wins it, wrong loses it. Category')}: <b dir="auto">${esc(x.cat || T('عامة', 'General'))}</b></p>
        <div class="dw-judge"><div>${D.groups.map((g, k) => `<div class="dw-jr" style="--c:${g.col}"><b dir="auto">${esc(g.name)} <small>${NUM(g.score)}</small></b><button type="button" data-bm="${k}">−</button><input type="number" min="0" max="${g.score}" step="10" data-bv="${k}" value="${bets[k]}"><button type="button" data-bp="${k}">+</button><button type="button" class="dw-all" data-ba="${k}">${T('الكل', 'All')}</button></div>`).join('')}</div></div>
        <button type="button" class="dw-btn" data-main>${T('اعرض السؤال', 'Show the question')}</button></div>`, 'dw-in');
      const set = (k, v) => { bets[k] = Math.max(0, Math.min(D.groups[k].score, Math.round(v))); const i = el.querySelector(`[data-bv="${k}"]`); if (i) i.value = bets[k]; };
      el.querySelectorAll('[data-bm]').forEach(b => b.onclick = () => set(+b.dataset.bm, bets[+b.dataset.bm] - 50));
      el.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => set(+b.dataset.bp, bets[+b.dataset.bp] + 50));
      el.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => set(+b.dataset.ba, D.groups[+b.dataset.ba].score));
      el.querySelectorAll('[data-bv]').forEach(i => i.oninput = () => { bets[+i.dataset.bv] = Math.max(0, Math.min(D.groups[+i.dataset.bv].score, +i.value || 0)); });
      el.querySelector('[data-main]').onclick = () => { s.bets = bets.slice(); askAll(s); };
    };
    paint();
  }

  /* ---------- the evening by its length: counts that fit the minutes you have ---------- */
  const MIN = { all: 1.2, board: 1.5, turn: 1.3, buzz: 1, chal: 2.5 };
  // the three core rounds sized to the minutes: speed questions first, then turns, then challenges
  function fitCore(c, n, P, mc, minutes) {
    const r = Object.assign({ all: 0, board: 0 }, c.r || defRounds(n, P, mc, 0)); r.all = c.ext ? r.all || 0 : 0; r.board = c.ext ? r.board || 0 : 0;
    const q = () => r.turn * n + r.buzz + r.all + r.board; let guard = 300;
    while (estimate(r, n) < minutes - 2 && guard--) { if (r.buzz < mc && q() < P && r.buzz <= r.turn * n + 4) r.buzz++; else if (q() + n <= P && r.turn < 6) r.turn++; else if (r.buzz < mc && q() < P) r.buzz++; else if (r.chal < 10) r.chal++; else break; }
    while (estimate(r, n) > minutes + 2 && guard--) { if (r.chal > 1 && r.chal * MIN.chal > minutes / 3) r.chal--; else if (r.buzz > 3) r.buzz--; else if (r.turn > 1) r.turn--; else if (r.chal) r.chal--; else if (r.buzz) r.buzz--; else break; }
    while (q() > P && guard--) { if (r.buzz > 0 && r.buzz >= r.turn * n) r.buzz--; else if (r.turn) r.turn--; else if (r.buzz) r.buzz--; else if (r.all) r.all--; else if (r.board) r.board--; else break; }
    r.buzz = Math.min(r.buzz, mc); return r;
  }
  function fitTime(c, n, P, mc, minutes) {
    if (!c.ext) return fitCore(c, n, P, mc, minutes);
    const r = Object.assign({}, c.r), need = () => MIN.all * r.all + MIN.board * (r.board || 0) + MIN.turn * r.turn * n + MIN.buzz * r.buzz + MIN.chal * r.chal + 3;
    let guard = 200;
    while (need() < minutes - 2 && guard--) { const q = r.all + (r.board || 0) + r.turn * n + r.buzz; if (q < P) { if ((r.board || 0) && r.board < 48 && r.board <= r.all) r.board++; else if (r.buzz < mc && r.buzz <= r.all) r.buzz++; else r.all++; } else if (r.chal < 10) r.chal++; else break; }
    while (need() > minutes + 2 && guard--) { if (r.chal > 1 && r.chal * MIN.chal > minutes / 3) r.chal--; else if (r.turn) r.turn--; else if (r.all >= r.buzz && r.all > 1) r.all--; else if (r.buzz > 1) r.buzz--; else if ((r.board || 0) > 3) r.board--; else if (r.chal) r.chal--; else break; }
    while (r.all + (r.board || 0) + r.turn * n + r.buzz > P && guard--) { if (r.turn) r.turn--; else if (r.all >= r.buzz && r.all) r.all--; else if (r.buzz) r.buzz--; else if (r.board) r.board--; else break; }
    return r;
  }
  const estimate = (r, n) => Math.round(MIN.all * r.all + MIN.board * (r.board || 0) + MIN.turn * r.turn * n + MIN.buzz * r.buzz + MIN.chal * r.chal + 3);

  /* ---------- the Dawwara editor: write the questions and challenges yourself, or review what the AI wrote, before playing ---------- */
  const saveQuiz = z => { try { const L = JSON.parse(localStorage.getItem('qz.list') || '[]'), i = L.findIndex(x => x.id === z.id); z.at = Date.now(); if (i >= 0) L[i] = z; else L.unshift(z); localStorage.setItem('qz.list', JSON.stringify(L)); return true; } catch (e) { return false; } };
  const LV = () => [[1, T('سهل', 'Easy')], [2, T('متوسط', 'Medium')], [3, T('صعب', 'Hard')]];
  const KIND = () => [['mc', T('اختيار من متعدد', 'Multiple choice')], ['tf', T('صح أو خطأ', 'True or false')], ['num', T('جوابه رقم', 'A number')], ['word', T('جوابه كلمة', 'A word')]];
  const blankQ = cat => ({ cat: cat || '', lv: 2, type: 'mc', q: '', opts: ['', '', '', ''], ok: [0], time: 30 });
  function editor(root, z, back) {
    z = JSON.parse(JSON.stringify(z || { id: Math.random().toString(36).slice(2, 10), title: '', qs: [], ch: [], src: 'dw' }));
    z.qs = (z.qs || []).filter(x => KINDS.includes(x.type)).map(x => Object.assign({ cat: '', lv: 2 }, x, x.type === 'mc' ? { opts: (x.opts || []).concat(['', '', '', '']).slice(0, Math.max(4, (x.opts || []).length)) } : {}));
    z.ch = z.ch || [];
    let tab = 'q', filt = '', tSave = null;
    const later = () => { clearTimeout(tSave); tSave = setTimeout(() => { saveQuiz(z); const s = root.querySelector('#deSaved'); if (s) s.textContent = T('تم الحفظ', 'Saved'); }, 500); };
    const cats = () => [...new Set(z.qs.map(x => (x.cat || '').trim()).filter(Boolean))];
    const ok = x => usable(x);
    const qCard = (x, i) => `<div class="de-q${ok(x) ? '' : ' bad'}" data-i="${i}">
      <div class="de-row"><input data-k="cat" list="deCats" dir="auto" value="${esc(x.cat || '')}" placeholder="${T('الفئة', 'Category')}"><select data-k="lv">${LV().map(([v, l]) => `<option value="${v}"${(x.lv || 2) === v ? ' selected' : ''}>${l}</option>`).join('')}</select><select data-k="type">${KIND().map(([v, l]) => `<option value="${v}"${x.type === v ? ' selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="de-x" data-del title="${T('احذف', 'Delete')}">${IC.x}</button></div>
      <textarea data-k="q" rows="2" dir="auto" placeholder="${T('اكتب السؤال', 'Write the question')}">${esc(x.q || '')}</textarea>
      ${x.type === 'mc' ? `<div class="de-opts">${x.opts.map((o, j) => `<label class="${x.ok.includes(j) ? 'on' : ''}"><input type="radio" name="ok${i}" data-ok="${j}"${x.ok.includes(j) ? ' checked' : ''} title="${T('الإجابة الصحيحة', 'The right answer')}"><i>${LET()[j]}</i><input data-o="${j}" dir="auto" value="${esc(o || '')}" placeholder="${T('خيار', 'Option')}"></label>`).join('')}</div><p class="de-tip">${T('اضغط الدائرة بجانب الإجابة الصحيحة', 'Tick the circle beside the right answer')}</p>`
        : x.type === 'tf' ? `<div class="de-tf">${[T('صح', 'True'), T('خطأ', 'False')].map((l, j) => `<label class="${x.ok[0] === j ? 'on' : ''}"><input type="radio" name="ok${i}" data-tf="${j}"${x.ok[0] === j ? ' checked' : ''}> ${l}</label>`).join('')}</div>`
        : `<div class="de-row"><input data-k="ans" dir="auto" value="${esc(x.ans == null ? '' : x.ans)}" placeholder="${x.type === 'num' ? T('الرقم الصحيح', 'The right number') : T('الكلمة الصحيحة', 'The right word')}">${x.type === 'num' ? `<input data-k="unit" dir="auto" value="${esc(x.unit || '')}" placeholder="${T('الوحدة (اختياري)', 'Unit (optional)')}">` : ''}</div>`}</div>`;
    const cCard = (c, i) => `<div class="de-q${c.t && c.d ? '' : ' bad'}" data-c="${i}">
      <div class="de-row"><input data-ck="t" dir="auto" value="${esc(c.t || '')}" placeholder="${T('عنوان التحدي', 'Challenge title')}"><select data-ck="s">${[30, 45, 60, 90, 120, 180, 300, 600].map(v => `<option value="${v}"${(c.s || 90) === v ? ' selected' : ''}>${v < 60 ? NUM(v) + T(' ثانية', ' s') : NUM(v / 60) + T(' دقيقة', ' min')}</option>`).join('')}</select><select data-ck="sc"><option value="rank"${c.sc === 'rank' ? ' selected' : ''}>${T('بالترتيب', 'By place')}</option><option value="judge"${c.sc !== 'rank' ? ' selected' : ''}>${T('درجات الحكم', 'Judge’s marks')}</option></select><button type="button" class="de-x" data-cdel title="${T('احذف', 'Delete')}">${IC.x}</button></div>
      <textarea data-ck="d" rows="2" dir="auto" placeholder="${T('التعليمات كما تظهر على الشاشة', 'Instructions as shown on the screen')}">${esc(c.d || '')}</textarea>
      <div class="de-row"><input data-ck="mat" dir="auto" value="${esc(c.mat || '')}" placeholder="${T('يحتاج (أدوات)', 'Needs (items)')}"><input data-ck="alt" dir="auto" value="${esc(c.alt || '')}" placeholder="${T('بديل أسهل إن لم تتوفر', 'An easier option if not')}"></div></div>`;
    const paint = () => {
      const C = cats(), shown = z.qs.map((x, i) => [x, i]).filter(([x]) => !filt || (x.cat || '') === filt), good = z.qs.filter(ok).length;
      root.innerHTML = `<div class="de"><div class="de-top"><button type="button" class="sn-lnk" data-back>‹ ${T('رجوع', 'Back')}</button><span id="deSaved" class="de-saved"></span></div>
        <input class="de-title" data-title dir="auto" value="${esc(z.title || '')}" placeholder="${T('عنوان الأمسية', 'The evening’s title')}">
        <div class="dw-tabs"><button type="button" data-t="q" aria-selected="${tab === 'q'}">${T('الأسئلة', 'Questions')} (${NUM(z.qs.length)})</button><button type="button" data-t="c" aria-selected="${tab === 'c'}">${T('التحديات', 'Challenges')} (${NUM(z.ch.length)})</button></div>
        ${tab === 'q' ? `${C.length > 1 ? `<div class="de-cats"><button type="button" data-f="" aria-pressed="${!filt}">${T('الكل', 'All')}</button>${C.map(c => `<button type="button" data-f="${esc(c)}" aria-pressed="${filt === c}" dir="auto">${esc(c)} <small>${NUM(z.qs.filter(x => x.cat === c).length)}</small></button>`).join('')}</div>` : ''}
          <datalist id="deCats">${C.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
          <div class="de-list">${shown.map(([x, i]) => qCard(x, i)).join('') || `<p class="dw-pane-h">${T('لا أسئلة بعد. أضف سؤالًا أو اطلبها من الذكاء الاصطناعي.', 'No questions yet. Add one, or ask the AI.')}</p>`}</div>
          <div class="de-add"><button type="button" class="btn ghost" data-addq>+ ${T('سؤال', 'Question')}</button><button type="button" class="btn ghost" data-aiq>${T('+ أسئلة بالذكاء الاصطناعي', '+ Questions with AI')}</button></div>`
        : `<div class="de-list">${z.ch.map(cCard).join('') || `<p class="dw-pane-h">${T('لا تحديات بعد. أضف تحديًا من عندك أو من البنك.', 'No challenges yet. Add your own or one from the bank.')}</p>`}</div>
          <div class="de-add"><button type="button" class="btn ghost" data-addc>+ ${T('تحدٍّ من عندك', 'Your own challenge')}</button><button type="button" class="btn ghost" data-bank>+ ${T('من بنك التحديات', 'From the bank')}</button></div>`}
        <div class="de-bar"><span>${T(`أسئلة جاهزة: ${NUM(good)} من ${NUM(z.qs.length)} · تحديات: ${NUM(z.ch.length)}`, `Ready: ${good} of ${z.qs.length} questions · ${z.ch.length} challenges`)}</span><button type="button" class="dw-btn" data-play${good + z.ch.length ? '' : ' disabled'}>${z.tpl ? T('موافق، التالي ▶', 'OK, next ▶') : T('العب الآن ▶', 'Play now ▶')}</button></div></div>`;
      bind();
    };
    const q = s => root.querySelector(s);
    function bind() {
      q('[data-back]').onclick = () => { saveQuiz(z); back(); };
      q('[data-title]').oninput = e => { z.title = e.target.value; later(); };
      root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
      root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; paint(); });
      q('[data-play]').onclick = () => { saveQuiz(z); start({ title: z.title || T('أمسية دوّارة', 'A Dawwara evening'), qs: JSON.parse(JSON.stringify(z.qs.filter(ok))), ch: z.ch.filter(c => c.t && c.d), tpl: z.tpl }); };
      root.querySelectorAll('.de-q[data-i]').forEach(card => { const x = z.qs[+card.dataset.i], mark = () => card.classList.toggle('bad', !ok(x));
        card.querySelectorAll('[data-k]').forEach(f => { f[f.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => { const k = f.dataset.k;
          if (k === 'lv') x.lv = +f.value; else if (k === 'type') { x.type = f.value; if (x.type === 'tf') { x.opts = [T('صح', 'True'), T('خطأ', 'False')]; x.ok = [0]; } else if (x.type === 'mc') { x.opts = ['', '', '', '']; x.ok = [0]; } else { x.opts = ['', '']; x.ok = []; } later(); return paint(); }
          else if (k === 'ans') x.ans = x.type === 'num' ? (f.value.trim() === '' ? '' : +f.value) : f.value; else x[k] = f.value; mark(); later(); }; });
        card.querySelectorAll('[data-o]').forEach(f => f.oninput = () => { x.opts[+f.dataset.o] = f.value; mark(); later(); });
        card.querySelectorAll('[data-ok]').forEach(f => f.onchange = () => { x.ok = [+f.dataset.ok]; card.querySelectorAll('.de-opts label').forEach((l, j) => l.classList.toggle('on', j === +f.dataset.ok)); mark(); later(); });
        card.querySelectorAll('[data-tf]').forEach(f => f.onchange = () => { x.ok = [+f.dataset.tf]; card.querySelectorAll('.de-tf label').forEach((l, j) => l.classList.toggle('on', j === +f.dataset.tf)); later(); });
        card.querySelector('[data-del]').onclick = () => { z.qs.splice(z.qs.indexOf(x), 1); later(); paint(); };
      });
      root.querySelectorAll('.de-q[data-c]').forEach(card => { const c = z.ch[+card.dataset.c];
        card.querySelectorAll('[data-ck]').forEach(f => { f[f.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => { const k = f.dataset.ck; c[k] = k === 's' ? +f.value : f.value; card.classList.toggle('bad', !(c.t && c.d)); later(); }; });
        card.querySelector('[data-cdel]').onclick = () => { z.ch.splice(z.ch.indexOf(c), 1); later(); paint(); };
      });
      const aq = q('[data-addq]'); if (aq) aq.onclick = () => { z.qs.push(blankQ(filt)); paint(); const t = root.querySelectorAll('.de-q textarea'); if (t.length) { t[t.length - 1].focus(); t[t.length - 1].scrollIntoView({ block: 'center' }); } };
      const ac = q('[data-addc]'); if (ac) ac.onclick = () => { z.ch.push({ t: '', d: '', s: 90, sc: 'judge', mat: '', alt: '' }); paint(); const t = root.querySelectorAll('.de-q [data-ck="t"]'); if (t.length) t[t.length - 1].focus(); };
      const bk = q('[data-bank]'); if (bk) bk.onclick = () => bankPick(c => { z.ch.push({ t: c.t, d: c.d, s: c.s, sc: c.sc0 || 'rank', mat: c.mat0 || MAT[c.t] || '', alt: '' }); later(); paint(); });
      const ai = q('[data-aiq]'); if (ai) ai.onclick = () => aiMore(z, () => { later(); paint(); });
    }
    paint();
  }
  // a challenge from the bank, by occasion
  function bankPick(done) {
    const d = document.createElement('div'); d.className = 'qz-modal de-modal'; document.body.appendChild(d); let pk = '';
    const ALL = CHAL(); const paint = () => { const L = ALL.map((c, i) => [c, i]).filter(([c]) => !pk || c.pk === pk || (pk === 'gen' && !c.pk));
      d.innerHTML = `<div class="qz-mbox de-bank"><h3>${T('بنك التحديات', 'The challenge bank')}</h3><div class="de-cats">${[['', T('الكل', 'All')], ['gen', T('عامة', 'General')]].concat(PACK().slice(1)).map(([v, l]) => `<button type="button" data-pk="${v}" aria-pressed="${pk === v}">${l}</button>`).join('')}</div>
        <div class="de-blist">${L.map(([c, i]) => `<button type="button" data-b="${i}"><b dir="auto">${esc(c.t)}</b><small dir="auto">${esc(c.d)}</small></button>`).join('')}</div><button type="button" class="btn ghost" data-x>${T('إغلاق', 'Close')}</button></div>`;
      d.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { pk = b.dataset.pk; paint(); });
      d.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { d.remove(); done(ALL[+b.dataset.b]); });
      d.querySelector('[data-x]').onclick = () => d.remove(); };
    paint();
  }
  // more questions from the AI, added to what is there
  function aiMore(z, done) {
    const d = document.createElement('div'); d.className = 'qz-modal de-modal'; document.body.appendChild(d);
    d.innerHTML = `<div class="qz-mbox"><h3>${T('أسئلة بالذكاء الاصطناعي', 'Questions with AI')}</h3><p class="pt-fine">${T('تُضاف إلى أسئلتك ولا تحذف شيئًا، وتراجعها هنا.', 'They are added to yours, nothing removed; review them here.')}</p>
      <textarea id="amT" rows="3" dir="auto" placeholder="${T('الموضوع، أو الصق المحتوى (درس، فصل، مقال)', 'The topic, or paste the content (a lesson, a chapter)')}"></textarea>
      <div class="dw-two"><label>${T('الفئات', 'Categories')}<input id="amK" dir="auto" value="${esc(cats0(z) || T('عامة', 'General'))}"></label><label>${T('لكل فئة', 'Per category')}<select id="amN">${[2, 3, 4, 5, 6].map(v => `<option${v === 3 ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label>${T('الجمهور', 'Audience')}<select id="amA">${AUD().map(a => `<option value="${a[0]}">${a[1]}</option>`).join('')}</select></label>
      <p class="qz-gens" id="amS"></p><div class="sn-two"><button type="button" class="btn solid" id="amGo">${T('اكتبها', 'Write them')}</button><button type="button" class="btn ghost" id="amX">${T('إلغاء', 'Cancel')}</button></div></div>`;
    const g = s => d.querySelector(s); g('#amX').onclick = () => d.remove();
    g('#amGo').onclick = async () => {
      const o = { topic: g('#amT').value.trim(), aud: g('#amA').value, per: +g('#amN').value, nch: 0, cats: g('#amK').value.split(/[،,]/).map(s => s.trim()).filter(Boolean).slice(0, 6), kinds: [], mat: false };
      if (!o.cats.length) o.cats = [T('عامة', 'General')];
      const b = g('#amGo'); b.disabled = true; g('#amS').textContent = T('يكتب… عادةً أقل من دقيقة', 'Writing… usually under a minute');
      try { const r = fromAI(await gemini(aiPrompt(o) + (z.qs.length ? `\n\nلا تكرر هذه الأسئلة الموجودة:\n${z.qs.slice(0, 60).map(x => '- ' + x.q).join('\n')}` : ''))); r.qs.forEach(x => z.qs.push(Object.assign({ cat: '', lv: 2 }, x, x.type === 'mc' ? { opts: x.opts.concat(['', '', '', '']).slice(0, Math.max(4, x.opts.length)) } : {}))); d.remove(); done(); }
      catch (e) { console.error(e); b.disabled = false; g('#amS').textContent = T('تعذّر الآن. جرّب بعد قليل.', 'Could not do it now. Try again shortly.'); }
    };
  }
  const cats0 = z => [...new Set((z.qs || []).map(x => (x.cat || '').trim()).filter(Boolean))].join(T('، ', ', '));

  /* ---------- the teams' chances: once each per team — double, deduct, pass it on, pick the rival's question ---------- */
  const CHN = () => ({ d: T('ضاعف', 'Double'), x: T('اخصم ١٠٠', 'Deduct 100'), v: T('حوّله للخصم', 'Pass it on'), k: T('اختر سؤال الخصم', 'Pick their question') });
  const CHD = () => ({ d: T('نقاط سؤالكم القادم مضاعفة', 'Your next question’s points are doubled'), x: T('تخصمون ١٠٠ نقطة من فريق تختارونه', 'Take 100 points from a team you choose'), v: T('ترمون سؤالكم على فريق آخر: إن أصاب أخذ نصف النقاط، وإن أخطأ أخذتموها أنتم', 'Throw your question to another team: if right they take half, if wrong you do'), k: T('قبل دور خصمكم تختارون له سؤاله من ثلاثة', 'Before a rival’s turn, you choose its question from three') });
  const award = (g, pts) => { if (pts > 0 && g.dbl) { pts *= 2; g.dbl = false; flash(T(`${g.name}: النقاط مضاعفة!`, `${g.name}: points doubled!`)); } g.score = Math.max(0, g.score + pts); return pts; };
  function flash(t) { if (!el) return; const f = document.createElement('div'); f.className = 'dw-flash'; f.textContent = t; el.appendChild(f); setTimeout(() => f.remove(), 2600); }
  const tIdx = g => D.groups.indexOf(g);
  function canUse(k, code) {
    const q = D.q, cur = D.cur || {};
    if (code === 'v') return !!(q && q.tn && q.g === D.groups[k] && !q.locked && !q.stealer && !q.tried.length);
    if (code === 'k') return cur.kind === 'intro' && cur.team !== k;
    return true;
  }
  function useChance(k, code, target, quiet) {
    const g = D.groups[k]; if (!g || !(g.chances || '').includes(code) || !canUse(k, code)) { if (!quiet) flash(T('لا يمكن استعمال هذه الفرصة الآن', 'That chance can’t be used now')); return false; }
    const t = D.groups[target];
    if ((code === 'x' || code === 'v') && (!t || t === g)) return chanceTarget(k, code);
    g.chances = g.chances.replace(code, ''); SND.go();
    if (code === 'd') { g.dbl = true; flash(T(`${g.name} تضاعف نقاط سؤالها القادم`, `${g.name} doubles its next question`)); }
    if (code === 'x') { t.score = Math.max(0, t.score - 100); flash(T(`${g.name} تخصم ١٠٠ من ${t.name}`, `${g.name} takes 100 from ${t.name}`)); }
    if (code === 'v') { const st = D.q; st.pass = g; st.stealer = t; st.locked = true; clearInterval(tick); const box = el.querySelector('.dw-q'); if (box) box.style.setProperty('--c', t.col); const w = el.querySelector('.dw-who'); if (w) w.textContent = T('حوّلته ', 'Passed by ') + g.name + T(' إلى ', ' to ') + t.name;
      const f = el.querySelector('#dwFoot'); if (f) f.innerHTML = `<p class="dw-hint">${esc(t.name)}: ${T('تقول المجموعة إجابتها', 'the group says its answer')}</p>`;
      if (['num', 'word'].includes(st.x.type)) { const s = el.querySelector('.dw-say'); if (s) { s.innerHTML = `<button type="button" class="dw-btn" data-main data-show>${T('اكشف الإجابة', 'Reveal the answer')}</button>`; s.querySelector('[data-show]').onclick = showText; } }
      flash(T(`${g.name} حوّلت السؤال إلى ${t.name}`, `${g.name} passed it to ${t.name}`)); }
    if (code === 'k') pickFor(k);
    const b = el.querySelector('.dw-board'); if (b) b.outerHTML = board(D.cur && D.cur.team != null ? D.cur.team : -1);
    pub(); return true;
  }
  function chanceTarget(k, code) {
    const g = D.groups[k], d = document.createElement('div'); d.className = 'dw-modal'; el.appendChild(d);
    d.innerHTML = `<div class="dw-mbox"><h3>${CHN()[code]}</h3><p>${T('على أي فريق؟', 'On which team?')}</p><div class="dw-tgt">${D.groups.map((t, i) => t === g ? '' : `<button type="button" data-tg="${i}" style="--c:${t.col}" dir="auto">${esc(t.name)}</button>`).join('')}</div><button type="button" class="dw-btn ghost" data-no>${T('إلغاء', 'Cancel')}</button></div>`;
    d.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { d.remove(); useChance(k, code, +b.dataset.tg); });
    d.querySelector('[data-no]').onclick = () => d.remove();
    return false;
  }
  // tapping a team on the score strip shows what it may still use
  function chanceSheet(k) {
    const g = D.groups[k]; if (!g || D.cfg.chn === false) return;
    const d = document.createElement('div'); d.className = 'dw-modal'; el.appendChild(d);
    const L = 'dxvk'.split('');
    d.innerHTML = `<div class="dw-mbox" style="border-top:6px solid ${g.col}"><h3 dir="auto">${T('فرص', 'Chances:')} ${esc(g.name)}</h3><div class="dw-chs">${L.map(c => { const has = (g.chances || '').includes(c), ok = has && canUse(k, c);
      return `<button type="button" data-cu="${c}"${ok ? '' : ' disabled'}><b>${CHN()[c]}</b><small>${has ? (ok ? CHD()[c] : T('ليس وقتها الآن', 'Not now')) : T('استُعملت', 'Used')}</small></button>`; }).join('')}</div><button type="button" class="dw-btn ghost" data-no>${T('إغلاق', 'Close')}</button></div>`;
    d.querySelectorAll('[data-cu]').forEach(b => b.onclick = () => { d.remove(); useChance(k, b.dataset.cu); });
    d.querySelector('[data-no]').onclick = () => d.remove();
  }
  // choosing a rival's question: three face down by category and level here; the full text on the chooser's phone
  function pickFor(k) {
    const cur = D.cur, s = cur.s, rival = D.groups[cur.team], chooser = D.groups[k];
    if (s.k === 'board') { D.pickBy = k; return D.cfg.bmode === 'h' ? huroof(s) : boardPick(s); }
    const same = D.spare.filter(y => (['num', 'word'].includes(y.type)) === (['num', 'word'].includes(s.x.type))), cand = shuf([s.x].concat(shuf(same).slice(0, 2)));
    const choose = i => { const y = cand[i]; if (!y) return; if (y !== s.x) { D.spare.splice(D.spare.indexOf(y), 1); D.spare.push(s.x); s.x = y; } D.pickCb = null; flash(T(`${chooser.name} اختارت سؤال ${rival.name}`, `${chooser.name} chose ${rival.name}’s question`)); intro(s); };
    D.pickCb = (team, i) => { if (team === k) choose(i); };
    shell(`${board(cur.team)}<div class="dw-mid dw-pk"><h2><span dir="auto" style="color:${chooser.col}">${esc(chooser.name)}</span> ${T('تختار سؤال', 'chooses the question for')} <span dir="auto" style="color:${rival.col}">${esc(rival.name)}</span></h2><p>${T('اختاروا الأصعب عليهم. نص السؤال يظهر في جوال قائدكم.', 'Pick the hardest for them. The text shows on your leader’s phone.')}</p>
      <div class="dw-hbtns">${cand.map((y, i) => `<button type="button" data-pc="${i}">${esc(y.cat || T('سؤال', 'Question'))}<small>${(LV().find(l => l[0] === (y.lv || 2)) || [0, ''])[1]}</small></button>`).join('')}</div></div>`, 'dw-in');
    el.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => choose(+b.dataset.pc));
    pub({ ph: 'pick', by: k, for: cur.team, opts: cand.map(y => ({ cat: y.cat || '', q: y.q, lv: y.lv || 2 })) });
  }

  /* ---------- the leaders' phones: one per team, for the buzzer, the answer and the chances ---------- */
  let db = null, uid = null;
  async function fb() { if (db) return; if (!window.firebase || !window.MD_CFG) throw new Error('nofb'); if (!firebase.apps.length) firebase.initializeApp(MD_CFG); const u = (await new Promise(r => { const o = firebase.auth().onAuthStateChanged(x => { o(); r(x); }); })) || (await firebase.auth().signInAnonymously()).user; uid = u.uid; db = firebase.database(); }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const ROOM = { lead: {}, req: {}, mem: {}, auto: {}, autoQ: {}, sg: [], sgQ: null, star: {}, sgCred: null, names: {}, seen: {}, mirSig: '', rc: String(100000 + Math.floor(Math.random() * 900000)), rmt: '', rbEls: [], rbSig: '' };
  // the host's phone as a remote: it sees the buttons on the screen and presses them
  const rcList = () => !el ? [] : [...el.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent && !b.closest('.dw-board,[data-close],[data-end],[data-reset],.dw-join')).sort((a, b) => (b.matches('[data-main]') ? 1 : 0) - (a.matches('[data-main]') ? 1 : 0)).slice(0, 60);
  const rcLabel = b => ([...b.childNodes].map(n => (n.textContent || '').trim()).filter(Boolean).join(' · ') || b.title || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 40);
  let rcT = null;
  function rcWatch() { if (!el || el.__rc) return; el.__rc = 1; new MutationObserver(() => { if (!rcT) rcT = setTimeout(() => { rcT = null; rcPush(); mirPush(); sgCheck(); }, 300); }).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'class'] }); }
  // playing apart: the screen mirrored to every phone, timers counted down on the phone itself
  const MULTI = () => !!(D && D.cfg && (D.cfg.remote || D.cfg.pall));
  function mirPush() {
    if (!D || !D.cfg || !D.cfg.remote || !ROOM.ref || !el) return;
    const h = el.innerHTML, sig = h.replace(/<b id="dwT">[^<]*<\/b>/, '').replace(/stroke-dash(offset|array):[^;"]*;?/g, '');
    if (sig === ROOM.mirSig) return; ROOM.mirSig = sig; const q = D.q || {};
    ROOM.ref.child('v').set({ h, c: el.className, w: innerWidth, hh: innerHeight, tl: q.left || 0, td: q.dur || 0, lk: q.dur && !q.locked ? 1 : 0, t: TS() }).catch(() => {});
  }
  // what members send: a chosen option, a written answer or a short recording; the host decides
  function sugAdd(u, k, v) {
    if (ROOM.sgQ !== D.q) { ROOM.sgQ = D.q; ROOM.sg = []; }
    const it = { u, k, n: ROOM.names[u] || '', a: v.a != null && v.a >= 0 ? +v.a : null, s: typeof v.s === 'string' ? v.s.slice(0, 160) : '', au: typeof v.au === 'string' && /^data:audio\//.test(v.au) && v.au.length < 500000 ? v.au : '' };
    if (it.a == null && !it.s && !it.au) return;
    const kind = it.a != null ? 'a' : it.s ? 's' : 'au'; ROOM.sg = ROOM.sg.filter(x => !(x.u === u && (x.a != null ? 'a' : x.s ? 's' : 'au') === kind)); ROOM.sg.push(it); if (D.cfg.remote) { SND.tick(); sgPaint(); } pub();
  }
  const tally = k => { const c = {}; ROOM.sg.filter(x => x.k === k && x.a != null).forEach(x => { c[x.a] = (c[x.a] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${LET()[a] || ''} ${NUM(n)}`).join(' · '); };
  const tnames = k => ROOM.sgQ === D.q ? ROOM.sg.filter(x => x.k === k && x.a != null).map(x => `${x.n}: ${LET()[x.a] || ''}`).join(' · ') : '';
  // a leader may let the group's majority answer by itself: once every member has voted, or in the last five seconds
  setInterval(() => { if (!D || !D.q || !D.groups || !D.cfg || !D.cfg.pall || D.q.locked || !D.q.onAns || ROOM.sgQ !== D.q) return;
    D.groups.forEach((g, k) => { if (!ROOM.auto[k] || ROOM.autoQ[k] === D.q) return; const vs = ROOM.sg.filter(x => x.k === k && x.a != null); if (!vs.length) return;
      const mem = Object.keys(ROOM.mem).filter(u => ROOM.mem[u] === k && u !== ROOM.lead[k]).length, near = D.q.left != null && D.q.left <= 5;
      if (vs.length < mem && !near) return; const c = {}; vs.forEach(x => { c[x.a] = (c[x.a] || 0) + 1; }); const best = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
      ROOM.autoQ[k] = D.q; D.q.onAns(k, +best); }); }, 400);
  // the members whose own pick was the right one, counted for the star of the evening
  function sgCredit() { if (!ROOM.sg.length || ROOM.sgCred === D.q || !el) return; const ok = el.querySelector('[data-j].ok'); if (!ok) return; const j = +ok.dataset.j; ROOM.sgCred = D.q;
    ROOM.sg.filter(x => x.a === j).forEach(x => { const r = ROOM.star[x.u] || (ROOM.star[x.u] = { n: x.n, k: x.k, c: 0 }); r.c++; }); }
  function sgCheck() { if (D && D.q) sgCredit(); if (ROOM.sg.length && ROOM.sgQ !== (D && D.q)) { ROOM.sg = []; sgPaint(); } }
  function sgPaint() {
    let P = document.getElementById('dwSgP'); if (!ROOM.sg.length || !D || !D.groups) { if (P) P.remove(); return; }
    if (!P) { P = document.createElement('aside'); P.id = 'dwSgP'; P.className = 'dw-sgp'; document.body.appendChild(P); }
    const lab = a => { const b = el && el.querySelector(`[data-j="${a}"] span`); return `${LET()[a] || ''}${b ? ') ' + b.textContent : ''}`; };
    const tl = D.groups.map((g, k) => [g, tally(k)]).filter(x => x[1]);
    P.innerHTML = `<header><b>${T('إجابات المشاركين', 'Members’ answers')}</b><button type="button" data-sgx aria-label="${T('إخفاء', 'Hide')}">${IC.x || '×'}</button></header>${tl.length ? `<div class="dw-sgt">${tl.map(([g, t]) => `<p style="--c:${g.col}"><b dir="auto">${esc(g.name)}</b> ${t}</p>`).join('')}</div>` : ''}<div>${ROOM.sg.slice().reverse().map(x => { const i = ROOM.sg.indexOf(x), g = D.groups[x.k] || {};
      return `<div class="dw-sgi${x.done ? ' done' : ''}" style="--c:${g.col}"><p><b dir="auto">${esc(g.name || '')}</b> <span dir="auto">${esc(x.n)}</span></p>${x.a != null ? `<p class="dw-sga" dir="auto">${esc(lab(x.a))}</p>` : ''}${x.s ? `<p class="dw-sga" dir="auto">${esc(x.s)}</p>` : ''}${x.au ? `<audio controls preload="none" src="${x.au}"></audio>` : ''}
        <div class="dw-sgb">${x.a != null && D.q && D.q.onAns && !x.done ? `<button type="button" class="dw-btn" data-sga="${i}">${T('اعتمد الإجابة', 'Accept')}</button>` : ''}${x.done ? '' : `<button type="button" class="dw-btn ghost" data-sgd="${i}">${T('تمت المراجعة', 'Reviewed')}</button>`}</div></div>`; }).join('')}</div>`;
    P.querySelector('[data-sgx]').onclick = () => { ROOM.sg = []; sgPaint(); };
    P.querySelectorAll('[data-sga]').forEach(b => b.onclick = () => { const x = ROOM.sg[+b.dataset.sga]; if (!x || !D.q || !D.q.onAns) return; ROOM.sg.filter(y => y.k === x.k).forEach(y => { y.done = true; }); D.q.onAns(x.k, x.a); sgPaint(); });
    P.querySelectorAll('[data-sgd]').forEach(b => b.onclick = () => { const x = ROOM.sg[+b.dataset.sgd]; if (x) x.done = true; sgPaint(); });
  }
  function rcPush() { if (!ROOM.rmt || !ROOM.ref || !D) return; const bs = rcList(), sig = bs.map(rcLabel).join('|') + '#' + ((el.querySelector('h2') || {}).textContent || ''); if (sig === ROOM.rbSig) return; ROOM.rbSig = sig; ROOM.rbEls = bs; pub(); }
  async function openRoom() {
    await fb(); if (ROOM.ref) return ROOM;
    for (let t = 0; t < 6 && !ROOM.pin; t++) { const p = String(100000 + Math.floor(Math.random() * 900000)); try { await db.ref('kh/' + p).set({ host: uid, at: TS(), st: 'lobby', dw: 1 }); ROOM.pin = p; } catch (e) {} }
    if (!ROOM.pin) throw new Error('room');
    ROOM.ref = db.ref('kh/' + ROOM.pin);
    ROOM.ref.child('pl').on('child_added', s => { ROOM.names[s.key] = (s.val() || {}).n || ''; leadPaint(); });
    const mv = s => { const v = s.val() || {}; if (ROOM.seen[s.key] === v.t) return; ROOM.seen[s.key] = v.t; onMove(s.key, v); };
    ROOM.ref.child('mv').on('child_added', mv); ROOM.ref.child('mv').on('child_changed', mv);
    return ROOM;
  }
  const teamOfU = u => { const k = Object.keys(ROOM.lead).find(t => ROOM.lead[t] === u); return k == null ? -1 : +k; };
  function onMove(u, v) {
    if (v.k === 'r') { if (v.c === 'j' && String(v.x) === ROOM.rc) { ROOM.rmt = u; ROOM.rbSig = ''; ROOM.rbEls = rcList(); leadPaint(); return pub(); }
      if (u === ROOM.rmt && v.c === 'b') { const b = ROOM.rbEls[v.x]; if (b && b.isConnected && !b.disabled) b.click(); } return; }
    if (u === ROOM.rmt) return;
    if (v.k === 'j') {
      if (MULTI()) { const was = teamOfU(u); ROOM.mem[u] = +v.x; if (was >= 0 && was !== +v.x) { delete ROOM.lead[was]; const nx = Object.keys(ROOM.mem).find(m => ROOM.mem[m] === was && m !== u); if (nx) ROOM.lead[was] = nx; }
        if (ROOM.lead[v.x] == null) ROOM.lead[v.x] = u; ROOM.ref.child('mb').set(ROOM.mem); }
      else { if (ROOM.lead[v.x] != null && ROOM.lead[v.x] !== u) { ROOM.req[u] = +v.x; leadPaint(); return; } delete ROOM.req[u]; Object.keys(ROOM.lead).forEach(t => { if (ROOM.lead[t] === u) delete ROOM.lead[t]; }); ROOM.lead[v.x] = u; }
      ROOM.ref.child('ld').set(ROOM.lead); leadPaint(); return pub(); }
    const kl = teamOfU(u), km = kl >= 0 ? kl : ROOM.mem[u] != null ? +ROOM.mem[u] : -1; if (km < 0 || !D || !D.groups) return;
    if (v.k === 's') return sugAdd(u, km, v);
    if (v.k === 'b' && D.q && D.q.onBuzz) D.q.onBuzz(km, v.t);
    const k = kl; if (k < 0) return;
    if (v.k === 'u') { ROOM.auto[k] = !!v.x; return pub(); }
    if (v.k === 'a' && D.q && D.q.onAns) D.q.onAns(k, +v.c);
    if (v.k === 'c') useChance(k, String(v.c), v.x >= 0 ? v.x : -1);
    if (v.k === 'p' && D.pickCb) D.pickCb(k, v.x);
    if (v.k === 'w' && D.q && D.q.onWord) D.q.onWord(k, +v.x || 0);
    if (v.k === 'n' && D.q && D.q.onNum) D.q.onNum(k, +v.x);
    if (v.k === 'h' && D.q && D.q.onHelp) D.q.onHelp(k, String(v.c), +v.x);
  }
  // what the phones see: the phase, the scores, each team's chances
  function pub(o) {
    if (!ROOM.ref) return; const G = D && D.groups;
    const base = G ? { names: G.map(g => g.name), cols: G.map(g => g.col), sc: G.map(g => g.score), ch: G.map(g => D.cfg.chn !== false ? g.chances || '' : ''), dbl: G.map(g => g.dbl ? 1 : 0) } : { names: (D.cfg.names || []).slice(0, D.cfg.n).map((n, k) => n || NAMES()[k]), cols: COL.slice(0, D.cfg.n) };
    base.rem = D && D.cfg && D.cfg.remote ? 1 : 0; base.pa = !base.rem && MULTI() ? 1 : 0; if ((base.rem || base.pa) && G) { base.tv = G.map((g, k) => ROOM.sgQ === D.q ? tally(k) : ''); base.tn = G.map((g, k) => tnames(k)); base.au = G.map((g, k) => ROOM.auto[k] ? 1 : 0); }
    if (o) D.lastPub = o; if (ROOM.rmt) { if (!ROOM.rbSig) { ROOM.rbEls = rcList(); } Object.assign(base, { rmt: ROOM.rmt, rb: ROOM.rbEls.map(rcLabel).concat(['']).slice(0, 61), rbm: ROOM.rbEls[0] && ROOM.rbEls[0].matches('[data-main]') ? 1 : 0, rt: ((el && el.querySelector('h2')) || {}).textContent || '' }); }
    ROOM.ref.child('g').set(Object.assign(base, D.lastPub || { ph: 'lobby' }, { t: TS() })).catch(() => {});
  }
  function leadPaint() {
    const box = el && el.querySelector('#dwLeads'); if (!box) return;
    const names = (D.groups ? D.groups.map(g => g.name) : [...el.querySelectorAll('[data-name]')].map((i, k) => i.value.trim() || NAMES()[k]));
    // everyone joins: the host names each group's leader by tapping a member
    if (MULTI()) { box.classList.add('multi');
      const sel = ROOM.selU && ROOM.mem[ROOM.selU] != null ? ROOM.selU : null;
      box.innerHTML = `<p class="dw-ldh">${T('اضغط اسم العضو لتجعله القائد أو تنقله إلى مجموعة أخرى', 'Tap a member to make them leader or move them')}</p>` + names.map((n, k) => { const ms = Object.keys(ROOM.mem).filter(u => ROOM.mem[u] === k);
        return `<div class="dw-ldt" style="--c:${COL[k]}"><b dir="auto">${esc(n)}</b>${ms.length ? ms.map(u => `<button type="button" data-ml="${u}" class="${ROOM.lead[k] === u ? 'on' : ''}${sel === u ? ' sel' : ''}" dir="auto">${esc(ROOM.names[u] || T('عضو', 'member'))}${ROOM.lead[k] === u ? ` <small>${T('القائد', 'leader')}</small>` : ''}</button>`).join('') : `<small>${T('لم يدخل أحد بعد', 'No one yet')}</small>`}</div>
          ${sel && ROOM.mem[sel] === k ? `<div class="dw-ldm"><span dir="auto">${esc(ROOM.names[sel] || '')}:</span>${ROOM.lead[k] !== sel ? `<button type="button" data-mlead>${T('اجعله القائد', 'Make leader')}</button>` : ''}${names.map((m, t) => t === k ? '' : `<button type="button" data-mmv="${t}" style="--c:${COL[t]}" dir="auto">${T('انقله إلى', 'Move to')} ${esc(m)}</button>`).join('')}<button type="button" data-mout>${T('أخرجه', 'Remove')}</button><button type="button" data-mx>${T('إلغاء', 'Cancel')}</button></div>` : ''}`; }).join('') + (ROOM.rmt ? `<span class="on" style="--c:#e9a54a">${T('جوال المدير متصل', 'Host’s phone connected')}</span>` : '');
      const save = () => { ROOM.ref.child('mb').set(ROOM.mem); ROOM.ref.child('ld').set(ROOM.lead); ROOM.selU = null; leadPaint(); pub(); };
      // a group whose leader left takes its next member as leader
      const refill = k => { if (ROOM.lead[k] && ROOM.mem[ROOM.lead[k]] === +k) return; delete ROOM.lead[k]; const nx = Object.keys(ROOM.mem).find(m => ROOM.mem[m] === +k); if (nx) ROOM.lead[k] = nx; };
      box.querySelectorAll('[data-ml]').forEach(b => b.onclick = () => { ROOM.selU = ROOM.selU === b.dataset.ml ? null : b.dataset.ml; leadPaint(); });
      const mb = box.querySelector('[data-mlead]'); if (mb) mb.onclick = () => { ROOM.lead[ROOM.mem[sel]] = sel; save(); };
      box.querySelectorAll('[data-mmv]').forEach(b => b.onclick = () => { const from = ROOM.mem[sel], to = +b.dataset.mmv; ROOM.mem[sel] = to; refill(from); if (!ROOM.lead[to]) ROOM.lead[to] = sel; save(); });
      const mo = box.querySelector('[data-mout]'); if (mo) mo.onclick = () => { const from = ROOM.mem[sel]; delete ROOM.mem[sel]; refill(from); save(); };
      const mx = box.querySelector('[data-mx]'); if (mx) mx.onclick = () => { ROOM.selU = null; leadPaint(); };
      return; }
    box.classList.remove('multi');
    // a phone asking to lead a group that already has a leader waits for the host
    const rq = Object.keys(ROOM.req).filter(u => names[ROOM.req[u]] != null && ROOM.lead[ROOM.req[u]] !== u);
    box.innerHTML = names.map((n, k) => `<span style="--c:${COL[k]}" class="${ROOM.lead[k] ? 'on' : ''}" dir="auto">${esc(n)}: ${ROOM.lead[k] ? esc(ROOM.names[ROOM.lead[k]] || T('متصل', 'connected')) : T('بلا جوال', 'no phone')}</span>`).join('') + rq.map(u => `<span class="dw-rqc" style="--c:${COL[ROOM.req[u]]}" dir="auto">${esc(ROOM.names[u] || T('جوال', 'A phone'))} ${T('يطلب قيادة', 'asks to lead')} ${esc(names[ROOM.req[u]])} <button type="button" data-rqa="${u}">${T('اجعله القائد', 'Make leader')}</button><button type="button" data-rqx="${u}">${T('رفض', 'Decline')}</button></span>`).join('') + (ROOM.rmt ? `<span class="on" style="--c:#e9a54a">${T('جوال المدير متصل', 'Host’s phone connected')}</span>` : '');
    box.querySelectorAll('[data-rqa]').forEach(b => b.onclick = () => { const u = b.dataset.rqa, t = ROOM.req[u]; delete ROOM.req[u]; Object.keys(ROOM.lead).forEach(x => { if (ROOM.lead[x] === u) delete ROOM.lead[x]; }); ROOM.lead[t] = u; ROOM.ref.child('ld').set(ROOM.lead); leadPaint(); pub(); });
    box.querySelectorAll('[data-rqx]').forEach(b => b.onclick = () => { delete ROOM.req[b.dataset.rqx]; leadPaint(); });
  }
  async function phonesBox() {
    const box = el.querySelector('#dwPh'); if (!box) return; box.innerHTML = `<p class="dw-hint">${T('لحظة…', 'One moment…')}</p>`;
    try { await openRoom(); } catch (e) { box.innerHTML = `<p class="dw-hint">${T('تعذّر الاتصال. ', 'Could not connect. ')}<button type="button" class="dw-btn ghost" data-retry>${T('حاول مرة أخرى', 'Try again')}</button></p>`; box.querySelector('[data-retry]').onclick = phonesBox; return; }
    if (!D || !el || !el.contains(box)) return; // the setup was closed while connecting
    const url = 'https://alsamani.com/play/dawwara/?k=' + ROOM.pin; let svg = '';
    try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); svg = qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); } catch (e) {}
    const rem = !!D.cfg.remote, pm = rem ? 'r' : D.cfg.pall ? 'a' : 'l';
    box.innerHTML = `<div class="dw-seg dw-remseg">${[['l', T('للقادة فقط', 'Leaders only')], ['a', T('للجميع في مكان واحد', 'Everyone, one place')], ['r', T('للجميع عن بُعد', 'Everyone, apart')]].map(([v, l]) => `<button type="button" data-pm="${v}" aria-pressed="${pm === v}">${l}</button>`).join('')}</div>${pm === 'a' ? `<p class="dw-hint dw-pmh">${T('يدخل من يرغب من أعضاء المجموعات ويختار مجموعته، ويصوّت كل منهم على الإجابة، فيرى القائد أصوات مجموعته ويعتمد الإجابة من جواله. يحدد المدير القائد، ويستطيع نقل أي عضو إلى مجموعة أخرى.', 'Members who wish join, pick a group and vote; the leader sees the votes and answers. The host names the leader and can move anyone.')}</p>` : ''}<div class="dw-join"><div class="dw-qr">${svg}</div><div><p>${rem ? T('يدخل جميع المشاركين من جوالاتهم بمسح الرمز أو من الرابط، ويختار كل منهم مجموعته، فتظهر له الشاشة على جواله، وتصل إجاباته المكتوبة أو المسجّلة إلى المدير ليعتمدها. الصوت عبر مكالمة جماعية.', 'Everyone joins from a phone with the code or the link and picks a group; the screen shows on the phone, and written or recorded answers reach the host to accept. Voice through a group call.') : (pm === 'a' ? T('يمسح الأعضاء الرمز بكاميرا الجوال، أو يدخلون', 'Members scan the code, or go to') : T('يفتح كل قائد فريق الكاميرا ويمسح الرمز، أو يدخل', 'Each team leader scans the code, or goes to'))} ${rem ? '' : `<b dir="ltr">alsamani.com/play/dawwara</b> ${pm === 'a' ? T('ويكتبون الرمز', 'and enter') : T('ويكتب الرمز', 'and enters')}`}</p>${rem ? `<button type="button" class="dw-btn ghost dw-inv" data-inv>${T('انسخ رابط الدعوة', 'Copy the invitation link')}</button>` : ''}<p class="dw-pin" dir="ltr">${ROOM.pin.slice(0, 3)} ${ROOM.pin.slice(3)}</p><div class="dw-leads" id="dwLeads"></div><button type="button" class="dw-lnk dw-rcb" data-rcq>${T('التحكم بالشاشة من جوال المدير', 'Control the screen from the host’s phone')}</button><div class="dw-rcq" hidden></div></div></div>`;
    box.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { const v = b.dataset.pm; D.cfg.remote = v === 'r'; D.cfg.pall = v === 'a'; cfgSet(D.cfg); ROOM.mirSig = ''; phonesBox(); });
    const inv = box.querySelector('[data-inv]'); if (inv) inv.onclick = () => { try { navigator.clipboard.writeText(T(`انضم إلى مسابقة دوّارة من جوالك: ${url}`, `Join the Dawwara quiz from your phone: ${url}`)); inv.textContent = T('تم نسخ رابط الدعوة', 'Link copied'); } catch (e) {} };
    const rq = box.querySelector('[data-rcq]'); if (rq) rq.onclick = () => { const d = box.querySelector('.dw-rcq'); if (!d.hidden) { d.hidden = true; return; } let sv = ''; try { const q = qrcode(0, 'M'); q.addData(url + '&r=' + ROOM.rc); q.make(); sv = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); } catch (e) {} d.innerHTML = `<div class="dw-qr">${sv}</div><p>${T('يمسحه المدير بجواله، فتظهر عليه أزرار الشاشة ويتحكم بها من أي مكان في القاعة. لا تعرضه على الحضور.', 'The host scans it; the screen’s buttons appear on the phone to press from anywhere in the hall. Do not show it to the audience.')}</p>`; d.hidden = false; };
    leadPaint(); pub();
  }

  // the phone itself
  function phone(root, pin) {
    const top = document.createElement('div'); top.className = 'dwpv'; top.hidden = true; const body0 = document.createElement('div'); root.innerHTML = ''; root.append(top, body0); root = body0;
    let reqT = null, me = null, g = null, lead = {}, ans = null, buzzed = false, lastKey = '', rsent = false, mb = {}, watch = false, said = '', tx = '', REC = null, MV = null, lastV = null, mirOn = false, pend = false;
    // the host's screen, scaled to the phone, its clock counted down here
    // on the phone the screen is laid out again at a narrow width, so its words stay readable; enlarged, it keeps the host's shape
    const mirror = v => { lastV = v; if (!v || !v.h) return; const big = top.classList.contains('big'), cw = top.clientWidth || 360, w = big ? v.w || 1280 : 560, hh = big ? v.hh || 720 : 0, sc = big ? Math.min(cw / w, innerHeight / hh) : cw / w;
      top.innerHTML = `<div class="dwv${big ? '' : ' fit'}" style="width:${Math.round(w * sc)}px"><div class="${esc(v.c || 'dw')} dwv-in" style="width:${w}px;${hh ? `height:${hh}px;` : ''}transform:scale(${sc})">${v.h}</div></div>`;
      const box = top.firstChild, inn = box.firstChild; box.style.height = Math.round((hh || Math.min(inn.scrollHeight, 1400)) * sc) + 'px';
      MV = { tl: v.tl || 0, td: v.td || 0, at: Date.now(), run: !!v.lk }; };
    setInterval(() => { if (!MV || !MV.run) return; const t = top.querySelector('#dwT'), arc = top.querySelector('#dwArc'), left = Math.max(0, MV.tl - (Date.now() - MV.at) / 1000); if (t) t.textContent = NUM(Math.ceil(left)); if (arc && MV.td) { const C = 2 * Math.PI * 44; arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C * (1 - left / MV.td); } }, 250);
    // enlarged, the screen leaves the page for the body, so no transformed parent can hold it back
    const home0 = root.parentNode; top.onclick = () => { const big = !top.classList.contains('big'); top.classList.toggle('big', big); if (big) document.body.appendChild(top); else home0.insertBefore(top, root); document.documentElement.style.overflow = big ? 'hidden' : ''; mirror(lastV); };
    addEventListener('resize', () => mirror(lastV));
    const mirStart = () => { if (mirOn) return; mirOn = true; top.hidden = false; db.ref('kh/' + pin + '/v').on('value', s => mirror(s.val())); };
    const recToggle = async k => { if (REC) { REC.stop(); return; }
      try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }), mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
        const r = new MediaRecorder(st, mt ? { mimeType: mt, audioBitsPerSecond: 24000 } : undefined), parts = []; r.ondataavailable = e => parts.push(e.data);
        r.onstop = () => { st.getTracks().forEach(t => t.stop()); clearTimeout(r.to); REC = null; const fr = new FileReader(); fr.onload = () => { send('s', '', k, { au: fr.result }); said = T('تم إرسال تسجيلك إلى المدير', 'Your recording was sent to the host'); paint(); }; fr.readAsDataURL(new Blob(parts, { type: r.mimeType || 'audio/webm' })); };
        r.start(); REC = r; r.to = setTimeout(() => { if (r.state === 'recording') r.stop(); }, 12000); paint(); } catch (e) { said = T('تعذّر الوصول إلى الميكروفون', 'The microphone could not be reached'); paint(); } };
    const sayUI = () => g && g.rem ? `<div class="dwp-say"><div><input id="dwpTx" dir="auto" maxlength="120" autocomplete="off" placeholder="${T('اكتب إجابتك', 'Type your answer')}" value="${esc(tx)}"><button type="button" data-txs>${T('أرسل', 'Send')}</button></div><button type="button" class="dwp-rec${REC ? ' on' : ''}" data-rec>${REC ? T('أوقف التسجيل وأرسله', 'Stop and send') : T('سجّل إجابتك بصوتك', 'Record your answer')}</button>${said ? `<p class="dwp-ok">${said}</p>` : ''}</div>` : '';
    const rc = (new URLSearchParams(location.search).get('r') || '').replace(/\D/g, '');
    let W = { i: null, sl: [], lock: [], a: -1, cool: 0 }, RO = { i: null, p: [] }, N = { i: null, v: '' };
    const HL = () => ({ o: T('اعرض الخيارات', 'Show the options'), d: T('احذف إجابتين', 'Remove two'), s: T('غيّر السؤال', 'Change the question'), t: T('وقت إضافي', 'Extra time'), x: T('اسأل الخصم', 'Ask a rival'), f: T('اكشف الحدث الأول', 'Reveal the first') });
    const helpUI = hl => hl ? `<div class="dwp-help">${hl.split('').map(c => `<button type="button" data-hp="${c}">${HL()[c] || c}</button>`).join('')}</div>` : '';
    const roUI = () => { if (RO.i !== g.i) RO = { i: g.i, p: [] }; if (g.fx >= 0 && RO.p[0] !== g.fx) RO.p = [g.fx].concat(RO.p.filter(x => x !== g.fx));
      return `<p class="dwp-h">${T('اضغطوا الأحداث بالترتيب: الأقدم أولًا', 'Tap them in order, earliest first')}</p><div class="dwp-ro">${(g.ev || []).map((e, t) => { const p = RO.p.indexOf(t); return `<button type="button" data-ro="${t}" class="${p >= 0 ? 'on' : ''}" dir="auto"><i>${p >= 0 ? NUM(p + 1) : ''}</i>${esc(e)}</button>`; }).join('')}</div>
        <button type="button" class="dwp-go" data-rsend${RO.p.length === (g.ev || []).length ? '' : ' disabled'}>${T('أرسل الترتيب', 'Send the order')}</button>`; };
    // word race: slots to fill in order; after each answer the right words stay and the rest go back
    const wordUI = k => {
      const n = (g.w || []).length; if (W.i !== g.i || W.sl.length !== n) W = { i: g.i, sl: Array(n).fill(null), lock: Array(n).fill(false), a: (g.a || [])[k] || 0, cool: 0 };
      const a = (g.a || [])[k] || 0, r = (g.r || [])[k] || '';
      if (a !== W.a) { W.a = a; if (r && r !== '-') r.split('').forEach((c, p) => { if (c === '1') W.lock[p] = true; else { W.lock[p] = false; W.sl[p] = null; } }); }
      const won = (g.won || []).indexOf(k);
      if (won >= 0 || g.done) return `<p class="dwp-big">${won >= 0 ? T(won ? 'رتّبتموها ثانيًا' : 'رتّبتموها أولًا!', won ? 'You got it second' : 'You got it first!') : T('انتهت الجملة', 'Time is up')}</p>${g.ans ? `<p class="dwp-wans" dir="auto">${esc(g.ans)}${g.by ? `<small>${esc(g.by)}</small>` : ''}</p>` : `<p class="dwp-h">${T('انتظروا البقية', 'Wait for the others')}</p>`}`;
      const full = W.sl.every(x => x != null), cool = Date.now() < W.cool;
      return `<p class="dwp-h">${a ? T('الأخضر في مكانه. أكملوا الباقي', 'Green is in place. Fix the rest') : T('اضغطوا الكلمات بالترتيب', 'Tap the words in order')}</p>
        <div class="dwp-slots">${W.sl.map((t, p) => `<button type="button" data-sl="${p}" class="${W.lock[p] ? 'ok' : t == null ? 'e' : ''}"${W.lock[p] ? ' disabled' : ''} dir="auto">${t == null ? NUM(p + 1) : esc(g.w[t])}</button>`).join('')}</div>
        <div class="dwp-pool">${g.w.map((w, t) => W.sl.includes(t) ? '' : `<button type="button" data-wt="${t}" dir="auto">${esc(w)}</button>`).join('')}</div>
        <button type="button" class="dwp-go" data-wsend${full && !cool ? '' : ' disabled'}>${cool ? T('لحظة…', 'One moment…') : T('أرسل الترتيب', 'Send the order')}</button>`;
    };
    const ph0 = () => (g && g.ph) || '';
    const send = (k, c, x, ex) => db.ref('kh/' + pin + '/mv/' + uid).set(Object.assign({ k, c: String(c == null ? '' : c).slice(0, 3), x: +x || 0, t: TS() }, ex || {})).catch(() => {});
    const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
    const paint = () => {
      const ae = document.activeElement; if (ae && ae.id === 'dwpTx' && root.contains(ae)) { pend = true; return; } pend = false;
      if (!g) { root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('بانتظار المدير…', 'Waiting for the host…')}</p></div>`; return; }
      if (rc && g.rmt !== uid) { if (!rsent) { rsent = true; send('r', 'j', +rc); setTimeout(() => { rsent = false; }, 4000); } root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('لحظة…', 'One moment…')}</p></div>`; return; }
      if (g.rmt === uid) { const rb = (g.rb || []).filter(Boolean);
        root.innerHTML = `<div class="dwp dwp-rm"><div class="dwp-top"><b>${T('التحكم بالشاشة', 'Screen control')}</b><span>${(g.sc || []).map(n => NUM(n)).join(' · ')}</span></div>${g.rt ? `<p class="dwp-h" dir="auto">${esc(g.rt)}</p>` : ''}<div class="dwp-rb">${rb.map((l, i) => `<button type="button" data-rb="${i}" dir="auto"${!i && g.rbm ? ' class="main"' : ''}>${esc(l)}</button>`).join('') || `<p class="dwp-h">${T('لا أزرار على الشاشة الآن', 'No buttons on the screen now')}</p>`}</div></div>`;
        root.querySelectorAll('[data-rb]').forEach(b => b.onclick = () => { send('r', 'b', +b.dataset.rb); buzz(20); b.classList.add('on'); }); return; }
      if (g.rem) mirStart();
      const team = Object.keys(lead).find(t => lead[t] === uid), isLead = team != null; let k = isLead ? +team : -1; if (isLead) reqT = null; const multi = g.rem || g.pa; if (k < 0 && multi && mb[uid] != null) k = +mb[uid];
      if (k < 0 && watch && g.rem) { root.innerHTML = `<div class="dwp"><p class="dwp-h">${T('تشاهد المسابقة. اضغط الشاشة لتكبيرها.', 'Watching. Tap the screen to enlarge it.')}</p><button type="button" class="dwp-back" data-unw>${T('انضم إلى مجموعة', 'Join a group')}</button></div>`; root.querySelector('[data-unw]').onclick = () => { watch = false; paint(); }; return; }
      if (k < 0 && !multi && reqT != null && lead[reqT] && lead[reqT] !== uid) { root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('لهذه المجموعة قائد', 'This group has a leader')}</p><p class="dwp-h">${T(`تم إرسال طلبك إلى المدير ليجعلك قائد ${g.names[reqT] || ''}`, `Your request to lead ${g.names[reqT] || ''} was sent to the host`)}</p><button type="button" class="dwp-back" data-rqb>${T('اختر مجموعة أخرى', 'Choose another group')}</button></div>`; root.querySelector('[data-rqb]').onclick = () => { reqT = null; paint(); }; return; }
      if (k < 0) { root.innerHTML = `<div class="dwp"><p class="dwp-big">${multi ? T('اختر مجموعتك', 'Choose your group') : T('أي فريق تقود؟', 'Which team do you lead?')}</p><div class="dwp-teams">${(g.names || []).map((n, i) => `<button type="button" data-tm="${i}" style="--c:${g.cols[i]}" dir="auto">${esc(n)}${lead[i] && !multi ? ` <small>${T('(لها قائد)', '(has a leader)')}</small>` : ''}</button>`).join('')}${g.rem ? `<button type="button" class="dwp-back" data-watch>${T('مشاهدة فقط', 'Just watch')}</button>` : ''}</div></div>`;
        root.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { reqT = +b.dataset.tm; send('j', '', +b.dataset.tm); buzz(30); paint(); }); const wb = root.querySelector('[data-watch]'); if (wb) wb.onclick = () => { watch = true; paint(); }; return; }
      const ph = g.ph || 'lobby', key = ph + ':' + (g.i || 0) + ':' + (g.team == null ? '' : g.team); if (key !== lastKey) { lastKey = key; ans = null; buzzed = false; said = ''; tx = ''; }
      if (ph === 'race' && ans != null && (g.no || []).includes(ans) && !(g.out || []).includes(k)) ans = null;
      if (ph === 'num' && !g.done && N.i === g.i && root.querySelector('#dwpNum')) { const o = root.querySelector('#dwpOk'); if (o) o.textContent = (g.s || [])[k] ? T('تم إرسال التقدير، ويمكن تعديله قبل انتهاء الوقت', 'Sent; you may change it before time is up') : ''; return; }
      const col = g.cols[k], chs = isLead ? (g.ch && g.ch[k]) || '' : '', CN = CHN(), hlp = hl => isLead ? helpUI(hl) : '';
      let body = '';
      if (multi && !isLead && ['hrl', 'hrn', 'pick', 'hro', 'word', 'num'].includes(ph)) body = `<p class="dwp-big">${T('يتولى قائد المجموعة هذه الخطوة', 'The group’s leader takes this step')}</p><p class="dwp-h">${T('تابعها على الشاشة', 'Follow it on the screen')}</p>`;
      else if (ph === 'race') body = (g.out || []).includes(k) ? `<p class="dwp-big">${T('إجابتكم خاطئة', 'Your answer was wrong')}</p><p class="dwp-h">${T('انتظروا السؤال التالي', 'Wait for the next question')}</p>` : `<p class="dwp-h">${T('سباق! أول إجابة صحيحة تفوز', 'Race! The first right answer wins')}</p>${opts(g.n, g.tf, g.no)}`;
      else if (ph === 'all') body = `<p class="dwp-h">${T('سؤال للجميع: اختاروا الإجابة', 'Everyone answers: choose')}</p>${opts(g.n, g.tf)}`;
      else if (ph === 'buzz') body = (g.out || []).includes(k) ? `<p class="dwp-big">${T('خرجتم من هذا السؤال', 'You are out of this one')}</p>` : g.who === k ? (g.say ? `<p class="dwp-big">${T('سبقتم! قولوا الإجابة للمدير', 'First! Say the answer to the host')}</p>${sayUI()}` : `<p class="dwp-h">${T('دوركم: اختاروا الإجابة', 'Your turn: choose')}</p>${opts(g.n, g.tf)}`) : g.who != null ? `<p class="dwp-big">${T('يجاوب الآن', 'Now answering')}: ${esc(g.names[g.who])}</p>` : `<button type="button" class="dwp-buzz" data-bz${buzzed ? ' disabled' : ''}>${buzzed ? T('ضغطت!', 'Pressed!') : T('اضغط!', 'Press!')}</button>`;
      else if (ph === 'turn') body = g.team === k ? (g.text ? `<p class="dwp-big">${T('قل الإجابة للمدير', 'Say the answer to the host')}</p>${sayUI()}` : `<p class="dwp-h">${T('سؤالكم: اختاروا الإجابة', 'Your question: choose')}</p>${opts(g.n, g.tf)}`) : `<p class="dwp-big">${T('دور', 'Turn:')} ${esc(g.names[g.team] || '')}</p>`;
      else if (ph === 'pick') body = g.by === k ? `<p class="dwp-h">${T(`اختاروا سؤال ${g.names[g.for]}: الأصعب عليهم`, `Choose ${g.names[g.for]}’s question: the hardest`)}</p><div class="dwp-pick">${(g.opts || []).map((o, i) => `<button type="button" data-pk="${i}"><small>${esc(o.cat)}</small>${esc(o.q)}</button>`).join('')}</div>` : `<p class="dwp-big">${esc(g.names[g.by] || '')} ${T('تختار سؤالًا', 'is choosing a question')}</p>`;
      else if (ph === 'word') body = wordUI(k);
      else if (ph === 'num') { if (N.i !== g.i) N = { i: g.i, v: '' }; const v = (g.v || [])[k], p = (g.pl || [])[k];
        body = g.done ? `<p class="dwp-h">${T('الجواب', 'The answer')}</p><p class="dwp-big">${fmtN(g.ans)} ${esc(g.unit || '')}</p>${v >= 0 ? `<p class="dwp-h">${T('تقديركم', 'Your estimate')}: ${fmtN(v)}</p>` : ''}${p ? `<p class="dwp-big">${NUM(p)} ${T('نقطة', 'points')}</p>` : ''}`
          : `<p class="dwp-h">${T('اكتبوا تقديركم', 'Type your estimate')}${g.unit ? ` <small>(${esc(g.unit)})</small>` : ''}</p><input id="dwpNum" class="dwp-num" inputmode="decimal" dir="ltr" value="${esc(N.v)}" autocomplete="off"><button type="button" class="dwp-go" data-nsend>${T('أرسل التقدير', 'Send the estimate')}</button><p class="dwp-ok" id="dwpOk">${(g.s || [])[k] ? T('تم إرسال التقدير، ويمكن تعديله قبل انتهاء الوقت', 'Sent; you may change it before time is up') : ''}</p>`; }
      else if (ph === 'hrl' || ph === 'hrn') body = g.team !== k ? `<p class="dwp-big">${esc(g.names[g.team] || '')} ${T('تختار', 'is choosing')}</p>` : ph === 'hrl'
        ? `<p class="dwp-h">${esc(g.pk || '')}</p><div class="dwp-grid">${(g.lk || []).map((L, j) => `<button type="button" data-pk="${j}"${(g.ls || [])[j] ? '' : ' disabled'} dir="auto">${esc(L)}<small>${NUM((g.ls || [])[j] || 0)}</small></button>`).join('')}</div>`
        : `<p class="dwp-h"><b dir="auto">${esc(g.L)}</b>: ${T('اختاروا رقم السؤال', 'pick a question number')}</p><div class="dwp-grid n">${(g.u || '').split('').map((u, j) => `<button type="button" data-pk="${j}"${u === '1' ? ' disabled' : ''}>${NUM(j + 1)}</button>`).join('')}</div><button type="button" class="dwp-back" data-pk="-1">${g.cats ? T('فئة أخرى', 'Another category') : T('حرف آخر', 'Another letter')}</button>`;
      else if (ph === 'hra') { const who = g.ask >= 0 ? g.ask : g.team;
        body = who !== k ? `<p class="dwp-big">${T('يجيب', 'Answering')}: ${esc(g.names[who] || '')}</p>${g.team === k ? `<p class="dwp-h">${T('إن أخطأت فالنقاط لكم', 'If they miss, the points are yours')}</p>` : ''}`
          : `${g.ask >= 0 ? `<p class="dwp-h">${T('سؤال محوّل إليكم من', 'A question passed to you by')} ${esc(g.names[g.team] || '')}</p>` : ''}${g.n ? `<p class="dwp-h">${T('اختاروا الإجابة', 'Choose the answer')}</p>${opts(g.n, 0, g.gone)}` : `<p class="dwp-big">${T('قولوا الإجابة للمدير', 'Say the answer to the host')}</p>${sayUI()}`}${hlp(g.hl)}`; }
      else if (ph === 'hro') body = g.team !== k ? `<p class="dwp-big">${T('ترتّب الآن', 'Now ordering')}: ${esc(g.names[g.team] || '')}</p>` : roUI() + hlp(g.hl);
      else if (ph === 'intro') body = `<p class="dwp-big">${g.team === k ? T('دوركم! استعدوا', 'Your turn! Get ready') : T('دور', 'Turn:') + ' ' + esc(g.names[g.team] || '')}</p>`;
      else if (ph === 'wait' && g.won != null) body = `<p class="dwp-big">${g.won === k ? T('أصبتم! النقاط لكم', 'Right! The points are yours') : g.won >= 0 ? `${g.pt ? T('النقاط لمجموعة', 'Points to') : T('سبقكم', 'Beaten by')} ${esc(g.names[g.won] || '')}` : T('لم يُصب أحد', 'Nobody got it')}</p>`;
      else body = `<p class="dwp-big">${ph === 'end' ? T('انتهت الأمسية', 'The evening is over') + (g.star ? `<br><small>${T('نجم الأمسية', 'Star of the evening')}: ${esc(g.star)}</small>` : '') : ph === 'chal' ? T('تحدٍّ على الشاشة', 'A challenge on the screen') : T('انتبه للشاشة', 'Watch the screen')}</p>`;
      root.innerHTML = `<div class="dwp" style="--c:${col}"><div class="dwp-top"><b dir="auto">${esc(g.names[k])}</b><span>${NUM((g.sc || [])[k] || 0)}${g.dbl && g.dbl[k] ? ' ×٢' : ''}</span></div>${body}
        ${chs ? `<div class="dwp-ch"><p>${T('فرصكم', 'Your chances')}</p>${chs.split('').map(c => `<button type="button" data-ch="${c}">${CN[c]}</button>`).join('')}</div>` : ''}</div>`;
      root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { ans = +b.dataset.a; if (g.rem || (g.pa && !isLead)) { send('s', '', k, { a: ans }); said = g.rem ? T('تم إرسال اختيارك إلى المدير', 'Your choice was sent to the host') : T('تم إرسال صوتك إلى قائد المجموعة', 'Your vote was sent to the group’s leader'); } else send('a', ans, 0); buzz(25); paint(); });
      if (multi && root.querySelector('.dwp-opts')) root.querySelector('.dwp-opts').insertAdjacentHTML(g.pa && isLead ? 'beforebegin' : 'afterend', `${(g.tv || [])[k] ? `<p class="dwp-tv${g.pa && isLead ? ' lead' : ''}">${g.pa && isLead ? T('أصوات مجموعتك', 'Your group’s votes') : T('اختيارات مجموعتك', 'Your group leans')}: ${esc(g.tv[k])}${(g.tn || [])[k] ? `<small dir="auto">${esc(g.tn[k])}</small>` : ''}</p>` : g.pa && !isLead ? `<p class="dwp-h">${T('صوّت، والقائد يعتمد الإجابة', 'Vote; the leader gives the answer')}${(g.au || [])[k] ? ` · ${T('الإجابة التلقائية برأي الأغلبية مفعّلة', 'the majority answers automatically')}` : ''}</p>` : ''}${g.pa && isLead ? `<button type="button" class="dwp-auto${(g.au || [])[k] ? ' on' : ''}" data-auto>${(g.au || [])[k] ? T('الإجابة التلقائية برأي الأغلبية: مفعّلة', 'Majority answers automatically: on') : T('فعّل الإجابة التلقائية برأي الأغلبية', 'Let the majority answer automatically')}</button>` : ''}${said && !root.querySelector('.dwp-say') ? `<p class="dwp-ok">${said}</p>` : ''}`);
      const atb = root.querySelector('[data-auto]'); if (atb) atb.onclick = () => { send('u', '', (g.au || [])[k] ? 0 : 1); buzz(20); };
      const txi = root.querySelector('#dwpTx'); if (txi) { txi.oninput = () => { tx = txi.value; }; txi.onblur = () => setTimeout(() => { if (pend) paint(); }, 50);
        const go1 = () => { const v = txi.value.trim(); if (!v) return; send('s', '', k, { s: v }); tx = ''; said = T('تم إرسال إجابتك إلى المدير', 'Your answer was sent to the host'); txi.blur(); buzz(25); paint(); };
        root.querySelector('[data-txs]').onclick = go1; txi.onkeydown = e => { if (e.key === 'Enter') go1(); }; }
      const rcb = root.querySelector('[data-rec]'); if (rcb) rcb.onclick = () => recToggle(k);
      const ni = root.querySelector('#dwpNum'); if (ni) { ni.oninput = () => { N.v = ni.value; }; root.querySelector('[data-nsend]').onclick = () => { const v = numIn(ni.value); if (v == null) { ni.focus(); return; } ni.value = N.v = fmtN(v); send('n', '', v); buzz(30); const o = root.querySelector('#dwpOk'); if (o) o.textContent = T('تم إرسال التقدير', 'Estimate sent'); }; }
      root.querySelectorAll('[data-ro]').forEach(b => b.onclick = () => { const t = +b.dataset.ro, p = RO.p.indexOf(t); if (p >= 0) { if (p === RO.p.length - 1 && !(g.fx >= 0 && p === 0)) RO.p.pop(); } else RO.p.push(t); buzz(15); paint(); });
      const rsd = root.querySelector('[data-rsend]'); if (rsd) rsd.onclick = () => { send('w', '', RO.p.reduce((x, t, p) => x + t * Math.pow(16, p), 0)); rsd.disabled = true; buzz(30); };
      root.querySelectorAll('[data-hp]').forEach(b => b.onclick = () => { const c = b.dataset.hp;
        if (c === 'x') { const others = (g.names || []).map((n, i) => i).filter(i => i !== k);
          const d = document.createElement('div'); d.className = 'dwp-sheet'; d.innerHTML = `<div><p>${HL().x}: ${T('أي مجموعة؟', 'which group?')}</p>${others.map(i => `<button type="button" data-t="${i}" style="--c:${g.cols[i]}" dir="auto">${esc(g.names[i])}</button>`).join('')}<button type="button" class="x">${T('إلغاء', 'Cancel')}</button></div>`; root.appendChild(d);
          d.querySelectorAll('[data-t]').forEach(t => t.onclick = () => { send('h', 'x', +t.dataset.t); d.remove(); }); d.querySelector('.x').onclick = () => d.remove(); return; }
        send('h', c, -1); b.disabled = true; buzz(25); });
      root.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => { const p = W.sl.indexOf(null); if (p < 0) return; W.sl[p] = +b.dataset.wt; buzz(15); paint(); });
      root.querySelectorAll('[data-sl]').forEach(b => b.onclick = () => { const p = +b.dataset.sl; if (W.lock[p] || W.sl[p] == null) return; W.sl[p] = null; paint(); });
      const ws = root.querySelector('[data-wsend]'); if (ws) ws.onclick = () => { if (W.sl.some(x => x == null)) return; send('w', String(((g.a || [])[k] || 0) + 1), W.sl.reduce((x, t, p) => x + t * Math.pow(16, p), 0)); W.cool = Date.now() + 2600; buzz(30); paint(); setTimeout(paint, 2700); };
      const bz = root.querySelector('[data-bz]'); if (bz) bz.onclick = () => { buzzed = true; send('b', '', 0); buzz([40, 30, 40]); paint(); };
      root.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { send('p', '', +b.dataset.pk); buzz(30); });
      root.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => {
        const c = b.dataset.ch; if (c === 'x' || c === 'v') { const others = (g.names || []).map((n, i) => i).filter(i => i !== k);
          const d = document.createElement('div'); d.className = 'dwp-sheet'; d.innerHTML = `<div><p>${CN[c]}: ${T('على أي فريق؟', 'on which team?')}</p>${others.map(i => `<button type="button" data-t="${i}" style="--c:${g.cols[i]}" dir="auto">${esc(g.names[i])}</button>`).join('')}<button type="button" class="x">${T('إلغاء', 'Cancel')}</button></div>`; root.appendChild(d);
          d.querySelectorAll('[data-t]').forEach(t => t.onclick = () => { send('c', c, +t.dataset.t); d.remove(); }); d.querySelector('.x').onclick = () => d.remove(); return; }
        if (confirm(CN[c] + '؟')) send('c', c, -1); });
    };
    const opts = (n, tf, no) => `<div class="dwp-opts">${Array.from({ length: n || 4 }, (_, j) => `<button type="button" data-a="${j}" style="--o:${['#2a7fa8', '#b0533a', '#2f7d5b', '#c9822b', '#6b5aa6', '#23336f'][j]}" aria-pressed="${ans === j}"${(no || []).includes(j) || (ph0() === 'race' && ans != null) ? ' disabled' : ''}>${tf ? [T('صح', 'True'), T('خطأ', 'False')][j] : LET()[j]}</button>`).join('')}</div>${ans != null && !said ? `<p class="dwp-ok">${T('وصل اختياركم', 'Your choice is in')}</p>` : ''}`;
    const go = async () => {
      root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('لحظة…', 'One moment…')}</p></div>`;
      try { await fb(); const h = await db.ref('kh/' + pin + '/dw').once('value'); if (!h.exists()) { root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('لا توجد أمسية بهذا الرمز', 'No evening with this code')}</p></div>`; return; } }
      catch (e) { root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('تعذّر الاتصال', 'Could not connect')}</p></div>`; return; }
      const mine = await db.ref('kh/' + pin + '/pl/' + uid).once('value');
      if (!mine.exists()) {
        root.innerHTML = `<div class="dwp"><p class="dwp-big">${T('قائد فريق', 'Team leader')}</p><input id="dwpN" maxlength="20" dir="auto" placeholder="${T('اسمك', 'Your name')}" value="${esc((() => { try { return localStorage.getItem('dw.pname') || ''; } catch (e) { return ''; } })())}"><button type="button" class="dwp-go" id="dwpGo">${T('ادخل', 'Join')}</button></div>`;
        await new Promise(r => { const ni = root.querySelector('#dwpN'); ni.onkeydown = e => { if (e.key === 'Enter') root.querySelector('#dwpGo').click(); }; root.querySelector('#dwpGo').onclick = async () => { wake(); const n = root.querySelector('#dwpN').value.trim().slice(0, 20); if (!n) return; try { localStorage.setItem('dw.pname', n); } catch (e) {} try { await db.ref('kh/' + pin + '/pl/' + uid).set({ n, at: TS() }); r(); } catch (e) { alert(T('تعذّر الدخول', 'Could not join')); } }; });
      }
      db.ref('kh/' + pin + '/g').on('value', s => { g = s.val(); paint(); });
      db.ref('kh/' + pin + '/ld').on('value', s => { lead = s.val() || {}; paint(); });
      db.ref('kh/' + pin + '/mb').on('value', s => { mb = s.val() || {}; paint(); });
    };
    wake(); go();
  }

  /* ---------- the teams' path: tokens that move along the road as the points come in ---------- */
  function pathHtml() {
    const top = Math.max(1, ...D.groups.map(g => g.score)), pos = g => 4 + 88 * g.score / top;
    D.prevPos = D.prevPos || {};
    const html = `<div class="dw-path">${D.groups.map((g, k) => `<div class="dw-lane" style="--c:${g.col}"><span dir="auto">${esc(g.name)}</span><div class="dw-trk">${Array.from({ length: 9 }, (_, j) => `<i style="--x:${(j + 1) * 10}%"></i>`).join('')}<b class="dw-tok" data-tok="${k}" style="--p:${D.prevPos[k] == null ? 4 : D.prevPos[k]}%">${esc(g.name.charAt(0))}</b><em class="dw-flag"></em></div><strong>${NUM(g.score)}</strong></div>`).join('')}</div>`;
    setTimeout(() => { D.groups.forEach((g, k) => { const t = el && el.querySelector(`[data-tok="${k}"]`); if (t) t.style.setProperty('--p', pos(g) + '%'); D.prevPos[k] = pos(g); }); }, 120);
    return html;
  }

  /* ---------- writing the evening with AI: questions in categories and levels, and challenges to suit ---------- */
  const AI_V = '11.10.0', AI_KEY = '6Le4gQsuAAAAAE3jS1mLgG9B2XT8AucvEecF6Kp4', AI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-flash-latest'];
  let aiMk = null, aiModel = null;
  async function gemini(p) {
    if (window.__dwAI) return window.__dwAI(p);
    if (!window.MD_CFG) throw new Error('no-config');
    if (!aiMk) {
      const u = n => `https://www.gstatic.com/firebasejs/${AI_V}/firebase-${n}.js`;
      const [{ initializeApp, getApps }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, VertexAIBackend }] = await Promise.all([import(u('app')), import(u('app-check')), import(u('ai'))]);
      const app = getApps().find(a => a.name === 'mdai') || initializeApp(window.MD_CFG, 'mdai');
      try { initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(AI_KEY), isTokenAutoRefreshEnabled: false }); } catch (e) {}
      const ai = getAI(app, { backend: new VertexAIBackend('global') });
      aiMk = m => getGenerativeModel(ai, { model: m, generationConfig: { temperature: 0.8, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 1024 } } });
    }
    for (let k = aiModel ? aiModel.k : 0; k < AI_MODELS.length; k++) {
      try { const m = aiModel && aiModel.k === k ? aiModel.m : aiMk(AI_MODELS[k]); const r = await m.generateContent(p); aiModel = { k, m }; return r.response.text(); }
      catch (e) { if (!/not.?found|404|not supported/i.test(String(e && e.message))) throw e; aiModel = null; }
    }
    throw new Error('no model');
  }
  const AUD = () => [['fam', T('العائلة والأصدقاء', 'Family and friends')], ['prim', T('طلاب الابتدائي', 'Primary pupils')], ['mid', T('طلاب المتوسط', 'Middle school')], ['sec', T('طلاب الثانوي', 'Secondary school')], ['uni', T('طلاب الجامعة', 'University students')], ['work', T('زملاء العمل', 'Colleagues')]];
  function aiPrompt(o) {
    const aud = (AUD().find(a => a[0] === o.aud) || AUD()[0])[1];
    return `أنت معدّ مسابقات محترف لجمهور سعودي. اكتب محتوى أمسية مسابقات مجموعات حماسية.
الموضوع أو المحتوى: ${o.topic || 'ثقافة عامة منوعة'}
الجمهور: ${aud}
الفئات: ${o.cats.join('، ')}
عدد الأسئلة لكل فئة: ${o.per}، متدرجة الصعوبة: سهل (lv 1) ثم متوسط (lv 2) ثم صعب (lv 3)، بتوزيع متقارب.
عدد التحديات: ${o.nch}، من الأنواع: ${o.kinds.join('، ') || 'منوعة'}. ${o.mat ? 'يجوز أن تحتاج أدوات بسيطة متوفرة في البيت أو المدرسة.' : 'بلا أي أدوات.'}

القواعد:
- معظم الأسئلة اختيار من متعدد بأربعة خيارات قريبة ومقنعة، وبعضها صح أو خطأ، وقليل منها جوابه رقم أو كلمة واحدة.
- تحقق من صحة كل إجابة مرتين، واحذف أي سؤال فيه شك.
- مناسب للبيئة السعودية والذوق العام، بلا أمثلة غربية ولا مناسبات غير مألوفة، ولا موسيقى ولا رقص.
- لكل تحدٍّ يحتاج أدوات اكتب في "alt" بديلًا أسهل لا يحتاج شيئًا.
- التحديات أنشطة جماعية للمجموعات كلها في وقت واحد: تعليمات واضحة قصيرة تُقرأ على الشاشة، ووقت مناسب بالثواني، وطريقة احتساب: "rank" للسباقات والمنافسات التي لها فائز واضح، و"judge" لما يحتاج تقدير الحكم (تمثيل، إبداع، رسم).
- لكل سؤال اختيار من متعدد أو كلمة، اكتب في "letter" أول حرف من الإجابة الصحيحة دون «ال» التعريف (تُستعمل في لعبة الحروف).
- اكتب بالعربية الفصيحة السهلة.

أعد JSON فقط بهذا الشكل:
{"title":"عنوان قصير جذاب","questions":[{"cat":"الفئة","lv":1,"type":"mc","q":"السؤال","opts":["","","",""],"ok":0,"letter":"ر"},{"cat":"الفئة","lv":2,"type":"tf","q":"عبارة","ok":true},{"cat":"الفئة","lv":3,"type":"num","q":"السؤال","ans":1932,"unit":""},{"cat":"الفئة","lv":2,"type":"word","q":"تلميح","ans":"كلمة"}],"challenges":[{"t":"العنوان","d":"التعليمات","s":90,"sc":"rank","mat":"الأدوات أو فارغ","alt":"بديل أسهل","kind":"النوع"}]}`;
  }
  function fromAI(text) {
    const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('no-json'); const j = JSON.parse(m[0]);
    const qs = (j.questions || []).map(q => {
      const base = { cat: String(q.cat || '').trim().slice(0, 20), lv: Math.max(1, Math.min(3, +q.lv || 2)), q: String(q.q || '').trim(), time: 30 }; if (q.letter) base.letter = String(q.letter).trim().charAt(0);
      if (q.type === 'tf') return Object.assign(base, { type: 'tf', opts: [T('صح', 'True'), T('خطأ', 'False')], ok: [q.ok === false || q.ok === 'false' || q.ok === 1 ? 1 : 0], time: 20 });
      if (q.type === 'num') return Object.assign(base, { type: 'num', ans: +q.ans, unit: q.unit || '', opts: ['', ''], ok: [] });
      if (q.type === 'word') return Object.assign(base, { type: 'word', ans: String(q.ans || '').trim(), opts: ['', ''], ok: [] });
      const opts = (q.opts || []).map(o => String(o).trim()).filter(Boolean).slice(0, 6), ok = +q.ok;
      return Object.assign(base, { type: 'mc', opts, ok: ok >= 0 && ok < opts.length ? [ok] : [] });
    }).filter(usable);
    const ch = (j.challenges || []).map(c => ({ t: String(c.t || '').trim().slice(0, 40), d: String(c.d || '').trim().slice(0, 260), s: Math.max(20, Math.min(600, +c.s || 90)), sc: c.sc === 'rank' ? 'rank' : 'judge', mat: String(c.mat || '').trim().slice(0, 60), alt: String(c.alt || '').trim().slice(0, 100) })).filter(c => c.t && c.d);
    return { title: String(j.title || '').trim().slice(0, 80), qs, ch };
  }
  /* ---------- «جهّزها لي»: the length, the kinds of questions and the shape — the AI writes it all, you review or just start ---------- */
  const TYPES = () => [T('دينية', 'Religion'), T('تاريخ إسلامي', 'Islamic history'), T('السيرة النبوية', 'The Prophet’s life'), T('تاريخ السعودية', 'Saudi history'), T('جغرافيا', 'Geography'), T('علوم', 'Science'), T('لغة عربية وأدب', 'Arabic and literature'), T('رياضة', 'Sport'), T('ثقافة عامة', 'General knowledge'), T('أمثال وتراث', 'Proverbs and heritage')];
  const TPL = () => [['mix', T('أسئلة وتحديات', 'Questions and challenges')], ['q', T('أسئلة بلا تحديات', 'Questions, no challenges')], ['c', T('تحديات أكثر', 'More challenges')]];
  const sizeOf = (kind, dur) => { const rate = { mix: .5, h: .75, q: .8, c: .3 }[kind] || .5, ch = { mix: Math.round(dur / 15), h: 0, q: 0, c: Math.min(10, Math.round(dur / 8)) }[kind]; return { nq: Math.max(8, Math.min(60, Math.round(dur * rate))), nch: ch }; };
  function aiBox() {
    const chip = (name, v, l, on, multi) => `<label class="dw-chip"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(v)}"${on ? ' checked' : ''}><span>${l}</span></label>`;
    return `<div class="dw-ai dw-wiz">
      <div class="dw-wq"><b>${T('كم مدة الفعالية؟', 'How long is the event?')}</b><div class="dw-chips">${[30, 45, 60, 90].map(v => chip('wzD', v, v === 60 ? T('ساعة', '1 hour') : v === 90 ? T('ساعة ونصف', '1.5 hours') : NUM(v) + T(' دقيقة', ' min'), v === 60)).join('')}</div></div>
      <div class="dw-wq"><b>${T('وش نوع الأسئلة؟', 'What kind of questions?')}</b><div class="dw-chips">${TYPES().map((t, i) => chip('wzT', t, t, i === 0 || i === 1 || i === 8, true)).join('')}</div><input id="wzX" dir="auto" placeholder="${T('أو اكتب نوعًا آخر أو موضوعًا (اختياري)', 'Or write another kind or topic (optional)')}"></div>
      <div class="dw-wq"><b>${T('شكل المسابقة', 'The shape')}</b><div class="dw-chips">${TPL().map(([v, l], i) => chip('wzS', v, l, i === 0)).join('')}</div></div>
      <div class="dw-aig"><label>${T('الجمهور', 'Audience')}<select id="dwAiA">${AUD().map(a => `<option value="${a[0]}">${a[1]}</option>`).join('')}</select></label><label>${T('المناسبة', 'The occasion')}<select id="wzP">${PACK().map(([v, l]) => `<option value="${v}">${v ? l : T('عامة', 'General')}</option>`).join('')}</select></label></div>
      <button type="button" class="dw-btn" id="dwAiGo">${T('جهّزها', 'Prepare it')}</button><p class="dw-found" id="dwAiS" aria-live="polite"></p></div>`;
  }
  function aiBind(root) {
    const q = s => root.querySelector(s), b = q('#dwAiGo'); if (!b) return;
    b.onclick = async () => {
      const dur = +(root.querySelector('[name=wzD]:checked') || {}).value || 60, kind = (root.querySelector('[name=wzS]:checked') || {}).value || 'mix', extra = q('#wzX').value.trim();
      const cats = [...root.querySelectorAll('[name=wzT]:checked')].map(i => i.value).concat(extra && extra.length < 30 ? [extra] : []).slice(0, 6);
      if (!cats.length) { q('#dwAiS').textContent = T('اختر نوعًا واحدًا على الأقل.', 'Choose at least one kind.'); return; }
      const sz = sizeOf(kind, dur), pack = q('#wzP').value, kinds = { cls: [T('ذكاء وسرعة بديهة', 'Quick wits'), T('تعاون', 'Teamwork')], maj: [T('تمثيل', 'Acting'), T('ذكاء وسرعة بديهة', 'Quick wits')], bar: [T('حركية', 'Moving'), T('تعاون', 'Teamwork')], wrk: [T('تعاون', 'Teamwork'), T('إبداع ورسم', 'Creative')] }[pack] || [T('حركية', 'Moving'), T('تمثيل', 'Acting'), T('ذكاء وسرعة بديهة', 'Quick wits')];
      const o = { topic: extra.length >= 30 ? extra : '', aud: q('#dwAiA').value, per: Math.max(2, Math.ceil(sz.nq / cats.length)), nch: sz.nch, cats, kinds, mat: true };
      const day = new Date().toISOString().slice(0, 10); let used = {}; try { used = JSON.parse(localStorage.getItem('dw.ai') || '{}'); } catch (e) {}
      if (used.d === day && used.n >= 15) { q('#dwAiS').textContent = T('وصلت حد اليوم. جرّب غدًا.', 'Today’s limit reached. Try tomorrow.'); return; }
      b.disabled = true; q('#dwAiS').textContent = T(`يجهّز ${NUM(o.per * cats.length)} سؤالًا${sz.nch ? ` و${NUM(sz.nch)} تحديات` : ''}… قرابة دقيقة`, `Preparing ${o.per * cats.length} questions${sz.nch ? ` and ${sz.nch} challenges` : ''}… about a minute`);
      try {
        const r = fromAI(await gemini(aiPrompt(o))); if (r.qs.length < 2 && !r.ch.length) throw new Error('empty');
        try { localStorage.setItem('dw.ai', JSON.stringify({ d: day, n: (used.d === day ? used.n : 0) + 1 })); } catch (e) {}
        const quiz = { id: Math.random().toString(36).slice(2, 10), title: r.title || cats.join(T(' و', ' & ')), at: Date.now(), qs: r.qs, ch: r.ch, src: 'dw', tpl: { kind, dur, pack } };
        saveQuiz(quiz); b.disabled = false; q('#dwAiS').textContent = '';
        editor(root, quiz, () => home(root));
      } catch (e) { console.error(e); b.disabled = false; q('#dwAiS').textContent = T('تعذّر الآن. جرّب بعد قليل.', 'Could not do it now. Try again shortly.'); }
    };
  }
  // the shape chosen in «جهّزها لي» decides the rounds
  function applyTpl(c, n, P, mc, catQ) {
    const t = c.tpl, W = c.wager && P > 2 ? 1 : 0;
    if (t === 'h') { c.bmode = 'h'; c.r = { all: 0, turn: 0, buzz: 0, chal: 0, board: Math.min(48, Math.max(0, catQ - W)) }; return; }
    if (t === 'q') c.r.chal = 0;
    if (t === 'c') c.r.chal = Math.min(10, Math.max(c.r.chal, Math.round((c.dur || 60) / 8)));
  }

  /* ---------- 3. after each round, and at the end ---------- */
  const ranked = () => D.groups.slice().sort((a, b) => b.score - a.score || b.right - a.right);
  function standings() {
    const top = Math.max(1, ...D.groups.map(g => g.score));
    shell(`<div class="dw-mid dw-st"><h2>${T('الترتيب', 'Standings')}</h2>
      ${pathHtml()}
      <button type="button" class="dw-btn" data-main>${nextLabel()}</button></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = go;
  }
  function final() {
    if (D.seq) { if (D.si < D.seq.length) return mixNext(); D.seq = null; }
    if (D.q) sgCredit(); const stars = Object.values(ROOM.star).sort((a, b) => b.c - a.c), star = stars[0] && stars[0].c ? stars[0] : null; ROOM.sg = []; ROOM.star = {}; sgPaint();
    pub({ ph: 'end', star: star ? star.n : '' }); D.done = true; const R = ranked(), w = R[0], tie = R[1] && R[1].score === w.score; SND.win();
    shell(`<div class="dw-mid dw-fin"><div class="dw-conf" aria-hidden="true">${Array.from({ length: 36 }, (_, k) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--c:${COL[k % COL.length]}"></i>`).join('')}</div>
      <p class="dw-sub">${esc(D.title)}</p><h2>${tie ? T('تعادل في القمة!', 'A tie at the top!') : T('الفائز', 'The winner')}</h2><p class="dw-winner" style="--c:${w.col}" dir="auto">${esc(tie ? R.filter(g => g.score === w.score).map(g => g.name).join(T(' و', ' & ')) : w.name)}</p>
      <div class="dw-pod">${R.slice(0, 3).map((g, k) => `<div class="p${k + 1}" style="--c:${g.col}"><span dir="auto">${esc(g.name)}</span><b>${NUM(g.score)}</b><i>${NUM(k + 1)}</i></div>`).join('')}</div>
      ${star ? `<p class="dw-star" style="--c:${(D.groups[star.k] || {}).col}">${T('نجم الأمسية', 'Star of the evening')}: <b dir="auto">${esc(star.n)}</b> <span dir="auto">(${esc((D.groups[star.k] || {}).name || '')})</span> · ${T(`${NUM(star.c)} من اختياراته كانت صحيحة`, `${star.c} right picks`)}</p>` : ''}
      <table class="dw-tab"><tr><th>${T('المجموعة', 'Group')}</th><th>${T('النقاط', 'Points')}</th><th>${T('إجابات صحيحة', 'Right')}</th>${R.some(g => g.steals) ? `<th>${T('سرقات', 'Steals')}</th>` : ''}${R.some(g => g.chal) ? `<th>${T('تحديات فازت بها', 'Challenges won')}</th>` : ''}</tr>${R.map(g => `<tr><td dir="auto"><i style="background:${g.col}"></i>${esc(g.name)}</td><td>${NUM(g.score)}</td><td>${NUM(g.right)}</td>${R.some(x => x.steals) ? `<td>${NUM(g.steals)}</td>` : ''}${R.some(x => x.chal) ? `<td>${NUM(g.chal || 0)}</td>` : ''}</tr>`).join('')}</table>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('العب مرة ثانية', 'Play again')}</button><button type="button" class="dw-btn ghost" data-cert>${IC.print}${T('اطبع شهادة الفائز', 'Print the winner’s certificate')}</button></div></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => { if (D.mode === 'mix') return mixSetup(); if (['wr', 'qd', 'im'].includes(D.mode)) return wrSetup(D.mode); if (D.mode === 'hr') return hrSetup(D.rk); D.steps = null; setup(); };
    el.querySelector('[data-cert]').onclick = () => cert(tie ? R.filter(g => g.score === w.score) : [w]);
  }

  /* ---------- printouts: a card per group (name and leader), and the winner's certificate ---------- */
  function printPage(title, body, css) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!doctype html><html lang="${isAr() ? 'ar' : 'en'}" dir="${isAr() ? 'rtl' : 'ltr'}"><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:0}body{margin:0;font-family:system-ui,'Segoe UI',Tahoma,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}${css}</style>${body}<script>setTimeout(()=>print(),400)<\/script></html>`); w.document.close();
  }
  function cards() {
    const c = D.cfg; printPage(T('بطاقات المجموعات · دوّارة', 'Group cards · Dawwara'), Array.from({ length: c.n }, (_, k) => `<section style="background:${COL[k]}"><small>${T('دوّارة', 'Dawwara')}</small><b>${esc(c.names[k] || NAMES()[k])}</b>${c.leads[k] ? `<em>${T('القائد', 'Leader')}: ${esc(c.leads[k])}</em>` : ''}</section>`).join(''),
      'section{height:100vh;break-after:page;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3vh;color:#fff}b{font-size:22vh}small{font-size:4vh;opacity:.85;letter-spacing:.1em}em{font-style:normal;font-size:6vh}');
  }
  function cert(ws) {
    const d = new Date().toLocaleDateString(isAr() ? 'ar-SA-u-ca-gregory-nu-arab' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    printPage(T('شهادة الفوز · دوّارة', 'Certificate · Dawwara'), ws.map(w => `<section><div class="f" style="--c:${w.col}"><small>${T('دوّارة', 'Dawwara')}</small><h1>${T('شهادة فوز', 'Certificate of victory')}</h1><p>${T('تُمنح لمجموعة', 'Awarded to the group')}</p><b>${esc(w.name)}</b><p>${T('لفوزها في مسابقة', 'for winning')} «${esc(D.title)}» ${T('بمجموع', 'with')} ${NUM(w.score)} ${T('نقطة', 'points')}</p><em>${d}</em></div></section>`).join(''),
      'section{height:100vh;break-after:page;display:flex;align-items:center;justify-content:center;background:#f7f3ea}.f{width:82vw;height:78vh;border:1.4vh solid var(--c);outline:.4vh solid #c9822b;outline-offset:-3vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vh;text-align:center;color:#14204a;background:#fff}h1{margin:0;font-size:8vh;color:var(--c)}b{font-size:11vh}p{margin:0;font-size:3.6vh}small{font-size:3vh;letter-spacing:.12em;color:#c9822b}em{font-style:normal;font-size:2.6vh;color:#666}');
  }


  /* ---------- «حروف» ready to play: a group picks a letter, then a number; the answer starts with that letter ---------- */
  // the ready games: the same play (a pick, then a number, then the question) over different banks
  const READY = () => ({
    hr: { file: 'huroof.json', t: T('حروف', 'Huroof'), cats: false, pick: T('اختاروا حرفًا', 'Pick a letter'), hint: L => T(`الإجابة تبدأ بحرف «${L}»`, `The answer starts with «${L}»`),
      rule: T('تختار المجموعة صاحبة الدور حرفًا ثم رقم سؤال، وتبدأ إجابته بذلك الحرف. الإجابة دون خيارات ١٠٠ نقطة، ومع عرض الخيارات ٥٠، وإن أخطأت فلأول مجموعة أخرى تجيب نصف النقاط.', 'The group on turn picks a letter, then a question number; the answer starts with that letter. Without options it is worth 100, with the options 50; if they miss, the first other group to answer gets half.'),
      q: (L, q) => q, full: (q, a) => a,
      ai: (L, q, a) => `سؤال من مسابقة «حروف» العربية: تبدأ الإجابة بحرف «${L}».\nالسؤال: ${q}\nالإجابة الصحيحة: ${a}\nاكتب ثلاث إجابات خاطئة مقنعة من نوع الإجابة الصحيحة نفسه (إن كانت دولة فدول، وإن كان صحابيًا فصحابة، وهكذا)، وكل واحدة تبدأ بحرف «${L}» (تُهمل «ال» التعريف)، ولا تكون صحيحة أيضًا، ولا تكرر الإجابة الصحيحة، وبطولها تقريبًا. أعد JSON فقط بالشكل: {"wrong":["","",""]}` },
    ay: { file: 'ayn.json', t: T('أين تقع؟', 'Where is it?'), cats: true, pick: T('اختاروا الفئة', 'Pick a category'), hint: () => T('اذكروا المكان', 'Name the place'),
      rule: T('تختار المجموعة صاحبة الدور فئة ثم رقمًا: مدن ومحافظات ومعالم في المملكة والعالم. الإجابة دون خيارات ١٠٠ نقطة، ومع عرض الخيارات ٥٠، وإن أخطأت فلأول مجموعة أخرى تجيب نصف النقاط.', 'The group on turn picks a category, then a number: cities, governorates and landmarks at home and abroad. Without options 100, with the options 50; after a miss, the first other group gets half.'),
      q: (L, q) => q, full: (q, a) => a,
      ai: (L, q, a) => `سؤال جغرافي: ${q}\nالإجابة الصحيحة: ${a}\nاكتب ثلاث إجابات خاطئة مقنعة من نوع الإجابة نفسه (إن كانت منطقة سعودية فمناطق سعودية بالصيغة نفسها، وإن كانت مدينة فمدن قريبة أو مشابهة، وإن كانت دولة فدول من الإقليم نفسه)، ولا تكون صحيحة أيضًا. أعد JSON فقط بالشكل: {"wrong":["","",""]}` },
    qa: { file: 'qail.json', t: T('من القائل؟', 'Who said it?'), cats: true, pick: T('اختاروا الفئة', 'Pick a category'), hint: L => /مؤلف/.test(L) ? T('اذكروا المؤلف', 'Name the author') : T('اذكروا القائل', 'Name who said it'),
      rule: T('تختار المجموعة صاحبة الدور فئة ثم رقمًا: أبيات مشهورة، وأقوال مأثورة، ومؤلفو كتب. الإجابة دون خيارات ١٠٠ نقطة، ومع عرض الخيارات ٥٠، وإن أخطأت فلأول مجموعة أخرى تجيب نصف النقاط.', 'The group on turn picks a category, then a number: famous verses, sayings, and book authors. Without options 100, with the options 50; after a miss, the first other group gets half.'),
      q: (L, q) => q, full: (q, a) => a,
      ai: (L, q, a) => `من مسابقة «من القائل؟»: ${q}\nالإجابة الصحيحة: ${a}\nاكتب ثلاثة أسماء خاطئة مقنعة من النوع نفسه (شعراء من العصر نفسه أو قريب منه، أو صحابة، أو علماء ومؤلفون في الفن نفسه)، ولا يكون أحدهم صاحب القول أو الكتاب. أعد JSON فقط بالشكل: {"wrong":["","",""]}` },
    ro: { file: 'order.json', t: T('رتّب الأحداث', 'Put them in order'), cats: true, order: true, pick: T('اختاروا الفئة', 'Pick a category'), hint: () => T('رتّبوها من الأقدم إلى الأحدث', 'From the earliest to the latest'),
      rule: T('تختار المجموعة صاحبة الدور فئة ثم رقمًا، فتظهر أربعة أحداث مبعثرة ترتّبها من الأقدم إلى الأحدث. الترتيب الصحيح ١٠٠ نقطة، وكشف الحدث الأول يجعلها ٥٠، وإن أخطأت فلأول مجموعة أخرى ترتّبها نصف النقاط.', 'The group on turn picks a category, then a number; four events appear shuffled to put in order. Right is 100, revealing the first makes it 50; after a miss, the first other group gets half.') },
    mt: { file: 'amthal.json', t: T('أكمل المثل', 'Finish the proverb'), cats: true, pick: T('اختاروا الفئة', 'Pick a category'), hint: () => T('أكملوا المثل', 'Finish the proverb'),
      rule: T('تختار المجموعة صاحبة الدور فئة ثم رقمًا، فيظهر أول المثل وتكمله. التكملة دون خيارات ١٠٠ نقطة، ومع عرض الخيارات ٥٠، وإن أخطأت فلأول مجموعة أخرى تكمله نصف النقاط.', 'The group on turn picks a category, then a number; the start of a proverb appears and they finish it. Without options 100, with the options 50; after a miss, the first other group gets half.'),
      q: (L, q) => `${q} …`, full: (q, a) => `${q} ${a}`,
      ai: (L, q, a) => `مثل أو قول عربي مشهور أوله: «${q}» وتكملته الصحيحة: «${a}».\nاكتب ثلاث تكملات خاطئة مقنعة بطول التكملة الصحيحة وأسلوبها، يظن السامع أنها قد تكون صحيحة، ولا تكون تكملة صحيحة لهذا المثل. أعد JSON فقط بالشكل: {"wrong":["","",""]}` },
    im: { file: 'suwar.json', t: T('خمّن الصورة', 'Guess the picture'), cats: true, nl: T('عدد الصور', 'Pictures'), nw: T('صورة', 'pictures'),
      q: { 'أعلام الدول': T('علم أي دولة؟', 'Which country’s flag?'), 'معالم': T('ما هذا المَعلم؟', 'Which landmark?'), 'حيوانات': T('ما هذا الحيوان؟', 'Which animal?') },
      rule: T('تظهر صورة مقرّبة ومشوشة تتضح شيئًا فشيئًا، مع أربعة خيارات. مع الجوالات: أول إجابة صحيحة ١٠٠ نقطة، و٥٠ بعد أي خطأ، ومن يخطئ يخرج من السؤال. بلا جوالات: ترفع المجموعة يدها ويسجّل المدير إجابتها.', 'A close, blurred picture that clears bit by bit, with four options. With phones: first right answer 100, 50 after a miss; a wrong answer is out. Without phones: groups raise hands and the host records.') },
    qd: { file: 'qadir.json', t: T('قدّرها', 'Estimate it'), cats: true, nl: T('عدد الأسئلة', 'Questions'), nw: T('سؤالًا', 'questions'),
      rule: T('يظهر سؤال جوابه رقم، فيكتب قائد كل مجموعة تقديره على جواله، ويكتب المدير تقدير المجموعة التي ليس معها جوال. عند انتهاء الوقت يظهر الجواب على خط الأرقام مع تقديرات المجموعات: الأقرب ١٠٠ نقطة، والذي يليه ٥٠.', 'A question with a number for an answer; each leader types an estimate on the phone. At the end the answer shows on a number line with every estimate: the closest 100, the next 50.') },
    wr: { file: 'kalimat.json', t: T('سباق الكلمات', 'Word race'), cats: true, nl: T('عدد الجمل', 'Sentences'), nw: T('جملة', 'sentences'),
      rule: T('تظهر كلمات مثل أو بيت أو قول مأثور مبعثرة، ويرتّبها قائد كل مجموعة على جواله ثم يرسل. تظهر محاولات المجموعات على الشاشة مباشرة، والمربع الأخضر كلمة في مكانها الصحيح. الأول ١٠٠ نقطة، والثاني ٥٠.', 'The words of a proverb, a verse or a saying appear shuffled; each leader orders them on the phone and sends. Every attempt shows live on the screen; a green square is a word in its place. First 100, second 50.') },
  });
  const HRB = {}, rkOf = () => (D && D.rk) || 'hr';
  const hrUsed = rk => { try { return new Set(JSON.parse(localStorage.getItem(`dw.${rk || rkOf()}.used`) || '[]')); } catch (e) { return new Set(); } };
  const hrSave = u => { try { localStorage.setItem(`dw.${rkOf()}.used`, JSON.stringify([...u])); } catch (e) {} };
  const hrLoad = rk => HRB[rk] ? Promise.resolve(HRB[rk]) : fetch(new URL(READY()[rk].file, location.href.split('?')[0].replace(/[^/]*$/, '')).href).then(r => r.json()).then(j => (HRB[rk] = j.L));
  async function hrSetup(rk) {
    rk = rk || rkOf(); const RD = READY()[rk];
    let B; try { B = await hrLoad(rk); } catch (e) { alert(T(`تعذّر تحميل أسئلة «${RD.t}». يُرجى التحقق من الاتصال.`, 'Could not load the questions.')); return; }
    const c = cfgGet(), used = hrUsed(rk), all = Object.values(B).reduce((n, v) => n + v.length, 0), left = Object.entries(B).reduce((n, [L, v]) => n + v.filter((_, i) => !used.has(L + ':' + i)).length, 0);
    D = { mode: 'hr', rk, title: RD.t, cfg: Object.assign(c, { chn: false }), steps: [] };
    c.hrt = c.hrt || 30; if (c.hrh == null) c.hrh = 1;
    const paint = () => {
      shell(`<div class="dw-set dw-hrset"><p class="dw-sub">${T('مسابقة جاهزة', 'Ready to play')}</p><h2>${esc(RD.t)}</h2>
        <p class="dw-hrrule">${RD.rule}</p>
        <div class="dw-row"><span>${T('عدد المجموعات', 'Groups')}</span><div class="dw-seg" data-n>${[2, 3, 4, 5, 6].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.n === n}">${NUM(n)}</button>`).join('')}</div></div>
        <div class="dw-hrnames">${Array.from({ length: c.n }, (_, k) => `<label style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="20" dir="auto" value="${esc(c.names[k] || NAMES()[k])}"></label>`).join('')}</div>
        <div class="dw-row"><span>${T('وقت السؤال', 'Time per question')}</span><div class="dw-seg" data-t>${[20, 30, 45, 60].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.hrt === n}">${NUM(n)} ${T('ث', 's')}</button>`).join('')}</div></div>
        <div class="dw-row"><span>${T('وسائل المساعدة لكل مجموعة', 'Help for each group')}<small>${T('احذف إجابتين، وغيّر السؤال، ووقت إضافي، واسأل الخصم: عدد مرات كل منها', 'Remove two, change the question, extra time, ask a rival: uses of each')}</small></span><div class="dw-seg" data-h>${[0, 1, 2, 3].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.hrh === n}">${n ? NUM(n) : T('بلا', 'None')}</button>`).join('')}</div></div>
        <details class="dw-wrph"${ROOM.ref ? ' open' : ''}><summary>${T('الجوالات', 'Phones')} <small>${T('اختياري: يختار القائد ويجيب ويستخدم وسائل المساعدة من جواله', 'Optional: the leader picks, answers and uses help from the phone')}</small></summary><div id="dwPh"></div></details>
        <p class="dw-hrleft">${T(`${NUM(left)} سؤالًا لم تُلعب بعد على هذا الجهاز، من ${NUM(all)}.`, `${left} of ${all} questions not yet played on this device.`)}${left < all ? ` <button type="button" class="dw-lnk" data-reset>${T('إعادة الأسئلة كلها', 'Bring all questions back')}</button>` : ''}</p>
        <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ', 'Start')}</button></div></div>`, 'dw-in');
      const read = () => { el.querySelectorAll('[data-name]').forEach(i => { c.names[+i.dataset.name] = i.value.trim(); }); };
      el.querySelectorAll('[data-name]').forEach(i => i.oninput = () => { read(); leadPaint(); pub(); });
      const pd = el.querySelector('details.dw-wrph'); pd.ontoggle = () => { if (pd.open) phonesBox(); }; if (pd.open) phonesBox();
      el.querySelectorAll('[data-n] [data-v]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-t] [data-v]').forEach(b => b.onclick = () => { read(); c.hrt = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-h] [data-v]').forEach(b => b.onclick = () => { read(); c.hrh = +b.dataset.v; cfgSet(c); paint(); });
      const rs = el.querySelector('[data-reset]'); if (rs) rs.onclick = () => { if (!confirm(T('تعود كل الأسئلة متاحة، ومنها ما لُعب سابقًا. هل تريد المتابعة؟', 'All questions become available again. Continue?'))) return; hrSave(new Set()); hrSetup(rk); };
      el.querySelector('[data-main]').onclick = () => { read(); cfgSet(c);
        D.groups = Array.from({ length: c.n }, (_, k) => ({ name: c.names[k] || NAMES()[k], col: COL[k], score: 0, right: 0, steals: 0, chal: 0, chances: '', h: { d: c.hrh, s: c.hrh, t: c.hrh, x: c.hrh } }));
        D.hr = { B, used: hrUsed(rk), turn: 0, n: 0, pend: {}, RD }; SND.go(); hrLetters(); };
    };
    paint();
  }
  const hrLeft = L => D.hr.B[L].filter((_, i) => !D.hr.used.has(L + ':' + i)).length;
  function hrLetters() {
    const H = D.hr, g = D.groups[H.turn];
    if (!Object.keys(H.B).some(L => hrLeft(L)) || (H.lim && H.n >= H.lim)) return final();
    shell(`${board(H.turn)}<div class="dw-mid dw-hr2" style="--c:${g.col}"><h2>${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span></h2><p>${H.RD.pick}</p>
      <div class="dw-hrg${H.RD.cats ? ' cats' : ''}" style="--n:${Math.min(4, Object.keys(H.B).length)}">${Object.keys(H.B).map(L => { const n = hrLeft(L); return `<button type="button" data-l="${L}"${n ? '' : ' disabled'}><b>${L}</b><small>${NUM(n)}</small></button>`; }).join('')}</div>
      <div class="dw-hrf"><button type="button" class="dw-btn ghost" data-skip>${T('تخطّي الدور', 'Skip turn')}</button><button type="button" class="dw-btn ghost" data-end>${D.seq ? T('إنهاء الجولة', 'End the round') : T('إنهاء وإعلان النتيجة', 'End and show the result')}</button></div></div>`, 'dw-in');
    el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { SND.tick(); hrNumbers(b.dataset.l); });
    const ks = Object.keys(H.B); D.q = null;
    D.pickCb = (k, x) => { if (k !== H.turn || !ks[x] || !hrLeft(ks[x])) return; SND.tick(); hrNumbers(ks[x]); };
    pub({ ph: 'hrl', team: H.turn, i: 'L' + H.n, lk: ks, ls: ks.map(hrLeft), pk: H.RD.pick });
    el.querySelector('[data-skip]').onclick = () => { H.turn = (H.turn + 1) % D.groups.length; hrLetters(); };
    el.querySelector('[data-end]').onclick = () => { if (confirm(D.seq ? T('إنهاء هذه الجولة والانتقال إلى التالية؟', 'End this round and go on?') : T('إنهاء المسابقة وإعلان النتيجة؟', 'End and show the result?'))) final(); };
  }
  function hrNumbers(L) {
    const H = D.hr, g = D.groups[H.turn];
    shell(`${board(H.turn)}<div class="dw-mid dw-hr2" style="--c:${g.col}"><h2>${H.RD.cats ? `<span class="dw-hrC" dir="auto">${esc(L)}</span>` : `<span class="dw-hrL">${L}</span>`}</h2><p>${T(`<span dir="auto">${esc(g.name)}</span>: اختاروا رقم السؤال`, `<span dir="auto">${esc(g.name)}</span>: pick a question number`)}</p>
      <div class="dw-hrn">${H.B[L].map((_, i) => { const u = H.used.has(L + ':' + i); return `<button type="button" data-i="${i}"${u ? ' disabled class="used"' : ''}>${NUM(i + 1)}</button>`; }).join('')}</div>
      <div class="dw-hrf"><button type="button" class="dw-btn ghost" data-back>${T('حرف آخر', 'Another letter')}</button></div></div>`, 'dw-in');
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { SND.go(); hrAsk(L, +b.dataset.i); });
    el.querySelector('[data-back]').onclick = hrLetters;
    D.pickCb = (k, x) => { if (k !== H.turn) return; if (x < 0) return hrLetters(); if (H.B[L][x] && !H.used.has(L + ':' + x)) { SND.go(); hrAsk(L, x); } };
    pub({ ph: 'hrn', team: H.turn, i: 'N' + H.n, L, cats: H.RD.cats ? 1 : 0, u: H.B[L].map((_, i) => H.used.has(L + ':' + i) ? '1' : '0').join('') });
  }
  // wrong answers that look right: from the assistant when it can be reached, else from answers of the same kind under the same letter
  const hrKind = q => [[/عاصمة/, 'capital'], [/المدينة|المحافظة|المنطقة|مدينة|جزيرة|بلدة|قرية/, 'place'], [/الدولة|دولة|البلد/, 'country'], [/النبي|نبي/, 'prophet'], [/الصحابي|صحابي|الصحابية|أم المؤمنين|الخليف|زوج النبي|ابنة النبي|عم النبي/, 'sahabi'], [/الحيوان|الطائر|الحشرة|الزاحف|السمك|حيوان|طائر|حشرة/, 'animal'], [/الفاكهة|الثمرة|النبات|الخضار|الشجرة|الطعام|الحبوب|العشبة|التابل|المشروب|نبات|شجرة|طعام/, 'food'], [/سورة|السورة/, 'sura'], [/الغزوة|المعركة|معركة|غزوة/, 'battle'], [/الشاعر|العالم|القائد|مؤلف|من القائل|الملك|الفيلسوف|المخترع|من هو|الإمام|شاعر|عالم/, 'person'], [/الشهر/, 'month'], [/العضو|الجسم|جسم الإنسان/, 'body'], [/العلم الذي|علم /, 'science'], [/الجهاز|الآلة|الأداة|جهاز|آلة|أداة/, 'tool'], [/المعدن|العنصر|الغاز|المادة|معدن|مادة/, 'matter']].reduce((k, [r, v]) => k || (r.test(q) ? v : ''), '') || 'other';
  const CAPS = 'الرياض القاهرة عمّان دمشق بيروت بغداد الكويت الدوحة المنامة مسقط صنعاء أبوظبي الخرطوم طرابلس تونس الجزائر الرباط نواكشوط مقديشو جيبوتي أنقرة طهران كابول إسلام_آباد نيودلهي دكا كاتماندو كولومبو بكين طوكيو سيول بانكوك هانوي جاكرتا كوالالمبور مانيلا سنغافورة طشقند أستانا باكو تفليس يريفان موسكو كييف وارسو برلين باريس لندن مدريد لشبونة روما أثينا فيينا برن بروكسل أمستردام كوبنهاغن أوسلو ستوكهولم هلسنكي دبلن براغ بودابست بوخارست صوفيا بلغراد زغرب تيرانا سراييفو واشنطن أوتاوا مكسيكو هافانا برازيليا بوينس_آيرس سانتياغو ليما بوغوتا كاراكاس كيتو نيروبي أديس_أبابا أبوجا أكرا داكار كمبالا كيغالي لواندا بريتوريا كانبرا ويلينغتون أسمرة باماكو نيامي أنجمينا دوشنبه بيشكيك عشق_آباد مينسك ريغا تالين فيلنيوس'.split(' ').map(x => x.replace(/_/g, ' '));
  // two spellings of one name (بوجوتا، بوغوتا) must never sit together among the options
  const near = (x, y) => { x = String(x).replace(/^ال/, ''); y = String(y).replace(/^ال/, ''); if (Math.abs(x.length - y.length) > 2) return false; const d = Array.from({ length: y.length + 1 }, (_, j) => j);
    for (let i = 1; i <= x.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= y.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (x[i - 1] === y[j - 1] ? 0 : 1)); p = t; } } return d[y.length] <= 2; };
  const hrCache = () => { try { return JSON.parse(localStorage.getItem(`dw.${rkOf()}.opts`) || '{}'); } catch (e) { return {}; } };
  function hrWrong(L, i) {
    const H = D.hr, key = L + ':' + i, fx = H.B[L][i][2]; if (Array.isArray(fx) && fx.length >= 3) return Promise.resolve(fx.slice(0, 3));
    const c = hrCache(); if (c[key]) return Promise.resolve(c[key]);
    if (H.pend[key]) return H.pend[key];
    const [q, a] = H.B[L][i], k = hrKind(q), pool = H.B[L].filter((x, j) => j !== i), same = pool.filter(x => hrKind(x[0]) === k).map(x => x[1]), other = pool.filter(x => hrKind(x[0]) !== k).map(x => x[1]);
    // same kind under the same pick first, then the same kind elsewhere in the bank (for letters, only answers that start with the letter)
    const far = k === 'other' ? [] : Object.entries(H.B).filter(([M]) => M !== L).flatMap(([, v]) => v.filter(x => hrKind(x[0]) === k).map(x => x[1])).filter(x => H.RD.cats || String(x).replace(/^ال/, '').startsWith(L.replace(/^ال/, '')) || String(x).startsWith(L));
    if (k === 'capital') far.push(...CAPS.filter(x => H.RD.cats || x.startsWith(L)));
    const local = () => { const o = []; [...shuf(same), ...shuf(far), ...shuf(other)].forEach(x => { if (o.length < 3 && x !== a && !near(x, a) && !o.some(y => near(x, y))) o.push(x); }); return o; };
    const ai = gemini(H.RD.ai(L, q, a))
      .then(t => { const w = [...new Set((JSON.parse(String(t).replace(/^```json|```$/g, '')).wrong || []).map(x => String(x).trim()))].filter(x => x && x !== a).slice(0, 3); if (w.length < 3) throw 0; const cc = hrCache(); cc[key] = w; try { localStorage.setItem(`dw.${rkOf()}.opts`, JSON.stringify(cc)); } catch (e) {} return w; })
      .catch(() => local());
    H.pend[key] = Promise.race([ai, new Promise(r => setTimeout(() => r(null), 9000))]).then(w => w || local());
    return H.pend[key];
  }
  // after a miss the others race on their phones; the first to press is marked for the host to hear
  const hrStealPh = (st, turn) => { st.who = null; const i = 'S' + D.hr.n;
    st.onBuzz = k => { if (k === turn || st.who != null) return; st.who = k; SND.tick(); const b = el.querySelector(`[data-st="${k}"]`); if (b) { b.classList.add('first'); b.parentNode.prepend(b); } pub({ ph: 'buzz', i, out: [turn], who: k, say: 1 }); };
    pub({ ph: 'buzz', i, out: [turn], say: 1 }); };
  const HLB = () => ({ o: T('اعرض الخيارات', 'Show the options'), d: T('احذف إجابتين', 'Remove two'), s: T('غيّر السؤال', 'Change the question'), t: T('وقت إضافي', 'Extra time'), x: T('اسأل الخصم', 'Ask a rival'), f: T('اكشف الحدث الأول', 'Reveal the first') });
  function hrOrder(L, i) {
    const H = D.hr, g = D.groups[H.turn], set = H.B[L][i], E = set.e, dur = Math.max(45, D.cfg.hrt || 30), st = D.q = { dur, left: dur, locked: false, val: 100, pick: [], fixed: false };
    H.used.add(L + ':' + i); hrSave(H.used); D.pickCb = null;
    const sh = shuf(E.map((_, k) => k)); if (sh.every((v, k) => v === k)) sh.reverse();
    shell(`${board(H.turn)}<div class="dw-q dw-hrq dw-ro" style="--c:${g.col}"><div class="dw-qh"><span class="dw-who"><b dir="auto">${esc(L)}</b> · ${T('السؤال', 'Question')} ${NUM(i + 1)} · <span dir="auto" style="color:${g.col}">${esc(g.name)}</span> · <span id="dwVal">${NUM(100)} ${T('نقطة', 'points')}</span></span>${ring(dur)}</div>
      <h2 class="dw-qt" dir="auto">${esc(set.q || T('رتّبوا الأحداث من الأقدم إلى الأحدث', 'Put the events in order, earliest first'))}</h2><p class="dw-hrhint">${T('اضغطوا الأحداث بالترتيب: الأقدم أولًا', 'Tap them in order, earliest first')}</p>
      <div class="dw-rol" id="dwRol"></div><div class="dw-hrhelp" id="dwHelp"></div><div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    const val = v => { st.val = v; el.querySelector('#dwVal').textContent = `${NUM(v)} ${T('نقطة', 'points')}`; };
    const paint = (done) => { const box = el.querySelector('#dwRol');
      box.innerHTML = sh.map(k => { const p = st.pick.indexOf(k); return `<button type="button" data-e="${k}"${st.locked ? ' disabled' : ''} class="${p >= 0 ? 'on' : ''}${done ? (p === k ? ' ok' : ' no') : ''}"><i>${p >= 0 ? NUM(p + 1) : ''}</i><span dir="auto">${esc(E[k][0])}</span>${done ? `<small>${NUM(k + 1)} · ${esc(E[k][1])}</small>` : ''}</button>`; }).join('');
      box.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const k = +b.dataset.e, p = st.pick.indexOf(k); if (p >= 0) { if (p === st.pick.length - 1 && !(st.fixed && p === 0)) st.pick.pop(); } else st.pick.push(k); SND.tick(); paint(); foot(); }); };
    const foot = () => { const f = el.querySelector('#dwFoot'); if (st.locked) return; f.innerHTML = `<button type="button" class="dw-btn" data-main${st.pick.length === E.length ? '' : ' disabled'}>${T('تحقّق من الترتيب', 'Check the order')}</button>`; f.querySelector('[data-main]').onclick = check; };
    const avail = () => st.locked ? [] : [...(!st.fixed ? ['f'] : []), ...['s', 't'].filter(k => g.h[k] > 0)];
    const hpub = () => { if (!st.locked) pub({ ph: 'hro', team: H.turn, i: 'O' + H.n + ':' + L + ':' + i, ev: sh.map(k => E[k][0]), fx: st.fixed ? sh.indexOf(0) : -1, hl: avail().join('') }); };
    st.onHelp = (k, c) => { if (k === H.turn && avail().includes(c)) doHelp(c); };
    st.onWord = (k, x) => { if (k !== H.turn || st.locked) return; const n = E.length, perm = Array.from({ length: n }, (_, p) => Math.floor(x / Math.pow(16, p)) % 16);
      if (new Set(perm).size !== n || perm.some(t => t >= n)) return; st.pick = perm.map(t => sh[t]); paint(); check(); };
    const helps = () => { const h = el.querySelector('#dwHelp'); if (st.locked) { h.innerHTML = ''; return; }
      h.innerHTML = `${!st.fixed ? `<button type="button" class="dw-hb" data-h="f">${T('اكشف الحدث الأول', 'Reveal the first')} <small>${T('النقاط تصبح', 'worth')} ${NUM(50)}</small></button>` : ''}${g.h.s > 0 ? `<button type="button" class="dw-hb" data-h="s">${T('غيّر السؤال', 'Change the question')} <small>×${NUM(g.h.s)}</small></button>` : ''}${g.h.t > 0 ? `<button type="button" class="dw-hb" data-h="t">${T('وقت إضافي', 'Extra time')} <small>×${NUM(g.h.t)}</small></button>` : ''}`;
      h.querySelectorAll('[data-h]').forEach(b => b.onclick = () => doHelp(b.dataset.h)); hpub(); };
    const doHelp = k => {
        if (k === 'f') { st.fixed = true; st.pick = [0].concat(st.pick.filter(x => x !== 0)); val(50); paint(); foot(); }
        if (k === 't') { g.h.t--; st.left = Math.min(st.left + 15, 999); st.dur = Math.max(st.dur, st.left); clock(st, timeUp); flash(T('+١٥ ثانية', '+15 seconds')); }
        if (k === 's') { const free = H.B[L].map((_, j) => j).filter(j => !H.used.has(L + ':' + j)); if (!free.length) return flash(T('لا أسئلة أخرى في هذه الفئة', 'No other questions here')); g.h.s--; clearInterval(tick); return hrOrder(L, free[Math.floor(Math.random() * free.length)]); }
        helps(); };
    const next = () => { H.turn = (H.turn + 1) % D.groups.length; H.n++; setTimeout(hrLetters, 900); };
    const check = () => { st.locked = true; clearInterval(tick); helps(); const ok = st.pick.length === E.length && st.pick.every((k, p) => k === p); paint(true);
      const f = el.querySelector('#dwFoot');
      if (ok) { const p = award(g, st.val); g.right++; SND.ok(); flash(`${g.name}: ${NUM(p)} ${T('نقطة', 'points')}`); f.innerHTML = ''; pub({ ph: 'wait', pt: 1, i: 'W' + H.n, won: H.turn }); return next(); }
      SND.no(); const pts = Math.round(st.val / 2), others = D.groups.map((x, k) => k).filter(k => k !== H.turn);
      f.innerHTML = `<p class="dw-hrsteal">${T('الترتيب الصحيح ظاهر بالأرقام. هل رتّبتها مجموعة أخرى قبل غيرها؟', 'The right order is shown. Did another group get it first?')}</p><div class="dw-hrjudge">${others.map(k => `<button type="button" class="dw-btn ghost dw-hrg1" data-st="${k}" style="--c:${D.groups[k].col}" dir="auto">${esc(D.groups[k].name)} <small>${NUM(pts)} ${T('نقطة', 'pts')}</small></button>`).join('')}<button type="button" class="dw-btn ghost" data-none>${T('لم تُصب أي مجموعة', 'Nobody')}</button></div>`;
      f.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const o = D.groups[+b.dataset.st], p = award(o, pts); o.steals++; SND.ok(); flash(`${o.name}: ${NUM(p)} ${T('نقطة', 'points')}`); next(); });
      f.querySelector('[data-none]').onclick = next; hrStealPh(st, H.turn); };
    const timeUp = () => { if (st.locked) return; SND.no(); st.pick = st.pick.length === E.length ? st.pick : st.pick.concat(E.map((_, k) => k).filter(k => !st.pick.includes(k))); check(); };
    paint(); foot(); helps(); clock(st, timeUp);
  }
  function hrAsk(L, i) {
    if (D.hr.RD.order) return hrOrder(L, i);
    const H = D.hr, g = D.groups[H.turn], [q, a] = H.B[L][i], dur = D.cfg.hrt || 30, st = D.q = { dur, left: dur, locked: false, val: 100, opts: null, gone: [], ask: null };
    H.used.add(L + ':' + i); hrSave(H.used); const wrongP = hrWrong(L, i); D.pickCb = null;
    shell(`${board(H.turn)}<div class="dw-q dw-hrq" style="--c:${g.col}"><div class="dw-qh"><span class="dw-who">${H.RD.cats ? `<b dir="auto">${esc(L)}</b>` : `<b class="dw-hrL sm">${L}</b>`} · ${T('السؤال', 'Question')} ${NUM(i + 1)} · <span dir="auto" style="color:${g.col}">${esc(g.name)}</span><span id="dwAsk"></span> · <span id="dwVal">${NUM(100)} ${T('نقطة', 'points')}</span></span>${ring(dur)}</div>
      <h2 class="dw-qt" dir="auto">${esc(H.RD.q(L, q))}</h2><p class="dw-hrhint">${H.RD.hint(L)}</p><div id="dwOpts"></div>
      <div class="dw-hrhelp" id="dwHelp"></div><div class="dw-foot" id="dwFoot"><button type="button" class="dw-btn" data-main>${T('أظهر الإجابة', 'Show the answer')}</button></div></div>`, 'dw-ask');
    const val = v => { st.val = v; const e = el.querySelector('#dwVal'); if (e) e.textContent = `${NUM(v)} ${T('نقطة', 'points')}`; };
    const avail = () => st.locked ? [] : st.ask != null ? (!st.opts ? ['o'] : []) : [...(!st.opts ? ['o'] : []), ...['d', 's', 't'].filter(k => g.h[k] > 0 && (k !== 'd' || (st.opts && !st.gone.length))), ...(g.h.x > 0 && D.groups.length > 1 ? ['x'] : [])];
    const hpub = () => { if (!st.locked) pub({ ph: 'hra', team: H.turn, ask: st.ask == null ? -1 : st.ask, i: 'A' + H.n + ':' + L + ':' + i, n: st.opts ? st.opts.length : 0, gone: st.gone.length ? st.gone : [-1], hl: avail().join('') }); };
    const helps = () => { const h = el.querySelector('#dwHelp'); if (!h || st.locked) { if (h) h.innerHTML = ''; return; }
      h.innerHTML = avail().map(k => `<button type="button" class="dw-hb" data-h="${k}">${HLB()[k]} <small>${k === 'o' ? `${T('النقاط تصبح', 'worth')} ${NUM(50)}` : '×' + NUM(g.h[k])}</small></button>`).join('');
      h.querySelectorAll('[data-h]').forEach(b => b.onclick = () => help(b.dataset.h)); hpub(); };
    const rival = t => { if (st.locked || st.ask != null || !(g.h.x > 0) || t === H.turn || !D.groups[t]) return; g.h.x--; st.ask = t; SND.tick();
      el.querySelector('#dwAsk').innerHTML = ` ← <span dir="auto" style="color:${D.groups[t].col}">${esc(D.groups[t].name)}</span>`;
      flash(T(`السؤال الآن عند مجموعة ${D.groups[t].name}`, `Now for ${D.groups[t].name}`)); el.querySelector('.dw-hrhint').textContent = T(`إن أصابت فالنقاط لها، وإن أخطأت فهي لمجموعة ${g.name}`, `Right: theirs. Wrong: ${g.name}’s`); helps(); };
    st.onHelp = (k, c, x) => { if (k !== (c === 'o' && st.ask != null ? st.ask : H.turn) || !avail().includes(c)) return; if (c === 'x') rival(+x); else help(c); };
    st.onAns = (k, j) => { if (st.locked || !st.opts || k !== (st.ask == null ? H.turn : st.ask) || st.gone.includes(j) || !(j >= 0 && j < st.opts.length)) return; pickOpt(j); };
    const paintOpts = () => { const o = el.querySelector('#dwOpts');
      o.innerHTML = `<div class="dw-opts n4">${st.opts.map((x, j) => `<button type="button" data-j="${j}" style="--o:var(--dwo${j})"${st.gone.includes(j) ? ' disabled class="gone"' : ''}><i>${LET()[j]}</i><span dir="auto">${esc(x)}</span></button>`).join('')}</div>`;
      o.querySelectorAll('[data-j]').forEach(b => b.onclick = () => pickOpt(+b.dataset.j)); };
    const help = async k => {
      if (k === 'o') { const hb = el.querySelector('[data-h="o"]'); if (hb) { hb.disabled = true; hb.innerHTML = T('لحظة…', 'One moment…'); }
        const w = await wrongP; if (!D || D.q !== st || st.locked || st.opts) return; st.opts = shuf([a, ...w]); val(50); paintOpts(); helps(); el.querySelector('#dwFoot').innerHTML = `<p class="dw-hrsteal">${T('اضغط إجابة المجموعة', 'Tap the group’s answer')}</p>`; return; }
      if (k === 'x') { const h = el.querySelector('#dwHelp'); h.innerHTML = `<span class="dw-hrsteal">${T('على أي مجموعة؟', 'Which group?')}</span>${D.groups.map((o, t) => t === H.turn ? '' : `<button type="button" class="dw-hb" data-ax="${t}" style="border-color:${o.col}" dir="auto">${esc(o.name)}</button>`).join('')}<button type="button" class="dw-hb" data-ax="-1">${T('إلغاء', 'Cancel')}</button>`;
        h.querySelectorAll('[data-ax]').forEach(b => b.onclick = () => +b.dataset.ax < 0 ? helps() : rival(+b.dataset.ax)); return; }
      if (!(g.h[k] > 0)) return; g.h[k]--; SND.tick();
      if (k === 't') { st.left = Math.min(st.left + 15, 999); st.dur = Math.max(st.dur, st.left); clock(st, () => { SND.no(); timeUp(); }); flash(T('+١٥ ثانية', '+15 seconds')); }
      if (k === 'd') { const wrongs = st.opts.map((x, j) => j).filter(j => st.opts[j] !== a); st.gone = shuf(wrongs).slice(0, 2); paintOpts(); }
      if (k === 's') { const free = H.B[L].map((_, j) => j).filter(j => !H.used.has(L + ':' + j)); if (!free.length) { g.h[k]++; return flash(T('لا أسئلة أخرى في هذا الحرف', 'No other questions under this letter')); } clearInterval(tick); return hrAsk(L, free[Math.floor(Math.random() * free.length)]); }
      helps();
    };
    const steal = (pts, html) => { const f = el.querySelector('#dwFoot'), others = D.groups.map((x, k) => k).filter(k => k !== H.turn);
      f.innerHTML = `${html}<p class="dw-hrsteal">${T('هل أجابت مجموعة أخرى قبل غيرها؟', 'Did another group answer first?')}</p><div class="dw-hrjudge">${others.map(k => `<button type="button" class="dw-btn ghost dw-hrg1" data-st="${k}" style="--c:${D.groups[k].col}" dir="auto">${esc(D.groups[k].name)} <small>${NUM(pts)} ${T('نقطة', 'pts')}</small></button>`).join('')}<button type="button" class="dw-btn ghost" data-none>${T('لم تُصب أي مجموعة', 'Nobody')}</button></div>`;
      f.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const o = D.groups[+b.dataset.st], p = award(o, pts); o.steals++; SND.ok(); flash(`${o.name}: ${NUM(p)} ${T('نقطة', 'points')}`); next(); });
      f.querySelector('[data-none]').onclick = next; hrStealPh(st, H.turn); };
    const win = () => { const w = st.ask != null ? D.groups[st.ask] : g, p = award(w, st.val); w.right++; SND.ok(); flash(`${w.name}: ${NUM(p)} ${T('نقطة', 'points')}`); pub({ ph: 'wait', pt: 1, i: 'W' + H.n, won: D.groups.indexOf(w) }); next(); };
    // the rival missed: the points go to the group that asked
    const miss = () => { SND.no(); const o = D.groups[st.ask], p = award(g, st.val); el.querySelector('#dwFoot').innerHTML = ans; flash(`${o.name} ${T('أخطأت', 'missed')} · ${g.name}: ${NUM(p)} ${T('نقطة', 'points')}`); pub({ ph: 'wait', pt: 1, i: 'W' + H.n, won: H.turn }); H.turn = (H.turn + 1) % D.groups.length; H.n++; setTimeout(hrLetters, 2600); };
    const ans = `<p class="dw-hrans" dir="auto">${esc(H.RD.full(q, a))}</p>`;
    const pickOpt = j => { if (st.locked) return; st.locked = true; clearInterval(tick); helps(); const ok = st.opts[j] === a;
      el.querySelectorAll('[data-j]').forEach(b => { b.disabled = true; if (st.opts[+b.dataset.j] === a) b.classList.add('ok'); }); if (!ok) el.querySelector(`[data-j="${j}"]`).classList.add('no');
      if (ok) { el.querySelector('#dwFoot').innerHTML = ''; return win(); } if (st.ask != null) return miss(); SND.no(); steal(Math.round(st.val / 2), ''); };
    const show = () => { if (st.shown) return; st.shown = true; st.locked = true; clearInterval(tick); helps();
      if (st.opts) { el.querySelectorAll('[data-j]').forEach(b => { b.disabled = true; if (st.opts[+b.dataset.j] === a) b.classList.add('ok'); }); return st.ask != null ? miss() : steal(Math.round(st.val / 2), ''); }
      const f = el.querySelector('#dwFoot');
      f.innerHTML = `${ans}<div class="dw-hrjudge"><button type="button" class="dw-btn" data-ok>${T('إجابة صحيحة', 'Right')} <small>${NUM(st.val)} ${T('نقطة', 'pts')}</small></button><button type="button" class="dw-btn ghost" data-no>${T('إجابة خاطئة', 'Wrong')}</button></div>`;
      f.querySelector('[data-ok]').onclick = win;
      f.querySelector('[data-no]').onclick = () => { if (st.ask != null) return miss(); SND.no(); steal(Math.round(st.val / 2), ans); };
    };
    const timeUp = () => { SND.no(); show(); };
    const next = () => { H.turn = (H.turn + 1) % D.groups.length; H.n++; setTimeout(hrLetters, 900); };
    el.querySelector('[data-main]').onclick = show;
    helps(); clock(st, timeUp);
  }

  /* ---------- the game's own page: where the questions come from ---------- */
  /* ---------- word race: a proverb or a verse in shuffled words; each leader orders them on the phone, and the screen shows every attempt ---------- */
  async function wrSetup(rk) {
    rk = ['qd', 'im'].includes(rk) ? rk : 'wr'; const RD = READY()[rk], ck = rk + 'c', tk = rk + 't', TM = rk === 'qd' ? [20, 30, 45] : rk === 'im' ? [15, 20, 30] : [45, 60, 90]; let B; try { B = await hrLoad(rk); } catch (e) { alert(T(`تعذّر تحميل «${RD.t}». يُرجى التحقق من الاتصال.`, 'Could not load the sentences.')); return; }
    const c = cfgGet(), cats = Object.keys(B); c.wrn = c.wrn || 8; if (!TM.includes(c[tk])) c[tk] = TM[1]; if (!Array.isArray(c[ck]) || !c[ck].some(x => cats.includes(x))) c[ck] = cats.slice();
    D = { mode: rk, rk, title: RD.t, cfg: Object.assign(c, { chn: false, ph: true }), steps: [] };
    const read = () => { el.querySelectorAll('[data-name]').forEach(i => { c.names[+i.dataset.name] = i.value.trim(); }); };
    const paint = () => {
      const used = hrUsed(rk), left = cats.filter(L => c[ck].includes(L)).reduce((n, L) => n + B[L].filter((_, i) => !used.has(L + ':' + i)).length, 0);
      shell(`<div class="dw-set dw-hrset"><p class="dw-sub">${T('مسابقة جاهزة على الجوالات', 'A ready game on the phones')}</p><h2>${esc(RD.t)}</h2>
        <p class="dw-hrrule">${RD.rule}</p>
        <div class="dw-row"><span>${T('عدد المجموعات', 'Groups')}</span><div class="dw-seg" data-n>${[2, 3, 4, 5, 6].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.n === n}">${NUM(n)}</button>`).join('')}</div></div>
        <div class="dw-hrnames">${Array.from({ length: c.n }, (_, k) => `<label style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="20" dir="auto" value="${esc(c.names[k] || NAMES()[k])}"></label>`).join('')}</div>
        <div class="dw-row"><span>${T('المحتوى', 'Content')}</span><div class="dw-seg dw-wrcats">${cats.map(L => `<button type="button" data-cat="${esc(L)}" aria-pressed="${c[ck].includes(L)}">${esc(L)}</button>`).join('')}</div></div>
        <div class="dw-row"><span>${RD.nl}</span><div class="dw-seg" data-q>${[5, 8, 10, 15].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.wrn === n}">${NUM(n)}</button>`).join('')}</div></div>
        <div class="dw-row"><span>${T('الوقت', 'Time')}</span><div class="dw-seg" data-t>${TM.map(n => `<button type="button" data-v="${n}" aria-pressed="${c[tk] === n}">${NUM(n)} ${T('ث', 's')}</button>`).join('')}</div></div>
        <div class="dw-wrph"><h3>${T('الجوالات', 'Phones')}</h3><div id="dwPh"></div></div>
        <p class="dw-hrleft">${T(`${NUM(left)} ${RD.nw} لم يُلعب بعد على هذا الجهاز.`, `${left} not yet played on this device.`)}${left < c.wrn ? ` <button type="button" class="dw-lnk" data-reset>${T('إعادة المحتوى كله', 'Bring all back')}</button>` : ''}</p>
        <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ', 'Start')}</button></div></div>`, 'dw-in');
      el.querySelectorAll('[data-n] [data-v]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-q] [data-v]').forEach(b => b.onclick = () => { read(); c.wrn = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-t] [data-v]').forEach(b => b.onclick = () => { read(); c[tk] = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { read(); const L = b.dataset.cat, on = c[ck].includes(L); if (on && c[ck].length === 1) return; c[ck] = on ? c[ck].filter(x => x !== L) : c[ck].concat(L); cfgSet(c); paint(); });
      el.querySelectorAll('[data-name]').forEach(i => i.oninput = () => { read(); leadPaint(); pub(); });
      const rs = el.querySelector('[data-reset]'); if (rs) rs.onclick = () => { try { localStorage.removeItem(`dw.${rk}.used`); } catch (e) {} paint(); };
      el.querySelector('[data-main]').onclick = () => { read(); cfgSet(c);
        const on = Array.from({ length: c.n }, (_, k) => k).filter(k => ROOM.lead[k] != null);
        if (rk === 'wr' && on.length < 2) return alert(T('يلزم ربط جوالين على الأقل: يمسح كل قائد مجموعة الرمز من جواله.', 'Link at least two phones: each leader scans the code.'));
        if (rk === 'wr' && on.length < c.n && !confirm(T('بعض المجموعات بلا جوال ولن تشارك في الترتيب. هل تريد البدء؟', 'Some groups have no phone and cannot play. Start anyway?'))) return;
        const used = hrUsed(rk); let pool = []; c[ck].forEach(L => B[L].forEach((_, i) => { if (!used.has(L + ':' + i)) pool.push([L, i]); }));
        if (pool.length < c.wrn) { try { localStorage.removeItem(`dw.${rk}.used`); } catch (e) {} pool = []; c[ck].forEach(L => B[L].forEach((_, i) => pool.push([L, i]))); }
        D.groups = Array.from({ length: c.n }, (_, k) => ({ name: c.names[k] || NAMES()[k], col: COL[k], score: 0, right: 0, steals: 0, chal: 0, chances: '' }));
        D.wr = { B, used: hrUsed(rk), list: shuf(pool).slice(0, rk === 'im' ? c.wrn + 15 : c.wrn), i: 0 }; SND.go(); rk === 'im' ? imStart() : rk === 'qd' ? qdQ() : wrQ(); };
      phonesBox();
    };
    paint();
  }
  function wrQ() {
    const W = D.wr, G = D.groups; if (W.i >= W.list.length) return final();
    const [L, j] = W.list[W.i], [text, by] = W.B[L][j], words = text.split(/\s+/).filter(Boolean), n = words.length;
    W.used.add(L + ':' + j); hrSave(W.used);
    const sh = shuf(words.map((_, k) => k)); if (n > 1 && sh.every((v, k) => v === k)) sh.reverse();
    const dur = D.cfg.wrt || 60, st = D.q = { dur, left: dur, locked: false, att: G.map(() => 0), last: G.map(() => ''), at: G.map(() => 0), won: [] };
    const last = W.i === W.list.length - 1;
    shell(`${board(-1)}<div class="dw-q dw-wr"><div class="dw-qh"><span class="dw-who"><b dir="auto">${esc(L)}</b> · ${T('الجملة', 'Sentence')} ${NUM(W.i + 1)} ${T('من', 'of')} ${NUM(W.list.length)}</span>${ring(dur)}</div>
      <h2 class="dw-qt">${T('رتّبوا الكلمات على جوالاتكم', 'Put the words in order on your phones')}</h2>
      <div class="dw-wrw" id="dwWrw">${sh.map(k => `<span dir="auto">${esc(words[k])}</span>`).join('')}</div>
      <p class="dw-say" id="dwRf" aria-live="polite"></p>
      <div class="dw-wrt" id="dwWrt"></div><div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    const rows = () => { el.querySelector('#dwWrt').innerHTML = G.map((g, k) => { const r = st.last[k], p = st.won.indexOf(k);
      return `<div class="dw-wrrow${p >= 0 ? ' won' : ''}${ROOM.lead[k] == null ? ' off' : ''}" style="--c:${g.col}"><b dir="auto">${esc(g.name)}</b><span class="dw-wrc">${words.map((_, q) => `<i class="${r ? (r[q] === '1' ? 'ok' : 'no') : ''}"></i>`).join('')}</span><small>${ROOM.lead[k] == null ? T('بلا جوال', 'no phone') : p >= 0 ? `${T(p ? 'الثاني' : 'الأول', p ? 'Second' : 'First')} · ${NUM(PLACE[p])} ${T('نقطة', 'points')}` : st.att[k] ? T(`${NUM(st.att[k])} ${st.att[k] === 1 ? 'محاولة' : st.att[k] === 2 ? 'محاولتان' : 'محاولات'}`, `${st.att[k]} tries`) : T('لم يرسل بعد', 'Not yet')}</small></div>`; }).join(''); };
    const send = () => pub({ ph: 'word', i: W.i, w: sh.map(k => words[k]), r: st.last.map(x => x || '-'), a: st.att, won: st.won.length ? st.won : [-1], done: st.locked ? 1 : 0, ans: st.locked ? text : '', by: st.locked ? by || '' : '' });
    const say = h => { const f = el.querySelector('#dwRf'); if (f) { f.innerHTML = h; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
    const foot = () => { const f = el.querySelector('#dwFoot');
      if (!st.locked) { f.innerHTML = `<p class="dw-hint">${T(`الأول ${NUM(PLACE[0])} نقطة، والثاني ${NUM(PLACE[1])}. المربعات الخضراء كلمات في مكانها الصحيح.`, `First ${PLACE[0]}, second ${PLACE[1]}. Green squares are words in the right place.`)}</p><button type="button" class="dw-btn ghost" data-stop>${T('أنهِ الجملة', 'End this sentence')}</button>`; f.querySelector('[data-stop]').onclick = end; return; }
      f.innerHTML = `<div class="dw-res"><p class="dw-wrans" dir="auto">${esc(text)}${by ? ` <small>${esc(by)}</small>` : ''}</p><button type="button" class="dw-btn" data-main>${last ? T('النتيجة النهائية', 'Final result') : T('الجملة التالية', 'Next sentence')}</button></div>`;
      f.querySelector('[data-main]').onclick = () => { W.i++; wrQ(); }; };
    const players = () => G.map((g, k) => k).filter(k => ROOM.lead[k] != null);
    st.onWord = (k, x) => {
      if (st.locked || st.won.includes(k) || Date.now() - st.at[k] < 2500) return;
      const perm = Array.from({ length: n }, (_, p) => Math.floor(x / Math.pow(16, p)) % 16);
      if (new Set(perm).size !== n || perm.some(t => t >= n)) return;
      st.at[k] = Date.now(); st.att[k]++;
      const res = perm.map((t, p) => words[sh[t]] === words[p] ? '1' : '0').join(''); st.last[k] = res;
      if (!res.includes('0')) { st.won.push(k); const p = award(G[k], PLACE[st.won.length - 1]); G[k].right++; SND.ok();
        say(`<b style="color:${G[k].col}" dir="auto">${esc(G[k].name)}</b> ${T(st.won.length === 1 ? 'رتّبتها أولًا' : 'رتّبتها ثانيًا', st.won.length === 1 ? 'got it first' : 'got it second')} · ${NUM(p)} ${T('نقطة', 'points')}`);
        el.querySelector('.dw-board').outerHTML = board(-1);
        if (st.won.length >= Math.min(PLACE.length, players().length)) return end(); }
      else SND.tick();
      rows(); send();
    };
    const end = () => { if (st.locked) return; st.locked = true; clearInterval(tick); if (!st.won.length) SND.no();
      el.querySelector('#dwWrw').classList.add('done'); el.querySelector('#dwWrw').innerHTML = words.map(w => `<span dir="auto">${esc(w)}</span>`).join('');
      rows(); send(); foot(); };
    rows(); foot(); send(); clock(st, end); SND.go();
  }

  /* ---------- a mixed evening: the groups and phones set once, then several ready games in a row, the scores carried through ---------- */
  const MIX = () => [['im', 5, T('صور', 'pictures')], ['hr', 6, T('أسئلة', 'questions')], ['qd', 5, T('أسئلة', 'questions')], ['mt', 4, T('أمثال', 'proverbs')], ['ay', 0, T('أسئلة', 'questions')], ['qa', 0, T('أسئلة', 'questions')], ['ro', 0, T('مجموعات', 'sets')], ['wr', 4, T('جمل', 'sentences')]];
  function mixSetup() {
    const c = cfgGet(); c.mix = Object.assign(Object.fromEntries(MIX().map(([k, n]) => [k, n])), c.mix || {}); if (c.hrh == null) c.hrh = 1;
    D = { mode: 'mix', rk: 'mix', title: T('أمسية منوعة', 'A mixed evening'), cfg: Object.assign(c, { chn: false, ph: true }), steps: [] };
    const read = () => { el.querySelectorAll('[data-name]').forEach(i => { c.names[+i.dataset.name] = i.value.trim(); }); };
    const paint = () => {
      const tot = MIX().reduce((s, [k]) => s + (c.mix[k] || 0), 0);
      shell(`<div class="dw-set dw-hrset"><p class="dw-sub">${T('مسابقة جاهزة', 'Ready to play')}</p><h2>${T('أمسية منوعة', 'A mixed evening')}</h2>
        <p class="dw-hrrule">${T('عدة مسابقات جاهزة متتالية بالمجموعات نفسها، وتُجمع النقاط إلى النهاية. يحدد المدير المسابقات وعدد أسئلة كل منها.', 'Several ready games in a row with the same groups; the points add up to the end. The host chooses the games and how many questions each.')}</p>
        <div class="dw-row"><span>${T('عدد المجموعات', 'Groups')}</span><div class="dw-seg" data-n>${[2, 3, 4, 5, 6].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.n === n}">${NUM(n)}</button>`).join('')}</div></div>
        <div class="dw-hrnames">${Array.from({ length: c.n }, (_, k) => `<label style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="20" dir="auto" value="${esc(c.names[k] || NAMES()[k])}"></label>`).join('')}</div>
        <div class="dw-mixl">${MIX().map(([k, , u]) => `<div class="dw-pr${c.mix[k] ? '' : ' off'}"><div><b>${esc(READY()[k].t)}</b>${k === 'wr' ? `<small>${T('يلزم جوالان على الأقل', 'Needs two phones or more')}</small>` : ''}</div><div class="dw-step" data-mk="${k}"><button type="button" data-d="-1" aria-label="${T('أقل', 'Fewer')}">−</button><span><b>${c.mix[k] ? NUM(c.mix[k]) : T('بلا', 'None')}</b><small>${c.mix[k] ? u : ''}</small></span><button type="button" data-d="1" aria-label="${T('أكثر', 'More')}">+</button></div></div>`).join('')}</div>
        <div class="dw-row"><span>${T('وسائل المساعدة لكل مجموعة', 'Help for each group')}</span><div class="dw-seg" data-h>${[0, 1, 2].map(n => `<button type="button" data-v="${n}" aria-pressed="${c.hrh === n}">${n ? NUM(n) : T('بلا', 'None')}</button>`).join('')}</div></div>
        <details class="dw-wrph"${ROOM.ref ? ' open' : ''}><summary>${T('الجوالات', 'Phones')} <small>${T('يُنصح بها: تُلعب بها «قدّرها» و«سباق الكلمات» والسباقات', 'Recommended: the estimate, the word race and the races use them')}</small></summary><div id="dwPh"></div></details>
        <p class="dw-hrleft">${T(`${NUM(tot)} سؤالًا في المجموع`, `${tot} questions in all`)}</p>
        <div class="dw-acts"><button type="button" class="dw-btn" data-main${tot ? '' : ' disabled'}>${T('ابدأ', 'Start')}</button></div></div>`, 'dw-in');
      el.querySelectorAll('[data-name]').forEach(i => i.oninput = () => { read(); leadPaint(); pub(); });
      el.querySelectorAll('[data-n] [data-v]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-h] [data-v]').forEach(b => b.onclick = () => { read(); c.hrh = +b.dataset.v; cfgSet(c); paint(); });
      el.querySelectorAll('[data-mk] [data-d]').forEach(b => b.onclick = () => { read(); const k = b.closest('[data-mk]').dataset.mk; c.mix[k] = Math.max(0, Math.min(15, (c.mix[k] || 0) + +b.dataset.d)); cfgSet(c); paint(); });
      const pd = el.querySelector('details.dw-wrph'); pd.ontoggle = () => { if (pd.open) phonesBox(); }; if (pd.open) phonesBox();
      el.querySelector('[data-main]').onclick = () => { read(); cfgSet(c);
        const phones = Object.keys(ROOM.lead).filter(k => +k < c.n).length;
        let seq = MIX().map(([k]) => ({ rk: k, n: c.mix[k] || 0 })).filter(s => s.n);
        if (phones < 2 && seq.some(s => s.rk === 'wr')) { if (!confirm(T('«سباق الكلمات» يحتاج جوالين على الأقل، وسيُتخطّى. هل تريد البدء؟', 'The word race needs two phones and will be skipped. Start?'))) return; seq = seq.filter(s => s.rk !== 'wr'); }
        if (!seq.length) return;
        D.groups = Array.from({ length: c.n }, (_, k) => ({ name: c.names[k] || NAMES()[k], col: COL[k], score: 0, right: 0, steals: 0, chal: 0, chances: '', h: { d: c.hrh, s: c.hrh, t: c.hrh, x: c.hrh } }));
        D.seq = seq; D.si = 0; SND.go(); mixNext(); };
    };
    paint();
  }
  async function mixNext() {
    const s = D.seq[D.si++]; if (!s) { D.seq = null; return final(); }
    const RD = READY()[s.rk], no = D.si, all = D.seq.length; let B;
    try { B = await hrLoad(s.rk); } catch (e) { if (D) { flash(T('تعذّر تحميل المسابقة التالية', 'Could not load the next game')); return mixNext(); } return; }
    if (!D || !D.groups) return;
    D.rk = s.rk; clearInterval(tick); D.q = null; D.pickCb = null; pub({ ph: 'round', i: 'M' + no });
    shell(`${board(-1)}<div class="dw-mid dw-rcard"><p class="dw-sub">${T(`الجولة ${NUM(no)} من ${NUM(all)}`, `Round ${no} of ${all}`)}</p><h2>${esc(RD.t)}</h2><p>${RD.rule}</p>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ الجولة', 'Start the round')}</button></div></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => {
      const used = hrUsed(s.rk); let pool = []; Object.keys(B).forEach(L => B[L].forEach((_, i) => { if (!used.has(L + ':' + i)) pool.push([L, i]); }));
      const want = s.rk === 'im' ? s.n + 15 : s.n; if (pool.length < want) { hrSave(new Set()); pool = []; Object.keys(B).forEach(L => B[L].forEach((_, i) => pool.push([L, i]))); }
      SND.go();
      if (['wr', 'qd', 'im'].includes(s.rk)) { D.cfg.wrn = s.n; D.wr = { B, used: hrUsed(s.rk), list: shuf(pool).slice(0, want), i: 0 }; return s.rk === 'im' ? imStart() : s.rk === 'qd' ? qdQ() : wrQ(); }
      D.hr = { B, used: hrUsed(s.rk), turn: (D.hr && D.hr.turn) || 0, n: 0, pend: {}, RD, lim: s.n }; D.cfg.hrt = D.cfg.hrt || 30; hrLetters();
    };
  }
  /* ---------- playing alone: ten questions with options against the clock, the best score kept on the device ---------- */
  const SOLO = ['hr', 'mt', 'ay', 'qa', 'im'];
  const soloBest = rk => { try { return +localStorage.getItem('dw.solo.' + rk) || 0; } catch (e) { return 0; } };
  function soloHome() {
    D = { mode: 'solo', rk: 'solo', title: T('العب وحدك', 'Play alone'), cfg: cfgGet(), steps: [] };
    shell(`<div class="dw-set dw-hrset dw-solo"><p class="dw-sub">${T('تحدٍّ فردي', 'A solo challenge')}</p><h2>${T('العب وحدك', 'Play alone')}</h2>
      <p class="dw-hrrule">${T('عشرة أسئلة بخيارات ووقت محدود. الإجابة الصحيحة ٥٠ نقطة، ويُضاف إليها حتى ٥٠ نقطة بحسب السرعة، وتُحفظ أفضل نتيجة لكل مسابقة على هذا الجهاز.', 'Ten questions with options against the clock. A right answer is 50, plus up to 50 for speed; the best score for each game is kept on this device.')}</p>
      <div class="dw-sologs">${SOLO.map(k => `<button type="button" data-sg="${k}"><b>${esc(READY()[k].t)}</b><small>${soloBest(k) ? T(`أفضل نتيجة: ${NUM(soloBest(k))}`, `Best: ${soloBest(k)}`) : T('لم تُلعب بعد', 'Not played yet')}</small></button>`).join('')}</div></div>`, 'dw-in');
    el.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => soloStart(b.dataset.sg));
  }
  async function soloStart(rk) {
    const RD = READY()[rk]; let B; shell(`<div class="dw-mid"><p class="dw-sub">${T('لحظة…', 'One moment…')}</p></div>`, 'dw-in');
    try { B = await hrLoad(rk); } catch (e) { alert(T('تعذّر التحميل. يُرجى التحقق من الاتصال.', 'Could not load.')); return soloHome(); }
    D = { mode: 'solo', rk, title: RD.t, cfg: cfgGet(), steps: [] };
    const used = hrUsed(rk); let pool = []; Object.keys(B).forEach(L => B[L].forEach((_, i) => { if (!used.has(L + ':' + i)) pool.push([L, i]); }));
    if (pool.length < 20) { hrSave(new Set()); pool = []; Object.keys(B).forEach(L => B[L].forEach((_, i) => pool.push([L, i]))); }
    const S = D.solo = { rk, n: 10, i: 0, score: 0, right: 0, run: 0, best: soloBest(rk), xs: [] };
    if (rk === 'im') {
      D.wr = { B, used: hrUsed(rk), list: shuf(pool).slice(0, 40), i: 0 }; D.cfg.wrn = S.n; D.cfg.imt = 15;
      // imStart builds the questions and calls run(); catch them before it does
      const r0 = D; await imStart.call(null, true); if (D !== r0) return; S.xs = D.steps.map(s => s.x); D.steps = []; if (!S.xs.length) return soloHome();
    } else {
      D.hr = { B, used: hrUsed(rk), pend: {}, RD, turn: 0, n: 0 };
      const pick = shuf(pool).slice(0, S.n);
      S.xs = await Promise.all(pick.map(async ([L, i]) => { const [q, a] = B[L][i]; let w = []; try { w = await hrWrong(L, i); } catch (e) {} const opts = shuf([a, ...w.slice(0, 3)]); D.hr.used.add(L + ':' + i);
        return { type: 'mc', q: RD.q(L, q), hint: RD.hint(L), opts, ok: [opts.indexOf(a)], full: RD.full(q, a), cat: RD.cats ? L : '' }; }));
      if (!D || D.solo !== S) return; hrSave(D.hr.used);
    }
    soloQ();
  }
  function soloQ() {
    const S = D.solo; if (S.i >= S.xs.length) return soloEnd();
    const x = S.xs[S.i], dur = S.rk === 'im' ? 15 : 20, st = D.q = { dur, left: dur, locked: false };
    shell(`<div class="dw-q dw-soloq"><div class="dw-qh"><span class="dw-who">${esc(READY()[S.rk].t)} · ${T('السؤال', 'Question')} ${NUM(S.i + 1)} ${T('من', 'of')} ${NUM(S.xs.length)} · <b>${NUM(S.score)}</b> ${T('نقطة', 'points')}${S.run >= 2 ? ` · ${T('متتالية', 'streak')} ${NUM(S.run)}` : ''}</span>${ring(dur)}</div>
      ${qBody(Object.assign({}, x, { zd: Math.round(dur * .85) }), true)}${x.hint ? `<p class="dw-hrhint">${x.hint}</p>` : ''}<div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    el.querySelectorAll('[data-j]').forEach(b => { b.disabled = false; b.onclick = () => done(+b.dataset.j); });
    const done = j => { if (st.locked) return; st.locked = true; clearInterval(tick); markRight(x); const ok = j != null && x.ok.includes(j);
      if (j != null && !ok) el.querySelector(`[data-j="${j}"]`).classList.add('no');
      const p = ok ? 50 + Math.round(50 * st.left / dur) : 0; S.score += p; if (ok) { S.right++; S.run++; SND.ok(); } else { S.run = 0; SND.no(); }
      el.querySelector('#dwFoot').innerHTML = `<div class="dw-res"><p>${ok ? `<b>+${NUM(p)}</b> ${T('نقطة', 'points')}` : j == null ? T('انتهى الوقت', 'Time is up') : T('إجابة خاطئة', 'Wrong')}${x.full ? ` · <span dir="auto">${esc(x.full)}</span>` : ''}</p><button type="button" class="dw-btn" data-main>${S.i === S.xs.length - 1 ? T('النتيجة', 'The result') : T('السؤال التالي', 'Next question')}</button></div>`;
      el.querySelector('[data-main]').onclick = () => { S.i++; soloQ(); }; };
    clock(st, () => done(null));
  }
  function soloEnd() {
    const S = D.solo, nb = S.score > S.best; if (nb) { try { localStorage.setItem('dw.solo.' + S.rk, S.score); } catch (e) {} } SND.win();
    const txt = T(`حققتُ ${NUM(S.score)} نقطة (${NUM(S.right)} من ${NUM(S.xs.length)}) في «${READY()[S.rk].t}» على دوّارة: alsamani.com/play/dawwara`, `I scored ${S.score} (${S.right}/${S.xs.length}) in ${READY()[S.rk].t} on Dawwara: alsamani.com/play/dawwara`);
    shell(`<div class="dw-mid dw-fin"><p class="dw-sub">${esc(READY()[S.rk].t)}</p><h2>${nb && S.best ? T('نتيجة جديدة هي الأفضل!', 'A new best!') : T('النتيجة', 'The result')}</h2><p class="dw-winner" style="--c:#e9a54a">${NUM(S.score)}</p>
      <p>${T(`الإجابات الصحيحة: ${NUM(S.right)} من ${NUM(S.xs.length)}`, `${S.right} right of ${S.xs.length}`)}${S.best && !nb ? ` · ${T('أفضل نتيجة', 'Best')} ${NUM(S.best)}` : ''}</p>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('العب مرة ثانية', 'Play again')}</button><button type="button" class="dw-btn ghost" data-oth>${T('مسابقة أخرى', 'Another game')}</button><button type="button" class="dw-btn ghost" data-cp>${T('انسخ النتيجة', 'Copy the result')}</button></div></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => soloStart(S.rk); el.querySelector('[data-oth]').onclick = soloHome;
    el.querySelector('[data-cp]').onclick = e => { try { navigator.clipboard.writeText(txt); e.target.textContent = T('تم نسخ النتيجة', 'Copied'); } catch (er) {} };
  }
  /* ---------- guess the picture: flags from flagcdn, landmarks and animals from Wikipedia's lead images; played as speed questions ---------- */
  async function imStart(solo) {
    const W = D.wr, n = D.cfg.wrn, RD = READY().im, key = t => String(t).replace(/_/g, ' ');
    shell(`<div class="dw-mid"><p class="dw-sub">${T('تُجهَّز الصور…', 'Preparing the pictures…')}</p></div>`, 'dw-in');
    const wk = [...new Set(W.list.map(([L, j]) => W.B[L][j][0]).filter(k => k.startsWith('w:')).map(k => k.slice(2)))], img = {};
    for (let i = 0; i < wk.length; i += 40) {
      try { const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=900&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(wk.slice(i, i + 40).join('|')))).json();
        const q = j.query || {}, back = {}; [...(q.normalized || []), ...(q.redirects || [])].forEach(r => { back[r.to] = r.from; });
        Object.values(q.pages || {}).forEach(p => { if (!p.thumbnail) return; let t = p.title; for (let g = 0; g < 4 && back[t]; g++) t = back[t]; img[key(t)] = p.thumbnail.source; });
      } catch (e) {}
    }
    if (!D || D.wr !== W) return; // closed while the pictures were loading
    const xs = [];
    for (const [L, j] of W.list) { if (xs.length >= n) break;
      const [k, name] = W.B[L][j], src = k.startsWith('f:') ? `https://flagcdn.com/w640/${k.slice(2)}.png` : img[key(k.slice(2))]; if (!src) continue;
      const wrong = shuf(W.B[L].map(x => x[1]).filter(x => x !== name)).slice(0, 3), opts = shuf([name, ...wrong]);
      xs.push({ type: 'mc', q: RD.q[L] || T('ما هذا؟', 'What is this?'), opts, ok: [opts.indexOf(name)], img: src, zoom: 1, zd: Math.round((D.cfg.imt || 20) * .85), ox: 25 + Math.round(Math.random() * 50), oy: 25 + Math.round(Math.random() * 50), zs: k.startsWith('f:') ? 2.2 : 3.5, cr: k.startsWith('w:') ? T('الصورة من ويكيبيديا', 'Image: Wikipedia') : '' });
      W.used.add(L + ':' + j); }
    hrSave(W.used);
    if (!xs.length) { alert(T('تعذّر تحميل الصور. يُرجى التحقق من الاتصال.', 'Could not load the pictures.')); if (solo === true) return; return wrSetup('im'); }
    xs.forEach(x => { const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = x.img; });
    D.steps = xs.map(x => ({ k: 'buzz', x })); if (solo === true) return; D.cfg.time = D.cfg.imt || 20; D.t = 0; run();
  }
  /* ---------- estimate it: a number for an answer; each leader types an estimate, the closest wins ---------- */
  const fmtN = v => NUM(Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })).replace(/,/g, T('٬', ','));
  const numIn = t => { const v = parseFloat(String(t).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٫]/g, '.').replace(/[,٬\s]/g, '')); return isFinite(v) && v >= 0 ? v : null; };
  function qdQ() {
    const W = D.wr, G = D.groups; if (W.i >= W.list.length) return final();
    const [L, j] = W.list[W.i], [q, ans, unit] = W.B[L][j]; W.used.add(L + ':' + j); hrSave(W.used);
    const dur = D.cfg.qdt || 30, st = D.q = { dur, left: dur, locked: false, v: G.map(() => null), pl: G.map(() => 0) }, last = W.i === W.list.length - 1;
    shell(`${board(-1)}<div class="dw-q dw-qd"><div class="dw-qh"><span class="dw-who"><b dir="auto">${esc(L)}</b> · ${T('السؤال', 'Question')} ${NUM(W.i + 1)} ${T('من', 'of')} ${NUM(W.list.length)}</span>${ring(dur)}</div>
      <h2 class="dw-qt" dir="auto">${esc(q)}</h2>${unit ? `<p class="dw-hrhint">${T('الوحدة', 'Unit')}: ${esc(unit)}</p>` : ''}
      <div class="dw-qdl" id="dwQl" hidden></div>
      <div class="dw-wrt">${G.map((g, k) => `<div class="dw-wrrow" style="--c:${g.col}" data-qr="${k}"><b dir="auto">${esc(g.name)}</b><span class="dw-qdv" id="dwQv${k}">${ROOM.lead[k] == null ? `<input data-qi="${k}" inputmode="decimal" dir="ltr" placeholder="${T('تقدير المجموعة', 'Group’s estimate')}">` : ''}</span><small id="dwQs${k}"></small></div>`).join('')}</div>
      <div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    const status = k => { const e = el.querySelector('#dwQs' + k); if (!e || st.locked) return; e.textContent = st.v[k] != null ? T('تم الإرسال', 'Sent') : ROOM.lead[k] == null ? '' : T('بانتظار التقدير', 'Waiting'); };
    const send = () => pub({ ph: 'num', i: W.i, unit: unit || '', s: st.v.map(v => v == null ? 0 : 1), done: st.locked ? 1 : 0, ans: st.locked ? ans : -1, v: st.locked ? st.v.map(v => v == null ? -1 : v) : [-1], pl: st.locked ? st.pl : [0] });
    const all = () => st.v.every(v => v != null);
    st.onNum = (k, x) => { if (st.locked || !(x >= 0)) return; st.v[k] = x; status(k); SND.tick(); send(); if (all()) setTimeout(end, 800); };
    el.querySelectorAll('[data-qi]').forEach(i => i.onchange = () => { const k = +i.dataset.qi, v = numIn(i.value); st.v[k] = v; status(k); if (v != null) { i.value = fmtN(v); send(); if (all()) setTimeout(end, 800); } });
    const foot = () => { const f = el.querySelector('#dwFoot');
      if (!st.locked) { f.innerHTML = `<p class="dw-hint">${T(`الأقرب ${NUM(PLACE[0])} نقطة، والذي يليه ${NUM(PLACE[1])}.`, `Closest ${PLACE[0]}, next ${PLACE[1]}.`)}</p><button type="button" class="dw-btn" data-stop>${T('أظهر الجواب', 'Show the answer')}</button>`; f.querySelector('[data-stop]').onclick = end; return; }
      f.innerHTML = `<div class="dw-res"><button type="button" class="dw-btn" data-main>${last ? T('النتيجة النهائية', 'Final result') : T('السؤال التالي', 'Next question')}</button></div>`;
      f.querySelector('[data-main]').onclick = () => { W.i++; qdQ(); }; };
    const end = () => { if (st.locked) return; st.locked = true; clearInterval(tick);
      const ks = G.map((g, k) => k).filter(k => st.v[k] != null), d = k => Math.abs(st.v[k] - ans), ds = [...new Set(ks.map(d))].sort((a, b) => a - b);
      ks.forEach(k => { const r = ds.indexOf(d(k)); if (r < PLACE.length) { st.pl[k] = award(G[k], PLACE[r]); if (r === 0) G[k].right++; } });
      ks.length ? SND.ok() : SND.no();
      // the number line: the answer and every estimate in its place
      const xs = ks.map(k => st.v[k]).concat(ans), lo = Math.min(...xs), hi = Math.max(...xs), span = hi - lo || Math.max(1, Math.abs(ans)), pos = v => 6 + 88 * (v - lo + (hi === lo ? span / 2 : 0)) / (hi === lo ? span : span);
      const ql = el.querySelector('#dwQl'); ql.hidden = false;
      ql.innerHTML = `<div class="dw-qdbar"></div><div class="dw-qdans" style="--x:${pos(ans)}%"><b>${fmtN(ans)}</b>${unit ? `<small>${esc(unit)}</small>` : ''}</div>${ks.map((k, n) => `<div class="dw-qdpt${n % 2 ? ' lo' : ''}" style="--x:${pos(st.v[k])}%;--c:${G[k].col}"><i></i><span dir="auto">${esc(G[k].name)}</span></div>`).join('')}`;
      G.forEach((g, k) => { const v = el.querySelector('#dwQv' + k), s = el.querySelector('#dwQs' + k), r = el.querySelector(`[data-qr="${k}"]`);
        v.textContent = st.v[k] == null ? T('لا تقدير', 'No estimate') : fmtN(st.v[k]); s.textContent = st.v[k] == null ? '' : `${T('الفرق', 'Off by')} ${fmtN(d(k))}${st.pl[k] ? ` · ${NUM(st.pl[k])} ${T('نقطة', 'points')}` : ''}`; if (st.pl[k]) r.classList.add('won'); });
      el.querySelector('.dw-board').outerHTML = board(-1); send(); foot(); };
    G.forEach((g, k) => status(k)); foot(); send(); clock(st, end); SND.go();
  }
  function home(root) {
    let mine = []; try { mine = JSON.parse(localStorage.getItem('qz.list') || '[]'); } catch (e) {}
    mine = mine.map(z => ({ z, n: (z.qs || []).filter(usable).length })).filter(o => o.n >= 2 || (o.z.ch || []).length);
    const lib = (window.MDLib || []).map(z => ({ z, n: (z.qs || []).filter(usable).length })).filter(o => o.n >= 4);
    const item = (o, k, src) => `<button type="button" class="dw-pick" data-src="${src}" data-k="${k}"><b dir="auto">${esc(o.z.title || T('بلا عنوان', 'Untitled'))}</b><small>${T(`${NUM(o.n)} سؤالًا صالحًا`, `${o.n} usable questions`)}${o.z.who ? ' · ' + esc(o.z.who) : ''}</small></button>`;
    root.innerHTML = `<div class="dw-start"><div class="dw-ready"><button type="button" class="dw-readyc dw-mixc" id="dwMix"><span class="dw-hrL">${T('م', 'M')}</span><span><b>${T('أمسية منوعة', 'A mixed evening')}</b><small>${T('عدة مسابقات جاهزة متتالية بالمجموعات نفسها، وتُجمع النقاط إلى النهاية: صور، وحروف، وتقدير، وأمثال، وسباق كلمات.', 'Several ready games in a row with the same groups; the points add up: pictures, letters, estimates, proverbs, a word race.')}</small></span><em>${T('جهّز الأمسية', 'Set it up')}</em></button><button type="button" class="dw-readyc dw-soloc" id="dwSolo"><span class="dw-hrL">${T('١', '1')}</span><span><b>${T('العب وحدك', 'Play alone')}</b><small>${T('تحدٍّ فردي من عشرة أسئلة بخيارات ووقت محدود، وتُحفظ أفضل نتيجة.', 'A solo challenge of ten timed questions with options; your best is kept.')}</small></span><em>${T('ابدأ', 'Start')}</em></button><button type="button" class="dw-readyc" id="dwHr"><span class="dw-hrL">${T('ح', 'H')}</span><span><b>${T('حروف', 'Huroof')}</b><small>${T('مسابقة جاهزة للمجموعات: أسئلة في حروف الهجاء الثمانية والعشرين، تختار المجموعة الحرف ثم رقم السؤال.', 'A ready team quiz: questions across the 28 letters; the group picks a letter, then a question number.')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc" id="dwMt"><span class="dw-hrL">${T('م', 'P')}</span><span><b>${T('أكمل المثل', 'Finish the proverb')}</b><small>${T('أمثال فصيحة وشعبية وحِكم: يظهر أول المثل وتكمله المجموعة.', 'Classical and popular proverbs and sayings: the start appears and the group finishes it.')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc" id="dwAy"><span class="dw-hrL">${T('أ', 'W')}</span><span><b>${T('أين تقع؟', 'Where is it?')}</b><small>${T('مدن ومحافظات ومعالم في المملكة والعالم: في أي منطقة أو مدينة أو دولة تقع؟', 'Cities, governorates and landmarks at home and abroad: which region, city or country?')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc" id="dwQa"><span class="dw-hrL">${T('ق', 'Q')}</span><span><b>${T('من القائل؟', 'Who said it?')}</b><small>${T('أبيات مشهورة وأقوال مأثورة ومؤلفو كتب: من القائل أو المؤلف؟', 'Famous verses, sayings and book authors: who said or wrote it?')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc" id="dwRo"><span class="dw-hrL">${T('ر', 'O')}</span><span><b>${T('رتّب الأحداث', 'Put them in order')}</b><small>${T('أحداث من السيرة والتاريخ الإسلامي وتاريخ المملكة والاختراعات، ترتّبها المجموعة زمنيًا.', 'Events from the Seerah, Islamic and Saudi history and inventions, put in time order.')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc" id="dwIm"><span class="dw-hrL">${T('ص', 'P')}</span><span><b>${T('خمّن الصورة', 'Guess the picture')}</b><small>${T('أعلام الدول ومعالم وحيوانات: صورة مقرّبة ومشوشة تتضح شيئًا فشيئًا، والأسرع يفوز.', 'Flags, landmarks and animals: a close, blurred picture that clears bit by bit; the fastest wins.')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc dw-readyph" id="dwQd"><span class="dw-hrL">${T('ق', 'E')}</span><span><b>${T('قدّرها', 'Estimate it')}</b><small>${T('أسئلة جوابها رقم: يكتب كل قائد تقديره على جواله، والأقرب إلى الجواب يفوز.', 'Questions with a number for an answer: each leader types an estimate; the closest wins.')}</small></span><em>${T('العب الآن', 'Play now')}</em></button><button type="button" class="dw-readyc dw-readyph" id="dwWr"><span class="dw-hrL">${T('ك', 'W')}</span><span><b>${T('سباق الكلمات', 'Word race')}</b><small>${T('كلمات مثل أو بيت مبعثرة، يرتّبها قادة المجموعات على جوالاتهم، وتظهر محاولاتهم على الشاشة مباشرة.', 'The shuffled words of a proverb or a verse; the leaders order them on their phones, live on the screen.')}</small></span><em>${T('العب الآن', 'Play now')}</em></button></div>
      <h2>${T('أو أعدّ مسابقتك', 'Or prepare your own quiz')}</h2>
      <div class="dw-tabs" role="tablist"><button type="button" role="tab" data-tab="ready" aria-selected="true">${T('مسابقة جاهزة', 'A ready quiz')}</button><button type="button" role="tab" data-tab="ai" aria-selected="false">${T('جهّزها لي', 'Prepare it for me')}</button><button type="button" role="tab" data-tab="own" aria-selected="false">${T('اكتبها بنفسك', 'Write it yourself')}</button></div>
      <div data-pane="ai" hidden><p class="dw-pane-h">${T('ثلاثة اختيارات، وتُجهَّز لك فعالية كاملة تراجعها أو تبدأ بها مباشرة.', 'Three choices, and a whole event is prepared; review it or start straight away.')}</p>${aiBox()}</div>
      <div data-pane="ready">
        ${mine.length ? `<h3>${T('مسابقاتك', 'Your quizzes')}</h3><div class="dw-picks">${mine.map((o, k) => `<div class="dw-pickw">${item(o, k, 'm')}<button type="button" class="dw-edb" data-ed="${k}">${T('عدّل', 'Edit')}</button></div>`).join('')}</div>` : ''}
        ${lib.length ? `<h3>${T('من المكتبة', 'From the library')}</h3><div class="dw-picks">${lib.map((o, k) => item(o, k, 'l')).join('')}</div>` : ''}
        <details class="dw-adv2"><summary>${T('أو الصق أسئلتك', 'Or paste your questions')}</summary>
          <textarea id="dwPaste" rows="6" dir="auto" placeholder="${T('١. ما عاصمة المملكة؟\nأ) جدة\nب) الرياض *\nج) الدمام', '1. What is the capital of France?\na) Lyon\nb) Paris *')}"></textarea>
          <p class="dw-found" id="dwFound"></p><button type="button" class="btn solid" id="dwGo" disabled>${T('العب بهذه الأسئلة', 'Play with these')}</button></details>
        <button type="button" class="dw-pick dw-chonly" id="dwChal"><b>${T('أمسية تحديات بلا أسئلة', 'An evening of challenges, no questions')}</b><small>${T('تحديات حركة وإبداع وذكاء للمجموعات', 'Moving, creating and thinking challenges')}</small></button></div>
      <div data-pane="own" hidden><p class="dw-pane-h">${T('اكتب أسئلتك بفئاتها وصعوبتها، وتحدياتك بأدواتها، في محرر بسيط. تُحفظ وتلعبها متى شئت.', 'Write your questions by category and level, and your challenges with their items. Saved for whenever you play.')}</p><button type="button" class="dw-btn" id="dwOwn">${T('افتح المحرر', 'Open the editor')}</button></div>
      <p class="dw-next">${T('بعدها تحدد عدد المجموعات والمدة، وتبدأ.', 'Then you set the groups and the length, and start.')}</p></div>`;
    root.querySelector('#dwOwn').onclick = () => editor(root, null, () => home(root));
    root.querySelector('#dwHr').onclick = () => hrSetup('hr');
    root.querySelector('#dwMix').onclick = mixSetup;
    root.querySelector('#dwSolo').onclick = soloHome;
    root.querySelector('#dwMt').onclick = () => hrSetup('mt');
    root.querySelector('#dwAy').onclick = () => hrSetup('ay');
    root.querySelector('#dwQa').onclick = () => hrSetup('qa');
    root.querySelector('#dwRo').onclick = () => hrSetup('ro');
    root.querySelector('#dwWr').onclick = () => wrSetup('wr');
    root.querySelector('#dwQd').onclick = () => wrSetup('qd');
    root.querySelector('#dwIm').onclick = () => wrSetup('im');
    root.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editor(root, mine[+b.dataset.ed].z, () => home(root)));
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b)); root.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; }); });
    aiBind(root);
    root.querySelectorAll('.dw-pick').forEach(b => b.onclick = () => { const o = (b.dataset.src === 'm' ? mine : lib)[+b.dataset.k]; start({ title: o.z.title, qs: JSON.parse(JSON.stringify(o.z.qs)), ch: o.z.ch || [], tpl: o.z.tpl }); });
    const ta = root.querySelector('#dwPaste'), go = root.querySelector('#dwGo'), fd = root.querySelector('#dwFound'); let got = [];
    ta.oninput = () => { got = window.QZParse ? QZParse.fromText(ta.value).filter(usable) : []; go.disabled = got.length < 2; fd.textContent = ta.value.trim() ? T(`وجدتُ ${NUM(got.length)} سؤالًا`, `Found ${got.length} questions`) : ''; };
    go.onclick = () => start({ title: T('مسابقة دوّارة', 'A Dawwara quiz'), qs: got });
    root.querySelector('#dwChal').onclick = () => { const c = cfgGet(); c.r = null; cfgSet(c); start({ title: T('أمسية تحديات', 'An evening of challenges'), qs: [] }); };
  }

  const root = document.getElementById('dw');
  if (root) { const pk = (new URLSearchParams(location.search).get('k') || '').replace(/\D/g, ''); if (pk.length === 6) { document.documentElement.classList.add('dw-phone'); phone(root, pk); } else home(root); }
  return { start, close, usable };
})();

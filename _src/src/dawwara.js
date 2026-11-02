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
  const cfgSet = c => { try { localStorage.setItem('dw.cfg', JSON.stringify(c)); } catch (e) {} };
  const usable = x => KINDS.includes(x.type) && (x.q || '').trim() && (['num', 'word'].includes(x.type) ? String(x.ans == null ? '' : x.ans).trim() !== '' : (x.opts || []).filter(o => String(o).trim()).length >= 2 && (x.ok || []).length);
  // the options without the empty ones, and the right ones mapped to the new places
  const clean = x => { if (['num', 'word'].includes(x.type)) return Object.assign({}, x); const keep = x.opts.map((o, j) => String(o).trim() ? j : -1).filter(j => j >= 0); return Object.assign({}, x, { opts: keep.map(j => x.opts[j]), ok: x.ok.map(j => keep.indexOf(j)).filter(j => j >= 0) }); };

  function shell(html, cls) {
    if (!el) { el = document.createElement('div'); el.className = 'dw'; el.setAttribute('role', 'dialog'); document.body.appendChild(el); document.documentElement.classList.add('dw-on'); document.addEventListener('keydown', keys); }
    el.className = 'dw ' + (cls || ''); el.innerHTML = `<button type="button" class="dw-close" data-close title="${T('إنهاء', 'End')}">${IC.x}</button>${html}`;
    el.querySelector('[data-close]').onclick = () => { if (!D || !D.steps || D.done || confirm(T('تنهي دوّارة؟', 'End Dawwara?'))) close(); };
  }
  function close() { clearInterval(tick); if (el) el.remove(); el = null; D = null; document.documentElement.classList.remove('dw-on'); document.removeEventListener('keydown', keys); }
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
    D = { title: quiz.title || T('دوّارة', 'Dawwara'), all: qs, cfg: cfgGet(), ch: quiz.ch || [], chosen: null };
    // no questions at all still makes an evening of challenges
    setup();
  }
  function setup() {
    const c = D.cfg, n = Math.min(8, Math.max(2, c.n)), P = D.all.length, mc = D.all.filter(isMC).length;
    const catQ = D.all.filter(x => (x.cat || '').trim()).length, cats = new Set(D.all.map(x => (x.cat || '').trim()).filter(Boolean)).size;
    if (c.dur == null) c.dur = 30;
    if (!c.r || c.rn !== n || c.rq !== P) { c.r = defRounds(n, P - (c.wager !== false && P > 2 ? 1 : 0), mc, cats >= 2 ? catQ : 0); c.rn = n; c.rq = P; if (c.dur) c.r = fitTime(c, n, P - (c.wager !== false && P > 2 ? 1 : 0), mc, c.dur); D.chosen = null; }
    if (c.r.board == null) c.r.board = 0;
    if (!D.chosen) fillChal(c.r.chal);
    const opt = (k, max, unit) => `<select data-r="${k}">${Array.from({ length: max + 1 }, (_, v) => `<option value="${v}"${c.r[k] === v ? ' selected' : ''}>${v ? NUM(v) + ' ' + unit : T('بدونها', 'None')}</option>`).join('')}</select>`;
    shell(`<div class="dw-set"><header><b class="dw-logo">${T('دوّارة', 'Dawwara')}</b><h2 dir="auto">${esc(D.title)}</h2><p>${T('حدّد المجموعات والمدة والمناسبة، ثم ابدأ.', 'Set the groups, the length and the occasion, then start.')}</p></header>
      <div class="dw-row"><span>${T('عدد المجموعات', 'Groups')}</span><div class="dw-seg">${[2, 3, 4, 5, 6, 7, 8].map(k => `<button type="button" data-n="${k}" aria-pressed="${k === n}"${k > D.all.length ? ' disabled' : ''}>${NUM(k)}</button>`).join('')}</div></div>
      <div class="dw-groups">${Array.from({ length: n }, (_, k) => `<div class="dw-g" style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="18" dir="auto" value="${esc(c.names[k] || NAMES()[k])}" aria-label="${T('اسم المجموعة', 'Group name')}"><input data-lead="${k}" maxlength="18" dir="auto" value="${esc(c.leads[k] || '')}" placeholder="${T('القائد (اختياري)', 'Leader (optional)')}"></div>`).join('')}</div>
        <div class="dw-row"><span>${T('مدة الأمسية', 'The evening’s length')}<small id="dwEst"></small></span><select data-dur>${[[0, T('أحددها بنفسي', 'I set the rounds')], [20, NUM(20) + T(' دقيقة', ' min')], [30, NUM(30) + T(' دقيقة', ' min')], [45, NUM(45) + T(' دقيقة', ' min')], [60, T('ساعة', '1 hour')], [90, T('ساعة ونصف', '1.5 hours')]].map(([v, l]) => `<option value="${v}"${(c.dur || 0) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="dw-row"><span>${T('المناسبة', 'The occasion')}<small>${T('تختار التحديات المناسبة لها', 'Picks challenges to suit it')}</small></span><select data-pack>${PACK().map(([v, l]) => `<option value="${v}"${(c.pack || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <p class="dw-sum" id="dwSum"></p>
      <details class="dw-adv"><summary>${T('خيارات إضافية', 'More options')}<small>${T('الجولات والتحديات والوقت والسرقة', 'rounds, challenges, time, stealing')}</small></summary>
      <div class="dw-rounds"><h3>${T('جولات الأمسية', 'The rounds')}</h3>
        <div class="dw-row"><span>${ROUND().all[0]}<small>${T('الكل يجاوب في نفس الوقت', 'All answer at once')}</small></span>${opt('all', Math.min(15, P), T('أسئلة', 'questions'))}</div>
        ${cats >= 2 ? `<div class="dw-row"><span>${ROUND().board[0]}<small>${T('اختر الفئة والقيمة، مثل كتاب «حروف»', 'Pick a category and a value')}</small></span>${opt('board', Math.min(24, catQ), T('مربعات', 'tiles'))}<select data-bmode><option value="v"${c.bmode !== 'h' ? ' selected' : ''}>${T('فئة ثم قيمة', 'Category, then value')}</option><option value="h"${c.bmode === 'h' ? ' selected' : ''}>${T('حروف: فئة ثم حرف ثم رقم', 'Huroof: category, letter, number')}</option></select></div>` : ''}
        <div class="dw-row"><span>${ROUND().turn[0]}<small>${T('لكل مجموعة سؤالها', 'A question per group')}</small></span>${opt('turn', Math.min(6, Math.floor(P / n)), T('لكل مجموعة', 'per group'))}</div>
        <div class="dw-row"><span>${ROUND().buzz[0]}<small>${T('أول يد ترتفع تجاوب', 'First hand up answers')}</small></span>${opt('buzz', Math.min(15, mc), T('أسئلة', 'questions'))}</div>
        <div class="dw-row"><span>${ROUND().chal[0]}<small>${T('حركة وإبداع وذكاء، بلا أجهزة', 'Moving, creating, thinking')}</small></span>${opt('chal', 10, T('تحديات', 'challenges'))}</div>
        <label class="dw-ck"><input type="checkbox" data-wager${c.wager !== false ? ' checked' : ''}> ${T('الختام بالمراهنة: سؤال أخير تراهن فيه كل مجموعة على جزء من نقاطها', 'Finish with a wager: one last question where each group stakes part of its points')}</label>
        <p class="dw-need" id="dwNeed"></p><div class="dw-chbox" id="dwCh"></div></div>
      <div class="dw-row"><span>${T('وقت السؤال', 'Time per question')}</span><select data-time>${[[0, T('كما في المسابقة', 'As in the quiz')], [20, NUM(20) + T(' ثانية', ' s')], [30, NUM(30) + T(' ثانية', ' s')], [45, NUM(45) + T(' ثانية', ' s')], [60, T('دقيقة', '1 min')], [90, T('دقيقة ونصف', '1.5 min')]].map(([v, l]) => `<option value="${v}"${c.time === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <label class="dw-ck"><input type="checkbox" data-steal${c.steal ? ' checked' : ''}> ${T('السرقة: إذا أخطأت المجموعة، أول مجموعة ترفع يدها تجاوب وتخطف نصف النقاط', 'Stealing: after a miss, the first group to raise a hand answers for half the points')}</label>
      <label class="dw-ck"><input type="checkbox" data-life${c.life ? ' checked' : ''}> ${T('وسائل المساعدة لكل مجموعة مرة واحدة: حذف خيارين، ووقت إضافي، وتبديل السؤال', 'Helps, once per group: remove two options, extra time, swap the question')}</label>
      </details>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ دوّارة', 'Start Dawwara')}</button><button type="button" class="dw-btn ghost" data-cards>${IC.print}${T('اطبع بطاقات المجموعات', 'Print group cards')}</button></div></div>`, 'dw-setup');
    const read = () => { c.names = [...el.querySelectorAll('[data-name]')].map(i => i.value.trim()); c.leads = [...el.querySelectorAll('[data-lead]')].map(i => i.value.trim()); el.querySelectorAll('[data-r]').forEach(x => { c.r[x.dataset.r] = +x.value; }); const bm = el.querySelector('[data-bmode]'); if (bm) c.bmode = bm.value; c.pack = el.querySelector('[data-pack]').value; c.wager = el.querySelector('[data-wager]').checked; c.dur = +el.querySelector('[data-dur]').value; c.time = +el.querySelector('[data-time]').value; c.steal = el.querySelector('[data-steal]').checked; c.life = el.querySelector('[data-life]').checked; cfgSet(c); };
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.n; c.r = null; cfgSet(c); setup(); });
    const chRe = () => { const b = el.querySelector('#dwCh'); b.innerHTML = chalBox(); chalBind(() => { el.querySelector('[data-r="chal"]').value = String(Math.min(10, D.chosen.length)); chRe(); need(); }); };
    const need = () => { read(); if (D.chosen.length !== c.r.chal) { fillChal(c.r.chal); chRe(); } el.querySelector('#dwEst').textContent = T(`حوالي ${NUM(estimate(c.r, n))} دقيقة`, `about ${estimate(c.r, n)} minutes`); const q = c.r.turn * n + c.r.all + c.r.buzz + (c.r.board || 0) + (c.wager !== false && P > 2 ? 1 : 0), e = el.querySelector('#dwNeed'), st = el.querySelector('[data-main]');
      { const R = ROUND(), parts = [['all', c.r.all], ['board', c.r.board || 0], ['turn', c.r.turn ? c.r.turn * n : 0], ['buzz', c.r.buzz], ['chal', c.r.chal]].filter(x => x[1]).map(([k, v]) => `${R[k][0]} (${NUM(v)})`), mats = [...new Set((D.chosen || []).map(byKey).filter(Boolean).map(x => (x.mat || '').trim()).filter(Boolean))];
        el.querySelector('#dwSum').innerHTML = `<b>${T('الأمسية', 'The evening')}:</b> ${parts.join(T('، ', ', '))}${c.wager !== false && P > 2 ? T('، ثم المراهنة الختامية', ', then the final wager') : ''} · ${T(`حوالي ${NUM(estimate(c.r, n))} دقيقة`, `about ${estimate(c.r, n)} min`)}${mats.length ? `<br><b>${T('جهّز', 'Prepare')}:</b> ${mats.map(esc).join(T('، ', ', '))}` : ''}`; }
      e.textContent = T(`تحتاج ${NUM(q)} سؤالًا من ${NUM(P)} متاحة، و${NUM(c.r.chal)} تحديات.`, `Needs ${q} of the ${P} questions, and ${c.r.chal} challenges.`); e.classList.toggle('bad', q > P); st.disabled = q > P || !(q + c.r.chal); };
    el.querySelectorAll('[data-r]').forEach(x => x.onchange = () => { el.querySelector('[data-dur]').value = '0'; need(); });
    el.querySelector('[data-dur]').onchange = () => { read(); if (c.dur) { c.r = fitTime(c, n, P - (c.wager !== false ? 1 : 0), mc, c.dur); Object.keys(c.r).forEach(k => { const x = el.querySelector(`[data-r="${k}"]`); if (x) x.value = String(Math.min(c.r[k], x.options.length - 1)); }); } need(); };
    el.querySelector('[data-pack]').onchange = () => { read(); D.chosen = []; fillChal(c.r.chal); chRe(); need(); };
    ['[data-wager]', '[data-bmode]'].forEach(k => { const x = el.querySelector(k); if (x) x.onchange = need; });
    chRe(); need();
    el.querySelector('[data-cards]').onclick = () => { read(); cards(); };
    el.querySelector('[data-main]').onclick = () => { read(); begin(); };
  }
  // the groups and the deal: questions sorted by kind and dealt in turn, so each group gets a like mix; the rest wait for a swap
  function begin() {
    const c = D.cfg, n = c.n;
    D.groups = Array.from({ length: n }, (_, k) => ({ name: c.names[k] || NAMES()[k], lead: c.leads[k] || '', col: COL[k], score: 0, right: 0, steals: 0, chal: 0, life: { half: 1, time: 1, swap: 1 } }));
    program(); D.t = 0; D.done = false; SND.go(); run();
  }
  const board = cur => `<div class="dw-board">${D.groups.map((g, k) => `<div class="${k === cur ? 'on' : ''}" style="--c:${g.col}"><span dir="auto">${esc(g.name)}</span><b>${NUM(g.score)}</b></div>`).join('')}</div>`;

  /* ---------- 2. a group's turn ---------- */
  function intro(tn) {
    const g = D.groups[tn.g];
    shell(`${board(tn.g)}<div class="dw-mid dw-turn" style="--c:${g.col}"><p class="dw-sub">${ROUND().turn[0]}</p><h2>${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span></h2>${g.lead ? `<p class="dw-lead">${T('القائد', 'Leader')}: <b dir="auto">${esc(g.lead)}</b></p>` : `<p class="dw-lead">${T('اتفقوا على من يقول الإجابة', 'Agree who will say the answer')}</p>`}
      <button type="button" class="dw-btn" data-main>${T('اعرض السؤال', 'Show the question')}</button></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => ask();
  }
  function ask() {
    const tn = D.steps[D.t], g = D.groups[tn.g], x = tn.x, dur = D.cfg.time || x.time || (x.type === 'tf' ? 15 : 30);
    const st = D.q = { tn, g, x, dur, left: dur, t0: Date.now(), hide: [], locked: false, stealer: null, tried: [], val: tn.val || 0 };
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
  const worth = st => 50 + Math.round(50 * Math.max(0, st.left) / st.dur);
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
    const who = st.stealer || st.g, pts = right ? (st.stealer ? Math.round((st.val || 100) / 2) : (st.val || worth(st))) : 0;
    st.locked = true;
    if (right) { who.score += pts; if (st.stealer) who.steals++; else who.right++; SND.ok(); }
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
      st.stealer = D.groups[k]; st.locked = true;
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
    f.innerHTML = `<div class="dw-res ${right ? 'ok' : 'no'}"><p>${right ? `<b>+${NUM(pts)}</b> ${T('لـ', 'to')}<span dir="auto">${esc(who.name)}</span>` : T('لم تُحتسب نقاط في هذا السؤال', 'No points for this one')}</p><button type="button" class="dw-btn" data-main>${nextLabel()}</button></div>`;
    el.querySelector('.dw-board').outerHTML = board(D.groups.indexOf(st.g));
    f.querySelector('[data-main]').onclick = go;
  }

  /* ---------- the evening as a program of rounds: for all, by turn, for speed, and challenges ---------- */
  const isMC = x => ['mc', 'tf'].includes(x.type);
  const ROUND = () => ({
    all: [T('سؤال للجميع', 'Everyone answers'), T('كل المجموعات تجاوب على نفس السؤال في نفس الوقت: ترفع بطاقة الحرف أو تكتب الإجابة على ورقة، والمدير يسجّل.', 'All groups answer the same question at once: they raise the letter card or write the answer, and the host records it.')],
    board: [T('لوحة الفئات', 'The categories board'), T('المجموعة صاحبة الدور تختار الفئة والقيمة، مثل كتاب «حروف». كلما زادت القيمة صعب السؤال وكثرت النقاط، ومن يخطئ يُسرق منه.', 'The group on turn picks a category and a value. The higher the value, the harder the question and the more points; a miss can be stolen.')],
    turn: [T('جولة الدور', 'Turn round'), T('لكل مجموعة سؤالها، وقائدها يقول الإجابة. ومن يخطئ يمكن السرقة منه.', 'Each group gets its own question and its leader answers. A miss can be stolen.')],
    buzz: [T('جولة السرعة', 'Speed round'), T('أول مجموعة ترفع يدها تجاوب. الخطأ يُخرجها من السؤال، والصحيح الأسرع يكسب أكثر.', 'The first group to raise a hand answers. A wrong answer puts it out of that question; the fastest right one wins most.')],
    chal: [T('جولة التحديات', 'Challenge round'), T('تحدٍّ للمجموعات كلها في وقت واحد، والمدير يرتّب الفائزين.', 'A challenge for all groups at once; the host ranks the winners.')]
  });
  // a sensible program for the number of groups: few groups play by turn; many groups play all together
  const defRounds = (n, pool, mc, catQ) => {
    const r = n <= 3 ? { turn: 2, all: 3, buzz: 3, chal: 2 } : n <= 5 ? { turn: 1, all: 4, buzz: 4, chal: 2 } : { turn: 0, all: 5, buzz: 5, chal: 3 };
    r.board = catQ >= 4 ? Math.min(n <= 3 ? 9 : 12, catQ) : 0; if (r.board) r.turn = 0;
    r.buzz = Math.min(r.buzz, mc); while (r.turn * n + r.all + r.buzz + r.board > pool && (r.turn || r.all || r.buzz || r.board)) { if (r.turn) r.turn--; else if (r.board > 6) r.board--; else if (r.all >= r.buzz && r.all) r.all--; else if (r.buzz) r.buzz--; else r.board--; }
    return r;
  };
  function program() {
    const c = D.cfg, n = c.n, R = c.r;
    const order = ['mc', 'tf', 'num', 'word'], rest = D.all.map((x, i) => ({ x, i })).sort((a, b) => order.indexOf(a.x.type) - order.indexOf(b.x.type) || a.i - b.i).map(o => o.x);
    const take = (k, f) => { const out = []; for (let i = 0; i < rest.length && out.length < k;) { if (!f || f(rest[i])) out.push(rest.splice(i, 1)[0]); else i++; } return out; };
    let last = null; if (c.wager !== false && rest.length > 2) { const i = rest.findIndex(x => isMC(x) && x.type === 'mc' && (x.lv || 0) >= 3); last = rest.splice(i >= 0 ? i : rest.findIndex(isMC) >= 0 ? rest.findIndex(isMC) : 0, 1)[0]; }
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
    ({ round: roundCard, board: s => D.cfg.bmode === 'h' ? huroof(s) : boardPick(s), wager, turn: intro, all: askAll, buzz: askBuzz, chal: challenge, stand: standings })[s.k](s);
  }
  const go = () => { D.t++; run(); };
  const nextLabel = () => { const s = D.steps[D.t + 1]; return !s ? T('النتيجة النهائية', 'Final result') : s.k === 'stand' ? T('الترتيب', 'Standings') : s.k === 'round' ? T('الجولة التالية', 'Next round') : s.k === 'turn' || s.k === 'board' ? T('الدور التالي', 'Next turn') : s.k === 'chal' ? T('التحدي التالي', 'Next challenge') : s.k === 'wager' ? T('المراهنة الختامية', 'The final wager') : T('السؤال التالي', 'Next question'); };
  function roundCard(s) {
    const no = D.steps.slice(0, D.t + 1).filter(x => x.k === 'round').length, all = D.steps.filter(x => x.k === 'round').length, [t, d] = ROUND()[s.type];
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
  const qBody = (x, live) => `<h2 class="dw-qt" dir="auto">${esc(x.q)}</h2>${x.img ? `<img class="dw-img" src="${x.img}" alt="">` : ''}${isMC(x) ? `<div class="dw-opts n${x.opts.length}${live ? '' : ' dw-view'}">${x.opts.map((o, j) => `<button type="button" ${live ? 'data-j' : 'data-v'}="${j}" style="--o:var(--dwo${j})"${live ? ' disabled' : ''}><i>${LET()[j]}</i><span dir="auto">${esc(o)}</span></button>`).join('')}</div>` : ''}`;
  const answerOf = x => isMC(x) ? x.ok.map(j => `${LET()[j]}) ${x.opts[j]}`).join(T(' و', ' & ')) : `${x.ans}${x.unit ? ' ' + x.unit : ''}`;
  const markRight = x => el.querySelectorAll('[data-j],[data-v]').forEach(b => { const j = +(b.dataset.j || b.dataset.v); b.disabled = true; if (x.ok && x.ok.includes(j)) b.classList.add('ok'); });
  const after = (html) => { const f = el.querySelector('#dwFoot'); f.innerHTML = `<div class="dw-res">${html}<button type="button" class="dw-btn" data-main>${nextLabel()}</button></div>`; f.querySelector('[data-main]').onclick = go; el.querySelector('.dw-board').outerHTML = board(-1); };

  /* everyone answers: each group raises its card or writes; the host records them, then reveals */
  function askAll(s) {
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
    rec();
    const reveal = () => {
      st.locked = true; clearInterval(tick);
      if (isMC(x)) { markRight(x); D.groups.forEach((g, k) => { st.ok[k] = st.rec[k] != null && x.ok.includes(st.rec[k]); }); return done(); }
      if (!st.shown) { st.shown = true; const f = el.querySelector('#dwFoot'); f.innerHTML = `<p class="dw-ans">${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b></p><p class="dw-hint">${T('علّم ✓ لكل مجموعة أصابت', 'Tick each group that got it')}</p><button type="button" class="dw-btn" data-main>${T('اعتمد النتيجة', 'Confirm')}</button>`; f.querySelector('[data-main]').onclick = done; rec(); }
    };
    const done = () => {
      st.done = true; let n = 0; D.groups.forEach((g, k) => { if (s.bets) { const b = s.bets[k] || 0; g.score = Math.max(0, g.score + (st.ok[k] ? b : -b)); if (st.ok[k]) { g.right++; n++; } } else if (st.ok[k]) { g.score += 100; g.right++; n++; } });
      n ? SND.ok() : SND.no(); rec();
      after(`<p>${isMC(x) ? `${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b> · ` : ''}${n ? T(`أصابت ${NUM(n)} من ${NUM(D.groups.length)}`, `${n} of ${D.groups.length} got it`) : T('لم تُصب أي مجموعة', 'No group got it')}</p>`);
    };
    el.querySelector('[data-rev]').onclick = reveal;
    clock(st, () => { SND.no(); const b = el.querySelector('[data-rev]'); if (b) b.classList.add('dw-pulse'); });
    SND.go();
  }

  /* speed: the first hand up answers; a wrong answer puts that group out of the question */
  function askBuzz(s) {
    const x = s.x, dur = D.cfg.time || x.time || 20, st = D.q = { x, dur, left: dur, out: [], who: null, locked: false };
    shell(`${board(-1)}<div class="dw-q dw-buzz"><div class="dw-qh"><span class="dw-who" id="dwWho">${T('جولة السرعة', 'Speed round')}</span>${ring(dur)}</div>${qBody(x, true)}<div class="dw-foot" id="dwFoot"></div></div>`, 'dw-ask');
    const hands = () => {
      const f = el.querySelector('#dwFoot'), left = D.groups.map((g, k) => k).filter(k => !st.out.includes(k));
      el.querySelectorAll('[data-j]').forEach(b => { b.disabled = true; }); el.querySelector('#dwWho').textContent = T('جولة السرعة', 'Speed round'); el.querySelector('.dw-q').style.removeProperty('--c');
      f.innerHTML = `<div class="dw-steal"><p>${IC.hand}${T('من رفع يده أولًا؟', 'Whose hand went up first?')}</p><div>${left.map(k => `<button type="button" data-bz="${k}" style="--c:${D.groups[k].col}" dir="auto">${esc(D.groups[k].name)}</button>`).join('')}<button type="button" class="dw-none" data-bz="-1">${T('لا أحد', 'Nobody')}</button></div></div>`;
      f.querySelectorAll('[data-bz]').forEach(b => b.onclick = () => { const k = +b.dataset.bz; if (k < 0) return end(null); st.who = k; const g = D.groups[k];
        el.querySelector('#dwWho').textContent = T('تجاوب: ', 'Answering: ') + g.name; el.querySelector('.dw-q').style.setProperty('--c', g.col);
        el.querySelectorAll('[data-j]').forEach(o => { o.disabled = o.classList.contains('no'); });
        f.innerHTML = `<p class="dw-hint">${T('يقول القائد الإجابة، فاضغطها.', 'The leader says the answer; tap it.')}</p><button type="button" class="dw-btn ghost" data-undo>${T('تراجع', 'Undo')}</button>`; f.querySelector('[data-undo]').onclick = () => { st.who = null; hands(); }; SND.go(); });
    };
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => {
      if (st.who == null || st.locked) return; const j = +b.dataset.j, k = st.who, right = x.ok.includes(j);
      if (right) { b.classList.add('ok'); const pts = 50 + Math.round(50 * st.left / st.dur); D.groups[k].score += pts; D.groups[k].right++; return end(k, pts); }
      b.classList.add('no'); b.disabled = true; SND.no(); st.out.push(k); st.who = null;
      const open = [...el.querySelectorAll('[data-j]')].filter(o => !o.classList.contains('no')).length;
      if (st.out.length >= D.groups.length || open <= 1) return end(null); hands();
    });
    const end = (k, pts) => { st.locked = true; clearInterval(tick); markRight(x); k != null ? SND.ok() : SND.no();
      after(`<p>${k != null ? `<b>+${NUM(pts)}</b> ${T('لـ', 'to')}<span dir="auto">${esc(D.groups[k].name)}</span>` : `${T('الإجابة', 'The answer')}: <b dir="auto">${esc(answerOf(x))}</b>`}</p>`); };
    hands(); clock(st, () => end(null)); SND.go();
  }

  /* challenges: on the screen, a timer; afterwards the host taps the groups in the order they finished or won */
  const PLACE = [150, 100, 70, 50, 30, 20, 10, 10];
  function nextChal(used, not) { const L = CHAL().map((c, i) => i).filter(i => !used.has(i) && i !== not); if (!L.length) return null; const i = L[Math.floor(Math.random() * L.length)]; used.add(i); return Object.assign({ i }, CHAL()[i]); }
  function challenge(s) {
    const ch = s.c, st = D.q = { dur: ch.s, left: ch.s, locked: false, rank: [], extra: extra(ch), sc: ch.sc || 'rank' };
    shell(`${board(-1)}<div class="dw-mid dw-ch"><p class="dw-tag">${esc(ch.cat)}</p><h2 dir="auto">${esc(ch.t)}</h2><p dir="auto">${esc(ch.d)}</p>${ch.mat ? `<p class="dw-sub">${T('يحتاج', 'Needs')}: ${esc(ch.mat)}${ch.alt ? ` · ${T('أو', 'or')}: ${esc(ch.alt)}` : ''}</p>` : ''}<div class="dw-x" id="dwX">${st.extra.pre || ''}</div>${ring(ch.s)}
      <div class="dw-foot" id="dwFoot"><div class="dw-acts"><button type="button" class="dw-btn" data-main data-go>${T('ابدأ المؤقت', 'Start the timer')}</button><button type="button" class="dw-btn ghost" data-swap>${IC.swap}${T('تحدٍّ آخر', 'Another challenge')}</button></div></div></div>`, 'dw-in');
    el.querySelector('[data-swap]').onclick = () => { const P = shuf(pool().filter(c => !(D.chosen || []).includes(c.key))); if (P.length) { D.chosen = (D.chosen || []).map(k => k === ch.key ? P[0].key : k); s.c = P[0]; challenge(s); } };
    el.querySelector('[data-go]').onclick = () => {
      SND.go(); const x = el.querySelector('#dwX'); if (st.extra.live) x.innerHTML = st.extra.live;
      if (st.extra.hideAt) setTimeout(() => { if (D && D.q === st && x.isConnected) x.innerHTML = st.extra.after; }, st.extra.hideAt * 1000);
      el.querySelector('#dwFoot').innerHTML = `<button type="button" class="dw-btn ghost" data-main data-stop>${T('انتهى التحدي', 'The challenge is over')}</button>`;
      el.querySelector('[data-stop]').onclick = score; clock(st, () => { SND.win(); score(); });
    };
    const score = () => { st.again = score; if (st.sc === 'judge') { st.locked = true; clearInterval(tick); const x = el.querySelector('#dwX'); if (st.extra.answer) x.innerHTML = st.extra.answer;
      return judgeBox(st, m => { let best = -1; m.forEach((v, k) => { D.groups[k].score += v; if (best < 0 || v > m[best]) best = k; }); if (best >= 0 && m[best] > 0) D.groups[best].chal = (D.groups[best].chal || 0) + 1; SND.ok();
        after(`<p>${T('أُضيفت الدرجات', 'Marks added')}${best >= 0 && m[best] > 0 ? ` · ${T('الأعلى', 'Top')}: <span dir="auto">${esc(D.groups[best].name)}</span> <b>+${NUM(m[best])}</b>` : ''}</p>`); }); }
      rank(); };
    const rank = () => {
      st.locked = true; clearInterval(tick); const f = el.querySelector('#dwFoot'), x = el.querySelector('#dwX'); if (st.extra.answer) x.innerHTML = st.extra.answer;
      const paint = () => { f.innerHTML = `<div class="dw-steal"><p>${T('اضغط المجموعات بترتيب الفوز: الأول ثم الثاني…', 'Tap the groups in winning order: first, then second…')}</p><div>${D.groups.map((g, k) => { const p = st.rank.indexOf(k); return `<button type="button" data-rk="${k}" style="--c:${g.col}" class="${p >= 0 ? 'on' : ''}" dir="auto">${p >= 0 ? `<em>${NUM(p + 1)}</em>` : ''}${esc(g.name)}</button>`; }).join('')}</div></div>
        <div class="dw-acts"><button type="button" class="dw-btn" data-main data-ok${st.rank.length ? '' : ' disabled'}>${T('اعتمد النتيجة', 'Confirm')}</button><button type="button" class="dw-btn ghost" data-re>${T('أعد الترتيب', 'Reset')}</button><button type="button" class="dw-btn ghost" data-tojudge>${T('ضع درجات بدلًا من الترتيب', 'Give marks instead')}</button></div>`;
        f.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { const k = +b.dataset.rk; if (!st.rank.includes(k)) st.rank.push(k); paint(); });
        f.querySelector('[data-re]').onclick = () => { st.rank = []; paint(); };
        f.querySelector('[data-tojudge]').onclick = () => { st.sc = 'judge'; score(); };
        f.querySelector('[data-ok]').onclick = () => { st.rank.forEach((k, p) => { D.groups[k].score += PLACE[p] || 10; D.groups[k].chal = (D.groups[k].chal || 0) + (p === 0 ? 1 : 0); }); SND.ok(); const w = D.groups[st.rank[0]];
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
  function boardPick(s) {
    const g = D.groups[s.g], cats = [...new Set(D.tiles.map(t => t.cat))];
    shell(`${board(s.g)}<div class="dw-mid dw-bd" style="--c:${g.col}"><h2>${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span></h2><p>${T('اختاروا الفئة والقيمة: كلما زادت القيمة صعب السؤال وكثرت النقاط', 'Pick a category and a value: the higher, the harder and the more points')}</p>
      <div class="dw-grid" style="--n:${cats.length}">${cats.map(c => `<div class="dw-col"><h3 dir="auto">${esc(c)}</h3>${D.tiles.map((t, i) => t.cat === c ? `<button type="button" data-tile="${i}"${t.used ? ' disabled' : ''}>${t.used ? '' : NUM(t.v)}</button>` : '').join('')}</div>`).join('')}</div></div>`, 'dw-in');
    el.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => { const t = D.tiles[+b.dataset.tile]; t.used = true; s.x = t.x; s.val = t.v; s.cat = t.cat; SND.go(); ask(); });
  }

  /* ---------- «حروف»: category, then a letter (the first letter of the answer), then a number ---------- */
  const normL = ch => ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه' }[ch] || ch);
  function letterOf(x) {
    if (x.letter) return normL(String(x.letter).trim().charAt(0));
    const a = String(isMC(x) ? x.opts[x.ok[0]] || '' : x.ans == null ? '' : x.ans).trim().replace(/^(ال|AL\s)/i, '');
    const c = a.charAt(0); return /[؀-ۿA-Za-z]/.test(c) ? normL(c.toUpperCase()) : '';
  }
  function huroof(s) {
    const g = D.groups[s.g], open = D.tiles.filter(t => !t.used && t.letter), head = (sub, inner, crumbs) => shell(`${board(s.g)}<div class="dw-mid dw-bd dw-hr" style="--c:${g.col}"><h2>${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span></h2>${crumbs ? `<p class="dw-crumb">${crumbs}</p>` : ''}<p>${sub}</p>${inner}</div>`, 'dw-in');
    const pickCat = () => { const cats = [...new Set(open.map(t => t.cat))];
      head(T('اختاروا الفئة', 'Pick a category'), `<div class="dw-hbtns">${cats.map(c => `<button type="button" data-hc="${esc(c)}" dir="auto">${esc(c)}<small>${NUM(open.filter(t => t.cat === c).length)}</small></button>`).join('')}</div>`);
      el.querySelectorAll('[data-hc]').forEach(b => b.onclick = () => { SND.tick(); pickLetter(b.dataset.hc); }); };
    const pickLetter = cat => { const L = [...new Set(open.filter(t => t.cat === cat).map(t => t.letter))].sort((a, b) => a.localeCompare(b, 'ar'));
      head(T('اختاروا الحرف: إجابة السؤال تبدأ به', 'Pick a letter: the answer starts with it'), `<div class="dw-hbtns dw-hl">${L.map(l => `<button type="button" data-hl="${esc(l)}">${esc(l)}</button>`).join('')}</div><button type="button" class="dw-btn ghost" data-back>${T('رجوع', 'Back')}</button>`, esc(cat));
      el.querySelectorAll('[data-hl]').forEach(b => b.onclick = () => { SND.tick(); pickNum(cat, b.dataset.hl); }); el.querySelector('[data-back]').onclick = pickCat; };
    const pickNum = (cat, l) => { const ts = open.filter(t => t.cat === cat && t.letter === l);
      head(T('اختاروا رقمًا', 'Pick a number'), `<div class="dw-hbtns dw-hn">${ts.map((t, i) => `<button type="button" data-hn="${D.tiles.indexOf(t)}">${NUM(i + 1)}</button>`).join('')}</div><button type="button" class="dw-btn ghost" data-back>${T('رجوع', 'Back')}</button>`, `${esc(cat)} › ${esc(l)}`);
      el.querySelectorAll('[data-hn]').forEach(b => b.onclick = () => { const t = D.tiles[+b.dataset.hn]; t.used = true; s.x = t.x; s.val = t.v; s.cat = `${t.cat} › ${t.letter}`; SND.go(); ask(); }); el.querySelector('[data-back]').onclick = () => pickLetter(cat); };
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
  function fitTime(c, n, P, mc, minutes) {
    const r = Object.assign({}, c.r), need = () => MIN.all * r.all + MIN.board * (r.board || 0) + MIN.turn * r.turn * n + MIN.buzz * r.buzz + MIN.chal * r.chal + 3;
    let guard = 200;
    while (need() < minutes - 2 && guard--) { const q = r.all + (r.board || 0) + r.turn * n + r.buzz; if (q < P) { if ((r.board || 0) && r.board < 24 && r.board <= r.all) r.board++; else if (r.buzz < mc && r.buzz <= r.all) r.buzz++; else r.all++; } else if (r.chal < 10) r.chal++; else break; }
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
    const later = () => { clearTimeout(tSave); tSave = setTimeout(() => { saveQuiz(z); const s = root.querySelector('#deSaved'); if (s) s.textContent = T('حُفظت', 'Saved'); }, 500); };
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
        <div class="de-bar"><span>${T(`أسئلة جاهزة: ${NUM(good)} من ${NUM(z.qs.length)} · تحديات: ${NUM(z.ch.length)}`, `Ready: ${good} of ${z.qs.length} questions · ${z.ch.length} challenges`)}</span><button type="button" class="dw-btn" data-play${good + z.ch.length ? '' : ' disabled'}>${T('العب الآن ▶', 'Play now ▶')}</button></div></div>`;
      bind();
    };
    const q = s => root.querySelector(s);
    function bind() {
      q('[data-back]').onclick = () => { saveQuiz(z); back(); };
      q('[data-title]').oninput = e => { z.title = e.target.value; later(); };
      root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
      root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; paint(); });
      q('[data-play]').onclick = () => { saveQuiz(z); start({ title: z.title || T('أمسية دوّارة', 'A Dawwara evening'), qs: JSON.parse(JSON.stringify(z.qs.filter(ok))), ch: z.ch.filter(c => c.t && c.d) }); };
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
  function aiBox() {
    return `<div class="dw-ai"><textarea id="dwAiT" rows="3" dir="auto" placeholder="${T('مثال: اليوم الوطني، أو درس الفصل الثالث في العلوم، أو ثقافة عامة للعائلة', 'e.g. National Day, a science lesson, general culture for the family')}"></textarea>
      <div class="dw-aig"><label>${T('الجمهور', 'Audience')}<select id="dwAiA">${AUD().map(a => `<option value="${a[0]}">${a[1]}</option>`).join('')}</select></label><button type="button" class="dw-btn" id="dwAiGo">${T('اصنع الأمسية', 'Make the evening')}</button></div>
      <details class="dw-adv2"><summary>${T('خيارات إضافية', 'More options')}</summary><div class="dw-aig"><label>${T('أسئلة لكل فئة', 'Per category')}<select id="dwAiN">${[2, 3, 4, 5, 6].map(v => `<option${v === 4 ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>${T('عدد التحديات', 'Challenges')}<select id="dwAiC">${[0, 2, 3, 4, 5, 6, 8].map(v => `<option${v === 4 ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div><label class="dw-ail">${T('الفئات (افصل بينها بفاصلة)', 'Categories (comma separated)')}<input id="dwAiK" dir="auto" value="${T('دين، علوم، تاريخ، جغرافيا، رياضة، عامة', 'Religion, Science, History, Geography, Sport, General')}"></label><div class="dw-aik">${[T('حركية', 'Moving'), T('تمثيل', 'Acting'), T('إبداع ورسم', 'Creative'), T('ذكاء وسرعة بديهة', 'Quick wits'), T('تعاون', 'Teamwork')].map((k, i) => `<label><input type="checkbox" data-kind="${esc(k)}"${i < 4 ? ' checked' : ''}> ${k}</label>`).join('')}<label><input type="checkbox" id="dwAiM" checked> ${T('أدوات بسيطة مسموحة', 'Simple items allowed')}</label></div></details>
      <p class="dw-found" id="dwAiS" aria-live="polite"></p></div>`;
  }
  function aiBind(root) {
    const q = s => root.querySelector(s), b = q('#dwAiGo'); if (!b) return;
    b.onclick = async () => {
      const o = { topic: q('#dwAiT').value.trim(), aud: q('#dwAiA').value, per: +q('#dwAiN').value, nch: +q('#dwAiC').value, cats: q('#dwAiK').value.split(/[،,]/).map(s => s.trim()).filter(Boolean).slice(0, 6), kinds: [...root.querySelectorAll('[data-kind]:checked')].map(i => i.dataset.kind), mat: q('#dwAiM').checked };
      if (!o.cats.length) o.cats = [T('عامة', 'General')];
      const day = new Date().toISOString().slice(0, 10); let used = {}; try { used = JSON.parse(localStorage.getItem('dw.ai') || '{}'); } catch (e) {}
      if (used.d === day && used.n >= 15) { q('#dwAiS').textContent = T('وصلت حد اليوم. جرّب غدًا.', 'Today’s limit reached. Try tomorrow.'); return; }
      b.disabled = true; q('#dwAiS').textContent = T('يكتب الأسئلة والتحديات… عادةً أقل من دقيقة', 'Writing the questions and challenges… usually under a minute');
      try {
        const r = fromAI(await gemini(aiPrompt(o))); if (r.qs.length < 2 && !r.ch.length) throw new Error('empty');
        try { localStorage.setItem('dw.ai', JSON.stringify({ d: day, n: (used.d === day ? used.n : 0) + 1 })); } catch (e) {}
        const quiz = { id: Math.random().toString(36).slice(2, 10), title: r.title || o.topic.slice(0, 60) || T('أمسية دوّارة', 'A Dawwara evening'), at: Date.now(), qs: r.qs, ch: r.ch, src: 'dw' };
        try { const L = JSON.parse(localStorage.getItem('qz.list') || '[]'); L.unshift(quiz); localStorage.setItem('qz.list', JSON.stringify(L)); } catch (e) {}
        q('#dwAiS').textContent = T(`كُتب ${NUM(r.qs.length)} سؤالًا و${NUM(r.ch.length)} تحديات. راجعها ثم العب.`, `${r.qs.length} questions and ${r.ch.length} challenges, saved under “Your quizzes”.`);
        b.disabled = false; editor(root, quiz, () => home(root));
      } catch (e) { console.error(e); b.disabled = false; q('#dwAiS').textContent = T('تعذّر الآن. جرّب بعد قليل.', 'Could not do it now. Try again shortly.'); }
    };
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
    D.done = true; const R = ranked(), w = R[0], tie = R[1] && R[1].score === w.score; SND.win();
    shell(`<div class="dw-mid dw-fin"><div class="dw-conf" aria-hidden="true">${Array.from({ length: 36 }, (_, k) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--c:${COL[k % COL.length]}"></i>`).join('')}</div>
      <p class="dw-sub">${esc(D.title)}</p><h2>${tie ? T('تعادل في القمة!', 'A tie at the top!') : T('الفائز', 'The winner')}</h2><p class="dw-winner" style="--c:${w.col}" dir="auto">${esc(tie ? R.filter(g => g.score === w.score).map(g => g.name).join(T(' و', ' & ')) : w.name)}</p>
      <div class="dw-pod">${R.slice(0, 3).map((g, k) => `<div class="p${k + 1}" style="--c:${g.col}"><span dir="auto">${esc(g.name)}</span><b>${NUM(g.score)}</b><i>${NUM(k + 1)}</i></div>`).join('')}</div>
      <table class="dw-tab"><tr><th>${T('المجموعة', 'Group')}</th><th>${T('النقاط', 'Points')}</th><th>${T('إجابات صحيحة', 'Right')}</th><th>${T('سرقات', 'Steals')}</th><th>${T('تحديات فازت بها', 'Challenges won')}</th></tr>${R.map(g => `<tr><td dir="auto"><i style="background:${g.col}"></i>${esc(g.name)}</td><td>${NUM(g.score)}</td><td>${NUM(g.right)}</td><td>${NUM(g.steals)}</td><td>${NUM(g.chal || 0)}</td></tr>`).join('')}</table>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('العب مرة ثانية', 'Play again')}</button><button type="button" class="dw-btn ghost" data-cert>${IC.print}${T('اطبع شهادة الفائز', 'Print the winner’s certificate')}</button></div></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => { D.steps = null; setup(); };
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

  /* ---------- the game's own page: where the questions come from ---------- */
  function home(root) {
    let mine = []; try { mine = JSON.parse(localStorage.getItem('qz.list') || '[]'); } catch (e) {}
    mine = mine.map(z => ({ z, n: (z.qs || []).filter(usable).length })).filter(o => o.n >= 2 || (o.z.ch || []).length);
    const lib = (window.MDLib || []).map(z => ({ z, n: (z.qs || []).filter(usable).length })).filter(o => o.n >= 4);
    const item = (o, k, src) => `<button type="button" class="dw-pick" data-src="${src}" data-k="${k}"><b dir="auto">${esc(o.z.title || T('بلا عنوان', 'Untitled'))}</b><small>${T(`${NUM(o.n)} سؤالًا صالحًا`, `${o.n} usable questions`)}${o.z.who ? ' · ' + esc(o.z.who) : ''}</small></button>`;
    root.innerHTML = `<div class="dw-start"><h2>${T('اختر الأسئلة', 'Choose the questions')}</h2>
      <div class="dw-tabs" role="tablist"><button type="button" role="tab" data-tab="ai" aria-selected="true">${T('بالذكاء الاصطناعي', 'With AI')}</button><button type="button" role="tab" data-tab="ready" aria-selected="false">${T('مسابقة جاهزة', 'A ready quiz')}</button><button type="button" role="tab" data-tab="chal" aria-selected="false">${T('تحديات فقط', 'Challenges only')}</button><button type="button" role="tab" data-tab="own" aria-selected="false">${T('اكتبها بنفسك', 'Write your own')}</button></div>
      <div data-pane="ai"><p class="dw-pane-h">${T('اكتب الموضوع، فتُكتب الأسئلة مصنفة ومتدرجة مع تحديات تناسبها.', 'Write a topic; you get questions by category and level, with challenges to suit.')}</p>${aiBox()}</div>
      <div data-pane="ready" hidden>
        ${mine.length ? `<h3>${T('مسابقاتك', 'Your quizzes')}</h3><div class="dw-picks">${mine.map((o, k) => `<div class="dw-pickw">${item(o, k, 'm')}<button type="button" class="dw-edb" data-ed="${k}">${T('عدّل', 'Edit')}</button></div>`).join('')}</div>` : ''}
        ${lib.length ? `<h3>${T('من المكتبة', 'From the library')}</h3><div class="dw-picks">${lib.map((o, k) => item(o, k, 'l')).join('')}</div>` : ''}
        <details class="dw-adv2"><summary>${T('أو الصق أسئلتك', 'Or paste your questions')}</summary>
          <textarea id="dwPaste" rows="6" dir="auto" placeholder="${T('١. ما عاصمة المملكة؟\nأ) جدة\nب) الرياض *\nج) الدمام', '1. What is the capital of France?\na) Lyon\nb) Paris *')}"></textarea>
          <p class="dw-found" id="dwFound"></p><button type="button" class="btn solid" id="dwGo" disabled>${T('العب بهذه الأسئلة', 'Play with these')}</button></details></div>
      <div data-pane="chal" hidden><p class="dw-pane-h">${T('أمسية بلا أسئلة: تحديات حركة وإبداع وذكاء للمجموعات، تختار مناسبتها في الخطوة التالية.', 'No questions: moving, creating and thinking challenges; you pick the occasion next.')}</p><button type="button" class="dw-btn" id="dwChal">${T('ابدأ أمسية تحديات', 'Start an evening of challenges')}</button></div>
      <div data-pane="own" hidden><p class="dw-pane-h">${T('اكتب أسئلتك بفئاتها وصعوبتها، وتحدياتك بأدواتها، في محرر بسيط. تُحفظ وتلعبها متى شئت.', 'Write your questions by category and level, and your challenges with their items. Saved for whenever you play.')}</p><button type="button" class="dw-btn" id="dwOwn">${T('افتح المحرر', 'Open the editor')}</button></div>
      <p class="dw-next">${T('بعدها تحدد عدد المجموعات والمدة، وتبدأ.', 'Then you set the groups and the length, and start.')}</p></div>`;
    root.querySelector('#dwOwn').onclick = () => editor(root, null, () => home(root));
    root.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editor(root, mine[+b.dataset.ed].z, () => home(root)));
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b)); root.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; }); });
    aiBind(root);
    root.querySelectorAll('.dw-pick').forEach(b => b.onclick = () => { const o = (b.dataset.src === 'm' ? mine : lib)[+b.dataset.k]; start({ title: o.z.title, qs: JSON.parse(JSON.stringify(o.z.qs)), ch: o.z.ch || [] }); });
    const ta = root.querySelector('#dwPaste'), go = root.querySelector('#dwGo'), fd = root.querySelector('#dwFound'); let got = [];
    ta.oninput = () => { got = window.QZParse ? QZParse.fromText(ta.value).filter(usable) : []; go.disabled = got.length < 2; fd.textContent = ta.value.trim() ? T(`وجدتُ ${NUM(got.length)} سؤالًا`, `Found ${got.length} questions`) : ''; };
    go.onclick = () => start({ title: T('مسابقة دوّارة', 'A Dawwara quiz'), qs: got });
    root.querySelector('#dwChal').onclick = () => { const c = cfgGet(); c.r = null; cfgSet(c); start({ title: T('أمسية تحديات', 'An evening of challenges'), qs: [] }); };
  }

  const root = document.getElementById('dw'); if (root) home(root);
  return { start, close, usable };
})();

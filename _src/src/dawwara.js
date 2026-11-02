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
    D = { title: quiz.title || T('دوّارة', 'Dawwara'), all: qs, cfg: cfgGet() };
    // no questions at all still makes an evening of challenges
    setup();
  }
  function setup() {
    const c = D.cfg, n = Math.min(8, Math.max(2, c.n)), P = D.all.length, mc = D.all.filter(isMC).length;
    if (!c.r || c.rn !== n) { c.r = defRounds(n, P, mc); c.rn = n; }
    const opt = (k, max, unit) => `<select data-r="${k}">${Array.from({ length: max + 1 }, (_, v) => `<option value="${v}"${c.r[k] === v ? ' selected' : ''}>${v ? NUM(v) + ' ' + unit : T('بدونها', 'None')}</option>`).join('')}</select>`;
    shell(`<div class="dw-set"><header><b class="dw-logo">${T('دوّارة', 'Dawwara')}</b><h2 dir="auto">${esc(D.title)}</h2><p>${T(`مسابقة فرق على جهاز واحد: كل مجموعة يجيها دورها وسؤالها، وقائدها يقول الإجابة، وأنت تسجّلها بلمسة. الصح والأسرع يكسب أكثر. الأسئلة الصالحة: ${NUM(D.all.length)}`, `A team quiz on one device: each group gets its turn and its own question, its leader says the answer and you tap it. Right and fast scores more. Usable questions: ${D.all.length}`)}</p></header>
      <div class="dw-row"><span>${T('عدد المجموعات', 'Groups')}</span><div class="dw-seg">${[2, 3, 4, 5, 6, 7, 8].map(k => `<button type="button" data-n="${k}" aria-pressed="${k === n}"${k > D.all.length ? ' disabled' : ''}>${NUM(k)}</button>`).join('')}</div></div>
      <div class="dw-groups">${Array.from({ length: n }, (_, k) => `<div class="dw-g" style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="18" dir="auto" value="${esc(c.names[k] || NAMES()[k])}" aria-label="${T('اسم المجموعة', 'Group name')}"><input data-lead="${k}" maxlength="18" dir="auto" value="${esc(c.leads[k] || '')}" placeholder="${T('القائد (اختياري)', 'Leader (optional)')}"></div>`).join('')}</div>
      <div class="dw-rounds"><h3>${T('جولات الأمسية', 'The rounds')}</h3>
        <div class="dw-row"><span>${ROUND().all[0]}<small>${T('الكل يجاوب في نفس الوقت', 'All answer at once')}</small></span>${opt('all', Math.min(15, P), T('أسئلة', 'questions'))}</div>
        <div class="dw-row"><span>${ROUND().turn[0]}<small>${T('لكل مجموعة سؤالها', 'A question per group')}</small></span>${opt('turn', Math.min(6, Math.floor(P / n)), T('لكل مجموعة', 'per group'))}</div>
        <div class="dw-row"><span>${ROUND().buzz[0]}<small>${T('أول يد ترتفع تجاوب', 'First hand up answers')}</small></span>${opt('buzz', Math.min(15, mc), T('أسئلة', 'questions'))}</div>
        <div class="dw-row"><span>${ROUND().chal[0]}<small>${T('حركة وإبداع وذكاء، بلا أجهزة', 'Moving, creating, thinking')}</small></span>${opt('chal', 10, T('تحديات', 'challenges'))}</div>
        <p class="dw-need" id="dwNeed"></p></div>
      <div class="dw-row"><span>${T('وقت السؤال', 'Time per question')}</span><select data-time>${[[0, T('كما في المسابقة', 'As in the quiz')], [20, NUM(20) + T(' ثانية', ' s')], [30, NUM(30) + T(' ثانية', ' s')], [45, NUM(45) + T(' ثانية', ' s')], [60, T('دقيقة', '1 min')], [90, T('دقيقة ونصف', '1.5 min')]].map(([v, l]) => `<option value="${v}"${c.time === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <label class="dw-ck"><input type="checkbox" data-steal${c.steal ? ' checked' : ''}> ${T('السرقة: إذا أخطأت المجموعة، أول مجموعة ترفع يدها تجاوب وتخطف نصف النقاط', 'Stealing: after a miss, the first group to raise a hand answers for half the points')}</label>
      <label class="dw-ck"><input type="checkbox" data-life${c.life ? ' checked' : ''}> ${T('وسائل المساعدة لكل مجموعة مرة واحدة: حذف خيارين، ووقت إضافي، وتبديل السؤال', 'Helps, once per group: remove two options, extra time, swap the question')}</label>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ دوّارة', 'Start Dawwara')}</button><button type="button" class="dw-btn ghost" data-cards>${IC.print}${T('اطبع بطاقات المجموعات', 'Print group cards')}</button></div></div>`, 'dw-setup');
    const read = () => { c.names = [...el.querySelectorAll('[data-name]')].map(i => i.value.trim()); c.leads = [...el.querySelectorAll('[data-lead]')].map(i => i.value.trim()); el.querySelectorAll('[data-r]').forEach(x => { c.r[x.dataset.r] = +x.value; }); c.time = +el.querySelector('[data-time]').value; c.steal = el.querySelector('[data-steal]').checked; c.life = el.querySelector('[data-life]').checked; cfgSet(c); };
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.n; c.r = null; cfgSet(c); setup(); });
    const need = () => { read(); const q = c.r.turn * n + c.r.all + c.r.buzz, e = el.querySelector('#dwNeed'), st = el.querySelector('[data-main]');
      e.textContent = T(`تحتاج ${NUM(q)} سؤالًا من ${NUM(P)} متاحة، و${NUM(c.r.chal)} تحديات.`, `Needs ${q} of the ${P} questions, and ${c.r.chal} challenges.`); e.classList.toggle('bad', q > P); st.disabled = q > P || !(q + c.r.chal); };
    el.querySelectorAll('[data-r]').forEach(x => x.onchange = need); need();
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
    const st = D.q = { tn, g, x, dur, left: dur, t0: Date.now(), hide: [], locked: false, stealer: null, tried: [] };
    const text = ['num', 'word'].includes(x.type);
    shell(`${board(tn.g)}<div class="dw-q" style="--c:${g.col}"><div class="dw-qh"><span class="dw-who" dir="auto">${esc(g.name)}${g.lead ? ` · ${esc(g.lead)}` : ''}</span><div class="dw-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="44" id="dwArc"/></svg><b id="dwT">${NUM(dur)}</b></div></div>
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
  const worth = st => 100 + Math.round(50 * Math.max(0, st.left) / st.dur);
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
    const who = st.stealer || st.g, pts = right ? (st.stealer ? 50 : worth(st)) : 0;
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
    turn: [T('جولة الدور', 'Turn round'), T('لكل مجموعة سؤالها، وقائدها يقول الإجابة. ومن يخطئ يمكن السرقة منه.', 'Each group gets its own question and its leader answers. A miss can be stolen.')],
    buzz: [T('جولة السرعة', 'Speed round'), T('أول مجموعة ترفع يدها تجاوب. الخطأ يُخرجها من السؤال، والصحيح الأسرع يكسب أكثر.', 'The first group to raise a hand answers. A wrong answer puts it out of that question; the fastest right one wins most.')],
    chal: [T('جولة التحديات', 'Challenge round'), T('تحدٍّ للمجموعات كلها في وقت واحد، والمدير يرتّب الفائزين.', 'A challenge for all groups at once; the host ranks the winners.')]
  });
  // a sensible program for the number of groups: few groups play by turn; many groups play all together
  const defRounds = (n, pool, mc) => {
    const r = n <= 3 ? { turn: 2, all: 3, buzz: 3, chal: 2 } : n <= 5 ? { turn: 1, all: 4, buzz: 4, chal: 2 } : { turn: 0, all: 5, buzz: 5, chal: 3 };
    r.buzz = Math.min(r.buzz, mc); while (r.turn * n + r.all + r.buzz > pool && (r.turn || r.all || r.buzz)) { if (r.turn) r.turn--; else if (r.all >= r.buzz && r.all) r.all--; else r.buzz--; }
    return r;
  };
  function program() {
    const c = D.cfg, n = c.n, R = c.r;
    const order = ['mc', 'tf', 'num', 'word'], rest = D.all.map((x, i) => ({ x, i })).sort((a, b) => order.indexOf(a.x.type) - order.indexOf(b.x.type) || a.i - b.i).map(o => o.x);
    const take = (k, f) => { const out = []; for (let i = 0; i < rest.length && out.length < k;) { if (!f || f(rest[i])) out.push(rest.splice(i, 1)[0]); else i++; } return out; };
    const buzzQ = take(R.buzz, isMC), turnQ = take(R.turn * n), allQ = take(R.all);
    D.spare = rest;
    const hands = D.groups.map(() => []); turnQ.forEach((x, k) => hands[k % n].push(x));
    const turns = []; for (let r = 0; r < R.turn; r++) for (let g = 0; g < n; g++) if (hands[g][r]) turns.push({ k: 'turn', g, x: hands[g][r], r });
    const used = new Set(), chs = Array.from({ length: R.chal }, () => ({ k: 'chal', c: nextChal(used) })).filter(o => o.c);
    const blocks = [['all', allQ.map(x => ({ k: 'all', x }))], ['turn', turns], ['buzz', buzzQ.map(x => ({ k: 'buzz', x }))]].filter(b => b[1].length);
    const per = Math.ceil(chs.length / Math.max(1, blocks.length)), steps = [];
    const push = (type, items) => { if (!items.length) return; steps.push({ k: 'round', type, n: items.length }); items.forEach(i => steps.push(i)); steps.push({ k: 'stand' }); };
    blocks.forEach(([t, items]) => { push(t, items); push('chal', chs.splice(0, per)); });
    push('chal', chs);
    if (steps.length && steps[steps.length - 1].k === 'stand') steps.pop();
    D.steps = steps; D.used = used;
  }
  function run() {
    const s = D.steps[D.t]; clearInterval(tick);
    if (!s) return final();
    ({ round: roundCard, turn: intro, all: askAll, buzz: askBuzz, chal: challenge, stand: standings })[s.k](s);
  }
  const go = () => { D.t++; run(); };
  const nextLabel = () => { const s = D.steps[D.t + 1]; return !s ? T('النتيجة النهائية', 'Final result') : s.k === 'stand' ? T('الترتيب', 'Standings') : s.k === 'round' ? T('الجولة التالية', 'Next round') : s.k === 'turn' ? T('الدور التالي', 'Next turn') : s.k === 'chal' ? T('التحدي التالي', 'Next challenge') : T('السؤال التالي', 'Next question'); };
  function roundCard(s) {
    const no = D.steps.slice(0, D.t + 1).filter(x => x.k === 'round').length, all = D.steps.filter(x => x.k === 'round').length, [t, d] = ROUND()[s.type];
    shell(`${board(-1)}<div class="dw-mid dw-rcard dw-r-${s.type}"><p class="dw-sub">${T(`الجولة ${NUM(no)} من ${NUM(all)}`, `Round ${no} of ${all}`)}</p><h2>${t}</h2><p>${d}</p><p class="dw-sub">${s.type === 'chal' ? T(`${NUM(s.n)} ${s.n === 1 ? 'تحدٍّ' : 'تحديات'}`, `${s.n} challenge${s.n > 1 ? 's' : ''}`) : s.type === 'turn' ? T(`${NUM(s.n)} أسئلة بالتناوب`, `${s.n} questions in turn`) : T(`${NUM(s.n)} أسئلة`, `${s.n} questions`)}</p><button type="button" class="dw-btn" data-main>${T('ابدأ الجولة', 'Start the round')}</button></div>`, 'dw-in');
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
    shell(`${board(-1)}<div class="dw-q dw-all"><div class="dw-qh"><span class="dw-who">${T('سؤال للجميع', 'Everyone answers')}</span>${ring(dur)}</div>${qBody(x, false)}
      ${isMC(x) ? '' : `<p class="dw-hint">${T('كل مجموعة تكتب إجابتها على ورقة وترفعها.', 'Each group writes its answer and holds it up.')}</p>`}
      <div class="dw-rec" id="dwRec"></div><div class="dw-foot" id="dwFoot"><button type="button" class="dw-btn" data-main data-rev>${isMC(x) ? T('أظهر الإجابة', 'Show the answer') : T('اكشف الإجابة', 'Reveal the answer')}</button></div></div>`, 'dw-ask');
    const rec = () => {
      const box = el.querySelector('#dwRec'); if (!box) return;
      box.innerHTML = D.groups.map((g, k) => `<div class="dw-rg" style="--c:${g.col}"><b dir="auto">${esc(g.name)}</b><span>${isMC(x)
        ? x.opts.map((o, j) => `<button type="button" data-g="${k}" data-a="${j}" style="--o:var(--dwo${j})" aria-pressed="${st.rec[k] === j}"${st.shown ? ' disabled' : ''}>${x.type === 'tf' ? esc(o) : LET()[j]}</button>`).join('')
        : st.shown ? `<button type="button" class="y" data-g="${k}" data-r="1" aria-pressed="${st.ok[k] === true}">✓</button><button type="button" class="n" data-g="${k}" data-r="0" aria-pressed="${st.ok[k] === false}">✗</button>` : `<em>${T('تكتب…', 'Writing…')}</em>`}</span>${st.done ? `<i class="${st.ok[k] ? 'ok' : 'no'}">${st.ok[k] ? '+' + NUM(100) : '٠'}</i>` : ''}</div>`).join('');
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
      st.done = true; let n = 0; D.groups.forEach((g, k) => { if (st.ok[k]) { g.score += 100; g.right++; n++; } });
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
      if (right) { b.classList.add('ok'); const pts = 100 + Math.round(50 * st.left / st.dur); D.groups[k].score += pts; D.groups[k].right++; return end(k, pts); }
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
    const ch = s.c, st = D.q = { dur: ch.s, left: ch.s, locked: false, rank: [], extra: extra(ch) };
    shell(`${board(-1)}<div class="dw-mid dw-ch"><p class="dw-tag">${esc(ch.cat)}</p><h2>${esc(ch.t)}</h2><p>${esc(ch.d)}</p><div class="dw-x" id="dwX">${st.extra.pre || ''}</div>${ring(ch.s)}
      <div class="dw-foot" id="dwFoot"><div class="dw-acts"><button type="button" class="dw-btn" data-main data-go>${T('ابدأ المؤقت', 'Start the timer')}</button><button type="button" class="dw-btn ghost" data-swap>${IC.swap}${T('تحدٍّ آخر', 'Another challenge')}</button></div></div></div>`, 'dw-in');
    el.querySelector('[data-swap]').onclick = () => { const n = nextChal(D.used, ch.i); if (n) { s.c = n; challenge(s); } };
    el.querySelector('[data-go]').onclick = () => {
      SND.go(); const x = el.querySelector('#dwX'); if (st.extra.live) x.innerHTML = st.extra.live;
      if (st.extra.hideAt) setTimeout(() => { if (D && D.q === st && x.isConnected) x.innerHTML = st.extra.after; }, st.extra.hideAt * 1000);
      el.querySelector('#dwFoot').innerHTML = `<button type="button" class="dw-btn ghost" data-main data-stop>${T('انتهى التحدي', 'The challenge is over')}</button>`;
      el.querySelector('[data-stop]').onclick = rank; clock(st, () => { SND.win(); rank(); });
    };
    const rank = () => {
      st.locked = true; clearInterval(tick); const f = el.querySelector('#dwFoot'), x = el.querySelector('#dwX'); if (st.extra.answer) x.innerHTML = st.extra.answer;
      const paint = () => { f.innerHTML = `<div class="dw-steal"><p>${T('اضغط المجموعات بترتيب الفوز: الأول ثم الثاني…', 'Tap the groups in winning order: first, then second…')}</p><div>${D.groups.map((g, k) => { const p = st.rank.indexOf(k); return `<button type="button" data-rk="${k}" style="--c:${g.col}" class="${p >= 0 ? 'on' : ''}" dir="auto">${p >= 0 ? `<em>${NUM(p + 1)}</em>` : ''}${esc(g.name)}</button>`; }).join('')}</div></div>
        <div class="dw-acts"><button type="button" class="dw-btn" data-main data-ok${st.rank.length ? '' : ' disabled'}>${T('اعتمد النتيجة', 'Confirm')}</button><button type="button" class="dw-btn ghost" data-re>${T('أعد الترتيب', 'Reset')}</button></div>`;
        f.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { const k = +b.dataset.rk; if (!st.rank.includes(k)) st.rank.push(k); paint(); });
        f.querySelector('[data-re]').onclick = () => { st.rank = []; paint(); };
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
      [K, 'الجملة الطويلة', 'كوّنوا أطول جملة مفيدة يقول فيها كل عضو كلمة واحدة بدوره.', 'Long sentence', 'Build the longest sensible sentence, one word per member in turn.', 60]
    ].map(r => ({ cat: r[0], t: A ? r[1] : r[3], d: A ? r[2] : r[4], s: r[5], x: r[6] || '' })); };

  /* ---------- 3. after each round, and at the end ---------- */
  const ranked = () => D.groups.slice().sort((a, b) => b.score - a.score || b.right - a.right);
  function standings() {
    const top = Math.max(1, ...D.groups.map(g => g.score));
    shell(`<div class="dw-mid dw-st"><h2>${T('الترتيب', 'Standings')}</h2>
      <ol class="dw-bars">${ranked().map(g => `<li style="--c:${g.col};--w:${Math.max(4, 100 * g.score / top)}%"><span dir="auto">${esc(g.name)}</span><i></i><b>${NUM(g.score)}</b></li>`).join('')}</ol>
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
    mine = mine.map(z => ({ z, n: (z.qs || []).filter(usable).length })).filter(o => o.n >= 2);
    const lib = (window.MDLib || []).map(z => ({ z, n: (z.qs || []).filter(usable).length })).filter(o => o.n >= 4);
    const item = (o, k, src) => `<button type="button" class="dw-pick" data-src="${src}" data-k="${k}"><b dir="auto">${esc(o.z.title || T('بلا عنوان', 'Untitled'))}</b><small>${T(`${NUM(o.n)} سؤالًا صالحًا`, `${o.n} usable questions`)}${o.z.who ? ' · ' + esc(o.z.who) : ''}</small></button>`;
    root.innerHTML = `<ol class="dw-how"><li><b>${NUM(1)}</b>${T('قسّم الحضور مجموعات، ولكل مجموعة قائد.', 'Split the room into groups, each with a leader.')}</li><li><b>${NUM(2)}</b>${T('كل مجموعة يجيها دورها وسؤالها على الشاشة.', 'Each group gets its turn and its own question on the screen.')}</li><li><b>${NUM(3)}</b>${T('القائد يقول الإجابة وأنت تضغطها: الصح والأسرع يكسب أكثر.', 'The leader says the answer and you tap it: right and fast wins more.')}</li></ol>
      <div class="dw-src">
        ${mine.length ? `<h2>${T('مسابقاتك', 'Your quizzes')}</h2><div class="dw-picks">${mine.map((o, k) => item(o, k, 'm')).join('')}</div>` : ''}
        <h2>${T('الصق أسئلتك', 'Paste your questions')}</h2>
        <textarea id="dwPaste" rows="6" dir="auto" placeholder="${T('١. ما عاصمة المملكة؟\nأ) جدة\nب) الرياض *\nج) الدمام\n\n٢. الشمس نجم (صح أو خطأ)\nالإجابة: صح', '1. What is the capital of France?\na) Lyon\nb) Paris *\n\n2. The Sun is a star (true or false)\nAnswer: true')}"></textarea>
        <p class="dw-found" id="dwFound"></p><button type="button" class="btn solid" id="dwGo" disabled>${T('العب بهذه الأسئلة', 'Play with these')}</button>
        ${lib.length ? `<h2>${T('مسابقات جاهزة', 'Ready quizzes')}</h2><div class="dw-picks">${lib.map((o, k) => item(o, k, 'l')).join('')}</div>` : ''}
        <h2>${T('أمسية تحديات', 'An evening of challenges')}</h2><p class="dw-more" style="margin:0">${T('بلا أسئلة: تحديات حركة وإبداع وذكاء للمجموعات.', 'No questions: moving, creating and thinking challenges for groups.')}</p><button type="button" class="btn ghost" id="dwChal">${T('ابدأ أمسية تحديات', 'Start an evening of challenges')}</button>
        <p class="dw-more">${T('تبي تكتب أسئلتك بالذكاء الاصطناعي أو من ملف؟ اكتبها في', 'Want to write questions with AI or from a file? Write them in')} <a href="/play/maydan/#build">${T('محرر ميدان', 'the Maydan editor')}</a>${T('، وتظهر هنا في «مسابقاتك».', ', and they appear here under “Your quizzes”.')}</p></div>`;
    root.querySelectorAll('.dw-pick').forEach(b => b.onclick = () => { const o = (b.dataset.src === 'm' ? mine : lib)[+b.dataset.k]; start({ title: o.z.title, qs: JSON.parse(JSON.stringify(o.z.qs)) }); });
    const ta = root.querySelector('#dwPaste'), go = root.querySelector('#dwGo'), fd = root.querySelector('#dwFound'); let got = [];
    ta.oninput = () => { got = window.QZParse ? QZParse.fromText(ta.value).filter(usable) : []; go.disabled = got.length < 2; fd.textContent = ta.value.trim() ? T(`وجدتُ ${NUM(got.length)} سؤالًا`, `Found ${got.length} questions`) : ''; };
    go.onclick = () => start({ title: T('مسابقة دوّارة', 'A Dawwara quiz'), qs: got });
    root.querySelector('#dwChal').onclick = () => { const c = cfgGet(); c.r = null; cfgSet(c); start({ title: T('أمسية تحديات', 'An evening of challenges'), qs: [] }); };
  }

  const root = document.getElementById('dw'); if (root) home(root);
  return { start, close, usable };
})();

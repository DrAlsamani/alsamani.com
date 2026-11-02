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
    el.querySelector('[data-close]').onclick = () => { if (!D || !D.turns || D.done || confirm(T('تنهي دوّارة؟', 'End Dawwara?'))) close(); };
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
    if (qs.length < 2) { shell(`<div class="dw-mid"><h2>${T('دوّارة تحتاج أسئلة أكثر', 'Dawwara needs more questions')}</h2><p>${T('تعمل دوّارة مع أسئلة الاختيار من متعدد والصح والخطأ والرقم والكلمة. أضف سؤالين منها على الأقل.', 'Dawwara uses multiple choice, true/false, number and word questions. Add at least two.')}</p><button type="button" class="dw-btn" data-main>${T('رجوع', 'Back')}</button></div>`); el.querySelector('[data-main]').onclick = close; return; }
    setup();
  }
  function setup() {
    const c = D.cfg, n = Math.min(8, Math.max(2, c.n)), most = Math.max(1, Math.floor(D.all.length / n));
    shell(`<div class="dw-set"><header><b class="dw-logo">${T('دوّارة', 'Dawwara')}</b><h2 dir="auto">${esc(D.title)}</h2><p>${T(`مسابقة فرق على جهاز واحد: كل مجموعة يجيها دورها وسؤالها، وقائدها يقول الإجابة، وأنت تسجّلها بلمسة. الصح والأسرع يكسب أكثر. الأسئلة الصالحة: ${NUM(D.all.length)}`, `A team quiz on one device: each group gets its turn and its own question, its leader says the answer and you tap it. Right and fast scores more. Usable questions: ${D.all.length}`)}</p></header>
      <div class="dw-row"><span>${T('عدد المجموعات', 'Groups')}</span><div class="dw-seg">${[2, 3, 4, 5, 6, 7, 8].map(k => `<button type="button" data-n="${k}" aria-pressed="${k === n}"${k > D.all.length ? ' disabled' : ''}>${NUM(k)}</button>`).join('')}</div></div>
      <div class="dw-groups">${Array.from({ length: n }, (_, k) => `<div class="dw-g" style="--c:${COL[k]}"><i></i><input data-name="${k}" maxlength="18" dir="auto" value="${esc(c.names[k] || NAMES()[k])}" aria-label="${T('اسم المجموعة', 'Group name')}"><input data-lead="${k}" maxlength="18" dir="auto" value="${esc(c.leads[k] || '')}" placeholder="${T('القائد (اختياري)', 'Leader (optional)')}"></div>`).join('')}</div>
      <div class="dw-row"><span>${T('أسئلة لكل مجموعة', 'Questions per group')}</span><select data-per>${Array.from({ length: most }, (_, k) => k + 1).reverse().map(k => `<option value="${k}"${(c.per || most) === k ? ' selected' : ''}>${NUM(k)}${k === most ? ' ' + T('(الكل)', '(all)') : ''}</option>`).join('')}</select></div>
      <div class="dw-row"><span>${T('وقت السؤال', 'Time per question')}</span><select data-time>${[[0, T('كما في المسابقة', 'As in the quiz')], [20, NUM(20) + T(' ثانية', ' s')], [30, NUM(30) + T(' ثانية', ' s')], [45, NUM(45) + T(' ثانية', ' s')], [60, T('دقيقة', '1 min')], [90, T('دقيقة ونصف', '1.5 min')]].map(([v, l]) => `<option value="${v}"${c.time === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <label class="dw-ck"><input type="checkbox" data-steal${c.steal ? ' checked' : ''}> ${T('السرقة: إذا أخطأت المجموعة، أول مجموعة ترفع يدها تجاوب وتخطف نصف النقاط', 'Stealing: after a miss, the first group to raise a hand answers for half the points')}</label>
      <label class="dw-ck"><input type="checkbox" data-life${c.life ? ' checked' : ''}> ${T('وسائل المساعدة لكل مجموعة مرة واحدة: حذف خيارين، ووقت إضافي، وتبديل السؤال', 'Helps, once per group: remove two options, extra time, swap the question')}</label>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('ابدأ دوّارة', 'Start Dawwara')}</button><button type="button" class="dw-btn ghost" data-cards>${IC.print}${T('اطبع بطاقات المجموعات', 'Print group cards')}</button></div></div>`, 'dw-setup');
    const read = () => { c.names = [...el.querySelectorAll('[data-name]')].map(i => i.value.trim()); c.leads = [...el.querySelectorAll('[data-lead]')].map(i => i.value.trim()); c.per = +el.querySelector('[data-per]').value; c.time = +el.querySelector('[data-time]').value; c.steal = el.querySelector('[data-steal]').checked; c.life = el.querySelector('[data-life]').checked; cfgSet(c); };
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { read(); c.n = +b.dataset.n; c.per = 0; cfgSet(c); setup(); });
    el.querySelector('[data-cards]').onclick = () => { read(); cards(); };
    el.querySelector('[data-main]').onclick = () => { read(); begin(); };
  }
  // the groups and the deal: questions sorted by kind and dealt in turn, so each group gets a like mix; the rest wait for a swap
  function begin() {
    const c = D.cfg, n = c.n, per = Math.min(c.per || 99, Math.floor(D.all.length / n));
    D.groups = Array.from({ length: n }, (_, k) => ({ name: c.names[k] || NAMES()[k], lead: c.leads[k] || '', col: COL[k], score: 0, right: 0, steals: 0, life: { half: 1, time: 1, swap: 1 } }));
    const order = ['mc', 'tf', 'num', 'word'], pool = D.all.map((x, i) => ({ x, i })).sort((a, b) => order.indexOf(a.x.type) - order.indexOf(b.x.type) || a.i - b.i).map(o => o.x);
    const hands = D.groups.map(() => []); pool.slice(0, per * n).forEach((x, k) => hands[k % n].push(x));
    D.spare = pool.slice(per * n); D.per = per; D.turns = [];
    for (let r = 0; r < per; r++) for (let g = 0; g < n; g++) D.turns.push({ g, x: hands[g][r] });
    D.t = 0; D.done = false; SND.go(); intro();
  }
  const board = cur => `<div class="dw-board">${D.groups.map((g, k) => `<div class="${k === cur ? 'on' : ''}" style="--c:${g.col}"><span dir="auto">${esc(g.name)}</span><b>${NUM(g.score)}</b></div>`).join('')}</div>`;

  /* ---------- 2. a group's turn ---------- */
  function intro() {
    const tn = D.turns[D.t], g = D.groups[tn.g], r = Math.floor(D.t / D.groups.length);
    shell(`${board(tn.g)}<div class="dw-mid dw-turn" style="--c:${g.col}"><p class="dw-sub">${T(`الجولة ${NUM(r + 1)} من ${NUM(D.per)}`, `Round ${r + 1} of ${D.per}`)}</p><h2>${T('دور', 'Turn:')} <span dir="auto">${esc(g.name)}</span></h2>${g.lead ? `<p class="dw-lead">${T('القائد', 'Leader')}: <b dir="auto">${esc(g.lead)}</b></p>` : `<p class="dw-lead">${T('اتفقوا على من يقول الإجابة', 'Agree who will say the answer')}</p>`}
      <button type="button" class="dw-btn" data-main>${T('اعرض السؤال', 'Show the question')}</button></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => ask();
  }
  function ask() {
    const tn = D.turns[D.t], g = D.groups[tn.g], x = tn.x, dur = D.cfg.time || x.time || (x.type === 'tf' ? 15 : 30);
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
    const last = D.t >= D.turns.length - 1, endRound = (D.t + 1) % D.groups.length === 0;
    const f = el.querySelector('#dwFoot');
    f.innerHTML = `<div class="dw-res ${right ? 'ok' : 'no'}"><p>${right ? `<b>+${NUM(pts)}</b> ${T('لـ', 'to')}<span dir="auto">${esc(who.name)}</span>` : T('لم تُحتسب نقاط في هذا السؤال', 'No points for this one')}</p><button type="button" class="dw-btn" data-main>${last ? T('النتيجة النهائية', 'Final result') : endRound ? T('ترتيب الجولة', 'Round standings') : T('الدور التالي', 'Next turn')}</button></div>`;
    el.querySelector('.dw-board').outerHTML = board(D.groups.indexOf(st.g));
    f.querySelector('[data-main]').onclick = () => { D.t++; if (last) return final(); if (endRound) return standings(); intro(); };
  }

  /* ---------- 3. after each round, and at the end ---------- */
  const ranked = () => D.groups.slice().sort((a, b) => b.score - a.score || b.right - a.right);
  function standings() {
    const top = Math.max(1, ...D.groups.map(g => g.score)), r = D.t / D.groups.length;
    shell(`<div class="dw-mid dw-st"><p class="dw-sub">${T(`بعد الجولة ${NUM(r)} من ${NUM(D.per)}`, `After round ${r} of ${D.per}`)}</p><h2>${T('الترتيب', 'Standings')}</h2>
      <ol class="dw-bars">${ranked().map(g => `<li style="--c:${g.col};--w:${Math.max(4, 100 * g.score / top)}%"><span dir="auto">${esc(g.name)}</span><i></i><b>${NUM(g.score)}</b></li>`).join('')}</ol>
      <button type="button" class="dw-btn" data-main>${T('الجولة التالية', 'Next round')}</button></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = intro;
  }
  function final() {
    D.done = true; const R = ranked(), w = R[0], tie = R[1] && R[1].score === w.score; SND.win();
    shell(`<div class="dw-mid dw-fin"><div class="dw-conf" aria-hidden="true">${Array.from({ length: 36 }, (_, k) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--c:${COL[k % COL.length]}"></i>`).join('')}</div>
      <p class="dw-sub">${esc(D.title)}</p><h2>${tie ? T('تعادل في القمة!', 'A tie at the top!') : T('الفائز', 'The winner')}</h2><p class="dw-winner" style="--c:${w.col}" dir="auto">${esc(tie ? R.filter(g => g.score === w.score).map(g => g.name).join(T(' و', ' & ')) : w.name)}</p>
      <div class="dw-pod">${R.slice(0, 3).map((g, k) => `<div class="p${k + 1}" style="--c:${g.col}"><span dir="auto">${esc(g.name)}</span><b>${NUM(g.score)}</b><i>${NUM(k + 1)}</i></div>`).join('')}</div>
      <table class="dw-tab"><tr><th>${T('المجموعة', 'Group')}</th><th>${T('النقاط', 'Points')}</th><th>${T('إجابات صحيحة', 'Right')}</th><th>${T('سرقات', 'Steals')}</th></tr>${R.map(g => `<tr><td dir="auto"><i style="background:${g.col}"></i>${esc(g.name)}</td><td>${NUM(g.score)}</td><td>${NUM(g.right)}</td><td>${NUM(g.steals)}</td></tr>`).join('')}</table>
      <div class="dw-acts"><button type="button" class="dw-btn" data-main>${T('العب مرة ثانية', 'Play again')}</button><button type="button" class="dw-btn ghost" data-cert>${IC.print}${T('اطبع شهادة الفائز', 'Print the winner’s certificate')}</button></div></div>`, 'dw-in');
    el.querySelector('[data-main]').onclick = () => { D.turns = null; setup(); };
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
        <p class="dw-more">${T('تبي تكتب أسئلتك بالذكاء الاصطناعي أو من ملف؟ اكتبها في', 'Want to write questions with AI or from a file? Write them in')} <a href="/play/maydan/#build">${T('محرر ميدان', 'the Maydan editor')}</a>${T('، وتظهر هنا في «مسابقاتك».', ', and they appear here under “Your quizzes”.')}</p></div>`;
    root.querySelectorAll('.dw-pick').forEach(b => b.onclick = () => { const o = (b.dataset.src === 'm' ? mine : lib)[+b.dataset.k]; start({ title: o.z.title, qs: JSON.parse(JSON.stringify(o.z.qs)) }); });
    const ta = root.querySelector('#dwPaste'), go = root.querySelector('#dwGo'), fd = root.querySelector('#dwFound'); let got = [];
    ta.oninput = () => { got = window.QZParse ? QZParse.fromText(ta.value).filter(usable) : []; go.disabled = got.length < 2; fd.textContent = ta.value.trim() ? T(`وجدتُ ${NUM(got.length)} سؤالًا`, `Found ${got.length} questions`) : ''; };
    go.onclick = () => start({ title: T('مسابقة دوّارة', 'A Dawwara quiz'), qs: got });
  }

  const root = document.getElementById('dw'); if (root) home(root);
  return { start, close, usable };
})();

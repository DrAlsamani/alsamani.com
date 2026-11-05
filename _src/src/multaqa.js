/* alsamani.com — «ملتقى»: research days and conferences on a phone.
   Real people walk a numbered poster hall and talk by voice or video (av.js) beside a full-screen poster.
   Participants upload a PDF or image; judges score against a weighted rubric, remotely or during the stage show;
   supervisors run the stage; the organizer invites everyone and publishes the results. Data lives under mlt/$id. */
(function () {
  const root = document.getElementById('ml'); if (!root) return;
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => isAr() ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n);
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const store = { get(k, d) { try { const v = localStorage.getItem('ml.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ml.' + k, JSON.stringify(v)); } catch (e) {} } };
  const SV = d => `<svg class="ml-i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = {
    x: SV('<path d="M6 6l12 12M18 6 6 18"/>'), next: SV('<path d="M15 5l-7 7 7 7"/>'), prev: SV('<path d="M9 5l7 7-7 7"/>'),
    map: SV('<path d="M9 4 3 6.5v14L9 18l6 2.5 6-2.5V4l-6 2.5zM9 4v14M15 6.5v14"/>'), ppl: SV('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .5 3 2 3 5"/>'),
    mic: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'), out: SV('<path d="M10 17l-5-5 5-5M5 12h11M14 4h5v16h-5"/>'), micOff: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18"/>'), cam: SV('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>'), camOff: SV('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3M3 3l18 18"/>'), end: SV('<path d="M4 15c5-4 11-4 16 0l-2 3-3-2v-2c-2-.5-4-.5-6 0v2l-3 2z"/>'),
    check: SV('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), star: SV('<path d="m12 4 2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>'),
    up: SV('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'), link: SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    grid: SV('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>')
  };
  const COL = ['#2C3E8F', '#B9741F', '#2F7D6B', '#8A3F5E', '#3F6FA3', '#6B5AA6', '#7A7A2E', '#A2482C'];
  const rid = n => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => '23456789abcdefghjkmnpqrstuvwxyz'[x % 31]).join(''); };
  const copy = (t, msg) => { const ok = () => toast(msg || T('نُسخ', 'Copied')); if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok).catch(() => {}); };
  const script = src => new Promise((ok, no) => { if ($(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  function toast(m) { const host = $('#mlHall') || $('#mlStage') || document.body, t = document.createElement('div'); t.className = 'hl-toast'; t.style.position = host === document.body ? 'fixed' : ''; t.style.zIndex = 2000; t.textContent = m; host.appendChild(t); setTimeout(() => t.remove(), 3000); }

  /* ---------- firebase ---------- */
  let db, uid; const TS = () => firebase.database.ServerValue.TIMESTAMP;
  async function fb() { if (db) return; if (!firebase.apps.length) firebase.initializeApp(window.MD_CFG); const u = (await new Promise(r => { const o = firebase.auth().onAuthStateChanged(x => { o(); r(x); }); })) || (await firebase.auth().signInAnonymously()).user; uid = u.uid; db = firebase.database(); }
  const AI_V = '11.10.0', AI_KEY = '6Le4gQsuAAAAAE3jS1mLgG9B2XT8AucvEecF6Kp4', AI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-flash-latest'];
  let aiMk, aiModel;
  async function ai(parts) {
    if (!aiMk) {
      const u = n => `https://www.gstatic.com/firebasejs/${AI_V}/firebase-${n}.js`;
      const [{ initializeApp, getApps }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, VertexAIBackend }] = await Promise.all([import(u('app')), import(u('app-check')), import(u('ai'))]);
      const app = getApps().find(a => a.name === 'mdai') || initializeApp(window.MD_CFG, 'mdai');
      try { initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(AI_KEY), isTokenAutoRefreshEnabled: false }); } catch (e) {}
      const g = getAI(app, { backend: new VertexAIBackend('global') });
      aiMk = m => getGenerativeModel(g, { model: m, generationConfig: { temperature: 0.3 } });
    }
    for (let k = aiModel ? aiModel.k : 0; k < AI_MODELS.length; k++) {
      try { const m = aiModel && aiModel.k === k ? aiModel.m : aiMk(AI_MODELS[k]); const r = await m.generateContent(parts); aiModel = { k, m }; return r.response.text().trim(); }
      catch (e) { if (!/not.?found|404|not supported/i.test(String(e && e.message))) throw e; aiModel = null; }
    }
    throw new Error('no model');
  }

  /* ---------- accounts: a Google sign-in keeps a person's forums, files and role on any device ---------- */
  const hasAccount = () => { const u = firebase.auth().currentUser; return !!(u && !u.isAnonymous); };
  const G_ICON = '<svg class="ml-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
  async function signIn() {
    const a = firebase.auth(), p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try {
      if (a.currentUser && a.currentUser.isAnonymous) await a.currentUser.linkWithPopup(p); else await a.signInWithPopup(p);
    } catch (e) {
      if (e.code === 'auth/credential-already-in-use' && e.credential) { const moved = E.id ? await carryOut() : null; await a.signInWithCredential(e.credential); uid = a.currentUser.uid; if (moved) await carryIn(moved); }
      else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return false;
      else { toast(T('تعذر تسجيل الدخول.', 'Could not sign in.')); return false; }
    }
    uid = a.currentUser.uid; const dn = a.currentUser.displayName; if (dn && !name()) store.set('name', dn.slice(0, 30));
    return true;
  }
  /* this device was anonymous and the person already has an account: move their role and poster across */
  async function carryOut() {
    const get = p => R(p).once('value').then(s => s.val()).catch(() => null), o = { j: await get('judges/' + uid), p: await get('pres/' + uid), m: await get('mods/' + uid), it: await get('items/' + uid) };
    if (o.it) { o.th = await get('thumb/' + uid); o.fu = await get('full/' + uid); await R('items/' + uid).remove().catch(() => {}); await R('thumb/' + uid).remove().catch(() => {}); await R('full/' + uid).remove().catch(() => {}); }
    await R('here/' + uid).remove().catch(() => {}); return o;
  }
  async function carryIn(o) {
    if (o.j) await R('judges/' + uid).set(o.j).catch(() => {}); if (o.m) await R('mods/' + uid).set(o.m).catch(() => {}); if (o.p) await R('pres/' + uid).set(o.p).catch(() => {});
    if (o.it) { o.it.own = uid; await R('items/' + uid).set(o.it).catch(() => {}); if (o.th) await R('thumb/' + uid).set(o.th).catch(() => {}); if (o.fu) await R('full/' + uid).set(o.fu).catch(() => {}); }
  }
  function remember(ro) { if (hasAccount() && E.id && E.meta) db.ref('mltu/' + uid + '/' + E.id).set({ t: E.meta.t, ro, at: TS() }).catch(() => {}); }
  function accountBanner() {
    if (hasAccount()) return ''; return `<div class="ml-card ml-acc"><p class="ml-mut">${T('سجّل الدخول لتتمكن من الوصول إلى ملتقاك وملفاتك من أي جهاز.', 'Sign in to reach your forum and files from any device.')}</p><div><button class="ml-b" id="mlAcc">${G_ICON}${T('الدخول بحساب Google', 'Sign in with Google')}</button></div></div>`;
  }
  function bindAccount() { const b = $('#mlAcc'); if (b) b.onclick = async () => { if (await signIn()) { const h = parseHash(); if (h.e) { E.meta = null; enter({ e: h.e }); } else home(); } }; }

  /* ---------- presets ---------- */
  const RUB = {
    poster: () => [[T('السؤال البحثي وأهميته', 'Research question and its importance'), 15], [T('المنهج وسلامته', 'Method and its soundness'), 25], [T('النتائج وعرضها', 'Results and how they are shown'), 20], [T('التفسير والخلاصة', 'Interpretation and conclusion'), 15], [T('وضوح البوستر', 'Clarity of the poster'), 10], [T('الشرح والحوار', 'Explanation and discussion'), 15]],
    project: () => [[T('المشكلة وفهم المستفيد', 'The problem and the user'), 25], [T('الحل وابتكاره', 'The solution and its novelty'), 25], [T('الجدوى والتنفيذ', 'Feasibility and execution'), 20], [T('الأثر', 'Impact'), 15], [T('العرض', 'The pitch'), 15]]
  };

  /* ---------- results: weighted mean, and a per-judge z score so a harsh and a lenient judge count alike ---------- */
  function computeResults(items, scores, crit) {
    const W = crit.reduce((a, c) => a + (+c.w || 0), 0) || 1, per = {}, jz = {};
    const full = s => Array.isArray(s.c) ? s.c.length >= crit.length && crit.every((_, i) => s.c[i] >= 1) : crit.every((_, i) => s.c && s.c[i] >= 1);
    Object.keys(scores || {}).forEach(j => {
      const js = scores[j] || {}, vals = {};
      Object.keys(js).forEach(p => { const s = js[p]; if (!items[p] || !s || s.coi || !s.c || !full(s)) return; vals[p] = crit.reduce((a, c, i) => a + (+c.w || 0) * s.c[i], 0) / W / 5 * 100; });
      const v = Object.values(vals); if (!v.length) return;
      const m = v.reduce((a, b) => a + b, 0) / v.length, sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1)) : 0;
      jz[j] = { m, sd, n: v.length };
      Object.keys(vals).forEach(p => { (per[p] = per[p] || []).push({ j, s: vals[p], z: sd > 0 ? (vals[p] - m) / sd : 0, c: js[p].c, note: js[p].note || '' }); });
    });
    const top = crit.reduce((b, c, i) => (+c.w || 0) > (+crit[b].w || 0) ? i : b, 0);
    const judges = Object.keys(jz), rows = Object.keys(items).map(p => {
      const r = per[p] || [], k = r.length, mean = k ? r.reduce((a, x) => a + x.s, 0) / k : null, z = k ? r.reduce((a, x) => a + x.z, 0) / k : null;
      const sd = k > 1 ? Math.sqrt(r.reduce((a, x) => a + (x.s - mean) * (x.s - mean), 0) / (k - 1)) : 0;
      const crits = crit.map((_, i) => k ? r.reduce((a, x) => a + x.c[i], 0) / k : null);
      return { p, k, mean, z, sd, crits, tie: k ? crits[top] : 0, notes: r.map(x => x.note).filter(Boolean) };
    });
    const complete = judges.length > 0 && judges.every(j => jz[j].n === rows.filter(r => r.k).length) && rows.filter(r => r.k).every(r => r.k === judges.length);
    const key = complete ? 'mean' : 'z';
    rows.sort((a, b) => (b.k ? 1 : 0) - (a.k ? 1 : 0) || (b[key] - a[key]) || (b.mean - a.mean) || (b.tie - a.tie));
    let rk = 0; rows.forEach((r, i) => { if (!r.k) { r.rank = null; return; } const prev = rows[i - 1]; rk = prev && prev.k && Math.abs(prev[key] - r[key]) < 1e-9 && Math.abs(prev.mean - r.mean) < 1e-9 && Math.abs(prev.tie - r.tie) < 1e-9 ? rk : i + 1; r.rank = rk; });
    return { rows, method: key, judges: judges.length };
  }
  window.__mlCalc = computeResults;
  function balancedAssign(pids, jids, perPoster, owners) {
    const load = {}; jids.forEach(j => load[j] = 0); const out = {}; jids.forEach(j => out[j] = {});
    [...pids].sort(() => Math.random() - .5).forEach(p => {
      jids.filter(j => j !== owners[p]).sort((a, b) => load[a] - load[b] || Math.random() - .5).slice(0, perPoster).forEach(j => { out[j][p] = 1; load[j]++; });
    });
    return out;
  }
  window.__mlAssign = balancedAssign;
  window.__mlHeads = () => Object.values(H.peers).filter(w => w.vm).length;

  /* ---------- event state ---------- */
  const E = { id: null, meta: null, cfg: null, role: 'guest', code: {}, items: {}, order: [], numOf: {}, mine: {}, stage: {}, assign: {}, here: {}, offs: [] };
  const R = p => db.ref('mlt/' + E.id + (p ? '/' + p : ''));
  const isHost = () => E.meta && E.meta.host === uid;
  const name = () => store.get('name', '');
  const crit = () => (E.cfg && E.cfg.crit) || [];
  const tracks = () => (E.cfg && E.cfg.tracks) || [];
  const tcol = i => COL[(+i || 0) % COL.length];
  function listen(ref, ev, fn) { ref.on(ev, fn); E.offs.push(() => ref.off(ev, fn)); }
  function reorder() {
    const ids = Object.keys(E.items).sort((a, b) => (+E.items[a].tr || 0) - (+E.items[b].tr || 0) || (E.items[a].at || 0) - (E.items[b].at || 0) || (a < b ? -1 : 1));
    E.order = ids; E.numOf = {}; ids.forEach((p, i) => { E.numOf[p] = i + 1; });
  }
  const parseHash = () => { const o = {}; location.hash.slice(1).split('&').forEach(x => { const [k, v] = x.split('='); if (k) o[k] = decodeURIComponent(v || '1'); }); return o; };
  const base = () => location.origin + location.pathname;
  const linkFor = k => base() + '#e=' + E.id + (k || '');

  /* ---------- start ---------- */
  async function home() {
    await fb().catch(() => {}); let mine = store.get('mine', []);
    if (db && hasAccount()) { const v = await db.ref('mltu/' + uid).once('value').then(s => s.val()).catch(() => null); if (v) { const seen = {}; mine = Object.keys(v).map(id => ({ id, t: v[id].t, at: v[id].at })).sort((a, b) => (b.at || 0) - (a.at || 0)).concat(mine).filter(m => seen[m.id] ? false : (seen[m.id] = 1)); } }
    root.innerHTML = `<div class="ml-stack">${accountBanner()}
      <div class="ml-card"><h2>${T('الدخول إلى ملتقى', 'Join a forum')}</h2><div class="ml-row"><input class="ml-in ml-grow" id="mlCode" inputmode="numeric" maxlength="6" placeholder="${T('رمز الملتقى', 'Forum code')}" aria-label="${T('رمز الملتقى', 'Forum code')}"><button class="ml-b main" id="mlJoin">${T('دخول', 'Enter')}</button></div></div>
      <div class="ml-card"><h2>${T('إنشاء ملتقى', 'Create a forum')}</h2>
        <label class="ml-f"><span>${T('اسم الملتقى', 'Forum name')}</span><input id="mlT" maxlength="80" dir="auto"></label>
        <label class="ml-f"><span>${T('اسم المسؤول', 'Organizer’s name')}</span><input id="mlHn" maxlength="30" dir="auto" autocomplete="name" value="${esc(name())}"></label>
        <label class="ml-f"><span>${T('نوع المشاركات', 'Type of entries')}</span><select id="mlP"><option value="poster">${T('ملصقات علمية', 'Research posters')}</option><option value="project">${T('مشاريع ومسابقات', 'Projects and competitions')}</option></select></label>
        <div class="ml-row"><button class="ml-b main" id="mlNew">${T('إنشاء', 'Create')}</button><button class="ml-b" id="mlDemo">${T('إنشاء نموذج للتجربة', 'Create a sample')}</button></div></div>
      ${mine.length ? `<div class="ml-card"><h2>${T('ملتقياتك', 'Your forums')}</h2><ul class="ml-list">${mine.map(m => `<li><div class="ml-t"><a href="#e=${esc(m.id)}"><b dir="auto">${esc(m.t)}</b></a><small dir="ltr">${esc(m.id)}</small></div></li>`).join('')}</ul></div>` : ''}
    </div>`;
    $('#mlJoin').onclick = () => { const c = $('#mlCode').value.trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); if (/^\d{6}$/.test(c)) location.hash = 'e=' + c; else toast(T('الرمز من ستة أرقام', 'The code has six digits')); };
    $('#mlNew').onclick = () => create(false); $('#mlDemo').onclick = () => create(true); bindAccount();
  }
  async function create(demo) {
    const t = ($('#mlT').value.trim() || (demo ? T('نموذج ملتقى يوم البحث', 'Sample research day') : '')).slice(0, 80), n = $('#mlHn').value.trim().slice(0, 30);
    if (!t) return toast(T('يلزم اسم الملتقى', 'A forum name is required')); if (n.length < 2) return toast(T('يلزم اسم المسؤول', 'The organizer’s name is required'));
    store.set('name', n); await fb();
    if (!hasAccount() && !store.get('noacct', false) && !(await signIn())) return;
    const tr = demo ? ['الموهبة وتنميتها', 'الابتكار وريادة الأعمال', 'الذكاء الاصطناعي في التعليم'] : [T('المسار العام', 'General track')];
    let id, tries = 0; do { id = String(100000 + Math.floor(Math.random() * 900000)); tries++; } while ((await db.ref('mlt/' + id + '/meta').once('value')).exists() && tries < 6);
    await db.ref('mlt/' + id + '/meta').set({ host: uid, t, at: TS() });
    await db.ref('mlt/' + id).update({ sec: { pc: rid(6), jc: rid(6), mc: rid(6) }, cfg: { tracks: tr, crit: RUB[$('#mlP').value]().map(([n2, w]) => ({ n: n2, w })), perPoster: 3, stageSec: 180 } });
    const mine = store.get('mine', []); mine.unshift({ id, t }); store.set('mine', mine.slice(0, 12)); db.ref('mltu/' + uid + '/' + id).set({ t, ro: 'host', at: TS() }).catch(() => {});
    if (demo) { E.id = id; await seedDemo(); }
    location.hash = 'e=' + id;
  }

  /* ---------- enter ---------- */
  async function enter(h) {
    root.innerHTML = `<p class="ml-mut">${T('جارٍ التحميل…', 'Loading…')}</p>`;
    teardown(); await fb(); E.id = h.e;
    let meta; try { meta = (await R('meta').once('value')).val(); } catch (e) { root.innerHTML = `<div class="ml-card"><p>${T('تعذر الاتصال بالملتقى.', 'Could not reach the forum.')}</p></div>`; return; }
    if (!meta) { root.innerHTML = `<div class="ml-card"><p>${T('لا يوجد ملتقى بهذا الرمز.', 'No forum has this code.')}</p><div><a class="ml-b" href="#">${T('رجوع', 'Back')}</a></div></div>`; return; }
    E.meta = meta; E.cfg = (await R('cfg').once('value')).val() || {};
    listen(R('cfg'), 'value', s => { E.cfg = s.val() || {}; });
    listen(R('items'), 'value', s => { E.items = s.val() || {}; reorder(); if (H.on) hallItems(); if (view.refresh) view.refresh(); });
    listen(R('stage'), 'value', s => { E.stage = s.val() || {}; if (St.on) stageRender(); if (view.onStage) view.onStage(); else if (view.refresh) view.refresh(); stageNudge(); });
    listen(R('assign/' + uid), 'value', s => { E.assign = s.val() || {}; if (view.refresh) view.refresh(); });
    const has = p => R(p + '/' + uid).once('value').then(s => s.exists()).catch(() => false);
    const [isJ, isP, isM] = await Promise.all([has('judges'), has('pres'), has('mods')]);
    E.role = isHost() ? 'host' : isM ? 'mod' : isJ ? 'judge' : isP ? 'presenter' : 'guest'; E.isJudge = isJ;
    if (h.stage) return stageOpen();
    if (h.j || h.p || h.m || !name()) return nameForm(h);
    afterName(h);
  }
  function nameForm(h) {
    const title = h.j ? T('دخول المحكّم', 'Judge sign-in') : h.p ? T('دخول المشارك', 'Participant sign-in') : h.m ? T('دخول المشرف', 'Supervisor sign-in') : '';
    root.innerHTML = `<div class="ml-card"><h2 dir="auto">${esc(E.meta.t)}</h2>${title ? `<p class="ml-mut">${title}</p>` : ''}<label class="ml-f"><span>${T('الاسم', 'Name')}</span><input id="mlNm" maxlength="30" dir="auto" autocomplete="name" value="${esc(name())}"></label><div class="ml-row"><button class="ml-b main" id="mlGo">${T('متابعة', 'Continue')}</button>${title && !hasAccount() ? `<button class="ml-b" id="mlGg">${G_ICON}${T('الدخول بحساب Google', 'Sign in with Google')}</button>` : ''}</div></div>`;
    const gg = $('#mlGg'); if (gg) gg.onclick = async () => { if (await signIn()) { const i = $('#mlNm'); if (i && !i.value) i.value = name(); gg.remove(); } };
    $('#mlGo').onclick = () => { const v = $('#mlNm').value.trim().slice(0, 30); if (v.length < 2) return toast(T('يلزم الاسم', 'A name is required')); store.set('name', v); afterName(h); };
  }
  async function afterName(h) {
    try {
      if (h.j) { await R('judges/' + uid).set({ c: h.j, n: name(), at: TS() }); E.isJudge = true; if (!isHost()) E.role = 'judge'; }
      else if (h.p) { await R('pres/' + uid).set({ c: h.p, n: name(), at: TS() }); if (!isHost()) E.role = 'presenter'; }
      else if (h.m) { await R('mods/' + uid).set({ c: h.m, n: name(), at: TS() }); if (!isHost()) E.role = 'mod'; }
    } catch (e) { root.innerHTML = `<div class="ml-card"><p>${T('الرابط غير صالح. يُرجى طلب رابط جديد من المسؤول.', 'This link is not valid. Please ask the organizer for a new one.')}</p></div>`; return; }
    if (location.hash.includes('&')) history.replaceState(null, '', '#e=' + E.id);
    remember(E.isJudge && E.role !== 'host' ? 'judge' : E.role);
    if (h.j) return judgeView();
    ({ host: hostView, mod: modView, judge: judgeView, presenter: presenterView, guest: guestView }[E.role])();
  }
  function guestView() { root.innerHTML = `<div class="ml-card"><h2 dir="auto">${esc(E.meta.t)}</h2><div><button class="ml-b main" id="mlHallBtn">${T('دخول القاعة', 'Enter the hall')}</button></div></div>`; $('#mlHallBtn').onclick = () => openHall(); openHall(); }
  const view = { refresh: null, onStage: null };
  function teardown() { closeHall(); stageClose(); callEnd(); E.offs.forEach(f => f()); E.offs = []; view.refresh = view.onStage = null; E.items = {}; E.order = []; E.role = 'guest'; E.stage = {}; E.isJudge = false; }

  /* ---------- poster upload ---------- */
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  async function readPoster(file) {
    let src, text = '';
    if (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      await script(PDFJS + 'build/pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true }).promise, pg = await doc.getPage(1);
      const v0 = pg.getViewport({ scale: 1 }), sc = Math.min(4, 1800 / Math.max(v0.width, v0.height)), vp = pg.getViewport({ scale: sc });
      src = document.createElement('canvas'); src.width = vp.width; src.height = vp.height;
      await pg.render({ canvasContext: src.getContext('2d'), viewport: vp, background: '#fff' }).promise;
      try { text = (await pg.getTextContent()).items.map(t => t.str).join(' ').replace(/\s+/g, ' ').trim().slice(0, 6000); } catch (e) {}
    } else if (/^image\//.test(file.type)) {
      const img = await new Promise((ok, no) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
      src = document.createElement('canvas'); const k = Math.min(1, 1800 / Math.max(img.width, img.height)); src.width = img.width * k; src.height = img.height * k; const c = src.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, src.width, src.height); c.drawImage(img, 0, 0, src.width, src.height);
    } else throw new Error('type');
    return { full: shrink(src, 1800, 1100000), thumb: shrink(src, 720, 260000), ar: src.width / src.height, text };
  }
  function shrink(src, maxSide, maxLen) {
    let side = Math.min(maxSide, Math.max(src.width, src.height)), q = .82, out;
    for (let i = 0; i < 7; i++) {
      const k = side / Math.max(src.width, src.height), c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q); if (out.length <= maxLen) return out; if (q > .55) q -= .12; else side *= .8;
    }
    return out;
  }

  function posterForm(el, pid, done) {
    const it = E.items[pid] || {}; let up = null; const trs = tracks();
    el.innerHTML = `<div class="ml-card">
      <label class="ml-f"><span>${T('ملف الملصق: PDF أو صورة', 'Poster file: PDF or image')}</span><input type="file" id="pfF" accept="application/pdf,image/*"></label><div id="pfPrev"></div>
      <label class="ml-f"><span>${T('العنوان', 'Title')}</span><input id="pfT" maxlength="140" dir="auto" value="${esc(it.t || '')}"></label>
      <label class="ml-f"><span>${T('النتيجة الرئيسة في جملة', 'The main finding in one sentence')}</span><input id="pfFi" maxlength="140" dir="auto" value="${esc(it.fi || '')}"></label>
      ${trs.length > 1 ? `<label class="ml-f"><span>${T('المسار', 'Track')}</span><select id="pfTr">${trs.map((t, i) => `<option value="${i}" ${+it.tr === i ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}
      <details><summary class="ml-mut" style="cursor:pointer">${T('بيانات إضافية', 'More details')}</summary><div class="ml-stack" style="margin-top:10px">
        <label class="ml-f"><span>${T('اسم المشارك كما يُعرض', 'Participant’s name as shown')}</span><input id="pfA" maxlength="60" dir="auto" value="${esc(it.a || (pid === uid ? name() : ''))}"></label>
        <label class="ml-f"><span>${T('الملخص', 'Summary')}</span><textarea id="pfS" maxlength="1200" dir="auto" rows="4">${esc(it.s || '')}</textarea></label>
        <label class="ml-f"><span>${T('أوقات الوجود عند الملصق', 'Times at the poster')}</span><input id="pfW" maxlength="60" dir="auto" value="${esc(it.w || '')}"></label>
        <label class="ml-f"><span>${T('رابط العرض المسجل', 'Link to the recorded talk')}</span><input id="pfV" type="url" dir="ltr" maxlength="300" value="${esc(it.v || '')}"></label></div></details>
      <div class="ml-row"><button class="ml-b main" id="pfSave">${T('حفظ', 'Save')}</button><span class="ml-mut" id="pfMsg"></span></div></div>`;
    const msg = t => { $('#pfMsg', el).textContent = t; };
    if (it.has) R('thumb/' + pid).once('value').then(s => { const b = $('#pfPrev', el); if (s.val() && b && !up) b.innerHTML = `<img src="${s.val()}" alt="" style="max-height:220px;border:1px solid var(--line);border-radius:8px;display:block">`; }).catch(() => {});
    $('#pfF', el).onchange = async e => {
      const f = e.target.files[0]; if (!f) return; msg(T('جارٍ قراءة الملف…', 'Reading the file…'));
      try { up = await readPoster(f); $('#pfPrev', el).innerHTML = `<img src="${up.thumb}" alt="" style="max-height:260px;border:1px solid var(--line);border-radius:8px;display:block">`; msg(''); }
      catch (err) { up = null; return msg(T('تعذرت قراءة الملف.', 'Could not read the file.')); }
      if (up.text && (!$('#pfT', el).value || !$('#pfFi', el).value)) {
        msg(T('جارٍ استخراج البيانات من الملف…', 'Reading the details from the file…'));
        try { const r = await ai([`هذا نص ملصق علمي. أعد JSON فقط بالمفاتيح t (العنوان كما ورد) و fi (النتيجة الرئيسة في جملة واحدة بلغة الملصق، لا تتجاوز 20 كلمة) و s (ملخص في ثلاث جمل). لا تضف معلومة غير واردة في النص.\n\n${up.text}`]), j = JSON.parse(r.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
          if (j.t && !$('#pfT', el).value) $('#pfT', el).value = String(j.t).slice(0, 140); if (j.fi && !$('#pfFi', el).value) $('#pfFi', el).value = String(j.fi).slice(0, 140); if (j.s && !$('#pfS', el).value) $('#pfS', el).value = String(j.s).slice(0, 1200); msg(T('يُرجى مراجعة البيانات ثم الحفظ.', 'Please review the details, then save.')); }
        catch (err) { msg(''); }
      }
    };
    $('#pfSave', el).onclick = async () => {
      const t = $('#pfT', el).value.trim(); if (!t) return msg(T('يلزم العنوان', 'A title is required')); if (!up && !it.has) return msg(T('يلزم رفع الملف', 'Please upload the file'));
      const trS = $('#pfTr', el), rec = { t, fi: $('#pfFi', el).value.trim(), s: $('#pfS', el).value.trim(), a: $('#pfA', el).value.trim() || name(), tr: trS ? +trS.value || 0 : 0, v: $('#pfV', el).value.trim(), w: $('#pfW', el).value.trim(), at: it.at || TS(), own: it.own || (pid === uid ? uid : null), has: 1, ar: up ? up.ar : (it.ar || .71), txt: up ? up.text : (it.txt || '') };
      msg(T('جارٍ الحفظ…', 'Saving…')); $('#pfSave', el).disabled = true;
      try { await R('items/' + pid).set(rec); if (up) { await R('thumb/' + pid).set(up.thumb); await R('full/' + pid).set(up.full); } msg(T('تم الحفظ', 'Saved')); if (done) return done(); }
      catch (err) { msg(T('تعذر الحفظ؛ قد يكون حجم الملف كبيرًا.', 'Could not save; the file may be too large.')); }
      const b = $('#pfSave', el); if (b) b.disabled = false;
    };
  }

  /* ---------- participant ---------- */
  function presenterView() {
    let editing = false;
    const paint = () => {
      const it = E.items[uid];
      if (!it || editing) { root.innerHTML = `<div class="ml-stack"><h2 dir="auto">${esc(E.meta.t)}</h2><div id="pfBox"></div></div>`; posterForm($('#pfBox'), uid, () => { editing = false; paint(); }); return; }
      root.innerHTML = `<div class="ml-stack"><h2 dir="auto">${esc(E.meta.t)}</h2>${accountBanner()}<div class="ml-card"><div class="ml-row"><span class="ml-n" style="background:${tcol(it.tr)}">${num(E.numOf[uid] || '')}</span><div class="ml-t"><b dir="auto">${esc(it.t)}</b><small dir="auto">${esc(tracks()[it.tr] || '')}</small></div></div><div class="ml-row"><button class="ml-b main" id="pGo">${T('الوقوف عند ملصقي', 'Go to my poster')}</button><button class="ml-b" id="pEd">${T('تعديل', 'Edit')}</button></div><p class="ml-mut" id="pSt"></p></div><div class="ml-card" id="pFb" hidden></div></div>`;
      bindAccount(); scrollTo(0, 0); $('#pGo').onclick = () => openHall(uid); $('#pEd').onclick = () => { editing = true; paint(); };
      Promise.all([R('seen/' + uid).once('value').catch(() => null), R('notes/' + uid).once('value').catch(() => null)]).then(([a, b]) => { const e = $('#pSt'); if (e) e.textContent = T(`الزيارات ${num(a ? a.numChildren() : 0)} · المداخلات ${num(b ? b.numChildren() : 0)}`, `Visits ${a ? a.numChildren() : 0} · Comments ${b ? b.numChildren() : 0}`); });
      R('fb/' + uid).once('value').then(s => { const v = s.val(), b = $('#pFb'); if (v && v.notes && b) { b.hidden = false; b.innerHTML = `<h2>${T('ملاحظات المحكّمين', 'Judges’ notes')}</h2><ul class="hl-note">${Object.values(v.notes).map(n => `<li dir="auto">${esc(n)}</li>`).join('')}</ul>`; } }).catch(() => {});
    };
    view.refresh = () => { if (!editing && !$('input:focus')) paint(); }; paint();
  }

  /* ---------- judges ---------- */
  function scoreForm(el, pid) {
    const cs = crit(); let cur = { c: {}, note: '', coi: false };
    const paint = () => {
      el.innerHTML = `<div class="ml-rub"><p class="ml-mut">${T('١ ضعيف · ٢ مقبول · ٣ جيد · ٤ جيد جدًا · ٥ ممتاز', '1 poor · 2 fair · 3 good · 4 very good · 5 excellent')}</p>${cs.map((c, i) => `<div><h4><span dir="auto">${esc(c.n)}</span><small>${num(c.w)}%</small></h4><div class="ml-sc" role="group" aria-label="${esc(c.n)}">${[1, 2, 3, 4, 5].map(v => `<button data-i="${i}" data-v="${v}" aria-pressed="${(cur.c && cur.c[i]) === v}">${num(v)}</button>`).join('')}</div></div>`).join('')}
        <label class="ml-f"><span>${T('ملاحظة للمشارك', 'A note for the participant')}</span><textarea id="scN" rows="2" maxlength="500" dir="auto">${esc(cur.note || '')}</textarea></label>
        <label class="ml-row" style="font-size:.85rem"><input type="checkbox" id="scC" ${cur.coi ? 'checked' : ''}> ${T('يوجد تعارض مصالح', 'Conflict of interest')}</label><p class="ml-mut" id="scS"></p></div>`;
      const stat = () => { const done = cs.every((_, i) => cur.c && cur.c[i] >= 1), tot = cs.reduce((a, c, i) => a + (+c.w || 0) * ((cur.c && cur.c[i]) || 0), 0) / (cs.reduce((a, c) => a + (+c.w || 0), 0) || 1) / 5 * 100; $('#scS', el).textContent = cur.coi ? T('لن تُحتسب هذه الدرجة', 'This score will not count') : done ? T(`الدرجة ${num(Math.round(tot))} من ${num(100)}`, `Score: ${Math.round(tot)} of 100`) : ''; };
      const save = () => { cur.t = TS(); R('scores/' + uid + '/' + pid).set(cur).catch(() => toast(T('أُغلق باب التقييم', 'Judging is closed'))); stat(); };
      $$('[data-v]', el).forEach(b => b.onclick = () => { cur.c = Object.assign({}, cur.c, { [b.dataset.i]: +b.dataset.v }); $$(`[data-i="${b.dataset.i}"]`, el).forEach(x => x.setAttribute('aria-pressed', x === b)); save(); });
      $('#scN', el).onchange = e => { cur.note = e.target.value.trim(); save(); }; $('#scC', el).onchange = e => { cur.coi = e.target.checked; save(); }; stat();
    };
    R('scores/' + uid + '/' + pid).once('value').then(s => { const v = s.val(); if (v) { cur = v; if (Array.isArray(cur.c)) cur.c = Object.assign({}, cur.c); } paint(); }).catch(paint);
  }
  function judgeView() {
    let my = {}, sel = null, lastCur = null;
    const seed = p => { let h = 7; (uid + p).split('').forEach(c => h = (h * 31 + c.charCodeAt(0)) >>> 0); return h; };
    const done = p => { const s = my[p]; return s && (s.coi || crit().every((_, i) => s.c && s.c[i] >= 1)); };
    const pool = () => { const a = Object.keys(E.assign).filter(p => E.items[p]); return (a.length ? a : E.order.filter(p => E.items[p].own !== uid)).sort((x, y) => seed(x) - seed(y)); };
    const refreshMine = () => R('scores/' + uid).once('value').then(s => { my = s.val() || {}; });
    const paint = () => {
      const ids = pool();
      root.innerHTML = `<div class="ml-stack"><div class="ml-row"><h2 class="ml-grow" dir="auto">${esc(E.meta.t)}</h2><button class="ml-b" id="jHall">${T('دخول القاعة', 'Enter the hall')}</button></div>${accountBanner()}<div class="ml-card"><p class="ml-mut">${T(`أنجزت ${num(ids.filter(done).length)} من ${num(ids.length)}`, `${ids.filter(done).length} of ${ids.length} done`)}</p><ul class="ml-list">${ids.map(p => `<li data-p="${esc(p)}" style="cursor:pointer"><span class="ml-n" style="background:${tcol(E.items[p].tr)}">${num(E.numOf[p])}</span><div class="ml-t"><b dir="auto">${esc(E.items[p].t)}</b><small dir="auto">${esc(E.items[p].a || '')}</small></div>${done(p) ? IC.check : ''}</li>`).join('') || `<li class="ml-mut">${T('لا توجد مشاركات بعد', 'No entries yet')}</li>`}</ul></div></div>`;
      bindAccount(); $('#jHall').onclick = () => openHall(); $$('[data-p]').forEach(l => l.onclick = () => one(l.dataset.p));
    };
    const one = p => {
      sel = p; const it = E.items[p]; if (!it) { sel = null; return paint(); }
      const online = it.own && it.own !== uid;
      root.innerHTML = `<div class="ml-stack"><div class="ml-row"><button class="ml-b" id="jBack">${T('القائمة', 'List')}</button><span class="ml-grow"></span>${online ? `<button class="ml-b" id="jTalk">${IC.mic}${T('محادثة المشارك', 'Talk to the participant')}</button>` : ''}</div><div class="ml-card"><div class="ml-row"><span class="ml-n" style="background:${tcol(it.tr)}">${num(E.numOf[p])}</span><div class="ml-t"><b dir="auto">${esc(it.t)}</b><small dir="auto">${esc(it.a || '')}</small></div></div><div class="hl-img" id="jImg"></div>${it.s ? `<p dir="auto" style="margin:0">${esc(it.s)}</p>` : ''}</div><div class="ml-card" id="jForm"></div><div><button class="ml-b main" id="jNext">${T('التالي', 'Next')}</button></div></div>`;
      imgInto($('#jImg'), p); scoreForm($('#jForm'), p); scrollTo(0, 0);
      $('#jBack').onclick = () => { sel = null; refreshMine().then(paint); };
      const t = $('#jTalk'); if (t) t.onclick = () => { const room = 'p_' + it.own; joinRoom(room); pingTo(it.own, { k: 'c', room }); };
      $('#jNext').onclick = () => refreshMine().then(() => { const nx = pool().find(q => q !== p && !done(q)); if (nx) one(nx); else { sel = null; paint(); toast(T('اكتمل تقييمك', 'Your scoring is complete')); } });
    };
    view.refresh = () => { if (!sel) paint(); };
    view.onStage = () => { const st = E.stage || {}; if (st.open && st.cur && st.cur !== lastCur && E.items[st.cur] && !H.on) { lastCur = st.cur; refreshMine().then(() => one(st.cur)); } };
    refreshMine().then(() => { paint(); view.onStage(); }).catch(paint);
  }
  function imgInto(el, p) { R('full/' + p).once('value').then(s => { if (s.val() && el.isConnected) { el.innerHTML = `<img alt="${T('الملصق', 'Poster')}" src="${s.val()}">`; $('img', el).onclick = () => el.classList.toggle('z'); } }).catch(() => {}); }
  let lastStageCur = null;
  function stageNudge() { const st = E.stage || {}; if (st.cur === lastStageCur) return; lastStageCur = st.cur; const it = st.cur && E.items[st.cur]; if (it && it.own === uid && !St.on) incoming({ k: 'stage' }); if (H.scr) drawScreen(); }

  /* ---------- organizer and supervisor ---------- */
  const stageList = () => { const st = E.stage || {}; return `<div class="ml-card"><div class="ml-row"><a class="ml-b main" href="${esc(linkFor('&stage=1'))}" target="_blank" rel="noopener">${T('فتح شاشة المسرح', 'Open the stage screen')}</a>${st.cur ? `<button class="ml-b" id="hOpen">${st.open ? T('إغلاق التقييم', 'Close judging') : T('فتح التقييم', 'Open judging')}</button>` : ''}</div><ul class="ml-list">${E.order.map(p => `<li><span class="ml-n" style="background:${tcol(E.items[p].tr)}">${num(E.numOf[p])}</span><div class="ml-t"><b dir="auto">${esc(E.items[p].t)}</b><small dir="auto">${esc(E.items[p].a || '')}</small></div><button class="ml-b sm ${st.cur === p ? 'main' : ''}" data-show="${esc(p)}">${st.cur === p ? T('معروض', 'Showing') : T('عرض', 'Show')}</button></li>`).join('') || `<li class="ml-mut">${T('لا توجد مشاركات بعد', 'No entries yet')}</li>`}</ul></div>`; };
  const stageListBind = () => { $$('[data-show]').forEach(b => b.onclick = () => R('stage').update({ cur: b.dataset.show, open: true, mode: 'show', until: Date.now() + (+E.cfg.stageSec || 180) * 1000 })); const o = $('#hOpen'); if (o) o.onclick = () => R('stage/open').set(!E.stage.open); };
  const peopleList = here => { const pr = E.order.filter(p => E.items[p].own), on = pr.filter(p => here[E.items[p].own]); return `<div class="ml-card"><p class="ml-mut">${T(`المشاركون الموجودون ${num(on.length)} من ${num(pr.length)}`, `Participants present: ${on.length} of ${pr.length}`)}</p><ul class="ml-list">${E.order.map(p => { const o = E.items[p].own && here[E.items[p].own]; return `<li><span class="ml-n" style="background:${tcol(E.items[p].tr)}">${num(E.numOf[p])}</span><div class="ml-t"><b dir="auto">${esc(E.items[p].a || E.items[p].t)}</b><small><span class="ml-dot ${o ? '' : 'off'}"></span>${o ? T('موجود', 'Present') : T('غير موجود', 'Absent')}</small></div></li>`; }).join('')}</ul></div>`; };
  function modView() {
    let tab = 'stage', here = {};
    root.innerHTML = `<div class="ml-stack"><div class="ml-row"><h2 class="ml-grow" dir="auto">${esc(E.meta.t)}</h2><button class="ml-b main" id="mHall">${T('دخول القاعة', 'Enter the hall')}</button></div>${accountBanner()}<div class="ml-tabs"><button data-t="stage" aria-selected="true">${T('المسرح', 'Stage')}</button><button data-t="foll" aria-selected="false">${T('المتابعة', 'Follow-up')}</button></div><div id="mBody" class="ml-stack"></div></div>`;
    bindAccount(); $('#mHall').onclick = () => openHall();
    const paint = () => { $('#mBody').innerHTML = tab === 'stage' ? stageList() : peopleList(here); if (tab === 'stage') stageListBind(); };
    $$('.ml-tabs [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; $$('.ml-tabs [data-t]').forEach(x => x.setAttribute('aria-selected', x === b)); paint(); });
    view.refresh = paint; listen(R('here'), 'value', s => { here = s.val() || {}; if (tab !== 'stage') paint(); }); paint();
  }
  function hostView() {
    let tab = store.get('htab', 'links'), scores = {}, judges = {}, votes = {}, sec = {}, here = {}, editing = null;
    const tabs = [['links', T('الدعوات', 'Invitations')], ['items', T('المشاركات', 'Entries')], ['judge', T('التحكيم', 'Judging')], ['stage', T('المسرح', 'Stage')], ['res', T('النتائج', 'Results')]];
    root.innerHTML = `<div class="ml-stack"><div class="ml-row"><div class="ml-grow"><h2 dir="auto">${esc(E.meta.t)}</h2><small class="ml-mut" id="hSum"></small></div><button class="ml-b main" id="hHall">${T('دخول القاعة', 'Enter the hall')}</button></div>${accountBanner()}<div class="ml-tabs" role="tablist">${tabs.map(t => `<button role="tab" data-t="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('')}</div><div id="hBody" class="ml-stack"></div></div>`;
    bindAccount(); $('#hHall').onclick = () => openHall();
    $$('.ml-tabs [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; editing = null; store.set('htab', tab); $$('.ml-tabs [data-t]').forEach(x => x.setAttribute('aria-selected', x === b)); paint(true); });
    const P = {
      links() {
        const row = (t, u) => `<li><div class="ml-t"><b>${t}</b></div><button class="ml-b sm" data-qrb="${esc(u)}" aria-label="${T('رمز الاستجابة', 'QR code')}">${IC.grid}</button><button class="ml-b sm" data-copy="${esc(u)}">${IC.link}${T('نسخ', 'Copy')}</button></li>`;
        return `<div class="ml-card"><p class="ml-mut" dir="ltr" style="text-align:start">${T('الرمز', 'Code')} ${esc(E.id)}</p><ul class="ml-list">${row(T('الزوار', 'Visitors'), linkFor(''))}${row(T('المشاركون', 'Participants'), linkFor('&p=' + sec.pc))}${row(T('المحكّمون', 'Judges'), linkFor('&j=' + sec.jc))}${row(T('المشرفون', 'Supervisors'), linkFor('&m=' + sec.mc))}${row(T('شاشة المسرح', 'Stage screen'), linkFor('&stage=1'))}</ul><div id="hQr" style="justify-self:center"></div></div><div><button class="ml-b sm bad" id="hDelE">${T('حذف الملتقى', 'Delete this forum')}</button></div>`;
      },
      items() {
        if (editing) return `<div><button class="ml-b" id="hEBack">${T('رجوع', 'Back')}</button></div><div id="hEdit"></div>`;
        return `<div class="ml-row"><button class="ml-b" id="hAdd">${T('إضافة مشاركة', 'Add an entry')}</button></div><div class="ml-card"><ul class="ml-list">${E.order.map(p => `<li><span class="ml-n" style="background:${tcol(E.items[p].tr)}">${num(E.numOf[p])}</span><div class="ml-t"><b dir="auto">${esc(E.items[p].t)}</b><small dir="auto">${esc(E.items[p].a || '')}</small></div><button class="ml-b sm" data-ed="${esc(p)}">${T('تعديل', 'Edit')}</button><button class="ml-b sm bad" data-del="${esc(p)}" aria-label="${T('حذف', 'Delete')}">${IC.x}</button></li>`).join('') || `<li class="ml-mut">${T('لم ترد مشاركات بعد.', 'No entries yet.')}</li>`}</ul></div><details class="ml-card"><summary style="cursor:pointer">${T('المسارات', 'Tracks')}</summary><label class="ml-f" style="margin-top:10px"><span>${T('مسار في كل سطر', 'One track per line')}</span><textarea id="hTr" rows="4" dir="auto">${esc(tracks().join('\n'))}</textarea></label><div><button class="ml-b sm main" id="hTrS">${T('حفظ', 'Save')}</button></div></details>`;
      },
      judge() {
        const cs = crit(), sum = cs.reduce((a, c) => a + (+c.w || 0), 0), jids = Object.keys(judges), cnt = j => Object.values(scores[j] || {}).filter(s => s.coi || cs.every((_, i) => s.c && s.c[i] >= 1)).length;
        return `<div class="ml-card"><h2>${T('المعايير', 'Criteria')}</h2><div style="display:grid;gap:8px">${cs.map((c, i) => `<div class="ml-crit"><input class="ml-in" dir="auto" data-cn="${i}" maxlength="60" value="${esc(c.n)}" aria-label="${T('المعيار', 'Criterion')}"><input class="ml-in" type="number" min="0" max="100" data-cw="${i}" value="${+c.w}" aria-label="${T('الوزن', 'Weight')}"><button class="ml-b sm bad" data-crx="${i}" aria-label="${T('حذف', 'Delete')}">${IC.x}</button></div>`).join('')}</div><div class="ml-row"><button class="ml-b sm" id="hCrA">${T('إضافة معيار', 'Add a criterion')}</button><button class="ml-b sm main" id="hCrS">${T('حفظ', 'Save')}</button><span class="ml-mut">${T('مجموع الأوزان', 'Total weight')} ${num(sum)}%</span></div></div>
        <div class="ml-card"><h2>${T('المحكّمون', 'Judges')} (${num(jids.length)})</h2><ul class="ml-list">${jids.map(j => `<li><div class="ml-t"><b dir="auto">${esc(judges[j].n)}</b></div><small class="ml-mut">${T(`أنجز ${num(cnt(j))}`, `${cnt(j)} done`)}</small></li>`).join('') || `<li class="ml-mut">${T('لم ينضم محكّمون بعد.', 'No judges yet.')}</li>`}</ul><div class="ml-row"><label class="ml-row"><span class="ml-mut">${T('عدد المحكّمين لكل مشاركة', 'Judges per entry')}</span><input class="ml-in" style="width:70px" id="hPer" type="number" min="1" max="9" value="${+E.cfg.perPoster || 3}"></label><button class="ml-b sm" id="hDist" ${jids.length ? '' : 'disabled'}>${T('توزيع متوازن', 'Distribute evenly')}</button></div><label class="ml-row" style="font-size:.9rem"><input type="checkbox" id="hLock" ${E.cfg.lock ? 'checked' : ''}> ${T('إغلاق باب التقييم', 'Close judging')}</label><label class="ml-row" style="font-size:.9rem"><input type="checkbox" id="hAud" ${E.cfg.aud ? 'checked' : ''}> ${T('إتاحة تصويت الجمهور', 'Allow audience voting')}</label></div>`;
      },
      stage() { return stageList() + `<div class="ml-card"><label class="ml-row"><span class="ml-mut">${T('مدة كل مشاركة بالثواني', 'Seconds per entry')}</span><input class="ml-in" style="width:90px" id="hSec" type="number" min="30" max="1800" value="${+E.cfg.stageSec || 180}"></label></div>` + peopleList(here); },
      res() {
        const r = computeResults(E.items, scores, crit()), tv = {}; Object.values(votes).forEach(v => { tv[v] = (tv[v] || 0) + 1; });
        return `<div class="ml-card"><p class="ml-mut">${r.method === 'z' ? T('رُتّبت المشاركات بعد معايرة درجات كل محكّم بالدرجة المعيارية؛ لأن المحكّمين لم يقيّموا المشاركات نفسها.', 'Ranked after standardising each judge’s scores, because judges did not score the same entries.') : T('رُتّبت المشاركات بالمتوسط الموزون.', 'Ranked by the weighted mean.')}</p><div class="ml-tbl"><table><thead><tr><th>${T('الترتيب', 'Rank')}</th><th>${T('الرقم', 'No.')}</th><th>${T('المشاركة', 'Entry')}</th><th>${T('المحكّمون', 'Judges')}</th><th>${T('الدرجة', 'Score')}</th>${r.method === 'z' ? '<th>z</th>' : ''}<th>${T('الانحراف', 'SD')}</th>${E.cfg.aud ? `<th>${T('الجمهور', 'Audience')}</th>` : ''}</tr></thead><tbody>${r.rows.map(x => `<tr><td class="num">${x.rank ? num(x.rank) : '—'}</td><td class="num">${num(E.numOf[x.p])}</td><td class="wr" dir="auto">${esc(E.items[x.p].t)}</td><td class="num">${num(x.k)}</td><td class="num">${x.k ? num(x.mean.toFixed(1)) : '—'}</td>${r.method === 'z' ? `<td class="num" dir="ltr">${x.k ? x.z.toFixed(2) : '—'}</td>` : ''}<td class="num">${x.k > 1 ? num(x.sd.toFixed(1)) : '—'}</td>${E.cfg.aud ? `<td class="num">${num(tv[x.p] || 0)}</td>` : ''}</tr>`).join('')}</tbody></table></div><div class="ml-row"><button class="ml-b sm" id="hCsv">${T('تنزيل CSV', 'Download CSV')}</button><button class="ml-b sm" id="hFb">${T('إرسال الملاحظات إلى المشاركين', 'Send notes to participants')}</button><button class="ml-b sm main" id="hPub">${E.stage && E.stage.mode === 'res' ? T('إخفاء النتائج', 'Hide results') : T('إعلان المراكز الأولى', 'Announce the winners')}</button></div></div>`;
      }
    };
    const bind = () => {
      $$('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
      $$('[data-qrb]').forEach(b => b.onclick = () => { const h = $('#hQr'); if (!window.qrcode || !h) return; const q = qrcode(0, 'M'); q.addData(b.dataset.qrb); q.make(); h.innerHTML = q.createSvgTag({ scalable: true, margin: 2 }); h.firstElementChild.style.cssText = 'width:200px;height:200px;background:#fff;border-radius:8px;display:block'; });
      const dl = $('#hDelE'); if (dl) { let armed = false; dl.onclick = () => { if (!armed) { armed = true; dl.textContent = T('تأكيد الحذف النهائي', 'Confirm permanent deletion'); return; } const id = E.id; store.set('mine', store.get('mine', []).filter(m => m.id !== id)); R().remove().then(() => { E.id = null; location.hash = ''; }); }; }
      const add = $('#hAdd'); if (add) add.onclick = () => { editing = R('items').push().key; paint(true); };
      $$('[data-ed]').forEach(b => b.onclick = () => { editing = b.dataset.ed; paint(true); });
      $$('[data-del]').forEach(b => { let armed = false; b.onclick = () => { if (!armed) { armed = true; b.textContent = T('تأكيد', 'Confirm'); return; } const p = b.dataset.del; R().update({ ['items/' + p]: null, ['thumb/' + p]: null, ['full/' + p]: null }); }; });
      if (editing && $('#hEdit')) { posterForm($('#hEdit'), editing, () => { editing = null; paint(true); }); $('#hEBack').onclick = () => { editing = null; paint(true); }; }
      const trS = $('#hTrS'); if (trS) trS.onclick = () => { const v = $('#hTr').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8); if (v.length) R('cfg/tracks').set(v).then(() => toast(T('تم الحفظ', 'Saved'))); };
      const crS = $('#hCrS');
      if (crS) {
        const read = () => $$('[data-cn]').map((x, i) => ({ n: x.value.trim().slice(0, 60), w: Math.max(0, +$(`[data-cw="${i}"]`).value || 0) }));
        crS.onclick = () => { const v = read().filter(c => c.n); if (v.length) R('cfg/crit').set(v).then(() => toast(T('تم الحفظ', 'Saved'))); };
        $('#hCrA').onclick = () => { E.cfg.crit = read().concat([{ n: '', w: 10 }]); paint(true); };
        $$('[data-crx]').forEach(b => b.onclick = () => { const v = read(); v.splice(+b.dataset.crx, 1); E.cfg.crit = v; paint(true); });
        $('#hDist').onclick = () => { const per = Math.max(1, +$('#hPer').value || 3), own = {}; E.order.forEach(p => { own[p] = E.items[p].own; }); R().update({ 'cfg/perPoster': per, assign: balancedAssign(E.order, Object.keys(judges), per, own) }).then(() => toast(T('تم التوزيع', 'Distributed'))); };
        $('#hLock').onchange = e => R('cfg/lock').set(e.target.checked ? true : null); $('#hAud').onchange = e => R('cfg/aud').set(e.target.checked ? true : null);
      }
      if ($('[data-show]') || $('#hOpen')) stageListBind();
      const sc = $('#hSec'); if (sc) sc.onchange = e => R('cfg/stageSec').set(Math.max(30, +e.target.value || 180));
      const csv = $('#hCsv'); if (csv) csv.onclick = () => {
        const r = computeResults(E.items, scores, crit()), head = ['rank', 'no', 'title', 'participant', 'judges', 'mean', 'z', 'sd'].concat(crit().map(c => c.n)), rows = r.rows.map(x => [x.rank || '', E.numOf[x.p], E.items[x.p].t, E.items[x.p].a || '', x.k, x.k ? x.mean.toFixed(2) : '', x.k ? x.z.toFixed(3) : '', x.k > 1 ? x.sd.toFixed(2) : ''].concat(x.crits.map(c => c == null ? '' : c.toFixed(2))));
        const q = v => { let s = String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }, blob = new Blob(['﻿' + [head].concat(rows).map(l => l.map(q).join(',')).join('\n')], { type: 'text/csv' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'multaqa-' + E.id + '.csv'; a.click();
      };
      const fbB = $('#hFb'); if (fbB) fbB.onclick = () => { const r = computeResults(E.items, scores, crit()), up = {}; r.rows.forEach(x => { const own = E.items[x.p].own || x.p; if (x.notes.length) up[own] = { notes: x.notes }; }); R('fb').set(up).then(() => toast(T('أُرسلت دون ذكر أسماء المحكّمين', 'Sent without judges’ names'))); };
      const pub = $('#hPub'); if (pub) pub.onclick = () => {
        if (E.stage && E.stage.mode === 'res') return R('stage/mode').set('show').then(() => paint(true));
        const r = computeResults(E.items, scores, crit()), top = r.rows.filter(x => x.rank && x.rank <= 3).slice(0, 5).map(x => ({ rank: x.rank, n: E.numOf[x.p], t: E.items[x.p].t, a: E.items[x.p].a || '' }));
        if (!top.length) return toast(T('لا توجد درجات بعد', 'No scores yet')); R().update({ results: { top, at: TS() }, 'stage/mode': 'res', 'stage/open': false }).then(() => paint(true));
      };
    };
    const paint = force => {
      const ae = document.activeElement, s = $('#hSum'); if (s) s.textContent = T(`${num(E.order.length)} مشاركة · ${num(Object.keys(judges).length)} محكّمين · ${num(Object.keys(here).length)} في القاعة`, `${E.order.length} entries · ${Object.keys(judges).length} judges · ${Object.keys(here).length} in the hall`);
      if (!$('#hBody')) return; if (!force && (editing || (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && $('#hBody').contains(ae)))) return; if (!force && tab === 'links') return;
      $('#hBody').innerHTML = P[tab](); bind();
    };
    view.refresh = () => paint();
    R('sec').once('value').then(s => { sec = s.val() || {}; paint(true); });
    script('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js').catch(() => {});
    listen(R('scores'), 'value', s => { scores = s.val() || {}; if (tab === 'res' || tab === 'judge') paint(); });
    listen(R('judges'), 'value', s => { judges = s.val() || {}; paint(); });
    listen(R('votes'), 'value', s => { votes = s.val() || {}; if (tab === 'res') paint(); });
    let hereT = 0; listen(R('here'), 'value', s => { here = s.val() || {}; clearTimeout(hereT); hereT = setTimeout(() => paint(tab !== 'stage' ? false : false), 800); });
  }

  /* ---------- stage screen ---------- */
  const St = { on: false, el: null, tick: null, img: {}, scores: {}, judges: {} };
  const canRun = () => E.role === 'host' || E.role === 'mod';
  function stageOpen() {
    St.on = true; document.body.classList.add('ml-on'); const el = document.createElement('div'); el.id = 'mlStage'; document.body.appendChild(el); St.el = el;
    if (isHost()) { listen(R('scores'), 'value', s => { St.scores = s.val() || {}; stageRender(); }); listen(R('judges'), 'value', s => { St.judges = s.val() || {}; stageRender(); }); }
    listen(R('results'), 'value', s => { St.res = s.val(); stageRender(); });
    St.tick = setInterval(() => { const t = $('#stClock'); if (t && E.stage.until) t.textContent = clock(Math.max(0, E.stage.until - Date.now())); }, 500);
    stageRender();
  }
  const clock = ms => { const s = Math.ceil(ms / 1000); return num(Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2)); };
  function stageClose() { if (!St.on) return; clearInterval(St.tick); St.on = false; if (St.el) St.el.remove(); document.body.classList.remove('ml-on'); }
  function stageRender() {
    const el = St.el; if (!el) return; const st = E.stage || {}; el.className = '';
    const ctl = extra => canRun() ? `<div class="st-ctl">${extra}</div>` : '';
    if (st.mode === 'res' && St.res && St.res.top) {
      el.className = 'res';
      el.innerHTML = `<h1>${T('النتائج', 'Results')}</h1><div class="st-rank">${St.res.top.slice().sort((a, b) => a.rank - b.rank).map(x => `<div><i>${num(x.rank)}</i><span><b dir="auto">${esc(x.t)}</b><br><small dir="auto">${esc(x.a)}</small></span></div>`).join('')}</div>` + ctl(`<button class="ml-b" data-m="show">${T('العودة إلى العرض', 'Back to the show')}</button>`);
      $$('[data-m]', el).forEach(b => b.onclick = () => R('stage/mode').set('show')); return;
    }
    const p = st.cur, it = p && E.items[p];
    if (!it) { el.innerHTML = `<div class="st-img"><div style="text-align:center"><h1 dir="auto">${esc(E.meta.t)}</h1><p class="st-fin">${T(`${num(E.order.length)} مشاركة`, `${E.order.length} entries`)}</p></div></div><div class="st-side"><div id="stQr" style="width:220px;background:#fff;border-radius:10px"></div><code dir="ltr" style="word-break:break-all;font-size:.75em">${esc(linkFor(''))}</code></div>` + ctl(`<button class="ml-b main" data-go="0">${T('بدء العرض', 'Start')}</button>`); stageBind(); script('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js').then(() => { const b = $('#stQr', el); if (b && window.qrcode) { const q = qrcode(0, 'M'); q.addData(linkFor('')); q.make(); b.innerHTML = q.createSvgTag({ scalable: true, margin: 2 }); } }).catch(() => {}); return; }
    const jn = Object.keys(St.judges).length, sn = Object.values(St.scores).filter(js => js && js[p] && (js[p].coi || crit().every((_, i) => js[p].c && js[p].c[i] >= 1))).length, i = E.order.indexOf(p);
    el.innerHTML = `<div class="st-img"><img id="stImg" alt=""></div><div class="st-side"><div class="st-num">${num(E.numOf[p])}</div><h1 dir="auto">${esc(it.t)}</h1>${it.fi ? `<p class="st-fin" dir="auto">${esc(it.fi)}</p>` : ''}${it.s ? `<p class="st-fin" dir="auto" style="font-size:.9em">${esc(it.s)}</p>` : ''}<p class="st-au" dir="auto">${esc(it.a || '')}</p><div class="st-state"><div class="st-big" id="stClock">${st.until ? clock(Math.max(0, st.until - Date.now())) : ''}</div><div>${st.open ? (isHost() ? T(`أنجز التقييم ${num(sn)} من ${num(jn)}`, `${sn} of ${jn} judges done`) : T('التقييم مفتوح', 'Judging is open')) : T('التقييم مغلق', 'Judging is closed')}</div></div></div>` +
      ctl(`<button class="ml-b" data-go="${i - 1}" ${i < 1 ? 'disabled' : ''}>${T('السابق', 'Previous')}</button><button class="ml-b" data-tog="1">${st.open ? T('إغلاق التقييم', 'Close judging') : T('فتح التقييم', 'Open judging')}</button><button class="ml-b" data-voice="1">${IC.mic}${T('الصوت', 'Sound')}</button><button class="ml-b main" data-go="${i + 1}" ${i >= E.order.length - 1 ? 'disabled' : ''}>${T('التالي', 'Next')}</button>`);
    const img = $('#stImg', el), set = u => { if (img.isConnected) img.src = u; };
    if (St.img[p]) set(St.img[p]); else R('full/' + p).once('value').then(s => { if (s.val()) { St.img = { [p]: s.val() }; set(s.val()); } }).catch(() => {});
    stageBind();
  }
  function stageBind() {
    const el = St.el;
    $$('[data-go]', el).forEach(b => b.onclick = () => { const p = E.order[+b.dataset.go]; if (p) R('stage').update({ cur: p, open: true, mode: 'show', until: Date.now() + (+E.cfg.stageSec || 180) * 1000 }); });
    $$('[data-tog]', el).forEach(b => b.onclick = () => R('stage/open').set(!E.stage.open));
    $$('[data-voice]', el).forEach(b => b.onclick = () => { if (!name()) store.set('name', T('المسؤول', 'Organizer')); joinRoom('stage'); });
  }

  /* ---------- conversation: one room, one small control bar, cameras beside the poster ---------- */
  const Call = { room: null, t: null, tiles: {}, note: '' };
  function joinRoom(room, video) {
    if (!window.AV) return; $$('.hl-card').forEach(c => c.remove());
    if (Call.room !== room) { if (Call.room) AV.detach(); Call.room = room; const ref = R('talk/' + room); ref.child('on').set(true).catch(() => {}); AV.attach({ ref, uid, name: name() || T('زائر', 'Visitor'), host: false, hostUid: 'none' }); }
    Promise.resolve(AV.join()).then(() => { const v = AV.view(); if (video && v && v.joined && !v.cam) AV.toggleCam(); });
    if (H.on) R('here/' + uid + '/c').set(room).catch(() => {});
    if (!Call.t) Call.t = setInterval(callSync, 300); callSync();
  }
  function callEnd() {
    if (window.AV && Call.room) { try { AV.detach(); } catch (e) {} }
    Call.room = null; clearInterval(Call.t); Call.t = null; Object.values(Call.tiles).forEach(t => t.el.remove()); Call.tiles = {}; const b = $('#mlCall'), w = $('#mlTiles'); if (b) b.remove(); if (w) w.remove();
    if (H.on) { R('here/' + uid + '/c').remove().catch(() => {}); Object.values(H.peers).forEach(headOff); }
    document.body.classList.remove('ml-incall'); if (H.open && H.open.p) viewBar();
  }
  function tile(key, label, me) { const el = document.createElement('div'); el.className = 'ml-tile' + (me ? ' me' : ''); el.innerHTML = `<video playsinline autoplay muted hidden></video><i aria-hidden="true">${esc(String(label || '؟').charAt(0))}</i><span dir="auto">${esc(me ? T('أنت', 'You') : label)}</span>`; return { el, key, track: null }; }
  function setTrack(t, tr) { if (t.track === tr) return; t.track = tr; const v = $('video', t.el); v.hidden = !tr; if (tr) { v.srcObject = new MediaStream([tr]); v.play().catch(() => {}); } else v.srcObject = null; }
  function callSync() {
    const v = window.AV && AV.view(); if (!v || !Call.room) return;
    let bar = $('#mlCall'), wrap = $('#mlTiles');
    if (!bar) { bar = document.createElement('div'); bar.id = 'mlCall'; bar.innerHTML = `<button id="clM" aria-label="${T('الميكروفون', 'Microphone')}"></button><button id="clC" aria-label="${T('الكاميرا', 'Camera')}"></button><button id="clE" class="end" aria-label="${T('إنهاء', 'End')}">${IC.end}</button>`; document.body.appendChild(bar); $('#clM').onclick = () => AV.toggleMic(); $('#clC').onclick = () => AV.toggleCam(); $('#clE').onclick = callEnd; wrap = document.createElement('div'); wrap.id = 'mlTiles'; document.body.appendChild(wrap); document.body.classList.add('ml-incall'); if (H.open && H.open.p) viewBar(); }
    const m = $('#clM'), c = $('#clC'), mk = (v.mic ? 'y' : 'n'), ck = (v.cam ? 'y' : 'n'); if (m.dataset.s !== mk) { m.dataset.s = mk; m.innerHTML = v.mic ? IC.mic : IC.micOff; m.className = v.mic ? '' : 'off'; } if (c.dataset.s !== ck) { c.dataset.s = ck; c.innerHTML = v.cam ? IC.cam : IC.camOff; c.className = v.cam ? 'on' : ''; }
    const want = {}; v.people.forEach(p => { want[p.u] = p; });
    Object.keys(Call.tiles).forEach(k => { if (k !== '_me' && !want[k]) { Call.tiles[k].el.remove(); delete Call.tiles[k]; } });
    v.people.forEach(p => { let t = Call.tiles[p.u]; if (!t) { t = Call.tiles[p.u] = tile(p.u, p.n); wrap.appendChild(t.el); } setTrack(t, p.v ? p.track : null); t.el.classList.toggle('talk', !!v.talk[p.u]); });
    if (v.cam && v.me) { if (!Call.tiles._me) { Call.tiles._me = tile('_me', name(), true); wrap.appendChild(Call.tiles._me.el); } setTrack(Call.tiles._me, v.me); } else if (Call.tiles._me) { Call.tiles._me.el.remove(); delete Call.tiles._me; }
    if (v.note && v.note !== Call.note) toast(v.note); Call.note = v.note;
    if (H.on) Object.values(H.peers).forEach(w => { const p = want[w.u]; headSet(w, p && p.v ? p.track : null); });
  }
  /* a person's camera, when on, takes the place of their head in the hall */
  function headSet(w, tr) {
    if (w.vt === tr) return; headOff(w); if (!tr) return; w.vt = tr; const v = document.createElement('video'); v.playsInline = true; v.muted = true; v.autoplay = true; v.srcObject = new MediaStream([tr]); v.play().catch(() => {});
    const tx = new THREE.VideoTexture(v); tx.encoding = THREE.sRGBEncoding; const m = new THREE.Mesh(new THREE.CircleGeometry(.3, 28), new THREE.MeshBasicMaterial({ map: tx })); m.position.y = 1.68; const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .33, 28), new THREE.MeshBasicMaterial({ color: '#2F7D5B' })); m.add(ring); ring.position.z = -.001; w.g.add(m); w.head.visible = false; w.vm = m; w.vel = v;
  }
  function headOff(w) { if (w.vm) { w.g.remove(w.vm); w.vm.material.map.dispose(); w.vm.material.dispose(); w.vm = null; } if (w.vel) { w.vel.srcObject = null; w.vel = null; } w.vt = null; if (w.head) w.head.visible = true; }
  /* ---------- the hall: state ---------- */
  const H = { on: false, el: null, r3: null, scene: null, cam: null, L: null, pos: { x: 0, z: 4 }, yaw: 0, pitch: -.03, route: [], goal: null, stand: null, stY: 0, stP: 0, open: null, focus: null, keys: {}, stick: { x: 0, y: 0 }, peers: {}, solids: [], pick: [], visited: {}, sig: '', room: null, dwell: { p: null, t: 0 }, poster: {}, sent: '', tick: 0, net: 0 };
  const CELL = .5;
  const hit = (x, z, m = .34) => { for (const b of H.solids) if (x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m) return true; return false; };

  /* layout: rows of boards, numbered from the entrance, right to left in Arabic reading order */
  function layout() {
    const N = Math.max(E.order.length, 1), cols = N <= 3 ? 3 : N <= 8 ? 4 : N <= 30 ? 5 : 6, rows = Math.ceil(N / cols), GX = 6.4, GZ = 7.6;
    const W = cols * GX + 3, zIn = 5.5, z0row = -1.2, zBack = z0row - (rows - 1) * GZ - 6.2;
    const L = { cols, rows, GX, GZ, x0: -W / 2, x1: W / 2, zIn, zBack, spots: {}, rowsInfo: [], th: { x0: -8, x1: 8, z0: zBack - 15, z1: zBack } };
    E.order.forEach((p, i) => {
      const r = Math.floor(i / cols), c = i % cols, x = ((cols - 1) / 2 - c) * GX, z = z0row - r * GZ;
      L.spots[p] = { x, z, nx: 0, nz: 1, sx: x, sz: z + 3.6, r, c };
      const ri = L.rowsInfo[r] = L.rowsInfo[r] || { z, from: i + 1, to: i + 1, tr: E.items[p].tr }; ri.to = i + 1;
    });
    return L;
  }
  function solidsFor(L) {
    const s = [], box = (a, b, c, d) => s.push({ x0: a, x1: b, z0: c, z1: d }), far = 600;
    box(-far, L.x0, -far, far); box(L.x1, far, -far, far); box(-far, far, L.zIn + 1.5, far);
    box(-far, -2, L.zBack - .3, L.zBack); box(2, far, L.zBack - .3, L.zBack);
    box(-far, L.th.x0, -far, L.zBack - .3); box(L.th.x1, far, -far, L.zBack - .3); box(-far, far, -far, L.th.z0);
    Object.values(L.spots).forEach(p => box(p.x - 1.55, p.x + 1.55, p.z - .16, p.z + .16));
    [-1, 1].forEach(si => { for (let r = 0; r < 5; r++) { const z = L.th.z0 + 6 + r * 1.7, a = si > 0 ? 1.5 : -6.7; box(a, a + 5.2, z - .35, z + .35); } });
    return s;
  }
  function gridFor(L) {
    const G = { x0: L.x0 - .5, z0: L.th.z0 - .5, s: CELL, w: Math.ceil((L.x1 - L.x0 + 1) / CELL), h: Math.ceil((L.zIn + 2 - L.th.z0 + 1) / CELL) };
    G.b = new Uint8Array(G.w * G.h); for (let j = 0; j < G.h; j++) for (let i = 0; i < G.w; i++) G.b[j * G.w + i] = hit(G.x0 + i * CELL, G.z0 + j * CELL, .42) ? 1 : 0;
    return G;
  }
  function path(a, b) {
    const G = H.G, cell = (x, z) => [Math.max(0, Math.min(G.w - 1, Math.round((x - G.x0) / G.s))), Math.max(0, Math.min(G.h - 1, Math.round((z - G.z0) / G.s)))];
    const free = c => { if (!G.b[c[1] * G.w + c[0]]) return c; for (let r = 1; r < 9; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = c[0] + di, j = c[1] + dj; if (i >= 0 && j >= 0 && i < G.w && j < G.h && !G.b[j * G.w + i]) return [i, j]; } return c; };
    const s = free(cell(a.x, a.z)), e = free(cell(b.x, b.z)), si = s[1] * G.w + s[0], ei = e[1] * G.w + e[0], n = G.w * G.h;
    const g = new Float32Array(n).fill(1e9), from = new Int32Array(n).fill(-1), done = new Uint8Array(n), open = [si]; g[si] = 0;
    const h = i => Math.hypot(i % G.w - e[0], Math.floor(i / G.w) - e[1]), dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (open.length) {
      let bi = 0, bv = 1e9; for (let k = 0; k < open.length; k++) { const v = g[open[k]] + h(open[k]); if (v < bv) { bv = v; bi = k; } }
      const cur = open.splice(bi, 1)[0]; if (cur === ei) break; if (done[cur]) continue; done[cur] = 1; const cx = cur % G.w, cz = Math.floor(cur / G.w);
      for (const d of dirs) { const nx = cx + d[0], nz = cz + d[1]; if (nx < 0 || nz < 0 || nx >= G.w || nz >= G.h) continue; const ni = nz * G.w + nx; if (G.b[ni] || done[ni]) continue; if (d[2] > 1 && (G.b[cz * G.w + nx] || G.b[nz * G.w + cx])) continue; const ng = g[cur] + d[2]; if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; open.push(ni); } }
    }
    if (from[ei] < 0 && si !== ei) return [{ x: b.x, z: b.z }];
    const pts = []; for (let c = ei; c >= 0; c = from[c]) pts.unshift({ x: G.x0 + (c % G.w) * G.s, z: G.z0 + Math.floor(c / G.w) * G.s }); pts.push({ x: b.x, z: b.z }); pts[0] = { x: a.x, z: a.z };
    const los = (p, q) => { const d = Math.hypot(q.x - p.x, q.z - p.z), k = Math.ceil(d / .2); for (let i = 1; i < k; i++) { const t = i / k; if (hit(p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t, .38)) return false; } return true; };
    const out = []; let i = 0; while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !los(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  }

  /* ---------- the hall: drawing ---------- */
  const F = '"IBM Plex Sans Arabic",system-ui,sans-serif';
  const mat = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const canvasTex = cv => { const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
  function txt(s, w, h, o = {}) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); if (o.bg) { c.fillStyle = o.bg; if (c.roundRect) { c.beginPath(); c.roundRect(0, 0, w, h, o.r || 0); c.fill(); } else c.fillRect(0, 0, w, h); } c.direction = isAr() ? 'rtl' : 'ltr'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = o.fg || '#fff'; let sz = o.s || h * .5; c.font = `${o.w || 600} ${sz}px ${F}`; while (c.measureText(s).width > w - 24 && sz > 12) { sz -= 2; c.font = `${o.w || 600} ${sz}px ${F}`; } c.fillText(s, w / 2, h / 2 + 2); return canvasTex(cv); }
  function plane(w, h, x, y, z, ry, rx, m) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, 0, 'YXZ'); H.scene.add(o); return o; }
  function addBox(w, h, d, x, y, z, m) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); H.scene.add(o); return o; }
  function wrapText(c, s, x, y, mw, lh, max) { const ws = String(s).split(/\s+/); let l = '', n = 0; for (const w of ws) { const t = l ? l + ' ' + w : w; if (c.measureText(t).width > mw && l) { c.fillText(l, x, y); y += lh; n++; l = w; if (max && n >= max) return y; } else l = t; } if (l) { c.fillText(l, x, y); y += lh; } return y; }
  function placeholder(p) { const it = E.items[p], cv = document.createElement('canvas'); cv.width = 256; cv.height = 358; const c = cv.getContext('2d'); c.fillStyle = '#FBFBF8'; c.fillRect(0, 0, 256, 358); c.fillStyle = tcol(it.tr); c.fillRect(0, 0, 256, 120); c.direction = isAr() ? 'rtl' : 'ltr'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = `700 72px ${F}`; c.fillText(num(E.numOf[p]), 128, 85); c.fillStyle = '#16201F'; c.font = `600 22px ${F}`; wrapText(c, it.t, 128, 170, 216, 32, 4); return canvasTex(cv); }
  function plaque(p) { const v = H.visited[p], cv = document.createElement('canvas'); cv.width = 160; cv.height = 96; const c = cv.getContext('2d'), col = tcol(E.items[p].tr); c.fillStyle = v ? col : '#FFFFFF'; if (c.roundRect) { c.beginPath(); c.roundRect(2, 2, 156, 92, 16); c.fill(); if (!v) { c.lineWidth = 5; c.strokeStyle = col; c.stroke(); } } else c.fillRect(0, 0, 160, 96); c.fillStyle = v ? '#fff' : col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 62px ${F}`; c.fillText(num(E.numOf[p]), v ? 100 : 80, 52); if (v) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(18, 50); c.lineTo(32, 64); c.lineTo(56, 34); c.stroke(); } return canvasTex(cv); }
  function najdi() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#E9E1D0'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#B0793A'; for (let x = 0; x < 256; x += 32) { c.beginPath(); c.moveTo(x + 4, 56); c.lineTo(x + 16, 16); c.lineTo(x + 28, 56); c.closePath(); c.fill(); } c.fillStyle = '#8E6029'; c.fillRect(0, 58, 256, 3); c.fillRect(0, 4, 256, 3); const t = canvasTex(cv); t.wrapS = THREE.RepeatWrapping; return t; }
  function floorT(rx, ry) { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d'); c.fillStyle = '#CFC6B4'; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${120 + Math.random() * 90 | 0},${105 + Math.random() * 80 | 0},${85 + Math.random() * 70 | 0},${.08 + Math.random() * .16})`; c.beginPath(); c.arc(Math.random() * 512, Math.random() * 512, Math.random() * 2.6, 0, 7); c.fill(); } c.strokeStyle = 'rgba(90,80,62,.28)'; c.lineWidth = 2; c.strokeRect(0, 0, 512, 512); const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
  function buildScene() {
    const L = H.L = layout(); H.solids = solidsFor(L); H.G = gridFor(L); H.pick = []; H.poster = {};
    if (H.scene) { H.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); }
    H.scene = new THREE.Scene(); H.scene.background = new THREE.Color('#E7DFCF'); H.scene.fog = new THREE.Fog('#E7DFCF', 26, 74);
    H.scene.add(new THREE.HemisphereLight('#FFF7E8', '#9C8F78', .95)); const sun = new THREE.DirectionalLight('#FFE9C7', .5); sun.position.set(10, 16, 6); H.scene.add(sun);
    const wall = mat('#EDE6D6'), wall2 = mat('#E2D8C4'), ceil = mat('#F4EFE4'), frame = mat('#2A2F36'), Hh = 4.6, W = L.x1 - L.x0, zM = (L.zIn + 1.5 + L.zBack) / 2, D = L.zIn + 1.5 - L.zBack, cx = (L.x0 + L.x1) / 2;
    const fx = Math.max(W, 16), fz = D + 15, fzM = (L.zIn + 1.5 + L.th.z0) / 2;
    const fl = plane(fx, fz, cx, 0, fzM, 0, -Math.PI / 2, mat('#fff', { map: floorT(fx / 2, fz / 2) })); H.floor = fl;
    plane(fx, fz, cx, Hh, fzM, 0, Math.PI / 2, ceil);
    plane(W, Hh, cx, Hh / 2, L.zIn + 1.5, Math.PI, 0, wall); plane(D, Hh, L.x0, Hh / 2, zM, Math.PI / 2, 0, wall); plane(D, Hh, L.x1, Hh / 2, zM, -Math.PI / 2, 0, wall);
    const sw = (W - 4) / 2; plane(sw, Hh, L.x0 + sw / 2, Hh / 2, L.zBack, 0, 0, wall); plane(sw, Hh, L.x1 - sw / 2, Hh / 2, L.zBack, 0, 0, wall); plane(4, Hh - 3.2, 0, 3.2 + (Hh - 3.2) / 2, L.zBack, 0, 0, wall);
    plane(16, Hh, 0, Hh / 2, L.th.z0, 0, 0, wall2); plane(15, Hh, -8, Hh / 2, (L.th.z0 + L.zBack) / 2, Math.PI / 2, 0, wall2); plane(15, Hh, 8, Hh / 2, (L.th.z0 + L.zBack) / 2, -Math.PI / 2, 0, wall2);
    plane(6, Hh, -5, Hh / 2, L.zBack - .02, Math.PI, 0, wall2); plane(6, Hh, 5, Hh / 2, L.zBack - .02, Math.PI, 0, wall2); plane(4, Hh - 3.2, 0, 3.2 + (Hh - 3.2) / 2, L.zBack - .02, Math.PI, 0, wall2);
    const nt = najdi(), fr = (len, x, z, ry) => { const t = nt.clone(); t.needsUpdate = true; t.repeat.set(Math.round(len / 1.8), 1); plane(len, .5, x, 4.1, z, ry, 0, mat('#fff', { map: t })); };
    fr(W, cx, L.zIn + 1.49, Math.PI); fr(D, L.x0 + .01, zM, Math.PI / 2); fr(D, L.x1 - .01, zM, -Math.PI / 2); fr(sw, L.x0 + sw / 2, L.zBack + .01, 0); fr(sw, L.x1 - sw / 2, L.zBack + .01, 0);
    // windows along one wall only: a constant landmark that says which side you are on
    const cvg = document.createElement('canvas'); cvg.width = cvg.height = 128; const gc = cvg.getContext('2d'), gr = gc.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,205,.85)'); gr.addColorStop(1, 'rgba(255,240,205,0)'); gc.fillStyle = gr; gc.fillRect(0, 0, 128, 128); const gm = new THREE.MeshBasicMaterial({ map: canvasTex(cvg), transparent: true, depthWrite: false, opacity: .5 }), sky = new THREE.MeshBasicMaterial({ color: '#EAF3FA' });
    for (let z = L.zIn - 3; z > L.zBack + 2; z -= 7) { plane(3.2, 2.7, L.x1 - .03, 2.3, z, -Math.PI / 2, 0, sky); addBox(.06, 2.9, .1, L.x1 - .08, 2.3, z, frame); addBox(.06, .08, 3.3, L.x1 - .08, 2.3, z, frame); plane(9, 4, L.x1 - 4, .012, z, 0, -Math.PI / 2, gm); }
    const lit = new THREE.MeshBasicMaterial({ color: '#FFFBF0' }); for (let c = 0; c < L.cols; c++) plane(.5, D - 2, ((L.cols - 1) / 2 - c) * L.GX, Hh - .01, zM, 0, Math.PI / 2, lit);
    plane(Math.min(9, W - 2), 1.3, 0, 3.1, L.zIn + 1.47, Math.PI, 0, new THREE.MeshBasicMaterial({ map: txt(E.meta.t, 1024, 150, { bg: '#2C3E8F', s: 62 }) }));
    plane(3.9, .7, 0, 3.6, L.zBack + .03, 0, 0, new THREE.MeshBasicMaterial({ map: txt(T('المسرح', 'Stage'), 640, 118, { bg: '#16201F', s: 58 }) }));
    plane(1.3, 3.2, 0, .014, L.zBack + 1.6, 0, -Math.PI / 2, new THREE.MeshLambertMaterial({ color: '#16201F', transparent: true, opacity: .55 }));
    // every row: a hanging sign with its number range and track, and a coloured aisle
    L.rowsInfo.forEach((ri, r) => {
      const col = tcol(ri.tr), lab = `${num(ri.from)}–${num(ri.to)}  ·  ${tracks()[ri.tr] || ''}`, zs = ri.z + 3.2;
      plane(Math.min(W - 4, 7.5), .56, 0, 4, zs, 0, 0, new THREE.MeshBasicMaterial({ map: txt(lab, 1024, 78, { bg: col, s: 46 }), side: THREE.DoubleSide }));
      addBox(.03, .4, .03, -3, 4.42, zs, frame); addBox(.03, .4, .03, 3, 4.42, zs, frame);
      plane(W - 1, .3, cx, .012, ri.z + 2, 0, -Math.PI / 2, new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: .72 }));
    });
    // boards and posters
    const bm = mat('#FAF8F2');
    E.order.forEach(p => {
      const s = L.spots[p], it = E.items[p];
      addBox(3.1, 3.3, .32, s.x, 1.65, s.z, bm); addBox(3.2, .1, .42, s.x, .05, s.z, frame); addBox(3.2, .1, .42, s.x, 3.33, s.z, frame);
      const ar = +it.ar || .71, maxW = 2.7, maxH = 2.5; let pw = maxH * ar, ph = maxH; if (pw > maxW) { pw = maxW; ph = maxW / ar; }
      const fm = plane(pw + .08, ph + .08, s.x, 1.7, s.z + .17, 0, 0, new THREE.MeshBasicMaterial({ color: '#20252C' }));
      const tex = placeholder(p), pm = plane(pw, ph, s.x, 1.7, s.z + .175, 0, 0, new THREE.MeshBasicMaterial({ map: tex }));
      pm.userData.p = p; H.pick.push(pm);
      const pq = plane(.8, .48, s.x, 3.63, s.z + .18, 0, 0, new THREE.MeshBasicMaterial({ map: plaque(p), transparent: true }));
      pq.userData.p = p; H.pick.push(pq);
      plane(5, 5, s.x, .015, s.z + 2, 0, -Math.PI / 2, gm);
      H.poster[p] = { pm, fm, pq, real: false, loading: false };
    });
    // the stage room
    const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 512; H.scrC = scr; const sm = plane(10, 5, 0, 2.6, L.th.z0 + .05, 0, 0, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(scr) })); sm.material.map.encoding = THREE.sRGBEncoding; sm.userData.stage = 1; H.pick.push(sm); H.scr = sm; drawScreen();
    addBox(16, .2, 3.2, 0, .1, L.th.z0 + 1.6, mat('#6B4C2E'));
    const sg = new THREE.BoxGeometry(.5, .45, .5), bg = new THREE.BoxGeometry(.5, .5, .1), seats = new THREE.InstancedMesh(sg, mat('#2C3E8F'), 60), backs = new THREE.InstancedMesh(bg, mat('#222C63'), 60), d = new THREE.Object3D(); let k = 0;
    [-1, 1].forEach(si => { for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) { const x = si > 0 ? 1.75 + i * .92 : -6.45 + i * .92, z = L.th.z0 + 6 + r * 1.7; d.position.set(x, .3, z); d.updateMatrix(); seats.setMatrixAt(k, d.matrix); d.position.set(x, .72, z + .26); d.updateMatrix(); backs.setMatrixAt(k, d.matrix); k++; } });
    H.scene.add(seats); H.scene.add(backs);
    const dg = new THREE.CircleGeometry(.09, 12); dg.rotateX(-Math.PI / 2); H.routeM = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ color: '#2C3E8F', transparent: true, opacity: .75 }), 200); H.routeM.count = 0; H.routeM.position.y = .02; H.scene.add(H.routeM); H.dummy = new THREE.Object3D();
    Object.values(H.peers).forEach(w => { w.g = null; }); Object.keys(H.peers).forEach(u => { const d = H.peers[u].d; delete H.peers[u]; peerUpdate(u, d); });
    H.tick = 0; H.texT = 99;
  }
  function drawScreen() {
    const cv = H.scrC; if (!cv) return; const c = cv.getContext('2d'), st = E.stage || {}, it = st.cur && E.items[st.cur];
    c.fillStyle = '#10162A'; c.fillRect(0, 0, 1024, 512); c.direction = isAr() ? 'rtl' : 'ltr'; c.textAlign = isAr() ? 'right' : 'left'; const X = isAr() ? 960 : 64;
    c.fillStyle = '#E9C48F'; c.font = `500 34px ${F}`; c.fillText(it ? T(`على المسرح: ${num(E.numOf[st.cur])}`, `On stage: ${E.numOf[st.cur]}`) : T('المسرح', 'Stage'), X, 80);
    c.fillStyle = '#fff'; c.font = `700 58px ${F}`; wrapText(c, it ? it.t : E.meta.t, X, 170, 890, 78, 3);
    if (it) { c.fillStyle = '#9CA6BA'; c.font = `400 30px ${F}`; c.fillText(it.a || '', X, 450); }
    if (H.scr) H.scr.material.map.needsUpdate = true;
  }
  /* keep real poster images only for the nearest boards so older phones stay smooth */
  function texUpdate() {
    if (!H.L) return; const near = E.order.map(p => { const s = H.L.spots[p]; return [p, Math.hypot(s.sx - H.pos.x, s.sz - H.pos.z)]; }).sort((a, b) => a[1] - b[1]);
    near.forEach(([p], i) => {
      const P = H.poster[p]; if (!P) return;
      if (i < 12 && !P.real && !P.loading) {
        P.loading = true; R('thumb/' + p).once('value').then(s => {
          P.loading = false; const u = s.val(); if (!u || H.poster[p] !== P) return; const img = new Image(); img.onload = () => { if (H.poster[p] !== P) return; const t = new THREE.Texture(img); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.needsUpdate = true; if (P.pm.material.map) P.pm.material.map.dispose(); P.pm.material.map = t; P.pm.material.needsUpdate = true; P.real = true; }; img.src = u;
        }).catch(() => { P.loading = false; });
      } else if (i >= 18 && P.real) { P.pm.material.map.dispose(); P.pm.material.map = placeholder(p); P.pm.material.needsUpdate = true; P.real = false; }
    });
  }

  /* ---------- real people ---------- */
  let bodyG, headG, shG, shM;
  const ROLE = () => ({ host: ['#16201F', T('المسؤول', 'Organizer')], mod: ['#6B5AA6', T('مشرف', 'Supervisor')], judge: ['#B9741F', T('محكّم', 'Judge')], presenter: ['#2C3E8F', T('مشارك', 'Participant')], guest: ['#F5F2EA', ''] });
  function pawn(col) {
    if (!bodyG) { bodyG = new THREE.LatheGeometry([[0, 0], [.27, 0], [.25, .5], [.21, 1.05], [.17, 1.36], [.09, 1.46], [0, 1.48]].map(p => new THREE.Vector2(p[0], p[1])), 14); headG = new THREE.SphereGeometry(.15, 14, 10); shG = new THREE.CircleGeometry(.42, 16); shG.rotateX(-Math.PI / 2); shM = new THREE.MeshBasicMaterial({ color: '#3C3224', transparent: true, opacity: .2, depthWrite: false }); }
    const g = new THREE.Group(); g.add(new THREE.Mesh(bodyG, mat(col))); const h = new THREE.Mesh(headG, mat('#D9BC98')); h.position.y = 1.6; g.add(h); const s = new THREE.Mesh(shG, shM); s.position.y = .012; g.add(s);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2.4, 8), new THREE.MeshBasicMaterial({ visible: false })); hb.position.y = 1.2; g.add(hb);
    H.scene.add(g); return { g, hb, head: h };
  }
  function nameSprite(w, s) { if (w.lb) { w.g.remove(w.lb); w.lb.material.map.dispose(); w.lb.material.dispose(); } const t = txt(s, 400, 76, { bg: 'rgba(22,32,31,.82)', r: 38, s: 40, w: 500 }), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(1.25, .24, 1); sp.position.y = 2.25; w.g.add(sp); w.lb = sp; }
  function say(w, s) { if (w.bb) { w.g.remove(w.bb); w.bb = null; } if (!s) return; const cv = document.createElement('canvas'), len = Math.min(s.length, 28); cv.width = 70 + len * 26; cv.height = 84; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.beginPath(); if (c.roundRect) c.roundRect(0, 0, cv.width, 70, 30); else c.rect(0, 0, cv.width, 70); c.fill(); c.beginPath(); c.moveTo(cv.width / 2 - 12, 68); c.lineTo(cv.width / 2, 84); c.lineTo(cv.width / 2 + 12, 68); c.fill(); c.fillStyle = '#16201F'; c.direction = isAr() ? 'rtl' : 'ltr'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `500 32px ${F}`; c.fillText(s.slice(0, 28), cv.width / 2, 36); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(cv), transparent: true, depthTest: false })); sp.scale.set(cv.width / 230, cv.height / 230, 1); sp.position.y = 2.72; w.g.add(sp); w.bb = sp; w.bbT = 5; }
  function peerUpdate(u, d) {
    if (u === uid || !d || typeof d.x !== 'number' || !H.scene) return; let w = H.peers[u];
    if (!w) { const r = ROLE(), ro = r[d.ro] ? d.ro : 'guest'; w = H.peers[u] = Object.assign(pawn(r[ro][0]), { u, nm: '', ro }); w.g.position.set(d.x, 0, d.z); w.hb.userData.person = u; H.pick.push(w.hb); }
    w.d = d; w.tx = d.x; w.tz = d.z; w.tr = (d.r || 0) + Math.PI; const n = String(d.n || '').slice(0, 30); if (n !== w.nm) { w.nm = n; nameSprite(w, n || T('زائر', 'Visitor')); }
    const sa = d.s && d.s.x && Date.now() - (d.s.t || 0) < 9000 ? String(d.s.x) : ''; if (sa && sa !== w.said) { w.said = sa; say(w, sa); } if (!sa) w.said = '';
    if (E.items[uid] && d.p === uid && w.atMine !== true) { w.atMine = true; if (!(Call.room && d.c === Call.room)) visitorCard(u, d); } else if (d.p !== uid) w.atMine = false;
  }
  function peerGone(u) { const w = H.peers[u]; if (!w) return; headOff(w); H.scene.remove(w.g); H.pick.splice(H.pick.indexOf(w.hb), 1); delete H.peers[u]; if (H.open && H.open.person === u) closeSheet(); }
  function netTick(dt) {
    H.net += dt; if (H.net < .4) return; H.net = 0; const x = +H.pos.x.toFixed(1), z = +H.pos.z.toFixed(1), r = +H.yaw.toFixed(1), key = [x, z, r].join();
    if (key === H.sent) return; H.sent = key; R('here/' + uid).update({ x, z, r }).catch(() => {});
  }
  function presenceOn() {
    const me = R('here/' + uid), info = db.ref('.info/connected'), f = s => { if (s.val() === true) { me.onDisconnect().remove(); me.set({ x: +H.pos.x.toFixed(1), z: +H.pos.z.toFixed(1), r: 0, n: name(), ro: E.isJudge && E.role !== 'host' ? 'judge' : E.role, t: TS() }).catch(() => {}); } };
    info.on('value', f); H.offs.push(() => info.off('value', f));
    const hr = R('here'), add = s => { E.here[s.key] = s.val(); peerUpdate(s.key, s.val()); }, rm = s => { delete E.here[s.key]; peerGone(s.key); };
    hr.on('child_added', add); hr.on('child_changed', add); hr.on('child_removed', rm); H.offs.push(() => { hr.off('child_added', add); hr.off('child_changed', add); hr.off('child_removed', rm); });
    const pg = R('pings/' + uid), pf = s => { const v = s.val(); s.ref.remove().catch(() => {}); if (v && Date.now() - (v.at || 0) < 120000) incoming(v); };
    pg.limitToLast(10).on('child_added', pf); H.offs.push(() => pg.off('child_added', pf));
  }
  function pingTo(u, o) { return R('pings/' + u).push(Object.assign({ f: uid, n: name(), at: Date.now() }, o)).catch(() => {}); }
  function sayAloud(word) { R('here/' + uid + '/s').set({ x: word, t: Date.now() }).catch(() => {}); }
  function card(html, ms) { const hall = $('#mlHall') || document.body, d = document.createElement('div'); d.className = 'hl-card'; if (hall === document.body) { d.style.position = 'fixed'; d.style.zIndex = 2000; } d.innerHTML = html; hall.appendChild(d); if (ms) setTimeout(() => d.remove(), ms); return d; }
  const GREET = () => T('السلام عليكم', 'Hello'), greetReply = w => /السلام/.test(w) ? 'وعليكم السلام ورحمة الله' : T('أهلًا بك', 'Hello');
  function callActions(u, room) { return `<button class="ml-b sm main" data-a="y">${IC.mic}${T('صوت', 'Voice')}</button><button class="ml-b sm" data-a="v">${IC.cam}${T('فيديو', 'Video')}</button>`; }
  function bindCall(d, go) { $('[data-a=y]', d).onclick = () => { d.remove(); go(false); }; $('[data-a=v]', d).onclick = () => { d.remove(); go(true); }; }
  function visitorCard(u, d) { const c = card(`<div><b dir="auto">${esc(d.n)}</b> ${T('يطّلع على ملصقك', 'is viewing your poster')}</div><div class="ml-row">${callActions()}<button class="ml-b sm" data-a="g">${esc(GREET())}</button><button class="ml-b sm" data-a="x" aria-label="${T('إغلاق', 'Close')}">${IC.x}</button></div>`, 15000); const room = 'p_' + uid; bindCall(c, vd => { joinRoom(room, vd); pingTo(u, { k: 'c', room }); }); $('[data-a=g]', c).onclick = () => { sayAloud(GREET()); pingTo(u, { k: 'r', w: GREET() }); c.remove(); }; $('[data-a=x]', c).onclick = () => c.remove(); }
  function incoming(v) {
    if (v.k === 'g') {
      const w = H.peers[v.f]; if (w) say(w, v.w);
      const d = card(`<div><b dir="auto">${esc(v.n)}</b>: <span dir="auto">${esc(v.w)}</span></div><div class="ml-row"><button class="ml-b sm" data-a="r">${esc(greetReply(v.w))}</button>${callActions()}<button class="ml-b sm" data-a="x" aria-label="${T('إغلاق', 'Close')}">${IC.x}</button></div>`, 20000);
      bindCall(d, vd => callPerson(v.f, vd)); $('[data-a=r]', d).onclick = () => { const w2 = greetReply(v.w); sayAloud(w2); pingTo(v.f, { k: 'r', w: w2 }); d.remove(); }; $('[data-a=x]', d).onclick = () => d.remove();
    } else if (v.k === 'r') { const w = H.peers[v.f]; if (w) say(w, v.w); toast(`${v.n}: ${v.w}`); }
    else if (v.k === 'c') {
      if (Call.room === v.room) return;
      const d = card(`<div><b dir="auto">${esc(v.n)}</b> ${T('يطلب محادثتك', 'would like to talk')}</div><div class="ml-row">${callActions()}<button class="ml-b sm" data-a="n">${T('ليس الآن', 'Not now')}</button></div>`, 45000);
      bindCall(d, vd => { joinRoom(v.room, vd); }); $('[data-a=n]', d).onclick = () => { d.remove(); pingTo(v.f, { k: 'd' }); };
    } else if (v.k === 'd') toast(T(`${v.n} غير متاح الآن`, `${v.n} is not available now`));
    else if (v.k === 'stage') { const d = card(`<div>${T('ملصقك معروض على المسرح الآن', 'Your poster is on stage now')}</div><div class="ml-row">${callActions()}<button class="ml-b sm" data-a="n">${T('إغلاق', 'Close')}</button></div>`, 60000); bindCall(d, vd => joinRoom('stage', vd)); $('[data-a=n]', d).onclick = () => d.remove(); }
  }
  function callPerson(u, video) { const d = E.here[u]; if (d && d.c) return joinRoom(d.c, video); const room = 't_' + rid(8); joinRoom(room, video); pingTo(u, { k: 'c', room }); }

  /* ---------- the hall: open and close ---------- */
  async function openHall(goal) {
    if (H.on) return; if (St.on) stageClose();
    document.body.classList.add('ml-on'); H.on = true; H.offs = [];
    const el = document.createElement('div'); el.id = 'mlHall'; document.body.appendChild(el); H.el = el; H.visited = store.get('v.' + E.id, {});
    el.innerHTML = `<canvas id="mlGl"></canvas><div class="hl-fade" id="hlFade"></div>
      <div class="hl-top"><button class="hl-p hl-ib" id="hlExit" aria-label="${T('خروج', 'Leave')}">${IC.out}</button><div class="hl-p" id="hlWhere"><span><span id="hlW1"></span><small id="hlW2"></small></span></div><button class="hl-p hl-ib" id="hlGuide" aria-label="${T('الدليل', 'Guide')}">${IC.map}</button></div>
      <canvas id="hlMini" width="184" height="240" aria-label="${T('الخريطة', 'Map')}"></canvas>
      <button id="hlNear" hidden><span style="flex:1;min-width:0"><b id="hlNt"></b><small id="hlNs"></small></span></button>
      <div id="hlStick" aria-hidden="true"><div id="hlKnob"></div></div>
      <div id="hlJump"><button class="ar" id="hlPrev" aria-label="${T('السابق', 'Previous')}">${IC.prev}</button><button class="mid" id="hlMid" aria-label="${T('الانتقال برقم الملصق', 'Go by poster number')}"></button><button class="ar" id="hlNext" aria-label="${T('التالي', 'Next')}">${IC.next}</button></div>
      <section id="hlV" hidden></section><section class="hl-sheet" id="hlSheet"></section><section class="hl-sheet tall" id="hlG"></section>`;
    try {
      await script('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      if (document.fonts && document.fonts.load) await Promise.race([Promise.all(['500', '600', '700'].map(w => document.fonts.load(`${w} 40px "IBM Plex Sans Arabic"`, 'ابج'))), new Promise(r => setTimeout(r, 1500))]);
      const cv = $('#mlGl', el); H.r3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); H.r3.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); H.r3.outputEncoding = THREE.sRGBEncoding;
      H.cam = new THREE.PerspectiveCamera(62, 1, .1, 200); H.sig = ''; H.pos = { x: 0, z: 4 }; H.yaw = 0; H.pitch = -.03; hallItems(); hallResize(); addEventListener('resize', hallResize); H.offs.push(() => removeEventListener('resize', hallResize));
      bindHall(); presenceOn(); H.raf = requestAnimationFrame(hallFrame);
      if (goal && E.items[goal]) setTimeout(() => travel(goal), 300);
    } catch (e) { el.innerHTML = `<div class="ml-card" style="margin:60px 16px"><p>${T('تعذر تشغيل القاعة على هذا الجهاز.', 'The hall could not start on this device.')}</p><div><button class="ml-b" id="hlExit2">${T('رجوع', 'Back')}</button></div></div>`; $('#hlExit2', el).onclick = closeHall; }
  }
  function closeHall() {
    if (!H.on) return; H.on = false; cancelAnimationFrame(H.raf); (H.offs || []).forEach(f => f()); H.offs = []; callEnd();
    if (db && E.id) { R('here/' + uid).remove().catch(() => {}); R('here/' + uid).onDisconnect().cancel().catch(() => {}); }
    H.peers = {}; H.open = null; H.stand = null; H.route = []; H.goal = null; if (H.notesOff) { H.notesOff(); H.notesOff = null; }
    if (H.r3) { H.r3.dispose(); H.r3 = null; } H.scene = null; bodyG = null; if (H.el) H.el.remove(); H.el = null; document.body.classList.remove('ml-on', 'ml-view'); E.here = {};
    if (view.refresh) view.refresh();
  }
  function hallResize() { if (!H.r3) return; const w = innerWidth, h = innerHeight; H.r3.setSize(w, h, false); H.cam.aspect = w / h; H.cam.fov = w < h ? 82 : 58; H.cam.updateProjectionMatrix(); }
  function hallItems() {
    if (!H.r3) return; const sig = E.order.map(p => p + ':' + (E.items[p].ar || '') + ':' + E.items[p].tr + ':' + E.items[p].t).join('|');
    if (sig !== H.sig) { H.sig = sig; buildScene(); if (H.pos.z > H.L.zIn || hit(H.pos.x, H.pos.z)) H.pos = { x: 0, z: 4 }; } drawScreen(); jumpLabel();
  }
  function hallFrame(now) { H.raf = requestAnimationFrame(hallFrame); if (!H.r3 || document.hidden || !H.scene) return; const dt = Math.min(.05, (now - (H.last || now)) / 1000 || .016); H.last = now; hallStep(dt, now / 1000); if (!H.open || !H.open.p) H.r3.render(H.scene, H.cam); }
  function hallStep(dt, t) {
    let mx = H.stick.x + (H.keys.arrowleft || H.keys.a ? -1 : 0) + (H.keys.arrowright || H.keys.d ? 1 : 0), mz = H.stick.y + (H.keys.arrowup || H.keys.w ? -1 : 0) + (H.keys.arrowdown || H.keys.s ? 1 : 0);
    const len = Math.hypot(mx, mz), SP = 3.4;
    if (len > .08 && !(H.open && H.open.p)) {
      if (H.route.length) { H.route = []; H.goal = null; drawRoute(); } if (H.open) closeSheet();
      if (len > 1) { mx /= len; mz /= len; } const sn = Math.sin(H.yaw), cs = Math.cos(H.yaw), dx = (-sn * -mz + cs * mx) * SP * dt, dz = (-cs * -mz - sn * mx) * SP * dt;
      if (!hit(H.pos.x + dx, H.pos.z)) H.pos.x += dx; if (!hit(H.pos.x, H.pos.z + dz)) H.pos.z += dz; H.yaw -= mx * dt * .9;
    } else if (H.route.length) {
      const n = H.route[0], d = Math.hypot(n.x - H.pos.x, n.z - H.pos.z), st = SP * 1.3 * dt;
      if (d <= st) { H.pos.x = n.x; H.pos.z = n.z; H.route.shift(); drawRoute(); if (!H.route.length && H.goal) { const g = H.goal; H.goal = null; if (g.p) standAt(g.p); else if (g.person) { const q = E.here[g.person]; if (q) openPerson(g.person); } else if (g.stage) stageFromHall(); } }
      else { H.pos.x += (n.x - H.pos.x) / d * st; H.pos.z += (n.z - H.pos.z) / d * st; const w = Math.atan2(-(n.x - H.pos.x), -(n.z - H.pos.z)); H.yaw += wrapA(w - H.yaw) * Math.min(1, dt * 4.5); H.pitch += (-.03 - H.pitch) * Math.min(1, dt * 3); }
    }
    H.cam.position.set(H.pos.x, 1.62 + ((len > .08 || H.route.length) ? Math.sin(t * 9) * .012 : 0), H.pos.z); H.cam.rotation.set(H.pitch, H.yaw, 0, 'YXZ');
    Object.values(H.peers).forEach(w => { const p = w.g.position, k = Math.min(1, dt * 5), mv = Math.hypot(w.tx - p.x, w.tz - p.z); p.x += (w.tx - p.x) * k; p.z += (w.tz - p.z) * k; p.y = mv > .05 ? Math.abs(Math.sin(t * 6)) * .025 : 0; w.g.rotation.y += wrapA(w.tr - w.g.rotation.y) * k; if (w.vm) w.vm.lookAt(H.cam.position.x, 1.68, H.cam.position.z); if (w.bb) { w.bbT -= dt; if (w.bbT < 0) { w.g.remove(w.bb); w.bb = null; } } });
    netTick(dt);
    H.tick += dt; if (H.tick > .25) { dwell(H.tick); H.tick = 0; nearCheck(); miniMap(); }
    H.texT += dt; if (H.texT > 1.2) { H.texT = 0; texUpdate(); }
  }
  const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  function drawRoute() { if (!H.routeM) return; let a = { x: H.pos.x, z: H.pos.z }, n = 0; (H.route || []).forEach(b => { const d = Math.hypot(b.x - a.x, b.z - a.z), k = Math.floor(d / .55); for (let i = 1; i <= k && n < 200; i++) { H.dummy.position.set(a.x + (b.x - a.x) * i / k, 0, a.z + (b.z - a.z) * i / k); H.dummy.updateMatrix(); H.routeM.setMatrixAt(n++, H.dummy.matrix); } a = b; }); H.routeM.count = n; H.routeM.instanceMatrix.needsUpdate = true; }
  function markVisited(p) { if (H.visited[p] || !E.items[p]) return; H.visited[p] = 1; store.set('v.' + E.id, H.visited); R('seen/' + p + '/' + uid).set(1).catch(() => {}); const P = H.poster[p]; if (P) { P.pq.material.map.dispose(); P.pq.material.map = plaque(p); P.pq.material.needsUpdate = true; } jumpLabel(); }
  function dwell(dt) { const f = H.focus; if (!f) { H.dwell = { p: null, t: 0 }; return; } if (H.dwell.p !== f) H.dwell = { p: f, t: 0 }; H.dwell.t += dt; if (H.dwell.t > 3) markVisited(f); }
  function jumpLabel() { const m = $('#hlMid'); if (!m) return; const seen = E.order.filter(p => H.visited[p]).length, p = H.focus, cur = p ? E.numOf[p] : (H.lastNum || 0); m.innerHTML = `${T('ملصق', 'Poster')} ${num(cur || '–')} / ${num(E.order.length)}<small>${T(`اطّلعت على ${num(seen)}`, `Viewed ${seen}`)}</small>`; }
  function nearCheck() {
    const L = H.L; if (!L) return; const inTh = H.pos.z < L.zBack;
    let best = null, bd = 1e9; E.order.forEach(p => { const s = L.spots[p], d = Math.hypot(s.sx - H.pos.x, s.sz - H.pos.z); if (d < 4.2 && d < bd && H.pos.z > s.z + .2) { bd = d; best = p; } });
    if (best !== H.focus) { H.focus = best; E.order.forEach(p => { const P = H.poster[p]; if (P) P.fm.material.color.set(p === best ? tcol(E.items[p].tr) : '#20252C'); }); }
    const w1 = $('#hlW1'), w2 = $('#hlW2'); if (!w1) return; const row = L.rowsInfo.length ? L.rowsInfo.reduce((a, r, i) => Math.abs(r.z + 3 - H.pos.z) < Math.abs(L.rowsInfo[a].z + 3 - H.pos.z) ? i : a, 0) : -1, ri = L.rowsInfo[row];
    if (inTh) { w1.textContent = T('المسرح', 'Stage'); w2.textContent = ''; }
    else if (!ri) { w1.textContent = T('القاعة', 'Hall'); w2.textContent = ''; }
    else { const side = H.pos.x > (L.x1 * .35) ? T('جهة النوافذ', 'window side') : H.pos.x < (L.x0 * .35) ? T('الجهة المقابلة للنوافذ', 'opposite the windows') : T('الوسط', 'centre'); w1.textContent = T(`الصف ${num(row + 1)}: ${num(ri.from)}–${num(ri.to)}`, `Row ${row + 1}: ${ri.from}–${ri.to}`); w2.textContent = `${tracks()[ri.tr] || ''} · ${side}`; }
    const n = $('#hlNear');
    if (best && !H.route.length && !H.open) { const it = E.items[best], o = it.own && E.here[it.own]; $('#hlNt').textContent = `${num(E.numOf[best])} · ${it.t}`; $('#hlNs').innerHTML = `<span class="ml-dot ${o ? '' : 'off'}"></span><span dir="auto">${esc(it.a || '')}</span>`; n.hidden = false; n.dataset.p = best; } else n.hidden = true;
    jumpLabel();
  }
  function miniMap() { const m = $('#hlMini'); if (m && (!H.open || !H.open.p)) drawMap(m, true); const g = $('#hlMap'); if (g && $('#hlG').classList.contains('open')) drawMap(g, false); }
  function drawMap(m, mini) {
    const L = H.L; if (!L) return; const c = m.getContext('2d'), W = m.width, Ht = m.height, cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--ink').trim() || '#16201F', mut = cs.getPropertyValue('--muted').trim() || '#5A6664';
    const wd = L.x1 - L.x0, dp = L.zIn + 1.5 - L.th.z0, k = Math.min((W - 12) / wd, (Ht - 12) / dp), ox = W / 2, oz = (Ht - dp * k) / 2, mp = (x, z) => [ox + x * k, oz + dp * k - (L.zIn + 1.5 - z) * k];
    c.clearRect(0, 0, W, Ht); c.lineWidth = mini ? 1.5 : 2; c.strokeStyle = mut;
    const rect = (a, b, d, e) => { const p = mp(a, b), q = mp(d, e); c.strokeRect(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])); };
    rect(L.x0, L.zBack, L.x1, L.zIn + 1.5); rect(L.th.x0, L.th.z0, L.th.x1, L.zBack);
    const win = mp(L.x1, L.zIn - 2), win2 = mp(L.x1, L.zBack + 2); c.save(); c.strokeStyle = '#6FA8D6'; c.lineWidth = mini ? 3 : 5; c.beginPath(); c.moveTo(win[0], win[1]); c.lineTo(win2[0], win2[1]); c.stroke(); c.restore();
    E.order.forEach(p => { const s = L.spots[p], q = mp(s.x, s.z), w = Math.max(6, 3 * k); c.fillStyle = tcol(E.items[p].tr); c.globalAlpha = H.visited[p] ? 1 : .45; c.fillRect(q[0] - w / 2, q[1] - 2, w, 4); c.globalAlpha = 1; if (!mini) { c.fillStyle = ink; c.font = `600 ${Math.max(16, Math.min(24, 1.2 * k))}px ${F}`; c.textAlign = 'center'; c.fillText(num(E.numOf[p]), q[0], q[1] - 7); } });
    if (!mini) { const tc = mp(0, (L.th.z0 + L.zBack) / 2); c.fillStyle = mut; c.textAlign = 'center'; c.font = `500 22px ${F}`; c.fillText(T('المسرح', 'Stage'), tc[0], tc[1]); const ic = mp(0, L.zIn + .4); c.fillText(T('المدخل', 'Entrance'), ic[0], ic[1]); }
    const r = ROLE(); Object.values(H.peers).forEach(w => { const q = mp(w.g.position.x, w.g.position.z); c.fillStyle = w.ro !== 'guest' && r[w.ro] ? r[w.ro][0] : mut; c.beginPath(); c.arc(q[0], q[1], mini ? 2.5 : 5, 0, 7); c.fill(); });
    const me = mp(H.pos.x, H.pos.z), sz = mini ? 8 : 14; c.save(); c.translate(me[0], me[1]); c.rotate(-H.yaw); c.fillStyle = '#C9301F'; c.beginPath(); c.moveTo(0, -sz * 1.2); c.lineTo(sz * .75, sz * .8); c.lineTo(0, sz * .4); c.lineTo(-sz * .75, sz * .8); c.closePath(); c.fill(); c.restore();
  }
  function bindHall() {
    const el = H.el, cv = $('#mlGl', el); let drag = null;
    $('#hlExit', el).onclick = closeHall; $('#hlGuide', el).onclick = () => openGuide('p'); $('#hlMini', el).onclick = () => openGuide('p');
    $('#hlNear', el).onclick = () => { const p = $('#hlNear', el).dataset.p; if (p) goPoster(p); };
    $('#hlPrev', el).onclick = () => step(-1); $('#hlNext', el).onclick = () => step(1); $('#hlMid', el).onclick = () => openPad();
    cv.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), m: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.m = true; if (drag.m) { H.yaw += dx * .0042; H.pitch = Math.max(-.7, Math.min(.6, H.pitch + dy * .0032)); } });
    cv.addEventListener('pointerup', e => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (d.m || performance.now() - d.t > 450) return; if (H.open) return closeSheet(); pickAt(e.clientX, e.clientY); });
    const st = $('#hlStick', el), kn = $('#hlKnob', el), Rr = 38; let id = null; const up = e => { const r = st.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy); if (d > Rr) { dx *= Rr / d; dy *= Rr / d; } H.stick.x = dx / Rr; H.stick.y = dy / Rr; kn.style.transform = `translate(${dx}px,${dy}px)`; };
    st.addEventListener('pointerdown', e => { id = e.pointerId; st.setPointerCapture(id); up(e); e.preventDefault(); }); st.addEventListener('pointermove', e => { if (e.pointerId === id) up(e); });
    const end = e => { if (e.pointerId === id) { id = null; H.stick.x = H.stick.y = 0; kn.style.transform = ''; } }; st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    const kd = e => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; H.keys[e.key.toLowerCase()] = 1; if (e.key === 'Escape') { if (H.open && H.open.tab) closeDetails(); else if (H.open) closeSheet(); } }, ku = e => { H.keys[e.key.toLowerCase()] = 0; };
    addEventListener('keydown', kd); addEventListener('keyup', ku); H.offs.push(() => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); });
  }
  function pickAt(cx, cy) {
    const r = $('#mlGl', H.el).getBoundingClientRect(), v = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(v, H.cam);
    const hits = ray.intersectObjects(H.pick); if (hits.length && hits[0].distance < 34) { const u = hits[0].object.userData; if (u.person) return openPerson(u.person); if (u.p) return goPoster(u.p); if (u.stage) return goStage(); }
    const f = ray.intersectObject(H.floor); if (f.length) walkTo(f[0].point.x, f[0].point.z, null);
  }
  function walkTo(x, z, goal) { closeSheet(); H.route = path(H.pos, { x, z }); H.goal = goal; drawRoute(); }
  function goPoster(p) { const s = H.L.spots[p]; if (s) walkTo(s.sx, s.sz, { p }); }
  function goStage() { walkTo(0, H.L.th.z0 + 8.6, { stage: 1 }); }
  function stageFromHall() { const c = E.stage && E.stage.cur; if (c && E.items[c]) { openPoster(c, 'stage'); } else toast(T('لم يبدأ العرض بعد', 'The show has not started')); }
  function travel(p) { const s = H.L && H.L.spots[p]; if (!s) return; const f = $('#hlFade'); closeSheet(); closeGuide(); H.route = []; H.goal = null; drawRoute(); if (f) f.classList.add('on'); setTimeout(() => { H.pos.x = s.sx; H.pos.z = s.sz; standAt(p); if (f) f.classList.remove('on'); }, 170); }
  function step(d) { if (!E.order.length) return; const cur = H.open && H.open.p ? E.numOf[H.open.p] : H.focus ? E.numOf[H.focus] : (H.lastNum || (d > 0 ? 0 : 1)); let nx = cur + d; if (nx < 1) nx = E.order.length; if (nx > E.order.length) nx = 1; travel(E.order[nx - 1]); }
  function nextUnviewed() { const c = H.lastNum || 0, n = E.order.length; for (let i = 1; i <= n; i++) { const p = E.order[(c - 1 + i + n) % n]; if (!H.visited[p]) return travel(p); } toast(T('اطّلعت على جميع الملصقات', 'You have viewed every poster')); }
  function openPad() {
    if (H.padEl) { H.padEl.remove(); H.padEl = null; return; } let v = '';
    const d = H.padEl = card(`<div class="ml-row"><b class="ml-grow">${T('رقم الملصق', 'Poster number')} <span id="padV" dir="ltr"></span></b><button class="hl-x" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button></div><div class="hl-pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-d="${n}">${num(n)}</button>`).join('')}<button data-c>${T('مسح', 'Clear')}</button><button data-d="0">${num(0)}</button><button data-g style="background:var(--accent);color:var(--surface);border-color:transparent">${T('انتقال', 'Go')}</button></div><button class="ml-b" data-u>${T('التالي غير المطّلع عليه', 'Next unviewed')}</button>`);
    const close = () => { d.remove(); H.padEl = null; };
    $$('[data-d]', d).forEach(b => b.onclick = () => { if (v.length < 3) v += b.dataset.d; $('#padV', d).textContent = num(v); }); $('[data-c]', d).onclick = () => { v = ''; $('#padV', d).textContent = ''; };
    $('[data-g]', d).onclick = () => { const p = E.order[+v - 1]; if (p) { close(); travel(p); } else toast(T('لا يوجد ملصق بهذا الرقم', 'No poster has this number')); }; $('[data-x]', d).onclick = close; $('[data-u]', d).onclick = () => { close(); nextUnviewed(); };
  }

  /* ---------- standing at a poster: the poster fills the screen, the conversation sits beside it ---------- */
  const sheet = () => $('#hlSheet', H.el);
  function closeGuide() { const g = H.el && $('#hlG', H.el); if (g) g.classList.remove('open'); }
  function standAt(p) { H.stand = p; H.lastNum = E.numOf[p]; H.yaw = 0; H.pitch = 0; markVisited(p); R('here/' + uid + '/p').set(p).catch(() => {}); openPoster(p); }
  function closeDetails() { const s = sheet(); s.classList.remove('open'); if (H.open) H.open.tab = null; if (H.notesOff) { H.notesOff(); H.notesOff = null; } }
  function closeSheet() {
    if (!H.el) return; const s = sheet(), v = $('#hlV', H.el); if (s) s.classList.remove('open', 'mini'); if (v) { v.hidden = true; v.innerHTML = ''; } document.body.classList.remove('ml-view'); H.el.classList.remove('hl-open');
    if (H.stand) { H.stand = null; if (E.id) R('here/' + uid + '/p').remove().catch(() => {}); } H.open = null; if (H.notesOff) { H.notesOff(); H.notesOff = null; }
  }
  function openPoster(p, room) {
    const it = E.items[p]; if (!it) return; if (H.notesOff) { H.notesOff(); H.notesOff = null; } H.open = { p, room: room || (it.own ? 'p_' + it.own : null) }; sheet().classList.remove('open', 'mini'); $('#hlNear', H.el).hidden = true; H.el.classList.add('hl-open'); document.body.classList.add('ml-view');
    const v = $('#hlV', H.el); v.hidden = false;
    v.innerHTML = `<header class="pv-h"><button class="hl-x" id="pvC" aria-label="${T('العودة إلى القاعة', 'Back to the hall')}">${IC.x}</button><span class="ml-n" style="background:${tcol(it.tr)}">${num(E.numOf[p])}</span><div class="pv-t"><b dir="auto">${esc(it.t)}</b><small id="pvS"></small></div><button class="hl-x" data-nav="-1" aria-label="${T('السابق', 'Previous')}">${IC.prev}</button><button class="hl-x" data-nav="1" aria-label="${T('التالي', 'Next')}">${IC.next}</button></header><div class="pv-box" id="pvBox"><img id="pvImg" alt="${T('الملصق', 'Poster')}" draggable="false"></div><footer class="pv-f" id="pvF"></footer>`;
    $('#pvC', v).onclick = closeSheet; $$('[data-nav]', v).forEach(b => b.onclick = () => { const n = E.numOf[p] + +b.dataset.nav, q = E.order[(n - 1 + E.order.length) % E.order.length]; travel(q); });
    const img = $('#pvImg', v); R('thumb/' + p).once('value').then(s => { if (s.val() && img.isConnected && !img.dataset.full) img.src = s.val(); }).catch(() => {}); R('full/' + p).once('value').then(s => { if (s.val() && img.isConnected) { img.dataset.full = 1; img.src = s.val(); } }).catch(() => {});
    panZoom($('#pvBox', v), img); viewBar();
  }
  function viewBar() {
    const f = H.el && $('#pvF', H.el), O = H.open; if (!f || !O || !O.p) return; const p = O.p, it = E.items[p], mine = it.own === uid, o = it.own && E.here[it.own], inCall = Call.room && Call.room === O.room, st = $('#pvS', H.el), res = it.w ? ` · ${esc(it.w)}` : '';
    if (st) st.innerHTML = `<span class="ml-dot ${o ? '' : 'off'}"></span><span dir="auto">${esc(it.a || '')}</span>${o || mine ? '' : res}`;
    const canTalk = O.room && (mine || o || O.room === 'stage');
    f.innerHTML = `${!inCall && canTalk ? `<button class="ml-b main" id="pvA">${IC.mic}${T('صوت', 'Voice')}</button><button class="ml-b" id="pvV">${IC.cam}${T('فيديو', 'Video')}</button>${o && !mine ? `<button class="ml-b" id="pvG">${esc(GREET())}</button>` : ''}` : ''}<button class="ml-b" id="pvD">${T('التفاصيل', 'Details')}</button>${E.isJudge || E.role === 'judge' ? `<button class="ml-b" id="pvJ">${T('التقييم', 'Score')}</button>` : ''}`;
    const go = vd => { joinRoom(O.room, vd); if (!mine && it.own && O.room !== 'stage') pingTo(it.own, { k: 'c', room: O.room }); };
    const a = $('#pvA', f); if (a) { a.onclick = () => go(false); $('#pvV', f).onclick = () => go(true); } const g = $('#pvG', f); if (g) g.onclick = () => { sayAloud(GREET()); pingTo(it.own, { k: 'g', w: GREET(), p }); g.disabled = true; };
    $('#pvD', f).onclick = () => openDetails(p); const j = $('#pvJ', f); if (j) j.onclick = () => openDetails(p, 'sc');
  }
  function panZoom(box, img) {
    let s = 1, x = 0, y = 0, pts = new Map(), d0 = 0, s0 = 1, last = 0;
    const apply = () => { const mx = (box.clientWidth * (s - 1)) / 2, my = (box.clientHeight * (s - 1)) / 2; x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y)); img.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
    box.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); try { box.setPointerCapture(e.pointerId); } catch (_) {} if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = s; } else { const n = performance.now(); if (n - last < 300) { s = s > 1 ? 1 : 2.6; x = y = 0; apply(); } last = n; } });
    box.addEventListener('pointermove', e => { const q = pts.get(e.pointerId); if (!q) return; if (pts.size === 1 && s > 1) { x += e.clientX - q[0]; y += e.clientY - q[1]; } pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; s = Math.max(1, Math.min(5, s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (d0 || 1))); } apply(); });
    const up = e => { pts.delete(e.pointerId); }; box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    box.addEventListener('wheel', e => { e.preventDefault(); s = Math.max(1, Math.min(5, s * (e.deltaY < 0 ? 1.12 : .89))); apply(); }, { passive: false });
  }
  function openDetails(p, first) {
    const it = E.items[p], s = sheet(), tabs = [['su', T('الملخص', 'Summary')], ['no', T('المداخلات', 'Comments')]]; if (it.v) tabs.push(['vi', T('العرض المسجل', 'Recorded talk')]); if (it.txt || it.s) tabs.push(['as', T('استفسار', 'Ask')]); if (E.isJudge || E.role === 'judge') tabs.push(['sc', T('التقييم', 'Score')]);
    const t0 = first || 'su'; H.open.tab = t0;
    s.innerHTML = `<div class="hl-h"><h3>${T('التفاصيل', 'Details')}</h3><button class="hl-x" id="hlC" aria-label="${T('إغلاق', 'Close')}">${IC.x}</button></div><div class="ml-tabs" role="tablist">${tabs.map(t => `<button role="tab" data-t="${t[0]}" aria-selected="${t[0] === t0}">${t[1]}</button>`).join('')}</div><div class="hl-body" id="hlB"></div>`;
    s.classList.add('open'); $('#hlC', s).onclick = closeDetails;
    $$('[role=tab]', s).forEach(b => b.onclick = () => { $$('[role=tab]', s).forEach(x => x.setAttribute('aria-selected', x === b)); H.open.tab = b.dataset.t; detailTab(p, b.dataset.t); }); detailTab(p, t0);
  }
  function detailTab(p, t) {
    const it = E.items[p], b = $('#hlB', H.el); if (!b) return; if (H.notesOff) { H.notesOff(); H.notesOff = null; } b.scrollTop = 0;
    if (t === 'su') {
      b.innerHTML = `${it.fi ? `<p class="hl-lead" dir="auto">${esc(it.fi)}</p>` : ''}${it.s ? `<p dir="auto" style="margin:0">${esc(it.s)}</p>` : ''}<p class="ml-mut" dir="auto">${esc(it.a || '')}${tracks()[it.tr] ? ' · ' + esc(tracks()[it.tr]) : ''}</p>${E.cfg.aud ? `<div><button class="ml-b sm" id="hlStar">${IC.star}<span>${T('التصويت لهذه المشاركة', 'Vote for this entry')}</span></button></div>` : ''}`;
      const st = $('#hlStar', b); if (st) R('votes/' + uid).once('value').then(v => { const paint = on => { st.style.color = on ? 'var(--dune)' : ''; $('span', st).textContent = on ? T('صوّتّ لهذه المشاركة', 'You voted for this entry') : T('التصويت لهذه المشاركة', 'Vote for this entry'); }; let on = v.val() === p; paint(on); st.onclick = () => { on = !on; R('votes/' + uid).set(on ? p : null).then(() => paint(on)); }; }).catch(() => {});
    } else if (t === 'vi') { const m = String(it.v).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); b.innerHTML = m ? `<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden;flex:none"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="${T('العرض المسجل', 'Recorded talk')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe></div>` : /^https:\/\//.test(it.v) ? `<div><a class="ml-b" href="${esc(it.v)}" target="_blank" rel="noopener">${T('فتح العرض المسجل', 'Open the recorded talk')}</a></div>` : ''; }
    else if (t === 'sc') { b.innerHTML = '<div id="hlSc"></div>'; scoreForm($('#hlSc', b), p); }
    else if (t === 'as') {
      b.innerHTML = `<div class="ml-row"><input class="ml-in ml-grow" id="hlQ" dir="auto" placeholder="${T('اكتب سؤالك عن الملصق', 'Ask about this poster')}" aria-label="${T('سؤال', 'Question')}"><button class="ml-b main" id="hlQs">${T('إرسال', 'Send')}</button></div><p id="hlAns" dir="auto" style="margin:0;white-space:pre-wrap"></p>`;
      $('#hlQs', b).onclick = async () => { const q = $('#hlQ', b).value.trim(), a = $('#hlAns', b); if (!q) return; a.textContent = '…'; try { a.textContent = await ai([`أجب عن سؤال زائر عن هذا الملصق العلمي بلغة السؤال، في ثلاث جمل على الأكثر، ومن النص التالي وحده. إذا لم يرد الجواب في النص فصرّح بذلك واقترح توجيه السؤال إلى المشارك.\n\nالعنوان: ${it.t}\nالنتيجة: ${it.fi || ''}\nالملخص: ${it.s || ''}\nنص الملصق: ${it.txt || ''}\n\nالسؤال: ${q}`]); } catch (e) { a.textContent = T('تعذرت الإجابة الآن.', 'Could not answer now.'); } };
    } else if (t === 'no') {
      let kind = 'q'; const K = { q: T('سؤال', 'Question'), c: T('تعليق', 'Comment'), s: T('مقترح', 'Suggestion') };
      b.innerHTML = `<div class="hl-seg">${Object.keys(K).map(k => `<button data-k="${k}" aria-pressed="${k === 'q'}">${K[k]}</button>`).join('')}</div><div class="ml-row"><textarea class="ml-in ml-grow" id="hlNt2" rows="2" maxlength="500" dir="auto" aria-label="${T('نص المداخلة', 'Comment text')}"></textarea><button class="ml-b main" id="hlNs2">${T('إرسال', 'Send')}</button></div><ul class="hl-note" id="hlNl"></ul>`;
      $$('[data-k]', b).forEach(x => x.onclick = () => { kind = x.dataset.k; $$('[data-k]', b).forEach(y => y.setAttribute('aria-pressed', y === x)); });
      $('#hlNs2', b).onclick = () => { const ta = $('#hlNt2', b), v = ta.value.trim(); if (!v) return; ta.value = ''; R('notes/' + p).push({ f: uid, n: name(), k: kind, x: v.slice(0, 500), t: Date.now() }).catch(() => toast(T('تعذر الإرسال', 'Could not send'))); };
      const canDel = E.role === 'host' || E.role === 'mod', ref = R('notes/' + p).limitToLast(100), f = s => { const l = $('#hlNl', b); if (!l) return; const a = []; s.forEach(c => { a.unshift([c.key, c.val()]); }); l.innerHTML = a.map(([k, n]) => `<li dir="auto"><small><b>${esc(K[n.k] || K.c)}</b><span>${esc(n.n)}</span>${canDel || n.f === uid ? `<button class="ml-del" data-rm="${esc(k)}" aria-label="${T('حذف', 'Delete')}">${IC.x}</button>` : ''}</small>${esc(n.x)}</li>`).join('') || `<li class="ml-mut">${T('لا توجد مداخلات بعد.', 'No comments yet.')}</li>`; $$('[data-rm]', l).forEach(x => x.onclick = () => R('notes/' + p + '/' + x.dataset.rm).remove().catch(() => {})); };
      ref.on('value', f); H.notesOff = () => ref.off('value', f);
    }
  }
  function openPerson(u) {
    const d = E.here[u]; if (!d) return; H.open = { person: u }; const s = sheet(), r = ROLE(), ro = r[d.ro] ? r[d.ro][1] : '', own = E.items[u];
    s.innerHTML = `<div class="hl-h"><span class="hl-av">${esc(String(d.n || '؟').charAt(0))}</span><h3 dir="auto">${esc(d.n)}${ro ? `<br><small class="ml-mut" style="font-weight:400">${esc(ro)}</small>` : ''}</h3><button class="hl-x" id="hlC" aria-label="${T('إغلاق', 'Close')}">${IC.x}</button></div><div class="hl-act"><button class="ml-b main" id="psA">${IC.mic}${d.c ? T('الانضمام', 'Join') : T('صوت', 'Voice')}</button><button class="ml-b" id="psV">${IC.cam}${T('فيديو', 'Video')}</button><button class="ml-b" id="psG">${esc(GREET())}</button>${own ? `<button class="ml-b" id="psP">${T('ملصقه', 'Their poster')}</button>` : ''}</div>`;
    s.classList.add('open', 'mini'); $('#hlNear', H.el).hidden = true; $('#hlC', s).onclick = closeSheet;
    $('#psA', s).onclick = () => { closeSheet(); callPerson(u, false); }; $('#psV', s).onclick = () => { closeSheet(); callPerson(u, true); }; $('#psG', s).onclick = () => { sayAloud(GREET()); pingTo(u, { k: 'g', w: GREET() }); closeSheet(); }; const q = $('#psP', s); if (q) q.onclick = () => travel(u);
  }
  function openGuide(tab) {
    closeSheet(); const g = $('#hlG', H.el); g.classList.add('open');
    const paint = () => {
      const seen = E.order.filter(p => H.visited[p]).length;
      g.innerHTML = `<div class="hl-h"><h3>${T('دليل القاعة', 'Hall guide')}</h3><button class="hl-x" id="hlGc" aria-label="${T('إغلاق', 'Close')}">${IC.x}</button></div><div class="ml-tabs"><button data-t="p" aria-selected="${tab === 'p'}">${T('الملصقات', 'Posters')} (${num(seen)}/${num(E.order.length)})</button><button data-t="h" aria-selected="${tab === 'h'}">${T('الحضور', 'People')} (${num(Object.keys(E.here).length)})</button></div><div class="hl-body"><input class="ml-in" id="hlS" placeholder="${T('بحث', 'Search')}" aria-label="${T('بحث', 'Search')}">${tab === 'p' ? `<canvas id="hlMap" width="640" height="${Math.round(640 * Math.min(1.2, (H.L.zIn + 1.5 - H.L.th.z0) / (H.L.x1 - H.L.x0)))}"></canvas><ul class="ml-list" id="hlLs"></ul><div class="ml-row"><button class="ml-b sm" id="hlUn">${T('التالي غير المطّلع عليه', 'Next unviewed')}</button><button class="ml-b sm" id="hlSt">${T('المسرح', 'Stage')}</button></div>` : '<ul class="ml-list" id="hlLs"></ul>'}</div>`;
      $('#hlGc', g).onclick = closeGuide; $$('.ml-tabs [data-t]', g).forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
      const ls = q => { const L = $('#hlLs', g); q = (q || '').trim().toLowerCase(); if (tab === 'p') { const en = q.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); L.innerHTML = E.order.filter(p => !q || String(E.numOf[p]) === en || [E.items[p].t, E.items[p].a, E.items[p].fi, tracks()[E.items[p].tr]].join(' ').toLowerCase().includes(q)).map(p => { const it = E.items[p], o = it.own && E.here[it.own]; return `<li data-p="${esc(p)}" style="cursor:pointer"><span class="ml-n" style="background:${tcol(it.tr)}">${num(E.numOf[p])}</span><div class="ml-t"><b dir="auto">${esc(it.t)}</b><small><span class="ml-dot ${o ? '' : 'off'}"></span><span dir="auto">${esc(it.a || '')}</span></small></div>${H.visited[p] ? IC.check : ''}</li>`; }).join(''); $$('[data-p]', L).forEach(l => l.onclick = () => travel(l.dataset.p)); } else { const r = ROLE(); L.innerHTML = Object.keys(E.here).filter(u => !q || String(E.here[u].n || '').toLowerCase().includes(q)).map(u => { const d = E.here[u], ro = r[d.ro] ? r[d.ro][1] : ''; return `<li data-u="${esc(u)}" style="cursor:${u === uid ? 'default' : 'pointer'}"><span class="hl-av">${esc(String(d.n || '؟').charAt(0))}</span><div class="ml-t"><b dir="auto">${esc(d.n)}</b><small>${u === uid ? T('أنت', 'You') : esc(ro)}${d.c ? ' · ' + T('في محادثة', 'in a conversation') : ''}</small></div></li>`; }).join(''); $$('[data-u]', L).forEach(l => { if (l.dataset.u !== uid) l.onclick = () => { closeGuide(); openPerson(l.dataset.u); }; }); } };
      ls(''); $('#hlS', g).oninput = e => ls(e.target.value);
      const un = $('#hlUn', g); if (un) un.onclick = () => { closeGuide(); nextUnviewed(); }; const sg = $('#hlSt', g); if (sg) sg.onclick = () => { closeGuide(); goStage(); };
      const mp = $('#hlMap', g); if (mp) drawMap(mp, false);
    };
    paint();
  }

  /* ---------- a sample forum ---------- */
  const DEMO = [
    [0, 'ترشيح الموهوبين في المرحلة المتوسطة', 'المعلم يرشّح من يتكلم أكثر، لا من يفكر أعمق.', 'نورة م.', '٢١٤ معلمًا قوّموا مواقف صفية مكتوبة تختلف في مشاركة الطالب الشفهية وعمق تفكيره.', [['مشاركة عالية', 71], ['تفكير عميق', 38]]],
    [0, 'مزدوجو الاستثنائية في فصول الدمج', 'الدعم يتجه إلى الصعوبة، وتبقى الموهبة بلا خطة.', 'خالد ع.', 'تحليل ٤٦ خطة فردية ومقابلات مع ١٢ معلم تربية خاصة.', [['أهداف الصعوبة', 87], ['أهداف الموهبة', 13]]],
    [0, 'الأسرة والنمو الإبداعي', 'وقت الفراغ غير المنظم يتنبأ بالإبداع أكثر من الدورات.', 'ريم ف.', '١٦٠ أسرة، وسجل أنشطة أسبوعي، ومهمة تفكير تباعدي.', [['وقت حر', 58], ['دورات', 24]]],
    [1, 'فشل الشركات الناشئة الطلابية', 'الفريق الذي يقابل عشرة عملاء قبل البناء يعيش ضعف المدة.', 'فهد ر.', 'تتبع ٨٨ مشروعًا طلابيًا مدة ١٨ شهرًا.', [['قابلوا العملاء', 100], ['لم يقابلوا', 50]]],
    [1, 'ثقافة الابتكار في الجامعات', 'الموظف يبتكر حين يُسمح له بالخطأ، لا حين يُكافأ على النجاح.', 'مها ش.', 'استبانة شملت ٣١٢ موظفًا في ثلاث جامعات، ونمذجة بالمعادلات البنائية.', [['الأمان النفسي', 62], ['الحوافز', 18]]],
    [1, 'الهاكاثون وريادة الطلاب', 'الأثر يتلاشى بعد شهرين ما لم يتبعه إرشاد.', 'تركي د.', 'قياس قبلي وبعدي ومتابعة لدى ١٤٠ مشاركًا.', [['مع إرشاد', 66], ['بلا إرشاد', 29]]],
    [2, 'الكتابة البحثية مع النماذج اللغوية', 'الطالب الذي يكتب أولًا ثم يراجع مع الآلة يتعلم أكثر.', 'أمل ن.', 'تجربة على ٩٦ طالب دراسات عليا، مع اختبار فهم مؤجل.', [['اكتب ثم راجع', 78], ['ولّد ثم عدّل', 52]]],
    [2, 'التعرف الآلي على الموهوبين', 'النموذج يرث تحيز من درّبه إن كانت بياناته ترشيحات المعلمين.', 'سلمان ق.', 'بيانات مصطنعة لنحو ٥٠٠٠ طالب، وخمس خوارزميات تصنيف.', [['كثير المشاركة', 84], ['قليل المشاركة', 41]]],
    [2, 'التغذية الراجعة الآلية في المختبر', 'الردود القصيرة السريعة تغيّر سلوك الطالب أكثر من التقرير الطويل.', 'جود ح.', 'تصميم متقاطع مع ٧٢ طالبًا عبر ستة مختبرات.', [['رد فوري', 74], ['تقرير أسبوعي', 49]]]
  ];
  function demoCanvas(d, col) {
    const W = 780, Ht = 1092, cv = document.createElement('canvas'); cv.width = W; cv.height = Ht; const c = cv.getContext('2d'), m = 56, R0 = W - m; c.direction = 'rtl'; c.textAlign = 'right'; c.fillStyle = '#FBFBF8'; c.fillRect(0, 0, W, Ht); c.fillStyle = col; c.fillRect(0, 0, W, 20);
    c.fillStyle = '#16201F'; c.font = `600 36px ${F}`; let y = wrapText(c, d[1], R0, 92, W - 2 * m, 50); c.fillStyle = col; c.fillRect(0, y + 6, W, 430); c.fillStyle = '#fff'; c.font = `700 62px ${F}`; wrapText(c, d[2], R0, y + 110, W - 2 * m, 84); y += 480;
    d[5].forEach((b, i) => { const by = y + i * 88; c.fillStyle = '#16201F'; c.font = `500 26px ${F}`; c.fillText(b[0], R0, by + 22); c.fillStyle = '#E7E9E3'; c.fillRect(m, by + 34, W - 2 * m, 20); c.fillStyle = i ? '#8D949B' : col; const ww = (W - 2 * m) * b[1] / 100; c.fillRect(R0 - ww, by + 34, ww, 20); });
    c.fillStyle = '#5A6664'; c.font = `400 25px ${F}`; wrapText(c, d[4], R0, y + 195, W - 2 * m, 38, 3); c.fillStyle = '#16201F'; c.font = `600 30px ${F}`; c.fillText(d[3], R0, Ht - 56); c.textAlign = 'left'; c.fillStyle = '#8D949B'; c.font = `400 22px ${F}`; c.fillText('مثال توضيحي', m, Ht - 56);
    return cv;
  }
  async function seedDemo() {
    const up = {}, base = Date.now();
    DEMO.forEach((d, i) => { const k = 'demo' + (i + 1), cv = demoCanvas(d, tcol(d[0])); up['items/' + k] = { t: d[1], fi: d[2], a: d[3], s: d[4], tr: d[0], at: base + i, has: 1, ar: 780 / 1092, txt: d[1] + '. ' + d[2] + ' ' + d[4] + ' (مثال توضيحي)' }; up['thumb/' + k] = shrink(cv, 720, 260000); up['full/' + k] = shrink(cv, 1400, 800000); });
    await R().update(up);
  }

  /* ---------- route ---------- */
  function route() { const h = parseHash(); if (h.e && /^\d{6}$/.test(h.e)) { if (E.id !== h.e || !E.meta || h.j || h.p || h.stage) enter(h); } else { teardown(); E.id = null; E.meta = null; home(); } }
  addEventListener('hashchange', route);
  route();
})();

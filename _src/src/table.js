/* alsamani.com — «طاولة»: a live table for working on one document together.
   Everyone with the link sees the same page as it is written (Yjs over the site's Firebase database),
   talks over voice or video (av.js), dictates or records speech into text, brings in a Word file and takes
   the result out as Word or PDF, and asks the assistant for a summary, minutes or the tasks. The host decides who writes. */
(function () {
  const root = document.getElementById('tb'); if (!root) return;
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('tb.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('tb.' + k, JSON.stringify(v)); } catch (e) {} } };
  const SV = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    link: SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    ppl: SV('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .5 3 2 3 5"/>'),
    mic: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    rec: SV('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'),
    up: SV('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
    down: SV('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
    spark: SV('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    lock: SV('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    x: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
    vote: SV('<path d="M4 13h16v7H4zM8 13l1.5-9h5L16 13"/><path d="M10 8.5l1.5 1.5 3-3"/>')
  };
  const COL = ['#2a7fa8', '#b0533a', '#2f7d5b', '#c9822b', '#6b5aa6', '#23336f', '#a23e6b', '#4f7a2a'];
  const toast = (m, bad) => { const t = document.createElement('div'); t.className = 'tb-toast' + (bad ? ' bad' : ''); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); };
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

  let db, uid;
  async function fb() { if (db) return; if (!firebase.apps.length) firebase.initializeApp(window.MD_CFG); const u = (await new Promise(r => { const o = firebase.auth().onAuthStateChanged(x => { o(); r(x); }); })) || (await firebase.auth().signInAnonymously()).user; uid = u.uid; db = firebase.database(); }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  let libs;
  const loadLibs = () => libs || (libs = Promise.all([import('https://esm.sh/yjs@13.6.18'), import('https://esm.sh/y-quill@1.0.0?deps=yjs@13.6.18')]).then(([Y, YQ]) => ({ Y, QuillBinding: YQ.QuillBinding })));
  const script = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  /* ---------- the start: a new table, or the tables opened before on this device ---------- */
  function home() {
    const mine = store.get('list', []);
    root.innerHTML = `<div class="tb-start"><div class="tb-new"><label><span>${T('عنوان الطاولة', 'The table’s title')}</span><input id="tbT" maxlength="80" dir="auto" placeholder="${T('مثلًا: مسودة خطة القسم', 'e.g. the department plan draft')}"></label>
      <label><span>${T('اسمك', 'Your name')}</span><input id="tbN" maxlength="30" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <button type="button" class="btn solid" id="tbGo">${T('افتح طاولة', 'Open a table')}</button></div>
      <ul class="tb-feat"><li>${IC.ppl}${T('تكتبون في المستند نفسه، وكل تعديل يظهر للجميع لحظتها', 'You write in the same document; every change shows for all at once')}</li><li>${IC.mic}${T('صوت وفيديو، وإملاء وتسجيل يتحولان إلى نص', 'Voice and video, dictation and recording into text')}</li><li>${IC.up}${T('ارفع ملف وورد، وصدّر النتيجة وورد أو PDF', 'Bring in a Word file; take it out as Word or PDF')}</li><li>${IC.spark}${T('المساعد يكتب الملخص والمحضر والمهام', 'The assistant writes the summary, minutes and tasks')}</li></ul>
      ${mine.length ? `<h3>${T('طاولاتك', 'Your tables')}</h3><div class="tb-list">${mine.slice(0, 12).map(m => `<a href="?t=${esc(m.id)}" dir="auto">${esc(m.t || T('بلا عنوان', 'Untitled'))}<small>${new Date(m.at).toLocaleDateString(isAr() ? 'ar-SA-u-ca-gregory' : 'en-GB')}</small></a>`).join('')}</div>` : ''}</div>`;
    root.querySelector('#tbGo').onclick = async e => {
      const t = root.querySelector('#tbT').value.trim() || T('طاولة عمل', 'A work table'), n = root.querySelector('#tbN').value.trim();
      if (!n) { root.querySelector('#tbN').focus(); return toast(T('اكتب اسمك', 'Write your name'), 1); }
      store.set('name', n); e.currentTarget.disabled = true;
      try { await fb(); const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
        await db.ref('ws/' + id + '/meta').set({ host: uid, t, at: TS(), open: true }); history.pushState(null, '', '?t=' + id); open(id); }
      catch (er) { e.currentTarget.disabled = false; toast(T('تعذّر فتح الطاولة. تأكد من الإنترنت.', 'Could not open the table. Check the internet.'), 1); }
    };
  }

  /* ---------- the table itself ---------- */
  let W = null;
  async function open(id) {
    root.innerHTML = `<p class="tb-wait">${T('لحظة…', 'One moment…')}</p>`;
    try { await fb(); } catch (e) { root.innerHTML = `<p class="tb-wait">${T('تعذّر الاتصال.', 'Could not connect.')}</p>`; return; }
    const ref = db.ref('ws/' + id), meta = (await ref.child('meta').once('value')).val();
    if (!meta) { root.innerHTML = `<p class="tb-wait">${T('لا توجد طاولة بهذا الرابط.', 'No table at this link.')}</p>`; return; }
    let name = store.get('name', '');
    if (!name) name = await askName();
    const list = store.get('list', []).filter(m => m.id !== id); list.unshift({ id, t: meta.t, at: Date.now() }); store.set('list', list.slice(0, 30));
    const [{ Y, QuillBinding }] = await Promise.all([loadLibs(), script('https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js')]);
    const host = meta.host === uid;
    W = { id, ref, meta, host, name, ed: {}, on: {}, off: [] };
    root.innerHTML = `<div class="tb">
      <div class="tb-top"><h2 dir="auto" id="tbTitle"${host ? ' contenteditable="plaintext-only" spellcheck="false"' : ''}>${esc(meta.t)}</h2>
        <div class="tb-acts"><button type="button" class="tb-b" data-k="share">${IC.link}<span>${T('رابط الدعوة', 'Invite link')}</span></button><button type="button" class="tb-b" data-k="ppl">${IC.ppl}<span id="tbN">1</span></button></div></div>
      <div class="tb-ro" id="tbRo" hidden>${IC.lock}<span>${T('للعرض فقط', 'View only')}</span><button type="button" class="tb-b" data-k="ask">${T('اطلب التحرير', 'Ask to edit')}</button></div>
      <div class="tb-tools"><button type="button" class="tb-b" data-k="dict" aria-pressed="false">${IC.mic}<span>${T('إملاء', 'Dictate')}</span></button><button type="button" class="tb-b" data-k="rec" aria-pressed="false">${IC.rec}<span>${T('سجّل وحوّله لنص', 'Record to text')}</span></button><button type="button" class="tb-b" data-k="ai">${IC.spark}<span>${T('المساعد', 'Assistant')}</span></button><button type="button" class="tb-b" data-k="imp">${IC.up}<span>${T('ملف وورد', 'Word file')}</span></button><button type="button" class="tb-b" data-k="exp">${IC.down}<span>${T('صدّر', 'Export')}</span></button>${host ? `<button type="button" class="tb-b" data-k="vote">${IC.vote}<span>${T('تصويت', 'Vote')}</span></button>` : ''}<input type="file" id="tbF" accept=".docx" hidden></div>
      <div class="tb-vote" id="tbVote" hidden></div>
      <div class="tb-paper"><div id="tbEd"></div></div><p class="tb-saved" id="tbSv"></p></div>`;
    const quill = new Quill('#tbEd', { theme: 'snow', placeholder: T('ابدأ الكتابة هنا…', 'Start writing here…'), modules: { toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }, { direction: 'rtl' }], ['link', 'blockquote'], ['clean']], history: { userOnly: true } } });
    W.quill = quill;
    // the shared document: a snapshot, then every change after it, in order
    const doc = new Y.Doc(), text = doc.getText('q');
    const snap = (await ref.child('snap').once('value')).val();
    if (snap && snap.d) Y.applyUpdate(doc, unb64(snap.d), 'net');
    W.lastK = snap && snap.k || ''; W.prevK = W.lastK; W.count = 0;
    new QuillBinding(text, quill);
    let q = [], timer = 0;
    const flush = () => { timer = 0; if (!q.length) return; const u = q.length > 1 ? Y.mergeUpdates(q) : q[0]; q = []; ref.child('u').push({ d: b64(u), by: uid, t: TS() }).then(() => saved(true)).catch(() => { saved(false); }); };
    doc.on('update', (u, origin) => { if (origin === 'net') return; q.push(u); saved(null); if (!timer) timer = setTimeout(flush, 250); });
    const uq = W.lastK ? ref.child('u').orderByKey().startAfter(W.lastK) : ref.child('u').orderByKey();
    const onU = s => { const v = s.val() || {}; W.lastK = s.key; W.count++; try { Y.applyUpdate(doc, unb64(v.d), 'net'); } catch (e) {} };
    uq.on('child_added', onU); W.off.push(() => uq.off('child_added', onU));
    W.doc = doc; W.Y = Y;
    // fresh document: start right to left for Arabic
    setTimeout(() => { if (isAr() && quill.getLength() <= 1 && can()) { quill.formatLine(0, 1, { direction: 'rtl', align: 'right' }, 'api'); } }, 900);
    // who is here, and who may write
    const me = ref.child('on/' + uid); me.set({ n: name, at: TS() }); me.onDisconnect().remove();
    const onP = s => { W.on = s.val() || {}; people(); }; ref.child('on').on('value', onP); W.off.push(() => ref.child('on').off('value', onP));
    const onE = s => { W.ed = s.val() || {}; perm(); people(); }; ref.child('ed').on('value', onE); W.off.push(() => ref.child('ed').off('value', onE));
    const onV = s => { W.vote = s.val(); if (W.vote && W.vote.vn) W.vn = W.vote.vn; voteCard(); }; ref.child('vote').on('value', onV); W.off.push(() => ref.child('vote').off('value', onV));
    const onVV = s => { W.vv = s.val() || {}; voteCard(); }; ref.child('vv').on('value', onVV); W.off.push(() => ref.child('vv').off('value', onVV));
    const onM = s => { W.meta = s.val() || W.meta; const h = root.querySelector('#tbTitle'); if (h && document.activeElement !== h) h.textContent = W.meta.t || ''; perm(); people(); }; ref.child('meta').on('value', onM); W.off.push(() => ref.child('meta').off('value', onM));
    if (host) { const ti = root.querySelector('#tbTitle'); ti.onblur = () => { const t = ti.textContent.trim().slice(0, 80); if (t && t !== W.meta.t) ref.child('meta/t').set(t); }; ti.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ti.blur(); } }; setInterval(compact, 120000); setTimeout(compact, 15000); }
    if (window.AV) { if (host) ref.child('av/on').once('value').then(x => { if (x.val() == null) ref.child('av/on').set(true); }).catch(() => {}); AV.attach({ ref: ref.child('av'), uid, name, host, hostUid: meta.host }); }
    root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => ACT[b.dataset.k](b));
    root.querySelector('#tbF').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importWord(f); };
    perm();
  }
  const can = () => W && (W.host || (W.meta && W.meta.open) || W.ed[uid] === true);
  function perm() { if (!W || !W.quill) return; const ok = can(); W.quill.enable(ok); root.querySelector('#tbRo').hidden = ok; root.querySelectorAll('[data-k=dict],[data-k=rec],[data-k=imp]').forEach(b => { b.disabled = !ok; }); }
  function saved(ok) { const e = root.querySelector('#tbSv'); if (!e) return; e.textContent = ok == null ? T('يحفظ…', 'Saving…') : ok ? T('محفوظ', 'Saved') : T('تعذّر الحفظ؛ تحقق من الإنترنت', 'Not saved; check the internet'); e.classList.toggle('bad', ok === false); }
  // the host keeps the record short: the whole document becomes one snapshot, and changes older than the snapshot before it are cleared
  async function compact() {
    if (!W || !W.host || W.count < 150) return;
    const k = W.lastK, d = b64(W.Y.encodeStateAsUpdate(W.doc)), old = W.prevK;
    try { await W.ref.child('snap').set({ d, k, at: TS() }); W.count = 0;
      if (old) { const s = await W.ref.child('u').orderByKey().endAt(old).once('value'); const up = {}; s.forEach(c => { up[c.key] = null; }); if (Object.keys(up).length) await W.ref.child('u').update(up); }
      W.prevK = k; } catch (e) {}
  }
  function askName() {
    return new Promise(r => { root.innerHTML = `<div class="tb-start"><div class="tb-new"><label><span>${T('اسمك', 'Your name')}</span><input id="tbN" maxlength="30" dir="auto"></label><button type="button" class="btn solid" id="tbGo">${T('ادخل الطاولة', 'Join the table')}</button></div></div>`;
      const i = root.querySelector('#tbN'); i.focus(); const go = () => { const n = i.value.trim(); if (!n) return; store.set('name', n); r(n); }; root.querySelector('#tbGo').onclick = go; i.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  }

  /* ---------- people: the host lets everyone write, or picks who ---------- */
  function people() {
    const n = root.querySelector('#tbN'); if (n) n.textContent = Object.keys(W.on).length || 1;
    const sh = document.querySelector('.tb-sheet.ppl'); if (sh) pplSheet(sh);
  }
  function sheet(cls, html) { document.querySelectorAll('.tb-sheet').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'tb-sheet ' + cls; d.innerHTML = `<div class="tb-sh" role="dialog">${html}</div>`; d.onclick = e => { if (e.target === d || e.target.closest('[data-x]')) d.remove(); }; document.body.appendChild(d); return d; }
  function pplSheet(d) {
    const ids = Object.keys(W.on), H = W.meta.host;
    const html = `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('على الطاولة', 'At the table')}</h3>
      ${W.host ? `<label class="tb-sw"><input type="checkbox" id="tbOpen"${W.meta.open ? ' checked' : ''}> ${T('الكل يقدر يكتب', 'Everyone can write')}</label>` : ''}
      <ul class="tb-ppl">${ids.map((u, i) => { const v = W.on[u] || {}, w = u === H || W.meta.open || W.ed[u] === true; return `<li style="--c:${COL[i % COL.length]}"><b dir="auto">${esc(v.n || '')}</b><small>${u === H ? T('المضيف', 'Host') : w ? T('يكتب', 'Writes') : v.req ? T('يطلب التحرير', 'Asks to edit') : T('يشاهد', 'Views')}${u === uid ? ' · ' + T('أنت', 'you') : ''}</small>${W.host && u !== H && !W.meta.open ? `<button type="button" class="tb-b${v.req && !w ? ' hot' : ''}" data-ed="${u}">${W.ed[u] ? T('للعرض فقط', 'View only') : T('اسمح له بالكتابة', 'Let them write')}</button>` : ''}</li>`; }).join('')}</ul>`;
    if (!d) d = sheet('ppl', html); else d.querySelector('.tb-sh').innerHTML = html;
    const o = d.querySelector('#tbOpen'); if (o) o.onchange = () => W.ref.child('meta/open').set(o.checked);
    d.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { const u = b.dataset.ed; W.ref.child('ed/' + u).set(W.ed[u] ? null : true); });
  }

  /* ---------- speech: dictation as you speak, or a recording the assistant writes out ---------- */
  let rec = null, mr = null;
  function dictate(btn) {
    if (rec) { rec.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast(T('المتصفح لا يدعم الإملاء؛ جرّب «سجّل وحوّله لنص».', 'This browser has no dictation; try “Record to text”.'), 1);
    rec = new SR(); rec.lang = isAr() ? 'ar-SA' : 'en-US'; rec.continuous = true; rec.interimResults = true;
    const q = W.quill; let at = (q.getSelection(true) || { index: q.getLength() - 1 }).index, live = 0;
    rec.onresult = e => { let fin = '', mid = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else mid += t; }
      if (live) { q.deleteText(at, live, 'user'); live = 0; }
      if (fin) { const t = fin.trim() + ' '; q.insertText(at, t, 'user'); at += t.length; }
      if (mid) { q.insertText(at, mid, { color: '#8a90a8' }, 'user'); live = mid.length; } };
    rec.onend = () => { if (live) q.deleteText(at, live, 'user'); rec = null; btn.setAttribute('aria-pressed', 'false'); btn.querySelector('span').textContent = T('إملاء', 'Dictate'); };
    rec.onerror = e => { if (e.error === 'not-allowed') toast(T('اسمح للمتصفح باستخدام المايك.', 'Allow the microphone.'), 1); };
    rec.start(); btn.setAttribute('aria-pressed', 'true'); btn.querySelector('span').textContent = T('أوقف الإملاء', 'Stop dictating');
  }
  async function record(btn) {
    if (mr) { mr.stop(); return; }
    let s; try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast(T('اسمح للمتصفح باستخدام المايك.', 'Allow the microphone.'), 1); }
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    const parts = []; mr = new MediaRecorder(s, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    const t0 = Date.now(), lab = btn.querySelector('span'), tick = setInterval(() => { const x = Math.floor((Date.now() - t0) / 1000); lab.textContent = T('أوقف', 'Stop') + ' ' + Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); if (x >= 1500) mr.stop(); }, 500);
    mr.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    mr.onstop = async () => { clearInterval(tick); s.getTracks().forEach(t => t.stop()); mr = null; btn.setAttribute('aria-pressed', 'false'); lab.textContent = T('يكتبه المساعد…', 'Writing it out…'); btn.disabled = true;
      try { const blob = new Blob(parts, { type: (type || 'audio/webm').split(';')[0] }), data = b64(new Uint8Array(await blob.arrayBuffer()));
        const out = await ai([{ inlineData: { mimeType: blob.type, data } }, { text: T('اكتب نص هذا التسجيل كما قيل بدقة، بالعربية الفصحى الميسرة مع الحفاظ على المعنى، وقسّمه إلى فقرات. إن تعدد المتحدثون فابدأ كل مداخلة بـ «متحدث ١:» وهكذا. لا تضف شيئًا لم يُقل. أعد النص فقط.', 'Transcribe this recording accurately, in paragraphs. If several people speak, start each turn with “Speaker 1:” and so on. Add nothing that was not said. Return only the text.') }]);
        preview(T('نص التسجيل', 'The recording, in text'), out); }
      catch (e) { toast(T('تعذّر تحويل التسجيل. حاول بتسجيل أقصر.', 'Could not transcribe; try a shorter recording.'), 1); }
      btn.disabled = false; lab.textContent = T('سجّل وحوّله لنص', 'Record to text'); };
    mr.start(1000); btn.setAttribute('aria-pressed', 'true');
  }

  /* ---------- the assistant ---------- */
  const AI_V = '11.10.0', AI_KEY = '6Le4gQsuAAAAAE3jS1mLgG9B2XT8AucvEecF6Kp4', AI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-flash-latest'];
  let aiMk, aiModel;
  async function ai(parts) {
    if (window.__tbAI) return window.__tbAI(parts);
    if (!aiMk) {
      const u = n => `https://www.gstatic.com/firebasejs/${AI_V}/firebase-${n}.js`;
      const [{ initializeApp, getApps }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, VertexAIBackend }] = await Promise.all([import(u('app')), import(u('app-check')), import(u('ai'))]);
      const app = getApps().find(a => a.name === 'mdai') || initializeApp(window.MD_CFG, 'mdai');
      try { initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(AI_KEY), isTokenAutoRefreshEnabled: false }); } catch (e) {}
      const g = getAI(app, { backend: new VertexAIBackend('global') });
      aiMk = m => getGenerativeModel(g, { model: m, generationConfig: { temperature: 0.4 } });
    }
    for (let k = aiModel ? aiModel.k : 0; k < AI_MODELS.length; k++) {
      try { const m = aiModel && aiModel.k === k ? aiModel.m : aiMk(AI_MODELS[k]); const r = await m.generateContent(parts); aiModel = { k, m }; return r.response.text().trim(); }
      catch (e) { if (!/not.?found|404|not supported/i.test(String(e && e.message))) throw e; aiModel = null; }
    }
    throw new Error('no model');
  }
  const ASK = () => [
    ['sum', T('ملخص', 'Summary'), T('لخّص المستند في نقاط قصيرة واضحة تشمل أهم ما فيه.', 'Summarise the document in short clear points.')],
    ['min', T('محضر اجتماع', 'Meeting minutes'), T('حوّل المستند إلى محضر اجتماع رسمي: الموضوع، النقاط التي نوقشت، القرارات، ثم التوصيات. لا تخترع أسماء أو تواريخ غير موجودة.', 'Turn the document into formal minutes: subject, points discussed, decisions, recommendations. Do not invent names or dates.')],
    ['task', T('المهام', 'Tasks'), T('استخرج المهام المطلوبة في قائمة مرقمة: المهمة، ومن يتولاها إن ذُكر، والموعد إن ذُكر.', 'List the tasks: the task, who takes it if named, and the date if given.')],
    ['fix', T('حسّن الصياغة', 'Polish the wording'), T('حسّن صياغة النص لغويًا وأسلوبيًا مع الحفاظ على المعنى وصوت الكاتب، وأعد النص المحسّن فقط.', 'Polish the wording, keeping the meaning and the writer’s voice; return only the text.')]
  ];
  function aiSheet() {
    const q = W.quill, sel = q.getSelection(), has = sel && sel.length > 0;
    const d = sheet('ai', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('المساعد', 'The assistant')}</h3><p class="tb-hint">${has ? T('على النص المحدد', 'On the selected text') : T('على المستند كله', 'On the whole document')}</p>
      <div class="tb-asks">${ASK().map(([k, l]) => `<button type="button" class="tb-b" data-a="${k}">${l}</button>`).join('')}</div>
      <label class="tb-own"><span>${T('أو اطلب ما تريد', 'Or ask for anything')}</span><textarea id="tbAsk" rows="2" dir="auto" placeholder="${T('مثلًا: اقترح ثلاثة عناوين، أو ترجم إلى الإنجليزية', 'e.g. suggest three titles, or translate into Arabic')}"></textarea></label><button type="button" class="btn solid" data-a="own">${T('اطلب', 'Ask')}</button>`);
    d.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      const k = b.dataset.a, txt = has ? q.getText(sel.index, sel.length) : q.getText(); if (!txt.trim()) return toast(T('المستند فارغ', 'The document is empty'), 1);
      const how = k === 'own' ? d.querySelector('#tbAsk').value.trim() : ASK().find(a => a[0] === k)[2]; if (!how) return;
      d.querySelectorAll('button').forEach(x => { x.disabled = true; }); b.textContent = T('يكتب…', 'Writing…');
      try { const out = await ai([{ text: `${how}\n${T('اكتب بلغة النص نفسه. نصًا عاديًا بلا رموز Markdown، والعناوين في سطر مستقل.', 'Write in the text’s own language. Plain text, no Markdown; headings on their own line.')}\n\n---\n${txt.slice(0, 60000)}` }]); d.remove(); preview(ASK().concat([['own', T('المساعد', 'Assistant')]]).find(a => a[0] === k)[1], out, k === 'fix' && has ? sel : null); }
      catch (e) { d.remove(); toast(T('تعذّر الوصول للمساعد. حاول بعد قليل.', 'Could not reach the assistant. Try again shortly.'), 1); }
    });
  }
  // what the assistant wrote: look first, then put it in the document
  function preview(title, out, replace) {
    out = String(out || '').replace(/^```\w*\n?|```$/g, '').replace(/\*\*/g, '').trim();
    const d = sheet('pv', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${esc(title)}</h3><div class="tb-out" dir="auto" contenteditable="plaintext-only">${esc(out)}</div>
      <div class="tb-row">${can() ? `<button type="button" class="btn solid" data-p="${replace ? 'rep' : 'end'}">${replace ? T('استبدل النص المحدد', 'Replace the selection') : T('أضفه آخر المستند', 'Add it at the end')}</button>${replace ? '' : `<button type="button" class="btn ghost" data-p="here">${T('أضفه مكان المؤشر', 'Add it at the cursor')}</button>`}` : ''}<button type="button" class="btn ghost" data-p="copy">${T('انسخ', 'Copy')}</button></div>`);
    const at0 = (W.quill.getSelection() || { index: W.quill.getLength() - 1 }).index;
    d.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const t = d.querySelector('.tb-out').innerText.trim(), q = W.quill, k = b.dataset.p;
      if (k === 'copy') { navigator.clipboard.writeText(t).then(() => toast(T('نُسخ', 'Copied'))); return; }
      if (k === 'rep') { q.deleteText(replace.index, replace.length, 'user'); q.insertText(replace.index, t, 'user'); }
      else { const at = k === 'here' ? at0 : q.getLength() - 1, pre = k === 'end' ? '\n' : ''; q.insertText(at, pre + title + '\n', { bold: true }, 'user'); q.insertText(at + pre.length + title.length + 1, t + '\n', { bold: false }, 'user'); }
      d.remove(); toast(T('أُضيف إلى المستند', 'Added to the document'));
    });
  }

  /* ---------- Word in, Word and PDF out ---------- */
  async function importWord(f) {
    try { await script('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'); const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
      const q = W.quill, empty = q.getLength() <= 1;
      const go = mode => { if (mode === 'rep') q.setText('', 'user'); const at = mode === 'here' ? (q.getSelection() || { index: q.getLength() - 1 }).index : mode === 'rep' ? 0 : q.getLength() - 1; q.clipboard.dangerouslyPasteHTML(at, r.value, 'user'); toast(T('دخل الملف إلى الطاولة', 'The file is on the table')); };
      if (empty) return go('rep');
      const d = sheet('imp', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3 dir="auto">${esc(f.name)}</h3><div class="tb-row"><button type="button" class="btn solid" data-m="end">${T('أضفه آخر المستند', 'Add at the end')}</button><button type="button" class="btn ghost" data-m="here">${T('مكان المؤشر', 'At the cursor')}</button><button type="button" class="btn ghost" data-m="rep">${T('استبدل المستند كله', 'Replace the whole document')}</button></div>`);
      d.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { if (b.dataset.m === 'rep' && !confirm(T('يُستبدل المستند كله للجميع؟', 'Replace the whole document for everyone?'))) return; d.remove(); go(b.dataset.m); });
    } catch (e) { toast(T('تعذّرت قراءة الملف. تأكد أنه بصيغة docx.', 'Could not read the file. Is it a .docx?'), 1); }
  }
  const page = body => `<!doctype html><html lang="${isAr() ? 'ar' : 'en'}" dir="${isAr() ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(W.meta.t)}</title><style>body{font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;line-height:1.7;max-width:780px;margin:32px auto;padding:0 24px;color:#111}h1{font-size:22pt}.ql-align-center{text-align:center}.ql-align-right{text-align:right}.ql-align-left{text-align:left}.ql-align-justify{text-align:justify}.ql-direction-rtl{direction:rtl}</style></head><body><h1>${esc(W.meta.t)}</h1>${body}</body></html>`;
  function expSheet() {
    const d = sheet('exp', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('صدّر', 'Export')}</h3><div class="tb-row"><button type="button" class="btn solid" data-e="doc">Word</button><button type="button" class="btn ghost" data-e="pdf">PDF</button><button type="button" class="btn ghost" data-e="txt">${T('انسخ النص', 'Copy the text')}</button></div>`);
    d.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
      const k = b.dataset.e, html = W.quill.getSemanticHTML ? W.quill.getSemanticHTML() : W.quill.root.innerHTML;
      if (k === 'txt') { navigator.clipboard.writeText(W.quill.getText()).then(() => toast(T('نُسخ', 'Copied'))); return d.remove(); }
      if (k === 'doc') { const h = page(html).replace('<html ', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" '); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + h], { type: 'application/msword' })); a.download = (W.meta.t || 'table').replace(/[\\/:*?"<>|]/g, '') + '.doc'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return d.remove(); }
      const w = window.open('', '_blank'); if (!w) return toast(T('اسمح بالنوافذ المنبثقة للطباعة.', 'Allow pop-ups to print.'), 1); w.document.write(page(html)); w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 400); d.remove();
    });
  }

  /* ---------- a vote in the meeting: the host asks, everyone answers from their own screen, the result goes into the document ---------- */
  const VPRE = () => [T('موافق', 'Agree'), T('غير موافق', 'Disagree'), T('ممتنع', 'Abstain')];
  function voteNew() {
    const d = sheet('vt', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('تصويت جديد', 'A new vote')}</h3>
      <label class="tb-own"><span>${T('على ماذا نصوّت؟', 'What are we voting on?')}</span><textarea id="tbVq" rows="2" dir="auto" placeholder="${T('مثلًا: اعتماد خطة القسم للفصل القادم', 'e.g. approving the plan for next term')}">${esc(selText())}</textarea></label>
      <label class="tb-own"><span>${T('الخيارات، كل خيار في سطر', 'The options, one per line')}</span><textarea id="tbVo" rows="3" dir="auto">${VPRE().join('\n')}</textarea></label>
      <label class="tb-sw"><input type="checkbox" id="tbVn" checked> ${T('تظهر أسماء المصوّتين في النتيجة', 'Show who voted for what')}</label>
      <button type="button" class="btn solid" id="tbVgo">${T('ابدأ التصويت', 'Start the vote')}</button>`);
    d.querySelector('#tbVgo').onclick = async () => {
      const q = d.querySelector('#tbVq').value.trim(), o = d.querySelector('#tbVo').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8);
      if (!q) return d.querySelector('#tbVq').focus(); if (o.length < 2) return toast(T('اكتب خيارين على الأقل', 'Write at least two options'), 1);
      await W.ref.update({ vv: null, vote: { q: q.slice(0, 300), o: o.map(x => x.slice(0, 60)), names: d.querySelector('#tbVn').checked, open: true, at: TS() } }); d.remove();
    };
  }
  const selText = () => { const q = W.quill, s = q && q.getSelection(); return s && s.length ? q.getText(s.index, s.length).trim().slice(0, 300) : ''; };
  function voteCard() {
    const el = root.querySelector('#tbVote'); if (!el) return; const v = W.vote;
    if (!v) { el.hidden = true; return; }
    const vv = W.vv || {}, n = v.o.map((_, j) => Object.keys(vv).filter(u => vv[u] === j)), tot = Object.keys(vv).length, here = Object.keys(W.on).length, mine = vv[uid];
    const max = Math.max(1, ...n.map(a => a.length)), win = v.open ? -1 : n.findIndex(a => a.length === max && n.filter(b => b.length === max).length === 1);
    el.hidden = false;
    el.innerHTML = `<div class="tb-vh"><b>${v.open ? T('تصويت', 'Vote') : T('نتيجة التصويت', 'The result')}</b><span>${T(`صوّت ${tot} من ${here}`, `${tot} of ${here} voted`)}</span>${W.host ? `<span class="tb-vk">${v.open ? `<button type="button" class="tb-b" data-v="close">${T('أغلق التصويت', 'Close the vote')}</button>` : `<button type="button" class="tb-b" data-v="add">${T('أضف النتيجة للمستند', 'Add the result to the document')}</button><button type="button" class="tb-b" data-v="new">${T('تصويت آخر', 'Another vote')}</button>`}<button type="button" class="tb-b" data-v="end" aria-label="${T('إخفاء', 'Hide')}">${IC.x}</button></span>` : ''}</div>
      <p class="tb-vq" dir="auto">${esc(v.q)}</p>
      <div class="tb-vo">${v.o.map((o, j) => `<button type="button" data-o="${j}" aria-pressed="${mine === j}"${v.open ? '' : ' disabled'} class="${win === j ? 'win' : ''}"><span class="tb-vb" style="width:${Math.round(100 * n[j].length / max)}%"></span><b dir="auto">${esc(o)}</b><i>${n[j].length}</i>${!v.open && v.names && n[j].length ? `<small dir="auto">${n[j].map(u => esc((W.on[u] || {}).n || (W.vn || {})[u] || '')).filter(Boolean).join(T('، ', ', '))}</small>` : ''}</button>`).join('')}</div>
      ${v.open ? `<p class="tb-hint">${mine != null ? T('وصل صوتك، وتقدر تغيّره حتى يُغلق التصويت', 'Your vote is in; you can change it until the vote closes') : T('اختر إجابتك', 'Choose your answer')}</p>` : ''}`;
    el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { W.ref.child('vv/' + uid).set(+b.dataset.o).catch(() => toast(T('تعذّر التصويت', 'Could not vote'), 1)); });
    el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const k = b.dataset.v;
      if (k === 'close') { W.vn = Object.fromEntries(Object.keys(vv).map(u => [u, (W.on[u] || {}).n || ''])); W.ref.child('vote/open').set(false); W.ref.child('vote/vn').set(W.vn); }
      if (k === 'new') voteNew();
      if (k === 'end') W.ref.update({ vote: null, vv: null });
      if (k === 'add') { const q = W.quill, names = v.vn || {}, line = v.o.map((o, j) => `${o}: ${n[j].length}${v.names && n[j].length ? ' (' + n[j].map(u => names[u] || (W.on[u] || {}).n || '').filter(Boolean).join(T('، ', ', ')) + ')' : ''}`).join(T('، ', ', '));
        const at = q.getLength() - 1, h = T('التصويت: ', 'Vote: ') + v.q, r = (win >= 0 ? T('النتيجة: ', 'Result: ') + v.o[win] + ' — ' : '') + line;
        q.insertText(at, '\n' + h + '\n', { bold: true }, 'user'); q.insertText(at + h.length + 2, r + '\n', { bold: false }, 'user'); toast(T('أُضيفت النتيجة للمستند', 'The result is in the document')); }
    });
  }

  const ACT = {
    vote: () => W.vote && W.vote.open ? toast(T('أغلق التصويت الحالي أولًا', 'Close the current vote first'), 1) : voteNew(),
    share: async () => { const url = location.origin + location.pathname + '?t=' + W.id, text = T(`تعال للطاولة: ${W.meta.t}\n`, `Join the table: ${W.meta.t}\n`) + url; try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(url); toast(T('نُسخ رابط الدعوة', 'Invite link copied')); } } catch (e) {} },
    ppl: () => pplSheet(), ask: b => { W.ref.child('on/' + uid + '/req').set(1); b.disabled = true; b.textContent = T('وصل طلبك للمضيف', 'Sent to the host'); },
    dict: dictate, rec: record, ai: aiSheet, imp: () => root.querySelector('#tbF').click(), exp: expSheet
  };

  const t = new URLSearchParams(location.search).get('t');
  if (t && /^[a-z0-9]{6,20}$/.test(t)) open(t); else home();
})();

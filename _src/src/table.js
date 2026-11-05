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
    pen: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>'),
    sug: SV('<path d="M4 6h10M4 12h7M4 18h5"/><path d="M15 15l2 2 4-4"/>'),
    vote: SV('<path d="M4 13h16v7H4zM8 13l1.5-9h5L16 13"/><path d="M10 8.5l1.5 1.5 3-3"/>')
  };
  const COL = ['#2a7fa8', '#b0533a', '#2f7d5b', '#c9822b', '#6b5aa6', '#23336f', '#a23e6b', '#4f7a2a'];
  const NUM = n => isAr() ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n);
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
    root.innerHTML = `<div class="tb-start"><div class="tb-new"><div class="tb-kind" role="radiogroup"><button type="button" data-kind="meet" aria-pressed="true"><b>${T('اجتماع', 'A meeting')}</b><small>${T('جدول أعمال، وطلب الكلمة، وقرار أو تصويت لكل بند، ومحضر يُعدّ تلقائيًا', 'An agenda, the floor, a decision or vote per item, and minutes prepared automatically')}</small></button><button type="button" data-kind="edit" aria-pressed="false"><b>${T('جلسة تحرير', 'A writing session')}</b><small>${T('تحرير مستند واحد بصورة مشتركة', 'Editing one document together')}</small></button></div><label><span>${T('العنوان', 'Title')}</span><input id="tbT" maxlength="80" dir="auto" placeholder="${T('مثال: اجتماع مجلس القسم', 'e.g. Department council meeting')}"></label>
      <label><span>${T('اسمك', 'Your name')}</span><input id="tbN" maxlength="30" dir="auto" value="${esc(store.get('name', ''))}"></label>
      <button type="button" class="btn solid" id="tbGo">${T('ابدأ', 'Start')}</button></div>
      <ul class="tb-feat"><li>${IC.ppl}${T('تحرير جماعي متزامن، مع بيان كاتب كل نص ووضع للاقتراحات يعتمدها المضيف', 'Simultaneous editing, showing who wrote each part, with suggestions the host approves')}</li><li>${IC.vote}${T('إدارة الاجتماع: جدول الأعمال، وطلب الكلمة، والتصويت، والحضور والنصاب', 'Running the meeting: agenda, the floor, votes, attendance and quorum')}</li><li>${IC.mic}${T('الصوت والفيديو، والإملاء، وتحويل التسجيل الصوتي إلى نص', 'Voice and video, dictation, and recordings turned into text')}</li><li>${IC.down}${T('استيراد ملفات وورد وتصديرها وورد أو PDF، ومساعد يُعدّ الملخص والمحضر والمهام', 'Word import, Word or PDF export, and an assistant for the summary, minutes and tasks')}</li></ul>
      ${mine.length ? `<h3>${T('طاولاتك', 'Your tables')}</h3><div class="tb-list">${mine.slice(0, 12).map(m => `<a href="?t=${esc(m.id)}" dir="auto">${esc(m.t || T('بلا عنوان', 'Untitled'))}<small>${new Date(m.at).toLocaleDateString(isAr() ? 'ar-SA-u-ca-gregory' : 'en-GB')}</small></a>`).join('')}</div>` : ''}</div>`;
    let kind = 'meet'; root.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { kind = b.dataset.kind; root.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    root.querySelector('#tbGo').onclick = async e => {
      const t = root.querySelector('#tbT').value.trim() || T('طاولة عمل', 'A work table'), n = root.querySelector('#tbN').value.trim();
      if (!n) { root.querySelector('#tbN').focus(); return toast(T('اكتب اسمك', 'Write your name'), 1); }
      store.set('name', n); e.currentTarget.disabled = true;
      try { await fb(); const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
        await db.ref('ws/' + id + '/meta').set(kind === 'meet' ? { host: uid, t, at: TS(), open: true, sug: true, kind } : { host: uid, t, at: TS(), open: true, kind }); history.pushState(null, '', '?t=' + id); open(id); }
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
      <div class="tb-tools"><button type="button" class="tb-b" data-k="dict" aria-pressed="false">${IC.mic}<span>${T('إملاء', 'Dictate')}</span></button><button type="button" class="tb-b" data-k="rec" aria-pressed="false">${IC.rec}<span>${T('سجّل وحوّله لنص', 'Record to text')}</span></button><button type="button" class="tb-b" data-k="ai">${IC.spark}<span>${T('المساعد', 'Assistant')}</span></button><button type="button" class="tb-b" data-k="imp">${IC.up}<span>${T('ملف وورد', 'Word file')}</span></button><button type="button" class="tb-b" data-k="exp">${IC.down}<span>${T('صدّر', 'Export')}</span></button>${host ? `<button type="button" class="tb-b" data-k="vote">${IC.vote}<span>${T('تصويت', 'Vote')}</span></button>` : ''}<button type="button" class="tb-b" data-k="who" aria-pressed="false">${IC.pen}<span>${T('من كتب؟', 'Who wrote it?')}</span></button><button type="button" class="tb-b" data-k="sug" id="tbSg" hidden>${IC.sug}<span>${T('الاقتراحات', 'Suggestions')} <i id="tbSgN"></i></span></button><input type="file" id="tbF" accept=".docx" hidden></div>
      <div class="tb-ro tb-sgm" id="tbSgm" hidden>${IC.sug}<span>${T('وضع الاقتراحات: تعديلاتك تظهر مقترحة حتى يعتمدها المضيف', 'Suggestion mode: your changes show as suggestions until the host accepts them')}</span></div>
      <div class="tb-vote" id="tbVote" hidden></div>
      <div class="tb-body${meta.kind === 'meet' ? ' meet' : ''}"><aside class="tb-meet" id="tbMeet"${meta.kind === 'meet' ? '' : ' hidden'}></aside><div><div class="tb-spk" id="tbSpk" hidden></div><div class="tb-paper"><div id="tbEd"></div></div><p class="tb-saved" id="tbSv"></p></div></div></div>`;
    { const P = Quill.import('parchment'); Quill.register(new P.ClassAttributor('au', 'tb-au', { scope: P.Scope.INLINE }), true); Quill.register(new P.ClassAttributor('sg', 'tb-sg', { scope: P.Scope.INLINE, whitelist: ['ins', 'del'] }), true); }
    const quill = new Quill('#tbEd', { theme: 'snow', placeholder: T('ابدأ الكتابة هنا…', 'Start writing here…'), modules: { toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }, { direction: 'rtl' }], ['link', 'blockquote'], ['clean']], history: { userOnly: true } } });
    W.quill = quill; W.me = uid.slice(0, 10).replace(/[^A-Za-z0-9]/g, '') || 'x';
    ref.child('au/' + W.me).set(name).catch(() => {});
    const onAu = s => { W.au = s.val() || {}; auStyle(); sugCount(); }; ref.child('au').on('value', onAu); W.off.push(() => ref.child('au').off('value', onAu));
    // every word carries who wrote it; in suggestion mode a member's additions and deletions stay marked until the host accepts them
    quill.on('text-change', (delta, old, src) => { if (src === 'user') mark(delta, old); sugCount(); });
    // in suggestion mode the delete keys strike text through instead of removing it (one's own suggested words are simply removed)
    const strike = (i, n) => { const ops = quill.getContents(i, n).ops; let at = i + n; for (const d of [...ops].reverse()) { const L = lenOf(d), a = d.attributes || {}; at -= L; if (a.sg === 'ins' && a.au === W.me) quill.deleteText(at, L, 'api'); else if (a.sg !== 'del') quill.formatText(at, L, { sg: 'del', au: W.me }, 'api'); } };
    const key = (k, fwd) => { quill.keyboard.addBinding({ key: k }, r => { if (!sugOn() || !can()) return true;
      if (r.length) { strike(r.index, r.length); quill.setSelection(r.index, 0, 'silent'); return false; }
      const i = fwd ? r.index : r.index - 1; if (i < 0 || i >= quill.getLength() - 1) return false;
      const len0 = quill.getLength(); strike(i, 1); const gone = quill.getLength() < len0; quill.setSelection(fwd ? (gone ? r.index : r.index + 1) : i, 0, 'silent'); return false; });
      const arr = quill.keyboard.bindings[k]; if (arr && arr.length > 1) arr.unshift(arr.pop()); };
    key('Backspace', false); key('Delete', true);
    quill.root.addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('[class*="tb-au-"]'); if (!t || !quill.root.classList.contains('tb-who')) return; const k = (t.className.match(/tb-au-([A-Za-z0-9]+)/) || [])[1]; t.title = (t.classList.contains('tb-sg-ins') ? T('اقترح إضافته: ', 'Suggested by ') : t.classList.contains('tb-sg-del') ? T('اقترح حذفه: ', 'Suggested removal by ') : T('كتبه: ', 'Written by ')) + ((W.au || {})[k] || ''); });
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
    if (meta.kind === 'meet') meetStart();
    const onP = s => { W.on = s.val() || {}; people(); }; ref.child('on').on('value', onP); W.off.push(() => ref.child('on').off('value', onP));
    const onE = s => { W.ed = s.val() || {}; perm(); people(); }; ref.child('ed').on('value', onE); W.off.push(() => ref.child('ed').off('value', onE));
    const onV = s => { W.vote = s.val(); if (W.vote && W.vote.vn) W.vn = W.vote.vn; voteCard(); }; ref.child('vote').on('value', onV); W.off.push(() => ref.child('vote').off('value', onV));
    const onVV = s => { W.vv = s.val() || {}; voteCard(); }; ref.child('vv').on('value', onVV); W.off.push(() => ref.child('vv').off('value', onVV));
    const onM = s => { const was = W.meta && JSON.stringify(W.meta.sc); W.meta = s.val() || W.meta; setTimeout(perm, 0); if (W.meta.kind === 'meet') { meetPaint(); if (JSON.stringify(W.meta.sc) !== was) follow(); } const h = root.querySelector('#tbTitle'); if (h && document.activeElement !== h) h.textContent = W.meta.t || ''; perm(); people(); }; ref.child('meta').on('value', onM); W.off.push(() => ref.child('meta').off('value', onM));
    if (host) { const ti = root.querySelector('#tbTitle'); ti.onblur = () => { const t = ti.textContent.trim().slice(0, 80); if (t && t !== W.meta.t) ref.child('meta/t').set(t); }; ti.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ti.blur(); } }; setInterval(compact, 120000); setTimeout(compact, 15000); }
    if (window.AV) { if (host) ref.child('av/on').once('value').then(x => { if (x.val() == null) ref.child('av/on').set(true); }).catch(() => {}); AV.attach({ ref: ref.child('av'), uid, name, host, hostUid: meta.host }); }
    root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => ACT[b.dataset.k](b));
    root.querySelector('#tbF').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importWord(f); };
    perm();
  }
  const can = () => W && (W.host || (W.meta && W.meta.open) || W.ed[uid] === true);
  function perm() { if (!W || !W.quill) return; const ok = can(); const sm = root.querySelector('#tbSgm'); if (sm) sm.hidden = !(ok && sugOn()); W.quill.enable(ok); root.querySelector('#tbRo').hidden = ok; root.querySelectorAll('[data-k=dict],[data-k=rec],[data-k=imp]').forEach(b => { b.disabled = !ok; }); }
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
      ${W.host ? `<label class="tb-sw"><input type="checkbox" id="tbOpen"${W.meta.open ? ' checked' : ''}> ${T('الكل يقدر يكتب', 'Everyone can write')}</label><label class="tb-sw"><input type="checkbox" id="tbSug"${W.meta.sug ? ' checked' : ''}> ${T('وضع الاقتراحات: تعديلات الأعضاء تظهر مقترحة حتى تعتمدها', 'Suggestion mode: members’ changes stay suggestions until you accept them')}</label>` : ''}
      <ul class="tb-ppl">${ids.map((u, i) => { const v = W.on[u] || {}, w = u === H || W.meta.open || W.ed[u] === true; return `<li style="--c:${COL[i % COL.length]}"><b dir="auto">${esc(v.n || '')}</b><small>${u === H ? T('المضيف', 'Host') : w ? T('يكتب', 'Writes') : v.req ? T('يطلب التحرير', 'Asks to edit') : T('يشاهد', 'Views')}${u === uid ? ' · ' + T('أنت', 'you') : ''}</small>${W.host && u !== H && !W.meta.open ? `<button type="button" class="tb-b${v.req && !w ? ' hot' : ''}" data-ed="${u}">${W.ed[u] ? T('للعرض فقط', 'View only') : T('اسمح له بالكتابة', 'Let them write')}</button>` : ''}</li>`; }).join('')}</ul>`;
    if (!d) d = sheet('ppl', html); else d.querySelector('.tb-sh').innerHTML = html;
    const o = d.querySelector('#tbOpen'); if (o) o.onchange = () => W.ref.child('meta/open').set(o.checked);
    const sg = d.querySelector('#tbSug'); if (sg) sg.onchange = () => W.ref.child('meta/sug').set(sg.checked);
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
        const out = await ai([{ inlineData: { mimeType: blob.type, data } }, { text: T('اكتب ما قيل في هذا التسجيل نصًا متصلًا بدقة، مع الحفاظ على كلمات المتحدث ومعناه، وتصحيح الإملاء وعلامات الترقيم فقط، وقسّمه إلى فقرات. لا تكتب أسماء أو تسميات للمتحدثين، ولا عناوين، ولا أي إضافة أو تعليق. أعد النص وحده.', 'Write out what is said in this recording as running text, accurately, keeping the speaker’s words and meaning; fix only spelling and punctuation, in paragraphs. No speaker labels, no headings, no additions or comments. Return the text alone.') }]);
        preview(T('نص التسجيل', 'The recording, in text'), out, null, true); }
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
  function preview(title, out, replace, bare) {
    out = String(out || '').replace(/^```\w*\n?|```$/g, '').replace(/\*\*/g, '').trim();
    const d = sheet('pv', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${esc(title)}</h3><div class="tb-out" dir="auto" contenteditable="plaintext-only">${esc(out)}</div>
      <div class="tb-row">${can() ? `<button type="button" class="btn solid" data-p="${replace ? 'rep' : 'end'}">${replace ? T('استبدل النص المحدد', 'Replace the selection') : T('أضفه آخر المستند', 'Add it at the end')}</button>${replace ? '' : `<button type="button" class="btn ghost" data-p="here">${T('أضفه مكان المؤشر', 'Add it at the cursor')}</button>`}` : ''}<button type="button" class="btn ghost" data-p="copy">${T('انسخ', 'Copy')}</button></div>`);
    const at0 = (W.quill.getSelection() || { index: W.quill.getLength() - 1 }).index;
    d.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const t = d.querySelector('.tb-out').innerText.trim(), q = W.quill, k = b.dataset.p;
      if (k === 'copy') { navigator.clipboard.writeText(t).then(() => toast(T('نُسخ', 'Copied'))); return; }
      if (k === 'rep') { q.deleteText(replace.index, replace.length, 'user'); q.insertText(replace.index, t, 'user'); }
      else if (bare) { const at = k === 'here' ? at0 : q.getLength() - 1; q.insertText(at, (k === 'end' && q.getLength() > 1 ? '\n' : '') + t + (k === 'here' ? ' ' : '\n'), 'user'); }
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
  function voteNew(preset) {
    const d = sheet('vt', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('تصويت جديد', 'A new vote')}</h3>
      <label class="tb-own"><span>${T('على ماذا نصوّت؟', 'What are we voting on?')}</span><textarea id="tbVq" rows="2" dir="auto" placeholder="${T('مثلًا: اعتماد خطة القسم للفصل القادم', 'e.g. approving the plan for next term')}">${esc(typeof preset === 'string' ? preset : selText())}</textarea></label>
      <label class="tb-own"><span>${T('الخيارات، كل خيار في سطر', 'The options, one per line')}</span><textarea id="tbVo" rows="3" dir="auto">${VPRE().join('\n')}</textarea></label>
      <label class="tb-sw"><input type="checkbox" id="tbVn" checked> ${T('تظهر أسماء المصوّتين في النتيجة', 'Show who voted for what')}</label>
      <button type="button" class="btn solid" id="tbVgo">${T('ابدأ التصويت', 'Start the vote')}</button>`);
    d.querySelector('#tbVgo').onclick = async () => {
      const q = d.querySelector('#tbVq').value.trim(), o = d.querySelector('#tbVo').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8);
      if (!q) return d.querySelector('#tbVq').focus(); if (o.length < 2) return toast(T('اكتب خيارين على الأقل', 'Write at least two options'), 1);
      if (typeof preset !== 'string') W.voteItem = null;
      await W.ref.update({ vv: null, vote: { item: W.voteItem == null ? null : W.voteItem, q: q.slice(0, 300), o: o.map(x => x.slice(0, 60)), names: d.querySelector('#tbVn').checked, open: true, at: TS() } }); d.remove();
    };
  }
  const selText = () => { const q = W.quill, s = q && q.getSelection(); return s && s.length ? q.getText(s.index, s.length).trim().slice(0, 300) : ''; };
  function voteCard() {
    const el = root.querySelector('#tbVote'); if (!el) return; const v = W.vote;
    if (!v) { el.hidden = true; return; }
    const vv = W.vv || {}, n = v.o.map((_, j) => Object.keys(vv).filter(u => vv[u] === j)), tot = Object.keys(vv).length, here = Object.keys(W.on).length, mine = vv[uid];
    const max = Math.max(1, ...n.map(a => a.length)), win = v.open ? -1 : n.findIndex(a => a.length === max && n.filter(b => b.length === max).length === 1);
    el.hidden = false;
    el.innerHTML = `<div class="tb-vh"><b>${v.open ? T('تصويت', 'Vote') : T('نتيجة التصويت', 'The result')}</b><span>${T(`صوّت ${NUM(tot)} من ${NUM(here)}`, `${tot} of ${here} voted`)}</span>${W.host ? `<span class="tb-vk">${v.open ? `<button type="button" class="tb-b" data-v="close">${T('أغلق التصويت', 'Close the vote')}</button>` : `<button type="button" class="tb-b" data-v="add">${T('أضف النتيجة للمستند', 'Add the result to the document')}</button><button type="button" class="tb-b" data-v="new">${T('تصويت آخر', 'Another vote')}</button>`}<button type="button" class="tb-b" data-v="end" aria-label="${T('إخفاء', 'Hide')}">${IC.x}</button></span>` : ''}</div>
      <p class="tb-vq" dir="auto">${esc(v.q)}</p>
      <div class="tb-vo">${v.o.map((o, j) => `<button type="button" data-o="${j}" aria-pressed="${mine === j}"${v.open ? '' : ' disabled'} class="${win === j ? 'win' : ''}"><span class="tb-vb" style="width:${Math.round(100 * n[j].length / max)}%"></span><b dir="auto">${esc(o)}</b><i>${NUM(n[j].length)}</i>${!v.open && v.names && n[j].length ? `<small dir="auto">${n[j].map(u => esc((W.on[u] || {}).n || (W.vn || {})[u] || '')).filter(Boolean).join(T('، ', ', '))}</small>` : ''}</button>`).join('')}</div>
      ${v.open ? `<p class="tb-hint">${mine != null ? T('وصل صوتك، وتقدر تغيّره حتى يُغلق التصويت', 'Your vote is in; you can change it until the vote closes') : T('اختر إجابتك', 'Choose your answer')}</p>` : ''}`;
    el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { W.ref.child('vv/' + uid).set(+b.dataset.o).catch(() => toast(T('تعذّر التصويت', 'Could not vote'), 1)); });
    el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const k = b.dataset.v;
      if (k === 'close') { W.vn = Object.fromEntries(Object.keys(vv).map(u => [u, (W.on[u] || {}).n || ''])); W.ref.child('vote/open').set(false); W.ref.child('vote/vn').set(W.vn); }
      if (k === 'new') voteNew();
      if (k === 'end') W.ref.update({ vote: null, vv: null });
      if (k === 'add') { const q = W.quill, names = v.vn || {}, line = v.o.map((o, j) => `${o}: ${n[j].length}${v.names && n[j].length ? ' (' + n[j].map(u => names[u] || (W.on[u] || {}).n || '').filter(Boolean).join(T('، ', ', ')) + ')' : ''}`).join(T('، ', ', '));
        const nm = j => n[j].map(u => names[u] || (W.on[u] || {}).n || '').filter(Boolean).join(T('، ', ', '));
        const at = q.getLength() - 1, h = T('التصويت: ', 'Vote: ') + v.q, r = (win >= 0 ? T('النتيجة: ', 'Result: ') + v.o[win] : T('النتيجة: تعادل', 'Result: a tie')) + ' (' + v.o.map((o, j) => `${o} ${NUM(n[j].length)}`).join(T('، ', ', ')) + ')' + (v.names ? '. ' + v.o.map((o, j) => n[j].length ? `${o}: ${nm(j)}` : '').filter(Boolean).join(T('؛ ', '; ')) : '');
        if (v.item != null && W.ag[v.item]) { W.ref.child('ag/' + v.item + '/vote').set(r); toast(T('سُجّلت النتيجة مع البند', 'The result is recorded with the item')); return; }
        q.insertText(at, '\n' + h + '\n', { bold: true }, 'user'); q.insertText(at + h.length + 2, r + '\n', { bold: false }, 'user'); toast(T('أُضيفت النتيجة للمستند', 'The result is in the document')); }
    });
  }

  /* ---------- who wrote what, and suggestions the host accepts or rejects ---------- */
  const sugOn = () => !!(W && W.meta && W.meta.sug && !W.host);
  const lenOf = o => typeof o.insert === 'string' ? o.insert.length : 1;
  function mark(delta, old) {
    const Delta = Quill.import('delta'), sug = sugOn(), out = new Delta(); let pos = 0, oldPos = 0, last = 0, back = null, any = false;
    for (const op of delta.ops) {
      if (op.retain != null) { const n = typeof op.retain === 'number' ? op.retain : 1; pos += n; oldPos += n; }
      else if (op.insert != null) { const n = lenOf(op); out.retain(pos - last).retain(n, { au: W.me, sg: sug ? 'ins' : null }); pos += n; last = pos; any = true; }
      else if (op.delete) {
        if (sug) { back = back == null ? pos : back; for (const d of old.slice(oldPos, oldPos + op.delete).ops) { const a = d.attributes || {}; if (a.sg === 'ins' && a.au === W.me) continue; out.retain(pos - last).insert(d.insert, Object.assign({}, a, a.sg === 'ins' ? {} : { sg: 'del', au: a.sg === 'del' ? a.au : W.me })); pos += lenOf(d); last = pos; any = true; } }
        oldPos += op.delete;
      }
    }
    if (!any) return;
    W.quill.updateContents(out, 'api'); if (back != null) setTimeout(() => W.quill.setSelection(back, 0, 'silent'), 0);
  }
  function auStyle() {
    let st = document.getElementById('tbAuCss'); if (!st) { st = document.createElement('style'); st.id = 'tbAuCss'; document.head.appendChild(st); }
    st.textContent = Object.keys(W.au || {}).map((k, i) => { const c = COL[i % COL.length]; return `.tb-who .tb-au-${k}{background:${c}1f;box-shadow:inset 0 -2px 0 ${c}}.tb-sg-ins.tb-au-${k},.tb-sg-del.tb-au-${k}{text-decoration-color:${c}}`; }).join('');
  }
  // the suggestions in the document, joined where the same person made the same kind of change in one run
  function sugList() {
    const L = []; let i = 0;
    for (const op of W.quill.getContents().ops) { const a = op.attributes || {}, n = lenOf(op); if (a.sg) { const p = L[L.length - 1]; if (p && p.k === a.sg && p.au === a.au && p.i + p.n === i) { p.n += n; p.t += typeof op.insert === 'string' ? op.insert : ''; } else L.push({ k: a.sg, au: a.au, i, n, t: typeof op.insert === 'string' ? op.insert : '' }); } i += n; }
    return L;
  }
  function sugCount() { const b = root.querySelector('#tbSg'); if (!b || !W.quill) return; const n = sugList().length; b.hidden = !n; root.querySelector('#tbSgN').textContent = n || ''; const sh = document.querySelector('.tb-sheet.sg'); if (sh) sugSheet(sh); }
  function settle(list, ok) { const q = W.quill; [...list].sort((a, b) => b.i - a.i).forEach(s => { if ((s.k === 'ins') === ok) q.formatText(s.i, s.n, { sg: false }, 'api'); else q.deleteText(s.i, s.n, 'api'); }); }
  function sugSheet(d) {
    const L = sugList(), mayDo = W.host;
    const html = `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('الاقتراحات', 'Suggestions')} <small>${L.length}</small></h3>
      ${L.length ? `${mayDo ? `<div class="tb-row"><button type="button" class="btn solid" data-s="all1">${T('اقبلها كلها', 'Accept all')}</button><button type="button" class="btn ghost" data-s="all0">${T('ارفضها كلها', 'Reject all')}</button></div>` : ''}
      <ul class="tb-sgl">${L.map((s, j) => `<li><span class="tb-sgk ${s.k}">${s.k === 'ins' ? T('إضافة', 'Added') : T('حذف', 'Removed')}</span><b dir="auto">${esc((W.au || {})[s.au] || '')}</b><q dir="auto" data-go="${j}">${esc(s.t.replace(/\n/g, ' ').slice(0, 140) || '…')}</q>${mayDo ? `<span><button type="button" class="tb-b" data-s="1" data-j="${j}">${T('اقبل', 'Accept')}</button><button type="button" class="tb-b" data-s="0" data-j="${j}">${T('ارفض', 'Reject')}</button></span>` : ''}</li>`).join('')}</ul>` : `<p class="tb-hint">${T('لا توجد اقتراحات معلّقة.', 'No pending suggestions.')}</p>`}`;
    if (!d) d = sheet('sg', html); else d.querySelector('.tb-sh').innerHTML = html;
    d.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s; if (k === 'all1' || k === 'all0') settle(L, k === 'all1'); else settle([L[+b.dataset.j]], k === '1'); });
    d.querySelectorAll('[data-go]').forEach(q => q.onclick = () => { const s = L[+q.dataset.go]; W.quill.setSelection(s.i, s.n, 'silent'); W.quill.scrollSelectionIntoView && W.quill.scrollSelectionIntoView(); });
  }

  /* ---------- the meeting: agenda, the floor, decisions, attendance and quorum, then the minutes ---------- */
  function meetStart() {
    const ref = W.ref; W.ag = []; W.hs = {}; W.att = {};
    ref.child('att/' + uid).transaction(v => v || { n: W.name, at: Date.now() }).catch(() => {});
    [['ag', v => { W.ag = (v || []).filter(Boolean); }], ['hs', v => { W.hs = v || {}; }], ['att', v => { W.att = v || {}; }]].forEach(([k, f]) => { const h = s => { f(s.val()); meetPaint(); }; ref.child(k).on('value', h); W.off.push(() => ref.child(k).off('value', h)); });
    W.tick = setInterval(() => { const c = root.querySelector('#tbClk'); if (c) c.textContent = clk(); }, 1000);
    // follow the host: the host's place in the document is shared, members' screens move with it
    const sc = () => { if (!W.host || !W.meta.fol) return; const r = W.quill.getSelection(); const ed = W.quill.root, f = ed.scrollHeight > ed.clientHeight ? ed.scrollTop / (ed.scrollHeight - ed.clientHeight) : 0; W.ref.child('meta/sc').set({ f: Math.round(f * 1000) / 1000, i: r ? r.index : -1 }); };
    let tm = 0; const th = () => { clearTimeout(tm); tm = setTimeout(sc, 250); };
    W.quill.root.addEventListener('scroll', th); window.addEventListener('scroll', th, { passive: true }); W.quill.on('selection-change', th);
    W.followMe = true;
  }
  const clk = () => { const m = W.meta, it = W.ag[m.cur]; if (!it || !m.curAt) return ''; const s = Math.max(0, Math.floor((Date.now() - m.curAt) / 1000)), mm = Math.floor(s / 60); return `${mm}:${String(s % 60).padStart(2, '0')}${it.min ? ' / ' + it.min + ':00' : ''}`; };
  function follow() {
    const m = W.meta; if (W.host || !m.fol || !m.sc || !W.followMe) return;
    if (m.sc.i >= 0) { const b = W.quill.getBounds(m.sc.i); if (b) { const ed = W.quill.root, top = ed.getBoundingClientRect().top + window.scrollY + b.top - 140; window.scrollTo({ top, behavior: 'smooth' }); } }
  }
  function meetPaint() {
    const el = root.querySelector('#tbMeet'); if (!el || !W.meta || W.meta.kind !== 'meet') return;
    const ae = document.activeElement; if (el.contains(ae) && /TEXTAREA|INPUT/.test(ae.tagName) && ae.type !== 'checkbox') { if (!W.mpWait) { W.mpWait = true; ae.addEventListener('blur', () => { W.mpWait = false; setTimeout(meetPaint, 60); }, { once: true }); } return; }
    const m = W.meta, H = W.host, ag = W.ag, cur = m.cur, att = W.att, here = Object.keys(att).length, need = m.need || 0, quorum = need ? here > need / 2 : null;
    const hs = Object.entries(W.hs).sort((a, b) => a[1] - b[1]), myHand = W.hs[uid] != null, spk = m.spk && (W.on[m.spk] || att[m.spk] || {}).n;
    const sp = root.querySelector('#tbSpk'); if (sp) { sp.hidden = !spk; sp.innerHTML = spk ? `${IC.mic}<span>${T('الكلمة لـ', 'The floor: ')}<b dir="auto">${esc(spk)}</b></span>${H ? `<button type="button" class="tb-b" data-m="spk0">${T('انتهت كلمته', 'Done')}</button>` : ''}` : ''; }
    el.innerHTML = `<div class="tb-mh"><b>${T('جدول الأعمال', 'The agenda')}</b>${H ? `<button type="button" class="tb-b" data-m="add">${T('أضف بندًا', 'Add an item')}</button>` : ''}</div>
      <ol class="tb-ag">${ag.map((it, i) => `<li class="${i === cur ? 'on' : ''}${it.dec ? ' done' : ''}"><button type="button" class="tb-agt" data-m="go" data-i="${i}"${H ? '' : ' disabled'}><i>${NUM(i + 1)}</i><span dir="auto">${esc(it.t)}</span>${it.min ? `<small>${NUM(it.min)} ${T('د', 'm')}</small>` : ''}</button>
        ${i === cur ? `<div class="tb-agc"><span class="tb-clk" id="tbClk" dir="ltr">${clk()}</span>${H ? `<span class="tb-agk"><button type="button" class="tb-b" data-m="ed" data-i="${i}">${T('عدّل', 'Edit')}</button><button type="button" class="tb-b" data-m="vote" data-i="${i}">${T('تصويت', 'Vote')}</button>${i < ag.length - 1 ? `<button type="button" class="tb-b" data-m="go" data-i="${i + 1}">${T('البند التالي', 'Next item')}</button>` : ''}</span>` : ''}</div>` : ''}
        ${it.dec || (H && i === cur) ? `<div class="tb-dec"><small>${T('القرار', 'Decision')}</small>${H ? `<textarea rows="2" dir="auto" data-dec="${i}" placeholder="${T('اكتب القرار…', 'Write the decision…')}">${esc(it.dec || '')}</textarea>` : `<p dir="auto">${esc(it.dec)}</p>`}${it.vote ? `<p class="tb-vr" dir="auto">${esc(it.vote)}</p>` : ''}</div>` : it.vote ? `<p class="tb-vr" dir="auto">${esc(it.vote)}</p>` : ''}</li>`).join('')}</ol>
      ${!ag.length ? `<p class="tb-hint">${H ? T('أضف بنود الاجتماع، أو الصق قائمة البنود دفعة واحدة.', 'Add the items, or paste the whole list at once.') : T('لم يُضف جدول الأعمال بعد.', 'No agenda yet.')}</p>` : ''}
      <div class="tb-mh"><b>${T('طلب الكلمة', 'The floor')}</b>${!H ? `<button type="button" class="tb-b${myHand ? ' hot' : ''}" data-m="hand">${myHand ? T('أنزل يدك', 'Lower your hand') : T('اطلب الكلمة', 'Ask for the floor')}</button>` : ''}</div>
      ${hs.length ? `<ol class="tb-hs">${hs.map(([u]) => `<li><span dir="auto">${esc((W.on[u] || att[u] || {}).n || '')}</span>${H ? `<button type="button" class="tb-b" data-m="give" data-u="${u}">${T('أعطه الكلمة', 'Give the floor')}</button>` : ''}</li>`).join('')}</ol>` : `<p class="tb-hint">${T('لا طلبات', 'No requests')}</p>`}
      <div class="tb-mh"><b>${T('الحضور', 'Attendance')}</b><span class="tb-q${quorum === true ? ' ok' : quorum === false ? ' no' : ''}">${need ? T(`${NUM(here)} من ${NUM(need)}`, `${here} of ${need}`) + ' · ' + (quorum ? T('النصاب مكتمل', 'Quorum met') : T('النصاب غير مكتمل', 'No quorum')) : here}</span></div>
      <p class="tb-att" dir="auto">${Object.values(att).map(a => esc(a.n)).join(T('، ', ', '))}</p>
      ${H ? `<label class="tb-need"><span>${T('عدد الأعضاء', 'Members')}</span><input type="number" min="0" max="200" data-m="need" value="${need || ''}"></label>
      <label class="tb-sw"><input type="checkbox" data-m="fol"${m.fol ? ' checked' : ''}> ${T('تابعوني: شاشات الأعضاء تنتقل مع مكانك في المستند', 'Follow me: members’ screens move with you')}</label>
      <button type="button" class="btn solid" data-m="min">${T('اكتب المحضر', 'Write the minutes')}</button>` : m.fol ? `<label class="tb-sw"><input type="checkbox" data-m="me"${W.followMe ? ' checked' : ''}> ${T('تابع المضيف', 'Follow the host')}</label>` : ''}`;
    el.querySelectorAll('[data-m]').forEach(b => { const k = b.dataset.m;
      if (k === 'need') return b.onchange = () => W.ref.child('meta/need').set(Math.max(0, +b.value || 0) || null);
      if (k === 'fol') return b.onchange = () => W.ref.child('meta/fol').set(b.checked);
      if (k === 'me') return b.onchange = () => { W.followMe = b.checked; follow(); };
      b.onclick = () => MEET[k](b); });
    el.querySelectorAll('[data-dec]').forEach(t => t.onchange = () => W.ref.child('ag/' + t.dataset.dec + '/dec').set(t.value.trim() || null));
    if (sp) sp.querySelectorAll('[data-m]').forEach(b => b.onclick = () => MEET[b.dataset.m](b));
  }
  const MEET = {
    add: () => itemSheet(-1),
    ed: b => itemSheet(+b.dataset.i),
    go: b => { const i = +b.dataset.i; if (!W.host) return; W.ref.child('meta').update({ cur: i, curAt: Date.now() }); },
    vote: b => { const it = W.ag[+b.dataset.i]; if (W.vote && W.vote.open) return toast(T('أغلق التصويت الحالي أولًا', 'Close the current vote first'), 1); W.voteItem = +b.dataset.i; voteNew(it.t); },
    hand: () => W.ref.child('hs/' + uid).set(W.hs[uid] != null ? null : TS()),
    give: b => { W.ref.update({ ['hs/' + b.dataset.u]: null, 'meta/spk': b.dataset.u }); },
    spk0: () => W.ref.child('meta/spk').set(null),
    min: minutes
  };
  function itemSheet(i) {
    const it = i >= 0 ? W.ag[i] : null;
    const d = sheet('it', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${it ? T('البند', 'The item') + ' ' + (i + 1) : T('بنود جديدة', 'New items')}</h3>
      <label class="tb-own"><span>${it ? T('عنوان البند', 'The item') : T('بند في كل سطر', 'One item per line')}</span><textarea id="tbIt" rows="${it ? 2 : 5}" dir="auto">${it ? esc(it.t) : ''}</textarea></label>
      <label class="tb-need"><span>${T('المدة بالدقائق (اختياري)', 'Minutes allowed (optional)')}</span><input type="number" id="tbItM" min="0" max="240" value="${it && it.min || ''}"></label>
      <div class="tb-row"><button type="button" class="btn solid" id="tbItGo">${T('احفظ', 'Save')}</button>${it ? `<button type="button" class="btn ghost" id="tbItUp"${i ? '' : ' disabled'}>${T('قدّمه', 'Move up')}</button><button type="button" class="btn ghost" id="tbItDel">${T('احذف البند', 'Delete the item')}</button>` : ''}</div>`);
    const save = ag => W.ref.child('ag').set(ag.length ? ag : null);
    d.querySelector('#tbItGo').onclick = () => { const v = d.querySelector('#tbIt').value, mn = Math.max(0, +d.querySelector('#tbItM').value || 0) || null, ag = W.ag.slice();
      if (it) { const t = v.trim().slice(0, 200); if (!t) return; ag[i] = Object.assign({}, it, { t, min: mn }); }
      else v.split('\n').map(x => x.replace(/^\s*[\d٠-٩]+[.)\-–]\s*/, '').trim()).filter(Boolean).forEach(t => ag.push({ t: t.slice(0, 200), min: mn }));
      save(ag); d.remove(); if (W.meta.cur == null && ag.length) W.ref.child('meta').update({ cur: 0, curAt: Date.now() }); };
    if (it) { d.querySelector('#tbItDel').onclick = () => { const ag = W.ag.slice(); ag.splice(i, 1); save(ag); d.remove(); }; d.querySelector('#tbItUp').onclick = () => { const ag = W.ag.slice(); [ag[i - 1], ag[i]] = [ag[i], ag[i - 1]]; save(ag); d.remove(); }; }
  }
  // the minutes, built from the agenda, the decisions, the votes and who attended
  function minutes() {
    const m = W.meta, now = new Date(), L = isAr() ? 'ar-SA' : 'en-GB';
    const hij = new Intl.DateTimeFormat(L + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now), gre = new Intl.DateTimeFormat(L + '-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    const att = Object.values(W.att).map(a => a.n), need = m.need || 0;
    const lines = [[m.t, { header: 1 }], [`${T('التاريخ', 'Date')}: ${hij} ${T('الموافق', '—')} ${gre}`, {}], [`${T('الحضور', 'Present')} (${NUM(att.length)}${need ? T(' من ', ' of ') + NUM(need) : ''}): ${att.join(T('، ', ', '))}`, {}]];
    if (need) lines.push([att.length > need / 2 ? T('النصاب مكتمل.', 'Quorum met.') : T('النصاب غير مكتمل.', 'No quorum.'), {}]);
    lines.push([T('البنود والقرارات', 'Items and decisions'), { header: 2 }]);
    W.ag.forEach((it, i) => { lines.push([`${NUM(i + 1)}. ${it.t}`, { header: 3 }]); lines.push([`${T('القرار', 'Decision')}: ${it.dec || T('—', '—')}`, {}]); if (it.vote) lines.push([it.vote, {}]); });
    const d = sheet('mn', `<button type="button" class="tb-xb" data-x aria-label="${T('إغلاق', 'Close')}">${IC.x}</button><h3>${T('المحضر', 'The minutes')}</h3><div class="tb-out">${lines.map(([t, f]) => f.header ? `<b>${esc(t)}</b>` : esc(t)).join('<br>')}</div>
      <div class="tb-row"><button type="button" class="btn solid" data-n="end">${T('أضفه آخر المستند', 'Add at the end')}</button><button type="button" class="btn ghost" data-n="top">${T('أضفه أول المستند', 'Add at the top')}</button><a class="btn ghost" href="../sign/index.html" target="_blank" rel="noopener">${T('توقيع المحضر', 'Sign the minutes')}</a></div><p class="tb-hint">${T('بعد إضافته صدّره PDF من «صدّر»، ثم ارفعه في «توقيع المحاضر».', 'Once added, export it as PDF and upload it to “Signing the minutes”.')}</p>`);
    d.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      const Delta = Quill.import('delta'), q = W.quill, at = b.dataset.n === 'top' ? 0 : q.getLength() - 1; let dl = new Delta().retain(at); if (at) dl = dl.insert('\n');
      lines.forEach(([t, f]) => { dl = dl.insert(t, { au: W.me }).insert('\n', Object.assign({ direction: isAr() ? 'rtl' : null, align: isAr() ? 'right' : null }, f)); });
      q.updateContents(dl, 'api'); d.remove(); toast(T('أُضيف المحضر', 'The minutes are in'));
    });
  }

  const ACT = {
    who: b => { const on = !W.quill.root.classList.toggle('tb-who') ? false : true; b.setAttribute('aria-pressed', on); },
    sug: () => sugSheet(),
    vote: () => W.vote && W.vote.open ? toast(T('أغلق التصويت الحالي أولًا', 'Close the current vote first'), 1) : voteNew(),
    share: async () => { const url = location.origin + location.pathname + '?t=' + W.id, text = T(`تعال للطاولة: ${W.meta.t}\n`, `Join the table: ${W.meta.t}\n`) + url; try { if (navigator.share && /iP(hone|ad)|Android/i.test(navigator.userAgent)) await navigator.share({ text }); else { await navigator.clipboard.writeText(url); toast(T('نُسخ رابط الدعوة', 'Invite link copied')); } } catch (e) {} },
    ppl: () => pplSheet(), ask: b => { W.ref.child('on/' + uid + '/req').set(1); b.disabled = true; b.textContent = T('وصل طلبك للمضيف', 'Sent to the host'); },
    dict: dictate, rec: record, ai: aiSheet, imp: () => root.querySelector('#tbF').click(), exp: expSheet
  };

  const t = new URLSearchParams(location.search).get('t');
  if (t && /^[a-z0-9]{6,20}$/.test(t)) open(t); else home();
})();

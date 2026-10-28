/* alsamani.com — one engine for three committee tools, chosen by #ps[data-mode]:
   pass  : passing a decision (agree / reservation / disagree)
   time  : choosing a meeting time (works / maybe / does not work)
   att   : attendance (each attendee records presence; QR for the room) */
(function () {
  const root = document.getElementById('ps');
  if (!root) return;
  const API = root.dataset.api, MODE = root.dataset.mode || 'pass';
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const C = {
    pass: { opts: [['موافق', 'Agree', 'ok'], ['متحفظ', 'Reservation', 'res'], ['غير موافق', 'Disagree', 'no']], item: ['القرار', 'Decision'], add: ['+ إضافة قرار آخر', '+ Add another decision'],
      def: ['تمرير قرار', 'Decision by circulation'], ph: ['مثال: تمرير قرار لجنة الدراسات العليا', 'e.g. Committee decision by circulation'], input: 'textarea', itemPh: ['', ''],
      notes: true, show: ['إظهار النتيجة للأعضاء بعد تصويتهم', 'Show the results to members after they answer'], link: ['رابط التصويت على القرار: ', 'Answer the decision here: '],
      remind: ['نأمل التكرم بالتصويت على', 'Please answer'], done: ['سُجّل رأيك. شكرًا لك.', 'Your answer was recorded. Thank you.'], mine: ['تصويتك', 'Your answer'] },
    time: { opts: [['يناسبني', 'Works', 'ok'], ['ربما', 'Maybe', 'res'], ['لا يناسبني', 'Does not work', 'no']], item: ['الموعد', 'Option'], add: ['+ إضافة موعد آخر', '+ Add another time'],
      def: ['تحديد موعد الاجتماع', 'Meeting time'], ph: ['مثال: الاجتماع الثالث لمجلس القسم', 'e.g. Third department council meeting'], input: 'input', itemPh: ['مثال: الأحد ١٠ نوفمبر · ١٠ صباحًا', 'e.g. Sunday 10 November · 10 am'],
      notes: false, show: ['إظهار الاختيارات للأعضاء بعد تصويتهم', 'Show everyone’s choices to members after they answer'], link: ['اختر المواعيد المناسبة لك: ', 'Choose the times that work for you: '],
      remind: ['نأمل التكرم بتحديد المواعيد المناسبة لـ', 'Please choose your times for'], done: ['سُجّلت اختياراتك. شكرًا لك.', 'Your choices were recorded. Thank you.'], mine: ['اختياراتك', 'Your choices'] },
    att: { opts: [], def: ['تسجيل الحضور', 'Attendance'], ph: ['مثال: الاجتماع الثالث لمجلس القسم', 'e.g. Third department council meeting'],
      show: ['إظهار قائمة الحاضرين للجميع', 'Show the attendance list to everyone'], link: ['سجّل حضورك: ', 'Record your attendance: '],
      remind: ['نأمل تسجيل الحضور في', 'Please record your attendance for'], done: ['سُجّل حضورك. شكرًا لك.', 'Your attendance was recorded. Thank you.'], mine: ['حضورك', 'Your attendance'] }
  }[MODE];
  const optT = k => T(C.opts[k][0], C.opts[k][1]);
  async function call(body, tries) {
    let j;
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 45000);
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ac.signal });
      j = await r.json(); clearTimeout(to);
    } catch (e) { if (body.a === 'pget' && !tries) return call(body, 1); throw e; }
    if (!j.ok) { const e = new Error(j.error); e.code = j.error; throw e; }
    return j;
  }
  const ERR = {
    voted: B('سُجّل هذا الاسم من جهاز آخر. إن كان خطأ فاطلب من المنسق حذفه.', 'This name was recorded from another device. If this is a mistake, ask the coordinator to remove it.'),
    locked: B('أُغلق الرابط.', 'This link is closed.'),
    not_found: B('لم يُعثر على الرابط. ربما حُذف أو انتهت مدته.', 'Not found. It may have been deleted or expired.'),
    bad_name: B('اختر اسمك من القائمة أو اكتبه.', 'Choose or write your name.'),
    bad_ans: B('اختر إجابة لكل بند.', 'Choose an answer for every item.'),
    net: B('تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.', 'Could not connect. Check your connection and try again.')
  };
  const errMsg = e => ERR[e && e.code] || ERR.net;
  const toast = (html, bad) => {
    let t = document.getElementById('psToast');
    if (!t) { t = document.createElement('div'); t.id = 'psToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };
  const copy = async (txt, ok) => { try { await navigator.clipboard.writeText(txt); toast(ok); } catch (e) { prompt('', txt); } };
  const when = t => new Date(t).toLocaleTimeString(isAr() ? 'ar-SA-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  /* ---------- coordinator ---------- */
  function createView() {
    const last = store.get('ps.names', '');
    root.innerHTML = `<div class="sn-card">
      <label class="sn-lbl">${B('العنوان', 'Title')}<input type="text" id="psT" maxlength="200" placeholder="${T(C.ph[0], C.ph[1])}"></label>
      ${MODE === 'att' ? '' : `<div id="psItems"></div><button type="button" class="sn-lnk" id="psAdd">${B(C.add[0], C.add[1])}</button>`}
      <label class="sn-lbl ps-gap">${B('أسماء الأعضاء (اختياري، اسم في كل سطر)', 'Member names (optional, one per line)')}<textarea id="psN" rows="5" placeholder="${T('إن كتبتها يختار كل عضو اسمه من قائمة، ويظهر لك من لم يُجب.', 'If given, members pick their name from a list and you see who has not answered.')}">${esc(last)}</textarea></label>
      <label class="sn-keep"><input type="checkbox" id="psShow"${MODE === 'time' ? ' checked' : ''}> ${B(C.show[0], C.show[1])}</label>
      <div class="sn-two"><button type="button" class="btn solid" id="psGo">${B('إنشاء الرابط', 'Create the link')}</button></div>
      <p class="pt-fine">${B('تُحذف البيانات تلقائيًا بعد ٧ أيام، ويستطيع المنسق حذفها فورًا.', 'Data is deleted automatically after 7 days; the coordinator can delete it at once.')}</p>
    </div>`;
    const box = root.querySelector('#psItems');
    const add = () => { if (!box) return; const n = box.children.length + 1, d = document.createElement('label'); d.className = 'sn-lbl'; d.innerHTML = `${B(C.item[0], C.item[1])} ${n}` + (C.input === 'textarea' ? `<textarea rows="3" maxlength="2000"></textarea>` : `<input type="text" maxlength="200" placeholder="${T(C.itemPh[0], C.itemPh[1])}">`); box.appendChild(d); };
    if (box) { add(); if (MODE === 'time') add(); root.querySelector('#psAdd').onclick = () => { add(); box.lastChild.querySelector('textarea,input').focus(); }; }
    root.querySelector('#psGo').onclick = async ev => {
      const items = box ? [...box.querySelectorAll('textarea,input')].map(t => t.value.trim()).filter(Boolean) : [];
      if (box && !items.length) { toast(B('اكتب بندًا واحدًا على الأقل.', 'Write at least one item.'), 1); return; }
      const raw = root.querySelector('#psN').value, names = raw.split(/\n+/).map(x => x.replace(/^\s*[\d٠-٩]+[\s.\-)]*/, '').trim()).filter(Boolean);
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const j = await call({ a: 'pcreate', mode: MODE, title: root.querySelector('#psT').value.trim(), items, names, showAll: root.querySelector('#psShow').checked });
        store.set('ps.names', raw.trim());
        const keys = store.get('ps.keys', {}); keys[j.id] = j.k; store.set('ps.keys', keys);
        location.href = '?d=' + j.id + '&new=1#k=' + j.k;
      } catch (e) { btn.disabled = false; toast(errMsg(e), 1); }
    };
  }

  /* ---------- members and results ---------- */
  async function view(id) {
    const hk = (location.hash.match(/k=([a-f0-9]+)/) || [])[1], keys = store.get('ps.keys', {});
    if (hk) { keys[id] = hk; store.set('ps.keys', keys); }
    const key = keys[id], mineAll = store.get('ps.mine', {}); let mine = mineAll[id];
    root.innerHTML = `<div class="sn-card sn-load">${B('جارٍ الفتح…', 'Opening…')}</div>`;
    let S;
    try { S = await call({ a: 'pget', id, k: key, name: mine && mine.name, tok: mine && mine.tok }); }
    catch (e) { root.innerHTML = `<div class="sn-card"><p>${errMsg(e)}</p></div>`; return; }
    const admin = !!S.admin, link = location.origin + location.pathname + '?d=' + id, me = store.get('sn.me', '') || '';
    let editing = !S.mine;
    const title = () => S.title || T(C.def[0], C.def[1]);
    function render() {
      const ans = S.mine ? S.mine.ans.slice() : S.items.map(() => null), notes = S.mine ? S.mine.notes.slice() : S.items.map(() => '');
      const share = admin && /new=1/.test(location.search) ? `<div class="sn-card sn-share"><h2>${B('الرابط جاهز', 'The link is ready')}</h2>
        <p>${MODE === 'att' ? B('اعرض الرمز في القاعة ليمسحه الحاضرون، أو أرسل الرابط:', 'Show the code in the room for attendees to scan, or send the link:') : B('أرسله في قروب المجلس أو اللجنة:', 'Send it to the board or committee group:')}</p>
        <div class="sn-link"><input type="text" readonly value="${link}" id="psLink"><button type="button" class="btn solid" id="psCopy">${B('نسخ', 'Copy')}</button><a class="btn ghost" id="psWa" target="_blank" rel="noopener">${B('واتساب', 'WhatsApp')}</a></div>
        <p class="sn-fine">${B('النتيجة تظهر لك في هذا الجهاز. لمتابعتها من جهاز آخر احفظ رابط الإدارة:', 'Results appear on this device. To follow them from another device, keep the management link:')} <button type="button" class="sn-lnk" id="psAdm">${B('نسخ رابط الإدارة', 'Copy management link')}</button></p></div>` : '';
      const head = `<div class="sn-card"><h2>${esc(title())}</h2>${S.locked ? `<p class="ps-closed">${B('أُغلق الرابط.', 'This link is closed.')}</p>` : ''}${admin && MODE === 'att' ? `<div class="sn-two"><button type="button" class="btn ghost" id="psQr">${B('عرض رمز QR للقاعة', 'Show QR code for the room')}</button></div>` : ''}</div>`;
      let form = '';
      if (!S.locked && (editing || !S.mine)) {
        const nameField = S.names.length
          ? `<select id="psName"${S.mine ? ' disabled' : ''}><option value="">${T('— اختر اسمك —', '— choose your name —')}</option>${S.names.map(n => { const done = S.voted.includes(n) && !(S.mine && S.mine.name === n); return `<option${done ? ' disabled' : ''}${(S.mine ? S.mine.name === n : n === me) ? ' selected' : ''}>${esc(n)}${done ? ' ✓' : ''}</option>`; }).join('')}</select>`
          : `<input type="text" id="psName" maxlength="120" value="${esc(S.mine ? S.mine.name : me)}"${S.mine ? ' disabled' : ''}>`;
        form = `<div class="sn-card"><label class="sn-lbl">${B('الاسم', 'Name')}${nameField}</label>
          ${S.items.map((t, i) => `<div class="ps-item"><p class="ps-txt">${S.items.length > 1 && MODE === 'pass' ? `<b>${i + 1}.</b> ` : ''}${esc(t).replace(/\n/g, '<br>')}</p>
            <div class="ps-opts" role="radiogroup">${C.opts.map((o, k) => `<button type="button" role="radio" class="ps-o ps-${o[2]}" data-i="${i}" data-k="${k}" aria-checked="${ans[i] === k}">${B(o[0], o[1])}</button>`).join('')}</div>
            ${C.notes ? `<textarea class="ps-note" data-i="${i}" rows="2" maxlength="500" placeholder="${T('ملاحظة أو سبب التحفظ (اختياري)', 'Note or reason (optional)')}"${ans[i] === 1 || ans[i] === 2 || notes[i] ? '' : ' hidden'}>${esc(notes[i])}</textarea>` : ''}</div>`).join('')}
          <div class="sn-two"><button type="button" class="btn solid" id="psSend">${MODE === 'att' ? B('تسجيل حضوري', 'Record my attendance') : B('إرسال', 'Send')}</button>${S.mine ? `<button type="button" class="btn ghost" id="psCancel">${B('إلغاء', 'Cancel')}</button>` : ''}</div></div>`;
      }
      const mineCard = S.mine && !(editing && !S.locked) ? `<div class="sn-card ps-mine"><h3>${B(C.mine[0], C.mine[1])} · <bdi>${esc(S.mine.name)}</bdi></h3>
        ${MODE === 'att' ? `<p>✓ ${B('سُجّل حضورك الساعة', 'Recorded at')} ${when(S.mine.t)}</p>` : S.items.map((t, i) => `<p><span class="ps-tag ps-${C.opts[S.mine.ans[i]][2]}">${optT(S.mine.ans[i])}</span> ${MODE === 'time' ? esc(t) : S.items.length > 1 ? T('القرار ', 'Decision ') + (i + 1) : ''}${S.mine.notes[i] ? ` — <i>${esc(S.mine.notes[i])}</i>` : ''}</p>`).join('')}
        ${S.locked || MODE === 'att' ? '' : `<button type="button" class="sn-lnk" id="psEdit">${B('تعديل', 'Change')}</button>`}</div>` : '';
      if (admin && form && MODE !== 'att') form = `<details class="sn-card ps-asme"><summary>${B('الإجابة بصفتك عضوًا', 'Answer as a member')}</summary>${form.replace(/^<div class="sn-card">/, '<div>')}</details>`;
      if (admin && form && MODE === 'att') form = `<details class="sn-card ps-asme"><summary>${B('تسجيل حضورك أنت', 'Record your own attendance')}</summary>${form.replace(/^<div class="sn-card">/, '<div>')}</details>`;
      const res = S.votes ? results() : '';
      root.innerHTML = share + head + (admin ? res + form + mineCard : form + mineCard + res);
      bind(ans);
    }
    const missing = () => S.names.filter(n => !S.voted.includes(n));
    // meeting time: the option with most "works", then most "maybe"
    const best = () => { const V = S.votes || []; let b = -1, bs = -1; S.items.forEach((_, i) => { const sc = V.filter(v => v.ans[i] === 0).length * 100 + V.filter(v => v.ans[i] === 1).length; if (sc > bs) { bs = sc; b = i; } }); return V.length ? b : -1; };
    function results() {
      const V = S.votes, miss = missing();
      let body = '';
      if (MODE === 'att') {
        const L = V.slice().sort((a, b) => a.t < b.t ? -1 : 1);
        body = `<ol class="ps-att">${L.map(v => `<li><bdi>${esc(v.name)}</bdi><span>${when(v.t)}</span></li>`).join('')}</ol>`;
      } else {
        const bi = MODE === 'time' ? best() : -1;
        body = S.items.map((t, i) => { const c = [0, 1, 2].map(k => V.filter(v => v.ans[i] === k).length);
          return `<div class="ps-ri${i === bi ? ' ps-best' : ''}">${S.items.length > 1 || MODE === 'time' ? `<p class="ps-txt">${MODE === 'pass' ? `<b>${i + 1}.</b> ` : ''}${esc(t.length > 160 ? t.slice(0, 160) + '…' : t)}${i === bi ? ` <span class="ps-bt">${B('الأنسب', 'Best')}</span>` : ''}</p>` : ''}
            <div class="ps-bar">${c.map((x, k) => x ? `<i class="ps-${C.opts[k][2]}" style="flex:${x}"></i>` : '').join('') || '<i style="flex:1;background:var(--line)"></i>'}</div>
            <p class="ps-cnt">${c.map((x, k) => `<span class="ps-tag ps-${C.opts[k][2]}">${optT(k)} ${x}</span>`).join(' ')}</p></div>`; }).join('');
        body += `<table class="ps-tbl"><thead><tr><th>${B('الاسم', 'Name')}</th>${S.items.map((t, i) => `<th>${MODE === 'time' ? esc(t.length > 24 ? t.slice(0, 24) + '…' : t) : S.items.length > 1 ? i + 1 : B('الرأي', 'Answer')}</th>`).join('')}</tr></thead>
          <tbody>${V.map(v => `<tr><td><bdi>${esc(v.name)}</bdi></td>${v.ans.map((a, i) => `<td><span class="ps-tag ps-${C.opts[a][2]}">${optT(a)}</span>${v.notes[i] ? `<small>${esc(v.notes[i])}</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      return `<div class="sn-card ps-result"><h3>${MODE === 'att' ? B('الحاضرون', 'Present') : B('النتيجة', 'Results')} <span class="ps-n">${V.length}${S.names.length ? ' / ' + S.names.length : ''}</span></h3>${body}
        ${miss.length ? `<p class="ps-miss"><b>${MODE === 'att' ? B('لم يسجّل بعد:', 'Not recorded yet:') : B('لم يُجب بعد:', 'Not answered yet:')}</b> ${miss.map(esc).join('، ')}</p>` : ''}
        ${admin ? `<div class="sn-acts"><button type="button" class="btn solid" id="psPrint">${B('طباعة أو حفظ PDF', 'Print or save as PDF')}</button><button type="button" class="btn ghost" id="psText">${B('نسخ النتيجة نصًا', 'Copy as text')}</button>${miss.length && !S.locked ? `<button type="button" class="btn ghost" id="psRemind">${B('نسخ رسالة تذكير', 'Copy a reminder')}</button>` : ''}<button type="button" class="btn ghost" id="psLock">${S.locked ? B('فتح الرابط', 'Reopen') : B('إغلاق الرابط', 'Close')}</button><button type="button" class="btn ghost sn-danger" id="psDel">${B('حذف', 'Delete')}</button></div>` : ''}
      </div>`;
    }
    function asText() {
      const V = S.votes, L = [title()];
      if (MODE === 'att') { L.push(''); V.slice().sort((a, b) => a.t < b.t ? -1 : 1).forEach((v, i) => L.push((i + 1) + '. ' + v.name + ' (' + when(v.t) + ')')); }
      else {
        S.items.forEach((t, i) => { const c = [0, 1, 2].map(k => V.filter(v => v.ans[i] === k).length); L.push('', (MODE === 'pass' && S.items.length > 1 ? (i + 1) + '. ' : '') + t, C.opts.map((o, k) => optT(k) + ': ' + c[k]).join(' · ')); });
        if (MODE === 'time' && best() >= 0) L.push('', T('الأنسب: ', 'Best: ') + S.items[best()]);
        L.push(''); V.forEach(v => L.push('• ' + v.name + ': ' + v.ans.map((a, i) => optT(a) + (v.notes[i] ? ' (' + v.notes[i] + ')' : '')).join(' / ')));
      }
      const miss = missing(); if (miss.length) L.push('', (MODE === 'att' ? T('لم يسجّل: ', 'Not recorded: ') : T('لم يُجب: ', 'Not answered: ')) + miss.join('، '));
      return L.join('\n');
    }
    function bind(ans) {
      const q = s => root.querySelector(s);
      if (q('#psCopy')) {
        q('#psCopy').onclick = () => copy(link, B('نُسخ الرابط.', 'Link copied.'));
        q('#psAdm').onclick = () => copy(link + '#k=' + key, B('نُسخ رابط الإدارة. لا ترسله في القروب.', 'Management link copied. Do not share it with the group.'));
        q('#psWa').href = 'https://wa.me/?text=' + encodeURIComponent((S.title ? S.title + '\n' : '') + T(C.link[0], C.link[1]) + link);
      }
      if (q('#psQr')) q('#psQr').onclick = qr;
      root.querySelectorAll('.ps-o').forEach(b => b.onclick = () => {
        const i = +b.dataset.i, k = +b.dataset.k; ans[i] = k;
        root.querySelectorAll(`.ps-o[data-i="${i}"]`).forEach(x => x.setAttribute('aria-checked', x === b));
        const n = root.querySelector(`.ps-note[data-i="${i}"]`); if (n && k > 0) n.hidden = false;
      });
      if (q('#psSend')) q('#psSend').onclick = async ev => {
        const name = (q('#psName').value || '').trim();
        if (!name) { toast(ERR.bad_name, 1); return; }
        if (ans.some(a => a === null)) { toast(ERR.bad_ans, 1); return; }
        const notes = S.items.map((_, i) => { const n = root.querySelector(`.ps-note[data-i="${i}"]`); return n ? n.value.trim() : ''; });
        const btn = ev.currentTarget; btn.disabled = true;
        try {
          const j = await call({ a: 'pvote', id, k: key, name, ans, notes, tok: mine && mine.tok });
          mineAll[id] = { name: j.mine.name, tok: j.tok }; store.set('ps.mine', mineAll); store.set('sn.me', j.mine.name); mine = mineAll[id];
          S = j; editing = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); toast(B(C.done[0], C.done[1]));
        } catch (e) { btn.disabled = false; toast(errMsg(e), 1); }
      };
      if (q('#psCancel')) q('#psCancel').onclick = () => { editing = false; render(); };
      if (q('#psEdit')) q('#psEdit').onclick = () => { editing = true; render(); };
      if (!admin || !q('#psText')) return;
      q('#psText').onclick = () => copy(asText(), B('نُسخت النتيجة.', 'Copied.'));
      if (q('#psRemind')) q('#psRemind').onclick = () => copy(`${T(C.remind[0], C.remind[1])} ${title()}:\n${link}\n\n${MODE === 'att' ? T('لم يسجّل بعد:', 'Not recorded yet:') : T('لم يُجب بعد:', 'Not answered yet:')}\n` + missing().map(n => '• ' + n).join('\n'), B('نُسخت رسالة التذكير.', 'Reminder copied.'));
      q('#psLock').onclick = async () => { try { S = await call({ a: 'plock', id, k: key, on: !S.locked }); render(); } catch (e) { toast(errMsg(e), 1); } };
      q('#psDel').onclick = async ev => {
        const b = ev.currentTarget;
        if (!b.dataset.sure) { b.dataset.sure = 1; b.innerHTML = B('اضغط مرة أخرى للحذف النهائي', 'Tap again to delete for good'); return; }
        try { await call({ a: 'pdelete', id, k: key }); delete keys[id]; store.set('ps.keys', keys); location.href = './'; } catch (e) { toast(errMsg(e), 1); }
      };
      q('#psPrint').onclick = printView;
    }
    function qr() {
      const q = qrcode(0, 'M'); q.addData(link); q.make();
      const ov = document.createElement('div'); ov.className = 'ps-qr';
      ov.innerHTML = `<div><h2>${esc(title())}</h2><p>${B('امسح الرمز بكاميرا الجوال لتسجيل حضورك', 'Scan with your phone camera to record your attendance')}</p>${q.createSvgTag({ cellSize: 8, margin: 2, scalable: true })}<p class="ps-qrl" dir="ltr">${esc(link.replace(/^https?:\/\//, ''))}</p><button type="button" class="btn ghost">${B('إغلاق', 'Close')}</button></div>`;
      ov.querySelector('button').onclick = () => ov.remove(); ov.onclick = e => { if (e.target === ov) ov.remove(); };
      document.body.appendChild(ov);
    }
    function printView() {
      const V = S.votes, dir = isAr() ? 'rtl' : 'ltr', dt = new Date().toLocaleDateString(isAr() ? 'ar-SA-u-nu-latn' : 'en-GB');
      let body = '';
      if (MODE === 'att') body = `<table><thead><tr><th>#</th><th>${T('الاسم', 'Name')}</th><th>${T('وقت التسجيل', 'Time')}</th><th>${T('التوقيع', 'Signature')}</th></tr></thead><tbody>${V.slice().sort((a, b) => a.t < b.t ? -1 : 1).map((v, i) => `<tr><td>${i + 1}</td><td>${esc(v.name)}</td><td>${when(v.t)}</td><td style="width:30%"></td></tr>`).join('')}</tbody></table>`;
      else body = S.items.map((t, i) => { const c = [0, 1, 2].map(k => V.filter(v => v.ans[i] === k).length); return `<div class="it"><p>${MODE === 'pass' && S.items.length > 1 ? `<b>${i + 1}.</b> ` : ''}${esc(t).replace(/\n/g, '<br>')}${MODE === 'time' && i === best() ? ` <b>(${T('الأنسب', 'best')})</b>` : ''}</p><p class="c">${C.opts.map((o, k) => optT(k) + ': ' + c[k]).join(' · ')}</p></div>`; }).join('')
        + `<table><thead><tr><th>${T('الاسم', 'Name')}</th>${S.items.map((t, i) => `<th>${MODE === 'time' ? esc(t) : S.items.length > 1 ? T('القرار ', 'Decision ') + (i + 1) : T('الرأي', 'Answer')}</th>`).join('')}</tr></thead><tbody>${V.map(v => `<tr><td>${esc(v.name)}</td>${v.ans.map((a, i) => `<td>${optT(a)}${v.notes[i] ? `<small>${esc(v.notes[i])}</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const miss = missing();
      const html = `<!doctype html><html lang="${isAr() ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title())}</title>
        <style>body{font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;margin:32px;color:#111}h1{font-size:20px;margin:0 0 4px}p.m{color:#555;margin:0 0 18px;font-size:13px}
        .it{margin:14px 0}.it p{margin:0 0 6px;line-height:1.7}.c{font-size:13px;color:#333}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}th,td{border:1px solid #bbb;padding:7px 8px;text-align:start;vertical-align:top}th{background:#f1f1f1}small{display:block;color:#555}@page{margin:16mm}</style></head>
        <body><h1>${esc(title())}</h1><p class="m">${T('التاريخ', 'Date')}: ${dt} · ${MODE === 'att' ? T('عدد الحاضرين', 'Present') : T('عدد المجيبين', 'Answers')}: ${V.length}${S.names.length ? ' / ' + S.names.length : ''}</p>${body}
        ${miss.length ? `<p class="m" style="margin-top:14px">${MODE === 'att' ? T('لم يسجّل', 'Not recorded') : T('لم يُجب', 'Not answered')}: ${miss.map(esc).join('، ')}</p>` : ''}
        <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
      const w = window.open('', '_blank');
      if (!w) { toast(B('اسمح بالنوافذ المنبثقة ثم حاول مجددًا.', 'Allow pop-ups and try again.'), 1); return; }
      w.document.open(); w.document.write(html); w.document.close();
    }
    render();
    if (admin) setInterval(async () => { if (document.hidden || root.querySelector('#psSend') || document.querySelector('.ps-qr')) return; try { S = await call({ a: 'pget', id, k: key, name: mine && mine.name, tok: mine && mine.tok }); render(); } catch (e) {} }, MODE === 'att' ? 8000 : 20000);
  }

  const did = new URLSearchParams(location.search).get('d');
  if (did && /^[a-f0-9]{20}$/.test(did)) view(did); else createView();
})();

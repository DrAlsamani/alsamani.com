/* alsamani.com/tools/pass — passing a decision: each member answers agree / reservation / disagree from one link. */
(function () {
  const root = document.getElementById('ps');
  if (!root) return;
  const API = root.dataset.api;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const OPT = [['موافق', 'Agree', 'ok'], ['متحفظ', 'Reservation', 'res'], ['غير موافق', 'Disagree', 'no']];
  const optT = k => isAr() ? OPT[k][0] : OPT[k][1];
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
    voted: B('سُجّل تصويت بهذا الاسم من جهاز آخر. إن كان خطأ فاطلب من المنسق حذفه.', 'A vote under this name was recorded from another device. If this is a mistake, ask the coordinator to remove it.'),
    locked: B('أُغلق التصويت.', 'Voting is closed.'),
    not_found: B('لم يُعثر على القرار. ربما حُذف أو انتهت مدته.', 'This decision was not found. It may have been deleted or expired.'),
    bad_name: B('اختر اسمك من القائمة.', 'Choose your name from the list.'),
    bad_ans: B('اختر رأيك في كل قرار.', 'Choose your answer for every decision.'),
    net: B('تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.', 'Could not connect. Check your connection and try again.')
  };
  const errMsg = e => ERR[e && e.code] || ERR.net;
  const toast = (html, bad) => {
    let t = document.getElementById('psToast');
    if (!t) { t = document.createElement('div'); t.id = 'psToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };
  const copy = async (txt, ok) => { try { await navigator.clipboard.writeText(txt); toast(ok); } catch (e) { prompt('', txt); } };

  /* ---------- coordinator: write the decision ---------- */
  function createView() {
    const last = store.get('ps.names', '');
    root.innerHTML = `<div class="sn-card">
      <label class="sn-lbl">${B('العنوان', 'Title')}<input type="text" id="psT" maxlength="200" placeholder="${isAr() ? 'مثال: تمرير قرار لجنة الدراسات العليا' : 'e.g. Committee decision by circulation'}"></label>
      <div id="psItems"></div>
      <button type="button" class="sn-lnk" id="psAdd">${B('+ إضافة قرار آخر', '+ Add another decision')}</button>
      <label class="sn-lbl ps-gap">${B('أسماء الأعضاء (اختياري، اسم في كل سطر)', 'Member names (optional, one per line)')}<textarea id="psN" rows="5" placeholder="${isAr() ? 'إن كتبتها يختار كل عضو اسمه من قائمة، ويظهر لك من لم يصوّت.' : 'If given, members pick their name from a list and you see who has not answered.'}">${esc(last)}</textarea></label>
      <label class="sn-keep"><input type="checkbox" id="psShow"> ${B('إظهار النتيجة للأعضاء بعد تصويتهم', 'Show the results to members after they answer')}</label>
      <div class="sn-two"><button type="button" class="btn solid" id="psGo">${B('إنشاء الرابط', 'Create the link')}</button></div>
      <p class="pt-fine">${B('تُحذف البيانات تلقائيًا بعد ٧ أيام، ويستطيع المنسق حذفها فورًا.', 'Data is deleted automatically after 7 days; the coordinator can delete it at once.')}</p>
    </div>`;
    const box = root.querySelector('#psItems');
    const add = v => { const n = box.children.length + 1; const d = document.createElement('label'); d.className = 'sn-lbl'; d.innerHTML = `${B('القرار', 'Decision')} ${n}<textarea rows="3" maxlength="2000">${esc(v || '')}</textarea>`; box.appendChild(d); };
    add(); root.querySelector('#psAdd').onclick = () => { add(); box.lastChild.querySelector('textarea').focus(); };
    root.querySelector('#psGo').onclick = async ev => {
      const items = [...box.querySelectorAll('textarea')].map(t => t.value.trim()).filter(Boolean);
      if (!items.length) { toast(B('اكتب نص القرار.', 'Write the decision text.'), 1); return; }
      const raw = root.querySelector('#psN').value, names = raw.split(/\n+/).map(x => x.replace(/^\s*[\d٠-٩]+[\s.\-)]*/, '').trim()).filter(Boolean);
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const j = await call({ a: 'pcreate', title: root.querySelector('#psT').value.trim(), items, names, showAll: root.querySelector('#psShow').checked });
        store.set('ps.names', raw.trim());
        const keys = store.get('ps.keys', {}); keys[j.id] = j.k; store.set('ps.keys', keys);
        location.href = '?d=' + j.id + '&new=1#k=' + j.k;
      } catch (e) { btn.disabled = false; toast(errMsg(e), 1); }
    };
  }

  /* ---------- a decision: members answer, coordinator sees the result ---------- */
  async function view(id) {
    const hk = (location.hash.match(/k=([a-f0-9]+)/) || [])[1], keys = store.get('ps.keys', {});
    if (hk) { keys[id] = hk; store.set('ps.keys', keys); }
    const key = keys[id], mineAll = store.get('ps.mine', {}); let mine = mineAll[id];
    root.innerHTML = `<div class="sn-card sn-load">${B('جارٍ الفتح…', 'Opening…')}</div>`;
    let S;
    try { S = await call({ a: 'pget', id, k: key, name: mine && mine.name, tok: mine && mine.tok }); }
    catch (e) { root.innerHTML = `<div class="sn-card"><p>${errMsg(e)}</p></div>`; return; }
    const admin = !!S.admin, link = location.origin + location.pathname + '?d=' + id;
    const me = store.get('sn.me', '') || '';
    let editing = !S.mine;
    function render() {
      const ans = (S.mine && S.mine.ans) ? S.mine.ans.slice() : S.items.map(() => null), notes = (S.mine && S.mine.notes) ? S.mine.notes.slice() : S.items.map(() => '');
      const share = admin && /new=1/.test(location.search) ? `<div class="sn-card sn-share"><h2>${B('الرابط جاهز', 'The link is ready')}</h2>
        <p>${B('أرسله في قروب المجلس أو اللجنة:', 'Send it to the board or committee group:')}</p>
        <div class="sn-link"><input type="text" readonly value="${link}" id="psLink"><button type="button" class="btn solid" id="psCopy">${B('نسخ', 'Copy')}</button><a class="btn ghost" id="psWa" target="_blank" rel="noopener">${B('واتساب', 'WhatsApp')}</a></div>
        <p class="sn-fine">${B('النتيجة تظهر لك في هذا الجهاز. لمتابعتها من جهاز آخر احفظ رابط الإدارة:', 'Results appear on this device. To follow them from another device, keep the management link:')} <button type="button" class="sn-lnk" id="psAdm">${B('نسخ رابط الإدارة', 'Copy management link')}</button></p></div>` : '';
      const head = `<div class="sn-card"><h2>${esc(S.title || (isAr() ? 'تمرير قرار' : 'Decision by circulation'))}</h2>${S.locked ? `<p class="ps-closed">${B('أُغلق التصويت.', 'Voting is closed.')}</p>` : ''}</div>`;
      let form = '';
      if (!S.locked && (editing || !S.mine)) {
        const nameField = S.names.length
          ? `<select id="psName"${S.mine ? ' disabled' : ''}><option value="">${isAr() ? '— اختر اسمك —' : '— choose your name —'}</option>${S.names.map(n => { const done = S.voted.includes(n) && !(S.mine && S.mine.name === n); return `<option${done ? ' disabled' : ''}${(S.mine ? S.mine.name === n : n === me) ? ' selected' : ''}>${esc(n)}${done ? ' ✓' : ''}</option>`; }).join('')}</select>`
          : `<input type="text" id="psName" maxlength="120" value="${esc(S.mine ? S.mine.name : me)}"${S.mine ? ' disabled' : ''}>`;
        form = `<div class="sn-card"><label class="sn-lbl">${B('الاسم', 'Name')}${nameField}</label>
          ${S.items.map((t, i) => `<div class="ps-item"><p class="ps-txt">${S.items.length > 1 ? `<b>${i + 1}.</b> ` : ''}${esc(t).replace(/\n/g, '<br>')}</p>
            <div class="ps-opts" role="radiogroup">${OPT.map((o, k) => `<button type="button" role="radio" class="ps-o ps-${o[2]}" data-i="${i}" data-k="${k}" aria-checked="${ans[i] === k}">${B(o[0], o[1])}</button>`).join('')}</div>
            <textarea class="ps-note" data-i="${i}" rows="2" maxlength="500" placeholder="${isAr() ? 'ملاحظة أو سبب التحفظ (اختياري)' : 'Note or reason (optional)'}"${ans[i] === 1 || ans[i] === 2 || notes[i] ? '' : ' hidden'}>${esc(notes[i])}</textarea></div>`).join('')}
          <div class="sn-two"><button type="button" class="btn solid" id="psSend">${B('إرسال', 'Send')}</button>${S.mine ? `<button type="button" class="btn ghost" id="psCancel">${B('إلغاء', 'Cancel')}</button>` : ''}</div></div>`;
      }
      const mineCard = S.mine && !(editing && !S.locked) ? `<div class="sn-card ps-mine"><h3>${B('تصويتك', 'Your answer')} · <bdi>${esc(S.mine.name)}</bdi></h3>
        ${S.items.map((t, i) => `<p><span class="ps-tag ps-${OPT[S.mine.ans[i]][2]}">${optT(S.mine.ans[i])}</span> ${S.items.length > 1 ? (isAr() ? 'القرار ' : 'Decision ') + (i + 1) : ''}${S.mine.notes[i] ? ` — <i>${esc(S.mine.notes[i])}</i>` : ''}</p>`).join('')}
        ${S.locked ? '' : `<button type="button" class="sn-lnk" id="psEdit">${B('تعديل تصويتي', 'Change my answer')}</button>`}</div>` : '';
      if (admin && form) form = `<details class="sn-card ps-asme"${S.mine ? ' open' : ''}><summary>${B('التصويت بصفتك عضوًا', 'Answer as a member')}</summary>${form.replace(/^<div class="sn-card">/, '<div>')}</details>`;
      root.innerHTML = share + head + (admin ? (S.votes ? results() : '') + form + mineCard : form + mineCard + (S.votes ? results() : ''));
      bind(ans);
    }
    function results() {
      const V = S.votes, missing = S.names.filter(n => !S.voted.includes(n));
      return `<div class="sn-card ps-result"><h3>${B('النتيجة', 'Results')} <span class="ps-n">${V.length}${S.names.length ? ' / ' + S.names.length : ''}</span></h3>
        ${S.items.map((t, i) => { const c = [0, 1, 2].map(k => V.filter(v => v.ans[i] === k).length), n = V.length || 1;
          return `<div class="ps-ri">${S.items.length > 1 ? `<p class="ps-txt"><b>${i + 1}.</b> ${esc(t.length > 160 ? t.slice(0, 160) + '…' : t)}</p>` : ''}
            <div class="ps-bar">${c.map((x, k) => x ? `<i class="ps-${OPT[k][2]}" style="flex:${x}"></i>` : '').join('') || '<i style="flex:1;background:var(--line)"></i>'}</div>
            <p class="ps-cnt">${c.map((x, k) => `<span class="ps-tag ps-${OPT[k][2]}">${optT(k)} ${x}</span>`).join(' ')}</p></div>`; }).join('')}
        <table class="ps-tbl"><thead><tr><th>${B('الاسم', 'Name')}</th>${S.items.map((_, i) => `<th>${S.items.length > 1 ? i + 1 : B('الرأي', 'Answer')}</th>`).join('')}</tr></thead>
        <tbody>${V.map(v => `<tr><td><bdi>${esc(v.name)}</bdi></td>${v.ans.map((a, i) => `<td><span class="ps-tag ps-${OPT[a][2]}">${optT(a)}</span>${v.notes[i] ? `<small>${esc(v.notes[i])}</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        ${missing.length ? `<p class="ps-miss"><b>${B('لم يصوّت بعد:', 'Not answered yet:')}</b> ${missing.map(esc).join('، ')}</p>` : ''}
        ${admin ? `<div class="sn-acts"><button type="button" class="btn solid" id="psPrint">${B('طباعة أو حفظ PDF', 'Print or save as PDF')}</button><button type="button" class="btn ghost" id="psText">${B('نسخ النتيجة نصًا', 'Copy results as text')}</button>${missing.length && !S.locked ? `<button type="button" class="btn ghost" id="psRemind">${B('نسخ رسالة تذكير', 'Copy a reminder')}</button>` : ''}<button type="button" class="btn ghost" id="psLock">${S.locked ? B('فتح التصويت', 'Reopen') : B('إغلاق التصويت', 'Close voting')}</button><button type="button" class="btn ghost sn-danger" id="psDel">${B('حذف', 'Delete')}</button></div>` : ''}
      </div>`;
    }
    function bind(ans) {
      const q = s => root.querySelector(s);
      if (q('#psCopy')) {
        q('#psCopy').onclick = () => copy(link, B('نُسخ الرابط.', 'Link copied.'));
        q('#psAdm').onclick = () => copy(link + '#k=' + key, B('نُسخ رابط الإدارة. لا ترسله في القروب.', 'Management link copied. Do not share it with the group.'));
        q('#psWa').href = 'https://wa.me/?text=' + encodeURIComponent((S.title ? S.title + '\n' : '') + (isAr() ? 'رابط التصويت على القرار: ' : 'Answer the decision here: ') + link);
      }
      root.querySelectorAll('.ps-o').forEach(b => b.onclick = () => {
        const i = +b.dataset.i, k = +b.dataset.k; ans[i] = k;
        root.querySelectorAll(`.ps-o[data-i="${i}"]`).forEach(x => x.setAttribute('aria-checked', x === b));
        const n = root.querySelector(`.ps-note[data-i="${i}"]`); if (k > 0) n.hidden = false;
      });
      if (q('#psSend')) q('#psSend').onclick = async ev => {
        const name = (q('#psName').value || '').trim();
        if (!name) { toast(ERR.bad_name, 1); return; }
        if (ans.some(a => a === null)) { toast(ERR.bad_ans, 1); return; }
        const notes = [...root.querySelectorAll('.ps-note')].map(t => t.value.trim());
        const btn = ev.currentTarget; btn.disabled = true;
        try {
          const j = await call({ a: 'pvote', id, k: key, name, ans, notes, tok: mine && mine.tok });
          mineAll[id] = { name: j.mine.name, tok: j.tok }; store.set('ps.mine', mineAll); store.set('sn.me', j.mine.name);
          mine = mineAll[id];
          S = j; editing = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); toast(B('سُجّل رأيك. شكرًا لك.', 'Your answer was recorded. Thank you.'));
        } catch (e) { btn.disabled = false; toast(errMsg(e), 1); }
      };
      if (q('#psCancel')) q('#psCancel').onclick = () => { editing = false; render(); };
      if (q('#psEdit')) q('#psEdit').onclick = () => { editing = true; render(); };
      if (!admin) return;
      const txt = () => {
        const V = S.votes, L = [S.title || (isAr() ? 'تمرير قرار' : 'Decision')];
        S.items.forEach((t, i) => { const c = [0, 1, 2].map(k => V.filter(v => v.ans[i] === k).length); L.push('', (S.items.length > 1 ? (i + 1) + '. ' : '') + t, OPT.map((o, k) => optT(k) + ': ' + c[k]).join(' · ')); });
        L.push(''); V.forEach(v => L.push('• ' + v.name + ': ' + v.ans.map((a, i) => optT(a) + (v.notes[i] ? ' (' + v.notes[i] + ')' : '')).join(' / ')));
        const miss = S.names.filter(n => !S.voted.includes(n)); if (miss.length) L.push('', (isAr() ? 'لم يصوّت: ' : 'Not answered: ') + miss.join('، '));
        return L.join('\n');
      };
      q('#psText').onclick = () => copy(txt(), B('نُسخت النتيجة.', 'Results copied.'));
      if (q('#psRemind')) q('#psRemind').onclick = () => copy((isAr() ? `نأمل التكرم بالتصويت على ${S.title || 'القرار'}:\n${link}\n\nلم يصوّت بعد:\n` : `Please answer ${S.title || 'the decision'}:\n${link}\n\nNot answered yet:\n`) + S.names.filter(n => !S.voted.includes(n)).map(n => '• ' + n).join('\n'), B('نُسخت رسالة التذكير.', 'Reminder copied.'));
      q('#psLock').onclick = async () => { try { S = await call({ a: 'plock', id, k: key, on: !S.locked }); render(); } catch (e) { toast(errMsg(e), 1); } };
      q('#psDel').onclick = async ev => {
        const b = ev.currentTarget;
        if (!b.dataset.sure) { b.dataset.sure = 1; b.innerHTML = B('اضغط مرة أخرى للحذف النهائي', 'Tap again to delete for good'); return; }
        try { await call({ a: 'pdelete', id, k: key }); delete keys[id]; store.set('ps.keys', keys); location.href = './'; } catch (e) { toast(errMsg(e), 1); }
      };
      q('#psPrint').onclick = () => printView();
    }
    function printView() {
      const V = S.votes, dir = isAr() ? 'rtl' : 'ltr', dt = new Date().toLocaleDateString(isAr() ? 'ar-SA-u-nu-latn' : 'en-GB');
      const html = `<!doctype html><html lang="${isAr() ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(S.title || '')}</title>
        <style>body{font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;margin:32px;color:#111}h1{font-size:20px;margin:0 0 4px}p.m{color:#555;margin:0 0 18px;font-size:13px}
        .it{margin:14px 0}.it p{margin:0 0 6px;line-height:1.7}.c{font-size:13px;color:#333}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}th,td{border:1px solid #bbb;padding:6px 8px;text-align:start;vertical-align:top}th{background:#f1f1f1}small{display:block;color:#555}
        @page{margin:16mm}</style></head><body><h1>${esc(S.title || (isAr() ? 'تمرير قرار' : 'Decision by circulation'))}</h1><p class="m">${isAr() ? 'تاريخ الطباعة' : 'Printed'}: ${dt} · ${isAr() ? 'عدد المصوّتين' : 'Answers'}: ${V.length}${S.names.length ? ' / ' + S.names.length : ''}</p>
        ${S.items.map((t, i) => { const c = [0, 1, 2].map(k => V.filter(v => v.ans[i] === k).length); return `<div class="it"><p>${S.items.length > 1 ? `<b>${i + 1}.</b> ` : ''}${esc(t).replace(/\n/g, '<br>')}</p><p class="c">${OPT.map((o, k) => optT(k) + ': ' + c[k]).join(' · ')}</p></div>`; }).join('')}
        <table><thead><tr><th>${isAr() ? 'الاسم' : 'Name'}</th>${S.items.map((_, i) => `<th>${S.items.length > 1 ? (isAr() ? 'القرار ' : 'Decision ') + (i + 1) : (isAr() ? 'الرأي' : 'Answer')}</th>`).join('')}</tr></thead>
        <tbody>${V.map(v => `<tr><td>${esc(v.name)}</td>${v.ans.map((a, i) => `<td>${optT(a)}${v.notes[i] ? `<small>${esc(v.notes[i])}</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        ${S.names.filter(n => !S.voted.includes(n)).length ? `<p class="m" style="margin-top:14px">${isAr() ? 'لم يصوّت' : 'Not answered'}: ${S.names.filter(n => !S.voted.includes(n)).map(esc).join('، ')}</p>` : ''}
        <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
      const w = window.open('', '_blank');
      if (!w) { toast(B('اسمح بالنوافذ المنبثقة ثم حاول مجددًا.', 'Allow pop-ups and try again.'), 1); return; }
      w.document.open(); w.document.write(html); w.document.close();
    }
    render();
    if (admin) setInterval(async () => { if (document.hidden || root.querySelector('#psSend')) return; try { S = await call({ a: 'pget', id, k: key, name: mine && mine.name, tok: mine && mine.tok }); render(); } catch (e) {} }, 20000);
  }

  const did = new URLSearchParams(location.search).get('d');
  if (did && /^[a-f0-9]{20}$/.test(did)) view(did); else createView();
})();

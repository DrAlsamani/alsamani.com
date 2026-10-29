/* alsamani.com/tools/minutes — build a full meeting record: who attended and the quorum, the agenda, the decision on each item
   with its number, the vote and any reservation, the tasks, and the signature table. Word, print-ready PDF, or straight to signing.
   Everything stays on this device. */
(function () {
  const root = document.getElementById('mn');
  if (!root) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nl = s => esc(s).replace(/\n/g, '<br>');
  const uid = () => Math.random().toString(36).slice(2, 9);
  const store = { get(k, d) { try { const v = localStorage.getItem('mn.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('mn.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
  const toast = (html, bad) => { let t = document.getElementById('mnToast'); if (!t) { t = document.createElement('div'); t.id = 'mnToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3600); };
  const ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون'];
  const ord = i => ORD[i] || String(i + 1);
  const ROLES = ['رئيس المجلس', 'رئيس اللجنة', 'نائب الرئيس', 'عضو', 'أمين المجلس', 'مقرر اللجنة', 'عضو ومقرر', 'عضو من خارج الجهة'];
  const KINDS = [['approve', 'الموافقة'], ['reject', 'عدم الموافقة'], ['refer', 'الإحالة'], ['defer', 'التأجيل'], ['note', 'الإحاطة'], ['free', 'صيغة حرة']];

  /* ---------- the record ---------- */
  let list = store.get('list', []), M = null;
  const persist = () => { if (!M) return; M.at = Date.now(); const i = list.findIndex(x => x.id === M.id); if (i >= 0) list[i] = M; else list.unshift(M); if (!store.set('list', list.slice(0, 40))) toast(B('امتلأت مساحة الحفظ في المتصفح؛ احذف محاضر قديمة أو صغّر الشعار.', 'Browser storage is full; delete old minutes or use a smaller logo.'), 1); };
  let tSave; const later = () => { clearTimeout(tSave); tSave = setTimeout(() => { persist(); paintChecks(); }, 400); };
  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => ({ id: uid(), type: 'council', org: '', unit: '', committee: '', logo: '', no: '', year: '', date: today(), from: '', to: '', place: '', mode: 'in', numFmt: '{n}/{i}',
    members: [{ id: uid(), n: '', r: 'رئيس المجلس', st: 'p' }, { id: uid(), n: '', r: 'عضو', st: 'p' }, { id: uid(), n: '', r: 'عضو', st: 'p' }, { id: uid(), n: '', r: 'أمين المجلس', st: 'p' }],
    guests: '', att: '', bsm: true, agenda: true, sigL: 'table', prev: { on: true, note: '' }, follow: [], items: [newItem()], misc: '', recs: '', next: '', status: 'draft', reg: '' });
  function newItem() { return { id: uid(), title: '', ref: '', disc: '', kind: 'approve', to: '', reason: '', text: '', edited: false, basis: '', vote: 'all', yes: '', no: '', dis: [], tasks: [] }; }
  const body = () => M.type === 'committee' ? { the: 'اللجنة', verb: 'قررت', noted: 'أحيطت', head: 'رئيس اللجنة' } : { the: 'المجلس', verb: 'قرر', noted: 'أحيط', head: 'رئيس المجلس' };
  // the decision in the usual wording, from its kind
  function phrase(it) {
    const b = body(), t = (it.title || '…').trim();
    return ({ approve: `${b.verb} ${b.the}: الموافقة على ${t}.`, reject: `${b.verb} ${b.the}: عدم الموافقة على ${t}${it.reason ? '، ' + it.reason.trim() : ''}.`,
      refer: `${b.verb} ${b.the}: إحالة ${t} إلى ${(it.to || '…').trim()} لدراسته والرفع بالتوصية.`, defer: `${b.verb} ${b.the}: تأجيل النظر في ${t} إلى الجلسة القادمة${it.reason ? '، ' + it.reason.trim() : ''}.`,
      note: `${b.noted} ${b.the} علمًا بـ${t}.`, free: '' })[it.kind] || '';
  }
  const decText = it => it.edited || it.kind === 'free' ? it.text : phrase(it);
  const decNo = (i) => (M.numFmt || '{n}/{i}').replace('{n}', M.no || '…').replace('{i}', i + 1).replace('{y}', M.year || '…');
  const present = () => M.members.filter(m => m.n.trim() && (m.st === 'p' || m.st === 'r'));
  const STL = { p: 'حاضر', r: 'حاضر عن بُعد', x: 'معتذر', a: 'غائب' };
  const named = () => M.members.filter(m => m.n.trim());
  const quorum = () => { const n = named().length, p = present().length, need = Math.floor(n / 2) + 1; return { n, p, need, ok: n > 0 && p >= need }; };
  function dates() {
    if (!M.date) return { day: '', h: '', g: '' };
    const d = new Date(M.date + 'T12:00:00');
    let h = ''; try { h = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/\s*هـ\s*$/, ''); } catch (e) {}
    return { day: new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(d), h, g: new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d) + ' م' };
  }
  const t12 = t => { if (!t) return ''; const [hh, mm] = t.split(':').map(Number); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'صباحًا' : hh < 16 ? 'ظهرًا' : 'مساءً'}`; };

  /* ---------- the minutes as a document (used for the preview, Word, printing and signing) ---------- */
  const li = x => { x = String(x).trim(); return /^ال/.test(x) ? 'ل' + x.slice(1) : 'ل' + x; };
  const HEADS = ['أولًا', 'ثانيًا', 'ثالثًا', 'رابعًا', 'خامسًا', 'سادسًا', 'سابعًا', 'ثامنًا', 'تاسعًا', 'عاشرًا'];
  function doc() {
    const b = body(), d = dates(), q = quorum(), chair = present().find(m => /رئيس/.test(m.r) && !/نائب/.test(m.r));
    let k = 0, h = 0; const sec = [], rows = [], H = t => `<h2>${HEADS[h++] || ''}: ${t}</h2>`;
    const agenda = [];
    if (M.prev.on) { agenda.push('اعتماد محضر الجلسة السابقة'); sec.push(`<div class="mo-item"><h3>${k + 1}. اعتماد محضر الجلسة السابقة</h3><p class="mo-dec"><b>القرار:</b> ${b.verb} ${b.the} اعتماد محضر الجلسة السابقة${M.prev.note.trim() ? '، ' + esc(M.prev.note.trim()) : ' دون ملاحظات'}.</p></div>`); k++; }
    const fl = M.follow.filter(f => f.t.trim());
    if (fl.length) { agenda.push('متابعة تنفيذ قرارات الجلسة السابقة'); sec.push(`<div class="mo-item"><h3>${k + 1}. متابعة تنفيذ قرارات الجلسة السابقة</h3><table class="mo-t"><tr><th>م</th><th>القرار أو المهمة</th><th>الحالة</th></tr>${fl.map((f, j) => `<tr><td>${j + 1}</td><td>${esc(f.t)}</td><td>${({ done: 'نُفّذ', go: 'قيد التنفيذ', late: 'لم يُنفّذ بعد' })[f.st] || ''}</td></tr>`).join('')}</table></div>`); k++; }
    M.items.forEach((it, i) => {
      if (!it.title.trim() && !decText(it).trim()) return;
      agenda.push(it.title.trim() || '…');
      const vote = it.vote === 'all' ? 'بالإجماع' : it.vote === 'maj' ? `بالأغلبية${it.yes || it.no ? ` (${it.yes ? 'موافق: ' + esc(it.yes) : ''}${it.yes && it.no ? '، ' : ''}${it.no ? 'غير موافق: ' + esc(it.no) : ''})` : ''}` : '';
      const tk = (it.tasks || []).filter(t => t.t.trim() || t.who.trim());
      sec.push(`<div class="mo-item"><h3>${k + 1}. ${esc(it.title)}</h3>
        ${it.ref.trim() ? `<p class="mo-ref"><b>المرجع:</b> ${esc(it.ref)}</p>` : ''}
        ${it.disc.trim() ? `<p><b>المناقشة:</b> ${nl(it.disc)}</p>` : ''}
        <p class="mo-dec"><b>القرار رقم (<bdi dir="ltr">${esc(decNo(i))}</bdi>):</b> ${nl(decText(it))}</p>
        ${it.basis.trim() ? `<p class="mo-basis"><b>الاستناد النظامي:</b> ${nl(it.basis)}</p>` : ''}
        ${vote ? `<p><b>التصويت:</b> صدر القرار ${vote}.</p>` : ''}
        ${(it.dis || []).filter(x => x.n.trim()).map(x => `<p class="mo-dis"><b>${x.k === 'no' ? 'رأي مخالف' : 'تحفظ'}:</b> ${esc(x.n)}${x.note.trim() ? ' — ' + esc(x.note) : ''}</p>`).join('')}
        ${tk.length ? `<p><b>التكليف:</b> ${tk.map(t => esc(t.t) + (t.who ? ' — ' + esc(t.who) : '') + (t.due ? ' (' + esc(t.due) + ')' : '')).join('؛ ')}.</p>` : ''}
      </div>`);
      rows.push(`<tr><td><bdi dir="ltr">${esc(decNo(i))}</bdi></td><td>${nl(decText(it))}${tk.filter(t => t.t.trim()).map(t => `<div class="mo-tk">— ${esc(t.t)}</div>`).join('')}</td><td>${tk.map(t => esc(t.who)).filter(Boolean).join('<br>')}</td><td>${tk.map(t => esc(t.due)).filter(Boolean).join('<br>')}</td></tr>`);
      k++;
    });
    if (M.misc.trim()) { agenda.push('ما يستجد من أعمال'); sec.push(`<div class="mo-item"><h3>${k + 1}. ما يستجد من أعمال</h3><p>${nl(M.misc)}</p></div>`); k++; }
    const recs = M.recs.split(/\n/).map(x => x.replace(/^\s*[-•\d٠-٩]+[.)\-]?\s*/, '').trim()).filter(Boolean);
    const sig = present(), when = M.mode === 'remote' ? 'عن بُعد' : M.mode === 'mix' ? 'حضوريًا وعن بُعد' : '';
    const sigs = M.sigL === 'grid'
      ? `<table class="mo-t mo-grid">${sig.reduce((r, m, j) => (j % 2 ? r[r.length - 1].push(m) : r.push([m]), r), []).map(row => `<tr>${row.map(m => `<td class="mo-card"><b>${esc(m.r)}</b><div class="mo-sigbox" data-n="${esc(m.n)}" data-r="${esc(m.r)}"></div>${esc(m.n)}</td>`).join('')}${row.length < 2 ? '<td class="mo-card"></td>' : ''}</tr>`).join('')}</table>`
      : `<table class="mo-t mo-sig"><tr><th>م</th><th>الاسم</th><th>الصفة</th><th>التوقيع</th></tr>${sig.map((m, j) => `<tr><td>${j + 1}</td><td>${esc(m.n)}</td><td>${esc(m.r)}</td><td class="mo-sigbox" data-n="${esc(m.n)}" data-r="${esc(m.r)}"></td></tr>`).join('')}</table>`;
    return `<div class="mo-doc${M.status === 'draft' ? ' draft' : ''}" dir="rtl">
      <table class="mo-hd"><tr><td class="mo-org">${M.org ? `<b>${esc(M.org)}</b><br>` : ''}${M.unit ? `${esc(M.unit)}<br>` : ''}${M.committee ? esc(M.committee) : ''}</td><td class="mo-bsm">${M.bsm ? 'بسم الله الرحمن الرحيم' : ''}</td><td class="mo-logo">${M.logo ? `<img src="${M.logo}" alt="" height="64">` : ''}</td></tr></table>
      <h1>محضر الاجتماع${M.no ? ` رقم (${esc(M.no)})` : ''}${M.committee ? '<br>' + esc(li(M.committee)) : ''}${M.year ? ` للعام ${esc(M.year)}` : ''}</h1>
      <table class="mo-t mo-info"><tr><th>اليوم والتاريخ</th><td>${esc(d.day)} ${esc(d.h)}${d.h ? ' هـ' : ''}، الموافق ${esc(d.g)}</td></tr>
        <tr><th>الوقت</th><td>${M.from ? 'من ' + t12(M.from) : ''}${M.to ? ' إلى ' + t12(M.to) : ''}</td></tr>
        <tr><th>المكان</th><td>${esc(M.place)}${when ? ` (${when})` : ''}</td></tr>
        ${M.att.trim() ? `<tr><th>المرفقات</th><td>${esc(M.att)}</td></tr>` : ''}</table>
      <p>${M.date ? `في يوم ${esc(d.day)} ${esc(d.h)}${d.h ? ' هـ' : ''}` : ''}${M.from ? `، عند الساعة ${t12(M.from)}` : ''}، عُقد الاجتماع ${M.no ? `رقم (${esc(M.no)}) ` : ''}${M.committee ? esc(li(M.committee)) : ''}${when ? ' ' + when : ''}${M.place.trim() ? ` في ${esc(M.place.trim())}` : ''}${chair ? `، برئاسة ${esc(chair.n)}، ${esc(chair.r)}` : ''}.</p>
      ${H('الحضور واكتمال النصاب')}
      <table class="mo-t"><tr><th>م</th><th>الاسم</th><th>الصفة</th><th>الحضور</th></tr>${named().map((m, j) => `<tr><td>${j + 1}</td><td>${esc(m.n)}</td><td>${esc(m.r)}</td><td>${STL[m.st] || ''}</td></tr>`).join('')}</table>
      ${M.guests.trim() ? `<p><b>المدعوون من غير الأعضاء:</b> ${esc(M.guests)}</p>` : ''}
      <p class="mo-q">${q.n ? (q.ok ? `وبعد التحقق من اكتمال النصاب النظامي بحضور (${q.p}) من أصل (${q.n}) أعضاء، رحّب ${chair ? 'رئيس الاجتماع' : b.head} بالحاضرين، واستُعرض جدول الأعمال.` : `لم يكتمل النصاب النظامي: حضر (${q.p}) من أصل (${q.n})، والمطلوب (${q.need}).`) : ''}</p>
      ${M.agenda && agenda.length ? `${H('جدول الأعمال')}<table class="mo-t"><tr><th>م</th><th>الموضوع</th></tr>${agenda.map((t, j) => `<tr><td>${j + 1}</td><td>${esc(t)}</td></tr>`).join('')}</table>` : ''}
      ${H('المناقشات والقرارات')}
      ${sec.join('')}
      ${recs.length ? `${H('التوصيات')}${recs.map((r, j) => `<p class="mo-rec">${j + 1}. ${esc(r)}</p>`).join('')}` : ''}
      ${rows.length ? `${H('ملخص القرارات والتكليفات')}<table class="mo-t mo-sum"><tr><th>رقم القرار</th><th>القرار والتكليف</th><th>المكلّف</th><th>الموعد</th></tr>${rows.join('')}</table>` : ''}
      ${H('اختتام الاجتماع')}
      <p>واختُتم الاجتماع${M.to ? ' في تمام الساعة ' + t12(M.to) : ''}${M.next.trim() ? '، على أن يُعقد الاجتماع القادم ' + esc(M.next.trim()) : ''}، والله ولي التوفيق.</p>
      ${H('توقيعات الحضور')}
      ${sigs}
    </div>`;
  }
  const DOC_CSS = `.mo-doc,.mo-doc *{letter-spacing:0!important;word-spacing:normal!important}.mo-doc{font-family:"IBM Plex Sans Arabic","Traditional Arabic",Arial,sans-serif;color:#111;font-size:14px;line-height:1.85;background:#fff;position:relative}
    .mo-doc.draft::before{content:"مسودة";position:absolute;top:30%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-size:110px;color:rgba(200,0,0,.07);font-weight:800;pointer-events:none}
    .mo-hd{width:100%;border-collapse:collapse;border-bottom:2px solid #1f3b5c;margin-bottom:12px}.mo-hd td{width:33%;vertical-align:middle;padding:0 0 10px}.mo-org{font-size:13px;text-align:right;line-height:1.6}.mo-org b{font-size:15px}.mo-bsm{text-align:center;font-size:17px;font-family:"Amiri","Traditional Arabic",serif}.mo-logo{text-align:left}.mo-logo img{max-height:70px;max-width:160px}
    .mo-doc h1{font-size:19px;text-align:center;margin:8px 0 12px;line-height:1.6}.mo-doc h2{font-size:15px;margin:16px 0 6px;color:#1f3b5c}.mo-doc h3{font-size:14.5px;margin:0 0 4px;color:#1f3b5c}
    .mo-doc p{margin:4px 0}.mo-item{border-right:3px solid #c9822b;padding:4px 12px 6px;margin:10px 0;break-inside:avoid}.mo-ol{margin:4px 0;padding-right:22px}.mo-tk{font-size:12px;color:#444}
    .mo-t{width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:13px}.mo-t th,.mo-t td{border:1px solid #9aa4ad;padding:4px 8px;text-align:right;vertical-align:top}.mo-t th{background:#eef2f6}
    .mo-info th{width:28%}.mo-sig td{height:44px}.mo-sig td:first-child{width:6%}.mo-sig .mo-sigbox{width:30%}.mo-sum td:first-child{width:12%;white-space:nowrap}.mo-dec{background:#f7f3ea;padding:4px 8px;border-radius:4px}.mo-q{font-weight:600}
    .mo-grid td.mo-card{width:50%;text-align:center;padding:8px;font-weight:600}.mo-card b{font-weight:700;color:#1f3b5c}.mo-card .mo-sigbox{height:54px}`;

  /* ---------- home: the saved minutes and committees ---------- */
  function home() {
    M = null;
    const coms = store.get('coms', []);
    root.innerHTML = `<div class="sn-card mn-home">
      <div class="sn-two"><button type="button" class="btn solid" id="mnNew">${B('محضر جديد', 'New minutes')}</button></div>
      ${coms.length ? `<h2 class="mn-h">${B('ابدأ من لجنة محفوظة', 'Start from a saved committee')}</h2><p class="sn-fine">${B('تُنسخ البيانات والأعضاء، ويُرفع رقم الجلسة، وتُنقل مهام آخر محضر إلى «متابعة القرارات».', 'Its details and members are copied, the meeting number goes up, and the last tasks move to the follow-up.')}</p><div class="mn-coms">${coms.map(c => `<button type="button" class="mn-com" data-com="${c.id}"><b>${esc(c.committee || c.org || T('لجنة', 'Committee'))}</b><small>${esc(c.org || '')} · ${c.members.length} ${T('أعضاء', 'members')}</small></button>`).join('')}</div>` : ''}
      ${list.length ? `<h2 class="mn-h">${B('محاضرك', 'Your minutes')}</h2><ul class="mn-list">${list.map(x => `<li><button type="button" data-open="${x.id}"><b>${esc(x.committee || T('بلا عنوان', 'Untitled'))} ${x.no ? '(' + esc(x.no) + ')' : ''}</b><small>${esc(x.date || '')} · ${x.status === 'final' ? T('معتمد', 'Approved') : T('مسودة', 'Draft')}</small></button><button type="button" class="mn-x" data-del="${x.id}" aria-label="delete">✕</button></li>`).join('')}</ul>` : ''}
      <p class="sn-fine">🔒 ${B('تُحفظ المحاضر في هذا المتصفح فقط، ولا تُرفع إلى أي خادم.', 'Minutes are kept in this browser only and are never uploaded.')}</p></div>`;
    root.querySelector('#mnNew').onclick = () => { M = blank(); editor(); };
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { M = Object.assign(blank(), JSON.parse(JSON.stringify(list.find(x => x.id === b.dataset.open)))); editor(); });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm(T('حذف هذا المحضر؟', 'Delete these minutes?'))) return; list = list.filter(x => x.id !== b.dataset.del); store.set('list', list); home(); });
    root.querySelectorAll('[data-com]').forEach(b => b.onclick = () => fromCommittee(coms.find(c => c.id === b.dataset.com)));
  }
  function fromCommittee(c) {
    M = blank();
    Object.assign(M, { type: c.type, org: c.org, unit: c.unit, committee: c.committee, logo: c.logo, year: c.year || '', place: c.place || '', mode: c.mode || 'in', numFmt: c.numFmt || M.numFmt, from: c.from || '' });
    M.members = c.members.map(m => ({ id: uid(), n: m.n, r: m.r, st: 'p' }));
    // the last minutes of this committee: next number, and its tasks to follow up
    const last = list.filter(x => x.committee === c.committee && x.org === c.org).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    if (last) { const n = parseInt(last.no, 10); if (!isNaN(n)) M.no = String(n + 1); M.follow = [].concat(...last.items.map(it => (it.tasks || []).filter(t => t.t.trim()).map(t => ({ id: uid(), t: t.t + (t.who ? ' (' + t.who + ')' : ''), st: 'go' })))); }
    editor();
  }
  function saveCommittee() {
    const coms = store.get('coms', []), key = (M.org + '|' + M.committee).trim();
    const c = { id: (coms.find(x => (x.org + '|' + x.committee).trim() === key) || {}).id || uid(), type: M.type, org: M.org, unit: M.unit, committee: M.committee, logo: M.logo, year: M.year, place: M.place, mode: M.mode, numFmt: M.numFmt, from: M.from, members: named().map(m => ({ n: m.n, r: m.r })) };
    store.set('coms', [c].concat(coms.filter(x => x.id !== c.id)).slice(0, 12));
    toast(B('حُفظت اللجنة وأعضاؤها؛ ستجدها في البداية للمحضر القادم.', 'Committee saved; you will find it on the start page next time.'));
  }

  /* ---------- the form ---------- */
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label || v)}</option>`;
  function editor() {
    const q = s => root.querySelector(s);
    root.innerHTML = `<div class="mn-ed">
      <div class="mn-top"><button type="button" class="sn-lnk" id="mnBack">${isAr() ? '→' : '←'} ${B('محاضري', 'My minutes')}</button>
        <select id="mnStatus">${opt('draft', M.status, T('مسودة', 'Draft'))}${opt('final', M.status, T('معتمد', 'Approved'))}</select></div>

      <details class="sn-card mn-sec" open><summary><b>١</b> ${B('بيانات الاجتماع', 'The meeting')}</summary>
        <div class="mn-grid">
          <label class="sn-lbl">${B('نوع الجهة', 'Kind')}<select data-f="type">${opt('council', M.type, 'مجلس')}${opt('committee', M.type, 'لجنة')}</select></label>
          <label class="sn-lbl">${B('الجهة', 'Organisation')}<input data-f="org" value="${esc(M.org)}" placeholder="جامعة حائل"></label>
          <label class="sn-lbl">${B('الكلية أو الإدارة', 'College or department')}<input data-f="unit" value="${esc(M.unit)}" placeholder="كلية التربية"></label>
          <label class="sn-lbl">${B('اسم المجلس أو اللجنة', 'Council or committee')}<input data-f="committee" value="${esc(M.committee)}" placeholder="مجلس قسم التربية الخاصة"></label>
          <label class="sn-lbl">${B('رقم الجلسة', 'Meeting no.')}<input data-f="no" value="${esc(M.no)}" inputmode="numeric" placeholder="3"></label>
          <label class="sn-lbl">${B('العام', 'Year')}<input data-f="year" value="${esc(M.year)}" placeholder="1447/1448هـ"></label>
          <label class="sn-lbl">${B('التاريخ', 'Date')}<input type="date" data-f="date" value="${esc(M.date)}"><small class="mn-h2" id="mnHijri"></small></label>
          <label class="sn-lbl">${B('من الساعة', 'From')}<input type="time" data-f="from" value="${esc(M.from)}"></label>
          <label class="sn-lbl">${B('إلى الساعة', 'To')}<input type="time" data-f="to" value="${esc(M.to)}"></label>
          <label class="sn-lbl">${B('المكان', 'Place')}<input data-f="place" value="${esc(M.place)}" placeholder="قاعة الاجتماعات"></label>
          <label class="sn-lbl">${B('طريقة الانعقاد', 'Held')}<select data-f="mode">${opt('in', M.mode, 'حضوري')}${opt('remote', M.mode, 'عن بُعد')}${opt('mix', M.mode, 'حضوري وعن بُعد')}</select></label>
          <label class="sn-lbl">${B('المرفقات (اختياري)', 'Attachments (optional)')}<input data-f="att" value="${esc(M.att)}"></label>
          <label class="sn-lbl">${B('صيغة رقم القرار', 'Decision number format')}<input data-f="numFmt" value="${esc(M.numFmt)}" dir="ltr"><small>${B('{n} رقم الجلسة، {i} رقم البند، {y} العام', '{n} meeting, {i} item, {y} year')}</small></label>
        </div>
        <label class="mn-logo">${M.logo ? `<img src="${M.logo}" alt="">` : ''}<span>${B('شعار الجهة (اختياري)', 'Logo (optional)')}</span><input type="file" accept="image/*" hidden id="mnLogo">${M.logo ? `<button type="button" class="sn-lnk" id="mnNoLogo">${B('إزالة', 'Remove')}</button>` : ''}</label>
      </details>

      <details class="sn-card mn-sec" open><summary><b>٢</b> ${B('الأعضاء والنصاب', 'Members and quorum')}</summary>
        <div id="mnMem"></div>
        <div class="sn-two"><button type="button" class="sn-lnk" id="mnAddM">${B('+ عضو', '+ Member')}</button><button type="button" class="sn-lnk" id="mnPasteM">${B('لصق قائمة أسماء', 'Paste a list of names')}</button><button type="button" class="sn-lnk" id="mnSaveC">💾 ${B('احفظ اللجنة وأعضاءها', 'Save the committee')}</button></div>
        <p class="mn-q" id="mnQ"></p>
        <label class="sn-lbl">${B('المدعوون من غير الأعضاء (اختياري)', 'Guests (optional)')}<input data-f="guests" value="${esc(M.guests)}"></label>
      </details>

      <details class="sn-card mn-sec" open><summary><b>٣</b> ${B('الجلسة السابقة', 'The last meeting')}</summary>
        <label class="mn-ck"><input type="checkbox" id="mnPrev"${M.prev.on ? ' checked' : ''}> ${B('اعتماد محضر الجلسة السابقة بندًا أول', 'Approve the last minutes as the first item')}</label>
        <label class="sn-lbl">${B('ملاحظات على المحضر السابق (اختياري)', 'Notes on the last minutes (optional)')}<input id="mnPrevN" value="${esc(M.prev.note)}" placeholder="${T('دون ملاحظات', 'none')}"></label>
        <p class="mn-sub">${B('متابعة قرارات الجلسة السابقة', 'Follow-up of the last decisions')}</p><div id="mnFol"></div>
        <button type="button" class="sn-lnk" id="mnAddF">${B('+ قرار للمتابعة', '+ Decision to follow up')}</button>
      </details>

      <details class="sn-card mn-sec" open><summary><b>٤</b> ${B('البنود والقرارات', 'Items and decisions')}</summary>
        <div id="mnItems"></div>
        <div class="sn-two"><button type="button" class="btn ghost" id="mnAddI">${B('+ بند', '+ Item')}</button><button type="button" class="btn ghost" id="mnAI">✨ ${B('صياغة من ملاحظاتي', 'Draft from my notes')}</button></div>
        <label class="sn-lbl">${B('ما يستجد من أعمال (اختياري)', 'Any other business (optional)')}<textarea data-f="misc" rows="2">${esc(M.misc)}</textarea></label>
        <label class="sn-lbl">${B('التوصيات (اختياري): توصية في كل سطر', 'Recommendations (optional): one per line')}<textarea data-f="recs" rows="2">${esc(M.recs)}</textarea></label>
        <label class="sn-lbl">${B('موعد الاجتماع القادم (اختياري)', 'Next meeting (optional)')}<input data-f="next" value="${esc(M.next)}" placeholder="${T('يوم الأحد 1448/2/15هـ', 'Sunday …')}"></label>
      </details>

      <details class="sn-card mn-sec"><summary><b>٥</b> ${B('المراجعة', 'Review')}</summary>
        <div id="mnChk"></div>
        <label class="sn-lbl">${B('نص اللائحة أو النظام (اختياري): الصقه هنا لتتحقق الأداة من نصوص المواد المستند إليها، ولتُضاف إلى تعليمات المراجعة', 'The regulations (optional): paste them so the tool can check the articles you cite, and add them to the review instructions')}<textarea id="mnReg" rows="4">${esc(M.reg)}</textarea></label>
        <div class="sn-two"><button type="button" class="btn ghost" id="mnRev">🔎 ${B('تعليمات المراجعة اللغوية والنظامية', 'Instructions for a language and rules review')}</button></div>
      </details>

      <div class="sn-card mn-sec mn-look"><label class="mn-ck"><input type="checkbox" data-ck="bsm"${M.bsm ? ' checked' : ''}> ${B('البسملة أعلى المحضر', 'Basmala at the top')}</label><label class="mn-ck"><input type="checkbox" data-ck="agenda"${M.agenda ? ' checked' : ''}> ${B('جدول الأعمال في أوله', 'Agenda table first')}</label><label class="sn-lbl">${B('التوقيعات', 'Signatures')}<select data-f="sigL">${opt('table', M.sigL, T('جدول', 'Table'))}${opt('grid', M.sigL, T('بطاقات', 'Cards'))}</select></label></div>
      <div class="mn-bar"><button type="button" class="btn solid" id="mnPv">👁 ${B('معاينة', 'Preview')}</button><button type="button" class="btn ghost" id="mnWord">${B('Word', 'Word')}</button><button type="button" class="btn ghost" id="mnPrint">${B('طباعة / PDF', 'Print / PDF')}</button><button type="button" class="btn ghost" id="mnSign">✍️ ${B('أرسله للتوقيع', 'Send for signing')}</button></div>
    </div>`;
    root.querySelectorAll('[data-f]').forEach(i => i.oninput = i.onchange = () => { M[i.dataset.f] = i.value; if (i.dataset.f === 'date') hijri(); if (i.dataset.f === 'type') items(); later(); });
    root.querySelectorAll('[data-ck]').forEach(i => i.onchange = () => { M[i.dataset.ck] = i.checked; later(); });
    q('#mnStatus').onchange = e => { M.status = e.target.value; later(); };
    q('#mnBack').onclick = () => { persist(); home(); };
    const hijri = () => { const d = dates(); q('#mnHijri').textContent = d.h ? `${d.day} ${d.h} هـ` : ''; }; hijri();
    q('#mnLogo').onchange = async e => { const f = e.target.files[0]; if (!f) return; M.logo = await shrink(f, 360); persist(); editor(); };
    if (q('#mnNoLogo')) q('#mnNoLogo').onclick = e => { e.preventDefault(); M.logo = ''; persist(); editor(); };
    q('#mnPrev').onchange = e => { M.prev.on = e.target.checked; later(); };
    q('#mnPrevN').oninput = e => { M.prev.note = e.target.value; later(); };
    q('#mnReg').oninput = e => { M.reg = e.target.value; root.querySelectorAll('.mn-item').forEach(c => basisCheck(c, M.items.find(x => x.id === c.dataset.id))); later(); };
    q('#mnAddM').onclick = () => { M.members.push({ id: uid(), n: '', r: 'عضو', st: 'p' }); members(); const ins = root.querySelectorAll('#mnMem [data-mn]'); ins[ins.length - 1].focus(); later(); };
    q('#mnPasteM').onclick = () => { const t = prompt(T('الصق الأسماء، اسمًا في كل سطر:', 'Paste the names, one per line:')); if (!t) return; const ns = t.split(/\n/).map(s => s.replace(/^\s*[\d٠-٩]+[.)\-]\s*/, '').trim()).filter(Boolean); M.members = M.members.filter(m => m.n.trim()).concat(ns.map(n => ({ id: uid(), n, r: 'عضو', st: 'p' }))); members(); later(); };
    q('#mnSaveC').onclick = () => { if (!named().length) return toast(B('أضف الأعضاء أولًا.', 'Add the members first.'), 1); saveCommittee(); };
    q('#mnAddF').onclick = () => { M.follow.push({ id: uid(), t: '', st: 'go' }); follow(); later(); };
    q('#mnAddI').onclick = () => { M.items.push(newItem()); items(); const c = root.querySelectorAll('.mn-item'); c[c.length - 1].scrollIntoView({ block: 'center', behavior: 'smooth' }); later(); };
    q('#mnAI').onclick = aiDraft; q('#mnRev').onclick = aiReview;
    q('#mnPv').onclick = preview; q('#mnWord').onclick = word; q('#mnPrint').onclick = printIt; q('#mnSign').onclick = toSign;
    members(); follow(); items(); paintChecks();
  }
  function members() {
    const box = root.querySelector('#mnMem'), q = quorum();
    box.innerHTML = M.members.map((m, j) => `<div class="mn-mem" data-id="${m.id}"><b>${j + 1}</b><input data-mn="n" value="${esc(m.n)}" placeholder="${T('الاسم', 'Name')}" dir="auto">
      <input data-mn="r" value="${esc(m.r)}" list="mnRoles" placeholder="${T('الصفة', 'Role')}"><select data-mn="st">${opt('p', m.st, 'حاضر')}${opt('r', m.st, 'عن بُعد')}${opt('x', m.st, 'معتذر')}${opt('a', m.st, 'غائب')}</select><button type="button" class="mn-x" data-rm aria-label="remove">✕</button></div>`).join('') + `<datalist id="mnRoles">${ROLES.map(r => `<option value="${r}">`).join('')}</datalist>`;
    box.querySelectorAll('.mn-mem').forEach(row => { const m = M.members.find(x => x.id === row.dataset.id);
      row.querySelectorAll('[data-mn]').forEach(i => i.oninput = i.onchange = () => { m[i.dataset.mn] = i.value; quor(); later(); });
      row.querySelector('[data-rm]').onclick = () => { M.members = M.members.filter(x => x !== m); members(); later(); }; });
    quor();
  }
  function quor() { const q = quorum(), e = root.querySelector('#mnQ'); if (!e) return; e.className = 'mn-q ' + (q.n ? q.ok ? 'ok' : 'bad' : ''); e.innerHTML = q.n ? (q.ok ? `✓ ${B(`اكتمل النصاب: حضر ${q.p} من ${q.n} (المطلوب ${q.need})`, `Quorum met: ${q.p} of ${q.n} (needs ${q.need})`)}` : `⚠ ${B(`لم يكتمل النصاب: حضر ${q.p} من ${q.n}، والمطلوب ${q.need}`, `No quorum: ${q.p} of ${q.n}, needs ${q.need}`)}`) : ''; }
  function follow() {
    const box = root.querySelector('#mnFol');
    box.innerHTML = M.follow.map(f => `<div class="mn-fol" data-id="${f.id}"><input data-fl="t" value="${esc(f.t)}" placeholder="${T('القرار أو المهمة', 'Decision or task')}"><select data-fl="st">${opt('done', f.st, 'نُفّذ')}${opt('go', f.st, 'قيد التنفيذ')}${opt('late', f.st, 'لم يُنفّذ بعد')}</select><button type="button" class="mn-x" data-rm aria-label="remove">✕</button></div>`).join('');
    box.querySelectorAll('.mn-fol').forEach(row => { const f = M.follow.find(x => x.id === row.dataset.id);
      row.querySelectorAll('[data-fl]').forEach(i => i.oninput = i.onchange = () => { f[i.dataset.fl] = i.value; later(); });
      row.querySelector('[data-rm]').onclick = () => { M.follow = M.follow.filter(x => x !== f); follow(); later(); }; });
  }
  function items() {
    const box = root.querySelector('#mnItems'); if (!box) return;
    box.innerHTML = M.items.map((it, i) => `<div class="mn-item" data-id="${it.id}">
      <div class="mn-ih"><b>${B('البند', 'Item')} ${i + 1}</b><span class="mn-no">${B('القرار رقم', 'Decision no.')} (${esc(decNo(i))})</span><span class="mn-act">${i ? `<button type="button" class="mn-x" data-up title="${T('إلى الأعلى', 'Up')}">↑</button>` : ''}<button type="button" class="mn-x" data-rm aria-label="remove">✕</button></span></div>
      <label class="sn-lbl">${B('الموضوع', 'Subject')}<input data-it="title" value="${esc(it.title)}" placeholder="${T('مثال: الخطة الدراسية المحدثة لبرنامج الماجستير', 'e.g. the updated study plan')}"></label>
      <label class="sn-lbl">${B('المرجع: رقم المعاملة أو الخطاب وتاريخه (اختياري)', 'Reference (optional)')}<input data-it="ref" value="${esc(it.ref)}"></label>
      <label class="sn-lbl">${B('المناقشة باختصار (اختياري)', 'Discussion, briefly (optional)')}<textarea data-it="disc" rows="2">${esc(it.disc)}</textarea></label>
      <div class="mn-kinds">${KINDS.map(([k, l]) => `<button type="button" data-kind="${k}" aria-pressed="${it.kind === k}">${l}</button>`).join('')}</div>
      ${it.kind === 'refer' ? `<label class="sn-lbl">${B('الإحالة إلى', 'Refer to')}<input data-it="to" value="${esc(it.to)}" placeholder="لجنة الخطط والمناهج"></label>` : ''}
      ${it.kind === 'reject' || it.kind === 'defer' ? `<label class="sn-lbl">${B('السبب (اختياري)', 'Reason (optional)')}<input data-it="reason" value="${esc(it.reason)}"></label>` : ''}
      <label class="sn-lbl">${B('نص القرار', 'The decision')} ${it.edited ? `<button type="button" class="sn-lnk" data-reset>${B('↺ أعد الصيغة', '↺ Reset the wording')}</button>` : ''}<textarea data-it="text" rows="2">${esc(decText(it))}</textarea></label>
      <label class="sn-lbl">${B('الاستناد النظامي (اختياري): المادة ونصها', 'Rule relied on (optional): the article and its text')}<textarea data-it="basis" rows="2" placeholder="${T('مثال: المادة (12) من لائحة الدراسات العليا: «…»', 'e.g. Article 12 of …: “…”')}">${esc(it.basis)}</textarea><small class="mn-basis" data-bchk></small></label>
      <div class="mn-row"><label class="sn-lbl">${B('التصويت', 'Vote')}<select data-it="vote">${opt('all', it.vote, 'بالإجماع')}${opt('maj', it.vote, 'بالأغلبية')}${opt('', it.vote, 'لا يُذكر')}</select></label>
        ${it.vote === 'maj' ? `<label class="sn-lbl">${B('موافق', 'For')}<input data-it="yes" value="${esc(it.yes)}" inputmode="numeric"></label><label class="sn-lbl">${B('غير موافق', 'Against')}<input data-it="no" value="${esc(it.no)}" inputmode="numeric"></label>` : ''}</div>
      <div class="mn-dis">${(it.dis || []).map((x, j) => `<div class="mn-fol" data-dis="${j}"><select data-d="n"><option value="">${T('العضو', 'Member')}</option>${named().map(m => opt(m.n, x.n)).join('')}</select><select data-d="k">${opt('res', x.k, 'تحفظ')}${opt('no', x.k, 'رأي مخالف')}</select><input data-d="note" value="${esc(x.note)}" placeholder="${T('السبب كما أبداه العضو', 'The reason, as given')}"><button type="button" class="mn-x" data-drm>✕</button></div>`).join('')}
        <button type="button" class="sn-lnk" data-adis>${B('+ تحفظ أو رأي مخالف', '+ Reservation or dissent')}</button></div>
      <div class="mn-tasks">${(it.tasks || []).map((t, j) => `<div class="mn-fol" data-task="${j}"><input data-t="t" value="${esc(t.t)}" placeholder="${T('المهمة', 'Task')}"><input data-t="who" value="${esc(t.who)}" list="mnWho" placeholder="${T('المسؤول', 'Owner')}"><input data-t="due" value="${esc(t.due)}" placeholder="${T('الموعد', 'Due')}"><button type="button" class="mn-x" data-trm>✕</button></div>`).join('')}
        <button type="button" class="sn-lnk" data-atask>${B('+ مهمة: مسؤول وموعد', '+ Task: owner and date')}</button></div>
    </div>`).join('') + `<datalist id="mnWho">${named().map(m => `<option value="${esc(m.n)}">`).join('')}</datalist>`;
    box.querySelectorAll('.mn-item').forEach(card => {
      const it = M.items.find(x => x.id === card.dataset.id), re = () => { items(); later(); };
      card.querySelectorAll('[data-it]').forEach(i => i.oninput = i.onchange = () => {
        const k = i.dataset.it; it[k] = i.value;
        if (k === 'text') it.edited = true;
        if (['title', 'to', 'reason'].includes(k) && !it.edited) { const tx = card.querySelector('[data-it="text"]'); tx.value = decText(it); }
        if (k === 'vote') return re();
        if (k === 'basis') basisCheck(card, it);
        later();
      });
      card.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { it.kind = b.dataset.kind; if (it.kind !== 'free') it.edited = false; re(); });
      const rs = card.querySelector('[data-reset]'); if (rs) rs.onclick = e => { e.preventDefault(); it.edited = false; re(); };
      card.querySelector('[data-rm]').onclick = () => { if (M.items.length > 1 && !confirm(T('حذف هذا البند؟', 'Delete this item?'))) return; M.items = M.items.filter(x => x !== it); if (!M.items.length) M.items.push(newItem()); re(); };
      const up = card.querySelector('[data-up]'); if (up) up.onclick = () => { const i = M.items.indexOf(it); [M.items[i - 1], M.items[i]] = [M.items[i], M.items[i - 1]]; re(); };
      card.querySelector('[data-adis]').onclick = () => { it.dis.push({ n: '', k: 'res', note: '' }); re(); };
      card.querySelectorAll('[data-dis]').forEach(row => { const x = it.dis[+row.dataset.dis]; row.querySelectorAll('[data-d]').forEach(i => i.oninput = i.onchange = () => { x[i.dataset.d] = i.value; later(); }); row.querySelector('[data-drm]').onclick = () => { it.dis.splice(+row.dataset.dis, 1); re(); }; });
      card.querySelector('[data-atask]').onclick = () => { it.tasks.push({ t: '', who: '', due: '' }); re(); };
      card.querySelectorAll('[data-task]').forEach(row => { const t = it.tasks[+row.dataset.task]; row.querySelectorAll('[data-t]').forEach(i => i.oninput = () => { t[i.dataset.t] = i.value; later(); }); row.querySelector('[data-trm]').onclick = () => { it.tasks.splice(+row.dataset.task, 1); re(); }; });
      basisCheck(card, it);
    });
  }
  // the quoted text of a cited article should be found, word for word, in the regulations the secretary pasted
  const normA = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[«»"“”'().,،:؛\-]/g, ' ').replace(/\s+/g, ' ').trim();
  function quotesOf(s) { return (String(s).match(/[«"“]([^»"”]{12,})[»"”]/g) || []).map(q => q.slice(1, -1)); }
  function basisCheck(card, it) {
    const e = card.querySelector('[data-bchk]'); if (!e) return;
    const qs = quotesOf(it.basis);
    if (!it.basis.trim()) { e.innerHTML = ''; return; }
    if (!M.reg.trim()) { e.innerHTML = qs.length ? B('الصق نص اللائحة في «المراجعة» لتتحقق الأداة من النص المقتبس.', 'Paste the regulations under “Review” to check the quoted text.') : ''; return; }
    if (!qs.length) { e.innerHTML = `⚠ ${B('ضع نص المادة بين «» ليتحقق منه.', 'Put the article’s text in «» to check it.')}`; e.className = 'mn-basis warn'; return; }
    const R = normA(M.reg), bad = qs.filter(x => !R.includes(normA(x)));
    e.className = 'mn-basis ' + (bad.length ? 'bad' : 'ok');
    e.innerHTML = bad.length ? `⚠ ${B('لم أجد هذا النص في اللائحة الملصقة؛ تحقق منه قبل اعتماده.', 'This text is not in the pasted regulations; check it before approving.')}` : `✓ ${B('النص المقتبس موجود في اللائحة.', 'The quoted text is in the regulations.')}`;
  }
  function paintChecks() {
    const box = root.querySelector('#mnChk'); if (!box || !M) return;
    const w = [], q = quorum();
    if (!M.committee.trim()) w.push(T('اكتب اسم المجلس أو اللجنة.', 'Name the council or committee.'));
    if (!M.no.trim()) w.push(T('رقم الجلسة غير مكتوب.', 'No meeting number.'));
    if (!q.n) w.push(T('لم تُكتب أسماء الأعضاء.', 'No members listed.')); else if (!q.ok) w.push(T(`النصاب غير مكتمل (${q.p} من ${q.n}).`, `No quorum (${q.p} of ${q.n}).`));
    if (!M.members.some(m => /رئيس/.test(m.r) && m.n.trim())) w.push(T('لم يُحدَّد رئيس الاجتماع.', 'No chair named.'));
    M.items.forEach((it, i) => { if (!it.title.trim()) w.push(T(`البند ${i + 1} بلا موضوع.`, `Item ${i + 1} has no subject.`)); if (it.kind === 'refer' && !it.to.trim() && !it.edited) w.push(T(`البند ${i + 1}: حدّد جهة الإحالة.`, `Item ${i + 1}: who is it referred to?`)); if (it.vote === 'maj' && !(it.yes || it.no)) w.push(T(`البند ${i + 1}: اكتب عدد الأصوات عند الأغلبية.`, `Item ${i + 1}: give the vote count.`)); (it.tasks || []).forEach(t => { if (t.t.trim() && (!t.who.trim() || !t.due.trim())) w.push(T(`البند ${i + 1}: مهمة بلا مسؤول أو موعد.`, `Item ${i + 1}: a task without owner or date.`)); }); });
    if (M.status === 'final' && w.length) w.unshift(T('المحضر «معتمد» وفيه ملاحظات؛ راجعها.', 'Marked approved but has notes; check them.'));
    box.innerHTML = w.length ? `<ul class="mn-warn">${w.map(x => `<li>⚠ ${esc(x)}</li>`).join('')}</ul>` : `<p class="mn-ok">✓ ${B('لا ملاحظات على اكتمال المحضر.', 'Nothing missing.')}</p>`;
  }

  /* ---------- the AI: drafting from notes, and a language and rules review ---------- */
  function sheet(html) { const m = document.createElement('div'); m.className = 'mn-modal'; m.innerHTML = `<div class="mn-mbox">${html}</div>`; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-mx]')) m.remove(); }); return m; }
  const PRIV = () => `<p class="mn-priv">🔒 ${B('ما تلصقه في ChatGPT أو Claude يُرسل إلى خدمتهما. لا تلصق ما لا يجوز إطلاع غير الأعضاء عليه.', 'What you paste into ChatGPT or Claude goes to their service. Do not paste what must stay within the members.')}</p>`;
  function aiDraft() {
    const m = sheet(`<h3>✨ ${B('صياغة البنود من ملاحظاتك', 'Draft the items from your notes')}</h3>
      <label class="sn-lbl">${B('ملاحظاتك من الاجتماع، كما هي', 'Your notes from the meeting, as they are')}<textarea id="aiN" rows="7" placeholder="${T('ناقشنا الخطة الدراسية وطلب د. أحمد تعديل مقرر 205 ووافقنا وتحفظ د. سالم… أحلنا طلب الطالب للجنة الدراسات العليا…', 'We discussed …')}"></textarea></label>
      ${PRIV()}
      <div class="sn-two"><button type="button" class="btn solid" id="aiCopy">${B('١. انسخ التعليمات', '1. Copy the instructions')}</button><a class="btn ghost" id="aiGpt" target="_blank" rel="noopener">ChatGPT</a><a class="btn ghost" id="aiCl" target="_blank" rel="noopener">Claude</a></div>
      <label class="sn-lbl">${B('٢. الصق الرد هنا', '2. Paste the reply here')}<textarea id="aiR" rows="6"></textarea></label>
      <div class="sn-two"><button type="button" class="btn solid" id="aiAdd">${B('أضف البنود', 'Add the items')}</button><button type="button" class="btn ghost" data-mx>${B('إغلاق', 'Close')}</button></div>`);
    const pr = () => draftPrompt(m.querySelector('#aiN').value.trim());
    const links = () => { const p = encodeURIComponent(pr()); m.querySelector('#aiGpt').href = 'https://chatgpt.com/?q=' + p; m.querySelector('#aiCl').href = 'https://claude.ai/new?q=' + p; };
    m.querySelector('#aiN').oninput = links; links();
    m.querySelector('#aiCopy').onclick = async e => { if (!m.querySelector('#aiN').value.trim()) return toast(B('اكتب ملاحظاتك أولًا.', 'Write your notes first.'), 1); try { await navigator.clipboard.writeText(pr()); e.currentTarget.textContent = '✓ ' + T('نُسخت؛ الصقها في المساعد', 'Copied; paste it into the assistant'); } catch (er) { toast(B('تعذّر النسخ.', 'Could not copy.'), 1); } };
    m.querySelector('#aiAdd').onclick = () => {
      const got = parseDraft(m.querySelector('#aiR').value);
      if (!got.length) return toast(B('لم أتعرّف على بنود في الرد. تأكد أنك نسخته كاملًا.', 'No items found in the reply. Make sure you copied all of it.'), 1);
      if (M.items.length === 1 && !M.items[0].title.trim()) M.items = [];
      M.items.push(...got); m.remove(); persist(); editor(); toast(B(`أُضيفت البنود (${got.length}). راجع كل قرار قبل الاعتماد.`, `${got.length} items added. Check each decision before approving.`));
    };
  }
  function draftPrompt(notes) {
    const b = body(), reg = M.reg.trim();
    return `أنت أمين ${b.the === 'المجلس' ? 'مجلس' : 'لجنة'} محترف. حوّل ملاحظات الاجتماع التالية إلى بنود محضر رسمي بلغة عربية إدارية سليمة وموجزة.

الأعضاء: ${named().map(m => m.n + ' (' + m.r + ')').join('، ') || 'غير محدد'}

الملاحظات:
${notes}
${reg ? `\nنص اللائحة المعتمدة (استند إليها فقط، واقتبس نص المادة حرفيًا بين «»، ولا تذكر مادة غير موجودة فيها):\n${reg.slice(0, 12000)}\n` : '\nلا تذكر أي مادة نظامية أو رقم مادة، لأن نص اللائحة غير متاح.\n'}
الشروط:
- لكل موضوع بند مستقل. لا تضف معلومة غير موجودة في الملاحظات، واكتب «…» مكان ما ينقص.
- نوع القرار واحد من: الموافقة، عدم الموافقة، الإحالة، التأجيل، الإحاطة.
- نص القرار يبدأ بـ«${b.verb} ${b.the}:» أو «${b.noted} ${b.the} علمًا».
- اذكر التحفظ أو الرأي المخالف باسم العضو كما في الملاحظات فقط.

اكتب الرد بهذه الصيغة بالضبط، داخل صندوق نص واحد، دون أي شرح:

البند: الموضوع
المرجع: (إن وُجد)
المناقشة: جملة أو جملتان
النوع: الموافقة
القرار: ${b.verb} ${b.the}: …
الاستناد: (إن وُجد) المادة (…) من …: «النص حرفيًا»
التصويت: بالإجماع
تحفظ: اسم العضو — السبب
مهمة: المهمة | المسؤول | الموعد

البند: …

وفي النهاية، إن وُجدت توصيات عامة غير مرتبطة ببند:
توصية: …`;
  }
  function parseDraft(text) {
    const lines = String(text || '').replace(/```[a-z]*/g, '').split(/\r?\n/).map(s => s.replace(/\*\*/g, '').trim());
    const out = []; let cur = null;
    const KIND = { 'الموافقة': 'approve', 'عدم الموافقة': 'reject', 'الإحالة': 'refer', 'التأجيل': 'defer', 'الإحاطة': 'note' };
    for (const l of lines) {
      const m = l.match(/^([^:：]{2,14})\s*[:：]\s*(.*)$/); if (!m) { if (cur && cur._last && l) cur[cur._last] += '\n' + l; continue; }
      const k = m[1].trim(), v = m[2].trim();
      if (/^البند/.test(k)) { cur = newItem(); cur.title = v; cur._last = 'title'; out.push(cur); continue; }
      if (!cur) continue;
      if (/المرجع/.test(k)) { cur.ref = v; cur._last = 'ref'; }
      else if (/المناقشة/.test(k)) { cur.disc = v; cur._last = 'disc'; }
      else if (/النوع/.test(k)) { cur.kind = KIND[v.replace(/[.،]/g, '').trim()] || 'free'; cur._last = null; }
      else if (/القرار/.test(k)) { cur.text = v; cur.edited = true; cur._last = 'text'; }
      else if (/الاستناد/.test(k)) { cur.basis = /^\(?إن وُجد\)?$|^-$|^لا يوجد$/.test(v) ? '' : v; cur._last = 'basis'; }
      else if (/التصويت/.test(k)) { cur.vote = /أغلبية/.test(v) ? 'maj' : /إجماع/.test(v) ? 'all' : ''; cur._last = null; }
      else if (/تحفظ|مخالف/.test(k)) { const [n, note] = v.split(/\s+[—\-–]\s+/); if (n && !/^\(?إن/.test(n)) cur.dis.push({ n: (named().find(x => x.n.includes(n.trim()) || n.includes(x.n)) || {}).n || n.trim(), k: /مخالف/.test(k) ? 'no' : 'res', note: (note || '').trim() }); cur._last = null; }
      else if (/^توصية/.test(k)) { if (v && v !== '…') M.recs = (M.recs.trim() ? M.recs.trim() + '\n' : '') + v; cur._last = null; }
      else if (/مهمة/.test(k)) { const [t, who, due] = v.split('|').map(s => (s || '').trim()); if (t && t !== '…') cur.tasks.push({ t, who: who || '', due: due || '' }); cur._last = null; }
    }
    out.forEach(x => { delete x._last; if (x.ref && /^\(?إن وُجد\)?$/.test(x.ref)) x.ref = ''; });
    return out.filter(x => x.title || x.text);
  }
  function aiReview() {
    persist();
    const plain = (() => { const d = document.createElement('div'); d.innerHTML = doc(); return d.innerText; })();
    const reg = M.reg.trim();
    const p = `راجع محضر الاجتماع التالي مراجعة لغوية ونظامية دقيقة، ولا تعِد كتابته كاملًا.

${reg ? `استند إلى نص اللائحة المرفق فقط، واقتبس نص أي مادة تذكرها حرفيًا بين «». إن لم تجد نصًّا يدعم ملاحظتك فقل ذلك صراحة.\n\nاللائحة:\n${reg.slice(0, 12000)}\n` : 'لا يتوفر نص اللائحة؛ فلا تذكر أرقام مواد، واكتفِ بالملاحظات العامة.\n'}
المحضر:
${plain.slice(0, 14000)}

اكتب الملاحظات في جدول من أربعة أعمدة: الموضع | الملاحظة | النوع (لغوية، نظامية، صياغة قرار، نقص) | الصيغة المقترحة.
ركّز على: وضوح نص كل قرار وقابليته للتنفيذ، واكتمال النصاب، وتطابق القرار مع اللائحة، والتحفظات، والمهام بلا مسؤول أو موعد، والأخطاء اللغوية.`;
    const m = sheet(`<h3>🔎 ${B('مراجعة لغوية ونظامية', 'Language and rules review')}</h3>
      <p>${B('تُجهَّز تعليمات فيها نص المحضر', 'Instructions are prepared with the minutes')}${reg ? B(' واللائحة', ' and the regulations') : ''}${B('، تلصقها في المساعد فيعطيك جدول ملاحظات تراجعه وتعدّل بنفسك.', ', paste them into the assistant, and it gives a table of notes for you to apply.')}</p>
      ${reg ? '' : `<p class="mn-priv">⚠ ${B('لم تلصق نص اللائحة؛ ستكون المراجعة لغوية وعامة فقط. الصقه في قسم «المراجعة» لمراجعة نظامية.', 'No regulations pasted; the review will be on language and general points only.')}</p>`}
      ${PRIV()}
      <div class="sn-two"><button type="button" class="btn solid" id="rvCopy">${B('انسخ التعليمات', 'Copy the instructions')}</button><a class="btn ghost" target="_blank" rel="noopener" href="https://chatgpt.com/">ChatGPT</a><a class="btn ghost" target="_blank" rel="noopener" href="https://claude.ai/new">Claude</a><button type="button" class="btn ghost" data-mx>${B('إغلاق', 'Close')}</button></div>`);
    m.querySelector('#rvCopy').onclick = async e => { try { await navigator.clipboard.writeText(p); e.currentTarget.textContent = '✓ ' + T('نُسخت؛ الصقها في المساعد', 'Copied; paste it into the assistant'); } catch (er) { toast(B('تعذّر النسخ.', 'Could not copy.'), 1); } };
  }

  /* ---------- outputs ---------- */
  function preview() {
    persist();
    const m = sheet(`<div class="mn-pvh"><b>${B('معاينة المحضر', 'Preview')}</b><button type="button" class="btn ghost" data-mx>${B('إغلاق', 'Close')}</button></div><div class="mn-paper"><style>${DOC_CSS}</style>${doc()}</div>`);
    m.classList.add('mn-pv');
  }
  const fname = () => ('محضر ' + (M.committee || '') + (M.no ? ' ' + M.no : '')).replace(/[\\/:*?"<>|]+/g, ' ').trim();
  // Word ignores most class rules, so the tables and boxes get their look inline
  function wordify(h) {
    const d = new DOMParser().parseFromString(`<div>${h}</div>`, 'text/html').body.firstChild, B1 = '1px solid #9aa4ad';
    d.querySelectorAll('table.mo-t').forEach(t => { t.setAttribute('border', '1'); t.setAttribute('cellspacing', '0'); t.setAttribute('cellpadding', '5'); t.setAttribute('width', '100%'); t.style.cssText = 'width:100%;border-collapse:collapse;border:' + B1; });
    d.querySelectorAll('.mo-t th').forEach(c => c.style.cssText = `border:${B1};background:#eef2f6;text-align:right;padding:4px 8px`);
    d.querySelectorAll('.mo-t td').forEach(c => c.style.cssText = `border:${B1};text-align:${c.classList.contains('mo-card') ? 'center' : 'right'};vertical-align:top;padding:4px 8px` + (c.classList.contains('mo-sigbox') ? ';height:40px;width:30%' : ''));
    d.querySelectorAll('.mo-card .mo-sigbox').forEach(x => { x.style.height = '48px'; x.innerHTML = '&nbsp;'; });
    d.querySelectorAll('table.mo-hd').forEach(t => { t.setAttribute('width', '100%'); t.style.cssText = 'width:100%;border-bottom:2px solid #1f3b5c'; });
    d.querySelectorAll('.mo-hd td').forEach((c, i) => c.style.cssText = 'width:33%;vertical-align:middle;text-align:' + ['right', 'center', 'left'][i]);
    d.querySelectorAll('.mo-item').forEach(x => x.style.cssText = 'border-right:3px solid #c9822b;padding:2px 10px;margin:8px 0');
    d.querySelectorAll('.mo-dec').forEach(x => x.style.cssText = 'background:#f7f3ea;padding:3px 6px');
    d.querySelectorAll('h1').forEach(x => x.style.cssText = 'font-size:17pt;text-align:center');
    d.querySelectorAll('h2,h3').forEach(x => x.style.cssText = `font-size:${x.tagName === 'H2' ? 13 : 12}pt;color:#1f3b5c;margin:10pt 0 4pt`);
    return d.innerHTML;
  }
  function word() {
    persist();
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(fname())}</title>
      <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--><style>@page{size:21cm 29.7cm;margin:2cm}body{direction:rtl;font-family:Arial,sans-serif;font-size:12pt}p{margin:3pt 0}</style></head><body dir="rtl" lang="ar-SA">${wordify(doc())}</body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + html], { type: 'application/msword' })); a.download = fname() + '.doc'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }
  function printIt() {
    persist();
    const w = window.open('', '_blank'); if (!w) return toast(B('اسمح للموقع بفتح نافذة جديدة ثم أعد المحاولة.', 'Allow pop-ups and try again.'), 1);
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(fname())}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>@page{size:A4;margin:16mm}body{margin:0}${DOC_CSS}</style></head><body>${doc()}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`);
    w.document.close();
  }
  // the minutes as A4 page images in a PDF, with each signature box handed over to the signing tool
  async function toSign() {
    persist();
    if (!present().length) return toast(B('لا يوجد حاضرون في المحضر.', 'No one is marked present.'), 1);
    const btn = root.querySelector('#mnSign'); btn.disabled = true; btn.textContent = T('يُجهَّز…', 'Preparing…');
    try {
      await need('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); await need('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
      const W = 794, H = 1123, PAD = 60; // A4 at 96 dpi
      const host = document.createElement('div'); host.className = 'mn-render'; host.style.width = W + 'px'; host.innerHTML = `<style>${DOC_CSS}.mo-doc{padding:${PAD}px}</style>${doc()}`;
      document.body.appendChild(host); await document.fonts.ready;
      const d = host.querySelector('.mo-doc');
      // break pages before an item or table that would be cut
      const blocks = [...d.children]; let pageTop = 0;
      blocks.forEach(el => { const pv = el.previousElementSibling, at = pv && pv.tagName === 'H2' ? pv : el, top = at.offsetTop, h = el.offsetTop + el.offsetHeight - top; if (top + h - pageTop > H - PAD && h < H - 2 * PAD && top > pageTop + PAD) { const sp = document.createElement('div'); sp.style.height = (pageTop + H - top + PAD) + 'px'; at.before(sp); pageTop += H; } else if (top + h - pageTop > H) pageTop += H * Math.floor((top + h - pageTop) / H); });
      const total = Math.ceil(d.offsetHeight / H), cv = await html2canvas(d, { scale: 2, backgroundColor: '#fff', windowWidth: W });
      const pdf = await PDFLib.PDFDocument.create(), slots = [], ptW = 595.28, ptH = 841.89, k = ptW / W;
      for (let p = 0; p < total; p++) {
        const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, p * H * 2, W * 2, H * 2, 0, 0, W * 2, H * 2);
        const img = await pdf.embedJpg(await (await fetch(c.toDataURL('image/jpeg', .9))).arrayBuffer()); const pg = pdf.addPage([ptW, ptH]); pg.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
      }
      d.querySelectorAll('.mo-sigbox').forEach(td => { const r = td.getBoundingClientRect(), o = d.getBoundingClientRect(), top = r.top - o.top, p = Math.floor(top / H), y = top - p * H;
        slots.push({ p, n: td.dataset.n, r: td.dataset.r, x: +(r.left - o.left + 4) * k, y: ptH - (y + r.height - 4) * k, w: (r.width - 8) * k, h: (r.height - 8) * k }); });
      host.remove();
      const bytes = await pdf.save();
      await handoff({ pdf: bytes, slots: slots.map(s => Object.assign(s, { x: +s.x.toFixed(1), y: +s.y.toFixed(1), w: +s.w.toFixed(1), h: +s.h.toFixed(1) })), title: fname(), at: Date.now() });
      location.href = '../sign/index.html#minutes';
    } catch (e) { toast(B('تعذّر تجهيز الملف للتوقيع. نزّله PDF وارفعه في أداة التوقيع.', 'Could not prepare it. Save a PDF and upload it to the signing tool.'), 1); }
    btn.disabled = false; btn.innerHTML = '✍️ ' + B('أرسله للتوقيع', 'Send for signing');
  }
  const need = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  function handoff(v) { return new Promise((ok, no) => { const r = indexedDB.open('alsamani', 1); r.onupgradeneeded = () => r.result.createObjectStore('hand'); r.onerror = () => no(r.error); r.onsuccess = () => { const tx = r.result.transaction('hand', 'readwrite'); tx.objectStore('hand').put(v, 'minutes'); tx.oncomplete = ok; tx.onerror = () => no(tx.error); }; }); }
  function shrink(file, max) { return new Promise(ok => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/png')); }; im.src = URL.createObjectURL(file); }); }

  document.addEventListener('DOMContentLoaded', home);
  if (document.readyState !== 'loading') home();
})();

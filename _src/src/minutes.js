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
  let tSave; const later = () => { clearTimeout(tSave); tSave = setTimeout(() => { persist(); saveCommittee(); paintChecks(); }, 400); };
  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => normM({ id: uid(), type: 'council', org: '', unit: '', committee: '', logo: '', no: '', year: '', date: today(), from: '', to: '', place: '', mode: 'in', numFmt: '{n}/{i}',
    members: [{ id: uid(), n: '', r: 'رئيس المجلس', st: 'p' }, { id: uid(), n: '', r: 'عضو', st: 'p' }, { id: uid(), n: '', r: 'عضو', st: 'p' }, { id: uid(), n: '', r: 'أمين المجلس', st: 'p' }],
    guests: '', att: '', bsm: true, agenda: true, sigL: 'table', prev: { on: true, note: '' }, follow: [], items: [newItem()], misc: '', recs: '', next: '', status: 'draft', reg: '' });
  function newItem() { return { id: uid(), title: '', ref: '', disc: '', kind: 'approve', to: '', reason: '', text: '', edited: false, basis: '', vote: 'all', yes: '', no: '', dis: [], tasks: [] }; }
  // the parts of the minutes, each can be turned off; and the default wording of each heading
  const SECS = [['bsm', 'البسملة'], ['logo', 'الشعار'], ['info', 'جدول بيانات الاجتماع'], ['intro', 'فقرة الافتتاح'], ['att', 'جدول الحضور'], ['quorum', 'عبارة النصاب'], ['agenda', 'جدول الأعمال'],
    ['disc', 'المناقشة في كل بند'], ['vote', 'التصويت'], ['recs', 'التوصيات'], ['sum', 'ملخص القرارات والتكليفات'], ['close', 'الاختتام'], ['sig', 'التوقيعات'], ['num', 'ترقيم العناوين: أولًا، ثانيًا']];
  const DH = { intro: '', att: 'الحضور واكتمال النصاب', agenda: 'جدول الأعمال', decs: 'المناقشات والقرارات', recs: 'التوصيات', sum: 'ملخص القرارات والتكليفات', close: 'اختتام الاجتماع', sig: 'توقيعات الحضور' };
  const head = k => (M.heads[k] != null && M.heads[k].trim() !== '' ? M.heads[k] : DH[k]);
  function normM(x) {
    x.show = Object.assign({ bsm: x.bsm !== false, logo: true, info: true, intro: true, att: true, quorum: true, agenda: x.agenda !== false, disc: true, vote: true, recs: true, sum: true, close: true, sig: true, num: true }, x.show || {});
    x.heads = Object.assign({}, x.heads || {});
    if (!x.info) { x.info = [{ id: uid(), k: 'التاريخ', t: 'date' }, { id: uid(), k: 'الوقت', t: 'time' }, { id: uid(), k: 'المكان', t: 'place' }];
      if ((x.year || '').trim()) x.info.push({ id: uid(), k: 'العام أو الدورة', v: x.year }); if ((x.att || '').trim()) x.info.push({ id: uid(), k: 'المرفقات', v: x.att }); x.year = ''; x.att = ''; }
    return x;
  }
  const infoVal = r => { const d = dates(), when = M.mode === 'remote' ? 'عن بُعد' : M.mode === 'mix' ? 'حضوري وعن بُعد' : '';
    return r.t === 'date' ? (M.date ? `${d.day} ${d.h} هـ، الموافق ${d.g}` : '') : r.t === 'time' ? (M.from ? 'من ' + t12(M.from) : '') + (M.to ? ' إلى ' + t12(M.to) : '') : r.t === 'place' ? [M.place.trim(), when].filter(Boolean).join('، ') : (r.v || ''); };
  const body = () => M.type === 'committee' ? { the: 'اللجنة', verb: 'قررت', noted: 'أحيطت', head: 'رئيس اللجنة' } : { the: 'المجلس', verb: 'قرر', noted: 'أحيط', head: 'رئيس المجلس' };
  // the decision in the usual wording, from its kind
  function phrase(it) {
    const b = body(), t = (it.title || '…').trim();
    return ({ approve: `${b.verb} ${b.the}: الموافقة على ${t}.`, reject: `${b.verb} ${b.the}: عدم الموافقة على ${t}${it.reason ? '، ' + it.reason.trim() : ''}.`,
      refer: `${b.verb} ${b.the}: إحالة ${t} إلى ${(it.to || '…').trim()} لدراسته والرفع بالتوصية.`, defer: `${b.verb} ${b.the}: تأجيل النظر في ${t} إلى الجلسة القادمة${it.reason ? '، ' + it.reason.trim() : ''}.`,
      note: `${b.noted} ${b.the} علمًا بـ${t}.`, free: '' })[it.kind] || '';
  }
  const decText = it => it.edited || it.kind === 'free' ? it.text : phrase(it);
  const decNo = (i) => (M.numFmt || '{n}/{i}').replace('{n}', M.no || '…').replace('{i}', i + 1).replace('{y}', (M.info.find(r => /عام|دورة|سنة/.test(r.k) && (r.v || '').trim()) || {}).v || (dates().h.match(/\d{4}/) || ['…'])[0]);
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
    const b = body(), q = quorum(), S = M.show, chair = present().find(m => /رئيس/.test(m.r) && !/نائب/.test(m.r));
    let k = 0, h = 0; const sec = [], rows = [], H = key => `<h2>${S.num ? (HEADS[h++] || '') + ': ' : ''}${esc(head(key))}</h2>`;
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
        ${S.disc && it.disc.trim() ? `<p><b>المناقشة:</b> ${nl(it.disc)}</p>` : ''}
        <p class="mo-dec"><b>القرار رقم (<bdi dir="ltr">${esc(decNo(i))}</bdi>):</b> ${nl(decText(it))}</p>
        ${it.basis.trim() ? `<p class="mo-basis"><b>الاستناد النظامي:</b> ${nl(it.basis)}</p>` : ''}
        ${S.vote && vote ? `<p><b>التصويت:</b> صدر القرار ${vote}.</p>` : ''}
        ${(it.dis || []).filter(x => x.n.trim()).map(x => `<p class="mo-dis"><b>${x.k === 'no' ? 'رأي مخالف' : 'تحفظ'}:</b> ${esc(x.n)}${x.note.trim() ? ' — ' + esc(x.note) : ''}</p>`).join('')}
        ${tk.length ? `<p><b>التكليف:</b> ${tk.map(t => esc(t.t) + (t.who ? ' — ' + esc(t.who) : '') + (t.due ? ' (' + esc(t.due) + ')' : '')).join('؛ ')}.</p>` : ''}
      </div>`);
      rows.push(`<tr><td><bdi dir="ltr">${esc(decNo(i))}</bdi></td><td>${nl(decText(it))}${tk.filter(t => t.t.trim()).map(t => `<div class="mo-tk">— ${esc(t.t)}</div>`).join('')}</td><td>${tk.map(t => esc(t.who)).filter(Boolean).join('<br>')}</td><td>${tk.map(t => esc(t.due)).filter(Boolean).join('<br>')}</td></tr>`);
      k++;
    });
    if (M.misc.trim()) { agenda.push('ما يستجد من أعمال'); sec.push(`<div class="mo-item"><h3>${k + 1}. ما يستجد من أعمال</h3><p>${nl(M.misc)}</p></div>`); k++; }
    const recs = M.recs.split(/\n/).map(x => x.replace(/^\s*[-•\d٠-٩]+[.)\-]?\s*/, '').trim()).filter(Boolean);
    const sig = present(), info = M.info.map(r => [r.k, infoVal(r)]).filter(r => String(r[1]).trim());
    const sigs = M.sigL === 'grid'
      ? `<table class="mo-t mo-grid">${sig.reduce((r, m, j) => (j % 2 ? r[r.length - 1].push(m) : r.push([m]), r), []).map(row => `<tr>${row.map(m => `<td class="mo-card"><b>${esc(m.r)}</b><div class="mo-sigbox" data-n="${esc(m.n)}" data-r="${esc(m.r)}"></div>${esc(m.n)}</td>`).join('')}${row.length < 2 ? '<td class="mo-card"></td>' : ''}</tr>`).join('')}</table>`
      : `<table class="mo-t mo-sig"><tr><th>م</th><th>الاسم</th><th>الصفة</th><th>التوقيع</th></tr>${sig.map((m, j) => `<tr><td>${j + 1}</td><td>${esc(m.n)}</td><td>${esc(m.r)}</td><td class="mo-sigbox" data-n="${esc(m.n)}" data-r="${esc(m.r)}"></td></tr>`).join('')}</table>`;
    return `<div class="mo-doc${M.status === 'draft' ? ' draft' : ''}" dir="rtl">
      <table class="mo-hd"><tr><td class="mo-org">${M.org ? `<b>${esc(M.org)}</b><br>` : ''}${M.unit ? `${esc(M.unit)}` : ''}</td><td class="mo-bsm">${S.bsm ? 'بسم الله الرحمن الرحيم' : ''}</td><td class="mo-logo">${M.logo && S.logo ? `<img src="${M.logo}" alt="" height="64">` : ''}</td></tr></table>
      <h1>محضر الاجتماع${M.no ? ` رقم (${esc(M.no)})` : ''}${M.committee ? '<br>' + esc(li(M.committee)) : ''}</h1>
      ${S.info && info.length ? `<table class="mo-t mo-info">${info.map(([a, v]) => `<tr><th>${esc(a)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
      ${S.intro ? `${head('intro').trim() ? `<h2>${esc(head('intro'))}</h2>` : ''}<p>${introText()}</p>` : ''}
      ${S.att ? `${H('att')}<table class="mo-t"><tr><th>م</th><th>الاسم</th><th>الصفة</th><th>الحضور</th></tr>${named().map((m, j) => `<tr><td>${j + 1}</td><td>${esc(m.n)}</td><td>${esc(m.r)}</td><td>${STL[m.st] || ''}</td></tr>`).join('')}</table>
      ${M.guests.trim() ? `<p><b>المدعوون من غير الأعضاء:</b> ${esc(M.guests)}</p>` : ''}` : ''}
      ${S.quorum ? `<p class="mo-q">${quorumText(chair)}</p>` : ''}
      ${S.agenda && agenda.length ? `${H('agenda')}<table class="mo-t"><tr><th>م</th><th>الموضوع</th></tr>${agenda.map((t, j) => `<tr><td>${j + 1}</td><td>${esc(t)}</td></tr>`).join('')}</table>` : ''}
      ${H('decs')}
      ${sec.join('')}
      ${S.recs && recs.length ? `${H('recs')}${recs.map((r, j) => `<p class="mo-rec">${j + 1}. ${esc(r)}</p>`).join('')}` : ''}
      ${S.sum && rows.length ? `${H('sum')}<table class="mo-t mo-sum"><tr><th>رقم القرار</th><th>القرار والتكليف</th><th>المكلّف</th><th>الموعد</th></tr>${rows.join('')}</table>` : ''}
      ${S.close ? `${H('close')}<p>${closeText()}</p>` : ''}
      ${S.sig ? `${H('sig')}${sigs}` : ''}
    </div>`;
  }
  // the sentences written for you, shared by the page and the exports
  function introText() {
    const d = dates(), chair = present().find(m => /رئيس/.test(m.r) && !/نائب/.test(m.r)), when = M.mode === 'remote' ? 'عن بُعد' : M.mode === 'mix' ? 'حضوريًا وعن بُعد' : '';
    return `${M.date ? `في يوم ${esc(d.day)} ${esc(d.h)}${d.h ? ' هـ' : ''}، ` : ''}${M.from ? `عند الساعة ${t12(M.from)}، ` : ''}عُقد الاجتماع ${M.no ? `رقم (${esc(M.no)}) ` : ''}${M.committee.trim() ? esc(li(M.committee)) : ''}${when ? ' ' + when : ''}${M.place.trim() ? ` في ${esc(M.place.trim())}` : ''}${chair ? `، برئاسة ${esc(chair.n)}، ${esc(chair.r)}` : ''}.`;
  }
  function quorumText(chair) {
    const q = quorum(), b = body();
    return q.n ? (q.ok ? `وبعد التحقق من اكتمال النصاب النظامي بحضور (${q.p}) من أصل (${q.n}) أعضاء، رحّب ${chair ? 'رئيس الاجتماع' : b.head} بالحاضرين، واستُعرض جدول الأعمال.` : `لم يكتمل النصاب النظامي: حضر (${q.p}) من أصل (${q.n})، والمطلوب (${q.need}).`) : '';
  }
  const closeText = () => `واختُتم الاجتماع${M.to ? ' في تمام الساعة ' + t12(M.to) : ''}${M.next.trim() ? '، على أن يُعقد الاجتماع القادم ' + esc(M.next.trim()) : ''}، والله ولي التوفيق.`;
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
      <div class="sn-two"><button type="button" class="btn solid" id="mnNew">${B('محضر جديد', 'New minutes')}</button><button type="button" class="btn ghost" id="mnMimic">📄 ${B('محضر على نمط محضر سابق', 'New minutes in the style of an old one')}</button></div>
      <p class="sn-fine">${B('ارفع محضرًا سابقًا (Word أو PDF)، فيُبنى المحضر الجديد على نمطه: عناصره وعناوينه وخانات بياناته وأعضاؤه.', 'Upload an earlier minutes (Word or PDF) and the new one follows its pattern: sections, headings, detail rows and members.')}</p>
      ${coms.length ? `<h2 class="mn-h">${B('محضر جديد للجنة سابقة', 'New minutes for a past committee')}</h2><p class="sn-fine">${B('تُنقل البيانات والأعضاء، ويُرفع رقم الجلسة، وتنتقل مهام آخر محضر إلى «متابعة القرارات».', 'Details and members carry over, the number goes up, and the last tasks move to the follow-up.')}</p><div class="mn-coms">${coms.map(c => `<button type="button" class="mn-com" data-com="${c.id}"><b>${esc(c.committee || c.org || T('لجنة', 'Committee'))}</b><small>${esc(c.org || '')} · ${c.members.length} ${T('أعضاء', 'members')}</small></button>`).join('')}</div>` : ''}
      ${list.length ? `<h2 class="mn-h">${B('محاضرك', 'Your minutes')}</h2><ul class="mn-list">${list.map(x => `<li><button type="button" data-open="${x.id}"><b>${esc(x.committee || T('بلا عنوان', 'Untitled'))} ${x.no ? '(' + esc(x.no) + ')' : ''}</b><small>${esc(x.date || '')} · ${x.status === 'final' ? T('معتمد', 'Approved') : T('مسودة', 'Draft')}</small></button><button type="button" class="mn-x" data-del="${x.id}" aria-label="delete">✕</button></li>`).join('')}</ul>` : ''}
      <p class="sn-fine">🔒 ${B('تُحفظ المحاضر في هذا المتصفح فقط، ولا تُرفع إلى أي خادم.', 'Minutes are kept in this browser only and are never uploaded.')}</p></div>`;
    root.querySelector('#mnNew').onclick = () => { M = blank(); editor(); };
    root.querySelector('#mnMimic').onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.docx,.pdf,.txt'; f.onchange = () => f.files[0] && mimicFile(f.files[0]); f.click(); };
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const x = JSON.parse(JSON.stringify(list.find(x => x.id === b.dataset.open))); M = normM(Object.assign(blank(), x, { show: x.show, heads: x.heads, info: x.info })); editor(); });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm(T('حذف هذا المحضر؟', 'Delete these minutes?'))) return; list = list.filter(x => x.id !== b.dataset.del); store.set('list', list); home(); });
    root.querySelectorAll('[data-com]').forEach(b => b.onclick = () => fromCommittee(coms.find(c => c.id === b.dataset.com)));
  }
  function fromCommittee(c) {
    M = blank();
    Object.assign(M, { type: c.type, org: c.org, unit: c.unit, committee: c.committee, logo: c.logo, year: c.year || '', place: c.place || '', mode: c.mode || 'in', numFmt: c.numFmt || M.numFmt, sigL: c.sigL || 'table' });
    if (c.show) M.show = Object.assign({}, c.show); if (c.heads) M.heads = Object.assign({}, c.heads); if (c.info) M.info = c.info.map(r => ({ id: uid(), k: r.k, t: r.t, v: '' }));
    M.members = c.members.map(m => ({ id: uid(), n: m.n, r: m.r, st: 'p' }));
    // the last minutes of this committee: next number, and its tasks to follow up
    const last = list.filter(x => x.committee === c.committee && x.org === c.org).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    if (last) { const n = parseInt(last.no, 10); if (!isNaN(n)) M.no = String(n + 1); M.follow = [].concat(...last.items.map(it => (it.tasks || []).filter(t => t.t.trim()).map(t => ({ id: uid(), t: t.t + (t.who ? ' (' + t.who + ')' : ''), st: 'go' })))); }
    editor();
  }
  // the committee, its look and its members are remembered by themselves for the next minutes
  function saveCommittee() {
    if (!M || !M.committee.trim() || !named().length) return;
    const coms = store.get('coms', []), key = (M.org + '|' + M.committee).trim();
    const c = { id: (coms.find(x => (x.org + '|' + x.committee).trim() === key) || {}).id || uid(), type: M.type, org: M.org, unit: M.unit, committee: M.committee, logo: M.logo, year: M.year, place: M.place, mode: M.mode, numFmt: M.numFmt, sigL: M.sigL, show: M.show, heads: M.heads, info: M.info.map(r => ({ k: r.k, t: r.t })), members: named().map(m => ({ n: m.n, r: m.r })) };
    store.set('coms', [c].concat(coms.filter(x => x.id !== c.id)).slice(0, 12));
  }

  /* ---------- a new minutes in the pattern of an earlier one ---------- */
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  async function readText(file) {
    if (/\.docx$/i.test(file.name)) { await need('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'); return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value; }
    if (/\.pdf$/i.test(file.name)) {
      await need(PDFJS + 'build/pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true }).promise, out = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const items = (await (await doc.getPage(p)).getTextContent()).items.filter(x => x.str && x.str.trim()), lines = [];
        items.forEach(it => { const y = it.transform[5], h = Math.abs(it.transform[3]) || 10; let l = lines.find(l => Math.abs(l.y - y) < h * .5); if (!l) lines.push(l = { y, h, it: [] }); l.it.push(it); });
        lines.sort((a, b) => b.y - a.y).forEach(l => {
          const ar = l.it.some(x => /[؀-ۿﭐ-﻿]/.test(x.str)); l.it.sort((a, b) => ar ? b.transform[4] - a.transform[4] : a.transform[4] - b.transform[4]);
          let s = '', pe = null; l.it.forEach(x => { const x0 = x.transform[4], x1 = x0 + (x.width || 0); if (pe != null) s += (ar ? pe - x1 : x0 - pe) > l.h * .2 ? ' ' : ''; s += x.str; pe = ar ? x0 : x1; });
          out.push(s.replace(/\s+/g, ' ').trim()); });
      }
      return out.join('\n').normalize('NFKC').replace(/ی/g, 'ي').replace(/ک/g, 'ك').replace(/ھ/g, 'ه').replace(/ا([أإآ])ل/g, 'ال$1').replace(/هللا/g, 'الله');
    }
    return file.text();
  }
  async function mimicFile(file) {
    let text = '';
    try { text = await readText(file); } catch (e) {}
    if (text.replace(/\s/g, '').length < 80) return toast(B('لم أستطع قراءة نص الملف. إن كان PDF ممسوحًا ضوئيًا فاستخدم نسخة Word.', 'Could not read the text. If it is a scanned PDF, use the Word file.'), 1);
    M = blank(); const got = mimic(text, M); editor();
    toast(B(`بُني المحضر على نمط «${esc(file.name)}»: ${got.join('، ')}. راجع «عناصر المحضر» في الأعلى.`, `Built in the pattern of “${esc(file.name)}”. Check “What the minutes include” at the top.`));
  }
  function mimic(text, X) {
    const lines = text.split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean), N = normA, NS = x => N(x).replace(/\s+/g, ''), got = [];
    const short = lines.filter(l => l.length < 70), has = re => lines.some(l => re.test(N(l)));
    const ORDW = /^(اولا|ثانيا|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تاسعا|عاشرا)/;
    let numbered = false;
    // a heading as written, without its number ("أولًا:", "1.") and its colon
    const clean = l => { const m = l.match(/^([^:：]{0,14})[:：]\s*(\S[\s\S]*)$/); let x = m && (ORDW.test(NS(m[1])) || /^[\d٠-٩]+\s*[.\-)]?\s*$/.test(m[1].trim())) ? m[2] : l;
      const ws = x.split(' '); for (let k = 2; k >= 1; k--) if (ws.length > k && /^(اولا|ثانيا|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تاسعا|عاشرا)[:：]?$/.test(NS(ws.slice(0, k).join('')))) { x = ws.slice(k).join(' ').replace(/^[:：\-–]\s*/, ''); break; }
      return x.replace(/^[\d٠-٩]+\s*[.\-)]\s*/, '').replace(/\s*[:：.]\s*$/, '').trim(); };
    const find = (re, not) => { const l = short.find(x => re.test(N(x)) && !(not && not.test(N(x)))); if (l && ORDW.test(NS(l))) numbered = true; return l; };
    const okHead = c => c && c.length <= 35 && !/^م\s/.test(c) && !/[.،]$/.test(c) && c.split(' ').length <= 6;
    const sec = { intro: [/^(\S+ ?)?(تمهيد|تقديم|مقدمه)\b/], att: [/(الحضور|الاعضاء الحاضرون|اثبات النصاب)/, /توقيع|تم |وبعد/], agenda: [/جدول الاعمال/, /تم |استعراض/], decs: [/(المناقشات|المناقشه والقرارات|القرارات والتوصيات|ما تم مناقشته)/, /ملخص/],
      recs: [/^(\S+ ?){0,2}التوصيات\s*$/], sum: [/ملخص (القرارات|التكليفات)/], close: [/(اختتام|ختام) الاجتماع/], sig: [/(توقيعات|التوقيعات|^التوقيع$|اعضاء اللجنه\s*$)/] };
    Object.entries(sec).forEach(([k, [re, not]]) => {
      const l = find(re, not), c = l ? clean(l) : '';
      if (k === 'decs') { if (okHead(c)) X.heads.decs = c; return; }
      if (k === 'intro') { X.show.intro = true; if (okHead(c)) X.heads.intro = c; return; }
      if (k === 'agenda') X.show.agenda = !!l || has(/جدول الاعمال|الموضوعات/); else X.show[k] = !!l;
      if (okHead(c)) X.heads[k] = c;
    });
    X.show.num = numbered; X.show.quorum = has(/النصاب/); X.show.vote = has(/(بالاجماع|بالاغلبيه|التصويت)/); X.show.disc = has(/المناقشه/) || !has(/القرار/);
    got.push(T('العناصر والعناوين', 'sections and headings'));
    // the meeting-details rows, as labelled in the old minutes
    const LBL = [['date', /(^|\s)(التاريخ|اليوم والتاريخ|تاريخ الاجتماع)(\s|$)/, 'التاريخ'], ['time', /(^|\s)(الوقت|وقت الاجتماع)(\s|$)/, 'الوقت'], ['place', /(^|\s)(المكان|مكان الاجتماع|مكان الانعقاد|مقر الاجتماع|مقر الجمعيه|المقر)(\s|$)/, 'المكان'],
      [null, /وسيله الانعقاد/, 'وسيلة الانعقاد'], [null, /نوع الاجتماع/, 'نوع الاجتماع'], [null, /^الدوره\s/, 'الدورة'], [null, /(^|\s)المرفقات(\s|$)/, 'المرفقات'], [null, /مده الاجتماع/, 'مدة الاجتماع']];
    const rows = LBL.filter(([t, re]) => short.some(l => re.test(N(l))));
    if (rows.length >= 2) { const mq = lines.find(l => /(مقر|مكان)/.test(N(l))); X.info = rows.map(([t, re, lab]) => ({ id: uid(), k: t === 'place' && mq && /مقر/.test(N(mq)) ? 'المقر' : lab, t: t || undefined, v: '' }));
      if (!X.info.some(r => r.t === 'date')) X.info.unshift({ id: uid(), k: 'التاريخ', t: 'date' }); got.push(T(`${X.info.length} خانات للبيانات`, `${X.info.length} detail rows`)); }
    // the name of the council or committee, from the title (which may run to the next line)
    const ti = lines.findIndex(l => /^محضر\s/.test(N(l)));
    if (ti >= 0) {
      const ORD = /^(ال)?(اول|ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر)(ه|ي)?$|^[(\[]?[\d٠-٩]+[)\]]?$|^رقم$/;
      let w = lines[ti].split(' ').slice(1); while (w.length && (/(جتماع|جلسه)$/.test(N(w[0])) || ORD.test(N(w[0])))) w.shift();
      let name = w.join(' '); const nx = lines[ti + 1] || '';
      if (!name) name = nx; else if (/^(ل|و)/.test(nx) && nx.length < 70 && !/^لا\s/.test(nx)) name += ' ' + nx;
      name = name.replace(/^ل(?=(مجلس|لجنة|جنة|الجمعية|ل))/, '').replace(/^لجنة/, 'لجنة').replace(/^ل(?=لجنة)/, '').replace(/\s*(المنعقد|المنعقدة)[\s\S]*$/, '').trim();
      if (name && name.length < 110) { X.committee = name; if (/^(ال)?لجن/.test(N(name))) X.type = 'committee'; }
    }
    const org = lines.slice(0, 15).map(l => l.split(/\s*(?:\.{3,}|[:：])/)[0].trim()).find(l => /^(جامعه|جمعيه|وزاره|شركه|هيئه|مؤسسه)\s/.test(N(l)) && l.length < 50); if (org) X.org = org;
    // members: a title (د. / أ. …) and a name, then a role; two-column tables give two people on one line
    const TT = '(?:أ\\.\\s?د\\.?|أ\\.د|د\\.|أ\\.|م\\.|الدكتورة?|الأستاذة?)', TITLE = new RegExp('^' + TT + '\\s*'), SPLIT = new RegExp('\\s(?=' + TT + '\\s?\\S)');
    const RW = '(?:رئيسة?|نائبة?|عضوة?|أمينة?|مقررة?|وكيلة?|عميدة?|مديرة?)', ROLE = new RegExp(RW + '[^\\n]{0,30}'), RSPLIT = new RegExp('\\s(?=' + RW + '\\s)');
    const ST = /\s*(حاضرة?|معتذرة?|غائبة?|عن بعد|عن بُعد)(\s.*)?$/;
    const mem = [], key = n => { const w = N(n).replace(TITLE, '').replace(/\b(بن|بنت|ابن)\b/g, ' ').split(' ').filter(Boolean); return w.length ? w[0] + '|' + w[w.length - 1] : ''; };
    lines.forEach((l, i) => {
      const t0 = l.replace(/^[\d٠-٩]+\s*/, ''); if (!TITLE.test(t0)) return;
      const people = t0.split(SPLIT), around = (t0.split(SPLIT).length > 1 ? [lines[i - 1] || '', lines[i + 1] || ''] : [lines[i + 1] || '', lines[i - 1] || '']).find(x => x.length < 90 && !TITLE.test(x) && ROLE.test(x)) || '';
      let roles = people.length > 1 ? around.split(RSPLIT) : [around];
      if (people.length === 2 && roles.length !== 2 && around) { const w = around.split(' '), h = Math.ceil(w.length / 2); roles = [w.slice(0, h).join(' '), w.slice(h).join(' ')]; }
      people.forEach((t, k) => {
        let name = t.trim(), role = ''; const rm = t.slice(3).match(ROLE);
        if (rm) { name = t.slice(0, 3 + rm.index).trim(); role = rm[0].replace(ST, '').trim(); } else role = (roles[k] || '').replace(ST, '').trim();
        name = name.replace(ST, '').trim();
        if (name.length < 6 || name.length > 50) return;
        const ex = mem.find(m => key(m.n) === key(name)); if (ex) { if (name.length > ex.n.length) ex.n = name; if (!ex.r && role) ex.r = role; return; }
        mem.push({ id: uid(), n: name, r: role, st: 'p' });
      });
    });
    mem.forEach(m => m.r = m.r || 'عضو');
    if (mem.length >= 2) { X.members = mem.slice(0, 40); got.push(T(`${mem.length} أعضاء`, `${mem.length} members`)); }
    return got;
  }

  /* ---------- the paper: the minutes as they will look, written in place ---------- */
  const CE = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; } catch (e) {} return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; })();
  const STAGES = [['before', 'قبل الاجتماع', 'Before'], ['during', 'أثناء الاجتماع', 'During'], ['after', 'بعد الاجتماع', 'After']];
  const HINT = { before: ['جهّز بيانات الاجتماع والأعضاء وجدول الأعمال. اضغط على أي نص في المحضر لتكتب فيه.', 'Prepare the details, members and agenda. Tap any text on the page to write in it.'],
    during: ['سجّل الحضور بلمسة على حالة كل عضو، واكتب ما دار في كل بند، واختر نوع القرار.', 'Tap each member’s status to record attendance, note what was said on each item, and pick the decision.'],
    after: ['راجع الصياغة، ثم نزّل المحضر أو أرسله للتوقيع.', 'Check the wording, then download the minutes or send them for signing.'] };
  const FST = { done: 'نُفّذ', go: 'قيد التنفيذ', late: 'لم يُنفّذ بعد' };
  let stage = 'before'; const opened = new Set();
  function ref(p) { const s = p.split(':'); let o = M; for (let i = 0; i < s.length - 1; i++) { const k = s[i]; o = Array.isArray(o) ? (/^\d+$/.test(k) ? o[+k] : o.find(x => x.id === k)) : o[k]; if (!o) return [null]; } return [o, s[s.length - 1]]; }
  const getP = p => { const [o, k] = ref(p); return o ? o[k] : ''; };
  const E = (p, ph, ml, val) => `<span class="ed${ml ? ' ml' : ''}" data-p="${p}" data-ph="${esc(ph)}" contenteditable="${CE}" spellcheck="false">${esc(val != null ? val : getP(p))}</span>`;
  const add = (act, label, more = '') => `<button type="button" class="mp-add" data-act="${act}"${more}>+ ${label}</button>`;
  const ico = (act, t, sym, more = '') => `<button type="button" class="mp-ic" data-act="${act}" title="${t}" aria-label="${t}"${more}>${sym}</button>`;
  const show = (it, f) => (it[f] || '').trim() || opened.has(it.id + ':' + f);

  function editor() {
    stage = M.stage || 'before'; opened.clear();
    if (!document.getElementById('mpDocCss')) { const s = document.createElement('style'); s.id = 'mpDocCss'; s.textContent = DOC_CSS; document.head.appendChild(s); }
    root.innerHTML = `<div class="mp-top"><button type="button" class="sn-lnk" id="mpBack">${isAr() ? '→' : '←'} ${B('محاضري', 'My minutes')}</button>
        <nav class="mp-steps">${STAGES.map(([k, a, e], i) => `<button type="button" data-st="${k}"><b>${i + 1}</b>${B(a, e)}</button>`).join('')}</nav>
        <button type="button" class="mp-gear" id="mpSet" title="${T('إعدادات المحضر', 'Settings')}" aria-label="${T('إعدادات المحضر', 'Settings')}">⚙</button></div>
      <p class="mp-hint" id="mpHint"></p>
      <details class="mp-els" id="mpEls"><summary>☰ ${B('عناصر المحضر', 'What the minutes include')}</summary><div class="mp-elsb">${SECS.map(([k, l]) => `<label><input type="checkbox" data-sh="${k}"${M.show[k] ? ' checked' : ''}> ${l}</label>`).join('')}</div><p class="mp-elsn">${B('ألغِ علامة أي عنصر فلا يظهر في المحضر. وتستطيع تعديل أي عنوان أو خانة بالضغط عليها في الصفحة.', 'Untick anything to leave it out. Tap any heading or row on the page to change it.')}</p></details>
      <div id="mpChk"></div>
      <div class="mp-paper" id="mpPaper"></div><div class="mn-bar" id="mpBar"></div>`;
    root.querySelector('#mpBack').onclick = () => { persist(); saveCommittee(); home(); };
    root.querySelectorAll('[data-st]').forEach(b => b.onclick = () => go(b.dataset.st));
    root.querySelector('#mpSet').onclick = settings;
    root.querySelectorAll('[data-sh]').forEach(c => c.onchange = () => { M.show[c.dataset.sh] = c.checked; paint(); later(); });
    const P = root.querySelector('#mpPaper');
    P.addEventListener('input', e => { const el = e.target.closest('.ed'); if (!el) return; const p = el.dataset.p, v = el.innerText.replace(/\n+$/, '');
      const [o, k] = ref(p); if (!o) return; o[k] = v; if (k === 'text' && o.kind !== undefined) o.edited = true;
      derived(); later(); });
    P.addEventListener('keydown', e => { const el = e.target.closest('.ed'); if (el && !el.classList.contains('ml') && e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    P.addEventListener('paste', e => { const el = e.target.closest('.ed'); if (!el) return; e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, el.classList.contains('ml') ? t : t.replace(/\s*\n\s*/g, ' ')); });
    P.addEventListener('change', e => { const el = e.target; if (el.dataset.f) { M[el.dataset.f] = el.value; } else if (el.dataset.p) { const [o, k] = ref(el.dataset.p); if (o) o[k] = el.value; } else return; derived(); later(); });
    P.addEventListener('click', e => { if (e.target.matches('.mp-hid')) { try { e.target.showPicker(); } catch (er) {} return; } const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act, b.dataset, b); });
    go(stage, true);
  }
  function go(st, first) {
    stage = M.stage = st; root.querySelectorAll('[data-st]').forEach(b => b.setAttribute('aria-current', b.dataset.st === st ? 'step' : 'false'));
    const h = HINT[st]; root.querySelector('#mpHint').innerHTML = B(h[0], h[1]);
    paint(); if (!first) { persist(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function paint(focus) {
    root.querySelector('#mpPaper').innerHTML = paper(); derived(); bar(); paintChecks();
    if (focus) { const el = root.querySelector(focus); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  }

  function paper() {
    const S = stage, during = S !== 'before', b = body(), V = M.show;
    let h = 0; const HP = key => `<h2>${V.num ? (HEADS[h++] || '') + ': ' : ''}${E('heads:' + key, DH[key] || T('عنوان', 'Heading'), 0, head(key))}</h2>`;
    const memRows = M.members.map((m, j) => `<tr class="mp-row"><td>${j + 1}</td><td>${E('members:' + m.id + ':n', T('اسم العضو', 'Member name'))}</td><td>${E('members:' + m.id + ':r', T('الصفة', 'Role'))}</td>
      ${during ? `<td><button type="button" class="mp-att st-${m.st}" data-act="att" data-id="${m.id}">${STL[m.st]}</button></td>` : ''}<td class="mp-tc">${ico('rmMem', T('حذف العضو', 'Remove'), '✕', ` data-id="${m.id}"`)}</td></tr>`).join('');
    const follow = M.follow.length ? `<h2>${B('متابعة قرارات الجلسة السابقة', 'Follow-up of the last decisions')}</h2><table class="mo-t"><tr><th>م</th><th>القرار أو المهمة</th><th>الحالة</th><th class="mp-tc"></th></tr>${M.follow.map((f, j) => `<tr class="mp-row"><td>${j + 1}</td><td>${E('follow:' + f.id + ':t', T('القرار أو المهمة', 'Decision or task'))}</td><td><select class="mp-sel" data-p="follow:${f.id}:st">${Object.entries(FST).map(([v, l]) => `<option value="${v}"${f.st === v ? ' selected' : ''}>${l}</option>`).join('')}</select></td><td class="mp-tc">${ico('rmFol', T('حذف', 'Remove'), '✕', ` data-id="${f.id}"`)}</td></tr>`).join('')}</table>${add('addFol', T('قرار آخر', 'Another'))}` : '';
    let n = 0;
    const prev = M.prev.on ? `<div class="mo-item mp-item mp-row"><h3>${++n}. اعتماد محضر الجلسة السابقة ${ico('prevOff', T('حذف البند', 'Remove item'), '✕')}</h3>
      <p class="mo-dec"><b>القرار:</b> ${b.verb} ${b.the} اعتماد محضر الجلسة السابقة${M.prev.note.trim() ? '، ' : ' '}${E('prev:note', T('دون ملاحظات', 'no notes'))}.</p></div>` : '';
    const items = M.items.map((it, i) => {
      const id = it.id, P = 'items:' + id + ':';
      const vote = V.vote ? (it.vote === 'all' ? 'صدر القرار بالإجماع' : it.vote === 'maj' ? 'صدر القرار بالأغلبية' : '') : '';
      return `<div class="mo-item mp-item mp-row" data-id="${id}"><h3>${++n}. ${E(P + 'title', T('موضوع البند', 'Subject'))}</h3>
        ${show(it, 'ref') ? `<p class="mo-ref"><b>المرجع:</b> ${E(P + 'ref', T('رقم المعاملة أو الخطاب وتاريخه', 'Reference no. and date'))}</p>` : ''}
        ${V.disc ? `<p><b>المناقشة:</b> ${E(P + 'disc', T('اكتب ما دار باختصار…', 'What was said, briefly…'), 1)}</p>` : ''}
        <div class="mp-kinds${S === 'after' ? ' mp-fade' : ''}">${KINDS.filter(k => k[0] !== 'free').map(([k, l]) => `<button type="button" data-act="kind" data-id="${id}" data-k="${k}" aria-pressed="${!it.edited && it.kind === k}">${l}</button>`).join('')}${it.edited ? `<button type="button" class="mp-reset" data-act="reset" data-id="${id}" title="${T('أعد الصيغة المقترحة', 'Reset the wording')}">↺</button>` : ''}</div>
        <p class="mo-dec"><b>القرار رقم (<bdi dir="ltr" data-d="no:${id}"></bdi>):</b> ${E(P + 'text', T('نص القرار', 'The decision'), 1, decText(it))}</p>
        ${show(it, 'basis') ? `<p class="mo-basis"><b>الاستناد النظامي:</b> ${E(P + 'basis', T('مثال: المادة (12) من لائحة الدراسات العليا', 'e.g. Article 12 of the graduate regulations'), 1)}<small class="mp-chk" data-d="basis:${id}"></small></p>` : ''}
        ${vote ? `<p><b>التصويت:</b> <button type="button" class="mp-link" data-act="vote" data-id="${id}">${vote}</button>${it.vote === 'maj' ? ` (موافق: ${E(P + 'yes', '…')}، غير موافق: ${E(P + 'no', '…')})` : ''}</p>` : ''}
        ${it.dis.map((x, j) => `<p class="mo-dis mp-row"><b><button type="button" class="mp-link" data-act="disk" data-id="${id}" data-j="${j}">${x.k === 'no' ? 'رأي مخالف' : 'تحفظ'}</button>:</b> <select class="mp-sel" data-p="${P}dis:${j}:n"><option value="">${T('العضو', 'Member')}</option>${named().map(m => `<option${m.n === x.n ? ' selected' : ''}>${esc(m.n)}</option>`).join('')}</select> — ${E(P + 'dis:' + j + ':note', T('السبب كما أبداه', 'The reason given'))} ${ico('rmDis', T('حذف', 'Remove'), '✕', ` data-id="${id}" data-j="${j}"`)}</p>`).join('')}
        ${it.tasks.map((t, j) => `<p class="mp-row"><b>التكليف:</b> ${E(P + 'tasks:' + j + ':t', T('المهمة', 'Task'))} — ${E(P + 'tasks:' + j + ':who', T('المسؤول', 'Owner'))} (${E(P + 'tasks:' + j + ':due', T('الموعد', 'Due'))}) ${ico('rmTask', T('حذف', 'Remove'), '✕', ` data-id="${id}" data-j="${j}"`)}</p>`).join('')}
        <div class="mp-opt">${show(it, 'ref') ? '' : add('open', T('المرجع', 'Reference'), ` data-id="${id}" data-f="ref"`)}${add('addTask', T('تكليف', 'Task'), ` data-id="${id}"`)}${add('addDis', T('تحفظ', 'Reservation'), ` data-id="${id}"`)}${show(it, 'basis') ? '' : add('open', T('الاستناد النظامي', 'Rule relied on'), ` data-id="${id}" data-f="basis"`)}${!V.vote || vote ? '' : add('vote', T('التصويت', 'Vote'), ` data-id="${id}"`)}
          <span class="mp-sp"></span>${i ? ico('upItem', T('إلى الأعلى', 'Move up'), '↑', ` data-id="${id}"`) : ''}${ico('rmItem', T('حذف البند', 'Remove item'), '🗑', ` data-id="${id}"`)}</div></div>`;
    }).join('');
    // before the meeting the agenda is where the items are written
    const agendaEdit = `<table class="mo-t"><tr><th>م</th><th>الموضوع</th><th class="mp-tc"></th></tr>
      ${M.prev.on ? `<tr class="mp-row"><td>1</td><td>اعتماد محضر الجلسة السابقة</td><td class="mp-tc">${ico('prevOff', T('حذف', 'Remove'), '✕')}</td></tr>` : ''}
      ${M.items.map((it, i) => `<tr class="mp-row"><td>${i + 1 + (M.prev.on ? 1 : 0)}</td><td>${E('items:' + it.id + ':title', T('موضوع البند', 'Subject'))}${show(it, 'ref') ? `<div class="mp-sub">المرجع: ${E('items:' + it.id + ':ref', T('رقم المعاملة أو الخطاب وتاريخه', 'Reference no. and date'))}</div>` : ''}</td><td class="mp-tc">${show(it, 'ref') ? '' : `<button type="button" class="mp-ic mp-ict" data-act="open" data-id="${it.id}" data-f="ref">+ ${T('المرجع', 'Reference')}</button>`}${i ? ico('upItem', T('إلى الأعلى', 'Move up'), '↑', ` data-id="${it.id}"`) : ''}${ico('rmItem', T('حذف', 'Remove'), '✕', ` data-id="${it.id}"`)}</td></tr>`).join('')}</table>`;
    const extra = `<div class="mp-adds">${add('addItem', T('بند', 'Item'))}${M.prev.on ? '' : add('prevOn', T('اعتماد المحضر السابق', 'Approve the last minutes'))}${M.follow.length ? '' : add('addFol', T('متابعة قرارات سابقة', 'Follow-up of past decisions'))}${S === 'before' || !V.recs || M.recs.trim() || opened.has('recs') ? '' : add('recs', T('توصيات', 'Recommendations'))}</div>`;
    // the meeting details: rows can be renamed, removed or added
    const pick = (f, ph) => `<span class="mp-pick"><span class="mp-pv" data-d="${f}">${ph}</span><input type="${f === 'date' ? 'date' : 'time'}" class="mp-hid" data-f="${f}" value="${esc(M[f])}" aria-label="${ph}"></span>`;
    const infoCell = r => r.t === 'date' ? pick('date', T('اختر التاريخ', 'Pick a date'))
      : r.t === 'time' ? `من ${pick('from', T('وقت البدء', 'start'))} إلى ${pick('to', T('وقت الانتهاء', 'end'))}`
      : r.t === 'place' ? `${E('place', T('مثل: قاعة الاجتماعات', 'e.g. the meeting room'))} <select class="mp-sel" data-f="mode"><option value="in"${M.mode === 'in' ? ' selected' : ''}>حضوري</option><option value="remote"${M.mode === 'remote' ? ' selected' : ''}>عن بُعد</option><option value="mix"${M.mode === 'mix' ? ' selected' : ''}>حضوري وعن بُعد</option></select>`
      : E('info:' + r.id + ':v', '…');
    const infoT = V.info ? `<table class="mo-t mo-info">${M.info.map((r, j) => `<tr class="mp-row"><th>${E('info:' + r.id + ':k', T('اسم الخانة', 'Label'))}</th><td>${infoCell(r)}</td><td class="mp-tc">${j ? ico('upInfo', T('إلى الأعلى', 'Move up'), '↑', ` data-id="${r.id}"`) : ''}${ico('rmInfo', T('حذف الخانة', 'Remove row'), '✕', ` data-id="${r.id}"`)}</td></tr>`).join('')}</table>
      <div class="mp-adds">${add('addInfo', T('خانة', 'Row'))}${['date', 'time', 'place'].filter(t => !M.info.some(r => r.t === t)).map(t => add('addInfo', { date: T('التاريخ', 'Date'), time: T('الوقت', 'Time'), place: T('المكان', 'Place') }[t], ` data-t="${t}"`)).join('')}</div>` : '';
    const memOff = !V.att;
    return `<div class="mo-doc mp-doc${M.status === 'draft' && S === 'after' ? ' draft' : ''}" dir="rtl">
      <table class="mo-hd"><tr><td class="mo-org">${E('org', T('اسم الجهة', 'Organisation'))}<br>${E('unit', T('الكلية أو الإدارة', 'College or department'))}</td><td class="mo-bsm">${V.bsm ? 'بسم الله الرحمن الرحيم' : ''}</td>
        <td class="mo-logo">${!V.logo ? '' : M.logo ? `<img src="${M.logo}" alt="">${ico('rmLogo', T('إزالة الشعار', 'Remove logo'), '✕')}` : `<button type="button" class="mp-add" data-act="logo">+ ${T('الشعار', 'Logo')}</button>`}</td></tr></table>
      <h1>محضر الاجتماع رقم (${E('no', '…')})<br>${E('committee', T('اسم المجلس أو اللجنة', 'Council or committee'))}</h1>
      ${infoT}
      ${during && V.intro ? `${M.heads.intro && M.heads.intro.trim() ? `<h2>${E('heads:intro', '')}</h2>` : ''}<p data-d="intro"></p>` : ''}
      <div class="${memOff ? 'mp-offsec' : ''}">${memOff ? `<p class="mp-offnote">${T('جدول الحضور مخفي من المحضر، ويبقى هنا لتسجيل الحضور والتوقيعات.', 'The attendance table is hidden from the minutes; it stays here for attendance and signatures.')}</p><h2>${esc(head('att'))}</h2>` : HP('att')}
      <table class="mo-t mp-mem"><tr><th>م</th><th>الاسم</th><th>الصفة</th>${during ? '<th>الحضور</th>' : ''}<th class="mp-tc"></th></tr>${memRows}</table>
      <div class="mp-adds">${add('addMem', T('عضو', 'Member'))}<button type="button" class="mp-add" data-act="pasteMem">${T('لصق قائمة أسماء', 'Paste a list of names')}</button>${M.guests.trim() || opened.has('guests') ? '' : add('openM', T('مدعوون من غير الأعضاء', 'Guests'), ' data-f="guests"')}</div>
      ${M.guests.trim() || opened.has('guests') ? `<p><b>المدعوون من غير الأعضاء:</b> ${E('guests', '…')}</p>` : ''}</div>
      ${during && V.quorum ? '<p class="mo-q" data-d="q"></p>' : ''}
      ${follow}
      ${S === 'before' ? `<h2>${esc(head('agenda'))}</h2>${agendaEdit}${extra}` : `${V.agenda ? HP('agenda') + '<table class="mo-t" data-d="agenda"></table>' : ''}${HP('decs')}${prev}${items}${extra}`}
      ${during && V.recs && (M.recs.trim() || opened.has('recs')) ? `${HP('recs')}<p>${E('recs', T('توصية في كل سطر', 'One per line'), 1)}</p>` : ''}
      ${S === 'after' && V.sum ? `${HP('sum')}<div data-d="sum"></div>` : ''}
      ${during && V.close ? `${HP('close')}<p>واختُتم الاجتماع<span data-d="end"></span><span class="mp-next">، على أن يُعقد الاجتماع القادم ${E('next', T('(الموعد – اختياري)', '(date – optional)'))}</span>، والله ولي التوفيق.</p>` : ''}
      ${S === 'after' && V.sig ? `${HP('sig')}<div data-d="sigs"></div>` : ''}
    </div>`;
  }
  // the parts written for you: dates, numbers, quorum, the agenda, the summary and the signatures
  function derived() {
    const P = root.querySelector('#mpPaper'); if (!P) return;
    const set = (k, h) => P.querySelectorAll(`[data-d="${k}"]`).forEach(x => { if (x.innerHTML !== h) x.innerHTML = h; });
    const d = dates(), q = quorum(), chair = present().find(m => /رئيس/.test(m.r) && !/نائب/.test(m.r)), ph = t => `<span class="mp-ph">${t}</span>`;
    set('date', M.date ? `${esc(d.day)} ${esc(d.h)} هـ، الموافق ${esc(d.g)}` : ph(T('اختر التاريخ', 'Pick a date')));
    set('from', M.from ? t12(M.from) : ph(T('وقت البدء', 'start'))); set('to', M.to ? t12(M.to) : ph(T('وقت الانتهاء', 'end')));
    set('intro', introText());
    set('q', q.n && !q.ok ? `<span class="mp-bad">${quorumText(chair)}</span>` : quorumText(chair));
    const ag = []; if (M.prev.on) ag.push('اعتماد محضر الجلسة السابقة'); if (M.follow.length) ag.push('متابعة تنفيذ قرارات الجلسة السابقة'); M.items.forEach(it => ag.push(esc(it.title.trim()) || '…'));
    set('agenda', `<tr><th>م</th><th>الموضوع</th></tr>${ag.map((t, j) => `<tr><td>${j + 1}</td><td>${t}</td></tr>`).join('')}`);
    M.items.forEach((it, i) => {
      set('no:' + it.id, esc(decNo(i)));
      const el = P.querySelector(`[data-p="items:${it.id}:text"]`); if (el && !it.edited && document.activeElement !== el && el.innerText !== phrase(it)) el.textContent = phrase(it);
      const bc = P.querySelector(`[data-d="basis:${it.id}"]`); if (bc) { const r = basisState(it); bc.className = 'mp-chk ' + r[0]; bc.innerHTML = r[1]; }
    });
    const rows = M.items.filter(it => it.title.trim() || decText(it).trim()).map(it => { const i = M.items.indexOf(it), tk = it.tasks.filter(t => t.t.trim() || t.who.trim()); return `<tr><td><bdi dir="ltr">${esc(decNo(i))}</bdi></td><td>${nl(decText(it))}${tk.filter(t => t.t.trim()).map(t => `<div class="mo-tk">— ${esc(t.t)}</div>`).join('')}</td><td>${tk.map(t => esc(t.who)).filter(Boolean).join('<br>')}</td><td>${tk.map(t => esc(t.due)).filter(Boolean).join('<br>')}</td></tr>`; });
    set('sum', rows.length ? `<table class="mo-t mo-sum"><tr><th>رقم القرار</th><th>القرار والتكليف</th><th>المكلّف</th><th>الموعد</th></tr>${rows.join('')}</table>` : '');
    set('end', M.to ? ' في تمام الساعة ' + t12(M.to) : '');
    const nx = P.querySelector('.mp-next'); if (nx) nx.classList.toggle('mp-ghost', !M.next.trim());
    const sig = present();
    set('sigs', M.sigL === 'grid' ? `<table class="mo-t mo-grid">${sig.reduce((r, m, j) => (j % 2 ? r[r.length - 1].push(m) : r.push([m]), r), []).map(row => `<tr>${row.map(m => `<td class="mo-card"><b>${esc(m.r)}</b><div class="mo-sigbox"></div>${esc(m.n)}</td>`).join('')}${row.length < 2 ? '<td class="mo-card"></td>' : ''}</tr>`).join('')}</table>`
      : `<table class="mo-t mo-sig"><tr><th>م</th><th>الاسم</th><th>الصفة</th><th>التوقيع</th></tr>${sig.map((m, j) => `<tr><td>${j + 1}</td><td>${esc(m.n)}</td><td>${esc(m.r)}</td><td class="mo-sigbox"></td></tr>`).join('')}</table>`);
  }
  // an article cited by its number is looked up in the regulations pasted in the settings, and its text is shown
  const normA = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[«»"“”'().,،:؛\-\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const ORDS = (() => { const u = ['', 'الاولي', 'الثانيه', 'الثالثه', 'الرابعه', 'الخامسه', 'السادسه', 'السابعه', 'الثامنه', 'التاسعه'], t = ['', 'العاشره', 'العشرون', 'الثلاثون', 'الاربعون', 'الخمسون', 'الستون', 'السبعون', 'الثمانون', 'التسعون'], m = [];
    for (let n = 1; n < 100; n++) { const a = n % 10, b = Math.floor(n / 10), ua = a === 1 && n > 10 ? 'الحاديه' : u[a]; m.push([n < 10 ? u[a] : n === 10 ? t[1] : n < 20 ? ua + ' عشره' : a ? ua + ' و' + t[b] : t[b], n]); }
    return m.sort((x, y) => y[0].length - x[0].length); })();
  function articleNo(s) {
    const x = normA(s), d = x.match(/الماده\s*(?:رقم\s*)?(\d+)/); if (d) return +d[1];
    const w = ORDS.find(([nm]) => x.includes('الماده ' + nm)); return w ? w[1] : 0;
  }
  let artCache = { reg: null, map: {} };
  function articles() {
    if (artCache.reg === M.reg) return artCache.map;
    const map = {}; let cur = 0;
    M.reg.split(/\n/).forEach(l => { const h = /^\s*الماده/.test(normA(l)) ? articleNo(l.slice(0, 70)) : 0; if (h) { cur = h; map[h] = map[h] || []; map[h].push(l.trim()); } else if (cur && l.trim()) map[cur].push(l.trim()); });
    Object.keys(map).forEach(k => map[k] = map[k].join('\n')); artCache = { reg: M.reg, map }; return map;
  }
  const artBody = t => t.replace(/^\s*المادة\s*[^:：\n]{0,30}[:：\-–]\s*/, '').replace(/^\s*المادة[^\n]{0,30}\n/, '').trim();
  function basisState(it) {
    if (!it.basis.trim() || !M.reg.trim()) return ['', ''];
    const n = articleNo(it.basis); if (!n) return ['', ''];
    const a = articles()[n];
    if (!a) return ['bad', '⚠ ' + T(`لم أجد المادة (${n}) في اللائحة الملصقة؛ تحقّق من رقمها.`, `Article ${n} is not in the pasted regulations; check its number.`)];
    const body = artBody(a), has = normA(it.basis).includes(normA(body).slice(0, 40));
    return ['ok', `✓ ${T(`نص المادة (${n})`, `Article ${n}`)}: «${esc(body.length > 260 ? body.slice(0, 260) + '…' : body)}»${has ? '' : ` <button type="button" class="mp-add" data-act="insArt" data-id="${it.id}">${T('أدرج نصها', 'Insert its text')}</button>`}`];
  }

  function act(a, d, btn) {
    const it = d.id ? M.items.find(x => x.id === d.id) : null; let focus = null;
    switch (a) {
      case 'att': { const m = M.members.find(x => x.id === d.id), o = ['p', 'r', 'x', 'a']; m.st = o[(o.indexOf(m.st) + 1) % 4]; btn.className = 'mp-att st-' + m.st; btn.textContent = STL[m.st]; derived(); paintChecks(); later(); return; }
      case 'addMem': M.members.push({ id: uid(), n: '', r: 'عضو', st: 'p' }); focus = `[data-p="members:${M.members[M.members.length - 1].id}:n"]`; break;
      case 'pasteMem': { const t = prompt(T('الصق الأسماء، اسمًا في كل سطر:', 'Paste the names, one per line:')); if (!t) return; const ns = t.split(/\n/).map(s => s.replace(/^\s*[\d٠-٩]+[.)\-]\s*/, '').trim()).filter(Boolean); M.members = M.members.filter(m => m.n.trim()).concat(ns.map(n => ({ id: uid(), n, r: 'عضو', st: 'p' }))); break; }
      case 'rmMem': M.members = M.members.filter(x => x.id !== d.id); break;
      case 'addItem': M.items.push(newItem()); focus = `[data-p="items:${M.items[M.items.length - 1].id}:title"]`; break;
      case 'rmItem': if ((it.title.trim() || it.disc.trim()) && !confirm(T('حذف هذا البند؟', 'Delete this item?'))) return; M.items = M.items.filter(x => x !== it); break;
      case 'upItem': { const i = M.items.indexOf(it); [M.items[i - 1], M.items[i]] = [M.items[i], M.items[i - 1]]; break; }
      case 'kind': it.kind = d.k; it.edited = false; it.text = ''; break;
      case 'reset': it.edited = false; it.text = ''; break;
      case 'vote': it.vote = it.vote === 'all' ? 'maj' : it.vote === 'maj' ? '' : 'all'; break;
      case 'open': opened.add(it.id + ':' + d.f); focus = `[data-p="items:${it.id}:${d.f}"]`; break;
      case 'openM': opened.add(d.f); focus = `[data-p="${d.f}"]`; break;
      case 'recs': opened.add('recs'); focus = '[data-p="recs"]'; break;
      case 'addDis': it.dis.push({ n: '', k: 'res', note: '' }); break;
      case 'disk': it.dis[+d.j].k = it.dis[+d.j].k === 'no' ? 'res' : 'no'; break;
      case 'rmDis': it.dis.splice(+d.j, 1); break;
      case 'addTask': it.tasks.push({ t: '', who: '', due: '' }); focus = `[data-p="items:${it.id}:tasks:${it.tasks.length - 1}:t"]`; break;
      case 'rmTask': it.tasks.splice(+d.j, 1); break;
      case 'addFol': M.follow.push({ id: uid(), t: '', st: 'go' }); focus = `[data-p="follow:${M.follow[M.follow.length - 1].id}:t"]`; break;
      case 'rmFol': M.follow = M.follow.filter(x => x.id !== d.id); break;
      case 'prevOff': M.prev.on = false; break;
      case 'prevOn': M.prev.on = true; break;
      case 'logo': { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = async () => { if (!f.files[0]) return; M.logo = await shrink(f.files[0], 360); paint(); later(); }; f.click(); return; }
      case 'rmLogo': M.logo = ''; break;
      case 'addInfo': { const t = d.t, r = t ? { id: uid(), k: { date: 'التاريخ', time: 'الوقت', place: 'المكان' }[t], t } : { id: uid(), k: '', v: '' }; M.info.push(r); focus = t ? null : `[data-p="info:${r.id}:k"]`; break; }
      case 'rmInfo': M.info = M.info.filter(r => r.id !== d.id); break;
      case 'upInfo': { const i = M.info.findIndex(r => r.id === d.id); [M.info[i - 1], M.info[i]] = [M.info[i], M.info[i - 1]]; break; }
      case 'insArt': { const n = articleNo(it.basis), t = articles()[n]; if (!t) return; it.basis = it.basis.replace(/[:：]?\s*«[\s\S]*»\s*$/, '').trim() + ': «' + artBody(t) + '»'; break; }
      default: return;
    }
    paint(focus); later();
  }

  /* ---------- the bar under the page, for the stage you are in ---------- */
  function bar() {
    const el = root.querySelector('#mpBar'), S = stage, nx = (st, a, e) => `<button type="button" class="btn ghost" data-go="${st}">${B(a, e)} ${isAr() ? '←' : '→'}</button>`;
    if (S === 'before') el.innerHTML = `<button type="button" class="btn ghost" id="mpInv">🖨 ${B('الدعوة وجدول الأعمال', 'Invitation and agenda')}</button>${nx('during', 'أثناء الاجتماع', 'During the meeting')}`;
    else if (S === 'during') el.innerHTML = `${!M.from ? `<button type="button" class="btn solid" id="mpStart">▶ ${B('بدأ الاجتماع الآن', 'The meeting starts now')}</button>` : !M.to ? `<button type="button" class="btn solid" id="mpEnd">⏹ ${B('انتهى الاجتماع الآن', 'The meeting ends now')}</button>` : ''}${nx('after', 'بعد الاجتماع', 'After the meeting')}`;
    else el.innerHTML = `<button type="button" class="btn ghost" id="mpAI">✨ ${B('تحسين الصياغة', 'Polish the wording')}</button><button type="button" class="btn ghost" id="mnWord">Word</button><button type="button" class="btn ghost" id="mnPrint">PDF</button><button type="button" class="btn solid" id="mnSign">✍️ ${B('أرسله للتوقيع', 'Send for signing')}</button>${M.items.some(it => it.tasks.some(t => t.who.trim())) ? `<button type="button" class="btn ghost" id="mpNote">📨 ${B('إبلاغ المكلّفين', 'Notify owners')}</button>` : ''}`;
    const q = s => el.querySelector(s), now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
    if (q('#mpInv')) q('#mpInv').onclick = invite;
    if (q('#mpStart')) q('#mpStart').onclick = () => { M.from = now(); if (!M.date) M.date = today(); paint(); later(); };
    if (q('#mpEnd')) q('#mpEnd').onclick = () => { M.to = now(); paint(); later(); };
    if (q('#mpAI')) q('#mpAI').onclick = aiDraft;
    if (q('#mnWord')) { q('#mnWord').onclick = word; q('#mnPrint').onclick = printIt; q('#mnSign').onclick = toSign; }
    if (q('#mpNote')) q('#mpNote').onclick = notify;
  }
  // what is missing, shown quietly after the meeting
  function paintChecks() {
    const box = root.querySelector('#mpChk'); if (!box || !M) return;
    if (stage !== 'after') { box.innerHTML = ''; return; }
    const w = [], q = quorum();
    if (!M.committee.trim()) w.push(T('اسم المجلس أو اللجنة غير مكتوب.', 'No council or committee name.'));
    if (!M.no.trim()) w.push(T('رقم الاجتماع غير مكتوب.', 'No meeting number.'));
    if (!q.n) w.push(T('لم تُكتب أسماء الأعضاء.', 'No members listed.')); else if (!q.ok) w.push(T(`النصاب غير مكتمل (${q.p} من ${q.n}).`, `No quorum (${q.p} of ${q.n}).`));
    if (!M.members.some(m => /رئيس/.test(m.r) && m.n.trim())) w.push(T('لم يُحدَّد رئيس الاجتماع في صفات الأعضاء.', 'No chair among the members.'));
    if (!M.from || !M.to) w.push(T('وقت البدء أو الانتهاء غير مسجّل.', 'Start or end time missing.'));
    M.items.forEach((it, i) => { const n = i + 1 + (M.prev.on ? 1 : 0);
      if (!it.title.trim()) w.push(T(`البند ${n} بلا موضوع.`, `Item ${n} has no subject.`));
      if (/…/.test(decText(it))) w.push(T(`البند ${n}: في نص القرار «…» تحتاج إكمالًا.`, `Item ${n}: the decision has a “…” to fill.`));
      if (it.vote === 'maj' && !(it.yes || it.no)) w.push(T(`البند ${n}: اكتب عدد الأصوات.`, `Item ${n}: give the vote count.`));
      it.tasks.forEach(t => { if (t.t.trim() && (!t.who.trim() || !t.due.trim())) w.push(T(`البند ${n}: تكليف بلا مسؤول أو موعد.`, `Item ${n}: a task without owner or date.`)); });
      if (basisState(it)[0] === 'bad') w.push(T(`البند ${n}: المادة المستند إليها غير موجودة في اللائحة.`, `Item ${n}: the cited article is not in the regulations.`)); });
    const open = box.dataset.open === '1';
    box.innerHTML = `<div class="mp-checks">${w.length ? `<button type="button" class="mp-ck-b" id="mpCk">⚠ ${w.length} ${B('ملاحظات قبل الاعتماد', 'notes before approval')} <i>${open ? '▴' : '▾'}</i></button>${open ? `<ul>${w.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` : `<span class="mp-ok">✓ ${B('المحضر مكتمل', 'Nothing missing')}</span>`}
      <label class="mp-status">${B('الحالة', 'Status')} <select id="mpStatus"><option value="draft"${M.status === 'draft' ? ' selected' : ''}>${T('مسودة', 'Draft')}</option><option value="final"${M.status === 'final' ? ' selected' : ''}>${T('معتمد', 'Approved')}</option></select></label></div>`;
    if (box.querySelector('#mpCk')) box.querySelector('#mpCk').onclick = () => { box.dataset.open = open ? '' : '1'; paintChecks(); };
    box.querySelector('#mpStatus').onchange = e => { M.status = e.target.value; root.querySelector('.mp-doc').classList.toggle('draft', M.status === 'draft'); later(); };
  }

  /* ---------- settings: the things set once ---------- */
  function settings() {
    const m = sheet(`<h3>⚙ ${B('إعدادات المحضر', 'Settings')}</h3>
      <label class="sn-lbl">${B('الجهة', 'Body')}<select id="sT"><option value="council"${M.type === 'council' ? ' selected' : ''}>مجلس («قرر المجلس»)</option><option value="committee"${M.type === 'committee' ? ' selected' : ''}>لجنة («قررت اللجنة»)</option></select></label>
      <label class="sn-lbl">${B('صيغة رقم القرار: {n} رقم الاجتماع، {i} رقم البند، {y} العام', 'Decision number: {n} meeting, {i} item, {y} year')}<input id="sN" dir="ltr" value="${esc(M.numFmt)}"></label>
      <label class="sn-lbl">${B('التوقيعات', 'Signatures')}<select id="sG"><option value="table"${M.sigL === 'table' ? ' selected' : ''}>${T('جدول', 'Table')}</option><option value="grid"${M.sigL === 'grid' ? ' selected' : ''}>${T('بطاقات', 'Cards')}</option></select></label>
      <label class="sn-lbl">${B('نص اللائحة (اختياري): الصقه مرة واحدة، فإذا كتبت رقم مادة في «الاستناد النظامي» عرضت لك الأداة نصها', 'Regulations (optional): paste them once; when you cite an article number, its text is shown')}<textarea id="sR" rows="4">${esc(M.reg)}</textarea></label>
      <div class="sn-two"><button type="button" class="btn solid" id="sOk">${B('تم', 'Done')}</button></div>`);
    m.querySelector('#sOk').onclick = () => { M.type = m.querySelector('#sT').value; M.numFmt = m.querySelector('#sN').value.trim() || '{n}/{i}'; M.sigL = m.querySelector('#sG').value; M.reg = m.querySelector('#sR').value;
      if (M.type === 'committee') M.members.forEach(x => x.r = x.r.replace('رئيس المجلس', 'رئيس اللجنة').replace('أمين المجلس', 'مقرر اللجنة')); else M.members.forEach(x => x.r = x.r.replace('رئيس اللجنة', 'رئيس المجلس').replace('مقرر اللجنة', 'أمين المجلس'));
      m.remove(); paint(); later(); };
  }

  /* ---------- the AI: polishing what was written into formal minutes ---------- */
  function sheet(html) { const m = document.createElement('div'); m.className = 'mn-modal'; m.innerHTML = `<div class="mn-mbox">${html}</div>`; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-mx]')) m.remove(); }); return m; }
  const PRIV = () => `<p class="mn-priv">🔒 ${B('ما تلصقه في ChatGPT أو Claude يُرسل إلى خدمتهما. لا تلصق ما لا يجوز إطلاع غير الأعضاء عليه.', 'What you paste into ChatGPT or Claude goes to their service. Do not paste what must stay within the members.')}</p>`;
  function aiDraft() {
    persist();
    const m = sheet(`<h3>✨ ${B('تحسين الصياغة', 'Polish the wording')}</h3>
      <p>${B('تُجهَّز تعليمات فيها بنود المحضر وما كتبته فيها، تلصقها في المساعد، ثم تلصق ردّه هنا فتُحدَّث المناقشة ونص القرار في كل بند، وتراجعها قبل الاعتماد.', 'Instructions are prepared from your items and notes; paste them into the assistant, then paste its reply here to update each item’s discussion and decision. Check them before approving.')}</p>
      ${PRIV()}
      <div class="sn-two"><button type="button" class="btn solid" id="aiCopy">${B('١. انسخ التعليمات', '1. Copy the instructions')}</button><a class="btn ghost" target="_blank" rel="noopener" href="https://chatgpt.com/">ChatGPT</a><a class="btn ghost" target="_blank" rel="noopener" href="https://claude.ai/new">Claude</a></div>
      <label class="sn-lbl">${B('٢. الصق الرد هنا', '2. Paste the reply here')}<textarea id="aiR" rows="6"></textarea></label>
      <div class="sn-two"><button type="button" class="btn solid" id="aiAdd">${B('طبّق', 'Apply')}</button><button type="button" class="btn ghost" data-mx>${B('إغلاق', 'Close')}</button></div>`);
    m.querySelector('#aiCopy').onclick = async e => { try { await navigator.clipboard.writeText(draftPrompt()); e.currentTarget.textContent = '✓ ' + T('نُسخت؛ الصقها في المساعد', 'Copied; paste it into the assistant'); } catch (er) { toast(B('تعذّر النسخ.', 'Could not copy.'), 1); } };
    m.querySelector('#aiAdd').onclick = () => {
      const got = parseDraft(m.querySelector('#aiR').value);
      if (!got.length) return toast(B('لم أتعرّف على بنود في الرد. تأكد أنك نسخته كاملًا.', 'No items found in the reply.'), 1);
      M.items = M.items.filter(x => x.title.trim() || x.disc.trim() || x.tasks.length);
      got.forEach((g, k) => { const it = M.items[k]; if (!it) return M.items.push(g);
        if (g.title && !it.title.trim()) it.title = g.title; if (g.ref && !it.ref.trim()) it.ref = g.ref;
        if (g.disc) it.disc = g.disc; if (g.text) { it.text = g.text; it.edited = true; } if (g.kind !== 'free') it.kind = g.kind;
        if (g.basis) it.basis = g.basis; if (g.vote !== undefined && g.vote !== 'all') it.vote = g.vote;
        if (g.dis.length && !it.dis.length) it.dis = g.dis; if (g.tasks.length && !it.tasks.length) it.tasks = g.tasks; });
      m.remove(); paint(); later(); toast(B('حُدّثت البنود. راجع كل قرار قبل الاعتماد.', 'Items updated. Check each decision before approving.'));
    };
  }
  function draftPrompt() {
    const b = body(), reg = M.reg.trim();
    const its = M.items.map((it, i) => `البند ${i + 1}: ${it.title || '…'}${it.ref ? `\nالمرجع: ${it.ref}` : ''}\nملاحظات الأمين: ${it.disc || '—'}\nنوع القرار: ${(KINDS.find(k => k[0] === it.kind) || [])[1] || ''}\nالقرار الحالي: ${decText(it)}${it.dis.length ? `\nتحفظات: ${it.dis.map(x => x.n + ' — ' + x.note).join('؛ ')}` : ''}${it.tasks.length ? `\nتكليفات: ${it.tasks.map(t => [t.t, t.who, t.due].join(' | ')).join('؛ ')}` : ''}`).join('\n\n');
    return `أنت أمين ${b.the === 'المجلس' ? 'مجلس' : 'لجنة'} محترف. أعد صياغة بنود المحضر التالية بلغة عربية إدارية سليمة وموجزة: المناقشة في جملة أو جملتين، ونص القرار واضحًا قابلًا للتنفيذ.

الجهة: ${M.committee || '—'}
الأعضاء: ${named().map(m => m.n + ' (' + m.r + ')').join('، ') || '—'}

${its}
${reg ? `\nنص اللائحة المعتمدة (استند إليها فقط، واقتبس نص المادة حرفيًا بين «»، ولا تذكر مادة غير موجودة فيها):\n${reg.slice(0, 12000)}\n` : '\nلا تذكر أي مادة نظامية أو رقم مادة، لأن نص اللائحة غير متاح.\n'}
الشروط:
- حافظ على ترتيب البنود وعددها، ولا تضف معلومة غير موجودة، واكتب «…» مكان ما ينقص.
- نص القرار يبدأ بـ«${b.verb} ${b.the}:» أو «${b.noted} ${b.the} علمًا».
- إن تضمنت ملاحظات الأمين تحفظًا أو تكليفًا غير مسجّل، فأضفه.

اكتب الرد بهذه الصيغة بالضبط، داخل صندوق نص واحد، دون أي شرح:

البند: الموضوع
المناقشة: …
النوع: الموافقة أو عدم الموافقة أو الإحالة أو التأجيل أو الإحاطة
القرار: ${b.verb} ${b.the}: …
الاستناد: (إن وُجد) المادة (…) من …: «النص حرفيًا»
التصويت: بالإجماع
تحفظ: اسم العضو — السبب
مهمة: المهمة | المسؤول | الموعد

البند: …`;
  }
  function parseDraft(text) {
    const lines = String(text || '').replace(/```[a-z]*/g, '').split(/\r?\n/).map(s => s.replace(/\*\*/g, '').trim());
    const out = []; let cur = null;
    const KIND = { 'الموافقة': 'approve', 'عدم الموافقة': 'reject', 'الإحالة': 'refer', 'التأجيل': 'defer', 'الإحاطة': 'note' };
    for (const l of lines) {
      const m = l.match(/^([^:：]{2,14})\s*[:：]\s*(.*)$/); if (!m) { if (cur && cur._last && l) cur[cur._last] += '\n' + l; continue; }
      const k = m[1].trim(), v = m[2].trim();
      if (/^البند/.test(k)) { cur = newItem(); cur.title = v; cur._last = 'title'; cur.vote = undefined; out.push(cur); continue; }
      if (!cur) continue;
      if (/المرجع/.test(k)) { cur.ref = v; cur._last = 'ref'; }
      else if (/المناقشة/.test(k)) { cur.disc = v; cur._last = 'disc'; }
      else if (/النوع/.test(k)) { cur.kind = KIND[v.replace(/[.،]/g, '').trim()] || 'free'; cur._last = null; }
      else if (/القرار/.test(k)) { cur.text = v; cur.edited = true; cur._last = 'text'; }
      else if (/الاستناد/.test(k)) { cur.basis = /^\(?إن وُجد\)?$|^-$|^—$|^لا يوجد$/.test(v) ? '' : v; cur._last = 'basis'; }
      else if (/التصويت/.test(k)) { cur.vote = /أغلبية/.test(v) ? 'maj' : /إجماع/.test(v) ? 'all' : ''; cur._last = null; }
      else if (/تحفظ|مخالف/.test(k)) { const [n, note] = v.split(/\s+[—\-–]\s+/); if (n && !/^\(?إن|^…$|^—$/.test(n)) cur.dis.push({ n: (named().find(x => x.n.includes(n.trim()) || n.includes(x.n)) || {}).n || n.trim(), k: /مخالف/.test(k) ? 'no' : 'res', note: (note || '').trim() }); cur._last = null; }
      else if (/^توصية/.test(k)) { if (v && v !== '…') M.recs = (M.recs.trim() ? M.recs.trim() + '\n' : '') + v; cur._last = null; }
      else if (/مهمة/.test(k)) { const [t, who, due] = v.split('|').map(s => (s || '').trim()); if (t && t !== '…') cur.tasks.push({ t, who: who || '', due: due || '' }); cur._last = null; }
    }
    out.forEach(x => { delete x._last; if (x.ref && /^\(?إن وُجد\)?$/.test(x.ref)) x.ref = ''; });
    return out.filter(x => x.title || x.text);
  }

  /* ---------- papers before and after: the invitation, and a notice to each owner of a task ---------- */
  function printPage(title, body) {
    const w = window.open('', '_blank'); if (!w) return toast(B('اسمح للموقع بفتح نافذة جديدة ثم أعد المحاولة.', 'Allow pop-ups and try again.'), 1);
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>@page{size:A4;margin:16mm}body{margin:0}${DOC_CSS}.pg{break-after:page}.pg:last-child{break-after:auto}.sg{margin-top:28px;text-align:left;line-height:2}</style></head><body>${body}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`);
    w.document.close();
  }
  const letterhead = () => `<table class="mo-hd"><tr><td class="mo-org">${M.org ? `<b>${esc(M.org)}</b><br>` : ''}${esc(M.unit)}</td><td class="mo-bsm">${M.show.bsm ? 'بسم الله الرحمن الرحيم' : ''}</td><td class="mo-logo">${M.logo && M.show.logo ? `<img src="${M.logo}" alt="">` : ''}</td></tr></table>`;
  const secretary = () => M.members.find(m => /أمين|مقرر/.test(m.r) && m.n.trim());
  function invite() {
    persist();
    const d = dates(), ag = []; if (M.prev.on) ag.push('اعتماد محضر الجلسة السابقة'); if (M.follow.length) ag.push('متابعة تنفيذ قرارات الجلسة السابقة'); M.items.forEach(it => it.title.trim() && ag.push(it.title.trim()));
    const s = secretary(), when = M.mode === 'remote' ? 'عن بُعد' : '';
    printPage(T('الدعوة وجدول الأعمال', 'Invitation'), `<div class="mo-doc">${letterhead()}<h1>دعوة لحضور الاجتماع${M.no ? ` رقم (${esc(M.no)})` : ''}<br>${esc(M.committee)}</h1>
      <p>سعادة أعضاء ${esc(M.committee || b0())} المحترمين،</p><p>السلام عليكم ورحمة الله وبركاته، وبعد:</p>
      <p>فيسرّني دعوتكم لحضور الاجتماع${M.no ? ` رقم (${esc(M.no)})` : ''}${M.date ? `، يوم ${esc(d.day)} ${esc(d.h)} هـ الموافق ${esc(d.g)}` : ''}${M.from ? `، في تمام الساعة ${t12(M.from)}` : ''}${when ? '، ' + when : ''}${M.place.trim() ? `، في ${esc(M.place)}` : ''}، لمناقشة جدول الأعمال الآتي:</p>
      <table class="mo-t"><tr><th>م</th><th>الموضوع</th></tr>${ag.map((t, j) => `<tr><td>${j + 1}</td><td>${esc(t)}</td></tr>`).join('')}</table>
      ${M.info.filter(r => !r.t && (r.v || '').trim()).map(r => `<p><b>${esc(r.k)}:</b> ${esc(r.v)}</p>`).join('')}<p>شاكرين لكم حرصكم، ونأمل إبلاغنا عند تعذّر الحضور.</p>
      <p class="sg">${s ? esc(s.r) + '<br>' + esc(s.n) : ''}</p></div>`);
  }
  const b0 = () => body().the;
  function notify() {
    persist();
    const d = dates(), by = {};
    M.items.forEach((it, i) => it.tasks.forEach(t => { const w = t.who.trim(); if (!w) return; (by[w] = by[w] || []).push({ no: decNo(i), dec: decText(it), t: t.t, due: t.due }); }));
    const s = secretary(), b = body();
    printPage(T('إبلاغ المكلّفين', 'Notices'), Object.entries(by).map(([w, xs]) => `<div class="mo-doc pg">${letterhead()}<h1>إبلاغ بقرار</h1>
      <p>سعادة / ${esc(w)} المحترم</p><p>السلام عليكم ورحمة الله وبركاته، وبعد:</p>
      <p>نفيدكم بأن ${esc(M.committee || b.the)} ${b.verb} في ${b.the === 'اللجنة' ? 'اجتماعها' : 'اجتماعه'}${M.no ? ` رقم (${esc(M.no)})` : ''}${M.date ? ` المنعقد يوم ${esc(d.day)} ${esc(d.h)} هـ` : ''} ما يلي:</p>
      <table class="mo-t"><tr><th>رقم القرار</th><th>القرار</th><th>المطلوب منكم</th><th>الموعد</th></tr>${xs.map(x => `<tr><td><bdi dir="ltr">${esc(x.no)}</bdi></td><td>${esc(x.dec)}</td><td>${esc(x.t)}</td><td>${esc(x.due)}</td></tr>`).join('')}</table>
      <p>نأمل الاطلاع والعمل بموجبه، شاكرين تعاونكم.</p><p class="sg">${s ? esc(s.r) + '<br>' + esc(s.n) : ''}</p></div>`).join(''));
  }

  /* ---------- outputs ---------- */
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
  const loading = {}, need = src => loading[src] || (loading[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete loading[src]; no(); }; document.head.appendChild(s); }));
  function handoff(v) { return new Promise((ok, no) => { const r = indexedDB.open('alsamani', 1); r.onupgradeneeded = () => r.result.createObjectStore('hand'); r.onerror = () => no(r.error); r.onsuccess = () => { const tx = r.result.transaction('hand', 'readwrite'); tx.objectStore('hand').put(v, 'minutes'); tx.oncomplete = ok; tx.onerror = () => no(tx.error); }; }); }
  function shrink(file, max) { return new Promise(ok => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/png')); }; im.src = URL.createObjectURL(file); }); }

  document.addEventListener('DOMContentLoaded', home);
  if (document.readyState !== 'loading') home();
})();

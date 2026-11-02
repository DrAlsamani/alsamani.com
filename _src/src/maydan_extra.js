/* Maydan extras for the host: the teacher's report, certificates for the winners, and leagues that gather
   the results of several quizzes for one class or group. Leagues live in this browser; a copy is published
   (read-only) so the group can follow the standings from a link. */
window.MDX = (function () {
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const today = () => new Date().toLocaleDateString(isAr() ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const MARK = () => window.MD_MARK || '';

  /* ---------- a page that prints (or saves as PDF) on its own ---------- */
  function printPage(title, body, css) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!doctype html><html lang="${isAr() ? 'ar' : 'en'}" dir="${isAr() ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(title)}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap">
      <style>body{font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;color:#16201f;margin:24px}${css || ''}@media print{.np{display:none}}</style></head><body>${body}
      <p class="np" style="text-align:center;margin-top:24px"><button onclick="print()" style="font:inherit;padding:10px 22px;border-radius:10px;border:0;background:#23336F;color:#fff">${T('طباعة أو حفظ PDF', 'Print or save as PDF')}</button></p></body></html>`);
    w.document.close();
  }
  function overlay(host, html) {
    const d = document.createElement('div'); d.className = 'md-asks md-xov';
    d.innerHTML = `<div class="md-asksb md-xbox">${html}<button type="button" class="md-cb" data-x>${B('إغلاق', 'Close')}</button></div>`;
    host.appendChild(d); d.querySelector('[data-x]').onclick = () => d.remove(); return d;
  }
  const csvOf = rows => '﻿' + rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n');
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' })); a.download = name; a.click(); }

  /* ---------- the teacher's report: which questions were hard, which wrong option drew people, how each player did ---------- */
  function reportHtml(D) {
    const Q = D.qs.filter(q => q.judged), avg = Q.length ? Math.round(Q.reduce((s, q) => s + pct(q.c, q.n), 0) / Q.length) : 0;
    const hard = Q.filter(q => pct(q.c, q.n) < 50);
    const trap = q => { if (!q.k || !q.o) return q.w ? `«${esc(q.w)}»` : ''; let j = -1, m = 0; q.k.forEach((v, i) => { if (!(q.ok || []).includes(i) && v > m) { m = v; j = i; } }); return j >= 0 && m ? `«${esc(q.o[j])}» (${m})` : ''; };
    const rows = D.qs.map((q, i) => `<tr class="${q.judged && pct(q.c, q.n) < 50 ? 'hard' : ''}"><td>${i + 1}</td><td dir="auto">${esc(q.q)}</td><td>${q.judged ? `<span class="bar"><i style="width:${pct(q.c, q.n)}%"></i></span> ${pct(q.c, q.n)}٪` : '<small>' + T('بلا إجابة صحيحة', 'no right answer') + '</small>'}</td><td dir="auto">${q.judged ? trap(q) : ''}</td><td>${q.tm ? q.tm.toFixed(1) + T(' ث', 's') : ''}</td></tr>`).join('');
    const prow = D.players.map(p => `<tr><td>${p.r}</td><td dir="auto">${esc(p.n)}</td>${D.teams ? `<td dir="auto">${esc(p.team || '')}</td>` : ''}<td>${p.s}</td><td>${p.jq ? `${p.ok} / ${p.jq} (${pct(p.ok, p.jq)}٪)` : ''}</td></tr>`).join('');
    return `<div class="rp"><header><div class="mk">${MARK()}</div><div><h1 dir="auto">${esc(D.title || T('مسابقة ميدان', 'A Maydan quiz'))}</h1><p>${T('تقرير المسابقة', 'Quiz report')} · ${today()}</p></div></header>
      <div class="kp"><div><b>${D.players.length}</b><span>${T('مشارك', 'players')}</span></div><div><b>${D.qs.length}</b><span>${T('فقرة', 'items')}</span></div><div><b>${avg}٪</b><span>${T('متوسط الإجابات الصحيحة', 'average right')}</span></div><div><b>${hard.length}</b><span>${T('أسئلة تحتاج مراجعة', 'questions to revisit')}</span></div></div>
      ${hard.length ? `<h2>${T('تحتاج مراجعة (أقل من ٥٠٪ أصابوها)', 'To revisit (under 50% right)')}</h2><ul class="hl">${hard.map(q => `<li dir="auto">${esc(q.q)} <small>${pct(q.c, q.n)}٪${trap(q) ? ' · ' + T('الخيار الأكثر جذبًا: ', 'the most chosen wrong answer: ') + trap(q) : ''}</small></li>`).join('')}</ul>` : ''}
      <h2>${T('الأسئلة', 'The questions')}</h2><table><thead><tr><th>#</th><th>${T('السؤال', 'Question')}</th><th>${T('أصابوا', 'Right')}</th><th>${T('أكثر خطأ تكرر', 'Most common wrong answer')}</th><th>${T('متوسط الوقت', 'Avg time')}</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>${T('المشاركون', 'The players')}</h2><table><thead><tr><th>${T('المركز', 'Rank')}</th><th>${T('الاسم', 'Name')}</th>${D.teams ? `<th>${T('الفريق', 'Team')}</th>` : ''}<th>${T('النقاط', 'Points')}</th><th>${T('الإجابات الصحيحة', 'Right answers')}</th></tr></thead><tbody>${prow}</tbody></table></div>`;
  }
  const RCSS = `.rp header{display:flex;gap:14px;align-items:center;border-bottom:3px solid #C9822B;padding-bottom:10px}.rp .mk svg{width:54px;height:54px}.rp h1{margin:0;color:#23336F;font-size:24px}.rp header p{margin:2px 0 0;color:#666}
    .rp .kp{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.rp .kp div{background:#f3f4f8;border-radius:12px;padding:10px;text-align:center}.rp .kp b{display:block;font-size:24px;color:#23336F}.rp .kp span{font-size:12px;color:#555}
    .rp h2{font-size:17px;color:#23336F;margin:18px 0 8px}.rp table{width:100%;border-collapse:collapse;font-size:13px}.rp th,.rp td{border-bottom:1px solid #e3e5ee;padding:6px 8px;text-align:start;vertical-align:top}.rp th{background:#f3f4f8}
    .rp tr.hard td{background:#fff4ef}.rp .bar{display:inline-block;width:70px;height:8px;background:#e6e8f0;border-radius:4px;vertical-align:middle;overflow:hidden}.rp .bar i{display:block;height:100%;background:#2e8b57}
    .rp .hl{margin:0;padding-inline-start:20px}.rp .hl li{margin:4px 0}.rp small{color:#777}`;
  function report(host, D) {
    const d = overlay(host, `<h3>${B('تقرير المسابقة', 'Quiz report')}</h3><div class="md-xrep">${reportHtml(D)}</div>
      <div class="md-xact"><button type="button" class="btn solid" data-pr>${B('طباعة أو حفظ PDF', 'Print or save as PDF')}</button><button type="button" class="btn ghost" data-xl>${B('تحميل Excel', 'Download Excel')}</button></div>`);
    d.querySelector('.md-xrep').insertAdjacentHTML('afterbegin', `<style>${RCSS.replace(/\.rp/g, '.md-xrep .rp')}</style>`);
    d.querySelector('[data-pr]').onclick = () => printPage(T('تقرير المسابقة', 'Quiz report'), reportHtml(D), RCSS);
    d.querySelector('[data-xl]').onclick = () => {
      const rows = [[T('#', '#'), T('السؤال', 'Question'), T('النوع', 'Kind'), T('عدد المشاركين', 'Players'), T('أجابوا', 'Answered'), T('أصابوا', 'Right'), T('النسبة', 'Percent'), T('متوسط الوقت (ث)', 'Avg time (s)')]]
        .concat(D.qs.map((q, i) => [i + 1, q.q, q.t, q.n, q.a, q.judged ? q.c : '', q.judged ? pct(q.c, q.n) : '', q.tm ? q.tm.toFixed(1) : '']))
        .concat([[], [T('المركز', 'Rank'), T('الاسم', 'Name'), T('الفريق', 'Team'), T('النقاط', 'Points'), T('الإجابات الصحيحة', 'Right'), T('من', 'Of')]])
        .concat(D.players.map(p => [p.r, p.n, p.team || '', p.s, p.ok, p.jq]));
      download('maydan-report.csv', csvOf(rows));
    };
  }

  /* ---------- certificates: drawn here in Maydan's colours, one page per name ---------- */
  const PLACE = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'], PLACE_EN = ['first', 'second', 'third', 'fourth', 'fifth'];
  function certCanvas(o) {
    const W = 1754, H = 1240, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), ar = o.ar;
    const F = (w, s) => `${w} ${s}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#23336F'; x.lineWidth = 26; x.strokeRect(40, 40, W - 80, H - 80); x.strokeStyle = '#C9822B'; x.lineWidth = 5; x.strokeRect(84, 84, W - 168, H - 168);
    // the Maydan star in the top corner
    const star = (cx, cy, R) => { x.beginPath(); for (let k = 0; k < 16; k++) { const a = Math.PI / 8 * k - Math.PI / 2, r = k % 2 ? R * .62 : R; x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } x.closePath(); };
    x.fillStyle = '#23336F'; x.beginPath(); x.roundRect(W / 2 - 62, 130, 124, 124, 30); x.fill(); x.fillStyle = '#C9822B'; star(W / 2, 192, 50); x.fill(); x.fillStyle = '#23336F'; x.beginPath(); x.arc(W / 2, 192, 17, 0, 7); x.fill(); x.fillStyle = '#F3E3C7'; x.beginPath(); x.arc(W / 2, 192, 8, 0, 7); x.fill();
    x.textAlign = 'center'; x.direction = ar ? 'rtl' : 'ltr';
    if (o.org) { x.fillStyle = '#555'; x.font = F(600, 34); x.fillText(o.org, W / 2, 312); }
    x.fillStyle = '#23336F'; x.font = F(700, 92); x.fillText(o.place ? (ar ? 'شهادة تفوّق' : 'Certificate of Excellence') : (ar ? 'شهادة مشاركة' : 'Certificate of Participation'), W / 2, 430);
    x.fillStyle = '#444'; x.font = F(400, 40); x.fillText(ar ? 'تُمنح هذه الشهادة إلى' : 'This certificate is awarded to', W / 2, 520);
    let fs = 110; x.font = F(700, fs); while (x.measureText(o.name).width > W - 420 && fs > 50) { fs -= 6; x.font = F(700, fs); }
    x.fillStyle = '#C9822B'; x.fillText(o.name, W / 2, 660);
    x.fillStyle = '#333'; x.font = F(400, 40);
    const line = o.place ? (ar ? `تقديرًا لتحقيق المركز ${PLACE[o.place - 1] || o.place} في مسابقة «${o.title}»` : `for winning ${PLACE_EN[o.place - 1] || o.place} place in “${o.title}”`) : (ar ? `تقديرًا للمشاركة في مسابقة «${o.title}»` : `for taking part in “${o.title}”`);
    x.fillText(line, W / 2, 770);
    if (o.points != null) { x.fillStyle = '#666'; x.font = F(400, 32); x.fillText(ar ? `بمجموع ${o.points} نقطة` : `with ${o.points} points`, W / 2, 830); }
    x.fillStyle = '#555'; x.font = F(400, 30); x.fillText(o.date, ar ? W - 300 : 300, 1050);
    if (o.sign) { x.fillText(o.sign, ar ? 300 : W - 300, 1050); x.strokeStyle = '#999'; x.lineWidth = 2; x.beginPath(); x.moveTo((ar ? 300 : W - 300) - 170, 1000); x.lineTo((ar ? 300 : W - 300) + 170, 1000); x.stroke(); }
    x.fillStyle = '#9aa0b8'; x.font = F(400, 24); x.fillText('alsamani.com/play/maydan', W / 2, 1130);
    return cv;
  }
  function certs(host, D) {
    const d = overlay(host, `<h3>${B('شهادات', 'Certificates')}</h3>
      <div class="md-xform"><label>${B('لمن؟', 'For whom?')}<select data-c="who"><option value="3">${T('الثلاثة الأوائل', 'The top three')}</option><option value="1">${T('الأول فقط', 'The winner only')}</option><option value="all">${T('الأوائل الثلاثة، ومشاركة للبقية', 'Top three, and participation for the rest')}</option></select></label>
      <label>${B('الجهة (اختياري)', 'Organisation (optional)')}<input data-c="org" maxlength="60" dir="auto"></label>
      <label>${B('التوقيع (اختياري)', 'Signed by (optional)')}<input data-c="sign" maxlength="40" dir="auto"></label></div>
      <canvas class="md-xprev"></canvas>
      <div class="md-xact"><button type="button" class="btn solid" data-pr>${B('طباعة أو حفظ PDF', 'Print or save as PDF')}</button><button type="button" class="btn ghost" data-dl>${B('تحميل الصور', 'Download the pictures')}</button></div>`);
    const v = k => d.querySelector(`[data-c="${k}"]`).value.trim();
    const list = () => { const w = v('who'), top = D.players.slice(0, w === '1' ? 1 : 3).map(p => ({ name: p.n, place: p.r <= 3 ? p.r : 0, points: p.s })); return w === 'all' ? top.concat(D.players.slice(3).map(p => ({ name: p.n, place: 0, points: null }))) : top; };
    const make = c => certCanvas(Object.assign({ ar: isAr(), title: D.title || T('ميدان', 'Maydan'), date: today(), org: v('org'), sign: v('sign') }, c));
    const prev = () => { const L = list(); if (!L.length) return; const src = make(L[0]), cv = d.querySelector('.md-xprev'); cv.width = src.width / 2; cv.height = src.height / 2; cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height); };
    d.querySelectorAll('[data-c]').forEach(i => i.oninput = i.onchange = prev);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(prev);
    d.querySelector('[data-pr]').onclick = () => printPage(T('الشهادات', 'Certificates'), list().map(c => `<img src="${make(c).toDataURL('image/jpeg', .92)}">`).join(''), '@page{size:A4 landscape;margin:0}body{margin:0}img{width:100%;display:block;page-break-after:always}');
    d.querySelector('[data-dl]').onclick = () => list().forEach((c, k) => setTimeout(() => { const a = document.createElement('a'); a.href = make(c).toDataURL('image/png'); a.download = `certificate-${k + 1}.png`; a.click(); }, k * 400));
  }


  /* ---------- grades for Blackboard: a file matched by the student ID (the Username), ready for "Upload gradebook" ---------- */
  function blackboard(host, D) {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('md-bb') || '{}'); } catch (e) { return {}; } })();
    let roster = null;   // the course's own grades file, when the host adds it: its rows, its id columns and its grade columns
    const d = overlay(host, `<h3>${B('ملف الدرجات لنظام التعلم', 'Grades file for the LMS')}</h3>
      <label class="md-xfile">${B('ملف الدرجات المنزّل من المقرر (اختياري، وهو الأدق): من بلاك بورد أو مودل أو كانفس، فيعود بالصيغة نفسها وفي العمود الذي تختاره', 'The grades file downloaded from the course (optional, the surest way): from Blackboard, Moodle or Canvas; it comes back in the same layout, into the column you choose')}<input type="file" accept=".xls,.csv,.txt,.tsv" data-f></label>
      <div class="md-xform"><label data-fmtw>${B('النظام', 'System')}<select data-b="fmt"><option value="bb">Blackboard</option><option value="moodle">Moodle</option><option value="gen">${T('ملف عام (Excel)', 'General (Excel)')}</option></select></label>
      <label data-colw hidden>${B('العمود في المقرر', 'The column in the course')}<select data-b="tcol"></select></label>
      <label data-neww>${B('اسم العمود', 'Column name')}<input data-b="col" maxlength="60" dir="auto" value="${esc(D.title || T('مسابقة ميدان', 'Maydan quiz'))}"></label>
      <label>${B('درجة المشاركة من', 'Participation out of')}<input data-b="p1" type="number" min="0" max="100" step="0.5" value="${saved.p1 != null ? saved.p1 : 1}"></label>
      <label>${B('درجة الأداء من', 'Performance out of')}<input data-b="p2" type="number" min="0" max="100" step="0.5" value="${saved.p2 != null ? saved.p2 : 4}"></label>
      <label>${B('الأداء يُحسب من', 'Performance is based on')}<select data-b="base"><option value="qp">${T('نقاط الأسئلة فقط (دون الألعاب)', 'Question points only (no games)')}</option><option value="all">${T('كل النقاط مع الألعاب', 'All points, games included')}</option><option value="ok">${T('نسبة الإجابات الصحيحة', 'Share of right answers')}</option></select></label>
      <label data-prew>${B('بادئة تُضاف إلى الرقم (اختياري)', 'Prefix added to the number (optional)')}<input data-b="pre" dir="ltr" maxlength="6" placeholder="${T('مثل s', 'e.g. s')}" value="${esc(saved.pre || '')}"></label>
      <label class="md-xwide">${B('رابط صفحة المقرر (اختياري، يُحفظ)', 'Link to the course page (optional, kept)')}<input data-b="url" dir="ltr" placeholder="https://…" value="${esc(saved.url || '')}"></label></div>
      <div class="md-xrep md-bbt"></div>
      <div class="md-xact"><button type="button" class="btn solid" data-dl>${B('تحميل الملف وفتح المقرر', 'Download the file and open the course')}</button></div>
      <p class="md-xnote" data-how></p>`);
    const q = s => d.querySelector(s), v = k => q(`[data-b="${k}"]`).value.trim();
    const r2 = n => Math.round(n * 100) / 100, norm = s => String(s || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).trim().toLowerCase(), digits = s => norm(s).replace(/\D/g, '');
    const HOW = { bb: T('في بلاك بورد: مركز التقديرات ← العمل دون اتصال ← رفع (وفي Ultra: الإعدادات ← رفع الدرجات). يُطابَق الطالب باسم المستخدم.', 'In Blackboard: Grade Center → Work Offline → Upload (in Ultra: Settings → Upload gradebook). Students are matched by username.'),
      moodle: T('في مودل: الدرجات ← استيراد ← ملف CSV، ثم اربط عمود Username أو ID number بالطالب، وعمود الدرجة ببند التقدير.', 'In Moodle: Grades → Import → CSV file, map Username or ID number to the student, and the grade column to a grade item.'),
      canvas: T('في كانفس: الدرجات ← استيراد، واختر الملف. يُطابَق الطالب بالأعمدة الأولى كما نزّلتها.', 'In Canvas: Grades → Import, then choose the file. Students are matched by the first columns, as you downloaded them.'),
      gen: T('ملف عام بالاسم والرقم والدرجات، يُفتح في Excel ويُنسخ إلى أي نظام.', 'A plain file with the name, number and grades; open it in Excel and copy it into any system.') };
    // a downloaded grades file: tab or comma separated, quoted fields; its id columns and grade columns found by their names
    const parse = text => { const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()); if (lines.length < 2) return null;
      const sep = (lines[0].match(/\t/g) || []).length >= (lines[0].match(/,/g) || []).length ? '\t' : ',';
      const cells = l => { const out = []; let cur = '', inq = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (inq) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inq = false; else cur += ch; } else if (ch === '"') inq = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
      const head = cells(lines[0]), low = head.map(h => h.trim().toLowerCase());
      const kind = low.includes('sis user id') || low.includes('sis login id') ? 'canvas' : low.includes('id number') || low.some(h => /^(assignment|quiz|forum|workshop|course total):/.test(h)) ? 'moodle' : low.includes('username') ? 'bb' : 'gen';
      const idc = low.map((h, k) => /^(username|student id|id number|sis user id|sis login id|login id|user id|id|email address|email|الرقم الجامعي|الرقم الأكاديمي|اسم المستخدم)$/.test(h) ? k : -1).filter(k => k >= 0);
      if (!idc.length) return null;
      const grade = (h, k) => /\|\s*\d+\s*$/.test(h) || /\[Total Pts/i.test(h) || (kind === 'canvas' && /\(\d+\)\s*$/.test(h)) || (kind === 'moodle' && /^(assignment|quiz|forum|workshop|lesson|manual item)\s*:/i.test(h.trim()));
      const cols = head.map((h, k) => ({ h, k, pts: +((h.match(/Total Pts:\s*([\d.]+)/i) || [])[1] || 0) })).filter(c => grade(c.h, c.k));
      const keep = head.map((h, k) => k).filter(k => !cols.some(c => c.k === k) && !/^(last access|availability|child course id|current score|unposted current score|final score|unposted final score|course total)/.test(low[k]));
      const nameOf = c => { const f = low.indexOf('first name'), l = low.indexOf('last name'), st = low.indexOf('student'); return st >= 0 ? c[st] : [c[f] || '', c[l] || ''].join(' ').trim(); };
      const rows = lines.slice(1).map(l => { const c = cells(l); return { c, ids: idc.map(k => norm(c[k])).filter(Boolean), name: nameOf(c), extra: /points possible/i.test(c[0] || '') }; }).filter(r => r.ids.length || r.extra);
      return { head, sep, kind, cols, keep, rows }; };
    q('[data-f]').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
      r.onload = () => { const t = r.result; if (/\u0000/.test(t.slice(0, 40))) { const r2b = new FileReader(); r2b.onload = () => { roster = parse(r2b.result); setRoster(); }; r2b.readAsText(f, 'utf-16le'); return; } roster = parse(t); setRoster(); };
      r.readAsText(f, 'utf-8'); };
    const setRoster = () => {
      if (!roster) { alert(T('لم أجد في الملف عمودًا يعرّف الطالب (مثل Username أو Student ID أو ID number). نزّل ملف الدرجات من المقرر كما هو.', 'No column that identifies the student (such as Username, Student ID or ID number). Download the grades file from the course as it is.')); return; }
      q('[data-colw]').hidden = false; q('[data-prew]').hidden = true; q('[data-fmtw]').hidden = true;
      q('[data-b="tcol"]').innerHTML = roster.cols.map((c, k) => `<option value="${k}">${esc(c.h.replace(/\s*\|\s*\d+\s*$/, ''))}</option>`).join('') + `<option value="new">${T('عمود جديد', 'A new column')}</option>`;
      pickCol(); };
    const pickCol = () => { const c = roster && roster.cols[+v('tcol')]; q('[data-neww]').hidden = !!c; if (c && c.pts) { const p1 = Math.min(+v('p1') || 0, c.pts); q('[data-b="p1"]').value = p1; q('[data-b="p2"]').value = r2(c.pts - p1); } draw(); };
    q('[data-b="tcol"]').onchange = pickCol;
    const calc = () => {
      const p1 = Math.max(0, +v('p1') || 0), p2 = Math.max(0, +v('p2') || 0), base = v('base');
      const pts = p => base === 'qp' ? p.qp : base === 'all' ? p.s : 0, best = Math.max(1, ...D.players.map(pts));
      return D.players.map(p => { const part = p.it ? r2(p1 * p.an / p.it) : 0, perf = r2(base === 'ok' ? (p.jq ? p2 * p.ok / p.jq : 0) : p2 * Math.max(0, pts(p)) / best); return { p, id: norm(p.sid), part, perf, sum: r2(part + perf) }; });
    };
    // a player matches a row when the number they typed is one of its ids, with or without letters around the digits
    const same = (typed, ids) => !!typed && ids.some(i => i === typed || (digits(i).length >= 4 && digits(i) === digits(typed)));
    const rows = () => { const R = calc();
      if (!roster) return R.map(x => ({ x, user: x.id ? v('pre') + x.id : '', name: x.p.n, id: x.id }));
      const used = new Set(), out = roster.rows.filter(r => !r.extra).map(r => { const x = R.find(y => !used.has(y) && same(y.id, r.ids)); if (x) used.add(x); return { x, user: r.ids[0], name: r.name, row: r }; });
      R.filter(x => !used.has(x)).forEach(x => out.push({ x, user: '', name: x.p.n, id: x.id, stray: true }));
      return out; };
    const draw = () => { const L = rows(), stray = L.filter(r => r.stray || !r.user).length, absent = L.filter(r => !r.x).length;
      q('[data-how]').textContent = HOW[roster ? roster.kind : v('fmt')] || HOW.gen;
      q('.md-bbt').innerHTML = `${stray ? `<p class="md-bbmiss">${T(`${stray} من اللاعبين لم يُطابَقوا (رقم ناقص أو غير موجود في المقرر)، فلن تُرفع درجاتهم.`, `${stray} players were not matched (missing number, or not in the course) and will not upload.`)}</p>` : ''}${roster && absent ? `<p class="md-xnote">${T(`${absent} من طلاب المقرر لم يشاركوا: تبقى خاناتهم كما هي.`, `${absent} students of the course did not take part: their cells stay as they are.`)}</p>` : ''}
        <table class="md-lgt"><thead><tr><th>${T('المعرّف', 'ID')}</th><th>${T('الاسم', 'Name')}</th><th>${T('المشاركة', 'Participation')}</th><th>${T('الأداء', 'Performance')}</th><th>${T('المجموع', 'Total')}</th></tr></thead><tbody>${L.map(r => `<tr class="${r.stray || !r.user ? 'miss' : !r.x ? 'abs' : ''}"><td dir="ltr">${esc(r.user || (r.x && r.x.id) || '—')}</td><td dir="auto">${esc((r.x ? r.x.p.n : '') || r.name)}</td><td>${r.x ? r.x.part : ''}</td><td>${r.x ? r.x.perf : ''}</td><td><b>${r.x ? r.x.sum : ''}</b></td></tr>`).join('')}</tbody></table>`; };
    d.querySelectorAll('[data-b]').forEach(i => { if (i.dataset.b !== 'tcol') i.oninput = i.onchange = draw; }); draw();
    q('[data-dl]').onclick = () => {
      const p1 = +v('p1') || 0, p2 = +v('p2') || 0, url = v('url'), col = v('col') || 'Maydan', fmt = v('fmt');
      try { localStorage.setItem('md-bb', JSON.stringify({ p1, p2, url, pre: v('pre') })); } catch (e) {}
      let out, name;
      if (roster) {
        // the course's own layout: its identifying columns as they were, then the one grade column
        const target = roster.cols[+v('tcol')], head = roster.keep.map(k => roster.head[k]).concat([target ? target.h : col]);
        const pp = roster.rows.filter(r => r.extra).map(r => roster.keep.map(k => r.c[k]).concat([target ? r.c[target.k] : r2(p1 + p2)]));
        out = [head].concat(pp).concat(rows().filter(r => r.row && r.x).map(r => roster.keep.map(k => r.row.c[k]).concat([r.x.sum])));
        name = (target ? target.h.replace(/\s*[\[(|].*$/, '') : col);
      } else {
        const L = rows().filter(r => r.user);
        out = fmt === 'bb' ? [['Last Name', 'First Name', 'Username', 'Student ID', col]].concat(L.map(r => ['', r.name, r.user, r.id, r.x.sum]))
          : fmt === 'moodle' ? [['Username', 'ID number', 'Full name', col]].concat(L.map(r => [r.user, r.id, r.name, r.x.sum]))
          : [[T('الاسم', 'Name'), T('الرقم', 'ID'), T('المشاركة', 'Participation'), T('الأداء', 'Performance'), T('المجموع', 'Total')]].concat(rows().map(r => [r.name, r.user || '', r.x.part, r.x.perf, r.x.sum]));
        name = col;
      }
      download(`${String(name).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40) || 'maydan'}-grades.csv`, csvOf(out));
      if (/^https?:\/\//.test(url)) setTimeout(() => window.open(url, '_blank', 'noopener'), 600);
    };
  }

  /* ---------- leagues: the results of several quizzes for one group, kept in this browser ---------- */
  const LK = 'md-leagues';
  const all = () => { try { return JSON.parse(localStorage.getItem(LK) || '[]'); } catch (e) { return []; } };
  // every change is announced, so the host's Google account (when signed in) keeps a copy too
  const save = L => { try { localStorage.setItem(LK, JSON.stringify(L)); window.dispatchEvent(new Event('md-leagues')); } catch (e) {} };
  const nameKey = n => String(n || '').trim().replace(/\s+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
  const PTS = r => [10, 8, 6, 5, 4, 3, 2][r - 1] || 1;
  function create(name) { const L = all(), id = Math.random().toString(36).slice(2, 10); L.push({ id, name: name.slice(0, 60), made: Date.now(), rounds: [] }); save(L); return id; }
  function addRound(id, round) { const L = all(), lg = L.find(z => z.id === id); if (!lg) return null; lg.rounds.push(round); save(L); return lg; }
  function standings(lg) {
    const S = {};
    (lg.rounds || []).forEach(rd => rd.res.forEach(p => { const k = nameKey(p.n); const s = S[k] = S[k] || { n: p.n, lp: 0, pts: 0, played: 0, wins: 0, best: 99 }; s.n = p.n; s.lp += PTS(p.r); s.pts += p.s || 0; s.played++; if (p.r === 1) s.wins++; s.best = Math.min(s.best, p.r); }));
    return Object.values(S).sort((a, b) => b.lp - a.lp || b.pts - a.pts);
  }
  function tableHtml(lg) {
    const S = standings(lg);
    return `<table class="md-lgt"><thead><tr><th>#</th><th>${T('الاسم', 'Name')}</th><th>${T('نقاط الدوري', 'League points')}</th><th>${T('المسابقات', 'Quizzes')}</th><th>${T('المركز الأول', 'Wins')}</th><th>${T('مجموع النقاط', 'Total points')}</th></tr></thead><tbody>${S.map((s, k) => `<tr class="${k < 3 ? 'top' : ''}"><td>${k + 1}</td><td dir="auto">${esc(s.n)}</td><td><b>${s.lp}</b></td><td>${s.played}</td><td>${s.wins}</td><td>${s.pts}</td></tr>`).join('')}</tbody></table>`;
  }
  const RULE = () => T('نقاط الدوري في كل مسابقة: الأول ١٠، الثاني ٨، الثالث ٦، ثم ٥ و٤ و٣ و٢، ولكل مشارك آخر نقطة. يُعرف اللاعب باسمه، فليدخل بالاسم نفسه كل مرة.', 'League points in each quiz: 1st 10, 2nd 8, 3rd 6, then 5, 4, 3, 2, and 1 for everyone else. Players are known by name, so they should use the same name each time.');
  // a read-only copy for the group, published under a room of its own
  let fdb = null, fuid = null;
  async function fb() { if (fdb) return fdb; if (!window.firebase || !window.MD_CFG) throw new Error('nofb'); if (!firebase.apps.length) firebase.initializeApp(MD_CFG); fuid = ((await new Promise(r => { const off = firebase.auth().onAuthStateChanged(u => { off(); r(u); }); })) || (await firebase.auth().signInAnonymously()).user).uid; fdb = firebase.database(); return fdb; }
  async function publish(lg) {
    try { const db = await fb(), r = db.ref('rooms/lg' + lg.id); const h = (await r.child('host').once('value')).val();
      if (!h) await r.set({ host: fuid, at: firebase.database.ServerValue.TIMESTAMP, title: lg.name, n: 0, st: { ph: 'end', i: -1, lock: true } });
      else if (h !== fuid) return false;
      await r.child('lg').set({ name: lg.name, rounds: lg.rounds.slice(-60) }); return true; } catch (e) { return false; }
  }
  const shareUrl = id => `${location.origin}/play/maydan/?lg=${id}`;
  function leagueBox(host, id, onChange) {
    const lg = all().find(z => z.id === id); if (!lg) return;
    const d = overlay(host, `<h3 dir="auto">${esc(lg.name)}</h3><p class="md-xnote">${lg.rounds.length ? T(`${lg.rounds.length} مسابقة`, `${lg.rounds.length} quizzes`) : T('لم تُلعب فيه مسابقة بعد. اختره في إعدادات المسابقة قبل أن تبدأ.', 'No quiz yet. Choose it in the quiz settings before you start.')}</p>${tableHtml(lg)}
      ${lg.rounds.length ? `<details class="md-xrounds"><summary>${B('المسابقات', 'The quizzes')}</summary><ol>${lg.rounds.map(r => `<li dir="auto">${esc(r.title)} <small>${new Date(r.at).toLocaleDateString()}${r.res[0] ? ' · ' + esc(r.res[0].n) : ''}</small></li>`).join('')}</ol></details>` : ''}
      <p class="md-xnote">${RULE()}</p>
      <div class="md-xact"><button type="button" class="btn solid" data-sh>${B('رابط الترتيب للمجموعة', 'Standings link for the group')}</button><button type="button" class="btn ghost" data-ex>${B('نسخة احتياطية', 'Back up')}</button><button type="button" class="btn ghost" data-del>${B('حذف الدوري', 'Delete the league')}</button></div><p class="md-xnote" data-msg></p>`);
    const msg = t => { d.querySelector('[data-msg]').textContent = t; };
    d.querySelector('[data-sh]').onclick = async () => { msg(T('جارٍ النشر…', 'Publishing…')); const ok = await publish(lg); if (!ok) return msg(T('تعذّر النشر من هذا الجهاز.', 'Could not publish from this device.')); const u = shareUrl(lg.id); try { await navigator.clipboard.writeText(u); } catch (e) {} msg(T('نُسخ الرابط: ', 'Link copied: ') + u); };
    d.querySelector('[data-ex]').onclick = () => download(`league-${lg.name}.json`, JSON.stringify(lg), 'application/json');
    d.querySelector('[data-del]').onclick = () => { if (!confirm(T(`حذف دوري «${lg.name}»؟`, `Delete the league “${lg.name}”?`))) return; try { const g = JSON.parse(localStorage.getItem('md-lg-gone') || '[]'); g.push(id); localStorage.setItem('md-lg-gone', JSON.stringify(g.slice(-100))); } catch (e) {} save(all().filter(z => z.id !== id)); d.remove(); if (onChange) onChange(); };
  }
  function importFile(file, onChange) {
    const r = new FileReader(); r.onload = () => { try { const lg = JSON.parse(r.result); if (!lg.id || !Array.isArray(lg.rounds)) throw 0; const L = all().filter(z => z.id !== lg.id); L.push(lg); save(L); if (onChange) onChange(); } catch (e) { alert(T('هذا الملف ليس نسخة دوري.', 'This file is not a league backup.')); } }; r.readAsText(file);
  }
  // the list on Maydan's page, for the host
  function listHtml() {
    const L = all();
    return `<div class="md-lgs"><h2 class="qz-h">${B('دورياتي', 'My leagues')}</h2><p class="pt-fine">${B('اجمع نتائج عدة مسابقات لفصل أو مجموعة في ترتيب واحد. أنشئ دوريًا هنا، ثم اختره في إعدادات المسابقة قبل أن تبدأ، فتُضاف نتيجتها إليه تلقائيًا.', 'Gather the results of several quizzes for a class or group in one table. Make a league here, then choose it in the quiz settings before you start, and its results are added on their own.')}</p>
      <div class="md-lgl">${L.map(lg => { const s = standings(lg)[0]; return `<button type="button" class="md-lgc" data-lg="${lg.id}"><b dir="auto">${esc(lg.name)}</b><small>${T(`${lg.rounds.length} مسابقة`, `${lg.rounds.length} quizzes`)}${s ? ' · ' + T('المتصدر: ', 'Leader: ') + esc(s.n) : ''}</small></button>`; }).join('')}</div>
      <div class="sn-two"><button type="button" class="btn ghost" data-lgnew>${B('دوري جديد', 'New league')}</button><label class="btn ghost">${B('استعادة نسخة', 'Restore a backup')}<input type="file" accept=".json,application/json" hidden data-lgimp></label></div></div>`;
  }
  function bindList(box, onChange) {
    box.querySelectorAll('[data-lg]').forEach(b => b.onclick = () => leagueBox(document.body, b.dataset.lg, onChange));
    const n = box.querySelector('[data-lgnew]'); if (n) n.onclick = () => { const name = (prompt(T('اسم الدوري (مثل: الصف الثالث - أ)', 'League name (e.g. Class 3A)')) || '').trim(); if (name) { create(name); onChange(); } };
    const im = box.querySelector('[data-lgimp]'); if (im) im.onchange = e => { if (e.target.files[0]) importFile(e.target.files[0], onChange); };
  }
  // the standings from a shared link, read-only
  async function viewShared(root, id) {
    root.innerHTML = `<div class="sn-card md-lgview"><p>${B('جارٍ تحميل الترتيب…', 'Loading the standings…')}</p></div>`;
    try { const db = await fb(), v = (await db.ref('rooms/lg' + id + '/lg').once('value')).val(); if (!v) throw 0;
      const lg = { name: v.name, rounds: v.rounds || [] };
      root.innerHTML = `<div class="sn-card md-lgview"><p class="qi-eye">${B('دوري ميدان', 'A Maydan league')}</p><h2 dir="auto">${esc(lg.name)}</h2><p class="md-xnote">${T(`${lg.rounds.length} مسابقة حتى الآن`, `${lg.rounds.length} quizzes so far`)}</p>${tableHtml(lg)}<p class="md-xnote">${RULE()}</p><a class="btn ghost" href="/play/maydan/">${B('جرّب وأنشئ مسابقتك', 'Make your own quiz')}</a></div>`;
    } catch (e) { root.innerHTML = `<div class="sn-card md-lgview"><p>${B('لم نجد هذا الدوري.', 'This league was not found.')}</p><a class="btn ghost" href="/play/maydan/">${B('ميدان', 'Maydan')}</a></div>`; }
  }
  // after a quiz: add its results to the chosen league and refresh the shared copy
  function record(id, D) {
    const lg = addRound(id, { at: Date.now(), title: D.title || '', res: D.players.map(p => ({ n: p.n, s: p.s, r: p.r })) });
    if (lg) publish(lg);
    return lg;
  }

  return { report, certs, blackboard, all, create, record, leagueBox, listHtml, bindList, viewShared, standings };
})();

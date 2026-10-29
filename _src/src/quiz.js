/* alsamani.com/tools/quiz — write the questions of a live quiz: paste them, upload a file, or have an AI write them,
   then fix them by hand, check them and preview them as players will see them. Kept on this device. */
(function () {
  const root = document.getElementById('qz');
  if (!root) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (html, bad) => {
    let t = document.getElementById('qzToast');
    if (!t) { t = document.createElement('div'); t.id = 'qzToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('qz.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('qz.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const load = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const LIB = { zip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js' };
  // options are marked by letters, as on a written exam: أ ب ج د in Arabic, A B C D in English
  const LET = () => isAr() ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const TIMES = [5, 10, 20, 30, 45, 60, 90, 120];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const save = (blob, name) => {
    const f = new File([blob], name, { type: blob.type });
    if (/iP(hone|ad|od)|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };
  // a time that suits the length: what has to be read decides it
  const suggest = q => { const n = (q.q + ' ' + q.opts.join(' ')).length + (q.img ? 60 : 0); return n < 70 ? 20 : n < 160 ? 30 : n < 260 ? 45 : 60; };
  const norm = q => Object.assign({ id: uid(), type: 'mc', q: '', opts: ['', ''], ok: [], pts: 1, img: null, timeSet: false }, q, { opts: (q.opts && q.opts.length ? q.opts : ['', '']).slice(0, 6) }, q.time ? { time: q.time, timeSet: true } : {});

  let list = store.get('list', []), Q = null;
  const persist = () => { if (!Q) return; Q.at = Date.now(); const i = list.findIndex(x => x.id === Q.id); if (i >= 0) list[i] = Q; else list.unshift(Q); if (!store.set('list', list)) toast(B('امتلأت مساحة الحفظ في المتصفح، فاحفظ نسخة في جهازك أو صغّر الصور.', 'Browser storage is full; save a copy to your device or use smaller images.'), 1); };
  let tSave; const later = () => { clearTimeout(tSave); tSave = setTimeout(() => { persist(); checks(); }, 400); };

  /* ---------- home: saved quizzes ---------- */
  function home() {
    Q = null;
    root.innerHTML = `<div class="sn-card qz-home">
      <button type="button" class="btn solid" id="qzNew">${B('مسابقة جديدة', 'New quiz')}</button>
      ${list.length ? `<h2 class="qz-h">${B('مسابقاتك', 'Your quizzes')}</h2><ul class="qz-list">${list.map(x => `<li><button type="button" data-open="${x.id}"><b>${esc(x.title || T('بلا عنوان', 'Untitled'))}</b><small>${T('الأسئلة: ', 'Questions: ')}${x.qs.length}</small></button></li>`).join('')}</ul>` : ''}
      <label class="qz-imp btn ghost">${B('فتح نسخة محفوظة', 'Open a saved copy')}<input type="file" accept=".json,application/json" hidden id="qzImp"></label>
      <p class="pt-fine">${B('تُحفظ المسابقات في هذا المتصفح. تشغيلها مع المشاركين قريبًا.', 'Quizzes are kept in this browser. Running them live with players is coming soon.')}</p></div>`;
    root.querySelector('#qzNew').onclick = () => { Q = { id: uid(), title: '', qs: [] }; editor(); };
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { Q = JSON.parse(JSON.stringify(list.find(x => x.id === b.dataset.open))); Q.qs = Q.qs.map(norm); editor(); });
    root.querySelector('#qzImp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.qs)) throw 0; Q = { id: uid(), title: j.title || '', qs: j.qs.map(norm) }; persist(); editor(); toast(B('فُتحت النسخة.', 'Copy opened.')); }
      catch (er) { toast(B('هذا الملف ليس نسخة مسابقة.', 'That file is not a quiz copy.'), 1); }
    };
  }

  /* ---------- editor ---------- */
  function editor() {
    root.innerHTML = `<div class="qz-top"><button type="button" class="sn-lnk" id="qzBack">${B('‹ مسابقاتي', '‹ My quizzes')}</button></div>
      <div class="sn-card"><label class="sn-lbl">${B('عنوان المسابقة', 'Quiz title')}<input type="text" id="qzTitle" maxlength="120" value="${esc(Q.title)}" placeholder="${T('مثال: مراجعة الوحدة الأولى', 'e.g. Unit 1 review')}"></label></div>
      <div class="sn-card qz-add"><h2 class="qz-h">${B('أضف الأسئلة', 'Add questions')}</h2>
        <div class="qz-tabs" role="tablist"><button type="button" role="tab" data-tab="paste" aria-selected="true">${B('لصق', 'Paste')}</button><button type="button" role="tab" data-tab="file" aria-selected="false">${B('رفع ملف', 'Upload a file')}</button><button type="button" role="tab" data-tab="ai" aria-selected="false">${B('بالذكاء الاصطناعي', 'With AI')}</button></div>
        <div data-pane="paste"><textarea id="qzPaste" rows="8" dir="auto" placeholder="${T('الصق الأسئلة هنا كما هي من Word أو واتساب أو أي مكان…', 'Paste the questions here as they are, from Word, WhatsApp or anywhere…')}"></textarea>
          <p class="qz-found" id="qzFound"></p>
          <div class="sn-two"><button type="button" class="btn solid" id="qzPasteOk" disabled>${B('أضف إلى المسابقة', 'Add to the quiz')}</button></div>
          <details class="qz-how"><summary>${B('كيف أكتبها؟', 'How should I write them?')}</summary>
            <p>${B('أي طريقة مألوفة تعمل. حدّد الإجابة الصحيحة بنجمة * أو ✓ بعدها، أو بسطر «الإجابة: ب»، أو بمفتاح إجابات في الآخر مثل «١-ب ٢-أ».', 'Any familiar way works. Mark the right answer with * or ✓ after it, with a line “Answer: B”, or with an answer key at the end such as “1-B 2-A”.')}</p>
<pre dir="auto">${T('1. ما عاصمة المملكة؟\nأ) جدة\nب) الرياض *\nج) الدمام\n\n2. الماء يغلي عند 100 درجة (صح أو خطأ)\nالإجابة: صح', '1. What is the capital of France?\na) Lyon\nb) Paris *\nc) Nice\n\n2. Water boils at 100 °C (true or false)\nAnswer: true')}</pre></details></div>
        <div data-pane="file" hidden><label class="qz-drop" id="qzDrop"><input type="file" id="qzFile" accept=".docx,.xlsx,.xls,.csv,.txt,.pdf" hidden><b>${B('اختر ملف الأسئلة', 'Choose the questions file')}</b><small>${B('Word أو Excel أو CSV أو PDF أو نص', 'Word, Excel, CSV, PDF or text')}</small></label>
          <p class="pt-fine">${B('في Word: إن كانت الإجابة الصحيحة بخط عريض أو ملوّنة أو مظللة أو تحتها خط، تُعرف تلقائيًا. ويُقبل قالب الاستيراد نفسه الذي يستعمله Kahoot.', 'In Word, a right answer in bold, colour, highlight or underline is recognised. Kahoot’s import template is accepted as it is.')}</p>
          <div class="sn-two"><button type="button" class="btn ghost" id="qzTpl">${B('تنزيل قالب Excel', 'Download an Excel template')}</button></div></div>
        <div data-pane="ai" hidden>
          <label class="sn-lbl">${B('الموضوع، أو الصق نص الدرس', 'The topic, or paste the lesson text')}<textarea id="qzTopic" rows="4" dir="auto" placeholder="${T('مثال: الفصل الثالث من مقرر ريادة الأعمال — نموذج العمل التجاري', 'e.g. Chapter 3 — the business model canvas')}"></textarea></label>
          <div class="qz-row"><label class="sn-lbl">${B('عدد الأسئلة', 'Questions')}<select id="qzN">${[5, 10, 15, 20, 30].map(n => `<option${n === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="sn-lbl">${B('المستوى', 'Level')}<select id="qzLv"><option value="mixed">${T('متنوع', 'Mixed')}</option><option value="easy">${T('سهل', 'Easy')}</option><option value="mid">${T('متوسط', 'Medium')}</option><option value="hard">${T('صعب', 'Hard')}</option></select></label>
            <label class="sn-lbl">${B('النوع', 'Type')}<select id="qzTy"><option value="mc">${T('اختيار من متعدد', 'Multiple choice')}</option><option value="mix">${T('مزيج مع صح وخطأ', 'Mixed with true/false')}</option><option value="tf">${T('صح وخطأ', 'True/false')}</option></select></label>
            <label class="sn-lbl">${B('اللغة', 'Language')}<select id="qzLg"><option value="ar">العربية</option><option value="en">English</option></select></label></div>
          <div class="sn-two"><button type="button" class="btn solid" id="qzCopy">${B('نسخ التعليمات', 'Copy the instructions')}</button><a class="btn ghost" id="qzGpt" target="_blank" rel="noopener">${B('افتح في ChatGPT', 'Open in ChatGPT')}</a><a class="btn ghost" id="qzCl" target="_blank" rel="noopener">${B('افتح في Claude', 'Open in Claude')}</a></div>
          <p class="pt-fine">${B('بعد أن يكتب الأسئلة، انسخ رده والصقه في «لصق».', 'When it has written them, copy its reply and paste it under “Paste”.')}</p></div>
      </div>
      <div id="qzQs" class="qz-qs"></div>
      <div class="qz-addq"><button type="button" class="btn ghost" id="qzAddQ">${B('+ سؤال', '+ Question')}</button><button type="button" class="btn ghost" id="qzAddTF">${B('+ صح أو خطأ', '+ True or false')}</button></div>
      <div class="qz-bar"><div class="qz-chk" id="qzChk"></div><div class="qz-bar-b"><button type="button" class="btn ghost" id="qzPv">${B('معاينة', 'Preview')}</button><button type="button" class="btn ghost" id="qzExp">${B('حفظ نسخة', 'Save a copy')}</button></div></div>`;
    const q = s => root.querySelector(s);
    q('#qzBack').onclick = () => { persist(); home(); };
    q('#qzTitle').oninput = e => { Q.title = e.target.value; later(); };
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
      root.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
    });
    // paste: read as you type, and say what was found
    let found = [];
    const pa = q('#qzPaste'), fd = q('#qzFound'), pok = q('#qzPasteOk');
    pa.oninput = () => {
      found = QZParse.fromText(pa.value).filter(x => x.q && x.opts.length >= 2);
      const k = found.filter(x => x.ok.length).length;
      fd.innerHTML = !pa.value.trim() ? '' : !found.length ? B('لم أتعرّف على أسئلة بعد. اكتب كل سؤال ثم خياراته تحته.', 'No questions recognised yet. Write each question with its options under it.')
        : B(`الأسئلة التي تعرّفت عليها: ${found.length}${k < found.length ? `، منها ${found.length - k} بلا إجابة محددة تختارها بعد الإضافة` : '، كلها بإجاباتها'}.`, `Found ${found.length} question${found.length > 1 ? 's' : ''}${k < found.length ? `, ${found.length - k} without a marked answer to choose after adding` : ', all with answers'}.`);
      pok.disabled = !found.length;
    };
    pok.onclick = () => { add(found); pa.value = ''; pa.oninput(); };
    // files
    q('#qzFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) fromFile(f); };
    const dz = q('#qzDrop');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('on'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('on'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) fromFile(f); });
    q('#qzTpl').onclick = template;
    // AI
    const prompt = () => aiPrompt(q('#qzTopic').value.trim(), +q('#qzN').value, q('#qzLv').value, q('#qzTy').value, q('#qzLg').value);
    const links = () => { const p = encodeURIComponent(prompt()); q('#qzGpt').href = 'https://chatgpt.com/?q=' + p; q('#qzCl').href = 'https://claude.ai/new?q=' + p; };
    ['#qzTopic', '#qzN', '#qzLv', '#qzTy', '#qzLg'].forEach(s => { q(s).oninput = q(s).onchange = links; }); links();
    q('#qzCopy').onclick = async () => { try { await navigator.clipboard.writeText(prompt()); toast(B('نُسخت التعليمات. الصقها في ChatGPT أو Claude.', 'Copied. Paste it into ChatGPT or Claude.')); } catch (er) { toast(B('تعذّر النسخ.', 'Could not copy.'), 1); } };
    q('#qzAddQ').onclick = () => { Q.qs.push(norm({})); draw(); focusLast(); later(); };
    q('#qzAddTF').onclick = () => { Q.qs.push(norm({ type: 'tf', opts: [T('صح', 'True'), T('خطأ', 'False')] })); draw(); focusLast(); later(); };
    q('#qzPv').onclick = () => preview(0);
    q('#qzExp').onclick = () => save(new Blob([JSON.stringify({ title: Q.title, qs: Q.qs.map(({ id, timeSet, ...r }) => r) }, null, 1)], { type: 'application/json' }), (Q.title || 'quiz').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60) + '.json');
    draw(); checks();
    if (!Q.qs.length) q('#qzPaste').focus({ preventScroll: true });
  }
  const focusLast = () => { const t = root.querySelectorAll('.qz-q textarea'); if (t.length) { t[t.length - 1].focus(); t[t.length - 1].scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  function add(qs) {
    qs = qs.filter(x => x.q && x.opts.filter(o => o.trim()).length >= 2);
    if (!qs.length) { toast(B('لم أجد أسئلة في الملف. جرّب اللصق.', 'No questions found in the file. Try pasting.'), 1); return; }
    // an empty first question left from a new quiz is replaced
    if (Q.qs.length === 1 && !Q.qs[0].q && !Q.qs[0].opts.some(Boolean)) Q.qs = [];
    const from = Q.qs.length;
    Q.qs.push(...qs.map(norm));
    persist(); draw(); checks();
    toast(B(`أُضيفت الأسئلة (${qs.length}).`, `${qs.length} question${qs.length > 1 ? 's' : ''} added.`));
    const c = root.querySelectorAll('.qz-q')[from]; if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /* ---------- the questions ---------- */
  function draw() {
    const box = root.querySelector('#qzQs');
    box.innerHTML = Q.qs.map((x, i) => card(x, i)).join('');
    box.querySelectorAll('.qz-q').forEach((el, i) => bind(el, Q.qs[i]));
    if (window.Sortable && !box._s) box._s = Sortable.create(box, { handle: '.qz-grip', animation: 150, onEnd: e => { const [m] = Q.qs.splice(e.oldIndex, 1); Q.qs.splice(e.newIndex, 0, m); draw(); later(); } });
  }
  function card(x, i) {
    const t = x.timeSet ? x.time : suggest(x), tf = x.type === 'tf';
    return `<div class="qz-q" data-id="${x.id}">
      <div class="qz-qh"><span class="qz-grip" title="${T('اسحب لتغيير الترتيب', 'Drag to reorder')}">⋮⋮</span><b class="qz-n">${i + 1}</b>
        <select data-k="type" aria-label="type"><option value="mc"${tf ? '' : ' selected'}>${T('اختيار من متعدد', 'Multiple choice')}</option><option value="tf"${tf ? ' selected' : ''}>${T('صح أو خطأ', 'True or false')}</option></select>
        <select data-k="time" aria-label="time" title="${T('وقت الإجابة', 'Time to answer')}">${TIMES.map(s => `<option value="${s}"${s === t ? ' selected' : ''}>${s} ${T('ث', 's')}${!x.timeSet && s === t ? ' ✦' : ''}</option>`).join('')}</select>
        <select data-k="pts" aria-label="points"><option value="1"${x.pts === 1 ? ' selected' : ''}>${T('نقاط عادية', 'Standard points')}</option><option value="2"${x.pts === 2 ? ' selected' : ''}>${T('نقاط مضاعفة', 'Double points')}</option><option value="0"${x.pts === 0 ? ' selected' : ''}>${T('بلا نقاط', 'No points')}</option></select>
        <span class="qz-act"><label class="qz-ib" title="${T('صورة', 'Image')}">🖼<input type="file" accept="image/*" hidden data-k="img"></label><button type="button" class="qz-ib" data-a="dup" title="${T('تكرار', 'Duplicate')}">⧉</button><button type="button" class="qz-ib" data-a="del" title="${T('حذف', 'Delete')}">✕</button></span></div>
      <textarea data-k="q" rows="2" dir="auto" maxlength="300" placeholder="${T('اكتب السؤال', 'Type the question')}">${esc(x.q)}</textarea>
      ${x.img ? `<div class="qz-img"><img src="${x.img}" alt=""><button type="button" data-a="noimg">${B('إزالة الصورة', 'Remove image')}</button></div>` : ''}
      <ol class="qz-opts">${x.opts.map((o, j) => `<li class="qz-o${x.ok.includes(j) ? ' ok' : ''}" style="--c:var(--qz${j})"><button type="button" class="qz-tick" data-ok="${j}" aria-pressed="${x.ok.includes(j)}" title="${T('الإجابة الصحيحة', 'Right answer')}"><i>${LET()[j]}</i></button>
        <input type="text" data-o="${j}" value="${esc(o)}" dir="auto" maxlength="120" placeholder="${T('خيار', 'Option')} ${j + 1}"${tf ? ' readonly' : ''}>${!tf && x.opts.length > 2 ? `<button type="button" class="qz-x" data-rm="${j}" aria-label="remove">×</button>` : ''}</li>`).join('')}</ol>
      ${!tf && x.opts.length < 6 ? `<button type="button" class="sn-lnk qz-more" data-a="opt">${B('+ خيار', '+ Option')}</button>` : ''}
      <p class="qz-warn" hidden></p></div>`;
  }
  function bind(el, x) {
    const re = () => { const i = Q.qs.indexOf(x), n = document.createElement('div'); n.innerHTML = card(x, i); const c = n.firstElementChild; el.replaceWith(c); bind(c, x); later(); return c; };
    el.querySelector('[data-k=q]').oninput = e => { x.q = e.target.value; tm(); later(); };
    const tm = () => { if (x.timeSet) return; const s = el.querySelector('[data-k=time]'), t = suggest(x); [...s.options].forEach(o => { o.selected = +o.value === t; o.textContent = o.value + ' ' + T('ث', 's') + (+o.value === t ? ' ✦' : ''); }); };
    el.querySelector('[data-k=type]').onchange = e => {
      x.type = e.target.value;
      if (x.type === 'tf') { x.keep = x.opts; x.opts = [T('صح', 'True'), T('خطأ', 'False')]; x.ok = x.ok.filter(j => j < 2).slice(0, 1); }
      else { x.opts = x.keep && x.keep.length ? x.keep : ['', '', '', '']; x.ok = []; }
      re();
    };
    el.querySelector('[data-k=time]').onchange = e => { x.time = +e.target.value; x.timeSet = true; later(); };
    el.querySelector('[data-k=pts]').onchange = e => { x.pts = +e.target.value; later(); };
    el.querySelector('[data-k=img]').onchange = async e => { const f = e.target.files[0]; if (f) { x.img = await shrink(f); re(); } };
    el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => {
      const j = +b.dataset.ok;
      // true/false has one answer; multiple choice may have several
      if (x.type === 'tf') x.ok = [j]; else x.ok = x.ok.includes(j) ? x.ok.filter(k => k !== j) : x.ok.concat(j).sort();
      el.querySelectorAll('.qz-o').forEach((li, k) => { li.classList.toggle('ok', x.ok.includes(k)); li.querySelector('[data-ok]').setAttribute('aria-pressed', x.ok.includes(k)); });
      later();
    });
    el.querySelectorAll('[data-o]').forEach(inp => {
      inp.oninput = () => { x.opts[+inp.dataset.o] = inp.value; tm(); later(); };
      // Enter goes to the next option, or adds one; Enter on an empty last option starts a new question
      inp.onkeydown = e => {
        if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault();
        const j = +inp.dataset.o;
        if (j < x.opts.length - 1) { el.querySelector(`[data-o="${j + 1}"]`).focus(); return; }
        if (!inp.value.trim() && x.opts.length > 2) { x.opts.pop(); re(); Q.qs.splice(Q.qs.indexOf(x) + 1, 0, norm({})); draw(); root.querySelectorAll('.qz-q textarea')[Q.qs.indexOf(x) + 1].focus(); return; }
        if (x.type !== 'tf' && x.opts.length < 6) { x.opts.push(''); const c = re(); c.querySelector(`[data-o="${j + 1}"]`).focus(); }
      };
    });
    el.querySelector('[data-k=q]').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); const f = el.querySelector('[data-o="0"]'); if (f) f.focus(); } };
    el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const j = +b.dataset.rm; x.opts.splice(j, 1); x.ok = x.ok.filter(k => k !== j).map(k => k > j ? k - 1 : k); re(); });
    const a = s => el.querySelector(`[data-a=${s}]`);
    if (a('opt')) a('opt').onclick = () => { x.opts.push(''); const c = re(); c.querySelector(`[data-o="${x.opts.length - 1}"]`).focus(); };
    if (a('noimg')) a('noimg').onclick = () => { x.img = null; re(); };
    a('dup').onclick = () => { const c = norm(JSON.parse(JSON.stringify(Object.assign({}, x, { id: uid() })))); c.timeSet = x.timeSet; Q.qs.splice(Q.qs.indexOf(x) + 1, 0, c); draw(); later(); };
    a('del').onclick = () => {
      const i = Q.qs.indexOf(x); Q.qs.splice(i, 1); draw(); later();
      toast(B('حُذف السؤال. <button type="button" class="sn-lnk" id="qzUndo">تراجع</button>', 'Question deleted. <button type="button" class="sn-lnk" id="qzUndo">Undo</button>'));
      const u = document.getElementById('qzUndo'); if (u) u.onclick = () => { Q.qs.splice(i, 0, x); draw(); later(); document.getElementById('qzToast').classList.remove('on'); };
    };
    // an image pasted while writing this question is attached to it
    el.addEventListener('paste', async e => { const it = [...(e.clipboardData || {}).items || []].find(k => k.type.startsWith('image/')); if (!it) return; e.preventDefault(); x.img = await shrink(it.getAsFile()); re(); });
  }
  function shrink(file) {
    return new Promise(ok => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c.toDataURL('image/jpeg', .8)); }; im.onerror = () => ok(null); im.src = URL.createObjectURL(file); });
  }

  /* ---------- checks before playing ---------- */
  function checks() {
    const box = root.querySelector('#qzChk'); if (!box) return;
    const W = [];
    const seen = new Map();
    Q.qs.forEach((x, i) => {
      const w = [], filled = x.opts.filter(o => o.trim());
      if (!x.q.trim()) w.push(T('بلا نص', 'no text'));
      if (filled.length < 2) w.push(T('يحتاج خيارين على الأقل', 'needs at least two options'));
      if (!x.ok.length) w.push(T('لم تُحدَّد الإجابة الصحيحة', 'no right answer chosen'));
      else if (x.ok.some(j => !(x.opts[j] || '').trim())) w.push(T('الإجابة الصحيحة خيار فارغ', 'the right answer is an empty option'));
      const lo = filled.map(o => o.trim().toLowerCase()); if (new Set(lo).size < lo.length) w.push(T('خيارات مكررة', 'repeated options'));
      if (x.q.length > 160) w.push(T('السؤال طويل على الشاشة', 'long for the screen'));
      if (x.opts.some(o => o.length > 75)) w.push(T('خيار طويل على الشاشة', 'an option is long for the screen'));
      const k = x.q.trim().toLowerCase(); if (k) { if (seen.has(k)) w.push(T(`مكرر مع السؤال ${seen.get(k) + 1}`, `same as question ${seen.get(k) + 1}`)); else seen.set(k, i); }
      const el = root.querySelectorAll('.qz-q')[i];
      if (el) { const p = el.querySelector('.qz-warn'); p.hidden = !w.length; p.textContent = w.join(' · '); el.classList.toggle('bad', !!w.length); }
      if (w.length) W.push(i);
    });
    // the right answer in the same place again and again is easy to guess
    const mc = Q.qs.filter(x => x.type === 'mc' && x.ok.length === 1 && x.opts.length >= 3), top = {};
    mc.forEach(x => top[x.ok[0]] = (top[x.ok[0]] || 0) + 1);
    const bias = mc.length >= 5 && Math.max(0, ...Object.values(top)) / mc.length > .5;
    box.innerHTML = !Q.qs.length ? B('لا أسئلة بعد.', 'No questions yet.')
      : W.length ? `<button type="button" class="qz-bad" data-go="${W[0]}">${B(`أسئلة تحتاج مراجعة: ${W.length}`, `${W.length} question${W.length > 1 ? 's' : ''} to review`)} ›</button>`
      : `<span class="qz-good">✓ ${B(`الأسئلة جاهزة (${Q.qs.length})`, `${Q.qs.length} question${Q.qs.length > 1 ? 's' : ''} ready`)}</span>`;
    if (bias) box.innerHTML += `<button type="button" class="sn-lnk" id="qzShuf">${B('الإجابة الصحيحة في نفس الموضع كثيرًا — اخلط الخيارات', 'The right answer is often in the same place — shuffle options')}</button>`;
    const g = box.querySelector('[data-go]'); if (g) g.onclick = () => { const i = W.find(i => true); const el = root.querySelectorAll('.qz-q')[i]; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); };
    const s = box.querySelector('#qzShuf'); if (s) s.onclick = () => { Q.qs.forEach(x => { if (x.type !== 'mc') return; const idx = x.opts.map((_, j) => j); for (let j = idx.length - 1; j > 0; j--) { const r = Math.floor(Math.random() * (j + 1)); [idx[j], idx[r]] = [idx[r], idx[j]]; } x.ok = x.ok.map(k => idx.indexOf(k)).sort(); x.opts = idx.map(j => x.opts[j]); }); draw(); later(); toast(B('خُلطت الخيارات.', 'Options shuffled.')); };
  }

  /* ---------- files ---------- */
  async function fromFile(f) {
    const n = f.name.toLowerCase();
    try {
      if (n.endsWith('.docx')) { await load(LIB.zip); add(QZParse.parse(await docxLines(f))); }
      else if (n.endsWith('.xlsx') || n.endsWith('.xls')) { await load(LIB.xlsx); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); add(QZParse.fromRows(rows)); }
      else if (n.endsWith('.csv')) add(QZParse.fromRows(QZParse.csvRows(await f.text())));
      else if (n.endsWith('.pdf')) { await load(LIB.pdf); add(QZParse.parse(await pdfLines(f))); }
      else add(QZParse.fromText(await f.text()));
    } catch (e) { toast(B('تعذّر قراءة الملف.', 'The file could not be read.'), 1); }
  }
  // Word: each paragraph is a line; what stands out (bold, colour, underline, highlight) is noted, and Word's own list levels too
  async function docxLines(f) {
    const z = await JSZip.loadAsync(await f.arrayBuffer()), x = await z.file('word/document.xml').async('string');
    const d = new DOMParser().parseFromString(x, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const at = (el, n) => el && (el.getAttributeNS(W, n) || el.getAttribute('w:' + n));
    const styles = {};
    try {
      const sx = new DOMParser().parseFromString(await z.file('word/styles.xml').async('string'), 'application/xml');
      for (const st of sx.getElementsByTagNameNS(W, 'style')) { const np = st.getElementsByTagNameNS(W, 'numPr')[0]; if (np) styles[at(st, 'styleId')] = { n: at(np.getElementsByTagNameNS(W, 'numId')[0], 'val'), l: at(np.getElementsByTagNameNS(W, 'ilvl')[0], 'val') }; }
    } catch (e) {}
    const off = v => v === '0' || v === 'false' || v === 'none';
    const out = [];
    for (const p of d.getElementsByTagNameNS(W, 'p')) {
      let s = '', em = 0, plain = 0;
      for (const r of p.getElementsByTagNameNS(W, 'r')) {
        let t = ''; for (const c of r.childNodes) { if (c.localName === 't') t += c.textContent; else if (c.localName === 'tab') t += ' '; else if (c.localName === 'br') t += ' '; }
        if (!t.trim()) { s += t; continue; }
        const pr = r.getElementsByTagNameNS(W, 'rPr')[0], g = n => pr && pr.getElementsByTagNameNS(W, n)[0];
        const b = g('b'), u = g('u'), h = g('highlight'), sh = g('shd'), co = g('color');
        const on = (b && !off(at(b, 'val'))) || (u && !off(at(u, 'val'))) || (h && !off(at(h, 'val'))) || (sh && at(sh, 'fill') && !/^(auto|ffffff)$/i.test(at(sh, 'fill'))) || (co && at(co, 'val') && !/^(auto|000000)$/i.test(at(co, 'val')));
        s += t; if (on) em += t.length; else plain += t.length;
      }
      // the list this paragraph belongs to, set on the paragraph or by its style
      const np = p.getElementsByTagNameNS(W, 'numPr')[0], ps = p.getElementsByTagNameNS(W, 'pStyle')[0];
      let li = np ? { n: at(np.getElementsByTagNameNS(W, 'numId')[0], 'val'), l: at(np.getElementsByTagNameNS(W, 'ilvl')[0], 'val') } : null;
      if (ps && styles[at(ps, 'val')]) { const st = styles[at(ps, 'val')]; li = { n: (li && li.n) || st.n, l: (li && li.l) || st.l }; }
      const line = { s, em: em > 0 && em >= plain };
      if (li && li.n && li.n !== '0') { line.key = li.n + ':' + (li.l || 0); line.il = +(li.l || 0); }
      out.push(line);
    }
    // Word numbers questions and options itself, so the numbers are not in the text: tell them apart by the lists they belong to
    const keys = [...new Set(out.filter(l => l.key).map(l => l.key))];
    if (keys.length >= 2) {
      const ils = [...new Set(out.filter(l => l.key).map(l => l.il))];
      if (ils.length > 1) { const lo = Math.min(...ils); out.forEach(l => { if (l.key) l.lvl = l.il > lo ? 1 : 0; }); }
      else { const cnt = k => out.filter(l => l.key === k).length, qk = keys.reduce((a, k) => cnt(k) < cnt(a) ? k : a); out.forEach(l => { if (l.key) l.lvl = l.key === qk ? 0 : 1; }); }
    } else if (keys.length === 1) {
      // one list with plain paragraphs between its runs: the list holds the options and the plain paragraphs are the questions
      const idx = out.map((l, k) => l.key ? k : -1).filter(k => k >= 0);
      const between = out.some((l, k) => !l.key && l.s.trim() && k > idx[0] && k < idx[idx.length - 1]);
      if (between) out.forEach((l, k) => { if (l.key) l.lvl = 1; else if (l.s.trim() && out[k + 1] && out[k + 1].key) l.lvl = 0; });
    }
    // headings and instructions before the first question are not questions
    const first = out.findIndex(l => l.lvl === 0);
    if (first > 0) out.splice(0, first);
    return out;
  }
  // PDF: text lines rebuilt from positions (right to left for Arabic)
  async function pdfLines(f) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true }).promise, out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent(), L = [];
      tc.items.filter(t => t.str.trim()).forEach(t => { const y = t.transform[5], fs = Math.hypot(t.transform[2], t.transform[3]) || 10; let l = L.find(l => Math.abs(l.y - y) < Math.min(l.fs, fs) * .5); if (!l) { l = { y, fs, it: [] }; L.push(l); } l.it.push(t); });
      L.sort((a, b) => b.y - a.y).forEach((l, k) => {
        const rtl = l.it.some(t => /[؀-ۿﭐ-﻿]/.test(t.str));
        l.it.sort((a, b) => rtl ? b.transform[4] - a.transform[4] : a.transform[4] - b.transform[4]);
        let s = '', edge = null;
        l.it.forEach(t => { const x0 = t.transform[4], x1 = x0 + t.width, gap = edge == null ? 0 : rtl ? edge - x1 : x0 - edge; s += (edge != null && gap > l.fs * .2 ? ' ' : '') + t.str; edge = rtl ? x0 : x1; });
        const prev = L.sort((a, b) => b.y - a.y)[k - 1];
        if (prev && prev.y - l.y > l.fs * 2) out.push({ s: '' });
        out.push({ s: s.normalize('NFKC') });
      });
      out.push({ s: '' });
    }
    return out;
  }
  async function template() {
    try { await load(LIB.xlsx); } catch (e) { toast(B('تعذّر تجهيز القالب.', 'The template could not be prepared.'), 1); return; }
    const ar = isAr(), H = ar ? ['السؤال', 'الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4', 'الإجابة الصحيحة (رقم الخيار)', 'الوقت (ثانية)'] : ['Question', 'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Correct answer (option number)', 'Time (seconds)'];
    const rows = ar ? [H, ['ما عاصمة المملكة العربية السعودية؟', 'جدة', 'الرياض', 'الدمام', 'مكة المكرمة', 2, 20], ['الماء يغلي عند 100 درجة مئوية', 'صح', 'خطأ', '', '', 1, 10]]
      : [H, ['What is the capital of France?', 'Lyon', 'Paris', 'Nice', 'Lille', 2, 20], ['Water boils at 100 °C', 'True', 'False', '', '', 1, 10]];
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 50 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 14 }]; if (ar) ws['!views'] = [{ RTL: true }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, ar ? 'الأسئلة' : 'Questions'); if (ar) wb.Workbook = { Views: [{ RTL: true }] };
    save(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), ar ? 'قالب أسئلة المسابقة.xlsx' : 'Quiz questions template.xlsx');
  }

  /* ---------- the AI instructions ---------- */
  function aiPrompt(topic, n, lv, ty, lg) {
    const ar = lg === 'ar';
    const LV = { mixed: ar ? 'متنوعة الصعوبة (سهلة ومتوسطة وصعبة)' : 'of mixed difficulty (easy, medium and hard)', easy: ar ? 'سهلة' : 'easy', mid: ar ? 'متوسطة الصعوبة' : 'of medium difficulty', hard: ar ? 'صعبة تتطلب تفكيرًا' : 'hard, requiring thought' }[lv];
    const TY = { mc: ar ? 'اختيار من متعدد بأربعة خيارات' : 'multiple choice with four options', mix: ar ? 'أغلبها اختيار من متعدد بأربعة خيارات، وبعضها صح أو خطأ' : 'mostly multiple choice with four options, some true or false', tf: ar ? 'صح أو خطأ' : 'true or false' }[ty];
    if (ar) return `اكتب ${n} سؤالًا لمسابقة تفاعلية حيّة، ${LV}، من نوع ${TY}${topic ? `، عن الموضوع التالي:\n\n${topic}\n` : '.'}

الشروط:
- السؤال لا يتجاوز ١٢٠ حرفًا، والخيار لا يتجاوز ٧٥ حرفًا، لأنها تُعرض على شاشة.
- خيار واحد صحيح في كل سؤال، والخيارات الخاطئة معقولة وليست واضحة الخطأ.
- وزّع موضع الإجابة الصحيحة بين أ وب وج ود بالتساوي تقريبًا.
- لا تكرر الأسئلة، ولا تضع «كل ما سبق» أو «لا شيء مما سبق».

اكتبها بهذه الصيغة بالضبط، داخل صندوق نص واحد، دون أي شرح قبلها أو بعدها، وضع * بعد الإجابة الصحيحة:

1. نص السؤال؟
أ) خيار
ب) خيار *
ج) خيار
د) خيار

2. عبارة صح أو خطأ (صح أو خطأ)
صح
خطأ *`;
    return `Write ${n} questions for a live interactive quiz, ${LV}, ${TY}${topic ? `, on the following:\n\n${topic}\n` : '.'}

Rules:
- Each question at most 120 characters and each option at most 75 characters, as they are shown on a screen.
- One right answer per question; wrong options should be plausible, not obviously wrong.
- Spread the position of the right answer across a, b, c and d about evenly.
- No repeated questions, no “all of the above” or “none of the above”.

Use exactly this format, in one plain-text box, with no explanation before or after, and put * after the right answer:

1. Question text?
a) option
b) option *
c) option
d) option

2. A true-or-false statement (true or false)
True
False *`;
  }

  /* ---------- preview: the big screen and a player's phone ---------- */
  function preview(i) {
    if (!Q.qs.length) { toast(B('أضف سؤالًا أولًا.', 'Add a question first.'), 1); return; }
    document.querySelectorAll('.qz-pv').forEach(x => x.remove());
    const v = document.createElement('div'); v.className = 'qz-pv'; v.setAttribute('role', 'dialog'); document.body.appendChild(v);
    let show = false;
    const close = () => { v.remove(); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(isAr() ? 1 : -1); if (e.key === 'ArrowRight') go(isAr() ? -1 : 1); };
    const go = d => { const n = i + d; if (n >= 0 && n < Q.qs.length) { i = n; show = false; paint(); } };
    function paint() {
      const x = Q.qs[i], t = x.timeSet ? x.time : suggest(x), opts = x.opts.map((o, j) => ({ o, j })).filter(z => z.o.trim());
      v.innerHTML = `<div class="qz-pvb">
        <div class="qz-pvh"><b>${B('معاينة', 'Preview')} · ${i + 1} / ${Q.qs.length}</b><span><button type="button" data-g="-1" aria-label="previous">${isAr() ? '›' : '‹'}</button><button type="button" data-g="1" aria-label="next">${isAr() ? '‹' : '›'}</button><button type="button" class="qz-show" aria-pressed="${show}">${B('إظهار الإجابة', 'Show answer')}</button><button type="button" data-x aria-label="close">✕</button></span></div>
        <div class="qz-stage">
          <div class="qz-screen"><p class="qz-sq" dir="auto">${esc(x.q) || '…'}</p>${x.img ? `<img src="${x.img}" alt="">` : ''}<div class="qz-timer">${t}</div>${x.pts === 2 ? `<span class="qz-x2">×2</span>` : ''}
            <div class="qz-tiles">${opts.map(z => `<div class="qz-tile${show ? (x.ok.includes(z.j) ? ' right' : ' wrong') : ''}" style="--c:var(--qz${z.j})"><i>${LET()[z.j]}</i><span dir="auto">${esc(z.o)}</span>${show && x.ok.includes(z.j) ? '<b>✓</b>' : ''}</div>`).join('')}</div></div>
          <div class="qz-phone"><div class="qz-ph-top">${B('السؤال', 'Question')} ${i + 1}</div><div class="qz-btns">${opts.map(z => `<div class="qz-pb" style="--c:var(--qz${z.j})"><i>${LET()[z.j]}</i><span dir="auto">${esc(z.o)}</span></div>`).join('')}</div></div>
        </div></div>`;
      v.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go(+b.dataset.g));
      v.querySelector('[data-x]').onclick = close;
      v.querySelector('.qz-show').onclick = () => { show = !show; paint(); };
    }
    v.onclick = e => { if (e.target === v) close(); };
    document.addEventListener('keydown', key);
    paint();
  }

  home();
})();

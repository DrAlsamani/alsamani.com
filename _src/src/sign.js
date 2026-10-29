/* alsamani.com/tools/sign — one shared copy of the minutes; each member signs in their own box.
   Depends on pdf.js (pdfjsLib), pdf-lib (PDFLib) and src/sign_detect.js. */
(function () {
  const root = document.getElementById('sn');
  if (!root) return;
  const API = root.dataset.api;
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isAr = () => document.documentElement.lang === 'ar';
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sn.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sn.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('sn.' + k); } catch (e) {} }
  };
  const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function call(body, tries) {
    let j;
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 45000);
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ac.signal });
      j = await r.json(); clearTimeout(to);
    } catch (e) {
      if ((body.a === 'get' || body.a === 'pdf') && !tries) return call(body, 1);
      throw e;
    }
    if (!j.ok) { const e = new Error(j.error || 'error'); e.code = j.error; throw e; }
    return j;
  }
  const ERR = {
    busy: B('بلغت الخدمة حدّها اليومي. حاول مرة أخرى غدًا.', 'The service has reached its daily limit. Please try again tomorrow.'),
    full: B('اكتمل العدد المسموح في هذا الرابط.', 'This link has reached its limit.'),
    taken: B('سبقك أحد إلى التوقيع في هذه الخانة. حدّث الصفحة وتأكد من خانتك.', 'Someone has already signed in this box. Refresh and check your box.'),
    locked: B('أُقفل المحضر، ولم يعد التوقيع متاحًا.', 'The minutes are locked; signing is closed.'),
    not_found: B('لم يُعثر على المحضر. ربما حُذف أو انتهت مدته.', 'These minutes were not found. They may have been deleted or expired.'),
    bad_pdf: B('الملف غير صالح أو أكبر من ١٠ ميجابايت.', 'The file is invalid or larger than 10 MB.'),
    bad_sig: B('صورة التوقيع غير صالحة. ارسم توقيعك، أو استخدم صورة توقيع على ورقة بيضاء.', 'The signature image is not valid. Draw your signature, or use a photo of it on white paper.'),
    net: B('تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.', 'Could not connect. Check your connection and try again.')
  };
  const errMsg = e => ERR[e && e.code] || ERR.net;
  const toast = (html, bad) => {
    let t = document.getElementById('snToast');
    if (!t) { t = document.createElement('div'); t.id = 'snToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };

  /* ---------- page rendering with boxes ---------- */
  async function renderPages(doc, host, slots, opts, Z) {
    host.innerHTML = '';
    host.classList.toggle('zoomed', (Z || 1) > 1);
    const out = [], W = Math.min(host.clientWidth || 600, 900) * (Z || 1), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (let pi = 0; pi < doc.numPages; pi++) {
      const page = await doc.getPage(pi + 1), vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: W / vp0.width });
      const wrap = document.createElement('div'); wrap.className = 'sn-page'; wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
      const lab = document.createElement('span'); lab.className = 'sn-pn'; lab.textContent = (isAr() ? 'صفحة ' : 'Page ') + (pi + 1) + ' / ' + doc.numPages; wrap.appendChild(lab);
      host.appendChild(wrap); out.push({ pi, wrap, vp, page, done: false });
    }
    const paint = async v => {
      if (v.done) return; v.done = true;
      const cv = document.createElement('canvas'); cv.width = Math.floor(v.vp.width * dpr); cv.height = Math.floor(v.vp.height * dpr); cv.style.width = v.vp.width + 'px'; cv.style.height = v.vp.height + 'px';
      v.wrap.prepend(cv);
      await v.page.render({ canvasContext: cv.getContext('2d'), viewport: v.vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); paint(out.find(v => v.wrap === e.target)); } }), { rootMargin: '1500px 0px' });
    out.forEach(v => io.observe(v.wrap));
    placeBoxes(out, slots, opts);
    return out;
  }
  // drag to move, corner handle to resize (keepRatio for signature images)
  function draggable(b, onEnd, keepRatio) {
    let mode = null, sx, sy, r0, pid;
    b.addEventListener('pointerdown', e => {
      if (e.target.closest('.sn-bx')) return;
      sx = e.clientX; sy = e.clientY; r0 = { l: b.offsetLeft, t: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }; pid = e.pointerId;
      // on the name field a tap types and a drag moves the box
      mode = e.target.classList.contains('sn-rz') ? 'rz' : 'mv';
      b.setPointerCapture(e.pointerId); e.preventDefault();
    });
    b.addEventListener('pointermove', e => {
      if (!mode) return; const dx = e.clientX - sx, dy = e.clientY - sy;

      if (mode === 'mv') { b.style.left = r0.l + dx + 'px'; b.style.top = r0.t + dy + 'px'; return; }
      let w = Math.max(30, r0.w + (isAr() ? -dx : dx)), h = keepRatio ? w * r0.h / r0.w : Math.max(14, r0.h + dy);
      b.style.width = w + 'px'; b.style.height = h + 'px'; if (isAr()) b.style.left = r0.l + r0.w - w + 'px';
    });
    const up = () => { if (!mode) return; const m = mode; mode = null; if (m !== 'wait') onEnd && onEnd(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  }
  // the name written on the same row as a box, if the file has its text
  async function nameNear(v, s) {
    try {
      const tc = await v.page.getTextContent(), cy = s.y + s.h / 2;
      const its = tc.items.filter(t => t.str && t.str.trim()).map(t => ({ s: t.str, x: t.transform[4], y: t.transform[5], w: t.width, fs: Math.hypot(t.transform[2], t.transform[3]) || t.height || 10 }));
      // the row's text joined into cells the same way the automatic detection reads names
      const skip = /^(الاسم|اسم العضو|التوقيع|توقيع|م|الصفة|المسمى|name|signature|no\.?)$/i, HON = /^(أ|د|م|ا|أ\.د|د\.م)\s?\.|^(dr|mr|mrs|ms|prof|eng)\b/i, ROLE = /^(رئيس|نائب|عضو|مقرر|أمين|سكرتير|ممثل|مشرف|member|chair|vice|secretary)/i;
      // table borders split the row into its cells, so a name never runs into the number or the role beside it
      let xs = []; try { const Ls = await snLinesOf(v.page, pdfjsLib.OPS); const cnt = {}; Ls.V.forEach(q => { const k = Math.round(q.x); cnt[k] = (cnt[k] || 0) + 1; });
        // column borders: long lines, or short ones repeated row after row (a stray stroke inside a cell is neither)
        xs = [...new Set(Ls.V.filter(q => q.y0 > 2 && q.x > 2 && q.y0 <= cy - 3 && q.y1 >= cy + 3 && (q.y1 - q.y0 > 40 || cnt[Math.round(q.x)] >= 3)).map(q => Math.round(q.x)))].sort((a, b) => a - b); } catch (e) {}
      const col = t => { const c = t.x + t.w / 2; let k = 0; while (k < xs.length && xs[k] < c) k++; return k; }, groups = {};
      its.forEach(t => (groups[col(t)] = groups[col(t)] || []).push(t));
      const cells = [].concat(...Object.values(groups).map(g => snRuns(g))).filter(r => Math.abs(r.y + r.fs * .35 - cy) < Math.max(s.h * .6, r.fs) && (r.r < s.x - 2 || r.x > s.x + s.w + 2) && r.s && !/^[\d\s.\-–—:|/٠-٩]+$/.test(r.s) && !skip.test(r.s));
      if (!cells.length) return '';
      const dist = r => r.x > s.x ? r.x - (s.x + s.w) : s.x - r.r;
      const score = r => (HON.test(r.s) ? 6 : 0) + Math.min(r.s.split(' ').length, 5) - (ROLE.test(r.s) ? 8 : 0) - dist(r) / 200;
      const out = cells.reduce((a, r) => score(r) > score(a) ? r : a).s.slice(0, 120);
      // files whose fonts hide the real letters give symbols instead of a name
      const L = (out.match(/[\p{L}\p{M}]/gu) || []).length, odd = /[¥¡¦~<>^|{}\[\]\\@#$%&*_=+]/.test(out);
      return !odd && L >= 2 && L / out.replace(/\s/g, '').length > .7 ? out : '';
    } catch (e) { return ''; }
  }
  function pdfRect(v, b) {
    const l = b.offsetLeft, t = b.offsetTop, w = b.offsetWidth, h = b.offsetHeight;
    const a = v.vp.convertToPdfPoint(l, t + h), c = v.vp.convertToPdfPoint(l + w, t);
    return { x: Math.min(a[0], c[0]), y: Math.min(a[1], c[1]), w: Math.abs(c[0] - a[0]), h: Math.abs(c[1] - a[1]) };
  }
  function rectOf(vp, s) { const r = vp.convertToViewportRectangle([s.x, s.y, s.x + s.w, s.y + s.h]); return { l: Math.min(r[0], r[2]), t: Math.min(r[1], r[3]), w: Math.abs(r[2] - r[0]), h: Math.abs(r[3] - r[1]) }; }
  function placeBoxes(views, slots, opts) {
    views.forEach(v => v.wrap.querySelectorAll('.sn-box').forEach(b => b.remove()));
    slots.forEach((s, i) => {
      const v = views.find(v => v.pi === s.p); if (!v || s.gone) return;
      const r = rectOf(v.vp, s), b = document.createElement(opts.edit ? 'div' : 'button');
      b.className = 'sn-box' + (s.free ? ' free' : '') + (s.sig ? ' done' : '') + (opts.mine && opts.mine[i] ? ' mine' : '');
      b.style.left = r.l + 'px'; b.style.top = r.t + 'px'; b.style.width = r.w + 'px'; b.style.height = r.h + 'px';
      b.dataset.i = i;
      if (s.sig) { const im = new Image(); im.src = s.sig; im.alt = ''; b.appendChild(im); }
      if (opts.edit) {
        b.innerHTML = '<span class="sn-bn">' + (i + 1) + '</span><i class="sn-rz" aria-hidden="true"></i><button type="button" class="sn-bx" aria-label="remove">×</button><span class="sn-nmt" dir="auto"></span>';
        b.querySelector('.sn-nmt').textContent = s.n || (isAr() ? 'أضف الاسم هنا' : 'Add the name here'); b.classList.toggle('noname', !s.n); b.title = s.n || '';
      } else {
        b.type = 'button'; b.setAttribute('aria-label', (s.n || '') + (s.sig ? ' ✓' : ''));
      }
      if (opts.onBox) opts.onBox(b, i, v);
      v.wrap.appendChild(b);
    });
  }

  /* ---------- creating a session ---------- */
  function createView() {
    root.innerHTML = `
      <div class="sn-card sn-drop" id="snDrop">
        <input type="file" id="snFile" accept="application/pdf,.pdf" hidden>
        <p class="sn-step">${B('١', '1')}</p>
        <h2>${B('ارفع المحضر', 'Upload the minutes')}</h2>
        <p>${B('ملف PDF فيه جدول التواقيع. تحدد الأداة خانة كل عضو تلقائيًا.', 'A PDF with the signature table. The tool finds each member’s box automatically.')}</p>
        <button type="button" class="btn solid" id="snPick">${B('اختيار الملف', 'Choose file')}</button>
        <p class="sn-fine">${B('يُحفظ المحضر مؤقتًا لإتمام التوقيع فقط، ويُحذف تلقائيًا بعد ٧ أيام، ويستطيع المنسق حذفه فورًا.', 'The minutes are kept only while signing is open and are deleted automatically after 7 days; the coordinator can delete them at once.')}</p>
      </div>
      <div id="snEdit" hidden></div>`;
    const f = root.querySelector('#snFile');
    root.querySelector('#snPick').onclick = () => f.click();
    const drop = root.querySelector('#snDrop');
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const x = e.dataTransfer.files[0]; if (x) load(x); });
    f.onchange = () => f.files[0] && load(f.files[0]);
    async function load(file) {
      if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { toast(B('اختر ملف PDF. إن كان المحضر بصيغة وورد فاحفظه PDF أولًا.', 'Choose a PDF. If the minutes are in Word, save them as PDF first.'), 1); return; }
      if (file.size > 10 * 1024 * 1024) { toast(ERR.bad_pdf, 1); return; }
      drop.classList.add('busy');
      const buf = await file.arrayBuffer();
      let doc;
      try { doc = await pdfjsLib.getDocument({ data: buf.slice(0), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true }).promise; }
      catch (e) { drop.classList.remove('busy'); toast(B('تعذّر فتح الملف.', 'The file could not be opened.'), 1); return; }
      let slots = [];
      for (let p = 0; p < doc.numPages; p++) { try { slots = slots.concat(await snDetectPage(await doc.getPage(p + 1), p, pdfjsLib.OPS)); } catch (e) {} }
      drop.classList.remove('busy'); drop.hidden = true;
      editor(doc, buf, slots, file.name.replace(/\.pdf$/i, ''));
    }
  }

  // the coordinator's boxes are remembered on this device and can be reused for the next minutes of the same format
  const tpls = () => store.get('tpl', []);
  function applyTpl(t, doc, slots) {
    slots.length = 0;
    t.slots.forEach(x => slots.push({ p: Math.max(0, Math.min(doc.numPages - 1, doc.numPages - 1 - x.pe)), n: x.n, r: x.r || '', x: x.x, y: x.y, w: x.w, h: x.h }));
  }
  function editor(doc, buf, slots, title) {
    const ed = root.querySelector('#snEdit'); ed.hidden = false;
    const T = tpls(); let used = null;
    if (!slots.length && T.length) { applyTpl(T[0], doc, slots); used = T[0]; }
    const found = slots.length;
    ed.innerHTML = `
      <div class="sn-card">
        <p class="sn-step">${B('٢', '2')}</p>
        <h2>${B('إنشاء الرابط', 'Create the link')}</h2>
        <label class="sn-lbl">${B('عنوان المحضر', 'Title')}<input type="text" id="snTitle" maxlength="200" value="${esc(title)}"></label>
        ${T.length ? `<label class="sn-lbl">${B('خانات محفوظة من محاضر سابقة', 'Boxes saved from earlier minutes')}<select id="snTpl"><option value="">${isAr() ? 'تحديد تلقائي من هذا الملف' : 'Detect from this file'}</option>${T.map((t, k) => `<option value="${k}"${used === t ? ' selected' : ''}>${esc(t.title)} · ${t.slots.length} ${isAr() ? 'خانة' : 'boxes'}</option>`).join('')}</select></label>` : ''}
        <p class="sn-found">${used ? B(`استُخدمت خانات «${esc(used.title)}» وأسماؤها. راجعها إن تغيّر شكل المحضر.`, `Boxes and names from “${esc(used.title)}” were applied. Review them if the layout changed.`) : found ? B(`حددت الأداة ${found} خانة توقيع أمام الأسماء، وستظهر للأعضاء جاهزة. ويستطيع أي عضو أيضًا التوقيع في الموضع الذي يختاره.`, `The tool marked ${found} signature boxes next to the names; members will see them ready. Any member can also sign wherever they choose.`) : B('لم تُحدَّد خانات توقيع تلقائيًا، ولا بأس: يضع كل عضو توقيعه في الموضع الذي يختاره من المحضر.', 'No signature boxes were detected, which is fine: each member places their signature wherever they choose.')}</p>
        <div class="sn-two"><button type="button" class="btn solid" id="snCreate">${B('إنشاء الرابط الآن', 'Create the link now')}</button>
        <button type="button" class="btn ghost" id="snRevBtn" aria-expanded="false">${found ? B('مراجعة بيانات التوقيع الأولية', 'Review the signing details') : B('إضافة بيانات التوقيع مسبقًا', 'Add the signing details first')} <small class="sn-opt">${B('اختياري', 'optional')}</small></button></div>
        <details class="sn-why"><summary>${B('ما فائدتها؟', 'Why add them?')}</summary><p>${B('تحدد لكل عضو مربعًا باسمه في موضع توقيعه، فيصير التوقيع أسهل وأدق: يفتح العضو الرابط ويختار اسمه، فينتقل إلى مربعه مباشرة، ثم يرسم توقيعه أو يختار توقيعه المحفوظ، فيوضع في مكانه بالحجم المناسب ويُحفظ تلقائيًا. وتتابع أنت من وقّع ومن لم يوقّع بعد. وإن تركتها، يضع كل عضو توقيعه في الموضع الذي يختاره.', 'Each member gets a box with their name where they sign, so signing is easier and neater: the member opens the link and picks their name, goes straight to their box, draws or picks a saved signature, and it is placed at the right size and saved automatically. You can follow who has signed and who has not. Without them, each member signs wherever they choose.')}</p></details>
      </div>
      <div id="snRev" hidden>
      <div class="sn-card">
        <p>${B('اضغط على الصفحة حيث تريد مربع توقيع، ثم اكتب اسم العضو داخله. واسحب أي مربع لتعديل موضعه، أو احذفه بعلامة ×.', 'Tap the page where a signature box should go, then type the member’s name inside it. Drag a box to move it, or remove it with ×.')}</p>
        <details class="sn-det"${found ? '' : ' open'}><summary>${B('أسماء الأعضاء', 'Member names')} <b id="snNc"></b></summary><ol class="sn-list" id="snList"></ol></details>
        <div class="sn-tools">        ${found ? `<button type="button" class="sn-lnk" id="snJump">${B('الانتقال إلى جدول التواقيع', 'Go to the signature table')}</button>` : ''}</div>
      </div>
      <div class="sn-pages" id="snPagesHost"></div>
      <div class="sn-bar"><button type="button" class="btn solid" id="snCreate2">${B('إنشاء رابط التوقيع', 'Create the signing link')}</button></div>
      </div>`;
    const host = ed.querySelector('#snPagesHost');
    let views = [], adding = true;
    const list = ed.querySelector('#snList');
    function drawList() {
      ed.querySelector('#snNc').textContent = '(' + slots.length + ')';
      list.innerHTML = slots.map((s, i) => `<li><span class="sn-n">${i + 1}</span><input type="text" value="${esc(s.n)}" data-i="${i}" placeholder="${isAr() ? 'الاسم' : 'Name'}" maxlength="120"><button type="button" class="sn-del" data-i="${i}" aria-label="remove">×</button></li>`).join('');
      list.querySelectorAll('input').forEach(inp => inp.oninput = () => { slots[+inp.dataset.i].n = inp.value; setName(+inp.dataset.i); });
      list.querySelectorAll('.sn-del').forEach(b => b.onclick = () => { slots.splice(+b.dataset.i, 1); drawList(); place(); });
    }
    function place() {
      placeBoxes(views, slots, { edit: 1, onBox: (b, i, v) => {
        b.querySelector('.sn-bx').onclick = e => { e.stopPropagation(); slots.splice(i, 1); drawList(); place(); };
        draggable(b, () => Object.assign(slots[i], pdfRect(v, b)));
        // a tap (not a drag) opens the name bar for this box
        let px, py; b.addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; });
        b.addEventListener('pointerup', e => { if (e.target.closest('.sn-bx') || Math.abs(e.clientX - px) + Math.abs(e.clientY - py) > 6) return; openBar(i, false); });
      } });
      if (bar && cur >= 0 && cur < slots.length) mark(cur); else closeBar();
    }
    // the name of a box is edited in a bar at the bottom: large, complete and above the keyboard
    let bar = null, cur = -1;
    const label = i => isAr() ? `الخانة ${i + 1} من ${slots.length}` : `Box ${i + 1} of ${slots.length}`;
    function setName(i) {
      const b = host.querySelector(`.sn-box[data-i="${i}"]`); if (b) { b.querySelector('.sn-nmt').textContent = slots[i].n || (isAr() ? 'أضف الاسم هنا' : 'Add the name here'); b.classList.toggle('noname', !slots[i].n); b.title = slots[i].n || ''; }
      const li = list.querySelector(`input[data-i="${i}"]`); if (li && li.value !== slots[i].n) li.value = slots[i].n;
      if (bar && cur === i) { const f = bar.querySelector('input'); if (f.value !== slots[i].n) f.value = slots[i].n; }
    }
    function mark(i) { host.querySelectorAll('.sn-box.act').forEach(x => x.classList.remove('act')); const b = host.querySelector(`.sn-box[data-i="${i}"]`); if (b) b.classList.add('act'); }
    function fit() { if (!bar) return; const vv = window.visualViewport; bar.style.bottom = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px' : '0'; }
    function openBar(i, focus) {
      if (!bar) {
        bar = document.createElement('div'); bar.className = 'sn-nbar';
        bar.innerHTML = `<div class="sn-nbh"><button type="button" data-g="-1" aria-label="${isAr() ? 'السابقة' : 'Previous'}">${isAr() ? '›' : '‹'}</button><span class="sn-nbl"></span><button type="button" data-g="1" aria-label="${isAr() ? 'التالية' : 'Next'}">${isAr() ? '‹' : '›'}</button><button type="button" class="sn-nbok">${B('تم', 'Done')}</button></div><input type="text" maxlength="120" dir="auto" enterkeyhint="next" placeholder="${isAr() ? 'اكتب اسم العضو' : 'Type the member’s name'}">`;
        document.body.appendChild(bar);
        const f = bar.querySelector('input');
        f.oninput = () => { slots[cur].n = f.value; setName(cur); };
        f.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (cur < slots.length - 1) openBar(cur + 1, true); else closeBar(); } };
        bar.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { const n = cur + +x.dataset.g; if (n >= 0 && n < slots.length) openBar(n, document.activeElement === f); });
        bar.querySelector('.sn-nbok').onclick = closeBar;
        if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }
      }
      cur = i; mark(i); bar.querySelector('.sn-nbl').textContent = label(i);
      const f = bar.querySelector('input'); f.value = slots[i].n || ''; if (focus) f.focus({ preventScroll: true }); fit();
      const b = host.querySelector(`.sn-box[data-i="${i}"]`); if (b) setTimeout(() => b.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }), focus ? 300 : 0);
    }
    function closeBar() { if (bar) { bar.remove(); bar = null; } cur = -1; host.querySelectorAll('.sn-box.act').forEach(x => x.classList.remove('act')); }
    async function show() {
      views = await renderPages(doc, host, slots, { edit: 1 });
      place();
      views.forEach(v => { v.wrap.addEventListener('pointerdown', () => { v.typing = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.sn-nbar')); }); v.wrap.addEventListener('click', async e => {
        // a tap that only leaves a name field does not add a box
        if (!adding || e.target.closest('.sn-box') || v.typing) { v.typing = false; return; }
        const rc = v.wrap.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
        const last = slots[slots.length - 1], w = last ? last.w : 110, h = last ? last.h : 22;
        const pt = v.vp.convertToPdfPoint(x, y);
        const s = { p: v.pi, n: '', r: '', x: pt[0] - w / 2, y: pt[1] - h / 2, w, h }; slots.push(s);
        s.n = await nameNear(v, s); drawList(); place();
        openBar(slots.length - 1, !s.n);
      }); });
    }
    host.classList.add('adding');
    // with a mouse, a faint box follows the pointer to show where a new box would go
    const ghost = document.createElement('div'); ghost.className = 'sn-ghost'; ghost.textContent = isAr() ? '+ إضافة مربع توقيع' : '+ Add a signature box';
    host.addEventListener('pointermove', e => {
      const wrap = e.target.closest('.sn-page'); if (e.pointerType !== 'mouse' || !wrap || e.target.closest('.sn-box')) { ghost.remove(); return; }
      const v = views.find(x => x.wrap === wrap), last = slots[slots.length - 1], sc = v.vp.scale, w = (last ? last.w : 110) * sc, h = (last ? last.h : 22) * sc, rc = wrap.getBoundingClientRect();
      Object.assign(ghost.style, { width: w + 'px', height: h + 'px', left: e.clientX - rc.left - w / 2 + 'px', top: e.clientY - rc.top - h / 2 + 'px' }); if (ghost.parentNode !== wrap) wrap.appendChild(ghost);
    });
    host.addEventListener('pointerleave', () => ghost.remove());
    drawList();
    let shown = false;
    const det = slots.slice(), ts = ed.querySelector('#snTpl');
    if (ts) ts.onchange = () => {
      if (ts.value === '') { slots.length = 0; (used ? [] : det).forEach(x => slots.push(x)); } else applyTpl(T[+ts.value], doc, slots);
      drawList(); if (shown) place(); toast(B(`${slots.length} خانة`, `${slots.length} boxes`));
    };
    const rb = ed.querySelector('#snRevBtn');
    rb.onclick = () => { const o = ed.querySelector('#snRev').hidden; ed.querySelector('#snRev').hidden = !o; rb.setAttribute('aria-expanded', o); if (o && !shown) { shown = true; show().then(() => { const x = host.querySelector('.sn-box'); (x || host).scrollIntoView({ behavior: 'smooth', block: 'center' }); }); } };
    const jb = ed.querySelector('#snJump'); if (jb) jb.onclick = () => { const x = host.querySelector('.sn-box'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    let rw = document.documentElement.clientWidth, rt; window.addEventListener('resize', () => { const w = document.documentElement.clientWidth; if (!shown || Math.abs(w - rw) < 40) return; rw = w; clearTimeout(rt); rt = setTimeout(show, 250); });
    ed.querySelector('#snCreate2').onclick = () => ed.querySelector('#snCreate').click();
    ed.querySelector('#snCreate').onclick = async ev => {
      const btn = ev.currentTarget; btn.disabled = true; btn.classList.add('busy');
      try {
        const j = await call({ a: 'create', title: ed.querySelector('#snTitle').value.trim() || title, pdf: b64(buf), slots: slots.map(s => ({ p: s.p, n: s.n.trim(), r: s.r || '', x: s.x, y: s.y, w: s.w, h: s.h })) });
        const keys = store.get('keys', {}); keys[j.id] = j.k; store.set('keys', keys);
        if (slots.length) {
          const t = { title: ed.querySelector('#snTitle').value.trim() || title, pages: doc.numPages, slots: slots.map(s => ({ pe: doc.numPages - 1 - s.p, n: s.n.trim(), r: s.r || '', x: s.x, y: s.y, w: s.w, h: s.h })) };
          const key = JSON.stringify(t.slots.map(s => [s.pe, Math.round(s.x), Math.round(s.y)]));
          store.set('tpl', [t].concat(tpls().filter(o => JSON.stringify(o.slots.map(s => [s.pe, Math.round(s.x), Math.round(s.y)])) !== key)).slice(0, 8));
        }
        location.href = '?s=' + j.id + '&new=1#k=' + j.k;
      } catch (e) { toast(errMsg(e), 1); btn.disabled = false; btn.classList.remove('busy'); }
    };
  }

  /* ---------- a signing session ---------- */
  async function sessionView(id) {
    const hk = (location.hash.match(/k=([a-f0-9]+)/) || [])[1];
    const keys = store.get('keys', {});
    if (hk) { keys[id] = hk; store.set('keys', keys); }
    const key = keys[id];
    const mine = store.get('mine.' + id, {});
    root.innerHTML = `<div class="sn-card sn-load">${B('جارٍ فتح المحضر…', 'Opening the minutes…')}</div>`;
    let S, doc, bytes;
    try {
      const [g, p] = await Promise.all([call({ a: 'get', id, k: key }), call({ a: 'pdf', id })]);
      S = g; bytes = unb64(p.pdf);
      doc = await pdfjsLib.getDocument({ data: bytes.slice(0), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true }).promise;
    } catch (e) { root.innerHTML = `<div class="sn-card"><p>${errMsg(e)}</p><p><a class="btn ghost" href="./">${B('محضر جديد', 'New minutes')}</a></p></div>`; return; }
    const admin = !!S.admin;
    const link = location.origin + location.pathname + '?s=' + id;
    root.innerHTML = `
      ${admin && /new=1/.test(location.search) ? `<div class="sn-card sn-share"><h2>${B('الرابط جاهز', 'The link is ready')}</h2>
        <p>${B('أرسل هذا الرابط في قروب الاجتماع، وكل عضو يوقّع في خانته:', 'Send this link to the meeting group; each member signs in their own box:')}</p>
        <div class="sn-link"><input type="text" readonly value="${link}" id="snLink"><button type="button" class="btn solid" id="snCopy">${B('نسخ', 'Copy')}</button>
        <a class="btn ghost" id="snWa" target="_blank" rel="noopener">${B('واتساب', 'WhatsApp')}</a></div>
        <p class="sn-fine">${B('أنت المنسق: تظهر لك أدوات الإدارة في هذا الجهاز. لإدارته من جهاز آخر احفظ رابط الإدارة:', 'You are the coordinator: management tools appear on this device. To manage from another device, keep the management link:')} <button type="button" class="sn-lnk" id="snAdminCopy">${B('نسخ رابط الإدارة', 'Copy management link')}</button></p></div>` : ''}
      <div class="sn-card sn-head">
        <h2 id="snT"></h2>
        <div class="sn-prog"><div class="sn-meter"><i id="snMeter"></i></div><p id="snCount"></p></div>
        <p class="sn-sc" id="snSc" hidden></p>
        <div class="sn-me" id="snMe" hidden></div>
        <p class="sn-tip" id="snTip">${B('للتوقيع: اضغط على خانتك أمام اسمك، أو على أي موضع في المحضر.', 'To sign, tap your box next to your name, or any spot in the minutes.')}</p>
        <div class="sn-names" id="snNames"></div>
        <div class="sn-acts">
          <button type="button" class="btn solid" id="snDl">${B('تحميل المحضر', 'Download the minutes')}</button>

          ${admin ? `<button type="button" class="btn ghost" id="snRemind">${B('نسخ رسالة تذكير', 'Copy a reminder')}</button>
          <button type="button" class="btn ghost" id="snLock"></button>
          <button type="button" class="btn ghost sn-danger" id="snDelete">${B('حذف المحضر', 'Delete')}</button>` : ''}
        </div>
      </div>
      <div class="sn-pages" id="snPagesHost"></div>`;
    const host = root.querySelector('#snPagesHost');
    let views = [];
    const copy = async (txt, okMsg) => { try { await navigator.clipboard.writeText(txt); toast(okMsg); } catch (e) { prompt('', txt); } };
    if (root.querySelector('#snCopy')) {
      root.querySelector('#snCopy').onclick = () => copy(link, B('نُسخ الرابط.', 'Link copied.'));
      root.querySelector('#snAdminCopy').onclick = () => copy(link + '#k=' + key, B('نُسخ رابط الإدارة. لا ترسله في القروب.', 'Management link copied. Do not share it with the group.'));
      root.querySelector('#snWa').href = 'https://wa.me/?text=' + encodeURIComponent((S.title ? S.title + '\n' : '') + (isAr() ? 'رابط توقيع المحضر: ' : 'Sign the minutes here: ') + link);
    }
    // a member who signed before on this device: offer their own box straight away
    const nk = x => snNorm(x || '').replace(/^(د|أ|ا|م|الدكتور|الأستاذ|الاستاذ|المهندس)\.?\s*/, '').replace(/\s(بن|بنت)\s/g, ' ').replace(/[^\u0621-\u064aA-Za-z ]/g, '').replace(/\s+/g, ' ').trim();
    function myBox() {
      const me = nk(store.get('me', '')); if (!me) return -1;
      const w = me.split(' '), first = w[0], last = w[w.length - 1];
      let best = -1, sc = 0;
      S.slots.forEach((x, i) => { if (x.free || x.gone) return; const t = nk(x.n).split(' '); if (!t[0]) return; let v = 0; if (t[0] === first) v += 2; if (t[t.length - 1] === last) v += 2; w.forEach(z => { if (t.includes(z)) v++; }); if (v > sc && v >= 5) { sc = v; best = i; } });
      return best;
    }
    function draw() {
      const base = S.slots.map((s, i) => [s, i]).filter(([s]) => !s.free && !s.gone), n = base.length, d = base.filter(([s]) => s.sig).length;
      root.querySelector('#snT').textContent = S.title || (isAr() ? 'محضر' : 'Minutes');
      root.querySelector('#snMeter').style.width = (n ? d / n * 100 : 0) + '%';
      root.querySelector('#snCount').innerHTML = S.locked ? B(`أُقفل المحضر · وقّع ${d} من ${n}`, `Locked · ${d} of ${n} signed`) : d === n ? B(`اكتملت التواقيع (${n})`, `All ${n} have signed`) : B(`وقّع ${d} من ${n}`, `${d} of ${n} signed`);
      root.querySelector('#snNames').innerHTML = base.map(([s, i]) => `<button type="button" class="sn-chip${s.sig ? ' done' : ''}${mine[i] ? ' mine' : ''}" data-i="${i}">${s.sig ? '✓ ' : ''}${esc(s.n || ((isAr() ? 'خانة ' : 'Box ') + (i + 1)))}</button>`).join('');
      root.querySelectorAll('.sn-chip').forEach(c => c.onclick = () => openBox(+c.dataset.i, true));
      const mb = myBox(), me = root.querySelector('#snMe');
      me.hidden = !(mb >= 0 && !S.slots[mb].sig && !S.locked);
      if (!me.hidden) { me.innerHTML = `<p>${B('خانتك:', 'Your box:')} <b><bdi>${esc(S.slots[mb].n)}</bdi></b></p><button type="button" class="btn solid">${B('وقّع الآن', 'Sign now')}</button>`; me.querySelector('button').onclick = () => openBox(mb, true); }
      const none = !n, signed = S.slots.filter(s => s.sig && !s.gone).length;
      root.querySelector('.sn-prog').hidden = none; root.querySelector('#snNames').hidden = none;
      root.querySelector('#snTip').hidden = !!S.locked;
      root.querySelector('#snTip').innerHTML = none ? B('للتوقيع: اضغط على الموضع الذي تريده في المحضر.', 'To sign, tap the spot you want in the minutes.') : B('للتوقيع: اضغط على خانتك أمام اسمك، أو على أي موضع في المحضر.', 'To sign, tap your box next to your name, or any spot in the minutes.');
      const sc = root.querySelector('#snSc'); sc.hidden = !none; sc.innerHTML = S.locked ? B(`أُقفل المحضر · ${signed} توقيع`, `Locked · ${signed} signatures`) : B(`عدد التواقيع حتى الآن: ${signed}`, `Signatures so far: ${signed}`);

      if (admin) root.querySelector('#snLock').innerHTML = S.locked ? B('فتح التوقيع', 'Reopen signing') : B('إقفال المحضر', 'Lock');
      placeBoxes(views, S.slots, { mine, onBox: (b, i) => { b.onclick = () => openBox(i); } });
    }
    function openBox(i, scroll) {
      const s = S.slots[i];
      const el = host.querySelector('.sn-box[data-i="' + i + '"]');
      if (scroll && el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (s.sig) {
        if ((mine[i] && !S.locked) || admin) return sheetManage(i);
        return toast(s.free ? B('توقيع أُضيف في هذا الموضع.', 'A signature added here.') : B('هذه الخانة موقّعة.', 'This box is already signed.'));
      }
      if (S.locked) return toast(ERR.locked, 1);
      sheetSign(i);
    }
    async function refresh() { try { const g = await call({ a: 'get', id, k: key }); S = g; draw(); } catch (e) {} }
    function getSig(title, onPng) {
      // several saved signatures per device (e.g. full signature and initials), newest first
      let saved = store.get('sigs', null); if (!saved) { const one = store.get('sig', null); saved = one ? [one] : []; store.set('sigs', saved); }
      const sh = sheet(`<h3>${title}</h3>
        ${saved.length ? `<p class="sn-st">${B('تواقيعي المحفوظة · اضغط لاستخدامه', 'My saved signatures · tap one to use it')}</p><div class="sn-sigs">${saved.map((x, k) => `<div class="sn-sg"><button type="button" class="sn-sgb" data-use="${k}"><img src="${x}" alt=""></button><button type="button" class="sn-sgx" data-rm="${k}" aria-label="remove">×</button></div>`).join('')}</div><p class="sn-or">${B('أو توقيع جديد', 'or a new signature')}</p>` : ''}
        <div class="sn-ink" role="radiogroup" aria-label="ink"><span>${B('لون الحبر', 'Ink')}</span>${Object.keys(INKS).map(k => `<button type="button" role="radio" data-ink="${k}" aria-checked="${store.get('ink', 'blue') === k}" style="--c:${INKS[k]}"><i></i>${k === 'blue' ? B('أزرق', 'Blue') : B('أسود', 'Black')}</button>`).join('')}</div>
        <div class="sn-ink sn-pen" role="radiogroup" aria-label="pen"><span>${B('القلم', 'Pen')}</span>${Object.keys(PENS).map(k => `<button type="button" role="radio" data-pen="${k}" aria-checked="${pen() === k}"><b style="height:${PENS[k].px}px"></b>${B(PENS[k].ar, PENS[k].en)}</button>`).join('')}</div>
        <div class="sn-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-t="draw">${B('ارسم', 'Draw')}</button><button type="button" role="tab" aria-selected="false" data-t="img">${B('صورة التوقيع', 'Photo of signature')}</button></div>
        <div class="sn-pad" data-p="draw"><canvas></canvas><button type="button" class="sn-lnk" data-act="clear">${B('مسح', 'Clear')}</button><p class="sn-hint">${B('وقّع بإصبعك داخل المربع', 'Sign with your finger inside the box')}</p></div>
        <div class="sn-img" data-p="img" hidden><input type="file" accept="image/*" hidden><button type="button" class="btn ghost" data-act="pick">${B('اختيار صورة', 'Choose a photo')}</button><p class="sn-hint">${B('صوّر توقيعك على ورقة بيضاء؛ تُزال الخلفية تلقائيًا.', 'Photograph your signature on white paper; the background is removed automatically.')}</p><canvas hidden></canvas></div>
        <label class="sn-keep"><input type="checkbox" checked> ${B('احفظ توقيعي في هذا الجهاز للمرات القادمة', 'Keep my signature on this device for next time')}</label>
        <div class="sn-sb"><button type="button" class="btn solid" data-act="ok">${B('اعتماد التوقيع', 'Confirm signature')}</button><button type="button" class="btn ghost" data-act="x">${B('إلغاء', 'Cancel')}</button></div>`);
      const pad = makePad(sh.querySelector('.sn-pad canvas'));
      sh.querySelectorAll('[data-ink]').forEach(bt => bt.onclick = async () => {
        store.set('ink', bt.dataset.ink); sh.querySelectorAll('[data-ink]').forEach(x => x.setAttribute('aria-checked', x === bt)); pad.color();
        if (img) { img = await recolor(img); const im = new Image(); im.onload = () => { ic.getContext('2d').clearRect(0, 0, ic.width, ic.height); ic.getContext('2d').drawImage(im, 0, 0); }; im.src = img; }
      });
      sh.querySelectorAll('[data-pen]').forEach(bt => bt.onclick = () => { store.set('pen', bt.dataset.pen); sh.querySelectorAll('[data-pen]').forEach(x => x.setAttribute('aria-checked', x === bt)); });
      let img = null, tab = 'draw';
      sh.querySelectorAll('[role=tab]').forEach(t => t.onclick = () => { tab = t.dataset.t; sh.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', x === t)); sh.querySelector('[data-p=draw]').hidden = tab !== 'draw'; sh.querySelector('[data-p=img]').hidden = tab !== 'img'; if (tab === 'draw') pad.fit(); });
      const fi = sh.querySelector('.sn-img input'), ic = sh.querySelector('.sn-img canvas');
      sh.querySelector('[data-act=pick]').onclick = () => fi.click();
      fi.onchange = async () => { if (!fi.files[0]) return; img = await cleanPhoto(fi.files[0]); if (img) img = await recolor(img); if (img) { const im = new Image(); im.onload = () => { ic.width = im.width; ic.height = im.height; ic.getContext('2d').drawImage(im, 0, 0); ic.hidden = false; }; im.src = img; } };
      sh.querySelector('[data-act=clear]').onclick = () => pad.clear();
      const go = async (png, fromSaved) => {
        if (!png) { toast(B('لم يُرسم توقيع بعد.', 'No signature yet.'), 1); return; }
        png = await recolor(png);
        if (!fromSaved && sh.querySelector('.sn-keep input').checked && !saved.includes(png)) { saved = [png].concat(saved).slice(0, 4); store.set('sigs', saved); }
        sh.classList.add('busy');
        try { await onPng(png); } catch (e) { sh.classList.remove('busy'); }
      };
      sh.querySelectorAll('[data-use]').forEach(x => x.onclick = () => go(x.querySelector('img').getAttribute('src'), true));
      sh.querySelectorAll('[data-rm]').forEach(x => x.onclick = () => { const src = x.parentNode.querySelector('img').getAttribute('src'); saved = saved.filter(z => z !== src); store.set('sigs', saved); x.parentNode.remove(); if (!saved.length) sh.querySelectorAll('.sn-st,.sn-sigs,.sn-or').forEach(e => e.remove()); });
      sh.querySelector('[data-act=ok]').onclick = () => go(tab === 'draw' ? pad.png() : img);
      sh.querySelector('[data-act=x]').onclick = close;
    }
    // tap your box (or any spot) -> sign -> adjust size/position -> save
    function sheetSign(i) {
      const s = S.slots[i];
      getSig(B('التوقيع', 'Sign') + (s.n ? ' · <bdi>' + esc(s.n) + '</bdi>' : ''), async png => { close(); previewSlot(i, png); });
    }
    /* adjusting a signature: one pending element kept in PDF coordinates, so zooming or re-rendering never loses it */
    let Z = 1, pend = null;
    const viewOf = pi => views.find(v => v.pi === pi);
    function modeBar(html) { document.querySelectorAll('.sn-mode').forEach(x => x.remove()); const m = document.createElement('div'); m.className = 'sn-mode'; m.innerHTML = html; document.body.appendChild(m); return m; }
    // leaving adjust mode always returns to the whole-page view, scrolled to the page that was being signed
    function endMode() {
      const pi = pend && pend.pi; pend = null;
      document.querySelectorAll('.sn-mode,.sn-box.pending').forEach(x => x.remove()); host.querySelectorAll('.sn-box').forEach(x => x.style.visibility = '');
      if (Z !== 1) { Z = 1; rerender().then(() => { const v = pi != null && viewOf(pi); if (v) v.wrap.scrollIntoView({ block: 'center' }); }); }
    }
    function mountPending() {
      const v = viewOf(pend.pi); if (!v) return null;
      host.querySelectorAll('.sn-box.pending').forEach(x => x.remove());
      if (pend.hide != null) { const el = host.querySelector('.sn-box[data-i="' + pend.hide + '"]'); if (el) el.style.visibility = 'hidden'; }
      const r = rectOf(v.vp, pend.rect), b = document.createElement('div');
      b.className = 'sn-box done pending' + (pend.cls ? ' ' + pend.cls : '');
      Object.assign(b.style, { left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px' });
      const im = new Image(); im.src = pend.png; im.alt = ''; b.appendChild(im); b.insertAdjacentHTML('beforeend', '<i class="sn-rz" aria-hidden="true"></i>');
      v.wrap.appendChild(b); pend.b = b; pend.v = v;
      draggable(b, () => { if (pend) pend.rect = pdfRect(v, b); }, pend.ratio);
      return b;
    }
    async function rerender() {
      if (pend && pend.b) pend.rect = pdfRect(pend.v, pend.b);
      views = await renderPages(doc, host, S.slots, { mine }, Z); draw();
      if (pend) { const b = mountPending(); if (b) b.scrollIntoView({ block: 'center', inline: 'center' }); }
      document.querySelectorAll('.sn-zoom span').forEach(x => x.textContent = Math.round(Z * 100) + '%');
    }
    const ZS = [1, 1.5, 2, 3];
    async function zoom(d) { const k = Math.max(0, Math.min(ZS.length - 1, ZS.indexOf(Z) + d)); if (ZS[k] === Z) return; Z = ZS[k]; await rerender(); }
    const ADJ = B('كبّر الصفحة أو صغّرها من الزرين، وعدّل حجم التوقيع من الزاوية واسحبه إلى موضعه، ثم احفظ.', 'Zoom the page with the buttons, resize the signature from the corner and drag it into place, then save.');
    async function startAdjust(state, onSave) {
      pend = state;
      const m = modeBar(`<p>${ADJ}</p><div class="sn-zoom"><button type="button" data-z="-1" aria-label="zoom out">−</button><span>${Math.round(Z * 100)}%</span><button type="button" data-z="1" aria-label="zoom in">+</button></div><div class="sn-sb"><button type="button" class="btn solid" data-ok>${B('حفظ', 'Save')}</button><button type="button" class="btn ghost" data-x>${B('خروج', 'Exit')}</button></div>`);
      m.querySelectorAll('[data-z]').forEach(bt => bt.onclick = () => zoom(+bt.dataset.z));
      m.querySelector('[data-x]').onclick = endMode;
      m.querySelector('[data-ok]').onclick = async ev => {
        const btn = ev.currentTarget; btn.disabled = true;
        if (pend.b) pend.rect = pdfRect(pend.v, pend.b);
        try { await onSave(pend.rect); } catch (e) { btn.disabled = false; toast(errMsg(e), 1); if (e.code === 'taken') { endMode(); refresh(); } }
      };
      if (document.documentElement.clientWidth < 700 && Z < 2) { Z = 2; await rerender(); }
      else { const b = mountPending(); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }
    }
    function previewSlot(i, png) {
      const s = S.slots[i], r0 = { x: s.x, y: s.y, w: s.w, h: s.h };
      startAdjust({ pi: s.p, rect: Object.assign({}, r0), png, cls: 'slot', ratio: false, hide: i }, async r => {
        const moved = ['x', 'y', 'w', 'h'].some(k => Math.abs(r[k] - r0[k]) > .8);
        let j = await call({ a: 'sign', id, i, png: await fitSig(png) }); mine[i] = j.tok; store.set('mine.' + id, mine); if (s.n) store.set('me', s.n);
        if (moved) j = await call(Object.assign({ a: 'move', id, i, tok: mine[i] }, r));
        S = j; endMode(); draw(); toast(B('تم توقيعك. شكرًا لك.', 'Signed. Thank you.'));
      });
    }
    host.addEventListener('click', e => {
      if (e.target.closest('.sn-box') || document.querySelector('.sn-mode') || S.locked) return;
      const wrap = e.target.closest('.sn-page'); if (!wrap) return;
      const v = views.find(v => v.wrap === wrap), rc = wrap.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
      getSig(B('توقيع في هذا الموضع', 'Sign at this spot'), async png => { close(); preview(v, x, y, png); });
    });
    function preview(v, x, y, png) {
      const im = new Image();
      im.onload = () => {
        const wp = Math.min(170, v.wrap.clientWidth * .32) / v.vp.scale, hp = wp * im.height / im.width, pt = v.vp.convertToPdfPoint(x, y);
        startAdjust({ pi: v.pi, rect: { x: pt[0] - wp / 2, y: pt[1] - hp / 2, w: wp, h: hp }, png, cls: 'free', ratio: true }, async r => {
          const j = await call(Object.assign({ a: 'place', id, p: v.pi, png: await fitSig(png), n: store.get('me', '') }, r)); mine[j.i] = j.tok; store.set('mine.' + id, mine);
          S = j; endMode(); draw(); toast(B('أُضيف توقيعك.', 'Your signature was added.'));
        });
      };
      im.src = png;
    }
    // a signed box: its signer (same device) or the coordinator can move/resize it; signer withdraws, coordinator clears
    function sheetSigned(i) { sheetManage(i); }
    function sheetAdmin(i) { sheetManage(i); }
    function sheetManage(i) {
      const s = S.slots[i], own = !!mine[i] && !S.locked;
      const sh = sheet(`<h3>${own ? B('توقيعك', 'Your signature') : esc(s.n || '') || B('توقيع', 'Signature')}</h3><div class="sn-saved"><img src="${s.sig}" alt=""></div>${admin && s.t ? `<p class="sn-hint">${new Date(s.t).toLocaleString(isAr() ? 'ar-SA-u-nu-latn' : 'en-GB')}</p>` : ''}
        <div class="sn-sb sn-sb3"><button type="button" class="btn ghost" data-act="mv">${B('تعديل الموضع أو الحجم', 'Move or resize')}</button>
        ${own ? `<button type="button" class="btn ghost sn-danger" data-act="un">${B('سحب توقيعي', 'Withdraw my signature')}</button>` : `<button type="button" class="btn ghost sn-danger" data-act="cl">${B('حذف هذا التوقيع', 'Delete this signature')}</button>`}
        <button type="button" class="btn ghost" data-act="x">${B('إغلاق', 'Close')}</button></div>`);
      sh.querySelector('[data-act=x]').onclick = close;
      const un = sh.querySelector('[data-act=un]'); if (un) un.onclick = async () => { try { S = await call({ a: 'unsign', id, i, tok: mine[i] }); delete mine[i]; store.set('mine.' + id, mine); close(); draw(); } catch (e) { toast(errMsg(e), 1); } };
      const cl = sh.querySelector('[data-act=cl]'); if (cl) cl.onclick = async () => { try { S = await call({ a: 'clear', id, k: key, i }); close(); draw(); } catch (e) { toast(errMsg(e), 1); } };
      sh.querySelector('[data-act=mv]').onclick = () => { close(); moveBox(i); };
    }
    function moveBox(i) {
      const s = S.slots[i];
      startAdjust({ pi: s.p, rect: { x: s.x, y: s.y, w: s.w, h: s.h }, png: s.sig, cls: s.free ? 'free' : 'slot', ratio: !!s.free, hide: i }, async r => {
        S = await call(Object.assign({ a: 'move', id, i, k: key, tok: mine[i] }, r)); endMode(); draw(); toast(B('حُفظ الموضع.', 'Position saved.'));
      });
    }
    root.querySelector('#snDl').onclick = async ev => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        const pg = pdf.getPages();
        for (const s of S.slots) {
          if (!s.sig || s.gone || !pg[s.p]) continue;
          // a signature may rise a little above and below its row, as a hand signature would (boxes only)
          const H = s.free ? s.h : s.h * 1.8, im = await pdf.embedPng(s.sig), k = Math.min(s.w / im.width, H / im.height), w = im.width * k, h = im.height * k;
          pg[s.p].drawImage(im, { x: s.x + (s.w - w) / 2, y: s.y + (s.h - h) / 2, width: w, height: h });
        }
        const out = await pdf.save();
        const name = (S.title || 'minutes').replace(/[\\/:*?"<>|]+/g, ' ').trim() + (S.slots.every(s => s.sig || s.free || s.gone) ? (isAr() ? ' - موقّع' : ' - signed') : '') + '.pdf';
        const file = new File([out], name, { type: 'application/pdf' });
        const save = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
        // phones: the system share sheet (WhatsApp, Files, Mail…) with a real PDF file
        const canShare = navigator.canShare && navigator.canShare({ files: [file] }) && /iP(hone|ad|od)|Android/i.test(navigator.userAgent);
        if (canShare) {
          const share = () => navigator.share({ files: [file], title: name }).catch(e => { if (e.name === 'NotAllowedError') ask(); });
          const ask = () => { const sh = sheet(`<h3>${B('المحضر جاهز', 'The minutes are ready')}</h3><p class="sn-hint"><bdi>${esc(name)}</bdi></p><div class="sn-sb"><button type="button" class="btn solid" data-act="sh">${B('مشاركة أو حفظ الملف', 'Share or save the file')}</button><button type="button" class="btn ghost" data-act="x">${B('إغلاق', 'Close')}</button></div>`); sh.querySelector('[data-act=sh]').onclick = () => { close(); navigator.share({ files: [file], title: name }).catch(() => {}); }; sh.querySelector('[data-act=x]').onclick = close; };
          share();
        } else save();
      } catch (e) { toast(B('تعذّر إنشاء الملف.', 'The file could not be created.'), 1); }
      btn.disabled = false;
    };
    if (admin) {
      root.querySelector('#snRemind').onclick = () => {
        const left = S.slots.filter(s => !s.sig && !s.free && !s.gone).map(s => '• ' + (s.n || ''));
        const t = isAr() ? `نأمل التكرم بتوقيع ${S.title || 'المحضر'}:\n${link}\n\nلم يوقّع بعد:\n${left.join('\n')}` : `Please sign ${S.title || 'the minutes'}:\n${link}\n\nNot yet signed:\n${left.join('\n')}`;
        copy(t, B('نُسخت رسالة التذكير.', 'Reminder copied.'));
      };
      root.querySelector('#snLock').onclick = async () => { try { S = await call({ a: 'lock', id, k: key, on: !S.locked }); draw(); } catch (e) { toast(errMsg(e), 1); } };
      root.querySelector('#snDelete').onclick = () => {
        const sh = sheet(`<h3>${B('حذف المحضر نهائيًا؟', 'Delete these minutes for good?')}</h3><p>${B('حمّل نسختك الموقّعة أولًا. بعد الحذف لن يعمل الرابط لأحد.', 'Download your signed copy first. After deletion the link stops working for everyone.')}</p>
          <div class="sn-sb"><button type="button" class="btn sn-danger" data-act="del">${B('حذف', 'Delete')}</button><button type="button" class="btn ghost" data-act="x">${B('إلغاء', 'Cancel')}</button></div>`);
        sh.querySelector('[data-act=x]').onclick = close;
        sh.querySelector('[data-act=del]').onclick = async () => { try { await call({ a: 'delete', id, k: key }); delete keys[id]; store.set('keys', keys); store.del('mine.' + id); location.href = './'; } catch (e) { toast(errMsg(e), 1); } };
      };
    }
    views = await renderPages(doc, host, S.slots, { mine });
    draw();
    let rw = document.documentElement.clientWidth, rt; window.addEventListener('resize', () => { const w = document.documentElement.clientWidth; if (Math.abs(w - rw) < 40) return; rw = w; clearTimeout(rt); rt = setTimeout(rerender, 250); });
    setInterval(() => { if (!document.hidden && !document.querySelector('.sn-sheet,.sn-mode')) refresh(); }, 15000);
  }

  /* ---------- bottom sheet ---------- */
  function sheet(html) {
    close();
    const bg = document.createElement('div'); bg.className = 'sn-bg';
    const sh = document.createElement('div'); sh.className = 'sn-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.innerHTML = html;
    bg.onclick = close; document.body.appendChild(bg); document.body.appendChild(sh);
    requestAnimationFrame(() => { bg.classList.add('on'); sh.classList.add('on'); });
    document.documentElement.classList.add('sn-lockscroll');
    return sh;
  }
  function close() { document.querySelectorAll('.sn-bg,.sn-sheet').forEach(x => x.remove()); document.documentElement.classList.remove('sn-lockscroll'); }

  // the server takes signatures up to 250 KB: larger images are scaled down until they fit
  function fitSig(png) {
    return new Promise(res => { if (png.length < 230000) { res(png); return; }
      const im = new Image(); im.onload = () => { let w = im.width, h = im.height, out = png;
        while (out.length >= 230000 && w > 60) { w = Math.round(w * .8); h = Math.round(h * .8); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); out = c.toDataURL('image/png'); }
        res(out); }; im.onerror = () => res(png); im.src = png; });
  }
  /* ---------- ink colour (blue or black), remembered per device ---------- */
  const INKS = { blue: '#1d3a8f', black: '#111111' };
  const ink = () => INKS[store.get('ink', 'blue')] || INKS.blue;
  const PENS = { thin: { k: 1, px: 1.5, ar: 'رفيع', en: 'Fine' }, mid: { k: 1.6, px: 2.5, ar: 'متوسط', en: 'Medium' }, thick: { k: 2.3, px: 4, ar: 'عريض', en: 'Bold' } };
  const pen = () => PENS[store.get('pen', 'mid')] ? store.get('pen', 'mid') : 'mid';
  function recolor(png) {
    return new Promise(res => { const im = new Image(); im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
      x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = ink(); x.fillRect(0, 0, c.width, c.height);
      res(c.toDataURL('image/png')); }; im.onerror = () => res(png); im.src = png; });
  }
  /* ---------- signature pad ---------- */
  function makePad(cv) {
    const ctx = cv.getContext('2d'); let pts = [], drawn = false, down = false;
    function fit() { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (!r.width) return; const old = drawn ? cv.toDataURL() : null; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = ink(); if (old) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = old; } }
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp, p: e.pressure || .5 }; };
    cv.addEventListener('pointerdown', e => { down = true; lw = 2.4 * PENS[pen()].k; cv.setPointerCapture(e.pointerId); pts = [pos(e)]; e.preventDefault(); });
    let lw = 2.4;
    cv.addEventListener('pointermove', e => {
      if (!down) return;
      const evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
      for (const ev of evs) {
        const p = pos(ev), a = pts[pts.length - 1];
        if (Math.hypot(p.x - a.x, p.y - a.y) < .6) continue;
        pts.push(p);
        const v = Math.hypot(p.x - a.x, p.y - a.y) / Math.max(1, p.t - a.t);
        const K = PENS[pen()].k; lw = lw * .75 + Math.max(1.5, Math.min(3, 3 - v * .6)) * K * .25; ctx.lineWidth = lw;
        if (pts.length > 2) { const b = pts[pts.length - 3], m1 = { x: (b.x + a.x) / 2, y: (b.y + a.y) / 2 }, m2 = { x: (a.x + p.x) / 2, y: (a.y + p.y) / 2 }; ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(a.x, a.y, m2.x, m2.y); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        drawn = true;
      }
      e.preventDefault();
    });
    const up = () => { down = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    requestAnimationFrame(fit);
    return { fit, color() { if (!drawn) { ctx.strokeStyle = ink(); return; } ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = ink(); ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore(); ctx.strokeStyle = ink(); }, clear() { ctx.clearRect(0, 0, cv.width, cv.height); drawn = false; }, png() { return drawn ? trim(cv) : null; } };
  }
  function trim(cv) {
    const ctx = cv.getContext('2d'), { width: w, height: h } = cv, d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const k = Math.min(1, 640 / (x1 - x0 + 1)), o = document.createElement('canvas');
    o.width = Math.round((x1 - x0 + 1) * k); o.height = Math.round((y1 - y0 + 1) * k);
    o.getContext('2d').drawImage(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }
  function cleanPhoto(file) {
    return new Promise(res => {
      const im = new Image(); im.onload = () => {
        const k = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
        const id = x.getImageData(0, 0, c.width, c.height), d = id.data, hist = new Array(256).fill(0), L = new Uint8Array(d.length / 4);
        for (let i = 0; i < L.length; i++) { L[i] = Math.round(.299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]); hist[L[i]]++; }
        let sum = 0, sB = 0, wB = 0, mx = 0, th = 140; for (let t = 0; t < 256; t++) sum += t * hist[t];
        for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = L.length - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > mx) { mx = v; th = t; } }
        th = Math.min(th, 185);
        for (let i = 0; i < L.length; i++) { if (L[i] > th) d[i * 4 + 3] = 0; else { const a = Math.min(255, Math.round((th - L[i]) / th * 255 * 1.6)); d[i * 4] = 0; d[i * 4 + 1] = 0; d[i * 4 + 2] = 0; d[i * 4 + 3] = a; } }
        x.putImageData(id, 0, 0); URL.revokeObjectURL(im.src); res(trim(c));
      };
      im.onerror = () => res(null); im.src = URL.createObjectURL(file);
    });
  }

  const sid = new URLSearchParams(location.search).get('s');
  if (sid && /^[a-f0-9]{20}$/.test(sid)) sessionView(sid); else createView();
})();

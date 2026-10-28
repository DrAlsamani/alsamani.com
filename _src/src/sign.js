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
  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok) { const e = new Error(j.error || 'error'); e.code = j.error; throw e; }
    return j;
  }
  const ERR = {
    taken: B('سبقك أحد إلى التوقيع في هذه الخانة. حدّث الصفحة وتأكد من خانتك.', 'Someone has already signed in this box. Refresh and check your box.'),
    locked: B('أُقفل المحضر، ولم يعد التوقيع متاحًا.', 'The minutes are locked; signing is closed.'),
    not_found: B('لم يُعثر على المحضر. ربما حُذف أو انتهت مدته.', 'These minutes were not found. They may have been deleted or expired.'),
    bad_pdf: B('الملف غير صالح أو أكبر من ١٠ ميجابايت.', 'The file is invalid or larger than 10 MB.'),
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
  async function renderPages(doc, host, slots, opts) {
    host.innerHTML = '';
    const out = [], W = Math.min(host.clientWidth || 600, 900), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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
    let mode = null, sx, sy, r0;
    b.addEventListener('pointerdown', e => {
      if (e.target.closest('.sn-bx')) return;
      mode = e.target.classList.contains('sn-rz') ? 'rz' : 'mv'; sx = e.clientX; sy = e.clientY;
      r0 = { l: b.offsetLeft, t: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
      b.setPointerCapture(e.pointerId); e.preventDefault();
    });
    b.addEventListener('pointermove', e => {
      if (!mode) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (mode === 'mv') { b.style.left = r0.l + dx + 'px'; b.style.top = r0.t + dy + 'px'; return; }
      let w = Math.max(30, r0.w + (isAr() ? -dx : dx)), h = keepRatio ? w * r0.h / r0.w : Math.max(14, r0.h + dy);
      b.style.width = w + 'px'; b.style.height = h + 'px'; if (isAr()) b.style.left = r0.l + r0.w - w + 'px';
    });
    const up = () => { if (!mode) return; mode = null; onEnd && onEnd(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
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
        b.innerHTML = '<span class="sn-bn">' + (i + 1) + '</span><i class="sn-rz" aria-hidden="true"></i><button type="button" class="sn-bx" aria-label="remove">×</button>';
        b.title = s.n || '';
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

  function editor(doc, buf, slots, title) {
    const ed = root.querySelector('#snEdit'); ed.hidden = false;
    const found = slots.length;
    ed.innerHTML = `
      <div class="sn-card">
        <p class="sn-step">${B('٢', '2')}</p>
        <h2>${B('إنشاء الرابط', 'Create the link')}</h2>
        <label class="sn-lbl">${B('عنوان المحضر', 'Title')}<input type="text" id="snTitle" maxlength="200" value="${esc(title)}"></label>
        <p class="sn-found">${found ? B(`حددت الأداة ${found} خانة توقيع أمام الأسماء، وستظهر للأعضاء جاهزة. ويستطيع أي عضو أيضًا التوقيع في الموضع الذي يختاره.`, `The tool marked ${found} signature boxes next to the names; members will see them ready. Any member can also sign wherever they choose.`) : B('لم تُحدَّد خانات توقيع تلقائيًا، ولا بأس: يضع كل عضو توقيعه في الموضع الذي يختاره من المحضر.', 'No signature boxes were detected, which is fine: each member places their signature wherever they choose.')}</p>
        <div class="sn-two"><button type="button" class="btn solid" id="snCreate">${B('إنشاء الرابط الآن', 'Create the link now')}</button>
        <button type="button" class="btn ghost" id="snRevBtn" aria-expanded="false">${found ? B('مراجعة الخانات أولًا', 'Review the boxes first') : B('تحديد الخانات بنفسي', 'Mark the boxes myself')}</button></div>
      </div>
      <div id="snRev" hidden>
      <div class="sn-card">
        <p>${B('اسحب أي خانة لتعديل موضعها، أو احذفها بعلامة ×، أو أضف خانة ثم اضغط على موضعها في الصفحة.', 'Drag a box to adjust it, remove it with ×, or add a box and tap where it goes on the page.')}</p>
        <details class="sn-det"${found ? '' : ' open'}><summary>${B('أسماء الأعضاء', 'Member names')} <b id="snNc"></b></summary><ol class="sn-list" id="snList"></ol></details>
        <div class="sn-tools"><button type="button" class="btn ghost" id="snAdd" aria-pressed="false">${B('إضافة خانة', 'Add a box')}</button>
        ${found ? `<button type="button" class="sn-lnk" id="snJump">${B('الانتقال إلى جدول التواقيع', 'Go to the signature table')}</button>` : ''}</div>
      </div>
      <div class="sn-pages" id="snPagesHost"></div>
      <div class="sn-bar"><button type="button" class="btn solid" id="snCreate2">${B('إنشاء رابط التوقيع', 'Create the signing link')}</button></div>
      </div>`;
    const host = ed.querySelector('#snPagesHost');
    let views = [], adding = false;
    const list = ed.querySelector('#snList');
    function drawList() {
      ed.querySelector('#snNc').textContent = '(' + slots.length + ')';
      list.innerHTML = slots.map((s, i) => `<li><span class="sn-n">${i + 1}</span><input type="text" value="${esc(s.n)}" data-i="${i}" placeholder="${isAr() ? 'الاسم' : 'Name'}" maxlength="120"><button type="button" class="sn-del" data-i="${i}" aria-label="remove">×</button></li>`).join('');
      list.querySelectorAll('input').forEach(inp => inp.oninput = () => { slots[+inp.dataset.i].n = inp.value; });
      list.querySelectorAll('.sn-del').forEach(b => b.onclick = () => { slots.splice(+b.dataset.i, 1); drawList(); place(); });
    }
    function place() {
      placeBoxes(views, slots, { edit: 1, onBox: (b, i, v) => {
        b.querySelector('.sn-bx').onclick = e => { e.stopPropagation(); slots.splice(i, 1); drawList(); place(); };
        draggable(b, () => Object.assign(slots[i], pdfRect(v, b)));
      } });
    }
    async function show() {
      views = await renderPages(doc, host, slots, { edit: 1 });
      place();
      views.forEach(v => v.wrap.addEventListener('click', e => {
        if (!adding || e.target.closest('.sn-box')) return;
        const rc = v.wrap.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
        const last = slots[slots.length - 1], w = last ? last.w : 110, h = last ? last.h : 30;
        const pt = v.vp.convertToPdfPoint(x, y);
        slots.push({ p: v.pi, n: '', r: '', x: pt[0] - w / 2, y: pt[1] - h / 2, w, h });
        drawList(); place();
        const inp = list.querySelector('li:last-child input'); if (inp) inp.focus({ preventScroll: true });
      }));
    }
    const add = ed.querySelector('#snAdd');
    add.onclick = () => { adding = !adding; add.setAttribute('aria-pressed', adding); host.classList.toggle('adding', adding); };
    drawList();
    let shown = false;
    const rb = ed.querySelector('#snRevBtn');
    rb.onclick = () => { const o = ed.querySelector('#snRev').hidden; ed.querySelector('#snRev').hidden = !o; rb.setAttribute('aria-expanded', o); if (o && !shown) { shown = true; show().then(() => { const x = host.querySelector('.sn-box'); (x || host).scrollIntoView({ behavior: 'smooth', block: 'center' }); }); } };
    const jb = ed.querySelector('#snJump'); if (jb) jb.onclick = () => { const x = host.querySelector('.sn-box'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    let rw = window.innerWidth, rt; window.addEventListener('resize', () => { if (!shown || Math.abs(window.innerWidth - rw) < 40) return; rw = window.innerWidth; clearTimeout(rt); rt = setTimeout(show, 250); });
    ed.querySelector('#snCreate2').onclick = () => ed.querySelector('#snCreate').click();
    ed.querySelector('#snCreate').onclick = async ev => {
      const btn = ev.currentTarget; btn.disabled = true; btn.classList.add('busy');
      try {
        const j = await call({ a: 'create', title: ed.querySelector('#snTitle').value.trim() || title, pdf: b64(buf), slots: slots.map(s => ({ p: s.p, n: s.n.trim(), r: s.r || '', x: s.x, y: s.y, w: s.w, h: s.h })) });
        const keys = store.get('keys', {}); keys[j.id] = j.k; store.set('keys', keys);
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
        <div class="sn-names" id="snNames"></div>
        <div class="sn-acts">
          <button type="button" class="btn solid" id="snDl">${B('تحميل المحضر', 'Download the minutes')}</button>
          <button type="button" class="btn ghost" id="snFree">${B('توقيع في موضع آخر', 'Sign somewhere else')}</button>
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
      root.querySelector('#snFree').hidden = !!S.locked;
      root.querySelector('#snFree').className = 'btn ' + (none ? 'solid' : 'ghost');
      root.querySelector('#snFree').innerHTML = none ? B('أضف توقيعك', 'Add your signature') : B('توقيع في موضع آخر', 'Sign somewhere else');
      root.querySelector('#snDl').className = 'btn ' + (none ? 'ghost' : 'solid');
      const sc = root.querySelector('#snSc'); sc.hidden = !none; sc.innerHTML = S.locked ? B(`أُقفل المحضر · ${signed} توقيع`, `Locked · ${signed} signatures`) : B(`عدد التواقيع حتى الآن: ${signed}`, `Signatures so far: ${signed}`);
      root.querySelector('#snFree').style.order = none ? -1 : 0;
      const fab = document.getElementById('snFab'); if (fab) { fab.dataset.on = none && !S.locked ? '1' : ''; fab.hidden = !fab.dataset.on || fab.dataset.near === '1'; }
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
    function sheetSign(i) {
      const s = S.slots[i];
      getSig(B('التوقيع', 'Sign') + (s.n ? ' · <bdi>' + esc(s.n) + '</bdi>' : ''), async png => {
        try { const j = await call({ a: 'sign', id, i, png }); mine[i] = j.tok; store.set('mine.' + id, mine); if (s.n) store.set('me', s.n); S = j; close(); draw(); toast(B('تم توقيعك. شكرًا لك.', 'Signed. Thank you.')); }
        catch (e) { toast(errMsg(e), 1); if (e.code === 'taken') { close(); refresh(); } throw e; }
      });
    }
    /* a signature anywhere on the document: tap a spot, sign, then move or resize before fixing it */
    let placing = false;
    function modeBar(html) {
      endMode(); const m = document.createElement('div'); m.className = 'sn-mode'; m.innerHTML = html; document.body.appendChild(m); return m;
    }
    function endMode() { placing = false; host.classList.remove('adding'); document.querySelectorAll('.sn-mode,.sn-box.pending').forEach(x => x.remove()); }
    root.querySelector('#snFree').onclick = () => {
      if (S.locked) return toast(ERR.locked, 1);
      const m = modeBar(`<p>${B('اضغط على الموضع الذي تريد التوقيع فيه في المحضر.', 'Tap the spot in the minutes where you want to sign.')}</p><button type="button" class="btn ghost" data-x>${B('إلغاء', 'Cancel')}</button>`);
      m.querySelector('[data-x]').onclick = endMode;
      placing = true; host.classList.add('adding');
    };
    host.addEventListener('click', e => {
      if (!placing || e.target.closest('.sn-box')) return;
      const wrap = e.target.closest('.sn-page'); if (!wrap) return;
      const v = views.find(v => v.wrap === wrap), rc = wrap.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
      endMode();
      getSig(B('توقيع في هذا الموضع', 'Sign at this spot'), async png => { close(); preview(v, x, y, png); });
    });
    function preview(v, x, y, png) {
      const im = new Image();
      im.onload = () => {
        const w = Math.min(170, v.wrap.clientWidth * .32), h = w * im.height / im.width;
        const m = modeBar(`<p>${B('اسحب التوقيع إلى موضعه، وكبّره أو صغّره من الزاوية.', 'Drag the signature into place; resize it from the corner.')}</p><div class="sn-sb"><button type="button" class="btn solid" data-ok>${B('تثبيت التوقيع', 'Fix the signature')}</button><button type="button" class="btn ghost" data-x>${B('إلغاء', 'Cancel')}</button></div>`);
        const b = document.createElement('div'); b.className = 'sn-box free done pending';
        Object.assign(b.style, { left: x - w / 2 + 'px', top: y - h / 2 + 'px', width: w + 'px', height: h + 'px' });
        b.innerHTML = '<i class="sn-rz" aria-hidden="true"></i>'; b.prepend(im); v.wrap.appendChild(b);
        draggable(b, null, true);
        m.querySelector('[data-x]').onclick = endMode;
        m.querySelector('[data-ok]').onclick = async ev => {
          const btn = ev.currentTarget; btn.disabled = true;
          const r = pdfRect(v, b);
          try { const j = await call(Object.assign({ a: 'place', id, p: v.pi, png, n: store.get('me', '') }, r)); mine[j.i] = j.tok; store.set('mine.' + id, mine); S = j; endMode(); draw(); toast(B('أُضيف توقيعك.', 'Your signature was added.')); }
          catch (e) { btn.disabled = false; toast(errMsg(e), 1); }
        };
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
      const s = S.slots[i], v = views.find(v => v.pi === s.p), el = host.querySelector('.sn-box[data-i="' + i + '"]');
      if (!v || !el) return;
      const b = document.createElement('div'); b.className = 'sn-box done pending';
      ['left', 'top', 'width', 'height'].forEach(k => b.style[k] = el.style[k]);
      const im = new Image(); im.src = s.sig; b.appendChild(im); b.insertAdjacentHTML('beforeend', '<i class="sn-rz" aria-hidden="true"></i>');
      const m = modeBar(`<p>${B('اسحب التوقيع إلى موضعه، وكبّره أو صغّره من الزاوية.', 'Drag the signature into place; resize it from the corner.')}</p><div class="sn-sb"><button type="button" class="btn solid" data-ok>${B('حفظ', 'Save')}</button><button type="button" class="btn ghost" data-x>${B('إلغاء', 'Cancel')}</button></div>`);
      el.style.visibility = 'hidden'; v.wrap.appendChild(b); b.scrollIntoView({ behavior: 'smooth', block: 'center' });
      draggable(b, null, !!s.free);
      const done = () => { el.style.visibility = ''; endMode(); };
      m.querySelector('[data-x]').onclick = done;
      m.querySelector('[data-ok]').onclick = async ev => {
        const btn = ev.currentTarget; btn.disabled = true;
        try { S = await call(Object.assign({ a: 'move', id, i, k: key, tok: mine[i] }, pdfRect(v, b))); done(); draw(); toast(B('حُفظ الموضع.', 'Position saved.')); }
        catch (e) { btn.disabled = false; toast(errMsg(e), 1); }
      };
    }
    root.querySelector('#snDl').onclick = async ev => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        const pg = pdf.getPages();
        for (const s of S.slots) {
          if (!s.sig || s.gone || !pg[s.p]) continue;
          const im = await pdf.embedPng(s.sig), k = Math.min(s.w / im.width, s.h / im.height), w = im.width * k, h = im.height * k;
          pg[s.p].drawImage(im, { x: s.x + (s.w - w) / 2, y: s.y + (s.h - h) / 2, width: w, height: h });
        }
        const out = await pdf.save(), a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
        a.download = (S.title || 'minutes').replace(/[\\/:*?"<>|]+/g, ' ') + (S.slots.every(s => s.sig || s.free || s.gone) ? (isAr() ? ' - موقّع' : ' - signed') : '') + '.pdf';
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
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
    const fab = document.createElement('button'); fab.type = 'button'; fab.id = 'snFab'; fab.className = 'btn solid sn-fab'; fab.hidden = true; fab.innerHTML = B('أضف توقيعك', 'Add your signature');
    fab.onclick = () => root.querySelector('#snFree').click(); document.body.appendChild(fab);
    new IntersectionObserver(es => { fab.dataset.near = es[0].isIntersecting ? '1' : ''; fab.hidden = !fab.dataset.on || fab.dataset.near === '1'; }).observe(root.querySelector('#snFree'));
    views = await renderPages(doc, host, S.slots, { mine });
    draw();
    let rw = window.innerWidth, rt; window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - rw) < 40) return; rw = window.innerWidth; clearTimeout(rt); rt = setTimeout(async () => { endMode(); views = await renderPages(doc, host, S.slots, { mine }); draw(); }, 250); });
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

  /* ---------- ink colour (blue or black), remembered per device ---------- */
  const INKS = { blue: '#1d3a8f', black: '#111111' };
  const ink = () => INKS[store.get('ink', 'blue')] || INKS.blue;
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
    cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); pts = [pos(e)]; e.preventDefault(); });
    cv.addEventListener('pointermove', e => {
      if (!down) return; const p = pos(e), a = pts[pts.length - 1]; pts.push(p);
      const v = Math.hypot(p.x - a.x, p.y - a.y) / Math.max(1, p.t - a.t);
      ctx.lineWidth = Math.max(1.4, Math.min(3.4, 3.2 - v * .9));
      if (pts.length > 2) { const b = pts[pts.length - 3], m1 = { x: (b.x + a.x) / 2, y: (b.y + a.y) / 2 }, m2 = { x: (a.x + p.x) / 2, y: (a.y + p.y) / 2 }; ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(a.x, a.y, m2.x, m2.y); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      drawn = true; e.preventDefault();
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

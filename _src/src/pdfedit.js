/* alsamani.com/tools/pdf — one editor for PDF files, in the manner of a desktop viewer:
   a side panel of pages (add files, reorder, rotate, delete) and the pages themselves, where you write,
   tick boxes, cover old text, and place images. Arabic text is drawn by the browser (correct joining)
   and embedded as a sharp image, so it never breaks. Everything runs on the device. */
(function () {
  const K = window.PTK; if (!K) return;
  const { root, B, isAr, esc, toast, deliver, baseName, PDFJS, back, home, readBuf, imgToJpeg, A4 } = K;
  const FONTS = [['IBM Plex Sans Arabic', 'آي بي إم بلكس'], ['Noto Naskh Arabic', 'نسخ'], ['Amiri', 'أميري'], ['Cairo', 'القاهرة'], ['Tajawal', 'تجوّل'], ['Reem Kufi', 'ريم كوفي'], ['Aref Ruqaa', 'رقعة']];
  const COLORS = ['#111111', '#1d3a8f', '#b3261e', '#1e7e4a'];
  const MARKS = { check: '✓', x: '✕', dot: '●', ring: '○' };
  const loaded = new Set();
  function loadFont(f) {
    if (loaded.has(f) || f.startsWith('my:')) return Promise.resolve();
    loaded.add(f);
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;700&display=swap';
    document.head.appendChild(l);
    return new Promise(r => { l.onload = r; l.onerror = r; }).then(() => Promise.all([document.fonts.load(`400 20px "${f}"`, 'ابج'), document.fonts.load(`700 20px "${f}"`, 'ابج')])).catch(() => {});
  }
  const fam = f => f.startsWith('my:') ? f.slice(3) : f;
  const rtlOf = s => /[؀-ۿ]/.test(s);
  const OPT = { cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true };
  const rotOf = p => ((p.r0 || 0) + p.rot) % 360;
  const dispWH = p => rotOf(p) % 180 ? [p.h0, p.w0] : [p.w0, p.h0];
  // a point on the page as shown (top-left origin, after rotation) -> PDF user space of the unrotated page
  function toPdf(p, dx, dy) {
    const { w0, h0, ox, oy } = p, R = rotOf(p);
    if (R === 90) return [ox + dy, oy + dx];
    if (R === 180) return [ox + w0 - dx, oy + dy];
    if (R === 270) return [ox + w0 - dy, oy + h0 - dx];
    return [ox + dx, oy + h0 - dy];
  }

  window.PTEdit = function (initial) {
    const srcs = [], pages = [], trash = [];
    let items = [], seq = 0, sel = null, tool = null, clip = null, panel = window.innerWidth >= 900, lastMark = null;
    root.innerHTML = `${back}<div class="pe-app">
      <div class="pe-bar" id="peBar">
        <button type="button" data-tool="pages" aria-pressed="${panel}"><b>☰</b>${B('الصفحات', 'Pages')}</button><i class="pe-sep"></i>
        <button type="button" data-tool="text"><b>T</b>${B('نص', 'Text')}</button>
        <span class="pe-mk"><button type="button" data-tool="mark"><b id="peMkI">✓</b>${B('علامة', 'Mark')}</button><span class="pe-mks" hidden>${Object.keys(MARKS).map(k => `<button type="button" data-mk="${k}">${MARKS[k]}</button>`).join('')}</span></span>
        <button type="button" data-tool="cover"><i class="pe-cv"></i>${B('إخفاء', 'Cover')}</button>
        <button type="button" data-tool="img"><b>▣</b>${B('صورة', 'Image')}</button>
        <span class="pe-fill"></span><button type="button" class="pe-save" id="peSave">${B('حفظ PDF', 'Save PDF')}</button>
      </div>
      <p class="pe-hint" id="peHint" hidden></p>
      <div class="pe-body${panel ? ' pe-open' : ''}" id="peBody">
        <aside class="pe-side"><div class="pe-thumbs" id="peThumbs"></div>
          <div class="pe-adds"><button type="button" class="pe-addf" id="peAdd">${B('+ ملف PDF', '+ PDF file')}</button><button type="button" class="pe-addf" id="peAddI">${B('+ صورة', '+ Image')}</button></div>
          <button type="button" class="sn-lnk pe-undo" id="peUndo" hidden>${B('تراجع عن الحذف', 'Undo delete')}</button></aside>
        <div class="pe-pages" id="pePages"><div class="pe-empty" id="peEmpty"><div class="sn-two"><button type="button" class="btn solid" id="pePick">${B('اختيار ملف PDF', 'Choose a PDF')}</button><button type="button" class="btn ghost" id="pePickI">${B('صور الأوراق', 'Photos of pages')}</button></div><p class="pt-fine">${B('يمكن فتح أكثر من ملف ودمجها، ثم الكتابة عليها.', 'You can open several files to merge them, then write on them.')}</p></div></div>
      </div>
      <label class="sn-lbl pe-name" id="peNameL" hidden>${B('اسم الملف', 'File name')}<input type="text" id="peName" maxlength="120"></label>
    </div>
    <input type="file" id="peIn" accept="application/pdf,.pdf" multiple hidden><input type="file" id="peInI" accept="image/*" multiple hidden><input type="file" id="peImg" accept="image/*" hidden><input type="file" id="peFont" accept=".ttf,.otf,.woff,.woff2" hidden>`;
    const q = s => root.querySelector(s), host = q('#pePages'), thumbs = q('#peThumbs'), body = q('#peBody');
    const inp = q('#peIn');
    const inpI = q('#peInI');
    q('#pePick').onclick = q('#peAdd').onclick = () => inp.click();
    q('#pePickI').onclick = q('#peAddI').onclick = () => inpI.click();
    inp.onchange = () => { const fs = [...inp.files]; inp.value = ''; addFiles(fs); };
    inpI.onchange = () => { const fs = [...inpI.files]; inpI.value = ''; addFiles(fs); };

    /* ---------- files and pages ---------- */
    async function addFiles(files) {
      for (const f of files) {
        const pdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name), img = /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
        if (!pdf && !img) { toast(B('يُقبل PDF والصور فقط.', 'Only PDFs and images are accepted.'), 1); continue; }
        const s = { f, pdf };
        try {
          if (pdf) {
            s.buf = await readBuf(f); s.doc = await pdfjsLib.getDocument(Object.assign({ data: new Uint8Array(s.buf.slice(0)) }, OPT)).promise;
            for (let i = 0; i < s.doc.numPages; i++) {
              const pg = await s.doc.getPage(i + 1), v = pg.getViewport({ scale: 1, rotation: 0 }), vb = pg.view;
              pages.push({ id: ++seq, s, i, pg, w0: v.width, h0: v.height, ox: vb[0], oy: vb[1], r0: pg.rotate || 0, rot: 0 });
            }
          } else {
            s.url = URL.createObjectURL(f);
            s.im = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = s.url; });
            const base = pages.find(p => p.s.pdf), a = base ? Math.min(base.w0, base.h0) : A4[0], b = base ? Math.max(base.w0, base.h0) : A4[1];
            const land = s.im.naturalWidth > s.im.naturalHeight;
            pages.push({ id: ++seq, s, i: 0, w0: land ? b : a, h0: land ? a : b, ox: 0, oy: 0, r0: 0, rot: 0, fit: 'fit' });
          }
          srcs.push(s);
        } catch (e) { toast(/\.hei[cf]$/i.test(f.name) ? B('هذه صورة بصيغة HEIC لا يقرؤها هذا المتصفح. افتح الأداة من Safari، أو حوّل الصورة إلى JPG.', 'This HEIC photo cannot be read by this browser. Use Safari, or convert the photo to JPG.') : B('تعذّر فتح ملف: ', 'Could not open: ') + esc(f.name), 1); }
      }
      if (!q('#peName').value && srcs[0]) q('#peName').value = baseName(srcs[0].f.name);
      layout();
    }
    // draws one page as shown (rotation included) into a canvas of the given width
    async function paint(p, W) {
      const [dw, dh] = dispWH(p), k = W / dw, c = document.createElement('canvas');
      c.width = Math.round(dw * k); c.height = Math.round(dh * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      if (p.s.pdf) { await p.pg.render({ canvasContext: x, viewport: p.pg.getViewport({ scale: k, rotation: rotOf(p) }) }).promise; return c; }
      x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(rotOf(p) * Math.PI / 180);
      const W0 = p.w0 * k, H0 = p.h0 * k, iw = p.s.im.naturalWidth, ih = p.s.im.naturalHeight, m = p.fit === 'fill' ? 0 : 18 * k;
      const s = p.fit === 'fill' ? Math.max(W0 / iw, H0 / ih) : Math.min((W0 - 2 * m) / iw, (H0 - 2 * m) / ih);
      x.beginPath(); x.rect(-W0 / 2, -H0 / 2, W0, H0); x.clip(); x.drawImage(p.s.im, -iw * s / 2, -ih * s / 2, iw * s, ih * s); x.restore();
      return c;
    }
    const views = new Map();
    let io = null;
    function layout() {
      q('#peEmpty').hidden = pages.length > 0; q('#peNameL').hidden = !pages.length; q('#peUndo').hidden = !trash.length;
      const W = Math.max(240, Math.min(host.clientWidth || 700, 900));
      if (io) io.disconnect();
      io = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; const v = [...views.values()].find(x => x.wrap === en.target); if (v && !v.drawn) draw(v); }), { rootMargin: '500px' });
      [...views.keys()].forEach(id => { if (!pages.some(p => p.id === id)) { views.get(id).wrap.remove(); views.delete(id); } });
      pages.forEach((p, n) => {
        let v = views.get(p.id); const [dw, dh] = dispWH(p), k = W / dw;
        if (!v || v.W !== W || v.R !== rotOf(p) || v.fit !== p.fit) {
          if (v) v.wrap.remove();
          const wrap = document.createElement('div'); wrap.className = 'pe-pg';
          v = { p, wrap, k, W, R: rotOf(p), fit: p.fit, drawn: false }; views.set(p.id, v);
          wrap.addEventListener('pointerdown', e => onPage(e, v));
        }
        Object.assign(v.wrap.style, { width: W + 'px', height: Math.round(dh * k) + 'px' }); v.k = k;
        host.appendChild(v.wrap); io.observe(v.wrap);
        items.filter(it => it.pid === p.id).forEach(mount);
      });
      drawThumbs();
    }
    async function draw(v) { v.drawn = true; const c = await paint(v.p, v.W * Math.min(2, window.devicePixelRatio || 1)); c.className = 'pe-cvs'; const old = v.wrap.querySelector('.pe-cvs'); if (old) old.remove(); v.wrap.prepend(c); }
    let rw = window.innerWidth, rt;
    const onResize = () => { if (!pages.length || Math.abs(window.innerWidth - rw) < 40) return; rw = window.innerWidth; clearTimeout(rt); rt = setTimeout(layout, 250); };
    window.addEventListener('resize', onResize);

    /* ---------- side panel ---------- */
    let sortable = null;
    function drawThumbs() {
      thumbs.innerHTML = pages.map((p, n) => `<div class="pe-th" data-id="${p.id}"><div class="pe-thi"></div><div class="pe-tha"><span>${n + 1}</span>${p.s.pdf ? '' : `<button type="button" data-fit title="${isAr() ? 'ملاءمة الصورة أو ملء الصفحة' : 'Fit the image or fill the page'}">${p.fit === 'fill' ? '⤢' : '⤡'}</button>`}<button type="button" data-rot title="${isAr() ? 'تدوير' : 'Rotate'}">↻</button><button type="button" data-del title="${isAr() ? 'حذف' : 'Delete'}">×</button></div></div>`).join('');
      thumbs.querySelectorAll('.pe-th').forEach(el => {
        const p = pages.find(x => x.id === +el.dataset.id);
        (p.th ? Promise.resolve(p.th) : paint(p, 150).then(c => (p.th = c.toDataURL('image/jpeg', .75)))).then(u => { el.querySelector('.pe-thi').innerHTML = `<img src="${u}" alt="">`; });
        el.querySelector('.pe-thi').onclick = () => { const v = views.get(p.id); if (v) v.wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (window.innerWidth < 900) setPanel(false); };
        el.querySelector('[data-rot]').onclick = () => rotate(p);
        el.querySelector('[data-del]').onclick = () => { const at = pages.indexOf(p); pages.splice(at, 1); trash.push({ at, p, its: items.filter(i => i.pid === p.id) }); items = items.filter(i => i.pid !== p.id); layout(); };
        if (el.querySelector('[data-fit]')) el.querySelector('[data-fit]').onclick = () => { p.fit = p.fit === 'fill' ? 'fit' : 'fill'; p.th = null; layout(); };
      });
      if (window.Sortable && !sortable) sortable = Sortable.create(thumbs, { animation: 160, delay: 160, delayOnTouchOnly: true, filter: 'button', preventOnFilter: false, ghostClass: 'pt-ghost',
        onEnd: () => { const ord = [...thumbs.children].map(x => +x.dataset.id); pages.sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id)); layout(); } });
    }
    q('#peUndo').onclick = () => { const t = trash.pop(); if (!t) return; pages.splice(Math.min(t.at, pages.length), 0, t.p); items = items.concat(t.its); layout(); };
    function rotate(p) {
      const [, dh] = dispWH(p);
      // items turn with the page, around their centres
      items.filter(i => i.pid === p.id).forEach(i => { const cx = i.x + i.w / 2, cy = i.y + i.h / 2; i.x = dh - cy - i.w / 2; i.y = cx - i.h / 2; });
      p.rot = (p.rot + 90) % 360; p.th = null; layout();
    }
    function setPanel(on) { panel = on; body.classList.toggle('pe-open', on); q('[data-tool=pages]').setAttribute('aria-pressed', on); setTimeout(layout, 60); }

    /* ---------- tools: choose one, then tap the page ---------- */
    const hint = q('#peHint');
    function setTool(t) {
      tool = t; root.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool !== 'pages' && !!t && t.split(':')[0] === b.dataset.tool));
      body.classList.toggle('pe-placing', !!t); hint.hidden = !t;
      if (t) hint.innerHTML = t.startsWith('mark') ? B('اضغط على الصفحة لوضع العلامة، وكررها حيث تشاء. للإيقاف أو تغيير العلامة اضغط زر «علامة».', 'Tap the page to place the mark, as many times as you need. To stop or change the mark, tap the Mark button.')
        : t === 'text' ? B('اضغط على المكان الذي تريد الكتابة فيه.', 'Tap where you want to write.') : B('اضغط على الصفحة حيث تريد وضعه.', 'Tap the page where you want it.');
    }
    q('[data-tool=pages]').onclick = () => setPanel(!panel);
    const mkPop = q('.pe-mks'); let mk = 'check';
    q('[data-tool=mark]').onclick = () => { if (!pages.length) { inp.click(); return; } if (tool && tool.startsWith('mark')) { setTool(null); mkPop.hidden = false; return; } mkPop.hidden = !mkPop.hidden; };
    mkPop.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { mk = b.dataset.mk; q('#peMkI').textContent = MARKS[mk]; mkPop.hidden = true; setTool('mark:' + mk); });
    ['text', 'cover', 'img'].forEach(t => q(`[data-tool=${t}]`).onclick = () => { if (!pages.length) { inp.click(); return; } setTool(tool === t ? null : t); });
    function onPage(e, v) {
      if (!tool || e.target.closest('.pe-it')) return;
      const r = v.wrap.getBoundingClientRect(), x = (e.clientX - r.left) / v.k, y = (e.clientY - r.top) / v.k, pid = v.p.id;
      if (tool.startsWith('mark')) { const s = lastMark ? lastMark.w : 12; add({ id: ++seq, pid, t: 'mark', mk, x: x - s / 2, y: y - s / 2, w: s, h: s, color: lastMark ? lastMark.color : '#111111' }); return; }
      const t = tool; setTool(null);
      if (t === 'text') { const last = items.filter(i => i.t === 'text').pop(); const it = { id: ++seq, pid, t: 'text', x: x - 4, y: y - 10, text: '', font: last ? last.font : FONTS[0][0], size: last ? last.size : 12, color: last ? last.color : '#111111', bold: last ? last.bold : false, align: 'right' }; loadFont(it.font).then(() => editText(it, true)); return; }
      if (t === 'cover') { const it = { id: ++seq, pid, t: 'cover', x: x - 50, y: y - 9, w: 100, h: 18, auto: true, color: '#ffffff' }; it.color = bgOf(it); add(it); return; }
      if (t === 'img') { const fi = q('#peImg'); fi.value = ''; fi.onchange = () => { const f = fi.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const w = Math.min(140, dispWH(v.p)[0] * .35), h = w * im.height / im.width; add({ id: ++seq, pid, t: 'img', x: x - w / 2, y: y - h / 2, w, h, src: rd.result }); }; im.src = rd.result; }; rd.readAsDataURL(f); }; fi.click(); }
    }
    function add(it) { items.push(it); mount(it); select(it); if (it.t === 'mark') lastMark = it; }

    /* ---------- items ---------- */
    const markSvg = m => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${m === 'check' ? '<path d="M4 12.5l5 5L20 6"/>' : m === 'x' ? '<path d="M5 5l14 14M19 5L5 19"/>' : m === 'dot' ? '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>' : '<circle cx="12" cy="12" r="8.5" stroke-width="2.4"/>'}</svg>`;
    function mount(it) {
      const v = views.get(it.pid); if (!v) return;
      if (it.el) it.el.remove();
      const el = document.createElement('div'); el.className = 'pe-it pe-' + it.t; it.el = el;
      el.innerHTML = (it.t === 'text' ? '<span class="pe-tx"></span>' : it.t === 'img' ? `<img src="${it.src}" alt="">` : it.t === 'mark' ? markSvg(it.mk) : '') +
        `<i class="pe-rz" aria-hidden="true"></i><span class="pe-mini">${it.t === 'mark' ? COLORS.map(c => `<button type="button" data-col="${c}" style="--c:${c}" aria-label="colour"></button>`).join('') : ''}${it.t === 'text' || it.t === 'cover' ? `<button type="button" data-a="edit">${B('تعديل', 'Edit')}</button>` : ''}<button type="button" data-a="dup">${B('تكرار', 'Duplicate')}</button><button type="button" data-a="del">${B('حذف', 'Delete')}</button></span>`;
      v.wrap.appendChild(el); place(it); drag(it);
      el.querySelectorAll('.pe-mini button').forEach(b => b.addEventListener('pointerdown', ev => ev.stopPropagation()));
      el.querySelector('[data-a=del]').onclick = ev => { ev.stopPropagation(); remove(it); };
      el.querySelector('[data-a=dup]').onclick = ev => { ev.stopPropagation(); dup(it, 0, it.h + 4); };
      if (el.querySelector('[data-a=edit]')) el.querySelector('[data-a=edit]').onclick = ev => { ev.stopPropagation(); it.t === 'text' ? editText(it) : editCover(it); };
      el.querySelectorAll('[data-col]').forEach(b => b.onclick = ev => { ev.stopPropagation(); it.color = b.dataset.col; place(it); lastMark = it; });
    }
    function place(it) {
      const v = views.get(it.pid), el = it.el; if (!v || !el) return; const k = v.k;
      if (it.t === 'text') {
        const s = el.querySelector('.pe-tx');
        Object.assign(s.style, { fontFamily: `"${fam(it.font)}", "IBM Plex Sans Arabic", sans-serif`, fontWeight: it.bold ? 700 : 400, fontSize: it.size * k + 'px', color: it.color, textAlign: it.align, direction: rtlOf(it.text) ? 'rtl' : 'ltr', padding: 2 * k + 'px', lineHeight: '1.4', whiteSpace: 'pre' });
        s.textContent = it.text || ' ';
        Object.assign(el.style, { left: it.x * k + 'px', top: it.y * k + 'px', width: '', height: '' });
        it.w = s.offsetWidth / k; it.h = s.offsetHeight / k;
      } else {
        Object.assign(el.style, { left: it.x * k + 'px', top: it.y * k + 'px', width: it.w * k + 'px', height: it.h * k + 'px' });
        if (it.t === 'cover') el.style.background = it.color;
        if (it.t === 'mark') el.style.color = it.color;
      }
    }
    function select(it) { sel = it; root.querySelectorAll('.pe-it').forEach(x => x.classList.toggle('on', x === (it && it.el))); }
    function remove(it) { items = items.filter(x => x !== it); it.el && it.el.remove(); if (sel === it) sel = null; }
    // a copy keeps every setting; for text it opens straight away so the content (a date, say) can be changed
    function dup(it, dx, dy) {
      const c = Object.assign({}, it, { id: ++seq, el: null, x: it.x + dx, y: it.y + dy });
      const v = views.get(c.pid); if (v && c.y + c.h > dispWH(v.p)[1]) c.y = Math.max(0, it.y - it.h - 4);
      items.push(c); mount(c); select(c); return c;
    }
    const onDoc = e => { if (sel && !e.target.closest('.pe-it') && !e.target.closest('.pe-sheet')) select(null); if (!e.target.closest('.pe-mk')) mkPop.hidden = true; };
    document.addEventListener('pointerdown', onDoc);
    const onKey = e => {
      if (!document.body.contains(root.querySelector('.pe-app')) || document.querySelector('.pe-sheet') || /input|textarea|select/i.test(e.target.tagName)) return;
      const m = e.metaKey || e.ctrlKey, st = e.shiftKey ? 10 : 1;
      if (e.key === 'Escape') { setTool(null); select(null); return; }
      if (m && e.key === 'v' && clip && clip.el) { e.preventDefault(); dup(clip, 10, 10); return; }
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(sel); }
      else if (m && e.key === 'd') { e.preventDefault(); dup(sel, 0, sel.h + 4); }
      else if (m && e.key === 'c') clip = sel;
      else if (e.key.startsWith('Arrow')) { e.preventDefault(); sel.x += e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0; sel.y += e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0; place(sel); }
    };
    document.addEventListener('keydown', onKey);
    q('[data-back]').onclick = () => { window.removeEventListener('resize', onResize); document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); home(); };
    function drag(it) {
      const el = it.el;
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('.pe-mini')) return;
        e.preventDefault(); e.stopPropagation(); select(it);
        const v = views.get(it.pid), rz = e.target.classList.contains('pe-rz'), sx = e.clientX, sy = e.clientY, o = { x: it.x, y: it.y, w: it.w, h: it.h, size: it.size };
        let moved = false; el.setPointerCapture(e.pointerId);
        const mv = ev => {
          const dx = (ev.clientX - sx) / v.k, dy = (ev.clientY - sy) / v.k; if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
          if (!rz) { it.x = o.x + dx; it.y = o.y + dy; }
          else if (it.t === 'text') it.size = Math.max(5, Math.min(200, o.size * (o.w + dx) / o.w));
          else if (it.t === 'img' || it.t === 'mark') { const nw = Math.max(5, o.w + dx); it.w = nw; it.h = nw * o.h / o.w; }
          else { it.w = Math.max(6, o.w + dx); it.h = Math.max(4, o.h + dy); }
          place(it);
        };
        const up = () => {
          el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
          if (!moved && !rz && it.t === 'text') editText(it);
          else if (it.t === 'cover' && it.auto && moved) { it.color = bgOf(it); place(it); }
          if (it.t === 'mark') lastMark = it;
        };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    // the page colour around a box: the most common colour on a ring just outside it
    function bgOf(it) {
      const v = views.get(it.pid), c = v && v.wrap.querySelector('.pe-cvs'); if (!c) return '#ffffff';
      const s = c.width / v.W * v.k, x0 = Math.max(0, Math.round((it.x - 3) * s)), y0 = Math.max(0, Math.round((it.y - 3) * s)), x1 = Math.min(c.width - 1, Math.round((it.x + it.w + 3) * s)), y1 = Math.min(c.height - 1, Math.round((it.y + it.h + 3) * s));
      if (x1 <= x0 || y1 <= y0) return '#ffffff';
      const d = c.getContext('2d').getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1), W = d.width, H = d.height, n = {};
      const add = (x, y) => { const i = (y * W + x) * 4, k = (d.data[i] >> 3) + ',' + (d.data[i + 1] >> 3) + ',' + (d.data[i + 2] >> 3), e = n[k] || (n[k] = [0, 0, 0, 0]); e[0]++; e[1] += d.data[i]; e[2] += d.data[i + 1]; e[3] += d.data[i + 2]; };
      for (let x = 0; x < W; x += 2) { add(x, 0); add(x, H - 1); } for (let y = 0; y < H; y += 2) { add(0, y); add(W - 1, y); }
      const e = n[Object.keys(n).sort((a, b) => n[b][0] - n[a][0])[0]];
      return '#' + [1, 2, 3].map(j => Math.round(e[j] / e[0]).toString(16).padStart(2, '0')).join('');
    }

    /* ---------- sheets ---------- */
    function sheet(html) {
      document.querySelectorAll('.pe-sheet,.pe-bg').forEach(x => x.remove());
      const bg = document.createElement('div'); bg.className = 'pe-bg'; const sh = document.createElement('div'); sh.className = 'pe-sheet'; sh.innerHTML = html;
      document.body.append(bg, sh); bg.onclick = () => { bg.remove(); sh.remove(); };
      return { sh, close: () => { bg.remove(); sh.remove(); } };
    }
    function editText(it, isNew) {
      const list = FONTS.concat(it.font.startsWith('my:') ? [[it.font, fam(it.font)]] : []);
      const { sh, close } = sheet(`<h3>${B('النص', 'Text')}</h3>
        <textarea id="peT" rows="3" dir="auto" placeholder="${isAr() ? 'اكتب هنا' : 'Type here'}">${esc(it.text)}</textarea>
        <div class="pe-row"><label>${B('الخط', 'Font')}<select id="peF">${list.map(f => `<option value="${esc(f[0])}"${f[0] === it.font ? ' selected' : ''}>${esc(isAr() ? f[1] : fam(f[0]))}</option>`).join('')}<option value="+">${isAr() ? 'خط من جهازي…' : 'A font from my device…'}</option></select></label>
          <label>${B('الحجم', 'Size')}<input type="number" id="peS" min="5" max="200" step="1" value="${Math.round(it.size)}"></label></div>
        <div class="pe-row"><div class="pe-sw">${COLORS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" aria-checked="${c === it.color}"></button>`).join('')}<input type="color" id="peC" value="${it.color}"></div>
          <div class="pe-al"><button type="button" data-b aria-pressed="${it.bold}"><b>B</b></button>${['right', 'center', 'left'].map(a => `<button type="button" data-al="${a}" aria-pressed="${it.align === a}">${a === 'right' ? '⇥' : a === 'center' ? '↔' : '⇤'}</button>`).join('')}</div></div>
        <p class="pe-prev" id="peP"></p>
        <div class="sn-two"><button type="button" class="btn solid" id="peOk">${B('تم', 'Done')}</button><button type="button" class="btn ghost" id="peNo">${B('إلغاء', 'Cancel')}</button></div>`);
      const st = { text: it.text, font: it.font, size: it.size, color: it.color, bold: it.bold, align: it.align };
      const ta = sh.querySelector('#peT'), pv = sh.querySelector('#peP');
      const show = () => { Object.assign(pv.style, { fontFamily: `"${fam(st.font)}", sans-serif`, fontWeight: st.bold ? 700 : 400, color: st.color, textAlign: st.align, direction: rtlOf(ta.value) ? 'rtl' : 'ltr' }); pv.textContent = ta.value || (isAr() ? 'معاينة الخط' : 'Font preview'); };
      ta.oninput = show;
      sh.querySelector('#peF').onchange = async e => {
        if (e.target.value === '+') { const ff = q('#peFont'); ff.value = ''; ff.onchange = async () => {
          const f = ff.files[0]; if (!f) { e.target.value = st.font; return; } const name = f.name.replace(/\.[^.]+$/, '');
          try { const face = new FontFace(name, await f.arrayBuffer()); await face.load(); document.fonts.add(face); loaded.add('my:' + name); st.font = 'my:' + name;
            const o = document.createElement('option'); o.value = st.font; o.textContent = name; e.target.insertBefore(o, e.target.lastChild); e.target.value = st.font; show(); }
          catch (x) { toast(B('تعذّر قراءة ملف الخط.', 'The font file could not be read.'), 1); e.target.value = st.font; } }; ff.click(); return; }
        st.font = e.target.value; await loadFont(st.font); show();
      };
      sh.querySelector('#peS').oninput = e => { st.size = Math.max(5, Math.min(200, +e.target.value || 12)); };
      sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { st.color = b.dataset.c; sh.querySelector('#peC').value = st.color; sh.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-checked', x === b)); show(); });
      sh.querySelector('#peC').oninput = e => { st.color = e.target.value; sh.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-checked', 'false')); show(); };
      sh.querySelector('[data-b]').onclick = e => { st.bold = !st.bold; e.currentTarget.setAttribute('aria-pressed', st.bold); show(); };
      sh.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { st.align = b.dataset.al; sh.querySelectorAll('[data-al]').forEach(x => x.setAttribute('aria-pressed', x === b)); show(); });
      sh.querySelector('#peNo').onclick = close;
      sh.querySelector('#peOk').onclick = async () => {
        st.text = ta.value.replace(/\s+$/, ''); close();
        if (!st.text) { if (!isNew) remove(it); return; }
        await loadFont(st.font); Object.assign(it, st);
        if (isNew) add(it); else place(it);
        select(it);
      };
      show(); setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 50);
    }
    function editCover(it) {
      const { sh, close } = sheet(`<h3>${B('لون الإخفاء', 'Cover colour')}</h3><p class="pt-fine">${B('يأخذ المربع لون الصفحة حوله تلقائيًا، أو اختر لونًا بنفسك.', 'The box takes the colour of the page around it automatically, or pick one yourself.')}</p>
        <div class="pe-row"><button type="button" class="btn ghost" id="peAuto">${B('مطابقة لون الخلفية', 'Match the background')}</button><div class="pe-sw">${['#ffffff', '#f4f4f4', '#111111'].map(c => `<button type="button" data-c="${c}" style="--c:${c}" aria-checked="${!it.auto && c === it.color}"></button>`).join('')}<input type="color" id="peC" value="${it.color}"></div></div>
        <div class="sn-two"><button type="button" class="btn solid" id="peOk">${B('تم', 'Done')}</button></div>`);
      sh.querySelector('#peAuto').onclick = () => { it.auto = true; it.color = bgOf(it); place(it); close(); };
      sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { it.auto = false; it.color = b.dataset.c; place(it); close(); });
      sh.querySelector('#peC').oninput = e => { it.auto = false; it.color = e.target.value; place(it); };
      sh.querySelector('#peOk').onclick = close;
    }

    /* ---------- save ---------- */
    function textPng(it) {
      const S = 6, c = document.createElement('canvas'), x = c.getContext('2d'), lines = it.text.split('\n'), lh = it.size * 1.4 * S;
      c.width = Math.ceil(it.w * S); c.height = Math.ceil(it.h * S);
      x.font = `${it.bold ? 700 : 400} ${it.size * S}px "${fam(it.font)}", "IBM Plex Sans Arabic", sans-serif`; x.fillStyle = it.color; x.textBaseline = 'middle';
      const rtl = rtlOf(it.text), padX = 2 * S;
      lines.forEach((ln, i) => {
        const y = (i + .5) * lh + 2 * S; x.direction = rtl ? 'rtl' : 'ltr';
        if (it.align === 'center') { x.textAlign = 'center'; x.fillText(ln, c.width / 2, y); }
        else if (it.align === 'left') { x.textAlign = 'left'; x.direction = 'ltr'; x.fillText(ln, padX, y); }
        else { x.textAlign = 'right'; x.fillText(ln, c.width - padX, y); }
      });
      return c.toDataURL('image/png');
    }
    const markPng = it => new Promise(res => { const im = new Image(), S = 240; im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(im, 0, 0, S, S); res(c.toDataURL('image/png')); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markSvg(it.mk).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" color="${it.color}" `)); });
    const toPng = src => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res(c.toDataURL('image/png')); }; im.src = src; });
    q('#peSave').onclick = async ev => {
      if (!pages.length) { inp.click(); return; }
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const out = await PDFLib.PDFDocument.create(), libs = new Map();
        for (const p of pages) {
          let pg;
          if (p.s.pdf) {
            if (!libs.has(p.s)) libs.set(p.s, await PDFLib.PDFDocument.load(p.s.buf, { ignoreEncryption: true }));
            [pg] = await out.copyPages(libs.get(p.s), [p.i]); out.addPage(pg);
          } else {
            if (!p.s.jpg) p.s.jpg = await imgToJpeg(p.s.f, 2200);
            const j = p.s.jpg, im = await out.embedJpg(j.buf), W = p.w0, H = p.h0, m = p.fit === 'fill' ? 0 : 18;
            const k = p.fit === 'fill' ? Math.max(W / j.w, H / j.h) : Math.min((W - 2 * m) / j.w, (H - 2 * m) / j.h);
            pg = out.addPage([W, H]); pg.drawImage(im, { x: (W - j.w * k) / 2, y: (H - j.h * k) / 2, width: j.w * k, height: j.h * k });
          }
          const R = rotOf(p); pg.setRotation(PDFLib.degrees(R));
          const its = items.filter(i => i.pid === p.id);
          for (const it of its.filter(i => i.t === 'cover').concat(its.filter(i => i.t !== 'cover'))) {
            const [ax, ay] = toPdf(p, it.x, it.y + it.h), o = { x: ax, y: ay, width: it.w, height: it.h, rotate: PDFLib.degrees(R) };
            if (it.t === 'cover') { const h = it.color.replace('#', ''), n = i => parseInt(h.substr(i, 2), 16) / 255; pg.drawRectangle(Object.assign(o, { color: PDFLib.rgb(n(0), n(2), n(4)) })); continue; }
            const png = it.t === 'text' ? textPng(it) : it.t === 'mark' ? await markPng(it) : await toPng(it.src);
            pg.drawImage(await out.embedPng(png), o);
          }
        }
        const bytes = await out.save(), name = (q('#peName').value.trim() || 'document').replace(/[\\/:*?"<>|]+/g, ' ') + '.pdf';
        deliver(bytes, name, btn);
      } catch (e) { toast(B('تعذّر حفظ الملف. قد يكون أحد الملفات محميًا بكلمة مرور.', 'The file could not be saved. One of the files may be password-protected.'), 1); }
      btn.disabled = false;
    };
    if (initial && initial.length) addFiles(initial); else inp.click();
  };
})();

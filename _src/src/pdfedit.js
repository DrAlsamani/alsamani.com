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
  const DRAW = [['pen', '✎', 'قلم', 'Pen'], ['hl', '▬', 'تظليل', 'Highlighter'], ['line', '╱', 'خط', 'Line'], ['arrow', '→', 'سهم', 'Arrow'], ['rect', '▭', 'مستطيل', 'Rectangle'], ['oval', '◯', 'دائرة', 'Circle']];
  const HL = ['#ffe14d', '#9be38f', '#ff9ec7', '#8fd3ff'];
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
    let fname = '', items = [], seq = 0, sel = null, tool = null, clip = null, panel = window.innerWidth >= 900, lastMark = null;
    root.innerHTML = `<div class="pe-app">
      <div class="pe-bar" id="peBar">
        <button type="button" data-tool="pages" aria-pressed="${panel}"><b>☰</b>${B('الصفحات', 'Pages')}</button><i class="pe-sep"></i>
        <button type="button" data-tool="text"><b>T</b>${B('نص', 'Text')}</button>
        <span class="pe-mk"><button type="button" data-tool="mark"><b id="peMkI">✓</b>${B('علامة', 'Mark')}</button><span class="pe-mks" hidden>${Object.keys(MARKS).map(k => `<button type="button" data-mk="${k}">${MARKS[k]}</button>`).join('')}</span></span>
        <span class="pe-mk pe-dr"><button type="button" data-tool="draw"><b id="peDrI">✎</b>${B('رسم', 'Draw')}</button><span class="pe-mks pe-drs" hidden>
          <span class="pe-drk">${DRAW.map(d => `<button type="button" data-dk="${d[0]}" title="${isAr() ? d[2] : d[3]}">${d[1]}</button>`).join('')}</span>
          <span class="pe-drc" id="peDrC"></span>
          <span class="pe-drw">${[1, 2, 3].map(w => `<button type="button" data-dw="${w}" aria-pressed="${w === 2}"><i style="height:${w * 1.6}px"></i></button>`).join('')}</span></span></span>
        <button type="button" data-tool="cover"><i class="pe-cv"></i>${B('إخفاء', 'Cover')}</button>
        <button type="button" data-tool="img"><b>▣</b>${B('صورة', 'Image')}</button>
        <span class="pe-fill"></span><button type="button" class="pe-save" id="peSave">${B('حفظ PDF', 'Save PDF')}</button>
      </div>
      <p class="pe-hint" id="peHint" hidden></p>
      <div class="pe-body${panel ? ' pe-open' : ''}" id="peBody">
        <aside class="pe-side"><div class="pe-thumbs" id="peThumbs"></div>
          <div class="pe-adds"><button type="button" class="pe-addf" id="peAdd">${B('+ ملف PDF', '+ PDF file')}</button><button type="button" class="pe-addf" id="peAddI">${B('+ صور', '+ Photos')}</button><button type="button" class="pe-addf" id="peBlank">${B('+ صفحة فارغة', '+ Blank page')}</button></div>
          <button type="button" class="sn-lnk pe-undo" id="peUndo" hidden>${B('تراجع عن الحذف', 'Undo delete')}</button></aside>
        <div class="pe-pages" id="pePages"><div class="pe-empty" id="peEmpty"><div class="sn-two"><button type="button" class="btn solid" id="pePick">${B('اختيار ملف PDF', 'Choose a PDF')}</button><button type="button" class="btn ghost" id="pePickI">${B('صور الأوراق', 'Photos of pages')}</button></div><p class="pt-fine">${B('يمكن فتح أكثر من ملف ودمجها، ثم الكتابة عليها.', 'You can open several files to merge them, then write on them.')}</p></div></div>
      </div>
    </div>
    <input type="file" id="peIn" accept="application/pdf,.pdf" multiple hidden><input type="file" id="peInI" accept="image/*" multiple hidden><input type="file" id="peImg" accept="image/*" multiple hidden><input type="file" id="peFont" accept=".ttf,.otf,.woff,.woff2" hidden>`;
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
            const im = await loadImg(f), land = im.w > im.h, p = blank(land);
            const m = 18, k = Math.min((p.w0 - 2 * m) / im.w, (p.h0 - 2 * m) / im.h), w = im.w * k, h = im.h * k;
            items.push({ id: ++seq, pid: p.id, t: 'img', x: (p.w0 - w) / 2, y: (p.h0 - h) / 2, w, h, ang: 0, src: im.url, file: f });
            continue;
          }
          srcs.push(s);
        } catch (e) { toast(/\.hei[cf]$/i.test(f.name) ? B('هذه صورة بصيغة HEIC لا يقرؤها هذا المتصفح. افتح الأداة من Safari، أو حوّل الصورة إلى JPG.', 'This HEIC photo cannot be read by this browser. Use Safari, or convert the photo to JPG.') : B('تعذّر فتح ملف: ', 'Could not open: ') + esc(f.name), 1); }
      }
      if (!fname && srcs[0]) fname = baseName(srcs[0].f.name);
      layout();
    }
    // a blank page the size of the first PDF page (A4 otherwise)
    function blank(land, at) {
      const base = pages.find(p => p.s.pdf), a = base ? Math.min(base.w0, base.h0) : A4[0], b = base ? Math.max(base.w0, base.h0) : A4[1];
      const p = { id: ++seq, s: { blank: true }, i: 0, w0: land ? b : a, h0: land ? a : b, ox: 0, oy: 0, r0: 0, rot: 0 };
      if (at == null) pages.push(p); else pages.splice(at, 0, p);
      return p;
    }
    const loadImg = f => new Promise((ok, no) => { const url = URL.createObjectURL(f), im = new Image(); im.onload = () => ok({ url, w: im.naturalWidth, h: im.naturalHeight }); im.onerror = no; im.src = url; });
    q('#peBlank').onclick = () => { const cur = pages.findIndex(p => p.id === curPid); const p = blank(false, cur >= 0 ? cur + 1 : undefined); layout(); setTimeout(() => { const v = views.get(p.id); if (v) v.wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); markThumb(p.id); }, 100); };
    // draws one page as shown (rotation included) into a canvas of the given width
    async function paint(p, W) {
      const [dw, dh] = dispWH(p), k = W / dw, c = document.createElement('canvas');
      c.width = Math.round(dw * k); c.height = Math.round(dh * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      if (p.s.pdf) await p.pg.render({ canvasContext: x, viewport: p.pg.getViewport({ scale: k, rotation: rotOf(p) }) }).promise;
      return c;
    }
    const views = new Map();
    let io = null;
    function layout() {
      q('#peEmpty').hidden = pages.length > 0; q('#peUndo').hidden = !trash.length;
      const W = Math.max(240, Math.min(host.clientWidth || 700, 900));
      if (io) io.disconnect();
      io = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; const v = [...views.values()].find(x => x.wrap === en.target); if (v && !v.drawn) draw(v); }), { rootMargin: '500px' });
      [...views.keys()].forEach(id => { if (!pages.some(p => p.id === id)) { views.get(id).wrap.remove(); views.delete(id); } });
      pages.forEach((p, n) => {
        let v = views.get(p.id); const [dw, dh] = dispWH(p), k = W / dw;
        if (!v || v.W !== W || v.R !== rotOf(p)) {
          if (v) v.wrap.remove();
          const wrap = document.createElement('div'); wrap.className = 'pe-pg';
          v = { p, wrap, k, W, R: rotOf(p), drawn: false }; views.set(p.id, v);
          wrap.addEventListener('pointerdown', e => { markThumb(p.id); onPage(e, v); });
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
      thumbs.innerHTML = pages.map((p, n) => `<div class="pe-th" data-id="${p.id}"><div class="pe-thi"></div><div class="pe-tha"><span>${n + 1}</span><button type="button" data-rot title="${isAr() ? 'تدوير' : 'Rotate'}">↻</button><button type="button" data-del title="${isAr() ? 'حذف' : 'Delete'}">×</button></div></div>`).join('');
      thumbs.querySelectorAll('.pe-th').forEach(el => {
        const p = pages.find(x => x.id === +el.dataset.id);
        (p.th ? Promise.resolve(p.th) : thumbOf(p).then(u => (p.th = u))).then(u => { el.querySelector('.pe-thi').innerHTML = `<img src="${u}" alt="">`; });
        if (p.id === curPid) el.classList.add('cur');
        el.querySelector('.pe-thi').onclick = () => { markThumb(p.id); const v = views.get(p.id); if (v) v.wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (window.innerWidth < 900) setPanel(false); };
        el.querySelector('[data-rot]').onclick = () => rotate(p);
        el.querySelector('[data-del]').onclick = () => { const at = pages.indexOf(p); pages.splice(at, 1); trash.push({ at, p, its: items.filter(i => i.pid === p.id) }); items = items.filter(i => i.pid !== p.id); layout(); };
      });
      if (window.Sortable && !sortable) sortable = Sortable.create(thumbs, { animation: 160, delay: 160, delayOnTouchOnly: true, filter: 'button', preventOnFilter: false, ghostClass: 'pt-ghost',
        onEnd: () => { const ord = [...thumbs.children].map(x => +x.dataset.id); pages.sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id)); layout(); } });
    }
    let curPid = null;
    function markThumb(id) {
      curPid = id; let hit = null;
      thumbs.querySelectorAll('.pe-th').forEach(t => { const on = +t.dataset.id === id; t.classList.toggle('cur', on); if (on) hit = t; });
      if (hit && panel) { const box = thumbs.closest('.pe-side'), sc = window.innerWidth >= 900 ? box : thumbs, r = hit.getBoundingClientRect(), b = sc.getBoundingClientRect();
        if (window.innerWidth >= 900) { if (r.top < b.top || r.bottom > b.bottom) sc.scrollTop += r.top - b.top - (b.height - r.height) / 2; }
        else if (r.left < b.left || r.right > b.right) sc.scrollLeft += r.left - b.left - (b.width - r.width) / 2; }
    }
    // a thumbnail with the photos placed on the page drawn in
    async function thumbOf(p) {
      const c = await paint(p, 150), x = c.getContext('2d'), k = c.width / dispWH(p)[0];
      for (const it of items.filter(i => i.pid === p.id && i.t === 'img')) {
        const im = await new Promise(r => { const m = new Image(); m.onload = () => r(m); m.onerror = () => r(null); m.src = it.src; }); if (!im) continue;
        const [iw, ih] = (it.ang || 0) % 180 ? [it.h, it.w] : [it.w, it.h];
        x.save(); x.translate((it.x + it.w / 2) * k, (it.y + it.h / 2) * k); x.rotate((it.ang || 0) * Math.PI / 180); x.drawImage(im, -iw * k / 2, -ih * k / 2, iw * k, ih * k); x.restore();
      }
      return c.toDataURL('image/jpeg', .75);
    }
    const refreshThumb = pid => { const p = pages.find(x => x.id === pid); if (!p) return; p.th = null; const el = thumbs.querySelector(`.pe-th[data-id="${pid}"] .pe-thi`); if (el) thumbOf(p).then(u => { p.th = u; el.innerHTML = `<img src="${u}" alt="">`; }); };
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
      body.classList.toggle('pe-drawing', !!t && t.startsWith('draw'));
      if (t) hint.innerHTML = t.startsWith('draw') ? B('ارسم على الصفحة. للإيقاف أو تغيير الأداة اضغط زر «رسم».', 'Draw on the page. To stop or change the tool, tap the Draw button.') : t.startsWith('mark') ? B('اضغط على الصفحة لوضع العلامة، وكررها حيث تشاء. للإيقاف أو تغيير العلامة اضغط زر «علامة».', 'Tap the page to place the mark, as many times as you need. To stop or change the mark, tap the Mark button.')
        : t === 'text' ? B('اضغط على المكان الذي تريد الكتابة فيه.', 'Tap where you want to write.') : B('اضغط على الصفحة حيث تريد وضعه.', 'Tap the page where you want it.');
    }
    q('[data-tool=pages]').onclick = () => setPanel(!panel);
    const mkPop = q('.pe-mks'); let mk = 'check';
    q('[data-tool=mark]').onclick = () => { if (!pages.length) { inp.click(); return; } if (tool && tool.startsWith('mark')) { setTool(null); mkPop.hidden = false; return; } mkPop.hidden = !mkPop.hidden; };
    const drPop = q('.pe-drs'); let dk = 'pen', dcol = { pen: '#1d3a8f', hl: '#ffe14d' }, dw = 2;
    const drawCols = () => { const hl = dk === 'hl', list = hl ? HL : COLORS, cur = hl ? dcol.hl : dcol.pen; q('#peDrC').innerHTML = list.map(c => `<button type="button" data-dc="${c}" style="--c:${c}" aria-checked="${c === cur}"></button>`).join('');
      q('#peDrC').querySelectorAll('[data-dc]').forEach(b => b.onclick = () => { if (dk === 'hl') dcol.hl = b.dataset.dc; else dcol.pen = b.dataset.dc; drawCols(); }); };
    q('[data-tool=draw]').onclick = () => { if (!pages.length) { inp.click(); return; } if (tool && tool.startsWith('draw')) { setTool(null); drPop.hidden = false; drawCols(); return; } drPop.hidden = !drPop.hidden; drawCols(); };
    drPop.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { dk = b.dataset.dk; q('#peDrI').textContent = b.textContent; drPop.hidden = true; setTool('draw:' + dk); });
    drPop.querySelectorAll('[data-dw]').forEach(b => b.onclick = () => { dw = +b.dataset.dw; drPop.querySelectorAll('[data-dw]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    mkPop.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { mk = b.dataset.mk; q('#peMkI').textContent = MARKS[mk]; mkPop.hidden = true; setTool('mark:' + mk); });
    ['text', 'cover', 'img'].forEach(t => q(`[data-tool=${t}]`).onclick = () => { if (!pages.length) { inp.click(); return; } setTool(tool === t ? null : t); });
    function onPage(e, v) {
      if (!tool || e.target.closest('.pe-it')) return;
      if (tool.startsWith('draw')) { stroke(e, v); return; }
      const r = v.wrap.getBoundingClientRect(), x = (e.clientX - r.left) / v.k, y = (e.clientY - r.top) / v.k, pid = v.p.id;
      if (tool.startsWith('mark')) { const s = lastMark ? lastMark.w : 12; add({ id: ++seq, pid, t: 'mark', mk, x: x - s / 2, y: y - s / 2, w: s, h: s, color: lastMark ? lastMark.color : '#111111' }); return; }
      const t = tool; setTool(null);
      if (t === 'text') { const last = items.filter(i => i.t === 'text').pop(); const it = { id: ++seq, pid, t: 'text', x: x - 4, y: y - 10, text: '', font: last ? last.font : FONTS[0][0], size: last ? last.size : 12, color: last ? last.color : '#111111', bold: last ? last.bold : false, align: 'right' }; loadFont(it.font).then(() => editText(it, true)); return; }
      if (t === 'cover') { const it = { id: ++seq, pid, t: 'cover', x: x - 50, y: y - 9, w: 100, h: 18, auto: true, color: '#ffffff' }; it.color = bgOf(it); add(it); return; }
      if (t === 'img') { const fi = q('#peImg'); fi.value = ''; fi.onchange = async () => {
        const fs = [...fi.files]; if (!fs.length) return;
        const ims = []; for (const f of fs) { try { ims.push(Object.assign(await loadImg(f), { f })); } catch (e) { toast(B('تعذّر فتح صورة: ', 'Could not open an image: ') + esc(f.name), 1); } }
        if (ims.length === 1) { const im = ims[0], w = Math.min(160, dispWH(v.p)[0] * .35), h = w * im.h / im.w; add({ id: ++seq, pid, t: 'img', x: x - w / 2, y: y - h / 2, w, h, ang: 0, src: im.url, file: im.f }); refreshThumb(pid); return; }
        const [W, H] = dispWH(v.p), m = 24, g = 10, n = ims.length, cols = Math.ceil(Math.sqrt(n * W / H)), rows = Math.ceil(n / cols), cw = (W - 2 * m - (cols - 1) * g) / cols, ch = (H - 2 * m - (rows - 1) * g) / rows;
        ims.forEach((im, i) => { const k = Math.min(cw / im.w, ch / im.h), w = im.w * k, h = im.h * k, cx = m + (i % cols) * (cw + g) + cw / 2, cy = m + Math.floor(i / cols) * (ch + g) + ch / 2;
          add({ id: ++seq, pid, t: 'img', x: cx - w / 2, y: cy - h / 2, w, h, ang: 0, src: im.url, file: im.f }); });
        refreshThumb(pid);
      }; fi.click(); }
    }
    /* ---------- drawing: a smooth pen, a highlighter, lines, arrows and shapes ---------- */
    function stroke(e, v) {
      e.preventDefault();
      const r = v.wrap.getBoundingClientRect(), P = ev => [(ev.clientX - r.left) / v.k, (ev.clientY - r.top) / v.k], kind = dk;
      const hl = kind === 'hl', col = hl ? dcol.hl : dcol.pen, w = hl ? [8, 12, 18][dw - 1] : [1, 1.8, 3][dw - 1];
      const [dw0, dh0] = dispWH(v.p), pts = [P(e)];
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'pe-live'); svg.setAttribute('viewBox', `0 0 ${dw0} ${dh0}`); svg.setAttribute('preserveAspectRatio', 'none');
      v.wrap.appendChild(svg); v.wrap.setPointerCapture(e.pointerId);
      const shape = () => drawPath(kind, pts, w, col);
      const mv = ev => { const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; evs.forEach(x => { const p = P(x), l = pts[pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > .6) { if (kind === 'pen' || kind === 'hl') pts.push(p); else pts[1] = p; } }); svg.innerHTML = shape(); };
      const up = () => {
        v.wrap.removeEventListener('pointermove', mv); v.wrap.removeEventListener('pointerup', up); v.wrap.removeEventListener('pointercancel', up); svg.remove();
        if (pts.length < 2) return;
        if (hl && pts.length > 2) { const ys = pts.map(p => p[1]); if (Math.max(...ys) - Math.min(...ys) < w * 1.2) { const y = ys.reduce((a, b) => a + b) / ys.length; pts.splice(1, pts.length - 2); pts[0][1] = pts[1][1] = y; } }
        const pad = w * 1.5 + (kind === 'arrow' ? w * 4 : 0), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, bw = Math.max(...xs) - Math.min(...xs) + 2 * pad, bh = Math.max(...ys) - Math.min(...ys) + 2 * pad;
        if (bw < 2 * pad + 2 && bh < 2 * pad + 2) return;
        const rel = pts.map(p => [p[0] - x0, p[1] - y0]);
        add({ id: ++seq, pid: v.p.id, t: 'draw', x: x0, y: y0, w: bw, h: bh, vb: [bw, bh], svg: drawPath(kind, rel, w, col) });
      };
      v.wrap.addEventListener('pointermove', mv); v.wrap.addEventListener('pointerup', up); v.wrap.addEventListener('pointercancel', up);
    }
    // smooth curves through the midpoints of the captured points
    function drawPath(kind, pts, w, col) {
      const f = n => Math.round(n * 100) / 100, a = pts[0], b = pts[pts.length - 1], st = `stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="${kind === 'hl' ? 'butt' : 'round'}" stroke-linejoin="round"`;
      if (kind === 'pen' || kind === 'hl') {
        let d = `M${f(a[0])} ${f(a[1])}`;
        if (pts.length < 3) d += ` L${f(b[0])} ${f(b[1])}`;
        else { for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(m[0])} ${f(m[1])}`; } d += ` L${f(b[0])} ${f(b[1])}`; }
        return `<path d="${d}" ${st}${kind === 'hl' ? ' stroke-opacity=".45"' : ''}/>`;
      }
      if (kind === 'line') return `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" ${st}/>`;
      if (kind === 'arrow') { const t = Math.atan2(b[1] - a[1], b[0] - a[0]), L = w * 4 + 4, s1 = [b[0] - L * Math.cos(t - .45), b[1] - L * Math.sin(t - .45)], s2 = [b[0] - L * Math.cos(t + .45), b[1] - L * Math.sin(t + .45)];
        return `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} M${f(s1[0])} ${f(s1[1])} L${f(b[0])} ${f(b[1])} L${f(s2[0])} ${f(s2[1])}" ${st}/>`; }
      const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), W = Math.abs(b[0] - a[0]), H = Math.abs(b[1] - a[1]);
      if (kind === 'rect') return `<rect x="${f(x)}" y="${f(y)}" width="${f(W)}" height="${f(H)}" rx="1" ${st}/>`;
      return `<ellipse cx="${f(x + W / 2)}" cy="${f(y + H / 2)}" rx="${f(W / 2)}" ry="${f(H / 2)}" ${st}/>`;
    }
    const drawSvg = it => `<svg viewBox="0 0 ${it.vb[0]} ${it.vb[1]}" preserveAspectRatio="none">${it.svg}</svg>`;
    function add(it) { items.push(it); mount(it); select(it); if (it.t === 'mark') lastMark = it; }

    /* ---------- items ---------- */
    const markSvg = m => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${m === 'check' ? '<path d="M4 12.5l5 5L20 6"/>' : m === 'x' ? '<path d="M5 5l14 14M19 5L5 19"/>' : m === 'dot' ? '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>' : '<circle cx="12" cy="12" r="8.5" stroke-width="2.4"/>'}</svg>`;
    function mount(it) {
      const v = views.get(it.pid); if (!v) return;
      if (it.el) it.el.remove();
      const el = document.createElement('div'); el.className = 'pe-it pe-' + it.t; it.el = el;
      el.innerHTML = (it.t === 'text' ? '<span class="pe-tx"></span>' : it.t === 'img' ? `<img class="pe-im" src="${it.src}" alt="">` : it.t === 'mark' ? markSvg(it.mk) : it.t === 'draw' ? drawSvg(it) : '') +
        ['nw', 'ne', 'sw', 'se'].concat(it.t === 'cover' || it.t === 'draw' ? ['n', 's', 'e', 'w'] : []).map(h => `<i class="pe-h pe-h-${h}" data-h="${h}" aria-hidden="true"></i>`).join('') + `<span class="pe-mini">${it.t === 'mark' ? COLORS.map(c => `<button type="button" data-col="${c}" style="--c:${c}" aria-label="colour"></button>`).join('') : ''}${it.t === 'img' ? `<button type="button" data-a="rl" title="${isAr() ? 'تدوير لليسار' : 'Rotate left'}">↺</button><button type="button" data-a="rr" title="${isAr() ? 'تدوير لليمين' : 'Rotate right'}">↻</button>` : ''}${it.t === 'text' || it.t === 'cover' ? `<button type="button" data-a="edit">${B('تعديل', 'Edit')}</button>` : ''}<button type="button" data-a="dup">${B('تكرار', 'Duplicate')}</button><button type="button" data-a="to">${B('نسخ إلى صفحات', 'Copy to pages')}</button><button type="button" data-a="del">${B('حذف', 'Delete')}</button></span>`;
      v.wrap.appendChild(el); place(it); drag(it);
      el.querySelectorAll('.pe-mini button').forEach(b => b.addEventListener('pointerdown', ev => ev.stopPropagation()));
      el.querySelector('[data-a=del]').onclick = ev => { ev.stopPropagation(); remove(it); };
      el.querySelector('[data-a=dup]').onclick = ev => { ev.stopPropagation(); dup(it, 0, it.h + 4); };
      el.querySelector('[data-a=to]').onclick = ev => { ev.stopPropagation(); copyTo(it); };
      if (el.querySelector('[data-a=edit]')) el.querySelector('[data-a=edit]').onclick = ev => { ev.stopPropagation(); it.t === 'text' ? editText(it) : editCover(it); };
      el.querySelectorAll('[data-col]').forEach(b => b.onclick = ev => { ev.stopPropagation(); it.color = b.dataset.col; place(it); lastMark = it; });
      el.querySelectorAll('[data-a=rl],[data-a=rr]').forEach(b => b.onclick = ev => { ev.stopPropagation(); turn(it, b.dataset.a === 'rr' ? 90 : -90); });
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
        if (it === sel) nearTop(it);
        if (it.t === 'cover') el.style.background = it.color;
        if (it.t === 'mark') el.style.color = it.color;
        if (it.t === 'img') { const a = it.ang || 0, [iw, ih] = a % 180 ? [it.h, it.w] : [it.w, it.h]; Object.assign(el.querySelector('.pe-im').style, { width: iw * k + 'px', height: ih * k + 'px', transform: `translate(-50%,-50%) rotate(${a}deg)` }); }
      }
    }
    // a quarter turn about the centre: the box swaps width and height
    function turn(it, d) { const cx = it.x + it.w / 2, cy = it.y + it.h / 2; it.ang = (((it.ang || 0) + d) % 360 + 360) % 360; [it.w, it.h] = [it.h, it.w];
      // still inside the page after turning: shrink if needed, then keep it on the page
      const v = views.get(it.pid); if (v) { const [W, H] = dispWH(v.p), k = Math.min(1, (W - 8) / it.w, (H - 8) / it.h); it.w *= k; it.h *= k; it.x = Math.min(Math.max(4, cx - it.w / 2), W - 4 - it.w); it.y = Math.min(Math.max(4, cy - it.h / 2), H - 4 - it.h); }
      else { it.x = cx - it.w / 2; it.y = cy - it.h / 2; }
      place(it); refreshThumb(it.pid); }
    // the small toolbar goes above the item, below it near the top of the page, or inside it when the item fills the page
    const nearTop = it => { const v = views.get(it.pid); if (!it.el || !v) return; const k = v.k, top = it.y * k >= 44, bot = (dispWH(v.p)[1] - it.y - it.h) * k >= 44;
      it.el.classList.toggle('pe-below', !top && bot); it.el.classList.toggle('pe-inside', !top && !bot); };
    function select(it) { if (it) nearTop(it); sel = it; root.querySelectorAll('.pe-it').forEach(x => x.classList.toggle('on', x === (it && it.el))); }
    function remove(it) { items = items.filter(x => x !== it); it.el && it.el.remove(); if (sel === it) sel = null; if (it.t === 'img') refreshThumb(it.pid); }
    // a copy keeps every setting; for text it opens straight away so the content (a date, say) can be changed
    function dup(it, dx, dy, pid) {
      const c = Object.assign({}, it, { id: ++seq, el: null, x: it.x + dx, y: it.y + dy, pid: pid || it.pid });
      const v = views.get(c.pid); if (v && c.y + c.h > dispWH(v.p)[1]) c.y = Math.max(0, it.y - it.h - 4);
      items.push(c); mount(c); select(c); if (c.t === 'img') refreshThumb(c.pid); return c;
    }
    // the same item, in the same place, on other pages (a stamp or a date on every page, say)
    function copyTo(it) {
      const { sh, close } = sheet(`<h3>${B('نسخ إلى صفحات', 'Copy to pages')}</h3><p class="pt-fine">${B('يُنسخ في الموضع نفسه من كل صفحة تختارها.', 'It is copied to the same place on each page you choose.')}</p>
        <label class="sn-keep"><input type="checkbox" id="peAll"> ${B('كل الصفحات', 'All pages')}</label>
        <div class="pe-pgs">${pages.map((p, n) => p.id === it.pid ? '' : `<label><input type="checkbox" value="${p.id}"> ${n + 1}</label>`).join('')}</div>
        <div class="sn-two"><button type="button" class="btn solid" id="peOk">${B('نسخ', 'Copy')}</button><button type="button" class="btn ghost" id="peNo">${B('إلغاء', 'Cancel')}</button></div>`);
      const boxes = [...sh.querySelectorAll('.pe-pgs input')];
      sh.querySelector('#peAll').onchange = e => boxes.forEach(b => b.checked = e.target.checked);
      sh.querySelector('#peNo').onclick = close;
      sh.querySelector('#peOk').onclick = () => { const ids = boxes.filter(b => b.checked).map(b => +b.value); close(); ids.forEach(id => dup(it, 0, 0, id)); select(it);
        if (ids.length) toast(B(`نُسخ إلى ${ids.length} صفحة.`, `Copied to ${ids.length} page${ids.length > 1 ? 's' : ''}.`)); };
    }
    const onDoc = e => { if (sel && !e.target.closest('.pe-it') && !e.target.closest('.pe-sheet')) select(null); if (!e.target.closest('.pe-mk')) { mkPop.hidden = true; drPop.hidden = true; } };
    document.addEventListener('pointerdown', onDoc);
    const onKey = e => {
      if (!document.body.contains(root.querySelector('.pe-app')) || document.querySelector('.pe-sheet') || /input|textarea|select/i.test(e.target.tagName)) return;
      const m = e.metaKey || e.ctrlKey, st = e.shiftKey ? 10 : 1;
      if (e.key === 'Escape') { setTool(null); select(null); return; }
      if (m && e.key === 'v' && clip && clip.el) { e.preventDefault(); const other = curPid && curPid !== clip.pid && pages.some(p => p.id === curPid); dup(clip, other ? 0 : 10, other ? 0 : 10, other ? curPid : null); return; }
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(sel); }
      else if (m && e.key === 'd') { e.preventDefault(); dup(sel, 0, sel.h + 4); }
      else if (m && e.key === 'c') clip = sel;
      else if (e.key.startsWith('Arrow')) { e.preventDefault(); sel.x += e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0; sel.y += e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0; place(sel); }
    };
    document.addEventListener('keydown', onKey);
        function drag(it) {
      const el = it.el;
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('.pe-mini')) return;
        e.preventDefault(); e.stopPropagation(); select(it); markThumb(it.pid);
        const v = views.get(it.pid), hd = e.target.dataset && e.target.dataset.h, rz = !!hd, sx = e.clientX, sy = e.clientY, o = { x: it.x, y: it.y, w: it.w, h: it.h, size: it.size };
        const hx = !hd ? 0 : /e/.test(hd) ? 1 : /w/.test(hd) ? -1 : 0, hy = !hd ? 0 : /s/.test(hd) ? 1 : /n/.test(hd) ? -1 : 0, [PW, PH] = dispWH(v.p);
        if (!rz) v.wrap.classList.add('pe-moving');
        let moved = false; el.setPointerCapture(e.pointerId); v.wrap.style.zIndex = 5;
        const mv = ev => {
          const dx = (ev.clientX - sx) / v.k, dy = (ev.clientY - sy) / v.k; if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
          if (!rz) { it.x = o.x + dx; it.y = o.y + dy; place(it); return; }
          // the opposite corner or side stays put; the item never grows past the page edge
          const room = { r: PW - o.x, l: o.x + o.w, b: PH - o.y, t: o.y + o.h };
          if (it.t === 'cover' || it.t === 'draw') {
            if (hx) { const w = Math.max(6, Math.min(hx > 0 ? room.r : room.l, o.w + hx * dx)); it.w = w; it.x = hx > 0 ? o.x : o.x + o.w - w; }
            if (hy) { const h = Math.max(4, Math.min(hy > 0 ? room.b : room.t, o.h + hy * dy)); it.h = h; it.y = hy > 0 ? o.y : o.y + o.h - h; }
            place(it); return;
          }
          let f = Math.max((o.w + hx * dx) / o.w, (o.h + hy * dy) / o.h);
          f = Math.min(f, (hx > 0 ? room.r : room.l) / o.w, (hy > 0 ? room.b : room.t) / o.h); f = Math.max(f, 6 / Math.min(o.w, o.h));
          if (it.t === 'text') { it.size = Math.max(5, Math.min(200, o.size * f)); place(it); }
          else { it.w = o.w * f; it.h = o.h * f; }
          it.x = hx > 0 ? o.x : o.x + o.w - it.w; it.y = hy > 0 ? o.y : o.y + o.h - it.h;
          place(it);
        };
        const up = ev => {
          el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); v.wrap.style.zIndex = ''; v.wrap.classList.remove('pe-moving');
          if (moved && !rz && ev && ev.clientX != null) {
            const nv = [...views.values()].find(x => { const r = x.wrap.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; });
            if (nv && nv.p.id !== it.pid) {
              const r = el.getBoundingClientRect(), nr = nv.wrap.getBoundingClientRect(), from = it.pid;
              it.pid = nv.p.id; it.x = (r.left - nr.left) / nv.k; it.y = (r.top - nr.top) / nv.k; mount(it); select(it); markThumb(it.pid);
              if (it.t === 'img') { refreshThumb(from); refreshThumb(it.pid); }
              return;
            }
          }
          if (!moved && !rz && it.t === 'text') editText(it);
          else if (it.t === 'cover' && it.auto && moved) { it.color = bgOf(it); place(it); }
          if (it.t === 'mark') lastMark = it;
          if (it.t === 'img' && moved) refreshThumb(it.pid);
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
    const svgPng = (svg, w, h) => new Promise(res => { const S = 6, im = new Image(); im.onerror = () => res(null); im.onload = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w * S)}" height="${Math.ceil(h * S)}" `)); });
    const markPng = it => new Promise(res => { const im = new Image(), S = 240; im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(im, 0, 0, S, S); res(c.toDataURL('image/png')); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markSvg(it.mk).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" color="${it.color}" `)); });
    const toPng = (src, max) => new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, (max || 1e5) / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; im.src = src; });
    // saving: the file is built first, then a small sheet offers the name and the size (as is, or smaller)
    async function build() {
      // nothing changed in a single file: hand back the original, untouched
      if (srcs.length === 1 && srcs[0].pdf && !items.length && pages.length === srcs[0].doc.numPages && pages.every((p, i) => p.s === srcs[0] && p.i === i && !p.rot)) return new Uint8Array(srcs[0].buf.slice(0));
        const out = await PDFLib.PDFDocument.create(), libs = new Map();
        for (const p of pages) {
          let pg;
          if (p.s.pdf) {
            if (!libs.has(p.s)) libs.set(p.s, await PDFLib.PDFDocument.load(p.s.buf, { ignoreEncryption: true }));
            [pg] = await out.copyPages(libs.get(p.s), [p.i]); out.addPage(pg);
          } else pg = out.addPage([p.w0, p.h0]);
          const R = rotOf(p); pg.setRotation(PDFLib.degrees(R));
          const its = items.filter(i => i.pid === p.id);
          for (const it of its.filter(i => i.t === 'cover').concat(its.filter(i => i.t !== 'cover'))) {
            if (it.t === 'img') {
              // photos as JPEG (smaller), images with transparency (stamps, signatures) as PNG; turned about their centre
              const a = it.ang || 0, [iw, ih] = a % 180 ? [it.h, it.w] : [it.w, it.h], cx = it.x + it.w / 2, cy = it.y + it.h / 2, t = a * Math.PI / 180;
              const dx = -iw / 2, dy = ih / 2, [ax, ay] = toPdf(p, cx + dx * Math.cos(t) - dy * Math.sin(t), cy + dx * Math.sin(t) + dy * Math.cos(t));
              const png = it.file && /png|gif|webp/i.test(it.file.type), img = png || !it.file ? await out.embedPng(await toPng(it.src, 2400)) : await out.embedJpg((it.jpg || (it.jpg = await imgToJpeg(it.file, 2400))).buf);
              pg.drawImage(img, { x: ax, y: ay, width: iw, height: ih, rotate: PDFLib.degrees(R - a) }); continue;
            }
            const [ax, ay] = toPdf(p, it.x, it.y + it.h), o = { x: ax, y: ay, width: it.w, height: it.h, rotate: PDFLib.degrees(R) };
            if (it.t === 'cover') { const h = it.color.replace('#', ''), n = i => parseInt(h.substr(i, 2), 16) / 255; pg.drawRectangle(Object.assign(o, { color: PDFLib.rgb(n(0), n(2), n(4)) })); continue; }
            const png = it.t === 'text' ? textPng(it) : it.t === 'draw' ? await svgPng(drawSvg(it), it.w, it.h) : await markPng(it);
            if (!png) continue;
            pg.drawImage(await out.embedPng(png), o);
          }
        }
        return await out.save();
    }
    const kb = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
    const LV = [{ dpi: 200, q: .85 }, { dpi: 150, q: .75 }, { dpi: 110, q: .62 }];
    async function shrinkBytes(bytes, L, st) {
      const doc = await pdfjsLib.getDocument(Object.assign({ data: new Uint8Array(bytes) }, OPT)).promise, out = await PDFLib.PDFDocument.create();
      for (let i = 1; i <= doc.numPages; i++) {
        st.textContent = (isAr() ? 'جارٍ التصغير… صفحة ' : 'Shrinking… page ') + i + ' / ' + doc.numPages;
        const pg = await doc.getPage(i), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: L.dpi / 72 });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: x, viewport: vp }).promise;
        const jb = await new Promise(r => c.toBlob(r, 'image/jpeg', L.q)), im = await out.embedJpg(await jb.arrayBuffer());
        out.addPage([v1.width, v1.height]).drawImage(im, { x: 0, y: 0, width: v1.width, height: v1.height }); c.width = c.height = 0;
      }
      return await out.save();
    }
    q('#peSave').onclick = async ev => {
      if (!pages.length) { inp.click(); return; }
      const btn = ev.currentTarget; btn.disabled = true; let bytes;
      try { bytes = await build(); }
      catch (e) { btn.disabled = false; toast(B('تعذّر حفظ الملف. قد يكون أحد الملفات محميًا بكلمة مرور.', 'The file could not be saved. One of the files may be password-protected.'), 1); return; }
      btn.disabled = false;
      let lv = 1;
      const { sh, close } = sheet(`<h3>${B('حفظ الملف', 'Save the file')}</h3>
        <label class="sn-lbl">${B('اسم الملف', 'File name')}<input type="text" id="peN" maxlength="120" value="${esc(fname || 'document')}"></label>
        <p class="pt-fine pe-size">${B(`${pages.length} صفحة · ${kb(bytes.length)}`, `${pages.length} pages · ${kb(bytes.length)}`)}</p>
        <div class="sn-two"><button type="button" class="btn solid" id="peGo">${B('حفظ', 'Save')}</button></div>
        <details class="pe-shr"><summary>${B('تصغير الحجم للإرسال', 'Make it smaller to send')}</summary>
          <div class="pt-lv" role="radiogroup">${[['خفيف', 'Light', 'أوضح جودة', 'Best quality'], ['متوسط', 'Medium', 'مناسب للواتساب', 'Good for WhatsApp'], ['قوي', 'Strong', 'أصغر حجم', 'Smallest']].map((l, i) => `<button type="button" role="radio" data-l="${i}" aria-checked="${i === lv}"><b>${B(l[0], l[1])}</b><span>${B(l[2], l[3])}</span></button>`).join('')}</div>
          <p class="pt-fine">${B('تتحول الصفحات إلى صور، فلا يمكن تحديد النص أو نسخه في الملف المصغّر.', 'Pages become images, so text in the smaller file cannot be selected or copied.')}</p>
          <div class="sn-two"><button type="button" class="btn ghost" id="peSm">${B('حفظ نسخة مصغّرة', 'Save a smaller copy')}</button></div><p class="pt-status" id="peSt" aria-live="polite"></p></details>`);
      const name = () => { fname = sh.querySelector('#peN').value.trim() || 'document'; return fname.replace(/[\\/:*?"<>|]+/g, ' ') + '.pdf'; };
      sh.querySelector('#peGo').onclick = e => { deliver(bytes, name(), e.currentTarget); setTimeout(close, 600); };
      sh.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lv = +b.dataset.l; sh.querySelectorAll('[data-l]').forEach(x => x.setAttribute('aria-checked', x === b)); });
      sh.querySelector('#peSm').onclick = async e => {
        const b = e.currentTarget, st = sh.querySelector('#peSt'); b.disabled = true;
        try {
          const small = await shrinkBytes(bytes, LV[lv], st);
          if (small.length >= bytes.length * .95) { st.innerHTML = B('الملف صغير أصلًا ولم يصغر أكثر. احفظه كما هو.', 'The file is already small; it did not get smaller. Save it as it is.'); b.disabled = false; return; }
          st.innerHTML = B(`من ${kb(bytes.length)} إلى ${kb(small.length)}`, `From ${kb(bytes.length)} to ${kb(small.length)}`);
          b.disabled = false; b.innerHTML = B('حفظ النسخة المصغّرة', 'Save the smaller copy');
          const n = name().replace(/\.pdf$/, (isAr() ? ' - مصغّر' : ' - small') + '.pdf');
          b.onclick = ev2 => deliver(small, n, ev2.currentTarget); deliver(small, n, b);
        } catch (x) { st.textContent = ''; b.disabled = false; toast(B('تعذّر تصغير الملف.', 'The file could not be made smaller.'), 1); }
      };
    };
    if (initial && initial.length) addFiles(initial);
  };
})();

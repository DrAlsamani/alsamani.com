/* alsamani.com/tools/pdf — write on pages: text, images and cover boxes placed over a PDF.
   Arabic text is drawn by the browser (correct letter joining) and embedded as a sharp image, so it never breaks. Runs on the device. */
(function () {
  const K = window.PTK; if (!K) return;
  const { root, B, isAr, esc, toast, deliver, baseName, PDFJS, back, home, readBuf } = K;
  const FONTS = [['IBM Plex Sans Arabic', 'آي بي إم بلكس'], ['Noto Naskh Arabic', 'نسخ'], ['Amiri', 'أميري'], ['Cairo', 'القاهرة'], ['Tajawal', 'تجوّل'], ['Reem Kufi', 'ريم كوفي'], ['Aref Ruqaa', 'رقعة']];
  const COLORS = ['#111111', '#1d3a8f', '#b3261e', '#1e7e4a'];
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

  window.PTEdit = function () {
    let file = null, doc = null, buf = null, views = [], items = [], sel = null, seq = 0;
    root.innerHTML = `${back}<div class="sn-card pe-card">
      <h2>${B('الكتابة على الصفحات', 'Write on pages')}</h2>
      <input type="file" id="peIn" accept="application/pdf,.pdf" hidden>
      <div class="sn-two" id="pePickW"><button type="button" class="btn ghost" id="pePick">${B('اختيار ملف PDF', 'Choose a PDF')}</button></div>
      <p class="pt-fine" id="peHint" hidden>${B('اختر ما تضيفه، فيظهر في منتصف الصفحة الظاهرة أمامك. اسحبه إلى موضعه، وكبّره أو صغّره من الزاوية، واضغطه لتعديله.', 'Choose what to add; it appears in the middle of the page in view. Drag it into place, resize it from the corner, and tap it to edit.')}</p>
    </div>
    <div class="pe-bar" id="peBar" hidden>
      <button type="button" data-add="text"><b>T</b>${B('نص', 'Text')}</button>
      <button type="button" data-add="cover"><i class="pe-cv"></i>${B('إخفاء', 'Cover')}</button>
      <button type="button" data-add="img"><b>▣</b>${B('صورة', 'Image')}</button>
      <span></span><button type="button" class="pe-save" id="peSave">${B('حفظ PDF', 'Save PDF')}</button>
    </div>
    <div class="pe-pages" id="pePages"></div>
    <input type="file" id="peImg" accept="image/*" hidden><input type="file" id="peFont" accept=".ttf,.otf,.woff,.woff2" hidden>`;
    root.querySelector('[data-back]').onclick = home;
    const inp = root.querySelector('#peIn'), host = root.querySelector('#pePages'), bar = root.querySelector('#peBar');
    root.querySelector('#pePick').onclick = () => inp.click();
    inp.onchange = async () => {
      file = inp.files[0]; if (!file) return;
      try { buf = await readBuf(file); doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true }).promise; }
      catch (e) { toast(B('تعذّر فتح الملف. قد يكون محميًا بكلمة مرور.', 'The file could not be opened. It may be password-protected.'), 1); return; }
      root.querySelector('#pePickW').hidden = true; root.querySelector('#peHint').hidden = false; bar.hidden = false;
      items = []; await render();
    };

    /* pages: drawn to fit the width; items are kept in PDF points so the view can be redrawn at any size */
    async function render() {
      host.innerHTML = ''; views = [];
      const W = host.clientWidth || 600;
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i), v1 = pg.getViewport({ scale: 1 }), k = W / v1.width;
        const wrap = document.createElement('div'); wrap.className = 'pe-pg'; wrap.style.width = W + 'px'; wrap.style.height = Math.round(v1.height * k) + 'px';
        const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1), vp = pg.getViewport({ scale: k * d });
        c.width = vp.width; c.height = vp.height; wrap.appendChild(c); host.appendChild(wrap);
        const v = { i: i - 1, wrap, k, w: v1.width, h: v1.height, pg, vp, done: false };
        views.push(v);
      }
      const io = new IntersectionObserver(es => es.forEach(async en => {
        const v = views.find(x => x.wrap === en.target); if (!en.isIntersecting || !v || v.done) return; v.done = true;
        const x = v.wrap.firstChild.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, v.vp.width, v.vp.height);
        await v.pg.render({ canvasContext: x, viewport: v.vp }).promise;
      }), { rootMargin: '400px' });
      views.forEach(v => io.observe(v.wrap));
      items.forEach(mount);
    }
    let rw = window.innerWidth, rt;
    window.addEventListener('resize', () => { if (!doc || Math.abs(window.innerWidth - rw) < 40) return; rw = window.innerWidth; clearTimeout(rt); rt = setTimeout(render, 250); });

    // the page most in view, and the middle of what is visible on it
    function target() {
      const mid = window.innerHeight / 2; let best = views[0], bd = 1e9;
      views.forEach(v => { const r = v.wrap.getBoundingClientRect(); const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0; if (d < bd) { bd = d; best = v; } });
      const r = best.wrap.getBoundingClientRect(), y = Math.min(Math.max(mid - r.top, 60), r.height - 60) / best.k;
      return { v: best, x: best.w / 2, y };
    }

    /* ---------- items ---------- */
    function mount(it) {
      const v = views[it.p]; if (!v) return;
      if (it.el) it.el.remove();
      const el = document.createElement('div'); el.className = 'pe-it pe-' + it.t; it.el = el;
      el.innerHTML = it.t === 'text' ? '<span></span>' : it.t === 'img' ? `<img src="${it.src}" alt="">` : '';
      el.insertAdjacentHTML('beforeend', '<i class="pe-rz" aria-hidden="true"></i><button type="button" class="pe-x" aria-label="delete">×</button>');
      v.wrap.appendChild(el); place(it); drag(it);
      el.querySelector('.pe-x').onclick = ev => { ev.stopPropagation(); items = items.filter(x => x !== it); el.remove(); };
    }
    function place(it) {
      const v = views[it.p], el = it.el;
      if (it.t === 'text') {
        const s = el.querySelector('span');
        Object.assign(s.style, { fontFamily: `"${fam(it.font)}", "IBM Plex Sans Arabic", sans-serif`, fontWeight: it.bold ? 700 : 400, fontSize: it.size * v.k + 'px', color: it.color, textAlign: it.align, direction: /[؀-ۿ]/.test(it.text) ? 'rtl' : 'ltr', padding: 2 * v.k + 'px', lineHeight: '1.4', whiteSpace: 'pre' });
        s.textContent = it.text || ' ';
        el.style.left = it.x * v.k + 'px'; el.style.top = it.y * v.k + 'px'; el.style.width = ''; el.style.height = '';
        it.w = el.offsetWidth / v.k; it.h = el.offsetHeight / v.k;
      } else {
        Object.assign(el.style, { left: it.x * v.k + 'px', top: it.y * v.k + 'px', width: it.w * v.k + 'px', height: it.h * v.k + 'px' });
        if (it.t === 'cover') el.style.background = it.color;
      }
    }
    function select(it) { sel = it; root.querySelectorAll('.pe-it').forEach(x => x.classList.toggle('on', x === (it && it.el))); }
    document.addEventListener('pointerdown', e => { if (sel && !e.target.closest('.pe-it') && !e.target.closest('.pe-sheet')) select(null); });
    function drag(it) {
      const el = it.el;
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('.pe-x')) return;
        e.preventDefault(); select(it);
        const v = views[it.p], rz = e.target.classList.contains('pe-rz'), sx = e.clientX, sy = e.clientY, o = { x: it.x, y: it.y, w: it.w, h: it.h, size: it.size };
        let moved = false;
        el.setPointerCapture(e.pointerId);
        const mv = ev => {
          const dx = (ev.clientX - sx) / v.k, dy = (ev.clientY - sy) / v.k; if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
          if (!rz) { it.x = Math.max(-o.w / 2, Math.min(v.w - o.w / 2, o.x + dx)); it.y = Math.max(-o.h / 2, Math.min(v.h - o.h / 2, o.y + dy)); }
          else if (it.t === 'text') { it.size = Math.max(5, Math.min(200, o.size * (o.w + dx) / o.w)); }
          else if (it.t === 'img') { const nw = Math.max(10, o.w + dx); it.w = nw; it.h = nw * o.h / o.w; }
          else { it.w = Math.max(6, o.w + dx); it.h = Math.max(4, o.h + dy); }
          place(it);
        };
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (!moved && !rz && it.t === 'text') editText(it); if (!moved && !rz && it.t === 'cover') editCover(it); else if (it.t === 'cover' && it.auto) { it.color = bgOf(it); place(it); } };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    bar.querySelectorAll('[data-add]').forEach(b => b.onclick = async () => {
      if (!views.length) return;
      const t = target(), kind = b.dataset.add;
      if (kind === 'text') {
        const last = items.filter(x => x.t === 'text').pop();
        const it = { id: ++seq, t: 'text', p: t.v.i, x: t.x - 60, y: t.y - 10, text: '', font: last ? last.font : FONTS[0][0], size: last ? last.size : 14, color: last ? last.color : '#111111', bold: last ? last.bold : false, align: 'right' };
        await loadFont(it.font); editText(it, true);
      } else if (kind === 'cover') {
        const it = { id: ++seq, t: 'cover', p: t.v.i, x: t.x - 60, y: t.y - 10, w: 120, h: 20, color: '#ffffff', auto: true };
        it.color = bgOf(it); items.push(it); mount(it); select(it);
      } else {
        const fi = root.querySelector('#peImg'); fi.value = '';
        fi.onchange = () => { const f = fi.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
          const w = Math.min(160, t.v.w * .4), h = w * im.height / im.width;
          const it = { id: ++seq, t: 'img', p: t.v.i, x: t.x - w / 2, y: t.y - h / 2, w, h, src: r.result };
          items.push(it); mount(it); select(it); }; im.src = r.result; }; r.readAsDataURL(f); };
        fi.click();
      }
    });

    /* ---------- the text sheet ---------- */
    function sheet(html) {
      document.querySelectorAll('.pe-sheet,.pe-bg').forEach(x => x.remove());
      const bg = document.createElement('div'); bg.className = 'pe-bg'; const sh = document.createElement('div'); sh.className = 'pe-sheet'; sh.innerHTML = html;
      document.body.append(bg, sh); bg.onclick = () => { bg.remove(); sh.remove(); };
      return { sh, close: () => { bg.remove(); sh.remove(); } };
    }
    function editText(it, isNew) {
      const mine = FONTS.concat(it.font.startsWith('my:') ? [[it.font, fam(it.font)]] : []);
      const { sh, close } = sheet(`<h3>${B('النص', 'Text')}</h3>
        <textarea id="peT" rows="3" dir="auto" placeholder="${isAr() ? 'اكتب هنا' : 'Type here'}">${esc(it.text)}</textarea>
        <div class="pe-row"><label>${B('الخط', 'Font')}<select id="peF">${mine.map(f => `<option value="${esc(f[0])}"${f[0] === it.font ? ' selected' : ''}>${esc(isAr() ? f[1] : fam(f[0]))}</option>`).join('')}<option value="+">${isAr() ? 'خط من جهازي…' : 'A font from my device…'}</option></select></label>
          <label>${B('الحجم', 'Size')}<input type="number" id="peS" min="5" max="200" step="1" value="${Math.round(it.size)}"></label></div>
        <div class="pe-row"><div class="pe-sw">${COLORS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" aria-checked="${c === it.color}"></button>`).join('')}<input type="color" id="peC" value="${it.color}"></div>
          <div class="pe-al"><button type="button" data-b aria-pressed="${it.bold}"><b>B</b></button>${['right', 'center', 'left'].map(a => `<button type="button" data-a="${a}" aria-pressed="${it.align === a}">${a === 'right' ? '⇥' : a === 'center' ? '↔' : '⇤'}</button>`).join('')}</div></div>
        <p class="pe-prev" id="peP"></p>
        <div class="sn-two"><button type="button" class="btn solid" id="peOk">${B('تم', 'Done')}</button><button type="button" class="btn ghost" id="peNo">${B('إلغاء', 'Cancel')}</button></div>`);
      const st = { text: it.text, font: it.font, size: it.size, color: it.color, bold: it.bold, align: it.align };
      const ta = sh.querySelector('#peT'), pv = sh.querySelector('#peP');
      const show = () => Object.assign(pv.style, { fontFamily: `"${fam(st.font)}", sans-serif`, fontWeight: st.bold ? 700 : 400, color: st.color, textAlign: st.align, direction: /[؀-ۿ]/.test(ta.value) ? 'rtl' : 'ltr' }) && (pv.textContent = ta.value || (isAr() ? 'معاينة الخط' : 'Font preview'));
      ta.oninput = show;
      sh.querySelector('#peF').onchange = async e => {
        if (e.target.value === '+') { const ff = root.querySelector('#peFont'); ff.value = ''; ff.onchange = async () => {
          const f = ff.files[0]; if (!f) return; const name = f.name.replace(/\.[^.]+$/, '');
          try { const face = new FontFace(name, await f.arrayBuffer()); await face.load(); document.fonts.add(face); loaded.add('my:' + name); st.font = 'my:' + name;
            const o = document.createElement('option'); o.value = st.font; o.textContent = name; e.target.insertBefore(o, e.target.lastChild); e.target.value = st.font; show(); }
          catch (x) { toast(B('تعذّر قراءة ملف الخط.', 'The font file could not be read.'), 1); e.target.value = st.font; } }; ff.click(); return; }
        st.font = e.target.value; await loadFont(st.font); show();
      };
      sh.querySelector('#peS').oninput = e => { st.size = Math.max(5, Math.min(200, +e.target.value || 14)); };
      sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { st.color = b.dataset.c; sh.querySelector('#peC').value = st.color; sh.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-checked', x === b)); show(); });
      sh.querySelector('#peC').oninput = e => { st.color = e.target.value; sh.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-checked', 'false')); show(); };
      sh.querySelector('[data-b]').onclick = e => { st.bold = !st.bold; e.currentTarget.setAttribute('aria-pressed', st.bold); show(); };
      sh.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { st.align = b.dataset.a; sh.querySelectorAll('[data-a]').forEach(x => x.setAttribute('aria-pressed', x === b)); show(); });
      sh.querySelector('#peNo').onclick = close;
      sh.querySelector('#peOk').onclick = async () => {
        st.text = ta.value.replace(/\s+$/, ''); close();
        if (!st.text) { if (!isNew) { items = items.filter(x => x !== it); it.el && it.el.remove(); } return; }
        await loadFont(st.font); Object.assign(it, st);
        if (isNew) { items.push(it); mount(it); } else place(it);
        select(it);
      };
      show(); setTimeout(() => ta.focus(), 50);
    }
    // the page colour around a box: the most common colour on a ring just outside it
    function bgOf(it) {
      const v = views[it.p], c = v && v.wrap.firstChild; if (!c || !v.done) return '#ffffff';
      const r = c.width / v.w, x0 = Math.max(0, Math.round((it.x - 3) * r)), y0 = Math.max(0, Math.round((it.y - 3) * r)), x1 = Math.min(c.width - 1, Math.round((it.x + it.w + 3) * r)), y1 = Math.min(c.height - 1, Math.round((it.y + it.h + 3) * r));
      if (x1 <= x0 || y1 <= y0) return '#ffffff';
      const d = c.getContext('2d').getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1), W = d.width, H = d.height, n = {};
      const add = (x, y) => { const i = (y * W + x) * 4, k = (d.data[i] >> 3) + ',' + (d.data[i + 1] >> 3) + ',' + (d.data[i + 2] >> 3), e = n[k] || (n[k] = [0, 0, 0, 0]); e[0]++; e[1] += d.data[i]; e[2] += d.data[i + 1]; e[3] += d.data[i + 2]; };
      for (let x = 0; x < W; x += 2) { add(x, 0); add(x, H - 1); } for (let y = 0; y < H; y += 2) { add(0, y); add(W - 1, y); }
      const e = n[Object.keys(n).sort((a, b) => n[b][0] - n[a][0])[0]], best = [1, 2, 3].map(j => Math.round(e[j] / e[0]));
      return '#' + best.map(v => v.toString(16).padStart(2, '0')).join('');
    }
    function editCover(it) {
      const { sh, close } = sheet(`<h3>${B('لون الإخفاء', 'Cover colour')}</h3><p class="pt-fine">${B('يأخذ المربع لون الصفحة حوله تلقائيًا، أو اختر لونًا بنفسك.', 'The box takes the colour of the page around it automatically, or pick one yourself.')}</p>
        <div class="pe-row"><button type="button" class="btn ghost" id="peAuto"${it.auto ? ' aria-pressed="true"' : ''}>${B('مطابقة لون الخلفية', 'Match the background')}</button><div class="pe-sw">${['#ffffff', '#f4f4f4', '#111111'].map(c => `<button type="button" data-c="${c}" style="--c:${c}" aria-checked="${!it.auto && c === it.color}"></button>`).join('')}<input type="color" id="peC" value="${it.color}"></div></div>
        <div class="sn-two"><button type="button" class="btn solid" id="peOk">${B('تم', 'Done')}</button></div>`);
      sh.querySelector('#peAuto').onclick = () => { it.auto = true; it.color = bgOf(it); place(it); close(); };
      sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { it.auto = false; it.color = b.dataset.c; place(it); close(); });
      sh.querySelector('#peC').oninput = e => { it.auto = false; it.color = e.target.value; place(it); };
      sh.querySelector('#peOk').onclick = close;
    }

    /* ---------- save ---------- */
    function textPng(it) {
      const S = 6, pad = 0, c = document.createElement('canvas'), x = c.getContext('2d');
      const font = `${it.bold ? 700 : 400} ${it.size * S}px "${fam(it.font)}", "IBM Plex Sans Arabic", sans-serif`, lines = it.text.split('\n'), lh = it.size * 1.4 * S;
      x.font = font;
      c.width = Math.ceil(it.w * S); c.height = Math.ceil(it.h * S);
      x.font = font; x.fillStyle = it.color; x.textBaseline = 'middle';
      const rtl = /[؀-ۿ]/.test(it.text); x.direction = rtl ? 'rtl' : 'ltr';
      const padX = 2 * S;
      lines.forEach((ln, i) => {
        const y = (i + .5) * lh + 2 * S;
        if (it.align === 'center') { x.textAlign = 'center'; x.fillText(ln, c.width / 2, y); }
        else if (it.align === 'left') { x.textAlign = 'left'; x.direction = 'ltr'; x.fillText(ln, padX, y); x.direction = rtl ? 'rtl' : 'ltr'; }
        else { x.textAlign = 'right'; x.fillText(ln, c.width - padX, y); }
      });
      return c.toDataURL('image/png');
    }
    const toPng = src => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res(c.toDataURL('image/png')); }; im.src = src; });
    root.querySelector('#peSave').onclick = async ev => {
      if (!items.length) { toast(B('لم تُضف شيئًا بعد.', 'Nothing has been added yet.'), 1); return; }
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const out = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }), pages = out.getPages();
        // covers first, then images and text, so text written over a cover stays visible
        const order = items.filter(i => i.t === 'cover').concat(items.filter(i => i.t !== 'cover'));
        for (const it of order) {
          const pg = pages[it.p], mb = pg.getMediaBox(), H = views[it.p].h, y0 = mb.y + H - it.y - it.h, x0 = mb.x + it.x;
          if (it.t === 'cover') { const h = it.color.replace('#', ''), n = i => parseInt(h.substr(i, 2), 16) / 255; pg.drawRectangle({ x: x0, y: y0, width: it.w, height: it.h, color: PDFLib.rgb(n(0), n(2), n(4)) }); continue; }
          const png = it.t === 'text' ? textPng(it) : await toPng(it.src), im = await out.embedPng(png);
          pg.drawImage(im, { x: x0, y: y0, width: it.w, height: it.h });
        }
        const bytes = await out.save();
        deliver(bytes, baseName(file.name) + (isAr() ? ' - معدّل' : ' - edited') + '.pdf', btn);
      } catch (e) { toast(B('تعذّر حفظ الملف.', 'The file could not be saved.'), 1); }
      btn.disabled = false;
    };
    inp.click();
  };
})();

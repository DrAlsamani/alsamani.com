/* alsamani.com/tools/certificates — one certificate per name from a design and a list. Runs on the device.
   Text is drawn by the browser (correct Arabic joining) and placed on the design as a sharp image. */
(function () {
  const root = document.getElementById('ct');
  if (!root) return;
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (html, bad) => {
    let t = document.getElementById('ctToast');
    if (!t) { t = document.createElement('div'); t.id = 'ctToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };
  const FONTS = [['Noto Naskh Arabic', 'نسخ'], ['Amiri', 'أميري'], ['Aref Ruqaa', 'رقعة'], ['Reem Kufi', 'ريم كوفي'], ['Cairo', 'القاهرة'], ['Tajawal', 'تجوّل'], ['IBM Plex Sans Arabic', 'آي بي إم بلكس']];
  const COLORS = ['#111111', '#1d3a8f', '#8a6d1d', '#b3261e'];
  const loaded = new Set();
  const fam = f => f.startsWith('my:') ? f.slice(3) : f;
  function loadFont(f) {
    if (loaded.has(f) || f.startsWith('my:')) return Promise.resolve();
    loaded.add(f);
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;700&display=swap';
    document.head.appendChild(l);
    return new Promise(r => { l.onload = r; l.onerror = r; }).then(() => Promise.all([document.fonts.load(`400 20px "${f}"`, 'ابج'), document.fonts.load(`700 20px "${f}"`, 'ابج')])).catch(() => {});
  }
  const rtlOf = s => /[؀-ۿ]/.test(s);
  const meas = document.createElement('canvas').getContext('2d');
  // the size that fits the box: long names shrink instead of overflowing
  function fitSize(f, text) {
    meas.font = `${f.bold ? 700 : 400} 100px "${fam(f.font)}", sans-serif`;
    const w = meas.measureText(text || ' ').width / 100;
    return w * f.size > f.w - 4 ? Math.max(4, (f.w - 4) / w) : f.size;
  }
  function save(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (/iP(hone|ad|od)|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  let bg = null, rows = [], cur = 0, fields = [], sel = null, seq = 0, view = null;
  root.innerHTML = `<div class="sn-card">
    <h2>${B('١. تصميم الشهادة', '1. The certificate design')}</h2>
    <p>${B('ارفع الشهادة فارغة من الأسماء، بصيغة PDF أو صورة.', 'Upload the certificate without names, as a PDF or an image.')}</p>
    <input type="file" id="ctBg" accept="application/pdf,.pdf,image/*" hidden>
    <div class="sn-two"><button type="button" class="btn ghost" id="ctBgB">${B('اختيار التصميم', 'Choose the design')}</button></div><p class="pt-file" id="ctBgN" hidden></p>
  </div>
  <div class="sn-card">
    <h2>${B('٢. الأسماء', '2. The names')}</h2>
    <p>${B('اسم في كل سطر، أو الصق من إكسل: كل عمود يصبح حقلًا تضعه في الشهادة (الاسم، الدورة، الرقم…).', 'One name per line, or paste from Excel: each column becomes a field you can place (name, course, number…).')}</p>
    <textarea id="ctNames" rows="6" dir="auto"></textarea><p class="pt-fine" id="ctCount"></p>
  </div>
  <div class="sn-card" id="ctEd" hidden>
    <h2>${B('٣. ضع الحقول على الشهادة', '3. Place the fields')}</h2>
    <p class="pt-fine">${B('اسحب الحقل إلى موضعه، وعدّل عرضه من الزاوية، واضغطه لتغيير الخط والحجم واللون. الاسم الطويل يصغر تلقائيًا ليبقى داخل الحقل.', 'Drag a field into place, set its width from the corner, and tap it to change font, size and colour. Long names shrink automatically to stay inside the field.')}</p>
    <div class="pe-bar ct-bar"><button type="button" data-add="col"><b>T</b>${B('حقل من القائمة', 'Field from the list')}</button><button type="button" data-add="fix"><b>Aa</b>${B('نص ثابت', 'Fixed text')}</button><button type="button" data-add="img"><b>▣</b>${B('توقيع أو ختم', 'Signature or stamp')}</button>
      <span></span><span class="ct-nav"><button type="button" data-n="-1" aria-label="previous">‹</button><b id="ctPos"></b><button type="button" data-n="1" aria-label="next">›</button></span></div>
    <div class="ct-stage" id="ctStage"></div>
  </div>
  <div class="sn-card" id="ctOut" hidden>
    <h2>${B('٤. إنشاء الشهادات', '4. Make the certificates')}</h2>
    <div class="sn-two"><button type="button" class="btn solid" id="ctOne">${B('ملف PDF واحد للجميع', 'One PDF for everyone')}</button><button type="button" class="btn ghost" id="ctZip">${B('ملف لكل اسم (ZIP)', 'A file per name (ZIP)')}</button></div>
    <p class="pt-status" id="ctSt" aria-live="polite"></p>
  </div>
  <p class="pt-fine">${B('تُعالَج الملفات داخل جهازك، ولا تُرفع إلى أي مكان.', 'Files are processed on your device and are not uploaded anywhere.')}</p>
  <input type="file" id="ctImg" accept="image/*" hidden><input type="file" id="ctFont" accept=".ttf,.otf,.woff,.woff2" hidden>`;
  const q = s => root.querySelector(s);

  /* ---------- design ---------- */
  q('#ctBgB').onclick = () => q('#ctBg').click();
  q('#ctBg').onchange = async () => {
    const f = q('#ctBg').files[0]; if (!f) return;
    try {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        const buf = await f.arrayBuffer(), d = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true }).promise;
        const pg = await d.getPage(1), v = pg.getViewport({ scale: 1 });
        bg = { pdf: true, buf, pg, w: v.width, h: v.height };
      } else {
        const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
        const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
        const W = im.width > im.height ? 842 : 595; bg = { pdf: false, url, im, w: W, h: W * im.height / im.width };
      }
    } catch (e) { toast(B('تعذّر فتح التصميم.', 'The design could not be opened.'), 1); return; }
    q('#ctBgN').hidden = false; q('#ctBgN').innerHTML = `<bdi>${esc(f.name)}</bdi>`; q('#ctBgB').innerHTML = B('تغيير التصميم', 'Change the design');
    if (!fields.length) { await loadFont(FONTS[0][0]); fields.push({ id: ++seq, t: 'col', col: 0, x: bg.w * .2, y: bg.h * .45, w: bg.w * .6, size: Math.round(bg.w / 22), font: FONTS[0][0], color: '#111111', bold: true, align: 'center' }); }
    ready(); await draw();
  };
  /* ---------- names ---------- */
  q('#ctNames').oninput = () => {
    rows = q('#ctNames').value.split(/\r?\n/).map(l => l.split('\t').map(x => x.trim())).filter(r => r.some(Boolean));
    cur = Math.min(cur, Math.max(0, rows.length - 1));
    q('#ctCount').textContent = rows.length ? (isAr() ? rows.length + ' شهادة' : rows.length + (rows.length === 1 ? ' certificate' : ' certificates')) : '';
    ready(); refresh();
  };
  function ready() { q('#ctEd').hidden = !bg; q('#ctOut').hidden = !(bg && rows.length); }
  const SAMPLE = () => [isAr() ? 'الاسم الكامل' : 'Full name'];
  // fixed text may carry {1}, {2}… which take the values of those columns
  const valFor = (f, row) => f.t === 'fix' ? f.text.replace(/\{(\d+)\}/g, (m, n) => row[n - 1] != null ? row[n - 1] : m) : (row[f.col] || '');
  const val = f => valFor(f, rows[cur] || SAMPLE());
  // one drawing routine for the screen and the file, so what you see is what you get
  function wrap(x, text, max) {
    const out = [];
    text.split('\n').forEach(par => {
      const words = par.split(/ +/); let line = '';
      words.forEach(w => { const t = line ? line + ' ' + w : w; if (line && x.measureText(t).width > max) { out.push(line); line = w; } else line = t; });
      out.push(line);
    });
    return out;
  }
  function render(f, v, S) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), p = 2 * S, multi = f.t === 'fix';
    const sz = multi ? f.size : fitSize(f, v), lh = (multi ? (f.lh || 1.6) : 1.5) * f.size * S;
    x.font = `${f.bold ? 700 : 400} ${sz * S}px "${fam(f.font)}", sans-serif`;
    const lines = multi ? wrap(x, v, f.w * S - 2 * p) : [v];
    c.width = Math.ceil(f.w * S); c.height = Math.ceil(lines.length * lh);
    x.font = `${f.bold ? 700 : 400} ${sz * S}px "${fam(f.font)}", sans-serif`; x.fillStyle = f.color; x.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      const y = (i + .5) * lh; x.direction = rtlOf(ln || v) ? 'rtl' : 'ltr';
      if (f.align === 'center') { x.textAlign = 'center'; x.fillText(ln, c.width / 2, y); }
      else if (f.align === 'left') { x.textAlign = 'left'; x.direction = 'ltr'; x.fillText(ln, p, y); }
      else { x.textAlign = 'right'; x.fillText(ln, c.width - p, y); }
    });
    return { c, h: c.height / S };
  }

  /* ---------- stage ---------- */
  async function draw() {
    const st = q('#ctStage'); st.innerHTML = '';
    const W = Math.min(st.clientWidth || 700, 900), k = W / bg.w;
    const wrap = document.createElement('div'); wrap.className = 'pe-pg'; wrap.style.width = W + 'px'; wrap.style.height = bg.h * k + 'px';
    const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1); c.width = W * d; c.height = bg.h * k * d; wrap.appendChild(c); st.appendChild(wrap);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    if (bg.pdf) await bg.pg.render({ canvasContext: x, viewport: bg.pg.getViewport({ scale: k * d }) }).promise; else x.drawImage(bg.im, 0, 0, c.width, c.height);
    view = { wrap, k }; fields.forEach(mount); refresh();
  }
  let rw = window.innerWidth, rt; window.addEventListener('resize', () => { if (!bg || Math.abs(window.innerWidth - rw) < 40) return; rw = window.innerWidth; clearTimeout(rt); rt = setTimeout(draw, 250); });
  function refresh() {
    if (!view) return;
    q('#ctPos').textContent = rows.length ? (cur + 1) + ' / ' + rows.length : '—';
    fields.forEach(place);
  }
  root.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { if (!rows.length) return; cur = (cur + +b.dataset.n + rows.length) % rows.length; refresh(); });
  function mount(f) {
    if (f.el) f.el.remove();
    const el = document.createElement('div'); el.className = 'pe-it ' + (f.t === 'img' ? 'pe-img' : 'pe-text ct-f'); f.el = el;
    el.innerHTML = (f.t === 'img' ? `<img src="${f.src}" alt="">` : '<span class="ct-c"></span>') + '<i class="pe-rz" aria-hidden="true"></i><button type="button" class="pe-x" aria-label="delete">×</button>';
    view.wrap.appendChild(el); place(f); drag(f);
    el.querySelector('.pe-x').onclick = ev => { ev.stopPropagation(); fields = fields.filter(x => x !== f); el.remove(); };
  }
  function place(f) {
    const k = view.k, el = f.el; if (!el) return;
    if (f.t === 'img') { Object.assign(el.style, { left: f.x * k + 'px', top: f.y * k + 'px', width: f.w * k + 'px', height: f.h * k + 'px' }); return; }
    const v = val(f), d = Math.min(3, window.devicePixelRatio || 1), r = render(f, v, k * d);
    f.h = r.h;
    Object.assign(el.style, { left: f.x * k + 'px', top: f.y * k + 'px', width: f.w * k + 'px', height: r.h * k + 'px' });
    r.c.style.width = '100%'; r.c.style.height = '100%'; r.c.style.display = 'block';
    const s = el.querySelector('.ct-c'); s.innerHTML = ''; s.appendChild(r.c);
  }
  function select(f) { sel = f; root.querySelectorAll('.pe-it').forEach(x => x.classList.toggle('on', x === (f && f.el))); }
  document.addEventListener('pointerdown', e => { if (sel && !e.target.closest('.pe-it') && !e.target.closest('.pe-sheet')) select(null); });
  function drag(f) {
    const el = f.el;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.pe-x')) return;
      e.preventDefault(); select(f);
      const k = view.k, rz = e.target.classList.contains('pe-rz'), sx = e.clientX, sy = e.clientY, o = { x: f.x, y: f.y, w: f.w, h: f.h };
      let moved = false; el.setPointerCapture(e.pointerId);
      const mv = ev => {
        const dx = (ev.clientX - sx) / k, dy = (ev.clientY - sy) / k; if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        if (!rz) { f.x = o.x + dx; f.y = o.y + dy; }
        else if (f.t === 'img') { f.w = Math.max(10, o.w + dx); f.h = f.w * o.h / o.w; }
        else f.w = Math.max(20, o.w + dx);
        place(f);
      };
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (!moved && !rz && f.t !== 'img') edit(f); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
  root.querySelectorAll('[data-add]').forEach(b => b.onclick = async () => {
    if (!bg) return;
    const kind = b.dataset.add, last = fields.filter(x => x.t !== 'img').pop() || { font: FONTS[0][0], color: '#111111', size: Math.round(bg.w / 40) };
    if (kind === 'img') {
      const fi = q('#ctImg'); fi.value = '';
      fi.onchange = () => { const file = fi.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
        const w = bg.w * .16, f = { id: ++seq, t: 'img', src: r.result, x: bg.w * .42, y: bg.h * .72, w, h: w * im.height / im.width }; fields.push(f); mount(f); select(f); }; im.src = r.result; }; r.readAsDataURL(file); };
      fi.click(); return;
    }
    const used = fields.filter(x => x.t === 'col').map(x => x.col), ncol = Math.max(1, ...rows.map(r => r.length));
    const f = { id: ++seq, t: kind, col: kind === 'col' ? Math.min(ncol - 1, used.length ? Math.max(...used) + 1 : 0) : 0, text: kind === 'fix' ? '' : undefined,
      x: kind === 'fix' ? bg.w * .15 : bg.w * .25, y: bg.h * .6, w: kind === 'fix' ? bg.w * .7 : bg.w * .5, lh: 1.6, size: Math.round(last.size * .7), font: last.font, color: last.color, bold: false, align: 'center' };
    if (kind === 'fix') { edit(f, true); return; }
    fields.push(f); mount(f); select(f); edit(f);
  });

  /* ---------- field settings ---------- */
  function sheet(html) {
    document.querySelectorAll('.pe-sheet,.pe-bg').forEach(x => x.remove());
    const b = document.createElement('div'); b.className = 'pe-bg'; const sh = document.createElement('div'); sh.className = 'pe-sheet'; sh.innerHTML = html;
    document.body.append(b, sh); b.onclick = () => { b.remove(); sh.remove(); };
    return { sh, close: () => { b.remove(); sh.remove(); } };
  }
  function edit(f, isNew) {
    const ncol = Math.max(1, ...rows.map(r => r.length)), list = FONTS.concat(f.font.startsWith('my:') ? [[f.font, fam(f.font)]] : []);
    const { sh, close } = sheet(`<h3>${f.t === 'fix' ? B('نص ثابت', 'Fixed text') : B('حقل من القائمة', 'Field from the list')}</h3>
      ${f.t === 'fix' ? `<textarea id="cfT" rows="5" dir="auto" placeholder="${isAr() ? 'يشهد … بأن {1} قد حضر …' : 'This certifies that {1} attended …'}">${esc(f.text)}</textarea>
        <p class="pt-fine ct-ins">${B('إدراج من القائمة:', 'Insert from the list:')} ${Array.from({ length: ncol }, (_, i) => `<button type="button" class="sn-lnk" data-ins="${i + 1}">{${i + 1}}${rows[0] && rows[0][i] ? ' ' + esc(rows[0][i].slice(0, 18)) : ''}</button>`).join(' ')}</p>
        <label class="sn-lbl">${B('تباعد الأسطر', 'Line spacing')}<select id="cfL">${[1.2, 1.4, 1.6, 1.8, 2].map(v => `<option${v === (f.lh || 1.6) ? ' selected' : ''}>${v}</option>`).join('')}</select></label>` : `<label class="sn-lbl">${B('العمود', 'Column')}<select id="cfC">${Array.from({ length: ncol }, (_, i) => `<option value="${i}"${i === f.col ? ' selected' : ''}>${i + 1}${rows[0] && rows[0][i] ? ' — ' + esc(rows[0][i].slice(0, 30)) : ''}</option>`).join('')}</select></label>`}
      <div class="pe-row"><label>${B('الخط', 'Font')}<select id="cfF">${list.map(x => `<option value="${esc(x[0])}"${x[0] === f.font ? ' selected' : ''}>${esc(isAr() ? x[1] : fam(x[0]))}</option>`).join('')}<option value="+">${isAr() ? 'خط من جهازي…' : 'A font from my device…'}</option></select></label>
        <label>${B('الحجم', 'Size')}<input type="number" id="cfS" min="5" max="300" value="${Math.round(f.size)}"></label></div>
      <div class="pe-row"><div class="pe-sw">${COLORS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" aria-checked="${c === f.color}"></button>`).join('')}<input type="color" id="cfK" value="${f.color}"></div>
        <div class="pe-al"><button type="button" data-b aria-pressed="${f.bold}"><b>B</b></button>${['right', 'center', 'left'].map(a => `<button type="button" data-a="${a}" aria-pressed="${f.align === a}">${a === 'right' ? '⇥' : a === 'center' ? '↔' : '⇤'}</button>`).join('')}</div></div>
      <p class="pt-fine">${B('خط ثمانية وغيره: حمّله من مصدره الرسمي، ثم اختر «خط من جهازي». يُستخدم داخل جهازك فقط.', 'Fonts such as Thmanyah: download from the official source, then choose “A font from my device”. It is used on your device only.')}</p>
      <div class="sn-two"><button type="button" class="btn solid" id="cfOk">${B('تم', 'Done')}</button>${isNew ? `<button type="button" class="btn ghost" id="cfNo">${B('إلغاء', 'Cancel')}</button>` : ''}</div>`);
    const live = () => { if (!isNew) place(f); };
    sh.querySelectorAll('[data-ins]').forEach(b => b.onclick = () => { const t = sh.querySelector('#cfT'), a = t.selectionStart, z = t.selectionEnd, tok = '{' + b.dataset.ins + '}'; t.value = t.value.slice(0, a) + tok + t.value.slice(z); t.focus(); t.setSelectionRange(a + tok.length, a + tok.length); if (!isNew) { f.text = t.value; live(); } });
    if (sh.querySelector('#cfL')) sh.querySelector('#cfL').onchange = e => { f.lh = +e.target.value; live(); };
    if (sh.querySelector('#cfT') && !isNew) sh.querySelector('#cfT').oninput = e => { f.text = e.target.value; live(); };
    if (sh.querySelector('#cfC')) sh.querySelector('#cfC').onchange = e => { f.col = +e.target.value; live(); };
    sh.querySelector('#cfF').onchange = async e => {
      if (e.target.value === '+') { const ff = q('#ctFont'); ff.value = ''; ff.onchange = async () => {
        const file = ff.files[0]; if (!file) { e.target.value = f.font; return; } const name = file.name.replace(/\.[^.]+$/, '');
        try { const face = new FontFace(name, await file.arrayBuffer()); await face.load(); document.fonts.add(face); f.font = 'my:' + name;
          const o = document.createElement('option'); o.value = f.font; o.textContent = name; e.target.insertBefore(o, e.target.lastChild); e.target.value = f.font; live(); }
        catch (x) { toast(B('تعذّر قراءة ملف الخط.', 'The font file could not be read.'), 1); e.target.value = f.font; } }; ff.click(); return; }
      f.font = e.target.value; await loadFont(f.font); live();
    };
    sh.querySelector('#cfS').oninput = e => { f.size = Math.max(5, Math.min(300, +e.target.value || 20)); live(); };
    sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { f.color = b.dataset.c; sh.querySelector('#cfK').value = f.color; sh.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-checked', x === b)); live(); });
    sh.querySelector('#cfK').oninput = e => { f.color = e.target.value; live(); };
    sh.querySelector('[data-b]').onclick = e => { f.bold = !f.bold; e.currentTarget.setAttribute('aria-pressed', f.bold); live(); };
    sh.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { f.align = b.dataset.a; sh.querySelectorAll('[data-a]').forEach(x => x.setAttribute('aria-pressed', x === b)); live(); });
    if (sh.querySelector('#cfNo')) sh.querySelector('#cfNo').onclick = close;
    sh.querySelector('#cfOk').onclick = async () => {
      if (f.t === 'fix') { f.text = sh.querySelector('#cfT').value.replace(/\s+$/, ''); if (!f.text) { close(); if (!isNew) { fields = fields.filter(x => x !== f); f.el && f.el.remove(); } return; } }
      await loadFont(f.font); close();
      if (isNew) { fields.push(f); mount(f); select(f); } else place(f);
    };
  }

  /* ---------- output ---------- */
  const toPng = src => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res(c.toDataURL('image/png')); }; im.src = src; });
  async function page(out, src, imgs, row) {
    let p;
    if (bg.pdf) { [p] = await out.copyPages(src, [0]); out.addPage(p); }
    else { p = out.addPage([bg.w, bg.h]); p.drawImage(src, { x: 0, y: 0, width: bg.w, height: bg.h }); }
    const mb = p.getMediaBox();
    for (const f of fields) {
      if (f.t === 'img') { p.drawImage(imgs.get(f), { x: mb.x + f.x, y: mb.y + bg.h - f.y - f.h, width: f.w, height: f.h }); continue; }
      const v = valFor(f, row); if (!v.trim()) continue;
      const r = render(f, v, 6);
      p.drawImage(await out.embedPng(r.c.toDataURL('image/png')), { x: mb.x + f.x, y: mb.y + bg.h - f.y - r.h, width: f.w, height: r.h });
    }
  }
  async function prep(out) {
    const src = bg.pdf ? await PDFLib.PDFDocument.load(bg.buf, { ignoreEncryption: true }) : null;
    const bgImg = bg.pdf ? null : await out.embedPng(await toPng(bg.url));
    const imgs = new Map(); for (const f of fields.filter(x => x.t === 'img')) imgs.set(f, await out.embedPng(await toPng(f.src)));
    return { src: bg.pdf ? src : bgImg, imgs };
  }
  const nameOf = (r, i) => ((r[0] || 'certificate-' + (i + 1)).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80).trim() || 'certificate') + '.pdf';
  async function run(btn, zip) {
    if (!rows.length) return; btn.disabled = true; const st = q('#ctSt');
    try {
      await Promise.all(fields.filter(f => f.t !== 'img').map(f => loadFont(f.font)));
      if (!zip) {
        const out = await PDFLib.PDFDocument.create(), { src, imgs } = await prep(out);
        for (let i = 0; i < rows.length; i++) { st.textContent = (isAr() ? 'جارٍ الإنشاء… ' : 'Making… ') + (i + 1) + ' / ' + rows.length; await page(out, src, imgs, rows[i]); }
        const bytes = await out.save(); st.textContent = '';
        save(new Blob([bytes], { type: 'application/pdf' }), (isAr() ? 'الشهادات' : 'certificates') + '.pdf');
      } else {
        const z = new JSZip(), seen = {};
        for (let i = 0; i < rows.length; i++) {
          st.textContent = (isAr() ? 'جارٍ الإنشاء… ' : 'Making… ') + (i + 1) + ' / ' + rows.length;
          const out = await PDFLib.PDFDocument.create(), { src, imgs } = await prep(out); await page(out, src, imgs, rows[i]);
          let n = nameOf(rows[i], i); if (seen[n]) n = n.replace(/\.pdf$/, ` (${++seen[n]}).pdf`); else seen[n] = 1;
          z.file(n, await out.save());
        }
        st.textContent = '';
        save(await z.generateAsync({ type: 'blob' }), (isAr() ? 'الشهادات' : 'certificates') + '.zip');
      }
    } catch (e) { st.textContent = ''; toast(B('تعذّر إنشاء الشهادات.', 'The certificates could not be made.'), 1); }
    btn.disabled = false;
  }
  q('#ctOne').onclick = e => run(e.currentTarget, false);
  q('#ctZip').onclick = e => run(e.currentTarget, true);
})();

/* alsamani.com/tools/pdf — merge and arrange pages of PDFs and photos, or shrink a PDF. Everything runs on the device. */
(function () {
  const root = document.getElementById('pt');
  if (!root) return;
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kb = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
  const A4 = [595.28, 841.89];
  const toast = (html, bad) => {
    let t = document.getElementById('ptToast');
    if (!t) { t = document.createElement('div'); t.id = 'ptToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };
  const baseName = n => (n || 'file').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'file';
  // phones: system share sheet with a real PDF; computers: plain download
  function deliver(bytes, name, btn) {
    const file = new File([bytes], name, { type: 'application/pdf' });
    const mobile = /iP(hone|ad|od)|Android/i.test(navigator.userAgent);
    if (mobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(e => { if (e.name === 'NotAllowedError' && btn) { btn.onclick = () => navigator.share({ files: [file], title: name }).catch(() => {}); toast(B('اضغط الزر مرة أخرى للمشاركة.', 'Tap the button again to share.')); } });
      return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  const readBuf = f => f.arrayBuffer();
  function imgToJpeg(file, max) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(im.src);
        c.toBlob(b => b ? b.arrayBuffer().then(buf => res({ buf, w: c.width, h: c.height })) : rej(new Error('img')), 'image/jpeg', .85);
      };
      im.onerror = () => rej(new Error('img'));
      im.src = URL.createObjectURL(file);
    });
  }

  function home() {
    root.innerHTML = `
      <div class="pt-choices">
        <button type="button" class="pt-choice" data-go="merge"><span class="pt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="10" height="13" rx="2"/><rect x="11" y="8" width="10" height="13" rx="2"/></svg></span>
          <h2>${B('دمج وترتيب الصفحات', 'Merge and arrange pages')}</h2><p>${B('ملفات PDF وصور الأوراق في ملف واحد: رتّب الصفحات بالسحب، ودوّرها، واحذف ما لا تريد.', 'PDFs and photos of pages in one file: drag pages into order, rotate them, and delete what you do not need.')}</p></button>
        <button type="button" class="pt-choice" data-go="shrink"><span class="pt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg></span>
          <h2>${B('ضغط ملف', 'Shrink a file')}</h2><p>${B('تصغير حجم ملف PDF كبير ليُرسل بسهولة.', 'Make a large PDF smaller so it is easy to send.')}</p></button>
        <button type="button" class="pt-choice" data-go="edit"><span class="pt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg></span>
          <h2>${B('الكتابة على الصفحات', 'Write on pages')}</h2><p>${B('أضف نصًا أو صورة أو ختمًا، وأخفِ نصًا قديمًا واكتب بدله، دون أن يتلخبط الخط العربي.', 'Add text, an image or a stamp, and cover old text to write over it, without breaking Arabic text.')}</p></button>
      </div>
      <p class="pt-fine">${B('تُعالَج الملفات داخل جهازك، ولا تُرفع إلى أي مكان.', 'Files are processed on your device and are not uploaded anywhere.')}</p>`;
    root.querySelector('[data-go=merge]').onclick = merge;
    root.querySelector('[data-go=shrink]').onclick = shrink;
    root.querySelector('[data-go=edit]').onclick = () => window.PTEdit && window.PTEdit();
  }
  const back = `<button type="button" class="sn-lnk pt-back" data-back>${B('الرجوع', 'Back')}</button>`;

  /* ---------- merge and arrange: every page of every file as a card ---------- */
  function merge() {
    const srcs = [], pages = [], trash = [];
    let seq = 0, zi = 1;
    const ZW = [96, 140, 200, 280];
    root.innerHTML = `${back}<div class="sn-card">
      <h2>${B('دمج وترتيب الصفحات', 'Merge and arrange pages')}</h2>
      <p>${B('أضف ملفات PDF أو صورًا. اسحب الصفحة لتغيير مكانها، ودوّرها أو احذفها، واضغطها لعرضها مكبّرة.', 'Add PDFs or photos. Drag a page to move it, rotate or delete it, and tap it to see it large.')}</p>
      <input type="file" id="ptIn" accept="application/pdf,.pdf,image/*" multiple hidden>
      <div class="pt-bar" id="ptBar" hidden><span class="pt-cnt" id="ptCnt"></span><span class="pt-sp"></span>
        <button type="button" class="pt-tb" id="ptUndo" hidden>${B('تراجع', 'Undo')}</button>
        <button type="button" class="pt-tb" id="ptZo" aria-label="smaller">−</button><button type="button" class="pt-tb" id="ptZi" aria-label="larger">+</button></div>
      <div class="pt-grid" id="ptGrid"></div>
      <div class="sn-two"><button type="button" class="btn ghost" id="ptAdd">${B('إضافة ملفات', 'Add files')}</button></div>
      <label class="sn-lbl" id="ptNameL" hidden>${B('اسم الملف', 'File name')}<input type="text" id="ptName" maxlength="120"></label>
      <div class="sn-two"><button type="button" class="btn solid" id="ptGo" hidden>${B('إنشاء ملف PDF', 'Create the PDF')}</button></div>
      <p class="pt-status" id="ptSt" aria-live="polite"></p>
    </div>`;
    root.querySelector('[data-back]').onclick = home;
    const inp = root.querySelector('#ptIn'), grid = root.querySelector('#ptGrid'), go = root.querySelector('#ptGo'), st = root.querySelector('#ptSt');
    root.querySelector('#ptAdd').onclick = () => inp.click();
    const setZ = () => { grid.style.setProperty('--pt-w', ZW[zi] + 'px'); root.querySelector('#ptZo').disabled = !zi; root.querySelector('#ptZi').disabled = zi === ZW.length - 1; };
    root.querySelector('#ptZo').onclick = () => { zi = Math.max(0, zi - 1); setZ(); };
    root.querySelector('#ptZi').onclick = () => { zi = Math.min(ZW.length - 1, zi + 1); setZ(); };
    root.querySelector('#ptUndo').onclick = () => { const t = trash.pop(); if (t) { pages.splice(Math.min(t.at, pages.length), 0, t.pg); draw(); } };
    setZ();
    inp.onchange = async () => {
      st.textContent = isAr() ? 'جارٍ فتح الملفات…' : 'Opening files…';
      for (const f of inp.files) {
        const pdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name), img = /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
        if (!pdf && !img) { toast(B('يُقبل PDF والصور فقط.', 'Only PDFs and images are accepted.'), 1); continue; }
        const s = { f, pdf };
        if (pdf) {
          try { s.buf = await readBuf(f); s.doc = await pdfjsLib.getDocument({ data: new Uint8Array(s.buf.slice(0)), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true }).promise; }
          catch (e) { toast(B('تعذّر فتح ملف: ', 'Could not open: ') + esc(f.name), 1); continue; }
          srcs.push(s); for (let i = 0; i < s.doc.numPages; i++) pages.push({ id: ++seq, s, i, rot: 0 });
        } else {
          s.url = URL.createObjectURL(f);
          try { await new Promise((ok, no) => { const im = new Image(); im.onload = () => { s.iw = im.naturalWidth; s.ih = im.naturalHeight; ok(); }; im.onerror = no; im.src = s.url; }); }
          catch (e) { toast(B('تعذّر فتح صورة: ', 'Could not open an image: ') + esc(f.name), 1); continue; }
          srcs.push(s); pages.push({ id: ++seq, s, i: 0, rot: 0, fit: 'fit' });
        }
      }
      inp.value = ''; st.textContent = ''; draw();
      const nm = root.querySelector('#ptName'); if (!nm.value && srcs[0]) nm.value = baseName(srcs[0].f.name);
    };
    // thumbnails are rendered once per page, when they scroll into view
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); thumb(en.target); } }), { rootMargin: '300px' });
    let base = null;
    async function baseSize() {
      if (base) return base;
      const s0 = srcs.find(x => x.pdf);
      if (s0) { const v = (await s0.doc.getPage(1)).getViewport({ scale: 1 }); base = [Math.min(v.width, v.height), Math.max(v.width, v.height)]; }
      return base || [A4[0], A4[1]];
    }
    async function pageWH(s) { const [a, b] = await baseSize(); return s.iw > s.ih ? [b, a] : [a, b]; }
    async function imgBox(pg, el) {
      const [W, H] = await pageWH(pg.s), m = pg.fit === 'fit' ? 18 / W * 100 : 0;
      el.innerHTML = `<div class="pt-ip" style="aspect-ratio:${W}/${H};padding:${m}% ${m}%"><img src="${pg.s.url}" alt="" style="object-fit:${pg.fit === 'fill' ? 'cover' : 'contain'}"></div>`;
    }
    async function render(pg, w) {
      const page = await pg.s.doc.getPage(pg.i + 1), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: w / vp1.width });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: vp }).promise; return c;
    }
    async function thumb(el) {
      const pg = pages.find(p => p.id === +el.dataset.id); if (!pg) return;
      const box = el.querySelector('.pt-th');
      if (!pg.s.pdf) { imgBox(pg, box); return; }
      try { if (!pg.c) pg.c = await render(pg, 420); box.innerHTML = ''; const im = new Image(); im.src = pg.c.toDataURL('image/jpeg', .8); im.alt = ''; box.appendChild(im); } catch (e) {}
    }
    function draw() {
      grid.innerHTML = pages.map((pg, n) => `<div class="pt-pg" data-id="${pg.id}"><div class="pt-th" style="--r:${pg.rot}deg"></div>
        <div class="pt-pf"><button type="button" data-mv="-1" aria-label="${isAr() ? 'قبل' : 'earlier'}"${n ? '' : ' disabled'}>${isAr() ? '→' : '←'}</button><span>${n + 1}</span><button type="button" data-mv="1" aria-label="${isAr() ? 'بعد' : 'later'}"${n < pages.length - 1 ? '' : ' disabled'}>${isAr() ? '←' : '→'}</button></div>
        <div class="pt-pf">${pg.s.pdf ? '' : `<button type="button" class="pt-fit" data-fit title="${isAr() ? 'ملاءمة الصورة للصفحة' : 'Fit the image to the page'}">${pg.fit === 'fill' ? B('ملء', 'Fill') : B('ملاءمة', 'Fit')}</button>`}<i></i><button type="button" data-rot aria-label="rotate" title="${isAr() ? 'تدوير' : 'Rotate'}">↻</button><button type="button" data-del aria-label="delete" title="${isAr() ? 'حذف' : 'Delete'}">×</button></div></div>`).join('');
      grid.querySelectorAll('.pt-pg').forEach(el => {
        const pg = pages.find(p => p.id === +el.dataset.id);
        if (pg.c) { const im = new Image(); im.src = pg.c.toDataURL('image/jpeg', .8); el.querySelector('.pt-th').appendChild(im); }
        else if (!pg.s.pdf) imgBox(pg, el.querySelector('.pt-th'));
        else io.observe(el);
        el.querySelector('[data-rot]').onclick = () => { pg.rot = (pg.rot + 90) % 360; el.querySelector('.pt-th').style.setProperty('--r', pg.rot + 'deg'); };
        el.querySelectorAll('[data-mv]').forEach(bt => bt.onclick = () => { const a = pages.indexOf(pg), b = a + +bt.dataset.mv; if (b < 0 || b >= pages.length) return; [pages[a], pages[b]] = [pages[b], pages[a]]; draw(); const nb = grid.querySelector(`[data-id="${pg.id}"] [data-mv="${bt.dataset.mv}"]`); if (nb && !nb.disabled) nb.focus(); });
        if (el.querySelector('[data-fit]')) el.querySelector('[data-fit]').onclick = () => { pg.fit = pg.fit === 'fill' ? 'fit' : 'fill'; draw(); };
        el.querySelector('[data-del]').onclick = () => { const at = pages.indexOf(pg); pages.splice(at, 1); trash.push({ at, pg }); draw(); };
        el.querySelector('.pt-th').onclick = () => big(pg);
      });
      if (window.Sortable && !grid._s) grid._s = Sortable.create(grid, { animation: 160, delay: 160, delayOnTouchOnly: true, filter: 'button', preventOnFilter: false, ghostClass: 'pt-ghost',
        onEnd: () => { const ord = [...grid.children].map(x => +x.dataset.id); pages.sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id)); draw(); } });
      const n = pages.length;
      root.querySelector('#ptBar').hidden = !n; root.querySelector('#ptUndo').hidden = !trash.length;
      root.querySelector('#ptCnt').innerHTML = B(n + ' صفحة', n + (n === 1 ? ' page' : ' pages'));
      go.hidden = !n; root.querySelector('#ptNameL').hidden = !n;
      go.innerHTML = B('إنشاء ملف PDF', 'Create the PDF'); go.onclick = make; st.textContent = '';
      root.querySelector('#ptAdd').innerHTML = n ? B('إضافة ملفات أخرى', 'Add more files') : B('إضافة ملفات', 'Add files');
    }
    async function big(pg) {
      const ov = document.createElement('div'); ov.className = 'pt-big';
      ov.innerHTML = `<div class="pt-bigin" style="--r:${pg.rot}deg"></div><button type="button" class="btn ghost">${B('إغلاق', 'Close')}</button>`;
      ov.onclick = () => ov.remove(); document.body.appendChild(ov);
      const box = ov.querySelector('.pt-bigin');
      if (!pg.s.pdf) { await imgBox(pg, box); return; }
      try { const c = await render(pg, Math.min(1600, Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1))); const im = new Image(); im.src = c.toDataURL('image/jpeg', .9); box.appendChild(im); } catch (e) {}
    }
    async function make() {
      go.disabled = true; st.textContent = isAr() ? 'جارٍ إنشاء الملف…' : 'Creating the file…';
      try {
        const out = await PDFLib.PDFDocument.create(), libs = new Map();
        for (const pg of pages) {
          let p;
          if (pg.s.pdf) {
            if (!libs.has(pg.s)) libs.set(pg.s, await PDFLib.PDFDocument.load(pg.s.buf, { ignoreEncryption: true }));
            [p] = await out.copyPages(libs.get(pg.s), [pg.i]); out.addPage(p);
            p.setRotation(PDFLib.degrees((p.getRotation().angle + pg.rot) % 360));
          } else {
            if (!pg.s.jpg) pg.s.jpg = await imgToJpeg(pg.s.f, 2200);
            const j = pg.s.jpg, im = await out.embedJpg(j.buf), [W, H] = await pageWH(pg.s), m = pg.fit === 'fill' ? 0 : 18;
            const k = pg.fit === 'fill' ? Math.max(W / j.w, H / j.h) : Math.min((W - 2 * m) / j.w, (H - 2 * m) / j.h);
            p = out.addPage([W, H]); p.drawImage(im, { x: (W - j.w * k) / 2, y: (H - j.h * k) / 2, width: j.w * k, height: j.h * k });
            if (pg.rot) p.setRotation(PDFLib.degrees(pg.rot));
          }
        }
        const bytes = await out.save(), name = (root.querySelector('#ptName').value.trim() || 'merged').replace(/[\\/:*?"<>|]+/g, ' ') + '.pdf';
        st.innerHTML = B(`الملف جاهز: ${out.getPageCount()} صفحة · ${kb(bytes.length)}`, `Ready: ${out.getPageCount()} pages · ${kb(bytes.length)}`);
        go.innerHTML = B('حفظ أو مشاركة الملف', 'Save or share the file'); go.disabled = false;
        go.onclick = () => deliver(bytes, name, go);
        deliver(bytes, name, go);
      } catch (e) { go.disabled = false; st.innerHTML = B('تعذّر إنشاء الملف. قد يكون أحد الملفات محميًا بكلمة مرور.', 'The file could not be created. One of the files may be password-protected.'); }
    }
    draw();
    inp.click();
  }

  /* ---------- shrink a PDF: pages are redrawn as compressed images ---------- */
  function shrink() {
    root.innerHTML = `${back}<div class="sn-card">
      <h2>${B('ضغط ملف', 'Shrink a file')}</h2>
      <input type="file" id="ptIn" accept="application/pdf,.pdf" hidden>
      <div class="sn-two"><button type="button" class="btn ghost" id="ptPick">${B('اختيار ملف PDF', 'Choose a PDF')}</button></div>
      <p class="pt-file" id="ptFile" hidden></p>
      <div class="pt-lv" id="ptLv" hidden role="radiogroup">
        <button type="button" role="radio" aria-checked="false" data-l="0"><b>${B('خفيف', 'Light')}</b><span>${B('أوضح جودة', 'Best quality')}</span></button>
        <button type="button" role="radio" aria-checked="true" data-l="1"><b>${B('متوسط', 'Medium')}</b><span>${B('مناسب للواتساب', 'Good for WhatsApp')}</span></button>
        <button type="button" role="radio" aria-checked="false" data-l="2"><b>${B('قوي', 'Strong')}</b><span>${B('أصغر حجم', 'Smallest size')}</span></button>
      </div>
      <p class="pt-fine" id="ptNote" hidden>${B('تتحول الصفحات إلى صور مضغوطة، فلا يمكن تحديد النص أو نسخه في الملف الناتج.', 'Pages become compressed images, so text in the result cannot be selected or copied.')}</p>
      <div class="sn-two"><button type="button" class="btn solid" id="ptGo" hidden>${B('ضغط الملف', 'Shrink the file')}</button></div>
      <p class="pt-status" id="ptSt" aria-live="polite"></p>
    </div>`;
    root.querySelector('[data-back]').onclick = home;
    const inp = root.querySelector('#ptIn'), go = root.querySelector('#ptGo'), st = root.querySelector('#ptSt');
    let file = null, lv = 1;
    const LV = [{ dpi: 150, q: .78 }, { dpi: 110, q: .62 }, { dpi: 80, q: .5 }];
    root.querySelector('#ptPick').onclick = () => inp.click();
    root.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lv = +b.dataset.l; root.querySelectorAll('[data-l]').forEach(x => x.setAttribute('aria-checked', x === b)); });
    inp.onchange = () => {
      file = inp.files[0]; if (!file) return;
      root.querySelector('#ptFile').hidden = false; root.querySelector('#ptFile').innerHTML = `<bdi>${esc(file.name)}</bdi> · ${kb(file.size)}`;
      ['#ptLv', '#ptNote', '#ptGo'].forEach(s => root.querySelector(s).hidden = false); st.textContent = '';
      go.innerHTML = B('ضغط الملف', 'Shrink the file'); go.onclick = run;
    };
    async function run() {
      go.disabled = true;
      try {
        const buf = await readBuf(file), doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/', disableFontFace: true }).promise;
        const out = await PDFLib.PDFDocument.create(), L = LV[lv];
        for (let p = 1; p <= doc.numPages; p++) {
          st.textContent = (isAr() ? 'جارٍ الضغط… صفحة ' : 'Shrinking… page ') + p + ' / ' + doc.numPages;
          const page = await doc.getPage(p), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: L.dpi / 72 });
          const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: x, viewport: vp }).promise;
          const jb = await new Promise(r => c.toBlob(r, 'image/jpeg', L.q)), im = await out.embedJpg(await jb.arrayBuffer());
          out.addPage([vp1.width, vp1.height]).drawImage(im, { x: 0, y: 0, width: vp1.width, height: vp1.height });
          c.width = c.height = 0;
        }
        const bytes = await out.save(), name = baseName(file.name) + (isAr() ? ' - مضغوط' : ' - small') + '.pdf';
        if (bytes.length >= file.size * .95) {
          st.innerHTML = B('الملف صغير أصلًا، ولم يُنتج الضغط حجمًا أقل. جرّب مستوى «قوي» أو أرسل الملف كما هو.', 'The file is already small; shrinking did not reduce it. Try “Strong”, or send the file as it is.');
          go.disabled = false; return;
        }
        st.innerHTML = B(`من ${kb(file.size)} إلى ${kb(bytes.length)}`, `From ${kb(file.size)} to ${kb(bytes.length)}`);
        go.innerHTML = B('حفظ أو مشاركة الملف', 'Save or share the file'); go.disabled = false;
        go.onclick = () => deliver(bytes, name, go);
        deliver(bytes, name, go);
      } catch (e) { go.disabled = false; st.innerHTML = B('تعذّر ضغط الملف. قد يكون محميًا بكلمة مرور.', 'The file could not be shrunk. It may be password-protected.'); }
    }
    inp.click();
  }

  window.PTK = { root, B, isAr, esc, toast, deliver, baseName, PDFJS, back, home, readBuf };
  const mode = new URLSearchParams(location.search).get('m');
  if (mode === 'merge') merge(); else if (mode === 'shrink') shrink(); else if (mode === 'edit') setTimeout(() => window.PTEdit && window.PTEdit()); else home();
})();

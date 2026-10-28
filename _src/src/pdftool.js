/* alsamani.com/tools/pdf — merge PDFs and photos into one PDF, or shrink a PDF. Everything runs on the device. */
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
          <h2>${B('دمج وتحويل', 'Merge and convert')}</h2><p>${B('عدة ملفات PDF أو صور أوراق في ملف PDF واحد، بالترتيب الذي تريده.', 'Several PDFs or photos of pages into one PDF, in the order you choose.')}</p></button>
        <button type="button" class="pt-choice" data-go="shrink"><span class="pt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg></span>
          <h2>${B('ضغط ملف', 'Shrink a file')}</h2><p>${B('تصغير حجم ملف PDF كبير ليُرسل بسهولة.', 'Make a large PDF smaller so it is easy to send.')}</p></button>
      </div>
      <p class="pt-fine">${B('تُعالَج الملفات داخل جهازك، ولا تُرفع إلى أي مكان.', 'Files are processed on your device and are not uploaded anywhere.')}</p>`;
    root.querySelector('[data-go=merge]').onclick = merge;
    root.querySelector('[data-go=shrink]').onclick = shrink;
  }
  const back = `<button type="button" class="sn-lnk pt-back" data-back>${B('الرجوع', 'Back')}</button>`;

  /* ---------- merge PDFs and images ---------- */
  function merge() {
    const items = [];
    root.innerHTML = `${back}<div class="sn-card">
      <h2>${B('دمج وتحويل', 'Merge and convert')}</h2>
      <p>${B('أضف ملفات PDF أو صورًا، ورتّبها بالأسهم، ثم أنشئ الملف.', 'Add PDFs or photos, order them with the arrows, then create the file.')}</p>
      <input type="file" id="ptIn" accept="application/pdf,.pdf,image/*" multiple hidden>
      <ol class="pt-list" id="ptList"></ol>
      <div class="sn-two"><button type="button" class="btn ghost" id="ptAdd">${B('إضافة ملفات', 'Add files')}</button></div>
      <label class="sn-lbl" id="ptNameL" hidden>${B('اسم الملف', 'File name')}<input type="text" id="ptName" maxlength="120"></label>
      <div class="sn-two"><button type="button" class="btn solid" id="ptGo" hidden>${B('إنشاء ملف PDF', 'Create the PDF')}</button></div>
      <p class="pt-status" id="ptSt" aria-live="polite"></p>
    </div>`;
    root.querySelector('[data-back]').onclick = home;
    const inp = root.querySelector('#ptIn'), list = root.querySelector('#ptList'), go = root.querySelector('#ptGo'), st = root.querySelector('#ptSt');
    root.querySelector('#ptAdd').onclick = () => inp.click();
    inp.onchange = async () => {
      for (const f of inp.files) {
        const pdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name), img = /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
        if (!pdf && !img) { toast(B('يُقبل PDF والصور فقط.', 'Only PDFs and images are accepted.'), 1); continue; }
        const it = { f, pdf, pages: img ? 1 : null };
        if (pdf) { try { const d = await pdfjsLib.getDocument({ data: new Uint8Array(await readBuf(f)) }).promise; it.pages = d.numPages; d.destroy(); } catch (e) { toast(B('تعذّر فتح ملف: ', 'Could not open: ') + esc(f.name), 1); continue; } }
        items.push(it);
      }
      inp.value = ''; draw();
      const nm = root.querySelector('#ptName'); if (!nm.value && items[0]) nm.value = baseName(items[0].f.name);
    };
    function draw() {
      list.innerHTML = items.map((it, i) => `<li><span class="pt-k">${it.pdf ? 'PDF' : B('صورة', 'Image')}</span><span class="pt-n"><bdi>${esc(it.f.name)}</bdi><small>${it.pdf ? it.pages + (isAr() ? ' صفحة · ' : ' pages · ') : ''}${kb(it.f.size)}</small></span>
        <span class="pt-act"><button type="button" data-u="${i}" aria-label="up"${i ? '' : ' disabled'}>↑</button><button type="button" data-d="${i}" aria-label="down"${i < items.length - 1 ? '' : ' disabled'}>↓</button><button type="button" data-r="${i}" aria-label="remove">×</button></span></li>`).join('');
      list.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const i = +b.dataset.u; [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); });
      list.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const i = +b.dataset.d; [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(); });
      list.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { items.splice(+b.dataset.r, 1); draw(); });
      go.hidden = !items.length; root.querySelector('#ptNameL').hidden = !items.length;
      go.innerHTML = B('إنشاء ملف PDF', 'Create the PDF'); go.onclick = make; st.textContent = '';
      root.querySelector('#ptAdd').innerHTML = items.length ? B('إضافة ملفات أخرى', 'Add more files') : B('إضافة ملفات', 'Add files');
    }
    async function make() {
      go.disabled = true; st.textContent = isAr() ? 'جارٍ إنشاء الملف…' : 'Creating the file…';
      try {
        const out = await PDFLib.PDFDocument.create();
        for (const it of items) {
          if (it.pdf) {
            const src = await PDFLib.PDFDocument.load(await readBuf(it.f), { ignoreEncryption: true });
            (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p));
          } else {
            const j = await imgToJpeg(it.f, 2200), im = await out.embedJpg(j.buf);
            const land = j.w > j.h, W = land ? A4[1] : A4[0], H = land ? A4[0] : A4[1], m = 18, k = Math.min((W - 2 * m) / j.w, (H - 2 * m) / j.h);
            const pg = out.addPage([W, H]); pg.drawImage(im, { x: (W - j.w * k) / 2, y: (H - j.h * k) / 2, width: j.w * k, height: j.h * k });
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

  const mode = new URLSearchParams(location.search).get('m');
  if (mode === 'merge') merge(); else if (mode === 'shrink') shrink(); else home();
})();

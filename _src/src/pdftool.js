/* alsamani.com/tools/pdf — home and shrinking; the editor (merge, arrange, write) is in pdfedit.js. Everything runs on the device. */
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
        <button type="button" class="pt-choice" data-go="edit"><span class="pt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l5-5 2 2-5 5H9z"/></svg></span>
          <h2>${B('تحرير ودمج', 'Edit and merge')}</h2><p>${B('اكتب على الصفحات وعبّئ النماذج بعلامات ✓، وأضف صورة أو ختمًا، وادمج الملفات ورتّب صفحاتها.', 'Write on pages and fill forms with ✓ marks, add an image or stamp, and merge files and arrange their pages.')}</p></button>
        <button type="button" class="pt-choice" data-go="shrink"><span class="pt-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg></span>
          <h2>${B('ضغط ملف', 'Shrink a file')}</h2><p>${B('تصغير حجم ملف PDF كبير ليُرسل بسهولة.', 'Make a large PDF smaller so it is easy to send.')}</p></button>
      </div>
      <p class="pt-fine">${B('تُعالَج الملفات داخل جهازك، ولا تُرفع إلى أي مكان.', 'Files are processed on your device and are not uploaded anywhere.')}</p>`;
    root.querySelector('[data-go=shrink]').onclick = shrink;
    root.querySelector('[data-go=edit]').onclick = () => window.PTEdit && window.PTEdit();
  }
  const back = `<button type="button" class="sn-lnk pt-back" data-back>${B('الرجوع', 'Back')}</button>`;

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

  window.PTK = { root, B, isAr, esc, toast, deliver, baseName, PDFJS, back, home, readBuf, imgToJpeg, A4 };
  const mode = new URLSearchParams(location.search).get('m');
  if (mode === 'shrink') shrink(); else if (mode === 'edit' || mode === 'merge') setTimeout(() => window.PTEdit && window.PTEdit()); else home();
})();

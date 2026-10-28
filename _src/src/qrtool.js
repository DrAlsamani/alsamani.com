/* alsamani.com/tools/qr — turn a link or text into a QR code; PNG for slides and documents, SVG for print. Runs on the device. */
(function () {
  const root = document.getElementById('qt');
  if (!root) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  root.innerHTML = `<div class="sn-card">
    <label class="sn-lbl">${B('الرابط أو النص', 'Link or text')}<textarea id="qtIn" rows="3" maxlength="1500" dir="auto" placeholder="https://"></textarea></label>
    <label class="sn-lbl">${B('عنوان فوق الرمز (اختياري)', 'Caption above the code (optional)')}<input type="text" id="qtCap" maxlength="80"></label>
    <div class="qt-out" id="qtOut" hidden><div class="qt-card"><p class="qt-cap" id="qtCapV"></p><div id="qtSvg"></div></div>
      <div class="sn-two"><button type="button" class="btn solid" id="qtPng">${B('تحميل صورة PNG', 'Download PNG')}</button><button type="button" class="btn ghost" id="qtSv">${B('تحميل SVG للطباعة', 'Download SVG for print')}</button></div></div>
    <details class="qt-tip"><summary>${B('عدة ملفات في رمز واحد؟', 'Several files in one code?')}</summary>
      <p>${B('ضعها في مجلد على Google Drive أو OneDrive، واجعل المشاركة «أي شخص لديه الرابط»، ثم انسخ رابط المجلد والصقه هنا. يبقى الرمز صالحًا ما دام المجلد مشاركًا، وما تضيفه إلى المجلد لاحقًا يظهر لمن يمسح الرمز.', 'Put them in a Google Drive or OneDrive folder, share it with “anyone with the link”, then paste the folder link here. The code works as long as the folder is shared, and anything you add to the folder later appears for whoever scans it.')}</p></details>
    <p class="pt-fine">${B('يُنشأ الرمز داخل جهازك، ولا تنتهي صلاحيته.', 'The code is made on your device and does not expire.')}</p>
  </div>`;
  const inp = root.querySelector('#qtIn'), cap = root.querySelector('#qtCap'), out = root.querySelector('#qtOut');
  let q = null;
  function make() {
    const v = inp.value.trim();
    out.hidden = !v; if (!v) { q = null; return; }
    try { q = qrcode(0, v.length > 300 ? 'L' : 'M'); q.addData(unescape(encodeURIComponent(v))); q.make(); }
    catch (e) { out.hidden = true; return; }
    root.querySelector('#qtSvg').innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    root.querySelector('#qtCapV').textContent = cap.value.trim();
  }
  inp.oninput = cap.oninput = make;
  const p = new URLSearchParams(location.search).get('u'); if (p) { inp.value = p; make(); }
  const fname = ext => 'QR - ' + ((cap.value.trim() || inp.value.trim().replace(/^https?:\/\/(www\.)?/, '')).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 50).trim() || 'code') + '.' + ext;
  function save(blob, name) {
    const f = new File([blob], name, { type: blob.type });
    if (/iP(hone|ad|od)|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  root.querySelector('#qtPng').onclick = () => {
    if (!q) return;
    const n = q.getModuleCount(), cell = Math.max(8, Math.ceil(1200 / (n + 8))), m = cell * 4, W = n * cell + 2 * m, t = cap.value.trim(), th = t ? Math.round(W * .13) : 0;
    const c = document.createElement('canvas'); c.width = W; c.height = W + th;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    if (t) { x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = /[؀-ۿ]/.test(t) ? 'rtl' : 'ltr';
      let fs = Math.round(W * .065); x.font = `600 ${fs}px "IBM Plex Sans Arabic", Tahoma, Arial, sans-serif`;
      while (x.measureText(t).width > W - 2 * m && fs > 16) { fs -= 2; x.font = `600 ${fs}px "IBM Plex Sans Arabic", Tahoma, Arial, sans-serif`; }
      x.fillText(t, W / 2, th * .62); }
    x.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(m + k * cell, th + m + r * cell, cell, cell);
    c.toBlob(b => save(b, fname('png')), 'image/png');
  };
  root.querySelector('#qtSv').onclick = () => {
    if (!q) return;
    const n = q.getModuleCount(), m = 4, W = n + 2 * m;
    let d = ''; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) d += `M${k + m} ${r + m}h1v1h-1z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="1000" height="1000" shape-rendering="crispEdges"><rect width="${W}" height="${W}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    save(new Blob([svg], { type: 'image/svg+xml' }), fname('svg'));
  };
  inp.focus();
})();

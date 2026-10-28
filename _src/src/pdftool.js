/* alsamani.com/tools/pdf — shared helpers; the editor itself (write, fill, merge, arrange, shrink) is in pdfedit.js. Everything runs on the device. */
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

  const home = () => window.PTEdit && window.PTEdit();
  const back = `<button type="button" class="sn-lnk pt-back" data-back>${B('الرجوع', 'Back')}</button>`;

  window.PTK = { root, B, isAr, esc, toast, deliver, baseName, PDFJS, back, home, readBuf, imgToJpeg, A4 };
  const mode = new URLSearchParams(location.search).get('m');
  setTimeout(() => window.PTEdit && window.PTEdit());
})();

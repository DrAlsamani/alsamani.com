// node tools/og_cards.js cards.json outdir
const { chromium } = require('playwright'); const fs = require('fs');
const cards = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), dir = process.argv[3];
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const html = c => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=block" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;font-family:"IBM Plex Sans Arabic",sans-serif;background:#fff;color:#1d1d1f;display:flex;flex-direction:column;padding:64px 80px 52px;position:relative;overflow:hidden}
body:before{content:"";position:absolute;inset:0 0 auto 0;height:10px;background:linear-gradient(90deg,#0066CC,#2997FF 60%,#B64400)}
.ic{width:112px;height:112px;border-radius:28px;background:#E8F1FB;color:#0066CC;display:grid;place-items:center}.ic svg{width:64px;height:64px}
.tag{font-size:26px;color:#B64400;font-weight:500;margin:34px 0 6px}h1{font-size:76px;font-weight:700;line-height:1.15;letter-spacing:-.5px}
.en{font-size:32px;color:#6e6e73;margin-top:6px;direction:ltr;text-align:right;font-weight:500}.q{font-size:30px;color:#424245;margin-top:22px;line-height:1.55;max-width:960px}
.ft{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:24px;color:#6e6e73;border-top:1px solid #e5e5ea;padding-top:22px}.ft b{color:#1d1d1f;font-weight:500}.ft span{direction:ltr}</style></head>
<body><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></div>
${c.tag ? `<p class="tag">${esc(c.tag)}</p>` : '<p class="tag">&nbsp;</p>'}<h1>${esc(c.ar)}</h1><p class="en">${esc(c.en)}</p><p class="q">${esc(c.q)}</p>
<div class="ft"><b>د. عمر عبدالله الصمعاني</b><span>alsamani.com</span></div></body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  fs.mkdirSync(dir, { recursive: true });
  for (const c of cards) { await p.setContent(html(c), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${dir}/${c.f}.jpg`, type: 'jpeg', quality: 86 }); }
  await b.close(); console.log('done', cards.length);
})();

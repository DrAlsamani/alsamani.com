// node tools/og_brand.js — the site's default share card (initials) and the games platform cards
const { chromium } = require('playwright');
const MARK = `<svg class="md-mark" viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="12" fill="#23336F"/><path d="M24 9l4.2 6.8 7.8-1.8-1.8 7.8L41 24l-6.8 4.2 1.8 7.8-7.8-1.8L24 39l-4.2-6.8-7.8 1.8 1.8-7.8L7 24l6.8-4.2-1.8-7.8 7.8 1.8z" fill="#C9822B"/><circle cx="24" cy="24" r="6.5" fill="#23336F"/><circle cx="24" cy="24" r="3" fill="#F3E3C7"/></svg>`;
const font = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Alexandria:wght@500;700&display=block" rel="stylesheet">';
const site = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">${font}<style>*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:"IBM Plex Sans Arabic",sans-serif;background:#fbfbfd;color:#1d1d1f;display:flex;align-items:center;gap:72px;padding:0 96px;position:relative;overflow:hidden}
body:before{content:"";position:absolute;inset:0 0 auto 0;height:12px;background:linear-gradient(90deg,#0066CC,#2997FF 60%,#B64400)}
.oa{flex:none;width:330px;height:330px;border-radius:50%;border:3px solid #1d1d1f;display:grid;place-items:center;position:relative;background:#fff}
.oa:after{content:"";position:absolute;inset:16px;border-radius:50%;border:1.5px solid #0066CC}
.oa b{font-family:Alexandria,sans-serif;font-weight:700;font-size:150px;letter-spacing:-6px;direction:ltr;line-height:1}.oa b i{font-style:normal;color:#0066CC}
.t{display:flex;flex-direction:column;gap:18px}.en{direction:ltr;text-align:right;font-family:Alexandria,sans-serif;font-size:54px;font-weight:700;letter-spacing:-1px}
.ar{font-size:40px;font-weight:700;color:#424245}.s{font-size:27px;color:#6e6e73;line-height:1.6;margin-top:10px}.u{direction:ltr;text-align:right;font-size:26px;color:#B64400;font-weight:500;margin-top:18px}</style></head>
<body><div class="oa"><b>O<i>A</i></b></div><div class="t"><p class="en">Dr. Omar A. Alsamani</p><p class="ar">د. عمر عبدالله الصمعاني</p>
</div></body></html>`;
// the initials alone, for a share card with no name
const oaOnly = site.replace(/<div class="t">[\s\S]*?<\/div><\/body>/, '</body>').replace('gap:72px;padding:0 96px', 'justify-content:center');
const game = (h, sub, en, foot) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">${font}<style>*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:"IBM Plex Sans Arabic",sans-serif;background:#1f2a5c;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 96px;position:relative;overflow:hidden;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 60 60'%3E%3Cpath d='M30 12l5 13 13 5-13 5-5 13-5-13-13-5 13-5z' fill='none' stroke='%23ffffff' stroke-opacity='.08'/%3E%3C/svg%3E")}
body:after{content:"";position:absolute;inset:auto 0 0 0;height:14px;background:#e0a458}
.r{display:flex;align-items:center;gap:48px}.md-mark{width:220px;height:220px;flex:none}
.e{color:#e0a458;font-size:30px;font-weight:500}h1{font-size:96px;font-weight:700;line-height:1.1;margin:6px 0}.en{direction:ltr;text-align:right;font-family:Alexandria,sans-serif;font-size:34px;color:#c9cde0}
.q{font-size:30px;color:#d9dcea;line-height:1.6;margin-top:30px;max-width:1000px}.f{position:absolute;bottom:42px;inset-inline:96px;display:flex;justify-content:space-between;font-size:24px;color:#aab0cc}.f span{direction:ltr}</style></head>
<body><div class="r">${MARK}<div><p class="e">منصة الألعاب التفاعلية</p><h1>${h}</h1><p class="en">${en}</p></div></div><p class="q">${sub}</p><div class="f"><b>${foot}</b><span>alsamani.com</span></div></body></html>`;
const khMark = `<svg class="md-mark" viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="12" fill="#0b3b2c"/><g fill="#e0a458"><circle cx="12" cy="36" r="4"/><circle cx="18" cy="30" r="4"/><circle cx="24" cy="24" r="4"/><circle cx="30" cy="18" r="4"/><circle cx="36" cy="12" r="4"/></g></svg>`;
const kh = game('خماسية', 'على طريقة لعبة سيكوينس المعروفة: كوّن خمسًا في صف قبل خصمك، مع الأصدقاء والفرق. على شاشة وجوالات، أو عن بُعد، أو ضد الجهاز.', 'Khumasiya · five in a row', 'د. عمر عبدالله الصمعاني').replace(MARK, khMark).replace(/background:#1f2a5c/, 'background:#0f4d3a');
const only = process.argv[2];
const cards = [
  ['site', site], ['site-oa', oaOnly],
  ['play', game('منصة الألعاب التفاعلية'.replace('منصة ', ''), 'منصة تعليمية ترفيهية للتوظيف داخل بيئة التعلم والأنشطة والاجتماعات.', 'Interactive games', 'د. عمر عبدالله الصمعاني')],
  ['play-maydan', game('ميدان', 'مسابقات تفاعلية حيّة: سؤال على الشاشة، والجميع يجيب من جواله. أسئلة وتحديات وفرق ومكتبة جاهزة.', 'Maydan · live quizzes', 'د. عمر عبدالله الصمعاني')],
  ['play-khumasiya', kh],
  ['m', game('ادخل الميدان', 'اكتب رمز المسابقة الظاهر على الشاشة، ثم اسمك، وابدأ اللعب.', 'Maydan · join the quiz', 'ميدان')]];
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } }); const c = await b.newContext({ viewport: { width: 1200, height: 630 }, ignoreHTTPSErrors: true }); const p = await c.newPage();
  for (const [f, h] of cards.filter(c => !only || c[0].startsWith(only))) { await p.setContent(h, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: 'img/og/' + f + '.jpg', type: 'jpeg', quality: 88 }); }
  await b.close(); console.log('done');
})();
